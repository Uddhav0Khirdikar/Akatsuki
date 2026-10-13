import apiClient from './client';

export const jobsApi = {
  // Discover campus jobs with filters
  getJobs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'ALL') params.append('category', filters.category);
    if (filters.location_type && filters.location_type !== 'ALL') params.append('location_type', filters.location_type);
    if (filters.department && filters.department !== 'ALL') params.append('department', filters.department);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await apiClient.get(`/api/jobs?${params.toString()}`);
    return response.data;
  },

  // Get job by ID
  getJobById: async (id) => {
    const response = await apiClient.get(`/api/jobs/${id}`);
    return response.data;
  },

  // Create new opportunity
  createJob: async (jobData) => {
    const response = await apiClient.post('/api/jobs', jobData);
    return response.data;
  },

  // Update existing job
  updateJob: async (id, jobData) => {
    const response = await apiClient.put(`/api/jobs/${id}`, jobData);
    return response.data;
  },

  // Toggle status: OPEN <-> CLOSED (GitHub Issue style)
  updateJobStatus: async (id, status) => {
    const response = await apiClient.patch(`/api/jobs/${id}/status`, { status });
    return response.data;
  },

  // Delete job
  deleteJob: async (id) => {
    const response = await apiClient.delete(`/api/jobs/${id}`);
    return response.data;
  },

  // Get jobs posted by current user
  getMyPostedJobs: async () => {
    const response = await apiClient.get('/api/jobs/my/posted');
    return response.data;
  },
};
