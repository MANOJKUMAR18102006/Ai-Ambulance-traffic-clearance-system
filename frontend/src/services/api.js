import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const fetchRoute = (start, end) =>
  api.post('/route', { start, end }).then((r) => r.data);

export const fetchHospitals = (lat, lng) =>
  api.get(`/hospitals?lat=${lat}&lng=${lng}`).then((r) => r.data);

export const fetchTraffic = () =>
  api.get('/traffic').then((r) => r.data);

export const getSignals = (routeId) =>
  api.get(`/signal${routeId ? `?routeId=${routeId}` : ''}`).then((r) => r.data);

export const updateSignalById = (id, data) =>
  api.put(`/signal/${id}`, data).then((r) => r.data);

export const updateSignals = (signals, ambulanceLat, ambulanceLng, routeId) =>
  api.post('/signal', { signals, ambulanceLat, ambulanceLng, routeId }).then((r) => r.data);

export const createAccident = (lat, lng, severity, routeId) =>
  api.post('/accident', { lat, lng, severity, routeId }).then((r) => r.data);

export const getAccidents = (routeId) =>
  api.get(`/accident${routeId ? `?routeId=${routeId}` : ''}`).then((r) => r.data);

export const resolveAccident = (id) =>
  api.put(`/accident/${id}/resolve`).then((r) => r.data);
