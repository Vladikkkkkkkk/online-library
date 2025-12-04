const userLibraryService = require('../services/userLibraryService');
const asyncHandler = require('../utils/asyncHandler');


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


const saveBook = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  const result = await userLibraryService.saveBook(req.user.id, openLibraryId);

  res.status(201).json({
    success: true,
    message: 'Book saved to library',
    data: result,
  });
});


const removeBook = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  await userLibraryService.removeBook(req.user.id, openLibraryId);

  res.json({
    success: true,
    message: 'Book removed from library',
  });
});


const checkBookStatus = asyncHandler(async (req, res) => {
  const { openLibraryId } = req.params;

  const isSaved = await userLibraryService.isBookSaved(req.user.id, openLibraryId);

  res.json({
    success: true,
    data: { isSaved },
  });
});


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
