const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Get reviews for a book (public)
router.get('/books/:openLibraryId/reviews', optionalAuth, reviewController.getBookReviews);

// Get user's review for a book (private)
router.get('/books/:openLibraryId/reviews/my', authenticate, reviewController.getUserReview);

// Create or update review (private)
router.post('/books/:openLibraryId/reviews', authenticate, reviewController.createOrUpdateReview);

// Delete review (private)
router.delete('/books/:openLibraryId/reviews', authenticate, reviewController.deleteReview);

// Get user's reviews (private)
router.get('/reviews/my', authenticate, reviewController.getUserReviews);

module.exports = router;

