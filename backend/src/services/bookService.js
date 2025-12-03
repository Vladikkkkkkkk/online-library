const openLibraryService = require('./openLibraryService');
const ApiError = require('../utils/ApiError');
const { getOpenLibrarySubject } = require('../utils/categoryMapper');
const { prisma } = require('../config/database');
const cache = require('../utils/cache');
const config = require('../config');

/**
 * Book Service - handles all book-related business logic
 * Now works only with Open Library API
 */
class BookService {
  /**
   * Combine ratings from Open Library and our database
   * Calculates weighted average treating all ratings equally
   * Caches results for better performance
   */
  async combineRatings(openLibraryId, openLibraryRating, openLibraryRatingCount) {
    // Check cache first
    const cacheKey = `ratings:combined:${openLibraryId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

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
      
      const result = {
        averageRating: Number(combinedRating.toFixed(2)),
        ratingCount: totalCount,
        sources: {
          openLibrary: { rating: openLibraryRating, count: openLibraryRatingCount },
          our: { rating: ourRating, count: ourRatingCount },
        },
      };
      // Cache the result
      await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);
      return result;
    }
    
    // If only Open Library ratings
    if (openLibraryRating !== null && openLibraryRating !== undefined && openLibraryRatingCount > 0) {
      const result = {
        averageRating: Number(openLibraryRating.toFixed(2)),
        ratingCount: openLibraryRatingCount,
        sources: {
          openLibrary: { rating: openLibraryRating, count: openLibraryRatingCount },
          our: null,
        },
      };
      // Cache the result
      await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);
      return result;
    }
    
    // If only our ratings
    if (ourRating) {
      const result = {
        averageRating: Number(ourRating.toFixed(2)),
        ratingCount: ourRatingCount,
        sources: {
          openLibrary: null,
          our: { rating: ourRating, count: ourRatingCount },
        },
      };
      // Cache the result
      await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);
      return result;
    }
    
    // No ratings
    const result = {
      averageRating: null,
      ratingCount: 0,
      sources: {
        openLibrary: null,
        our: null,
      },
    };

    // Cache the result (shorter TTL for no ratings)
    await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);
    
    return result;
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
      language,
      yearFrom,
      yearTo,
      sortBy = 'relevance', // 'relevance' | 'rating_desc' | 'rating_asc'
    } = params;

    try {
      const olSubject = category ? getOpenLibrarySubject(category) : null;
      
      // Check if we have any search parameters
      const hasSearchParams = query || title || author || publisher || 
                             category || language || yearFrom || yearTo;
      
      // If sorting by rating, we need to fetch more books to sort globally
      // Otherwise, sort only within the current page
      const shouldFetchMore = (sortBy === 'rating_desc' || sortBy === 'rating_asc');
      const fetchLimit = shouldFetchMore ? Math.min(200, limit * 10) : limit; // Fetch up to 200 books for sorting
      const fetchPage = shouldFetchMore ? 1 : page; // Always fetch from page 1 when sorting
      
      // For rating sorts, cache the full sorted result (page 1), then apply pagination
      // For relevance, cache each page separately
      const cachePage = shouldFetchMore ? 1 : page;
      const cacheLimit = shouldFetchMore ? fetchLimit : limit;
      
      // Create cache key from search parameters (including sortBy)
      const searchParams = JSON.stringify({
        query, page: cachePage, limit: cacheLimit, category, author, title, publisher, language, yearFrom, yearTo, sortBy
      });
      const cacheKey = `search:${Buffer.from(searchParams).toString('base64')}`;
      
      // Check cache first (for searches with parameters, or for rating sorts without params)
      if (hasSearchParams || shouldFetchMore) {
        const cached = await cache.get(cacheKey);
        if (cached) {
          // If sorting by rating and not page 1, apply pagination to cached sorted data
          if (shouldFetchMore && page > 1) {
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            return {
              data: cached.data.slice(startIndex, endIndex),
              total: cached.total,
            };
          }
          return cached;
        }
      }

      // If no parameters at all, return all books (using wildcard)
      if (!hasSearchParams) {
        const olResults = await openLibraryService.searchBooks('*', {
          page: fetchPage,
          limit: fetchLimit,
        });
        
        // Combine ratings for each book
        let booksWithRatings = await Promise.all(
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
        
        // Sort books by rating if requested
        if (sortBy === 'rating_desc' || sortBy === 'rating_asc') {
          booksWithRatings.sort((a, b) => {
            const ratingA = a.averageRating ?? 0;
            const ratingB = b.averageRating ?? 0;
            // Books without ratings go to the end
            if (ratingA === 0 && ratingB === 0) return 0;
            if (ratingA === 0) return 1;
            if (ratingB === 0) return -1;
            // Sort by rating
            return sortBy === 'rating_desc' ? ratingB - ratingA : ratingA - ratingB;
          });
          
          // For rating sorts, cache the full sorted list first (even without search params)
          if (shouldFetchMore) {
            await cache.set(cacheKey, {
              data: booksWithRatings, // Cache full sorted list
              total: olResults.total || 0,
            }, config.redis.ttl.bookSearch);
          }
          
          // Apply pagination after sorting (and caching if needed)
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          booksWithRatings = booksWithRatings.slice(startIndex, endIndex);
        }
        
        return {
          data: booksWithRatings,
            total: olResults.total || 0,
          };
        } 

      // Use unified searchBooks method for all cases
      // It handles all combinations of parameters correctly
      const olResults = await openLibraryService.searchBooks(query || null, {
        page: fetchPage,
        limit: fetchLimit,
            language,
            subject: olSubject,
            author,
            title,
            publisher,
        yearFrom,
        yearTo,
      });
      
      // Combine ratings for each book
      let booksWithRatings = await Promise.all(
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
      
      // Sort books by rating if requested
      if (sortBy === 'rating_desc' || sortBy === 'rating_asc') {
        booksWithRatings.sort((a, b) => {
          const ratingA = a.averageRating ?? 0;
          const ratingB = b.averageRating ?? 0;
          // Books without ratings go to the end
          if (ratingA === 0 && ratingB === 0) return 0;
          if (ratingA === 0) return 1;
          if (ratingB === 0) return -1;
          // Sort by rating
          return sortBy === 'rating_desc' ? ratingB - ratingA : ratingA - ratingB;
        });
        
        // For rating sorts, cache the full sorted list first
        if (hasSearchParams && shouldFetchMore) {
          await cache.set(cacheKey, {
            data: booksWithRatings, // Cache full sorted list
            total: olResults.total || 0,
          }, config.redis.ttl.bookSearch);
        }
        
        // Apply pagination after sorting (and caching if needed)
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        booksWithRatings = booksWithRatings.slice(startIndex, endIndex);
      }
      
      const result = {
        data: booksWithRatings,
        total: olResults.total || 0,
      };

      // Cache the result (only for relevance sort or if not cached already)
      if (hasSearchParams && !shouldFetchMore) {
        await cache.set(cacheKey, result, config.redis.ttl.bookSearch);
      }
      
      return result;
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
    // Check cache first
    const cacheKey = `book:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      // If cached data exists but combined ratings cache was invalidated,
      // we need to recalculate combined ratings
      if (cached.openLibraryRating !== undefined || cached.openLibraryRatingCount !== undefined) {
        // Recalculate combined ratings in case they were invalidated
        const combinedRatings = await this.combineRatings(
          id,
          cached.openLibraryRating || null,
          cached.openLibraryRatingCount || 0
        );
        // Update cached result with fresh combined ratings
        const updatedResult = {
          ...cached,
          averageRating: combinedRatings.averageRating,
          ratingCount: combinedRatings.ratingCount,
          ratingSources: combinedRatings.sources,
        };
        // Update cache
        await cache.set(cacheKey, updatedResult, config.redis.ttl.bookDetails);
        return updatedResult;
      }
      return cached;
    }

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
      
      const result = {
        ...book,
        // Store both Open Library ratings and combined ratings
        openLibraryRating: book.openLibraryRating || null,
        openLibraryRatingCount: book.openLibraryRatingCount || 0,
        averageRating: combinedRatings.averageRating,
        ratingCount: combinedRatings.ratingCount,
        ratingSources: combinedRatings.sources,
      };

      // Cache the result (includes both Open Library and combined ratings)
      await cache.set(cacheKey, result, config.redis.ttl.bookDetails);
      
      return result;
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
    // Check cache first
    const cacheKey = `trending:${period}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

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

    // Cache the result
    await cache.set(cacheKey, booksWithRatings, config.redis.ttl.trendingBooks);
    
    return booksWithRatings;
  }
}

module.exports = new BookService();
