const playlistService = require('../services/playlistService');
const asyncHandler = require('../utils/asyncHandler');


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


const createPlaylist = asyncHandler(async (req, res) => {
  const playlist = await playlistService.createPlaylist(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Playlist created successfully',
    data: playlist,
  });
});


const updatePlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const playlist = await playlistService.updatePlaylist(id, req.user.id, req.body);

  res.json({
    success: true,
    message: 'Playlist updated successfully',
    data: playlist,
  });
});


const deletePlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await playlistService.deletePlaylist(id, req.user.id);

  res.json({
    success: true,
    message: 'Playlist deleted successfully',
  });
});


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


const removeBookFromPlaylist = asyncHandler(async (req, res) => {
  const { id, openLibraryId } = req.params;

  await playlistService.removeBookFromPlaylist(id, req.user.id, openLibraryId);

  res.json({
    success: true,
    message: 'Book removed from playlist',
  });
});


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

