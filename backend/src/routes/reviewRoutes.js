const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * @swagger
 * /api/reviews/books/{openLibraryId}/reviews:
 *   get:
 *     summary: Get all reviews for a book (includes combined Open Library + internal ratings)
 *     tags: [Reviews]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: openLibraryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Open Library work ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Book reviews and ratings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                     stats:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                         ratingCount:
 *                           type: integer
 *                     pagination:
 *                       type: object
 */
router.get('/books/:openLibraryId/reviews', optionalAuth, reviewController.getBookReviews);

/**
 * @swagger
 * /api/reviews/books/{openLibraryId}/reviews/my:
 *   get:
 *     summary: Get current user's review for a book
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: openLibraryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Open Library work ID
 *     responses:
 *       200:
 *         description: User's review
 *       404:
 *         description: Review not found
 */
router.get('/books/:openLibraryId/reviews/my', authenticate, reviewController.getUserReview);

/**
 * @swagger
 * /api/reviews/books/{openLibraryId}/reviews:
 *   post:
 *     summary: Create or update review for a book
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: openLibraryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Open Library work ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5 stars
 *               comment:
 *                 type: string
 *                 description: Optional review text
 *     responses:
 *       200:
 *         description: Review created/updated successfully
 *       201:
 *         description: Review created
 */
router.post('/books/:openLibraryId/reviews', authenticate, reviewController.createOrUpdateReview);

/**
 * @swagger
 * /api/reviews/books/{openLibraryId}/reviews:
 *   delete:
 *     summary: Delete user's review for a book
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: openLibraryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Open Library work ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */
router.delete('/books/:openLibraryId/reviews', authenticate, reviewController.deleteReview);

/**
 * @swagger
 * /api/reviews/reviews/my:
 *   get:
 *     summary: Get all reviews created by current user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User's reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/reviews/my', authenticate, reviewController.getUserReviews);

module.exports = router;

