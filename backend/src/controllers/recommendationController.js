const recommendationService = require('../services/recommendationService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Recommendation Controller - handles recommendation routes
 */

/**
 * @desc    Get book recommendations for authenticated user
 * @route   GET /api/recommendations
 * @access  Private
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const userId = req.user.id;

  const recommendations = await recommendationService.getRecommendations(
    userId,
    parseInt(limit, 10)
  );

  res.json({
    success: true,
    data: recommendations,
    count: recommendations.length,
  });
});

module.exports = {
  getRecommendations,
};

