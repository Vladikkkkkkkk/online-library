const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');


router.get('/books/:openLibraryId/reviews', optionalAuth, reviewController.getBookReviews);


router.get('/books/:openLibraryId/reviews/my', authenticate, reviewController.getUserReview);


router.post('/books/:openLibraryId/reviews', authenticate, reviewController.createOrUpdateReview);


router.delete('/books/:openLibraryId/reviews', authenticate, reviewController.deleteReview);


router.get('/reviews/my', authenticate, reviewController.getUserReviews);

module.exports = router;

