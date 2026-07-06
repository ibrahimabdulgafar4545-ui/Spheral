import api from './axios';

export const reelsAPI = {
  getReels:       ()           => api.get('/reels'),
  getSavedReels:  ()           => api.get('/reels/saved'),
  getUserReels:   (userId)     => api.get(`/reels/user/${userId}`),
  uploadReel:     (data)       => api.post('/reels/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  likeReel:       (id)         => api.put(`/reels/${id}/like`),
  saveReel:       (id)         => api.put(`/reels/${id}/save`),
  shareReel:      (id)         => api.put(`/reels/${id}/share`),
  notInterested:  (id)         => api.put(`/reels/${id}/not-interested`),
  commentOnReelFull: (id, payload) => api.post(`/reels/${id}/comment`, payload),
  editComment: (reelId, commentId, text) => api.put(`/reels/${reelId}/comment/${commentId}`, { text }),
  deleteComment: (reelId, commentId) => api.delete(`/reels/${reelId}/comment/${commentId}`),
  deleteReel:     (id)         => api.delete(`/reels/${id}`),
  // New reaction endpoint supporting multiple reaction types
  reactReel:      (id, type)   => api.put(`/reels/${id}/react`, { type }),
  reactComment: (reelId, commentId, reaction) => api.put(`/reels/${reelId}/comments/${commentId}/react`, { reaction }),
};
