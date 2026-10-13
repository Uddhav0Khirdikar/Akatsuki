import apiClient from './client';

export const conversationsApi = {
  // Start or get existing DM thread tied specifically to a job
  getOrCreateJobConversation: async (jobId) => {
    const response = await apiClient.post(`/api/conversations/job/${jobId}`);
    return response.data;
  },

  // Job creator view: fetch all student DM inquiries specifically for this job (per-job threads)
  getJobConversations: async (jobId) => {
    const response = await apiClient.get(`/api/jobs/${jobId}/conversations`);
    return response.data;
  },

  // Student view: fetch all conversations user participates in
  getUserConversations: async () => {
    const response = await apiClient.get('/api/conversations');
    return response.data;
  },

  // Get messages for a conversation (automatically marks unread as read)
  getConversationMessages: async (conversationId) => {
    const response = await apiClient.get(`/api/conversations/${conversationId}/messages`);
    return response.data;
  },

  // Send a message inside a conversation thread
  sendMessage: async (conversationId, content) => {
    const response = await apiClient.post(`/api/conversations/${conversationId}/messages`, {
      content,
    });
    return response.data;
  },
};
