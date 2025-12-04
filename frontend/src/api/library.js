import apiClient from './client';

export const libraryApi = {

  getSavedBooks: async (params) => {
    const response = await apiClient.get('/library', { params });
    return response.data;
  },


  saveBook: async (openLibraryId) => {
    const response = await apiClient.post(`/library/${openLibraryId}`);
    return response.data;
  },


  removeBook: async (openLibraryId) => {
    const response = await apiClient.delete(`/library/${openLibraryId}`);
    return response.data;
  },


  checkStatus: async (openLibraryId) => {
    const response = await apiClient.get(`/library/${openLibraryId}/status`);
    return response.data;
  },


  getUserStats: async () => {
    const response = await apiClient.get('/library/stats');
    return response.data;
  },
};
