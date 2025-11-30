import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsApi } from '../api/playlists';
import toast from 'react-hot-toast';

// Get user's playlists
export const useUserPlaylists = (params) => {
  return useQuery({
    queryKey: ['playlists', 'user', params],
    queryFn: () => playlistsApi.getUserPlaylists(params),
    staleTime: 2 * 60 * 1000,
  });
};

// Get playlist by ID
export const usePlaylist = (id) => {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => playlistsApi.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Create playlist
export const useCreatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => playlistsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['playlists']);
      toast.success('Playlist created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to create playlist');
    },
  });
};

// Update playlist
export const useUpdatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => playlistsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries(['playlists']);
      queryClient.invalidateQueries(['playlist', id]);
      toast.success('Playlist updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to update playlist');
    },
  });
};

// Delete playlist
export const useDeletePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => playlistsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['playlists']);
      toast.success('Playlist deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete playlist');
    },
  });
};

// Add book to playlist
export const useAddBookToPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, openLibraryId }) => playlistsApi.addBook(playlistId, openLibraryId),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries(['playlist', playlistId]);
      queryClient.invalidateQueries(['playlists']);
      toast.success('Book added to playlist!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to add book to playlist');
    },
  });
};

// Remove book from playlist
export const useRemoveBookFromPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, openLibraryId }) => playlistsApi.removeBook(playlistId, openLibraryId),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries(['playlist', playlistId]);
      queryClient.invalidateQueries(['playlists']);
      toast.success('Book removed from playlist!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to remove book from playlist');
    },
  });
};

// Reorder books in playlist
export const useReorderPlaylistBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, order }) => playlistsApi.reorderBooks(playlistId, order),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries(['playlist', playlistId]);
      toast.success('Playlist reordered successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to reorder playlist');
    },
  });
};

