import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import toast from 'react-hot-toast';


export const useCategories = (params) => {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoriesApi.getAll(params),
    staleTime: 30 * 60 * 1000, 
  });
};


export const useCategory = (id) => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => categoriesApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
};


export const useCategoryBooks = (id, params) => {
  return useQuery({
    queryKey: ['category', id, 'books', params],
    queryFn: () => categoriesApi.getBooks(id, params),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};


export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      toast.success('Category created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
};


export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['category']);
      toast.success('Category updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
};


export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      toast.success('Category deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
};

