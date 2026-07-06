import api from './axios';

export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (id, data) => api.put(`/users/${id}`, data),
  uploadImage: (id, formData, type = 'avatar') =>
    api.post(`/users/${id}/upload?type=${type}`, formData, {
      headers: { 'Content-Type': undefined }
    }),
  getPosts: (id, page = 1) => api.get(`/users/${id}/posts?page=${page}`),
  getFriends: (id) => api.get(`/users/${id}/friends`),
  search: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  updatePreferences: (id, theme) => api.put(`/users/${id}/preferences`, { theme }),
  updateLanguagePreference: (id, language) => api.put(`/users/${id}/preferences`, { language }),
  blockUser: (id) => api.post(`/users/${id}/block`),
  getInsights: (id) => api.get(`/users/${id}/insights`),
  getIdByUsername: (username) => api.get(`/users/username/${username}`),
  acknowledgeVerification: () => api.post('/users/acknowledge-verification'),
};
