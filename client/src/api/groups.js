import api from './axios';

export const groupsAPI = {
  list: (q = '', category = '') => {
    let url = '/groups';
    const params = [];
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  create: (data) => api.post('/groups', data),
  getMine: () => api.get('/groups/mine'),
  getDetail: (id) => api.get(`/groups/${id}`),
  toggleJoin: (id) => api.put(`/groups/${id}/join`),
  getPosts: (id) => api.get(`/groups/${id}/posts`),
  createPost: (id, content) => api.post(`/groups/${id}/posts`, { content }),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
};
