import api from './axios';

export const commentsAPI = {
  getComments: (postId) => api.get(`/comments/${postId}`),
  createComment: (postId, content) => api.post(`/comments/${postId}`, { content }),
  toggleLike: (commentId) => api.put(`/comments/${commentId}/like`),
  reactComment: (commentId, reaction) => api.put(`/comments/${commentId}/react`, { reaction }),
  addReply: (commentId, content) => api.post(`/comments/${commentId}/reply`, { content }),
  editComment: (commentId, content) => api.put(`/comments/${commentId}`, { content }),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`),
};
