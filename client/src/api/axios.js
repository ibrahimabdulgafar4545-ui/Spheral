import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,          // send/receive httpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach local storage token as Authorization Bearer if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('spheral_active_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res.data,              // unwrap .data so callers get the payload directly
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
