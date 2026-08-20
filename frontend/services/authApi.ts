import apiClient, { setAdminToken, clearAdminToken, getAdminToken } from './api';

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
    role: 'admin' | 'user';
  };
  message?: string;
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const response = await apiClient.post<AdminLoginResponse>('/auth/login', {
    email,
    password,
  });

  if (response.data.success && response.data.token) {
    if (response.data.user.role !== 'admin') {
      throw new Error('Access denied. Administrator privileges required.');
    }
    setAdminToken(response.data.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wonderfuljodi_admin_user', JSON.stringify(response.data.user));
    }
  }

  return response.data;
}

export function getAdminUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('wonderfuljodi_admin_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function adminLogout() {
  clearAdminToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wonderfuljodi_admin_user');
  }
}

export function isAdminAuthenticated(): boolean {
  const token = getAdminToken();
  const user = getAdminUser();
  return !!token && !!user && user.role === 'admin';
}
