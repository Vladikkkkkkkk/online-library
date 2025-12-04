const express = require('express');
const router = express.Router();


const authRoutes = require('./authRoutes');
const bookRoutes = require('./bookRoutes');
const categoryRoutes = require('./categoryRoutes');
const libraryRoutes = require('./libraryRoutes');
const playlistRoutes = require('./playlistRoutes');
const reviewRoutes = require('./reviewRoutes');
const recommendationRoutes = require('./recommendationRoutes');
const adminRoutes = require('./adminRoutes');


router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});


router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/library', libraryRoutes);
router.use('/playlists', playlistRoutes);
router.use('/', reviewRoutes); 
router.use('/recommendations', recommendationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
