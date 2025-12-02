const express = require('express');
const router = express.Router();
const userLibraryController = require('../controllers/userLibraryController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/library:
 *   get:
 *     summary: Get user's saved books
 *     tags: [Library]
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
 *         description: User's saved books
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
 *                     books:
 *                       type: array
 *                     pagination:
 *                       type: object
 */
router.get('/', userLibraryController.getSavedBooks);

/**
 * @swagger
 * /api/library/stats:
 *   get:
 *     summary: Get user's library statistics
 *     tags: [Library]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
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
 *                     totalBooks:
 *                       type: integer
 *                     totalPlaylists:
 *                       type: integer
 *                     totalReviews:
 *                       type: integer
 */
router.get('/stats', userLibraryController.getUserStats);

/**
 * @swagger
 * /api/library/{openLibraryId}/status:
 *   get:
 *     summary: Check if book is saved in user's library
 *     tags: [Library]
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
 *         description: Book status
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
 *                     isSaved:
 *                       type: boolean
 */
router.get('/:openLibraryId/status', userLibraryController.checkBookStatus);

/**
 * @swagger
 * /api/library/{openLibraryId}:
 *   post:
 *     summary: Save book to user's library
 *     tags: [Library]
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
 *       201:
 *         description: Book saved successfully
 *       409:
 *         description: Book already saved
 *       404:
 *         description: Book not found in Open Library
 */
router.post('/:openLibraryId', userLibraryController.saveBook);

/**
 * @swagger
 * /api/library/{openLibraryId}:
 *   delete:
 *     summary: Remove book from user's library
 *     tags: [Library]
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
 *         description: Book removed successfully
 *       404:
 *         description: Book not found in library
 */
router.delete('/:openLibraryId', userLibraryController.removeBook);

module.exports = router;
