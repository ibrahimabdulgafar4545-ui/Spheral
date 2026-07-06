import api from './axios';

export const eventsAPI = {
  getEvents: () => api.get('/events'),
  createEvent: (data) => api.post('/events', data),
  rsvpEvent: (id) => api.put(`/events/${id}/rsvp`),
};
