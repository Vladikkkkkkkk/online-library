const userLibraryService = require('../services/userLibraryService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * User Library Controller - handles user's personal library routes
 * Now works only with Open Library books
 */

/**
 * @desc    Get user's saved books
 * @route   GET /api/library
 * @access  Private
 */
const getSavedBooks = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await userLibraryService.getSavedBooks(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 12,
  });

  res.json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Save book to library
 * @route   POST /api/library/:openLibraryId
 * @access  Private
 */
const saveBook = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  const result = await userLibraryService.saveBook(req.user.id, openLibraryId);

  res.status(201).json({
    success: true,
    message: 'Book saved to library',
    data: result,
  });
});

/**
 * @desc    Remove book from library
 * @route   DELETE /api/library/:openLibraryId
 * @access  Private
 */
const removeBook = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  await userLibraryService.removeBook(req.user.id, openLibraryId);

  res.json({
    success: true,
    message: 'Book removed from library',
  });
});

/**
 * @desc    Check if book is saved
 * @route   GET /api/library/:openLibraryId/status
 * @access  Private
 */
const checkBookStatus = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  const isSaved = await userLibraryService.isBookSaved(req.user.id, openLibraryId);

  res.json({
    success: true,
    data: { isSaved },
  });
});

/**
 * @desc    Get user's library stats
 * @route   GET /api/library/stats
 * @access  Private
 */
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await userLibraryService.getUserStats(req.user.id);

  res.json({
    success: true,
    data: stats,
  });
});

module.exports = {
  getSavedBooks,
  saveBook,
  removeBook,
  checkBookStatus,
  getUserStats,
};
