import { api } from '/js/api.js';

export function getCurrentUser() {
  return api.get('/me');
}

export function getEvents({ page = 1, limit = 200, fromDate = null, toDate = null } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  return api.get(`/events?${params.toString()}`);
}

export function createEvent(payload) {
  return api.post('/events', payload);
}

export function updateEvent(eventId, payload) {
  return api.patch(`/events/${eventId}`, payload);
}

export function getEventDetail(eventId) {
  return api.get(`/events/${eventId}`);
}

export function createEventShareLink(eventId) {
  return api.post(`/events/${eventId}/share`);
}

export function enableEventChat(eventId) {
  return api.post(`/events/${eventId}/chat/enable`);
}

export function exportEventIcs(eventId) {
  return api.get(`/events/${eventId}/ics`);
}

export function exportEventsIcs() {
  return api.get('/events/ics');
}

export function importEventsIcs(formData) {
  return api.postForm('/events/import/ics', formData);
}
