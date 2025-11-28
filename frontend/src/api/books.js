import apiClient from './client';

export const booksApi = {
  // Search books
  search: async (params) => {
    const response = await apiClient.get('/books/search', { params });
    return response.data;
  },

  // Get all books (local)
  getAll: async (params) => {
    const response = await apiClient.get('/books', { params });
    return response.data;
  },

  // Get book by ID
  getById: async (id, source = 'local') => {
    const response = await apiClient.get(`/books/${id}`, { params: { source } });
    return response.data;
  },

  // Get trending books
  getTrending: async (period = 'weekly', limit = 10) => {
    const response = await apiClient.get('/books/trending', { params: { period, limit } });
    return response.data;
  },

  // Download book (record download and get URL)
  download: async (id) => {
    const response = await apiClient.post(`/books/${id}/download`);
    return response.data;
  },

  // Admin: Create book
  create: async (data) => {
    const response = await apiClient.post('/books', data);
    return response.data;
  },

  // Admin: Update book
  update: async (id, data) => {
    const response = await apiClient.put(`/books/${id}`, data);
    return response.data;
  },

  // Admin: Delete book
  delete: async (id) => {
    const response = await apiClient.delete(`/books/${id}`);
    return response.data;
  },

  // Admin: Import from Open Library
  import: async (openLibraryId, categoryIds = []) => {
    const response = await apiClient.post('/books/import', { openLibraryId, categoryIds });
    return response.data;
  },
};

