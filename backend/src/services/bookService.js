const openLibraryService = require('./openLibraryService');
const ApiError = require('../utils/ApiError');
const { getOpenLibrarySubject } = require('../utils/categoryMapper');
const { prisma } = require('../config/database');
const cache = require('../utils/cache');
const config = require('../config');


class BookService {

  async combineRatings(openLibraryId, openLibraryRating, openLibraryRatingCount) {

    const cacheKey = `ratings:combined:${openLibraryId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }


    const ourRatings = await prisma.review.aggregate({
      where: { openLibraryId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ourRating = ourRatings._avg.rating ? Number(ourRatings._avg.rating) : null;
    const ourRatingCount = ourRatings._count.rating || 0;


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

      await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);
      return result;
    }


    if (openLibraryRating !== null && openLibraryRating !== undefined && openLibraryRatingCount > 0) {
      const result = {
        averageRating: Number(openLibraryRating.toFixed(2)),
        ratingCount: openLibraryRatingCount,
        sources: {
          openLibrary: { rating: openLibraryRating, count: openLibraryRatingCount },
          our: null,
        },
      };

      await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);
      return result;
    }


    if (ourRating) {
      const result = {
        averageRating: Number(ourRating.toFixed(2)),
        ratingCount: ourRatingCount,
        sources: {
          openLibrary: null,
          our: { rating: ourRating, count: ourRatingCount },
        },
      };

      await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);
      return result;
    }


    const result = {
      averageRating: null,
      ratingCount: 0,
      sources: {
        openLibrary: null,
        our: null,
      },
    };


    await cache.set(cacheKey, result, config.redis.ttl.combinedRatings);

    return result;
  }

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
      sortBy = 'relevance', 
    } = params;

    try {
      const olSubject = category ? getOpenLibrarySubject(category) : null;


      const hasSearchParams = query || title || author || publisher || 
                             category || language || yearFrom || yearTo;


      const shouldFetchMore = (sortBy === 'rating_desc' || sortBy === 'rating_asc');
      const fetchLimit = shouldFetchMore ? Math.min(200, limit * 10) : limit; 
      const fetchPage = shouldFetchMore ? 1 : page; 


      const cachePage = shouldFetchMore ? 1 : page;
      const cacheLimit = shouldFetchMore ? fetchLimit : limit;


      const searchParams = JSON.stringify({
        query, page: cachePage, limit: cacheLimit, category, author, title, publisher, language, yearFrom, yearTo, sortBy
      });
      const cacheKey = `search:${Buffer.from(searchParams).toString('base64')}`;


      if (hasSearchParams || shouldFetchMore) {
        const cached = await cache.get(cacheKey);
        if (cached) {

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


      if (!hasSearchParams) {
        const olResults = await openLibraryService.searchBooks('*', {
          page: fetchPage,
          limit: fetchLimit,
        });


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


        if (sortBy === 'rating_desc' || sortBy === 'rating_asc') {
          booksWithRatings.sort((a, b) => {
            const ratingA = a.averageRating ?? 0;
            const ratingB = b.averageRating ?? 0;

            if (ratingA === 0 && ratingB === 0) return 0;
            if (ratingA === 0) return 1;
            if (ratingB === 0) return -1;

            return sortBy === 'rating_desc' ? ratingB - ratingA : ratingA - ratingB;
          });


          if (shouldFetchMore) {
            await cache.set(cacheKey, {
              data: booksWithRatings, 
              total: olResults.total || 0,
            }, config.redis.ttl.bookSearch);
          }


          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          booksWithRatings = booksWithRatings.slice(startIndex, endIndex);
        }

        return {
          data: booksWithRatings,
            total: olResults.total || 0,
          };
        } 


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


      if (sortBy === 'rating_desc' || sortBy === 'rating_asc') {
        booksWithRatings.sort((a, b) => {
          const ratingA = a.averageRating ?? 0;
          const ratingB = b.averageRating ?? 0;

          if (ratingA === 0 && ratingB === 0) return 0;
          if (ratingA === 0) return 1;
          if (ratingB === 0) return -1;

          return sortBy === 'rating_desc' ? ratingB - ratingA : ratingA - ratingB;
        });


        if (hasSearchParams && shouldFetchMore) {
          await cache.set(cacheKey, {
            data: booksWithRatings, 
            total: olResults.total || 0,
          }, config.redis.ttl.bookSearch);
        }


        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        booksWithRatings = booksWithRatings.slice(startIndex, endIndex);
      }

      const result = {
        data: booksWithRatings,
        total: olResults.total || 0,
      };


      if (hasSearchParams && !shouldFetchMore) {
        await cache.set(cacheKey, result, config.redis.ttl.bookSearch);
      }

      return result;
      } catch (error) {
        console.error('Open Library search failed:', error.message);

      return {
          data: [],
          total: 0,
        };
      }
  }


  async getBookById(id) {

    const cacheKey = `book:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {


      if (cached.openLibraryRating !== undefined || cached.openLibraryRatingCount !== undefined) {

        const combinedRatings = await this.combineRatings(
          id,
          cached.openLibraryRating || null,
          cached.openLibraryRatingCount || 0
        );

        const updatedResult = {
          ...cached,
          averageRating: combinedRatings.averageRating,
          ratingCount: combinedRatings.ratingCount,
          ratingSources: combinedRatings.sources,
        };

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


      const combinedRatings = await this.combineRatings(
        book.openLibraryId,
        book.openLibraryRating || null,
        book.openLibraryRatingCount || 0
      );

      const result = {
        ...book,

        openLibraryRating: book.openLibraryRating || null,
        openLibraryRatingCount: book.openLibraryRatingCount || 0,
        averageRating: combinedRatings.averageRating,
        ratingCount: combinedRatings.ratingCount,
        ratingSources: combinedRatings.sources,
      };


      await cache.set(cacheKey, result, config.redis.ttl.bookDetails);

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.notFound('Book not found');
    }
  }


  async getTrendingBooks(period = 'weekly', limit = 10) {

    const cacheKey = `trending:${period}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const trendingBooks = await openLibraryService.getTrendingBooks(period, limit);


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


    await cache.set(cacheKey, booksWithRatings, config.redis.ttl.trendingBooks);

    return booksWithRatings;
  }
}

module.exports = new BookService();
