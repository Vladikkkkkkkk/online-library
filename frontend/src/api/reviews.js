import apiClient from './client';

export const reviewsApi = {
  // Get reviews for a book
  getBookReviews: async (openLibraryId, params) => {
    const response = await apiClient.get(`/books/${openLibraryId}/reviews`, { params });
    return response.data;
  },

  // Get user's review for a book
  getUserReview: async (openLibraryId) => {
    const response = await apiClient.get(`/books/${openLibraryId}/reviews/my`);
    return response.data;
  },

  // Create or update review
  createOrUpdate: async (openLibraryId, data) => {
    const response = await apiClient.post(`/books/${openLibraryId}/reviews`, data);
    return response.data;
  },

  // Delete review
  delete: async (openLibraryId) => {
    const response = await apiClient.delete(`/books/${openLibraryId}/reviews`);
    return response.data;
  },

  // Get user's reviews
  getUserReviews: async (params) => {
    const response = await apiClient.get('/reviews/my', { params });
    return response.data;
  },
};

