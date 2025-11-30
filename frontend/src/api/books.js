import apiClient from './client';

export const booksApi = {
  // Search books from Open Library
  search: async (params) => {
    const response = await apiClient.get('/books/search', { params });
    return response.data;
  },

  // Get all books (from Open Library)
  getAll: async (params) => {
    const response = await apiClient.get('/books', { params });
    return response.data;
  },

  // Get book by Open Library ID
  getById: async (openLibraryId) => {
    const response = await apiClient.get(`/books/${openLibraryId}`);
    return response.data;
  },

  // Get trending books
  getTrending: async (period = 'weekly', limit = 10) => {
    const response = await apiClient.get('/books/trending', { params: { period, limit } });
    return response.data;
  },
};
