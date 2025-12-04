import apiClient from './client';

export const reviewsApi = {

  getBookReviews: async (openLibraryId, params) => {
    const response = await apiClient.get(`/books/${openLibraryId}/reviews`, { params });
    return response.data;
  },


  getUserReview: async (openLibraryId) => {
    const response = await apiClient.get(`/books/${openLibraryId}/reviews/my`);
    return response.data;
  },


  createOrUpdate: async (openLibraryId, data) => {
    const response = await apiClient.post(`/books/${openLibraryId}/reviews`, data);
    return response.data;
  },


  delete: async (openLibraryId) => {
    const response = await apiClient.delete(`/books/${openLibraryId}/reviews`);
    return response.data;
  },


  getUserReviews: async (params) => {
    const response = await apiClient.get('/reviews/my', { params });
    return response.data;
  },
};

