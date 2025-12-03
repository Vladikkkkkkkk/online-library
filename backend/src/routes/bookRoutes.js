const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { optionalAuth } = require('../middleware/auth');

/**
 * @swagger
 * /api/books/search:
 *   get:
 *     summary: Search books from Open Library
 *     tags: [Books]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: General search query (title, author)
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Search by book title
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Search by author name
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Search by category/subject
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language code (e.g., eng, ukr, spa)
 *       - in: query
 *         name: publishYearFrom
 *         schema:
 *           type: integer
 *         description: Filter by minimum publish year
 *       - in: query
 *         name: publishYearTo
 *         schema:
 *           type: integer
 *         description: Filter by maximum publish year
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Search results
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
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 */
router.get('/search', optionalAuth, bookController.searchBooks);

/**
 * @swagger
 * /api/books/trending:
 *   get:
 *     summary: Get trending books from Open Library
 *     tags: [Books]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Trending period
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of books to return
 *     responses:
 *       200:
 *         description: Trending books
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
 */
router.get('/trending', bookController.getTrendingBooks);

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all books (same as search with no filters)
 *     tags: [Books]
 *     security: []
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
 *           default: 12
 *     responses:
 *       200:
 *         description: List of books
 */
router.get('/', optionalAuth, bookController.getBooks);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get book details by Open Library ID
 *     tags: [Books]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Open Library work ID (OL123456W format)
 *     responses:
 *       200:
 *         description: Book details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Book not found
 */
router.get('/:id', optionalAuth, bookController.getBookById);

module.exports = router;
