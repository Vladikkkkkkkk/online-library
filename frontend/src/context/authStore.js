import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../api/auth';
import { queryClient } from '../config/queryClient';

// Helper function to read token from localStorage
const getStoredToken = () => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed?.state?.token || null;
    }
  } catch (error) {
    console.error('Error reading auth storage:', error);
  }
  return null;
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // Initialize auth state from storage
      initialize: async () => {
        // First, try to get token from localStorage directly (fastest)
        let token = getStoredToken();
        
        // Also check state (in case zustand already rehydrated)
        if (!token) {
          token = get().token;
        }

        // If still no token, wait a bit for zustand to rehydrate
        if (!token) {
          await new Promise(resolve => setTimeout(resolve, 50));
          token = get().token || getStoredToken();
        }

        // If we have a token, verify it with the server
        if (token) {
          try {
            set({ isLoading: true, token });
            const response = await authApi.getMe();
            set({ 
              user: response.data, 
              token,
              isAuthenticated: true, 
              isLoading: false
            });
          } catch (error) {
            // Token is invalid or expired
            console.log('Token verification failed, clearing auth:', error.message);
            set({ 
              user: null, 
              token: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
            // Clear corrupted storage
            try {
              localStorage.removeItem('auth-storage');
            } catch {
              // Ignore errors
            }
          }
        } else {
          // No token, user is not authenticated
          set({ 
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null
          });
        }
      },

      // Login
      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.login({ email, password });
          const { user, token } = response.data;
          
          // Clear React Query cache to prevent data from previous user
          queryClient.clear();
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          return { success: true };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Register
      register: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.register(data);
          const { user, token } = response.data;
          
          // Clear React Query cache to start fresh
          queryClient.clear();
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          return { success: true };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Logout
      logout: () => {
        // Clear React Query cache to prevent data leakage between users
        queryClient.clear();
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
        try {
          localStorage.removeItem('auth-storage');
        } catch {
          // Ignore errors
        }
      },

      // Update profile
      updateProfile: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.updateProfile(data);
          set({ user: response.data, isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        try {
          set({ isLoading: true, error: null });
          await authApi.changePassword({ currentPassword, newPassword });
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if user is admin
      isAdmin: () => get().user?.role === 'ADMIN',
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export default useAuthStore;
