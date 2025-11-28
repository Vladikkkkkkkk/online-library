import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi } from '../api/library';
import toast from 'react-hot-toast';

// Get saved books
export const useSavedBooks = (params) => {
  return useQuery({
    queryKey: ['library', 'saved', params],
    queryFn: () => libraryApi.getSavedBooks(params),
    staleTime: 2 * 60 * 1000,
  });
};

// Check if book is saved
export const useBookStatus = (bookId, source = 'local') => {
  return useQuery({
    queryKey: ['library', 'status', bookId, source],
    queryFn: () => libraryApi.checkStatus(bookId, source),
    enabled: !!bookId,
  });
};

// Save book to library
export const useSaveBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, source = 'local' }) => libraryApi.saveBook(bookId, source),
    onSuccess: (_, { bookId, source = 'local' }) => {
      queryClient.invalidateQueries(['library']);
      queryClient.setQueryData(['library', 'status', bookId, source], { success: true, data: { isSaved: true } });
      toast.success('Book saved to library!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to save book');
    },
  });
};

// Remove book from library
export const useRemoveBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, source = 'local' }) => libraryApi.removeBook(bookId, source),
    onSuccess: (_, { bookId, source = 'local' }) => {
      queryClient.invalidateQueries(['library']);
      queryClient.setQueryData(['library', 'status', bookId, source], { success: true, data: { isSaved: false } });
      toast.success('Book removed from library!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to remove book');
    },
  });
};

// Get download history
export const useDownloadHistory = (params) => {
  return useQuery({
    queryKey: ['library', 'downloads', params],
    queryFn: () => libraryApi.getDownloadHistory(params),
    staleTime: 2 * 60 * 1000,
  });
};

// Get user stats
export const useUserStats = () => {
  return useQuery({
    queryKey: ['library', 'stats'],
    queryFn: () => libraryApi.getUserStats(),
    staleTime: 5 * 60 * 1000,
  });
};

