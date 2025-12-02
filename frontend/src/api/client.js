import axios from 'axios';
import { getApiUrl } from '../utils/apiUrl';

const API_BASE_URL = getApiUrl();

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token || null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error reading auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      // Don't redirect during initialization - let the auth store handle it
      const isInitializationRequest = error.config?.url?.includes('/auth/me');
      
      // Don't redirect for public pages (books, categories) - they should be accessible without auth
      const currentPath = window.location.pathname;
      const isPublicPage = currentPath.startsWith('/books') || 
                          currentPath.startsWith('/categories') || 
                          currentPath === '/' ||
                          currentPath.includes('/login') || 
                          currentPath.includes('/register');
      
      // Only redirect if not on public pages and not during initialization
      if (!isInitializationRequest && !isPublicPage) {
        // Clear auth storage (zustand persist format)
        try {
          localStorage.removeItem('auth-storage');
        } catch {
          // Ignore errors
        }
        // Redirect to login
        window.location.href = '/login';
      }
      // For public pages, just reject the promise without redirecting
    }
    
    // Handle 403 - Forbidden (blocked user)
    if (error.response?.status === 403) {
      // Clear auth storage for blocked users
      try {
        localStorage.removeItem('auth-storage');
      } catch {
        // Ignore errors
      }
      // Redirect to login page if not already there
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ message, status: error.response?.status });
  }
);

export default apiClient;

