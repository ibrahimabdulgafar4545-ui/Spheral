import api from './axios';

export const friendsAPI = {
  getFriends: () => api.get('/friends'),
  getRequests: () => api.get('/friends/requests'),
  getSuggestions: () => api.get('/friends/suggestions'),
  sendRequest: (userId) => api.post(`/friends/request/${userId}`),
  cancelRequest: (userId) => api.post(`/friends/request/${userId}/cancel`),
  checkStatus: (userId) => api.get(`/friends/status/${userId}`),
  acceptRequest: (requestId) => api.put(`/friends/request/${requestId}/accept`),
  rejectRequest: (requestId) => api.put(`/friends/request/${requestId}/reject`),
  removeFriend: (userId) => api.delete(`/friends/${userId}`),
};
