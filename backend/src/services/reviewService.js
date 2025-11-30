const { prisma } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { paginate, paginationResponse } = require('../utils/helpers');
const openLibraryService = require('./openLibraryService');
const bookService = require('./bookService');

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

    // Get Open Library ratings from book data
    let openLibraryRating = null;
    let openLibraryRatingCount = 0;
    try {
      const bookData = await openLibraryService.getBookById(openLibraryId);
      openLibraryRating = bookData.openLibraryRating || null;
      openLibraryRatingCount = bookData.openLibraryRatingCount || 0;
    } catch (error) {
      console.error(`Failed to fetch Open Library ratings for ${openLibraryId}:`, error.message);
    }

    // Combine ratings using bookService method
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

    // Verify book exists in Open Library
    try {
      await openLibraryService.getBookById(openLibraryId);
    } catch (error) {
      throw ApiError.notFound('Book not found in Open Library');
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

      return {
        id: updated.id,
        rating: updated.rating,
        title: updated.title,
        comment: updated.comment,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        user: updated.user,
      };
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

