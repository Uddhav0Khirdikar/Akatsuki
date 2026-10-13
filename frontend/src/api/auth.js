import apiClient from './client';

export const authApi = {
  // Standard email/roll number student login
  login: async (credentials) => {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  // Official College ERP Spring Security Login
  erpLogin: async (credentials) => {
    const response = await apiClient.post('/api/auth/erp-login', credentials);
    return response.data;
  },

  // Student self-registration
  register: async (userData) => {
    const response = await apiClient.post('/api/auth/register', userData);
    return response.data;
  },

  // Get current authenticated student profile and activity stats
  getMe: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  // Health check
  checkHealth: async () => {
    const response = await apiClient.get('/api/health');
    return response.data;
  },
};
