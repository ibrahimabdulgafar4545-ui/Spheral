import api from './axios';

export const supportAPI = {
  submitTicket: (data) => api.post('/support', data),
};
