import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../api/reviews';
import toast from 'react-hot-toast';


export const useBookReviews = (openLibraryId, params) => {
  return useQuery({
    queryKey: ['reviews', 'book', openLibraryId, params],
    queryFn: () => reviewsApi.getBookReviews(openLibraryId, params),
    enabled: !!openLibraryId,
    staleTime: 2 * 60 * 1000,
  });
};


export const useUserReview = (openLibraryId, options = {}) => {
  return useQuery({
    queryKey: ['review', 'user', openLibraryId],
    queryFn: () => reviewsApi.getUserReview(openLibraryId),
    enabled: !!openLibraryId && (options.enabled !== false),
    staleTime: 2 * 60 * 1000,
    retry: false, 
  });
};


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


export const useUserReviews = (params) => {
  return useQuery({
    queryKey: ['reviews', 'user', params],
    queryFn: () => reviewsApi.getUserReviews(params),
    staleTime: 2 * 60 * 1000,
  });
};

