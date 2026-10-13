import apiClient from './client';

export const applicationsApi = {
  // Apply to a job posting
  applyToJob: async (jobId, { pitch_note, resume_url }) => {
    const response = await apiClient.post(`/api/jobs/${jobId}/apply`, {
      pitch_note,
      resume_url,
    });
    return response.data;
  },

  // Job creator view: get all applicants for this specific job
  getJobApplications: async (jobId) => {
    const response = await apiClient.get(`/api/jobs/${jobId}/applications`);
    return response.data;
  },

  // Student view: get all jobs applied to
  getMyApplications: async () => {
    const response = await apiClient.get('/api/applications/my');
    return response.data;
  },

  // Job creator updates applicant review status (PENDING, SHORTLISTED, ACCEPTED, REJECTED)
  updateApplicationStatus: async (applicationId, status) => {
    const response = await apiClient.patch(`/api/applications/${applicationId}/status`, {
      status,
    });
    return response.data;
  },
};
