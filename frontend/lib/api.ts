import axios from 'axios';
import { SearchResult } from '../types/profile';

const AUTH_TOKEN_KEY = 'wonderfuljodi_token';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function getAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function searchProfiles(query: string = '') {
  const cleanQuery = query.startsWith('?') ? query.slice(1) : query;
  const endpoint = cleanQuery ? `/search?${cleanQuery}` : '/search';
  const response = await api.get<{ success: boolean; data: SearchResult }>(endpoint);
  return response.data.data;
}

export default api;
