import api from './axios';

export const reportsAPI = {
  createReport: (data) => api.post('/reports', data),
};
