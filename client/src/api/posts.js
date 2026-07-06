import api from './axios';

export const postsAPI = {
  getFeed: (page = 1) => api.get(`/posts?page=${page}`),
  createPost: (data) => {
    if (data instanceof FormData) {
      return api.post('/posts', data, {
        headers: { 'Content-Type': undefined }
      });
    }
    return api.post('/posts', data);
  },
  getPost: (id) => api.get(`/posts/${id}`),
  deletePost: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.put(`/posts/${id}/like`),
  reactPost: (id, reaction) => api.put(`/posts/${id}/react`, { reaction }),
  getTrending: () => api.get('/posts/trending'),
  archivePost: (id) => api.put(`/posts/${id}/archive`),
  getArchivedPosts: () => api.get('/posts/archived'),
};
