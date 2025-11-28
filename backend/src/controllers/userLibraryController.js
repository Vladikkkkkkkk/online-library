const userLibraryService = require('../services/userLibraryService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * User Library Controller - handles user's personal library routes
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
    limit: parseInt(limit, 10) || 10,
  });

  res.json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Save book to library
 * @route   POST /api/library/:bookId
 * @access  Private
 */
const saveBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { source = 'local' } = req.body;

  const result = await userLibraryService.saveBook(req.user.id, bookId, source);

  res.status(201).json({
    success: true,
    message: 'Book saved to library',
    data: result,
  });
});

/**
 * @desc    Remove book from library
 * @route   DELETE /api/library/:bookId
 * @access  Private
 */
const removeBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { source = 'local' } = req.query;

  await userLibraryService.removeBook(req.user.id, bookId, source);

  res.json({
    success: true,
    message: 'Book removed from library',
  });
});

/**
 * @desc    Check if book is saved
 * @route   GET /api/library/:bookId/status
 * @access  Private
 */
const checkBookStatus = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  const { source = 'local' } = req.query;

  const isSaved = await userLibraryService.isBookSaved(req.user.id, bookId, source);

  res.json({
    success: true,
    data: { isSaved },
  });
});

/**
 * @desc    Get user's download history
 * @route   GET /api/library/downloads
 * @access  Private
 */
const getDownloadHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await userLibraryService.getDownloadHistory(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  res.json({
    success: true,
    ...result,
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
  getDownloadHistory,
  getUserStats,
};

