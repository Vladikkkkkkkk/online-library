import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../api/auth';
import { queryClient } from '../config/queryClient';


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


      initialize: async () => {

        let token = getStoredToken();


        if (!token) {
          token = get().token;
        }


        if (!token) {
          await new Promise(resolve => setTimeout(resolve, 50));
          token = get().token || getStoredToken();
        }


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

            console.log('Token verification failed, clearing auth:', error.message);
            set({ 
              user: null, 
              token: null, 
              isAuthenticated: false, 
              isLoading: false 
            });

            try {
              localStorage.removeItem('auth-storage');
            } catch {
              void 0;
            }
          }
        } else {

          set({ 
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null
          });
        }
      },


      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.login({ email, password });
          const { user, token } = response.data;


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


      register: async (data) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.register(data);
          const { user, token } = response.data;


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


      logout: () => {

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
          void 0;
        }
      },


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


      clearError: () => set({ error: null }),


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
