import apiClient from './client';

export const libraryApi = {
  // Get user's saved books
  getSavedBooks: async (params) => {
    const response = await apiClient.get('/library', { params });
    return response.data;
  },

  // Save book to library (Open Library books only)
  saveBook: async (openLibraryId) => {
    const response = await apiClient.post(`/library/${openLibraryId}`);
    return response.data;
  },

  // Remove book from library
  removeBook: async (openLibraryId) => {
    const response = await apiClient.delete(`/library/${openLibraryId}`);
    return response.data;
  },

  // Check if book is saved
  checkStatus: async (openLibraryId) => {
    const response = await apiClient.get(`/library/${openLibraryId}/status`);
    return response.data;
  },

  // Get user stats
  getUserStats: async () => {
    const response = await apiClient.get('/library/stats');
    return response.data;
  },
};
