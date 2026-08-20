import apiClient from './api';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  verifiedProfiles: number;
  pendingVerification: number;
  premiumUsers: number;
  totalRevenue: number;
  pendingReports: number;
  newInquiries: number;
  totalInterests: number;
  totalShortlists: number;
  totalMessages: number;
  newRegistrations7d: number;
  recentUsers: Array<{
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
    role: string;
    isActive: boolean;
    verificationStatus: string;
    createdAt: string;
  }>;
  recentPayments: Array<{
    _id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    providerPaymentId: string;
    createdAt: string;
    user?: {
      _id: string;
      fullName: string;
      email: string;
      mobile: string;
    };
  }>;
  recentVerifications: Array<{
    _id: string;
    documentType: string;
    documentUrl: string;
    status: string;
    createdAt: string;
    user?: {
      _id: string;
      fullName: string;
      email: string;
    };
  }>;
}

export interface PlatformSettings {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  tollFreeNumber: string;
  officeAddress: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  requireManualProfileApproval: boolean;
  currency: string;
  razorpayLiveMode: boolean;
  minAgeMale: number;
  minAgeFemale: number;
  maxPhotoUploadLimit: number;
}

export interface AdminAccount {
  _id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  adminEmail: string;
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: string;
  ipAddress: string;
  status: string;
  createdAt: string;
}

export interface ContactInquiryItem {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<{ success: boolean; data: DashboardStats }>('/admin/dashboard');
  return response.data.data;
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const response = await apiClient.get<{ success: boolean; data: PlatformSettings }>('/admin/settings');
  return response.data.data;
}

export async function updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const response = await apiClient.put<{ success: boolean; data: PlatformSettings }>('/admin/settings', settings);
  return response.data.data;
}

export async function fetchAdmins(): Promise<{ admins: AdminAccount[]; adminPermissions: any[] }> {
  const response = await apiClient.get<{ success: boolean; data: { admins: AdminAccount[]; adminPermissions: any[] } }>('/admin/admins');
  return response.data.data;
}

export async function createAdminAccount(data: { fullName: string; email: string; mobile?: string; password: string; permissions?: string[] }) {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/admin/admins', data);
  return response.data;
}

export async function updateAdminPermissions(id: string, permissions: string[]) {
  const response = await apiClient.put<{ success: boolean; message: string }>(`/admin/admins/${id}`, { permissions });
  return response.data;
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  const response = await apiClient.get<{ success: boolean; data: AuditLogItem[] }>('/admin/audit-logs');
  return response.data.data;
}

export async function fetchInquiries(status?: string): Promise<ContactInquiryItem[]> {
  const endpoint = status && status !== 'ALL' ? `/admin/inquiries?status=${status}` : '/admin/inquiries';
  const response = await apiClient.get<{ success: boolean; data: ContactInquiryItem[] }>(endpoint);
  return response.data.data;
}

export async function updateInquiryStatus(id: string, status: string): Promise<ContactInquiryItem> {
  const response = await apiClient.put<{ success: boolean; data: ContactInquiryItem }>(`/admin/inquiries/${id}/status`, { status });
  return response.data.data;
}
