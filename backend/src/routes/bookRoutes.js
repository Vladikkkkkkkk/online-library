const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { uploadBook } = require('../middleware/upload');

// Public routes
router.get('/search', optionalAuth, bookController.searchBooks);
router.get('/trending', bookController.getTrendingBooks);
router.get('/', optionalAuth, bookController.getBooks);
router.get('/:id/read', bookController.getBookForReading); // PDF proxy for reading
router.get('/:id', optionalAuth, bookController.getBookById);

// Protected routes (authenticated users)
router.post('/:id/download', authenticate, bookController.downloadBook);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(schemas.createBook),
  bookController.createBook
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  bookController.updateBook
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  bookController.deleteBook
);

router.post(
  '/import',
  authenticate,
  authorize('ADMIN'),
  bookController.importFromOpenLibrary
);

// File upload route (admin)
router.post(
  '/:id/upload',
  authenticate,
  authorize('ADMIN'),
  uploadBook.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { prisma } = require('../config/database');
    const path = require('path');

    const book = await prisma.book.update({
      where: { id: req.params.id },
      data: {
        fileUrl: `/uploads/books/${req.file.filename}`,
        fileFormat: path.extname(req.file.originalname).slice(1).toUpperCase(),
      },
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl: book.fileUrl,
        fileFormat: book.fileFormat,
      },
    });
  }
);

module.exports = router;

