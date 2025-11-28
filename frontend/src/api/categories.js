import apiClient from './client';

export const categoriesApi = {
  // Get all categories
  getAll: async (params) => {
    const response = await apiClient.get('/categories', { params });
    return response.data;
  },

  // Get category by ID or slug
  getById: async (id) => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  // Get books by category
  getBooks: async (id, params) => {
    const response = await apiClient.get(`/categories/${id}/books`, { params });
    return response.data;
  },

  // Admin: Create category
  create: async (data) => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  // Admin: Update category
  update: async (id, data) => {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  // Admin: Delete category
  delete: async (id) => {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },
};

