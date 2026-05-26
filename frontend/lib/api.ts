import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const apiURL = process.env.NEXT_PUBLIC_API_URL;
const baseURL = apiURL
  ? apiURL.replace(/\/$/, "").endsWith("/api")
    ? apiURL.replace(/\/$/, "")
    : `${apiURL.replace(/\/$/, "")}/api`
  : undefined;

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (optional: handle 401 unauthenticated globally)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Auto logout if 401
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
