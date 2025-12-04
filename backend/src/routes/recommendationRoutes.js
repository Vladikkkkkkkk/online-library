const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const recommendationController = require('../controllers/recommendationController');


router.use(authenticate);


router.get('/', recommendationController.getRecommendations);

module.exports = router;

