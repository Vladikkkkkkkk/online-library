import apiClient from './client';

export const playlistsApi = {

  getUserPlaylists: async (params) => {
    const response = await apiClient.get('/playlists', { params });
    return response.data;
  },


  getById: async (id, params = {}) => {
    const response = await apiClient.get(`/playlists/${id}`, { params });
    return response.data;
  },


  create: async (data) => {
    const response = await apiClient.post('/playlists', data);
    return response.data;
  },


  update: async (id, data) => {
    const response = await apiClient.put(`/playlists/${id}`, data);
    return response.data;
  },


  delete: async (id) => {
    const response = await apiClient.delete(`/playlists/${id}`);
    return response.data;
  },


  addBook: async (playlistId, openLibraryId) => {
    const response = await apiClient.post(`/playlists/${playlistId}/books`, { openLibraryId });
    return response.data;
  },


  removeBook: async (playlistId, openLibraryId) => {
    const response = await apiClient.delete(`/playlists/${playlistId}/books/${openLibraryId}`);
    return response.data;
  },


  reorderBooks: async (playlistId, order) => {
    const response = await apiClient.put(`/playlists/${playlistId}/books/reorder`, { order });
    return response.data;
  },
};

