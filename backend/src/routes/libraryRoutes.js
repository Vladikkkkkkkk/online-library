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

// Check if book is saved
router.get('/:openLibraryId/status', userLibraryController.checkBookStatus);

// Save book to library
router.post('/:openLibraryId', userLibraryController.saveBook);

// Remove book from library
router.delete('/:openLibraryId', userLibraryController.removeBook);

module.exports = router;
