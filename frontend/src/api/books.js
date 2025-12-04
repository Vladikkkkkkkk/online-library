import apiClient from './client';

export const booksApi = {

  search: async (params) => {
    const response = await apiClient.get('/books/search', { params });
    return response.data;
  },


  getAll: async (params) => {
    const response = await apiClient.get('/books', { params });
    return response.data;
  },


  getById: async (openLibraryId) => {
    const response = await apiClient.get(`/books/${openLibraryId}`);
    return response.data;
  },


  getTrending: async (period = 'weekly', limit = 10) => {
    const response = await apiClient.get('/books/trending', { params: { period, limit } });
    return response.data;
  },
};
