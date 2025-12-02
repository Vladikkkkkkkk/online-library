const playlistService = require('../services/playlistService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Playlist Controller - handles playlist-related routes
 */

/**
 * @desc    Get user's playlists
 * @route   GET /api/playlists
 * @access  Private
 */
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { page, limit, includePublic } = req.query;

  const result = await playlistService.getUserPlaylists(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    includePublic: includePublic === 'true',
  });

  res.json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Get playlist by ID
 * @route   GET /api/playlists/:id
 * @access  Private (or public if playlist is public)
 */
const getPlaylistById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit } = req.query;

  const playlist = await playlistService.getPlaylistById(id, req.user?.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10),
  });

  res.json({
    success: true,
    data: playlist,
  });
});

/**
 * @desc    Create playlist
 * @route   POST /api/playlists
 * @access  Private
 */
const createPlaylist = asyncHandler(async (req, res) => {
  const playlist = await playlistService.createPlaylist(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Playlist created successfully',
    data: playlist,
  });
});

/**
 * @desc    Update playlist
 * @route   PUT /api/playlists/:id
 * @access  Private
 */
const updatePlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const playlist = await playlistService.updatePlaylist(id, req.user.id, req.body);

  res.json({
    success: true,
    message: 'Playlist updated successfully',
    data: playlist,
  });
});

/**
 * @desc    Delete playlist
 * @route   DELETE /api/playlists/:id
 * @access  Private
 */
const deletePlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await playlistService.deletePlaylist(id, req.user.id);

  res.json({
    success: true,
    message: 'Playlist deleted successfully',
  });
});

/**
 * @desc    Add book to playlist
 * @route   POST /api/playlists/:id/books
 * @access  Private
 */
const addBookToPlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { openLibraryId } = req.body;

  if (!openLibraryId) {
    return res.status(400).json({
      success: false,
      message: 'Open Library ID is required',
    });
  }

  const result = await playlistService.addBookToPlaylist(id, req.user.id, openLibraryId);

  res.status(201).json({
    success: true,
    message: 'Book added to playlist',
    data: result,
  });
});

/**
 * @desc    Remove book from playlist
 * @route   DELETE /api/playlists/:id/books/:openLibraryId
 * @access  Private
 */
const removeBookFromPlaylist = asyncHandler(async (req, res) => {
  const { id, openLibraryId } = req.params;

  await playlistService.removeBookFromPlaylist(id, req.user.id, openLibraryId);

  res.json({
    success: true,
    message: 'Book removed from playlist',
  });
});

/**
 * @desc    Reorder books in playlist
 * @route   PUT /api/playlists/:id/books/reorder
 * @access  Private
 */
const reorderPlaylistBooks = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { order } = req.body;

  if (!order || !Array.isArray(order)) {
    return res.status(400).json({
      success: false,
      message: 'Order array is required',
    });
  }

  await playlistService.reorderPlaylistBooks(id, req.user.id, order);

  res.json({
    success: true,
    message: 'Playlist books reordered successfully',
  });
});

module.exports = {
  getUserPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addBookToPlaylist,
  removeBookFromPlaylist,
  reorderPlaylistBooks,
};

