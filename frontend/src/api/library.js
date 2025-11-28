import apiClient from './client';

export const libraryApi = {
  // Get user's saved books
  getSavedBooks: async (params) => {
    const response = await apiClient.get('/library', { params });
    return response.data;
  },

  // Save book to library
  saveBook: async (bookId, source = 'local') => {
    const response = await apiClient.post(`/library/${bookId}`, { source });
    return response.data;
  },

  // Remove book from library
  removeBook: async (bookId, source = 'local') => {
    const response = await apiClient.delete(`/library/${bookId}`, { params: { source } });
    return response.data;
  },

  // Check if book is saved
  checkStatus: async (bookId, source = 'local') => {
    const response = await apiClient.get(`/library/${bookId}/status`, { params: { source } });
    return response.data;
  },

  // Get download history
  getDownloadHistory: async (params) => {
    const response = await apiClient.get('/library/downloads', { params });
    return response.data;
  },

  // Get user stats
  getUserStats: async () => {
    const response = await apiClient.get('/library/stats');
    return response.data;
  },
};

