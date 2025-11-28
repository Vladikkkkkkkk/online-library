const express = require('express');
const router = express.Router();
const userLibraryController = require('../controllers/userLibraryController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get user's saved books
router.get('/', userLibraryController.getSavedBooks);

// Get user's stats
router.get('/stats', userLibraryController.getUserStats);

// Get download history
router.get('/downloads', userLibraryController.getDownloadHistory);

// Check if book is saved
router.get('/:bookId/status', userLibraryController.checkBookStatus);

// Save book to library
router.post('/:bookId', userLibraryController.saveBook);

// Remove book from library
router.delete('/:bookId', userLibraryController.removeBook);

module.exports = router;

