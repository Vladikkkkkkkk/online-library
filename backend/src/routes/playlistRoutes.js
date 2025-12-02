const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/playlists:
 *   get:
 *     summary: Get current user's playlists
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's playlists
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
router.get('/', playlistController.getUserPlaylists);

/**
 * @swagger
 * /api/playlists/{id}:
 *   get:
 *     summary: Get playlist by ID
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist details
 *       404:
 *         description: Playlist not found
 */
router.get('/:id', playlistController.getPlaylistById);

/**
 * @swagger
 * /api/playlists:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Playlist name
 *               description:
 *                 type: string
 *                 description: Optional playlist description
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Whether playlist is public
 *     responses:
 *       201:
 *         description: Playlist created successfully
 */
router.post('/', playlistController.createPlaylist);

/**
 * @swagger
 * /api/playlists/{id}:
 *   put:
 *     summary: Update playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Playlist updated successfully
 *       404:
 *         description: Playlist not found
 *       403:
 *         description: Not authorized to update this playlist
 */
router.put('/:id', playlistController.updatePlaylist);

/**
 * @swagger
 * /api/playlists/{id}:
 *   delete:
 *     summary: Delete playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Playlist deleted successfully
 *       404:
 *         description: Playlist not found
 *       403:
 *         description: Not authorized to delete this playlist
 */
router.delete('/:id', playlistController.deletePlaylist);

/**
 * @swagger
 * /api/playlists/{id}/books:
 *   post:
 *     summary: Add book to playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - openLibraryId
 *             properties:
 *               openLibraryId:
 *                 type: string
 *                 description: Open Library work ID
 *     responses:
 *       201:
 *         description: Book added to playlist
 *       404:
 *         description: Playlist or book not found
 *       409:
 *         description: Book already in playlist
 */
router.post('/:id/books', playlistController.addBookToPlaylist);

/**
 * @swagger
 * /api/playlists/{id}/books/{openLibraryId}:
 *   delete:
 *     summary: Remove book from playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: openLibraryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book removed from playlist
 *       404:
 *         description: Playlist or book not found
 */
router.delete('/:id/books/:openLibraryId', playlistController.removeBookFromPlaylist);

/**
 * @swagger
 * /api/playlists/{id}/books/reorder:
 *   put:
 *     summary: Reorder books in playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookIds
 *             properties:
 *               bookIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Open Library IDs in desired order
 *     responses:
 *       200:
 *         description: Books reordered successfully
 */
router.put('/:id/books/reorder', playlistController.reorderPlaylistBooks);

module.exports = router;

