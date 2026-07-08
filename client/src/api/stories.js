import api from './axios';

export const storiesAPI = {
  getStories: () => api.get('/stories'),
  createStory: (formData) => api.post('/stories', formData, {
    headers: { 'Content-Type': undefined }
  }),
  likeSlide: (storyId, slideId) => api.put(`/stories/${storyId}/slides/${slideId}/like`),
  deleteSlide: (slideId) => api.delete(`/stories/slides/${slideId}`),
};
