import axios from 'axios';

// Vercel'de env var yüklenmezse direkt Render URL'ini kullan
const API_URL = import.meta.env.VITE_API_URL || 'https://avukat-oyunu-api.onrender.com';
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://avukat-oyunu-api.onrender.com';

export { WS_URL };

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// JWT token'ı her isteğe otomatik ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 (Unauthorized) durumunda token'ı sil ve login'e at
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
