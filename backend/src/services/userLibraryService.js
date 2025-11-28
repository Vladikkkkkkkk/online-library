const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const openLibraryService = require('./openLibraryService');

/**
 * User Library Service - manages user's personal library
 */
class UserLibraryService {
  /**
   * Get user's saved books
   * @param {string} userId - User ID
   * @param {object} params - Pagination params
   * @returns {Promise<object>} - Saved books with pagination
   */
  async getSavedBooks(userId, params = {}) {
    const { page = 1, limit = 10, source } = params;
    const { skip, take } = paginate(page, limit);

    const where = { userId };
    if (source) {
      where.source = source;
    }

    const [savedBooks, total] = await Promise.all([
      prisma.savedBook.findMany({
        where,
        skip,
        take,
        include: {
          book: {
            include: {
              authors: {
                include: { author: true },
              },
              categories: {
                include: { category: true },
              },
            },
          },
        },
        orderBy: { savedAt: 'desc' },
      }),
      prisma.savedBook.count({ where }),
    ]);

    // Fetch Open Library books data in parallel
    const books = await Promise.all(
      savedBooks.map(async (sb) => {
        if (sb.source === 'openlibrary') {
          // For Open Library books, fetch data from API
          try {
            const bookData = await openLibraryService.getBookById(sb.openLibraryId);
            return {
              savedAt: sb.savedAt,
              source: 'openlibrary',
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
              source: 'openlibrary',
              openLibraryId: sb.openLibraryId,
              book: {
                id: sb.openLibraryId,
                title: 'Book not available',
                authors: [],
                coverUrl: null,
              },
            };
          }
        }
        return {
          savedAt: sb.savedAt,
          source: 'local',
          book: this.transformBook(sb.book),
        };
      })
    );

    return paginationResponse(books, total, page, limit);
  }

  /**
   * Save book to user's library
   * @param {string} userId - User ID
   * @param {string} bookId - Book ID or Open Library ID
   * @param {string} source - Source: 'local' or 'openlibrary'
   * @returns {Promise<object>} - Saved book entry
   */
  async saveBook(userId, bookId, source = 'local') {
    let savedBook;

    if (source === 'openlibrary') {
      // For Open Library books, save by openLibraryId
      // Check if already saved
      const existingSave = await prisma.savedBook.findFirst({
        where: {
          userId,
          openLibraryId: bookId,
          source: 'openlibrary',
        },
      });

      if (existingSave) {
        throw ApiError.conflict('Book already saved to library');
      }

      try {
        savedBook = await prisma.savedBook.create({
          data: {
            userId,
            openLibraryId: bookId,
            source: 'openlibrary',
            bookId: null, // Explicitly set to null for Open Library books
          },
        });
      } catch (error) {
        // Handle unique constraint violation
        if (error.code === 'P2002') {
          throw ApiError.conflict('Book already saved to library');
        }
        throw error;
      }

      return {
        savedAt: savedBook.savedAt,
        source: 'openlibrary',
        openLibraryId: savedBook.openLibraryId,
      };
    } else {
      // For local books, check if book exists
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw ApiError.notFound('Book not found');
      }

      // Check if already saved
      const existingSave = await prisma.savedBook.findFirst({
        where: {
          userId,
          bookId,
          source: 'local',
        },
      });

      if (existingSave) {
        throw ApiError.conflict('Book already saved to library');
      }

      savedBook = await prisma.savedBook.create({
        data: { userId, bookId, source: 'local' },
        include: {
          book: {
            include: {
              authors: { include: { author: true } },
              categories: { include: { category: true } },
            },
          },
        },
      });

      return {
        savedAt: savedBook.savedAt,
        source: 'local',
        book: this.transformBook(savedBook.book),
      };
    }
  }

  /**
   * Remove book from user's library
   * @param {string} userId - User ID
   * @param {string} bookId - Book ID or Open Library ID
   * @param {string} source - Source: 'local' or 'openlibrary'
   */
  async removeBook(userId, bookId, source = 'local') {
    let savedBook;

    if (source === 'openlibrary') {
      savedBook = await prisma.savedBook.findFirst({
        where: {
          userId,
          openLibraryId: bookId,
          source: 'openlibrary',
        },
      });
    } else {
      savedBook = await prisma.savedBook.findFirst({
        where: {
          userId,
          bookId,
          source: 'local',
        },
      });
    }

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
   * @param {string} bookId - Book ID or Open Library ID
   * @param {string} source - Source: 'local' or 'openlibrary'
   * @returns {Promise<boolean>} - Is saved
   */
  async isBookSaved(userId, bookId, source = 'local') {
    let savedBook;

    if (source === 'openlibrary') {
      savedBook = await prisma.savedBook.findFirst({
        where: {
          userId,
          openLibraryId: bookId,
          source: 'openlibrary',
        },
      });
    } else {
      savedBook = await prisma.savedBook.findFirst({
        where: {
          userId,
          bookId,
          source: 'local',
        },
      });
    }

    return !!savedBook;
  }

  /**
   * Get user's download history
   * @param {string} userId - User ID
   * @param {object} params - Pagination params
   * @returns {Promise<object>} - Download history with pagination
   */
  async getDownloadHistory(userId, params = {}) {
    const { page = 1, limit = 10 } = params;
    const { skip, take } = paginate(page, limit);

    const [downloads, total] = await Promise.all([
      prisma.download.findMany({
        where: { userId },
        skip,
        take,
        include: {
          book: {
            include: {
              authors: {
                include: { author: true },
              },
            },
          },
        },
        orderBy: { downloadedAt: 'desc' },
      }),
      prisma.download.count({ where: { userId } }),
    ]);

    const history = downloads.map((d) => ({
      downloadedAt: d.downloadedAt,
      book: {
        id: d.book.id,
        title: d.book.title,
        coverUrl: d.book.coverUrl,
        authors: d.book.authors?.map((ba) => ba.author.name) || [],
      },
    }));

    return paginationResponse(history, total, page, limit);
  }

  /**
   * Get user's library stats
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User stats
   */
  async getUserStats(userId) {
    const [savedBooks, downloads] = await Promise.all([
      prisma.savedBook.count({ where: { userId } }),
      prisma.download.count({ where: { userId } }),
    ]);

    return {
      savedBooks,
      downloads,
      readingNow: 0, // Can be implemented later with reading progress tracking
    };
  }

  /**
   * Transform book data
   */
  transformBook(book) {
    return {
      id: book.id,
      title: book.title,
      description: book.description,
      isbn: book.isbn,
      publishYear: book.publishYear,
      coverUrl: book.coverUrl,
      fileUrl: book.fileUrl,
      fileFormat: book.fileFormat,
      language: book.language,
      authors: book.authors?.map((ba) => ({
        id: ba.author.id,
        name: ba.author.name,
      })) || [],
      categories: book.categories?.map((bc) => ({
        id: bc.category.id,
        name: bc.category.name,
        slug: bc.category.slug,
      })) || [],
    };
  }
}

module.exports = new UserLibraryService();

