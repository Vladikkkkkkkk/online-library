const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { optionalAuth } = require('../middleware/auth');

// Public routes - all books come from Open Library
router.get('/search', optionalAuth, bookController.searchBooks);
router.get('/trending', bookController.getTrendingBooks);
router.get('/', optionalAuth, bookController.getBooks);
router.get('/:id', optionalAuth, bookController.getBookById);

module.exports = router;
