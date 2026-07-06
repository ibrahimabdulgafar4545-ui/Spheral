import api from './axios';

export const activityAPI = {
  getActivity: () => api.get('/activity').then((res) => res.data),
};
