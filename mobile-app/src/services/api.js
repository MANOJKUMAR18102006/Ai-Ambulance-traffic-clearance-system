import axios from 'axios';
import { API_BASE } from '../config';

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

// Attach token interceptor
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export const loginApi = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

export const registerApi = (name, email, password, role) =>
  api.post('/auth/register', { name, email, password, role }).then(r => r.data);

export const fetchRoute = (start, end) =>
  api.post('/route', { start, end }).then(r => r.data);

export const fetchHospitals = (lat, lng) =>
  api.get(`/hospitals?lat=${lat}&lng=${lng}`).then(r => r.data);

export const getSignals = (routeId) =>
  api.get(`/signal${routeId ? `?routeId=${routeId}` : ''}`).then(r => r.data);

export const updateSignals = (signals, ambulanceLat, ambulanceLng, routeId) =>
  api.post('/signal', { signals, ambulanceLat, ambulanceLng, routeId }).then(r => r.data);

export const getMyAmbulance = () =>
  api.get('/ambulance/mine').then(r => r.data);

export const updateMyAmbulance = (data) =>
  api.put('/ambulance/mine', data).then(r => r.data);

export const getAllAmbulances = () =>
  api.get('/ambulance/all').then(r => r.data);

export const createAccident = (lat, lng, severity, routeId) =>
  api.post('/accident', { lat, lng, severity, routeId }).then(r => r.data);

export const getAccidents = (routeId) =>
  api.get(`/accident${routeId ? `?routeId=${routeId}` : ''}`).then(r => r.data);

export const resolveAccident = (id) =>
  api.put(`/accident/${id}/resolve`).then(r => r.data);

export const nominatimSearch = async (q) => {
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q, format: 'json', limit: 5 },
    headers: { 'Accept-Language': 'en' },
  });
  return data;
};

export default api;
