import api from './axios';

export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getUnreadCount: () => api.get('/messages/unread-count'),
  getMessages: (friendId) => api.get(`/messages/${friendId}`),
  sendMessage: (receiverId, content, parentMessageId = null, type = 'text', fileUrl = null) => 
    api.post('/messages', { receiverId, content, parentMessageId, type, fileUrl }),
  sendMediaMessage: (formData) => api.post('/messages', formData, {
    headers: { 'Content-Type': undefined }
  }),
  editMessage: (messageId, content) => api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId, type = 'everyone') => api.delete(`/messages/${messageId}?type=${type}`),
  // New: delete entire conversation for the logged‑in user
  deleteConversation: (friendId) => api.delete(`/messages/conversations/${friendId}`),
  callAssistant: (prompt, textContext) => api.post('/messages/assistant', { prompt, textContext }),
  reactToMessage: (messageId, reaction) => api.put(`/messages/${messageId}/react`, { reaction }),
  getAgoraToken: (channelName) => api.get(`/calls/token?channelName=${channelName}`),
  getActiveStreams: () => api.get('/calls/active'),
};
