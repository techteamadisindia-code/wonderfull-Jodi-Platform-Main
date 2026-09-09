import apiClient from './api';

export interface UserItem {
  _id: string;
  fullName: string;
  displayName?: string;
  profileId?: string;
  profilePhoto?: string;
  email: string;
  mobile: string;
  role: 'user' | 'admin';
  verified: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
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
}

export interface UserDetailResponse {
  user: UserItem;
  profile?: any;
  subscription?: any;
  verifications?: any[];
  payments?: any[];
}

export async function fetchUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<UsersResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.role) query.append('role', params.role);
  if (params?.status) query.append('status', params.status);
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
