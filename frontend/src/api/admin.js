import apiClient from './client';

export const adminApi = {

  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },


  getUsers: async (params) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUserRole: async (id, role) => {
    const response = await apiClient.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  toggleUserBlock: async (id, isBlocked) => {
    const response = await apiClient.put(`/admin/users/${id}/block`, { isBlocked });
    return response.data;
  },


  getAuthors: async (params) => {
    const response = await apiClient.get('/admin/authors', { params });
    return response.data;
  },

  createAuthor: async (data) => {
    const response = await apiClient.post('/admin/authors', data);
    return response.data;
  },

  updateAuthor: async (id, data) => {
    const response = await apiClient.put(`/admin/authors/${id}`, data);
    return response.data;
  },

  deleteAuthor: async (id) => {
    const response = await apiClient.delete(`/admin/authors/${id}`);
    return response.data;
  },


  createBook: async (data) => {
    const response = await apiClient.post('/books', data);
    return response.data;
  },

  updateBook: async (id, data) => {
    const response = await apiClient.put(`/books/${id}`, data);
    return response.data;
  },

  deleteBook: async (id) => {
    const response = await apiClient.delete(`/books/${id}`);
    return response.data;
  },

  importBook: async (openLibraryId, categoryIds) => {
    const response = await apiClient.post('/books/import', { openLibraryId, categoryIds });
    return response.data;
  },
};

