import apiClient, { setAdminToken, clearAdminToken, getAdminToken } from './api';

export interface AdminUser {
  _id: string;
  id?: string;
  fullName: string;
  email: string;
  mobile?: string;
  role: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  user: AdminUser;
  message?: string;
}

export interface AdminSessionItem {
  _id: string;
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AdminActivityItem {
  _id: string;
  adminEmail: string;
  action: string;
  details?: string;
  ipAddress: string;
  status: string;
  createdAt: string;
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const response = await apiClient.post<AdminLoginResponse>('/admin/auth/login', {
    email: email.trim().toLowerCase(),
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

export async function getAdminMe(): Promise<AdminUser | null> {
  try {
    const response = await apiClient.get<{ success: boolean; data: AdminUser }>('/admin/auth/me');
    if (response.data.success && response.data.data) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('wonderfuljodi_admin_user', JSON.stringify(response.data.data));
      }
      return response.data.data;
    }
    return null;
  } catch {
    return null;
  }
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('wonderfuljodi_admin_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await apiClient.post('/admin/auth/logout');
  } catch {
    // Non-blocking logout catch
  } finally {
    clearAdminToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wonderfuljodi_admin_user');
    }
  }
}

export function isAdminAuthenticated(): boolean {
  const token = getAdminToken();
  const user = getAdminUser();
  return !!token && !!user && user.role === 'admin';
}

export async function adminForgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>('/admin/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  });
  return response.data;
}

export async function adminValidateResetToken(token: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.get<{ success: boolean; message: string }>(
    `/admin/auth/validate-reset-token?token=${encodeURIComponent(token.trim())}`
  );
  return response.data;
}

export async function adminResetPassword(
  token: string,
  password: string,
  confirmPassword: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>('/admin/auth/reset-password', {
    token: token.trim(),
    password,
    confirmPassword,
  });
  return response.data;
}

export async function adminChangePassword(
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string
): Promise<{ success: boolean; message: string; token?: string }> {
  const response = await apiClient.post<{ success: boolean; message: string; token?: string }>(
    '/admin/auth/change-password',
    {
      currentPassword,
      newPassword,
      confirmNewPassword,
    }
  );
  if (response.data.success && response.data.token) {
    setAdminToken(response.data.token);
  }
  return response.data;
}

export async function fetchAdminSessions(): Promise<AdminSessionItem[]> {
  const response = await apiClient.get<{ success: boolean; data: AdminSessionItem[] }>('/admin/auth/sessions');
  return response.data.data || [];
}

export async function revokeOtherAdminSessions(): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>('/admin/auth/revoke-other-sessions');
  return response.data;
}

export async function fetchAdminRecentActivity(): Promise<AdminActivityItem[]> {
  const response = await apiClient.get<{ success: boolean; data: AdminActivityItem[] }>('/admin/auth/recent-activity');
  return response.data.data || [];
}
