import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SearchResult } from '../types/profile';

const AUTH_TOKEN_KEY = 'wonderfuljodi_token';

/**
 * Dynamically resolves the API base URL for LAN & client access
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (
      process.env.NODE_ENV === 'production' &&
      !/^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(
        hostname
      )
    ) {
      return '/api';
    }
    return `${protocol}//${hostname}:5000/api`;
  }

  return process.env.NEXT_PUBLIC_BACKEND_URL
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '')}/api`
    : 'http://localhost:5000/api';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Automatically attach and accept HttpOnly authentication cookies
});

// Request interceptor: attach token from localStorage if available (backward compatibility + headers)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: Automatic session refresh on 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 occurs and we haven't retried yet and not already calling /auth/refresh or /auth/login
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${getApiBaseUrl()}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (refreshResponse.data?.success) {
          const newToken = refreshResponse.data.token;
          if (newToken && typeof window !== 'undefined') {
            localStorage.setItem(AUTH_TOKEN_KEY, newToken);
            originalRequest.headers = originalRequest.headers ?? {};
            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
          }
          processQueue(null);
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr as AxiosError);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

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
    localStorage.removeItem('wj_registration_id');
    localStorage.removeItem('wj_reg_form_backup');
  }
}

export async function searchProfiles(query: string = '') {
  const cleanQuery = query.startsWith('?') ? query.slice(1) : query;
  const endpoint = cleanQuery ? `/search?${cleanQuery}` : '/search';
  const response = await api.get<{ success: boolean; data: SearchResult }>(endpoint);
  return response.data.data;
}

export async function getMyProfile() {
  const response = await api.get<{ success: boolean; data: any }>('/profiles/me');
  return response.data.data;
}

export async function updateMyProfile(profileData: any) {
  const response = await api.put<{ success: boolean; message: string; data: any }>('/profiles/me', profileData);
  return response.data;
}

export async function getMyMembershipStatus() {
  try {
    const response = await api.get<{ success: boolean; data: any }>('/subscription/me');
    return response.data.data;
  } catch (err) {
    try {
      const fallback = await api.get<{ success: boolean; data: any }>('/memberships/status');
      return fallback.data.data;
    } catch {
      return { plan: 'Free', planKey: 'FREE', slug: 'free', isPremium: false, status: 'ACTIVE', contactRequestsRemaining: 0, contactRequestsUsed: 0, contactRequestLimit: 0 };
    }
  }
}

export async function uploadProfileImage(base64Image: string, filename?: string) {
  const response = await api.post<{ success: boolean; data: { url: string }; url?: string }>('/upload/upload', {
    image: base64Image,
    filename: filename || 'profile-photo.jpg',
  });
  return response.data;
}

export async function addShortlist(profileId: string) {
  const response = await api.post<{ success: boolean; data: any }>('/shortlist', { profileId });
  return response.data;
}

export async function removeShortlist(profileId: string) {
  const response = await api.delete<{ success: boolean; message: string }>(`/shortlist/${profileId}`);
  return response.data;
}

export async function getShortlisted() {
  const response = await api.get<{ success: boolean; data: any[] }>('/shortlist');
  return response.data.data;
}

export async function logoutUser() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore error
  } finally {
    clearAuthToken();
  }
}

export async function blockUser(blockedUserId: string, reason?: string) {
  const response = await api.post<{ success: boolean; message: string }>('/blocks', {
    blockedUserId,
    reason,
  });
  return response.data;
}

export async function unblockUser(blockedUserId: string) {
  const response = await api.delete<{ success: boolean; message: string }>(`/blocks/${blockedUserId}`);
  return response.data;
}

export default api;
