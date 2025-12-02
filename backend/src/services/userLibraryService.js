const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const openLibraryService = require('./openLibraryService');
const bookService = require('./bookService');
const cache = require('../utils/cache');
const axios = require('axios');
const config = require('../config');

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
    const { page = 1, limit = 12 } = params;
    const { skip, take } = paginate(page, limit);

    // Check cache first
    const cacheKey = `saved_books:${userId}:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

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

    // Get all book IDs
    const bookIds = savedBooks.map(sb => sb.openLibraryId);
    
    // Check cache for all books first
    const cachedBooksMap = {};
    const uncachedBookIds = [];
    
    for (const bookId of bookIds) {
      const bookCacheKey = `book:${bookId}`;
      const cachedBook = await cache.get(bookCacheKey);
      if (cachedBook) {
        cachedBooksMap[bookId] = cachedBook;
      } else {
        uncachedBookIds.push(bookId);
      }
    }
    
    // Batch fetch missing books using search API (much faster than individual requests)
    const fetchedBooksMap = {};
    if (uncachedBookIds.length > 0) {
      try {
        // Use batch search with keys to fetch multiple books at once
        const keys = uncachedBookIds.map(id => `key:/works/${id}`).join(' OR ');
        const batchResponse = await axios.get(
          `${config.openLibrary.baseUrl}/search.json?q=(${keys})&fields=key,title,author_name,first_publish_year,isbn,cover_i,subject,language,number_of_pages_median,publisher,has_fulltext,ia,ratings_count,ratings_average&limit=${uncachedBookIds.length}`,
          { timeout: 10000 } // 10 second timeout for batch request
        );
        
        if (batchResponse.data.docs) {
          // Process batch results
          for (const doc of batchResponse.data.docs) {
            const id = doc.key?.replace('/works/', '');
            if (id && uncachedBookIds.includes(id)) {
              // Get cover URL - try cover_i first, then ISBN as fallback
              let coverUrl = null;
              if (doc.cover_i) {
                coverUrl = `${config.openLibrary.coversUrl}/b/id/${doc.cover_i}-M.jpg`;
              } else if (doc.isbn && doc.isbn[0]) {
                // Try ISBN-based cover as fallback
                coverUrl = `${config.openLibrary.coversUrl}/b/isbn/${doc.isbn[0]}-M.jpg`;
              }
              
              fetchedBooksMap[id] = {
                id,
                title: doc.title || 'Unknown Title',
                authors: doc.author_name?.map(name => ({ name })) || [],
                coverUrl,
                coverId: doc.cover_i || null,
                isbn: doc.isbn?.[0] || null,
                publishYear: doc.first_publish_year || null,
                subjects: doc.subject?.slice(0, 5) || [],
                openLibraryRating: doc.ratings_average ? Number(doc.ratings_average) : null,
                openLibraryRatingCount: doc.ratings_count || 0,
                // Note: Full details (description, download links) require individual fetch
                // But we'll fetch those only if needed
                // Note: averageRating and ratingCount should ALWAYS come from combineRatings, not from cache
              };
              
              // Cache the basic book data (without combined ratings - they come from combineRatings)
              await cache.set(`book:${id}`, fetchedBooksMap[id], 1800); // 30 minutes
            }
          }
        }
      } catch (batchError) {
        console.error('Batch fetch error:', batchError.message);
      }
    }
    
    // Fetch full details in parallel for books that need them (limit to first batch to avoid too many requests)
    // We'll load full details only for books that don't have them yet
    const booksNeedingFullDetails = savedBooks
      .map((sb, index) => ({ sb, index }))
      .filter(({ sb }) => {
        const bookId = sb.openLibraryId;
        const bookData = cachedBooksMap[bookId] || fetchedBooksMap[bookId];
        return !bookData || !bookData.description;
      })
      .slice(0, 6); // Limit to first 6 books to avoid too many parallel requests
    
    // Fetch full details in parallel for books that need them
    const fullDetailsPromises = booksNeedingFullDetails.map(async ({ sb }) => {
      const bookId = sb.openLibraryId;
      const existingData = cachedBooksMap[bookId] || fetchedBooksMap[bookId];
      
      try {
        const fullBookData = await Promise.race([
          openLibraryService.getBookById(bookId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          ),
        ]);
        
        const mergedData = {
          ...(existingData || {}),
          ...fullBookData,
          // Ensure coverUrl from full details takes priority (usually has better quality -L size)
          coverUrl: fullBookData.coverUrl || existingData?.coverUrl || null,
          coverId: fullBookData.coverId || existingData?.coverId || null,
          description: fullBookData.description || '',
          downloadLinks: fullBookData.downloadLinks || [],
        };
        
        // Update cache
        await cache.set(`book:${bookId}`, mergedData, 1800);
        
        return { bookId, data: mergedData };
      } catch (error) {
        console.warn(`Could not fetch full details for ${bookId}:`, error.message);
        return { bookId, data: existingData };
      }
    });
    
    const fullDetailsResults = await Promise.all(fullDetailsPromises);
    const fullDetailsMap = {};
    fullDetailsResults.forEach(({ bookId, data }) => {
      if (data) {
        fullDetailsMap[bookId] = data;
        // Update fetchedBooksMap or cachedBooksMap
        fetchedBooksMap[bookId] = data;
      }
    });
    
    // Build final books array with combined ratings
    const booksWithFullDetails = await Promise.all(
      savedBooks.map(async (sb) => {
        const bookId = sb.openLibraryId;
        const bookData = fullDetailsMap[bookId] || cachedBooksMap[bookId] || fetchedBooksMap[bookId];
        
        if (bookData) {
          // Get combined ratings (Open Library + our database)
          // Always use openLibraryRating/openLibraryRatingCount from cache, never averageRating/ratingCount
          const combinedRatings = await bookService.combineRatings(
            bookId,
            bookData.openLibraryRating || null,
            bookData.openLibraryRatingCount || 0
          );
          
          return {
            savedAt: sb.savedAt,
            openLibraryId: bookId,
            book: {
              id: bookId,
              title: bookData.title || 'Unknown Title',
              description: bookData.description || '',
              authors: bookData.authors || [],
              coverUrl: bookData.coverUrl,
              publishYear: bookData.publishYear || (bookData.firstPublishDate ? new Date(bookData.firstPublishDate).getFullYear() : null),
              subjects: bookData.subjects || [],
              downloadLinks: bookData.downloadLinks || [],
              averageRating: combinedRatings.averageRating,
              ratingCount: combinedRatings.ratingCount,
            },
          };
        }
        
        // If no data at all, return placeholder (will be retried on next load)
        return {
          savedAt: sb.savedAt,
          openLibraryId: bookId,
          book: {
            id: bookId,
            title: 'Book unavailable',
            authors: [],
            coverUrl: null,
            description: '',
          },
        };
      })
    );

    const result = paginationResponse(booksWithFullDetails, total, page, limit);
    
    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);
    
    return result;
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

    // Verify book exists in Open Library - use lightweight HEAD request
    try {
      const response = await axios.head(
        `${config.openLibrary.baseUrl}/works/${openLibraryId}.json`,
        { 
          timeout: 5000,
          validateStatus: (status) => status < 500, // Don't throw on 404
        }
      );
      
      if (response.status === 404) {
        throw ApiError.notFound('Book not found in Open Library');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // If network error, allow save (book might exist but API is slow)
      console.warn(`Could not verify book ${openLibraryId} existence, allowing save:`, error.message);
    }

    try {
      const savedBook = await prisma.savedBook.create({
        data: {
          userId,
          openLibraryId,
        },
      });

      // Invalidate caches
      try {
        await cache.delPattern(`recommendations:${userId}:*`);
        await cache.delPattern(`saved_books:${userId}:*`);
        await cache.del(`user_preferences:${userId}`); // Invalidate preferences cache
        await cache.del(`excluded_books:${userId}`); // Invalidate excluded books cache
      } catch (cacheError) {
        console.error('Error invalidating cache:', cacheError.message);
      }

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

    // Invalidate caches
    try {
      await cache.delPattern(`recommendations:${userId}:*`);
      await cache.delPattern(`saved_books:${userId}:*`);
      await cache.del(`user_preferences:${userId}`); // Invalidate preferences cache
      await cache.del(`excluded_books:${userId}`); // Invalidate excluded books cache
    } catch (cacheError) {
      console.error('Error invalidating cache:', cacheError.message);
    }
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
