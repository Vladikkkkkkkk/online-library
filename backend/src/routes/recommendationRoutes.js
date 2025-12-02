const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const recommendationController = require('../controllers/recommendationController');

// All recommendation routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get personalized book recommendations based on user preferences
 *     description: Uses content-based filtering to recommend books based on user's saved books and high-rated reviews
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of recommendations to return
 *     responses:
 *       200:
 *         description: Book recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       openLibraryId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       authors:
 *                         type: array
 *                       coverUrl:
 *                         type: string
 *                       averageRating:
 *                         type: number
 *                       ratingCount:
 *                         type: integer
 */
router.get('/', recommendationController.getRecommendations);

module.exports = router;

