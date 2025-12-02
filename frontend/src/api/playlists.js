import apiClient from './client';

export const playlistsApi = {
  // Get user's playlists
  getUserPlaylists: async (params) => {
    const response = await apiClient.get('/playlists', { params });
    return response.data;
  },

  // Get playlist by ID
  getById: async (id, params = {}) => {
    const response = await apiClient.get(`/playlists/${id}`, { params });
    return response.data;
  },

  // Create playlist
  create: async (data) => {
    const response = await apiClient.post('/playlists', data);
    return response.data;
  },

  // Update playlist
  update: async (id, data) => {
    const response = await apiClient.put(`/playlists/${id}`, data);
    return response.data;
  },

  // Delete playlist
  delete: async (id) => {
    const response = await apiClient.delete(`/playlists/${id}`);
    return response.data;
  },

  // Add book to playlist
  addBook: async (playlistId, openLibraryId) => {
    const response = await apiClient.post(`/playlists/${playlistId}/books`, { openLibraryId });
    return response.data;
  },

  // Remove book from playlist
  removeBook: async (playlistId, openLibraryId) => {
    const response = await apiClient.delete(`/playlists/${playlistId}/books/${openLibraryId}`);
    return response.data;
  },

  // Reorder books in playlist
  reorderBooks: async (playlistId, order) => {
    const response = await apiClient.put(`/playlists/${playlistId}/books/reorder`, { order });
    return response.data;
  },
};

