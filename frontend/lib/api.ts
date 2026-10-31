import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SearchResult } from '../types/profile';

const AUTH_TOKEN_KEY = 'wonderfuljodi_token';

import {
  ADMIN_TOKEN_KEY,
  getApiBaseUrl,
  handleMemberSessionExpired,
  isSafeApiOrigin,
  normalizeApiPath,
  normalizeApiUrl,
  refreshAuthSession,
} from '../services/api';

export { getApiBaseUrl, handleMemberSessionExpired, isSafeApiOrigin, normalizeApiPath, normalizeApiUrl, refreshAuthSession };

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Automatically attach and accept HttpOnly authentication cookies
});

// Request interceptor: attach token from localStorage if available (backward compatibility + headers)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url) {
    config.url = normalizeApiPath(config.url);
  }
  if (typeof window !== 'undefined') {
    config.baseURL = getApiBaseUrl();
    const requestUrl = config.url || '';

    if (isSafeApiOrigin(requestUrl, config.baseURL || getApiBaseUrl())) {
      const isAdminRequest =
        requestUrl.includes('/admin') ||
        window.location.pathname.startsWith('/admin');

      // Administrative requests must exclusively use the intended admin token,
      // preventing a stale or mismatched general-user token from overriding or corrupting admin auth.
      // General user requests must exclusively use the user token.
      const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      const userToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const token = isAdminRequest ? adminToken : userToken;

      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

// Response interceptor: Automatic session refresh on 401 Unauthorized via shared coordinator
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest?.url || '';
    const isAdminRequest =
      requestUrl.includes('/admin') ||
      window.location.pathname.startsWith('/admin');

    // Admin requests must never invoke member refresh or wipe member tokens
    if (error.response.status === 401 && isAdminRequest) {
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = '/admin/login?session_expired=1';
      }
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh');

    if (
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAdminRequest &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthSession();
        if (!newToken || typeof newToken !== 'string' || !newToken.trim()) {
          throw new Error('Refresh response did not return a valid access token');
        }
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        handleMemberSessionExpired();
        return Promise.reject(refreshErr);
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
    localStorage.removeItem('wj_resume_token');
    localStorage.removeItem('wj_reg_form_backup');
  }
}

export async function getFeaturedProfiles(): Promise<{ profiles: any[] }> {
  try {
    const response = await api.get<{ success: boolean; data?: { profiles: any[] }; profiles?: any[] }>('/profiles/featured');
    const profiles = response.data?.data?.profiles || response.data?.profiles || [];
    return { profiles };
  } catch {
    const result = await searchProfiles('limit=4&sort=bestMatch');
    return { profiles: result?.profiles || [] };
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

export async function logoutOtherSessions() {
  const response = await api.post<{
    success: boolean;
    message: string;
    data?: { revokedCount: number; currentSessionPreserved: boolean; note?: string };
  }>('/auth/logout-other-sessions');
  return response.data;
}

export async function getActiveSessions() {
  const response = await api.get<{
    success: boolean;
    data: {
      sessions: Array<{
        id: string;
        family: string;
        device: string;
        userAgent: string;
        ipAddress: string;
        createdAt: string;
        lastActiveAt: string;
        isCurrent: boolean;
      }>;
      totalActiveSessions: number;
    };
  }>('/auth/active-sessions');
  return response.data.data;
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
