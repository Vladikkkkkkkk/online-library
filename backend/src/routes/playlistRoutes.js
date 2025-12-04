const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { authenticate } = require('../middleware/auth');


router.use(authenticate);


router.get('/', playlistController.getUserPlaylists);


router.get('/:id', playlistController.getPlaylistById);


router.post('/', playlistController.createPlaylist);


router.put('/:id', playlistController.updatePlaylist);


router.delete('/:id', playlistController.deletePlaylist);


router.post('/:id/books', playlistController.addBookToPlaylist);


router.delete('/:id/books/:openLibraryId', playlistController.removeBookFromPlaylist);


router.put('/:id/books/reorder', playlistController.reorderPlaylistBooks);

module.exports = router;

