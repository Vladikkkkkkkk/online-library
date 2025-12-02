import apiClient from './client';

export const recommendationsApi = {
  // Get book recommendations for authenticated user
  getRecommendations: async (limit = 10) => {
    const response = await apiClient.get('/recommendations', {
      params: { limit },
    });
    return response.data;
  },
};

