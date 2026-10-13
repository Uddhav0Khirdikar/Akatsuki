import axios from 'axios';

// API Base URL from environment variables (falls back to http://localhost:5000)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('akatsuki_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized on protected routes
      const isAuthRoute = error.config.url.includes('/api/auth/login') || 
                          error.config.url.includes('/api/auth/erp-login') ||
                          error.config.url.includes('/api/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('akatsuki_token');
        localStorage.removeItem('akatsuki_user');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
