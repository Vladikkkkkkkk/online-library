const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const openLibraryService = require('./openLibraryService');
const bookService = require('./bookService');
const cache = require('../utils/cache');
const config = require('../config');
const axios = require('axios');

/**
 * Review Service - manages book reviews and ratings
 */
class ReviewService {
  /**
   * Get reviews for a book
   * @param {string} openLibraryId - Open Library ID
   * @param {object} params - Pagination params
   * @returns {Promise<object>} - Reviews with pagination and aggregated rating
   */
  async getBookReviews(openLibraryId, params = {}) {
    const { page = 1, limit = 10 } = params;
    const { skip, take } = paginate(page, limit);

    const where = { openLibraryId };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    // Get our ratings stats
    const ratingStats = await prisma.review.aggregate({
      where: { openLibraryId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ourRating = ratingStats._avg.rating ? Number(ratingStats._avg.rating) : null;
    const ourRatingCount = ratingStats._count.rating || 0;

    // Get Open Library ratings - use lightweight search API instead of full getBookById
    let openLibraryRating = null;
    let openLibraryRatingCount = 0;
    try {
      // Check cache first for Open Library ratings
      const olRatingCacheKey = `ol_ratings:${openLibraryId}`;
      const cachedOlRating = await cache.get(olRatingCacheKey);
      
      if (cachedOlRating) {
        openLibraryRating = cachedOlRating.rating;
        openLibraryRatingCount = cachedOlRating.count;
      } else {
        // Lightweight API call to get only ratings
        const searchResponse = await axios.get(
          `${process.env.OPEN_LIBRARY_API_URL || 'https://openlibrary.org'}/search.json?q=key:/works/${openLibraryId}&fields=key,ratings_average,ratings_count&limit=1`
        );
        if (searchResponse.data.docs && searchResponse.data.docs.length > 0) {
          const searchBook = searchResponse.data.docs[0];
          openLibraryRating = searchBook.ratings_average ? Number(searchBook.ratings_average) : null;
          openLibraryRatingCount = searchBook.ratings_count || 0;
          // Cache Open Library rating for 1 hour
          await cache.set(olRatingCacheKey, { rating: openLibraryRating, count: openLibraryRatingCount }, 3600);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch Open Library ratings for ${openLibraryId}:`, error.message);
    }

    // Combine ratings using bookService method (it will use cache internally)
    const combinedRatings = await bookService.combineRatings(
      openLibraryId,
      openLibraryRating,
      openLibraryRatingCount
    );

    const averageRating = combinedRatings.averageRating;
    const ratingCount = combinedRatings.ratingCount;

    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { openLibraryId },
      _count: { rating: true },
    });

    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratingDistribution.forEach((item) => {
      distribution[item.rating] = item._count.rating;
    });

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        user: review.user,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        averageRating: Number(averageRating.toFixed(2)),
        ratingCount,
        distribution,
      },
    };
  }

  /**
   * Get user's review for a book
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   * @returns {Promise<object|null>} - Review or null
   */
  async getUserReview(userId, openLibraryId) {
    const review = await prisma.review.findFirst({
      where: {
        userId,
        openLibraryId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!review) {
      return null;
    }

    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user,
    };
  }

  /**
   * Invalidate cache for a book's ratings and reviews
   * @param {string} openLibraryId - Open Library ID
   * @param {string} userId - User ID (optional, for recommendations cache)
   */
  async invalidateBookCache(openLibraryId, userId = null) {
    try {
      // Invalidate combined ratings cache (most important - this affects all book displays)
      await cache.del(`ratings:combined:${openLibraryId}`);
      // Invalidate book details cache
      await cache.del(`book:${openLibraryId}`);
      // Invalidate Open Library ratings cache
      await cache.del(`ol_ratings:${openLibraryId}`);
      
      // Invalidate search and trending caches that might include this book
      // This is important to ensure ratings are updated everywhere
      try {
        await cache.delPattern(`search:*`);
        await cache.delPattern(`trending:*`);
      } catch (patternError) {
        // Pattern deletion can be slow, log but don't fail
        console.warn('Error invalidating search/trending cache patterns:', patternError.message);
      }
      
      // Invalidate user's recommendations cache if userId provided
      if (userId) {
        await cache.delPattern(`recommendations:${userId}:*`);
        await cache.del(`user_preferences:${userId}`); // Invalidate preferences cache
        await cache.del(`excluded_books:${userId}`); // Invalidate excluded books cache
      }
      
      // Invalidate saved books cache for all users (book rating changed, affects all users)
      // Note: This is broad but necessary for accurate ratings display
      try {
        // Get all user IDs who saved this book to invalidate their cache
        const usersWithBook = await prisma.savedBook.findMany({
          where: { openLibraryId },
          select: { userId: true },
          distinct: ['userId'],
        });
        for (const savedBook of usersWithBook) {
          await cache.delPattern(`saved_books:${savedBook.userId}:*`);
        }
      } catch (err) {
        // Don't fail if this fails
        console.warn('Error invalidating saved books cache:', err.message);
      }
      
      // Invalidate playlist caches that might include this book
      try {
        const playlistsWithBook = await prisma.playlistBook.findMany({
          where: { openLibraryId },
          select: { playlistId: true, playlist: { select: { userId: true } } },
          distinct: ['playlistId'],
        });
        for (const playlistBook of playlistsWithBook) {
          if (playlistBook.playlist?.userId) {
            await cache.delPattern(`playlist:${playlistBook.playlistId}:*`);
          }
        }
      } catch (err) {
        console.warn('Error invalidating playlist cache:', err.message);
      }
    } catch (error) {
      console.error(`Cache invalidation error for ${openLibraryId}:`, error.message);
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }

  /**
   * Create or update review
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   * @param {object} data - Review data
   * @returns {Promise<object>} - Created/updated review
   */
  async createOrUpdateReview(userId, openLibraryId, data) {
    const { rating, title, comment } = data;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw ApiError.badRequest('Rating must be between 1 and 5');
    }

    // Verify book exists in Open Library - use lightweight check instead of full getBookById
    try {
      // Use HEAD request to check if book exists without downloading full data
      await axios.head(
        `${process.env.OPEN_LIBRARY_API_URL || 'https://openlibrary.org'}/works/${openLibraryId}.json`,
        { timeout: 5000, validateStatus: (status) => status < 500 }
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw ApiError.notFound('Book not found in Open Library');
      }
      // If network error, allow creation (book might exist but API is down)
    }

    // Check if review already exists
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        openLibraryId,
      },
    });

    if (existingReview) {
      // Update existing review
      const updated = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating,
          title: title?.trim() || null,
          comment: comment?.trim() || null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      const result = {
        id: updated.id,
        rating: updated.rating,
        title: updated.title,
        comment: updated.comment,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        user: updated.user,
      };

      // Invalidate cache after update
      await this.invalidateBookCache(openLibraryId, userId);

      return result;
    }

    // Create new review
    const review = await prisma.review.create({
      data: {
        userId,
        openLibraryId,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const result = {
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user,
    };

    // Invalidate cache after create
    await this.invalidateBookCache(openLibraryId, userId);

    return result;
  }

  /**
   * Delete review
   * @param {string} userId - User ID
   * @param {string} openLibraryId - Open Library ID
   */
  async deleteReview(userId, openLibraryId) {
    const review = await prisma.review.findFirst({
      where: {
        userId,
        openLibraryId,
      },
    });

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    if (review.userId !== userId) {
      throw ApiError.forbidden('You can only delete your own reviews');
    }

    await prisma.review.delete({
      where: { id: review.id },
    });

    // Invalidate cache after delete
    await this.invalidateBookCache(openLibraryId, userId);
  }

  /**
   * Get user's reviews
   * @param {string} userId - User ID
   * @param {object} params - Pagination params
   * @returns {Promise<object>} - Reviews with pagination
   */
  async getUserReviews(userId, params = {}) {
    const { page = 1, limit = 10 } = params;
    const { skip, take } = paginate(page, limit);

    const where = { userId };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    // Fetch book details for each review
    const reviewsWithBooks = await Promise.all(
      reviews.map(async (review) => {
        try {
          const bookData = await openLibraryService.getBookById(review.openLibraryId);
          return {
            id: review.id,
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            book: {
              id: review.openLibraryId,
              title: bookData.title,
              coverUrl: bookData.coverUrl,
              authors: bookData.authors?.map(a => ({ name: a.name || a })) || [],
            },
          };
        } catch (error) {
          console.error(`Failed to fetch Open Library book ${review.openLibraryId}:`, error.message);
          return {
            id: review.id,
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            book: {
              id: review.openLibraryId,
              title: 'Book not available',
              coverUrl: null,
              authors: [],
            },
          };
        }
      })
    );

    return paginationResponse(reviewsWithBooks, total, page, limit);
  }
}

module.exports = new ReviewService();

