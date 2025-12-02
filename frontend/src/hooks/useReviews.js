import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../api/reviews';
import toast from 'react-hot-toast';

// Get reviews for a book
export const useBookReviews = (openLibraryId, params) => {
  return useQuery({
    queryKey: ['reviews', 'book', openLibraryId, params],
    queryFn: () => reviewsApi.getBookReviews(openLibraryId, params),
    enabled: !!openLibraryId,
    staleTime: 2 * 60 * 1000,
  });
};

// Get user's review for a book
export const useUserReview = (openLibraryId, options = {}) => {
  return useQuery({
    queryKey: ['review', 'user', openLibraryId],
    queryFn: () => reviewsApi.getUserReview(openLibraryId),
    enabled: !!openLibraryId && (options.enabled !== false),
    staleTime: 2 * 60 * 1000,
    retry: false, // Don't retry on 401 errors
  });
};

// Create or update review
export const useCreateOrUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ openLibraryId, data }) => reviewsApi.createOrUpdate(openLibraryId, data),
    onSuccess: (_, { openLibraryId }) => {
      queryClient.invalidateQueries(['reviews', 'book', openLibraryId]);
      queryClient.invalidateQueries(['review', 'user', openLibraryId]);
      queryClient.invalidateQueries(['reviews', 'user']);
      toast.success('Review saved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to save review');
    },
  });
};

// Delete review
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (openLibraryId) => reviewsApi.delete(openLibraryId),
    onSuccess: (_, openLibraryId) => {
      queryClient.invalidateQueries(['reviews', 'book', openLibraryId]);
      queryClient.invalidateQueries(['review', 'user', openLibraryId]);
      queryClient.invalidateQueries(['reviews', 'user']);
      toast.success('Review deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete review');
    },
  });
};

// Get user's reviews
export const useUserReviews = (params) => {
  return useQuery({
    queryKey: ['reviews', 'user', params],
    queryFn: () => reviewsApi.getUserReviews(params),
    staleTime: 2 * 60 * 1000,
  });
};

