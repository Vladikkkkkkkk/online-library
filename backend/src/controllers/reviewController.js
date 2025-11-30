const reviewService = require('../services/reviewService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Review Controller - handles review-related routes
 */

/**
 * @desc    Get reviews for a book
 * @route   GET /api/books/:openLibraryId/reviews
 * @access  Public
 */
const getBookReviews = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;
  const { page, limit } = req.query;

  const result = await reviewService.getBookReviews(openLibraryId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  res.json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Get user's review for a book
 * @route   GET /api/books/:openLibraryId/reviews/my
 * @access  Private
 */
const getUserReview = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  const review = await reviewService.getUserReview(req.user.id, openLibraryId);

  res.json({
    success: true,
    data: review,
  });
});

/**
 * @desc    Create or update review
 * @route   POST /api/books/:openLibraryId/reviews
 * @access  Private
 */
const createOrUpdateReview = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  const review = await reviewService.createOrUpdateReview(
    req.user.id,
    openLibraryId,
    req.body
  );

  res.status(201).json({
    success: true,
    message: 'Review saved successfully',
    data: review,
  });
});

/**
 * @desc    Delete review
 * @route   DELETE /api/books/:openLibraryId/reviews
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  await reviewService.deleteReview(req.user.id, openLibraryId);

  res.json({
    success: true,
    message: 'Review deleted successfully',
  });
});

/**
 * @desc    Get user's reviews
 * @route   GET /api/reviews/my
 * @access  Private
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await reviewService.getUserReviews(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  res.json({
    success: true,
    ...result,
  });
});

module.exports = {
  getBookReviews,
  getUserReview,
  createOrUpdateReview,
  deleteReview,
  getUserReviews,
};

