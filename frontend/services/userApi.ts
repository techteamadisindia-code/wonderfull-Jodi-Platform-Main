import apiClient from './api';

export interface UserItem {
  _id: string;
  fullName: string;
  displayName?: string;
  candidateId?: string | null;
  profileId?: string;
  profilePhoto?: string;
  gender?: string | null;
  email: string;
  mobile: string;
  role: 'user' | 'admin';
  verified: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  registrationStatus?: 'Complete' | 'Incomplete' | 'Pending';
  registrationId?: string | null;
  isActive: boolean;
  membershipPlan?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  users: UserItem[];
  total: number;
  page: number;
  pages: number;
  limit?: number;
  canViewPrivateContact?: boolean;
}

export interface UserDetailResponse {
  user: UserItem;
  profile?: any;
  subscription?: any;
  verifications?: any[];
  payments?: any[];
  canViewPrivateContact?: boolean;
}

export interface BulkStatusResult {
  action: 'active' | 'deactivated';
  totalRequested: number;
  successCount: number;
  failedCount: number;
  successful: string[];
  failed: Array<{ id: string; reason: string }>;
}

export async function fetchUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  gender?: string;
  registrationStatus?: string;
  page?: number;
  limit?: number;
}): Promise<UsersResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.role) query.append('role', params.role);
  if (params?.status) query.append('status', params.status);
  if (params?.gender && params.gender !== 'all') query.append('gender', params.gender);
  if (params?.registrationStatus && params.registrationStatus !== 'all') {
    query.append('registrationStatus', params.registrationStatus);
  }
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  const endpoint = `/admin/users?${query.toString()}`;
  const response = await apiClient.get<{ success: boolean; data: UsersResponse }>(endpoint);
  return response.data.data;
}

export async function fetchUserById(id: string): Promise<UserDetailResponse> {
  const response = await apiClient.get<{ success: boolean; data: UserDetailResponse }>(`/admin/users/${id}`);
  return response.data.data;
}

export async function updateUserStatus(id: string, isActive: boolean, reason?: string): Promise<UserItem> {
  const response = await apiClient.put<{ success: boolean; data: UserItem }>(`/admin/users/${id}/status`, {
    isActive,
    reason,
  });
  return response.data.data;
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<UserItem> {
  const response = await apiClient.put<{ success: boolean; data: UserItem }>(`/admin/users/${id}/role`, {
    role,
  });
  return response.data.data;
}

export async function deleteUser(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/users/${id}`);
  return response.data;
}

/**
 * Bulk Activate or Deactivate multiple accounts
 */
export async function bulkUpdateUserStatus(
  userIds: string[],
  status: 'active' | 'deactivated',
  reason?: string
): Promise<BulkStatusResult> {
  const response = await apiClient.put<{ success: boolean; data: BulkStatusResult; message: string }>(
    '/admin/users/bulk-status',
    {
      userIds,
      status,
      reason,
    }
  );
  return response.data.data;
}

/**
 * Export Candidate and Incomplete Registration data to Excel (.xlsx) or CSV (.csv)
 * Returns a Blob and automatically triggers browser file download.
 */
export async function downloadCandidateExport(params: {
  type: 'active' | 'incomplete' | 'all' | 'filtered';
  format: 'xlsx' | 'csv';
  search?: string;
  status?: string;
  role?: string;
  gender?: string;
  registrationStatus?: string;
}): Promise<{ count: number; filename: string }> {
  const query = new URLSearchParams();
  query.append('type', params.type);
  query.append('format', params.format);
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.role) query.append('role', params.role);
  if (params.gender && params.gender !== 'all') query.append('gender', params.gender);
  if (params.registrationStatus && params.registrationStatus !== 'all') {
    query.append('registrationStatus', params.registrationStatus);
  }

  const endpoint = `/admin/export/candidates?${query.toString()}`;
  const response = await apiClient.get(endpoint, {
    responseType: 'blob',
  });

  const countHeader = response.headers['x-total-count'];
  const count = countHeader ? parseInt(countHeader, 10) : 0;

  // Extract filename from Content-Disposition header if available
  let filename = `candidates_export_${params.type}_${new Date().toISOString().slice(0, 10)}.${params.format}`;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  // Trigger browser download
  const blob = new Blob([response.data], {
    type:
      params.format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 200);

  return { count, filename };
}
