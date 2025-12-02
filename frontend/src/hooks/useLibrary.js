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
export const useBookStatus = (openLibraryId, options = {}) => {
  return useQuery({
    queryKey: ['library', 'status', openLibraryId],
    queryFn: () => libraryApi.checkStatus(openLibraryId),
    enabled: !!openLibraryId && (options.enabled !== false),
    retry: false, // Don't retry on 401 errors
  });
};

// Save book to library
export const useSaveBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ openLibraryId }) => libraryApi.saveBook(openLibraryId),
    onSuccess: (_, { openLibraryId }) => {
      // Invalidate all library queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.setQueryData(['library', 'status', openLibraryId], { success: true, data: { isSaved: true } });
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
    mutationFn: ({ openLibraryId }) => libraryApi.removeBook(openLibraryId),
    onSuccess: (_, { openLibraryId }) => {
      // Invalidate all library queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.setQueryData(['library', 'status', openLibraryId], { success: true, data: { isSaved: false } });
      toast.success('Book removed from library!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to remove book');
    },
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
