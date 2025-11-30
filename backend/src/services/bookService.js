const openLibraryService = require('./openLibraryService');
const ApiError = require('../utils/ApiError');
const { getOpenLibrarySubject } = require('../utils/categoryMapper');
const { prisma } = require('../config/database');

/**
 * Book Service - handles all book-related business logic
 * Now works only with Open Library API
 */
class BookService {
  /**
   * Combine ratings from Open Library and our database
   * Calculates weighted average treating all ratings equally
   */
  async combineRatings(openLibraryId, openLibraryRating, openLibraryRatingCount) {
    // Get ratings from our database
    const ourRatings = await prisma.review.aggregate({
      where: { openLibraryId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ourRating = ourRatings._avg.rating ? Number(ourRatings._avg.rating) : null;
    const ourRatingCount = ourRatings._count.rating || 0;

    // If we have ratings from both sources, combine them
    if ((openLibraryRating !== null && openLibraryRating !== undefined && openLibraryRatingCount > 0) && ourRating) {
      const totalCount = openLibraryRatingCount + ourRatingCount;
      const combinedRating = (
        (openLibraryRating * openLibraryRatingCount) + (ourRating * ourRatingCount)
      ) / totalCount;
      
      return {
        averageRating: Number(combinedRating.toFixed(2)),
        ratingCount: totalCount,
        sources: {
          openLibrary: { rating: openLibraryRating, count: openLibraryRatingCount },
          our: { rating: ourRating, count: ourRatingCount },
        },
      };
    }
    
    // If only Open Library ratings
    if (openLibraryRating !== null && openLibraryRating !== undefined && openLibraryRatingCount > 0) {
      return {
        averageRating: Number(openLibraryRating.toFixed(2)),
        ratingCount: openLibraryRatingCount,
        sources: {
          openLibrary: { rating: openLibraryRating, count: openLibraryRatingCount },
          our: null,
        },
      };
    }
    
    // If only our ratings
    if (ourRating) {
      return {
        averageRating: Number(ourRating.toFixed(2)),
        ratingCount: ourRatingCount,
        sources: {
          openLibrary: null,
          our: { rating: ourRating, count: ourRatingCount },
        },
      };
    }
    
    // No ratings
    return {
      averageRating: null,
      ratingCount: 0,
      sources: {
        openLibrary: null,
        our: null,
      },
    };
  }
  /**
   * Search books from Open Library
   * @param {object} params - Search parameters
   * @returns {Promise<object>} - Search results
   */
  async searchBooks(params) {
    const {
      query,
      page = 1,
      limit = 10,
      category,
      author,
      title,
      publisher,
      keywords,
      language,
      yearFrom,
      yearTo,
    } = params;

    try {
      const olSubject = category ? getOpenLibrarySubject(category) : null;
      
      // Check if we have any search parameters
      const hasSearchParams = query || title || author || publisher || keywords || 
                             category || language || yearFrom || yearTo;
      
      // If no parameters at all, return all books (using wildcard)
      if (!hasSearchParams) {
        const olResults = await openLibraryService.searchBooks('*', {
          page,
          limit,
        });
        
        // Combine ratings for each book
        const booksWithRatings = await Promise.all(
          (olResults.books || []).map(async (book) => {
            const combinedRatings = await this.combineRatings(
              book.openLibraryId,
              book.openLibraryRating,
              book.openLibraryRatingCount
            );
            
            return {
              ...book,
              averageRating: combinedRatings.averageRating,
              ratingCount: combinedRatings.ratingCount,
              ratingSources: combinedRatings.sources,
            };
          })
        );
        
        return {
          data: booksWithRatings,
          total: olResults.total || 0,
        };
      }

      // Use unified searchBooks method for all cases
      // It handles all combinations of parameters correctly
      const olResults = await openLibraryService.searchBooks(query || keywords || null, {
        page,
        limit,
        language,
        subject: olSubject,
        author,
        title,
        publisher,
        yearFrom,
        yearTo,
      });
      
      // Combine ratings for each book
      const booksWithRatings = await Promise.all(
        (olResults.books || []).map(async (book) => {
          const combinedRatings = await this.combineRatings(
            book.openLibraryId,
            book.openLibraryRating,
            book.openLibraryRatingCount
          );
          
          return {
            ...book,
            averageRating: combinedRatings.averageRating,
            ratingCount: combinedRatings.ratingCount,
            ratingSources: combinedRatings.sources,
          };
        })
      );
      
      return {
        data: booksWithRatings,
        total: olResults.total || 0,
      };
    } catch (error) {
      console.error('Open Library search failed:', error.message);
      // Return empty results instead of throwing
      return {
        data: [],
        total: 0,
      };
    }
  }

  /**
   * Get book by Open Library ID
   * @param {string} id - Open Library ID
   * @returns {Promise<object>} - Book details
   */
  async getBookById(id) {
    try {
      const book = await openLibraryService.getBookById(id);
      if (!book) {
        throw ApiError.notFound('Book not found');
      }
      
      // Combine ratings
      const combinedRatings = await this.combineRatings(
        book.openLibraryId,
        book.openLibraryRating || null,
        book.openLibraryRatingCount || 0
      );
      
      return {
        ...book,
        averageRating: combinedRatings.averageRating,
        ratingCount: combinedRatings.ratingCount,
        ratingSources: combinedRatings.sources,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.notFound('Book not found');
    }
  }

  /**
   * Get trending books
   * @param {string} period - Period: daily, weekly, monthly
   * @param {number} limit - Number of books
   * @returns {Promise<Array>} - Trending books
   */
  async getTrendingBooks(period = 'weekly', limit = 10) {
    const trendingBooks = await openLibraryService.getTrendingBooks(period, limit);
    
    // Combine ratings for each trending book
    const booksWithRatings = await Promise.all(
      trendingBooks.map(async (book) => {
        const combinedRatings = await this.combineRatings(
          book.openLibraryId,
          book.openLibraryRating || null,
          book.openLibraryRatingCount || 0
        );
        
        return {
          ...book,
          averageRating: combinedRatings.averageRating,
          ratingCount: combinedRatings.ratingCount,
          ratingSources: combinedRatings.sources,
        };
      })
    );
    
    return booksWithRatings;
  }
}

module.exports = new BookService();
