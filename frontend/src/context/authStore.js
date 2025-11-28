import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Initialize auth state from storage
      initialize: async () => {
        const token = get().token;
        if (token) {
          try {
            set({ isLoading: true });
            const response = await authApi.getMe();
            set({ user: response.data, isAuthenticated: true, isLoading: false });
          } catch (error) {
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
            localStorage.removeItem('auth-storage');
          }
        }
      },

      // Login
      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.login({ email, password });
          const { user, token } = response.data;
          
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
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
        localStorage.removeItem('auth-storage');
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
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;

