import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../api/books';
import toast from 'react-hot-toast';

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

// Get book by ID
export const useBook = (id, source = 'local') => {
  return useQuery({
    queryKey: ['book', id, source],
    queryFn: () => booksApi.getById(id, source),
    enabled: !!id,
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

// Download book
export const useDownloadBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => booksApi.download(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['book']);
      if (data.data?.fileUrl) {
        // Open download link
        window.open(data.data.fileUrl, '_blank');
      }
      toast.success('Download started!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to download book');
    },
  });
};

// Admin: Create book
export const useCreateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => booksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['books']);
      toast.success('Book created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create book');
    },
  });
};

// Admin: Update book
export const useUpdateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => booksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['books']);
      queryClient.invalidateQueries(['book']);
      toast.success('Book updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update book');
    },
  });
};

// Admin: Delete book
export const useDeleteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => booksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['books']);
      toast.success('Book deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete book');
    },
  });
};

// Admin: Import from Open Library
export const useImportBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ openLibraryId, categoryIds }) => booksApi.import(openLibraryId, categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries(['books']);
      toast.success('Book imported successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to import book');
    },
  });
};

