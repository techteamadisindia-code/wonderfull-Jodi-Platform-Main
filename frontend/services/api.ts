import axios from 'axios';

const ADMIN_TOKEN_KEY = 'wonderfuljodi_admin_token';
const USER_TOKEN_KEY = 'wonderfuljodi_token';

/**
 * Normalizes an API URL to ensure no trailing slashes and avoids duplicate /api suffixes.
 */
export function normalizeApiUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Dynamically resolves the API base URL:
 * 1. In browser (production): always returns same-origin '/api' to avoid CORS, cookie, and proxy loops
 * 2. In browser (LAN/dev mode): connects directly to host PC on port 5000 (e.g. http://192.168.1.102:5000/api)
 * 3. In SSR (Server-Side Rendering): connects to local Express backend on 127.0.0.1
 */
export function getApiBaseUrl(): string {
  // 1. Browser runtime context
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Local / LAN network testing in non-production
    if (
      process.env.NODE_ENV !== 'production' &&
      /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(
        hostname
      )
    ) {
      if (process.env.NEXT_PUBLIC_API_URL) {
        return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
      }
      return `${protocol}//${hostname}:5000/api`;
    }

    // In production browser, always use same-origin relative '/api'.
    // This ensures cookies are automatically attached, eliminates CORS preflights,
    // and prevents recursive proxy loops.
    return '/api';
  }

  // 2. Server-Side Rendering (SSR) context
  // Connect directly to the internal Express backend on 127.0.0.1
  if (process.env.INTERNAL_BACKEND_URL) {
    return normalizeApiUrl(process.env.INTERNAL_BACKEND_URL);
  }

  if (process.env.NODE_ENV === 'production') {
    const port =
      process.env.BACKEND_PORT ||
      (process.env.PORT && process.env.FRONTEND_PORT ? process.env.PORT : '5000');
    return `http://127.0.0.1:${port}/api`;
  }

  return 'http://127.0.0.1:5000/api';
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();

    // Check for admin token first if inside admin context, or standard token
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const userToken = localStorage.getItem(USER_TOKEN_KEY);
    const token = adminToken || userToken;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = '/admin/login?session_expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export function setAdminToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export default apiClient;
