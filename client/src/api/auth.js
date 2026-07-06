import api from './axios';

export const authAPI = {
  /** POST /api/auth/signup */
  signup: (data) => api.post('/auth/signup', data),

  /** POST /api/auth/login */
  login: (data) => api.post('/auth/login', data),

  /** POST /api/auth/logout */
  logout: () => api.post('/auth/logout'),

  /** GET /api/auth/me — get current authenticated user */
  me: () => api.get('/auth/me'),

  /** POST /api/auth/send-code — request email/SMS code */
  sendCode: (data) => api.post('/auth/send-code', data),

  /** POST /api/auth/verify-code — verify email/SMS code */
  verifyCode: (data) => api.post('/auth/verify-code', data),
  updatePassword: (data) => api.put('/auth/password', data),
  googleLogin: (accessToken) => api.post('/auth/google', { accessToken }),
};
