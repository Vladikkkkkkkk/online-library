const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const openLibraryService = require('./openLibraryService');

/**
 * User Library Service - manages user's personal library
 * Works only with Open Library books
 */
class UserLibraryService {
  /**
   * Get user's saved books
   * @param {string} userId - User ID
   * @param {object} params - Pagination params
   * @returns {Promise<object>} - Saved books with pagination
   */
  async getSavedBooks(userId, params = {}) {
    const { page = 1, limit = 10 } = params;
    const { skip, take } = paginate(page, limit);

    const where = { userId };

    const [savedBooks, total] = await Promise.all([
      prisma.savedBook.findMany({
        where,
        skip,
        take,
        orderBy: { savedAt: 'desc' },
      }),
      prisma.savedBook.count({ where }),
    ]);

    // Fetch Open Library books data in parallel
    const books = await Promise.all(
      savedBooks.map(async (sb) => {
        try {
          const bookData = await openLibraryService.getBookById(sb.openLibraryId);
          return {
            savedAt: sb.savedAt,
            openLibraryId: sb.openLibraryId,
            book: {
              id: sb.openLibraryId,
              title: bookData.title,
              description: bookData.description,
              authors: bookData.authors?.map(a => ({ name: a.name || a })) || [],
              coverUrl: bookData.coverUrl,
              publishYear: bookData.firstPublishDate ? new Date(bookData.firstPublishDate).getFullYear() : null,
              subjects: bookData.subjects || [],
              downloadLinks: bookData.downloadLinks || [],
            },
          };
        } catch (error) {
          console.error(`Failed to fetch Open Library book ${sb.openLibraryId}:`, error.message);
          // Return minimal data if API fails
          return {
            savedAt: sb.savedAt,
            openLibraryId: sb.openLibraryId,
            book: {
              id: sb.openLibraryId,
              title: 'Book not available',
              authors: [],
              coverUrl: null,
            },
          };
        }
      })
    );

    return paginationResponse(books, total, page, limit);
  }

  /**
   * Save book to user's library
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   * @returns {Promise<object>} - Saved book entry
   */
  async saveBook(userId, openLibraryId) {
    // Check if already saved
    const existingSave = await prisma.savedBook.findFirst({
      where: {
        userId,
        openLibraryId,
      },
    });

    if (existingSave) {
      throw ApiError.conflict('Book already saved to library');
    }

    // Verify book exists in Open Library
    try {
      await openLibraryService.getBookById(openLibraryId);
    } catch (error) {
      throw ApiError.notFound('Book not found in Open Library');
    }

    try {
      const savedBook = await prisma.savedBook.create({
        data: {
          userId,
          openLibraryId,
        },
      });

      return {
        savedAt: savedBook.savedAt,
        openLibraryId: savedBook.openLibraryId,
      };
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        throw ApiError.conflict('Book already saved to library');
      }
      throw error;
    }
  }

  /**
   * Remove book from user's library
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   */
  async removeBook(userId, openLibraryId) {
    const savedBook = await prisma.savedBook.findFirst({
      where: {
        userId,
        openLibraryId,
      },
    });

    if (!savedBook) {
      throw ApiError.notFound('Book not found in your library');
    }

    await prisma.savedBook.delete({
      where: { id: savedBook.id },
    });
  }

  /**
   * Check if book is saved by user
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   * @returns {Promise<boolean>} - Is saved
   */
  async isBookSaved(userId, openLibraryId) {
    const savedBook = await prisma.savedBook.findFirst({
      where: {
        userId,
        openLibraryId,
      },
    });

    return !!savedBook;
  }

  /**
   * Get user's library stats
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User stats
   */
  async getUserStats(userId) {
    const savedBooks = await prisma.savedBook.count({ where: { userId } });

    return {
      savedBooks,
      playlists: await prisma.playlist.count({ where: { userId } }),
      reviews: await prisma.review.count({ where: { userId } }),
    };
  }
}

module.exports = new UserLibraryService();
