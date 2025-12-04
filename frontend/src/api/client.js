import axios from 'axios';
import { getApiUrl } from '../utils/apiUrl';

const API_BASE_URL = getApiUrl();


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


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


apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';


    if (error.response?.status === 401) {

      const isInitializationRequest = error.config?.url?.includes('/auth/me');


      const currentPath = window.location.pathname;
      const isPublicPage = currentPath.startsWith('/books') || 
                          currentPath.startsWith('/categories') || 
                          currentPath === '/' ||
                          currentPath.includes('/login') || 
                          currentPath.includes('/register');


      if (!isInitializationRequest && !isPublicPage) {

        try {
          localStorage.removeItem('auth-storage');
        } catch {
          void 0;
        }

        window.location.href = '/login';
      }

    }


    if (error.response?.status === 403) {

      try {
        localStorage.removeItem('auth-storage');
      } catch {
        void 0;
      }

      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ message, status: error.response?.status });
  }
);

export default apiClient;

