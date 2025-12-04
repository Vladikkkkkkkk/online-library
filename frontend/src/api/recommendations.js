import apiClient from './client';

export const recommendationsApi = {

  getRecommendations: async (limit = 10) => {
    const response = await apiClient.get('/recommendations', {
      params: { limit },
    });
    return response.data;
  },
};

