const recommendationService = require('../services/recommendationService');
const asyncHandler = require('../utils/asyncHandler');


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

