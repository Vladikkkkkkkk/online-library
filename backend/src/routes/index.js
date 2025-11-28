const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const bookRoutes = require('./bookRoutes');
const categoryRoutes = require('./categoryRoutes');
const libraryRoutes = require('./libraryRoutes');
const adminRoutes = require('./adminRoutes');

// API health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/library', libraryRoutes);
router.use('/admin', adminRoutes);

module.exports = router;

