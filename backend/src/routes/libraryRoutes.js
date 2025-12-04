const express = require('express');
const router = express.Router();
const userLibraryController = require('../controllers/userLibraryController');
const { authenticate } = require('../middleware/auth');


router.use(authenticate);


router.get('/', userLibraryController.getSavedBooks);


router.get('/stats', userLibraryController.getUserStats);


router.get('/:openLibraryId/status', userLibraryController.checkBookStatus);


router.post('/:openLibraryId', userLibraryController.saveBook);


router.delete('/:openLibraryId', userLibraryController.removeBook);

module.exports = router;
