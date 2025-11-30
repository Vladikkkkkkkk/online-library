import { useQuery } from '@tanstack/react-query';
import { booksApi } from '../api/books';

// Search books
export const useSearchBooks = (params, enabled = true) => {
  return useQuery({
    queryKey: ['books', 'search', params],
    queryFn: () => booksApi.search(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get all books
export const useBooks = (params) => {
  return useQuery({
    queryKey: ['books', params],
    queryFn: () => booksApi.getAll(params),
    staleTime: 5 * 60 * 1000,
  });
};

// Get book by Open Library ID
export const useBook = (openLibraryId) => {
  return useQuery({
    queryKey: ['book', openLibraryId],
    queryFn: () => booksApi.getById(openLibraryId),
    enabled: !!openLibraryId,
    staleTime: 10 * 60 * 1000,
  });
};

// Get trending books
export const useTrendingBooks = (period = 'weekly', limit = 10) => {
  return useQuery({
    queryKey: ['books', 'trending', period, limit],
    queryFn: () => booksApi.getTrending(period, limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
