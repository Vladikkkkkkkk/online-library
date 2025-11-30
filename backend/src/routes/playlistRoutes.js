const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get user's playlists
router.get('/', playlistController.getUserPlaylists);

// Get playlist by ID (public playlists accessible by anyone)
router.get('/:id', playlistController.getPlaylistById);

// Create playlist
router.post('/', playlistController.createPlaylist);

// Update playlist
router.put('/:id', playlistController.updatePlaylist);

// Delete playlist
router.delete('/:id', playlistController.deletePlaylist);

// Add book to playlist
router.post('/:id/books', playlistController.addBookToPlaylist);

// Remove book from playlist
router.delete('/:id/books/:openLibraryId', playlistController.removeBookFromPlaylist);

// Reorder books in playlist
router.put('/:id/books/reorder', playlistController.reorderPlaylistBooks);

module.exports = router;

