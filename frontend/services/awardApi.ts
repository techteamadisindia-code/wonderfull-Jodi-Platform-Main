import apiClient from './api';

export interface Award {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  logo: string;
  shortDescription: string;
  fullDescription: string;
  awardYear: number;
  category: string;
  organization: string;
  galleryImages: string[];
  websiteUrl?: string;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { _id: string; fullName?: string; email?: string } | string;
  updatedBy?: { _id: string; fullName?: string; email?: string } | string;
}

export interface AwardSummaryStats {
  total: number;
  active: number;
  featured: number;
  inactive: number;
}

export interface PublicAwardsResponse {
  success: boolean;
  count: number;
  data: Award[];
}

export interface SingleAwardResponse {
  success: boolean;
  data: Award;
  otherAwards?: Award[];
}

export interface AdminAwardsResponse {
  success: boolean;
  stats: AwardSummaryStats;
  data: Award[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── PUBLIC AWARDS APIS ───

export async function fetchPublicAwards(params?: {
  featured?: boolean;
}): Promise<PublicAwardsResponse> {
  const response = await apiClient.get<PublicAwardsResponse>('/awards', { params });
  return response.data;
}

export async function fetchPublicAwardBySlug(slug: string): Promise<SingleAwardResponse> {
  const response = await apiClient.get<SingleAwardResponse>(`/awards/${slug}`);
  return response.data;
}

// ─── ADMIN AWARDS APIS (Admin / Super Admin Only) ───

export async function fetchAdminAwards(params?: {
  status?: string;
  category?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<AdminAwardsResponse> {
  const response = await apiClient.get<AdminAwardsResponse>('/admin/awards', { params });
  return response.data;
}

export async function fetchAdminAwardById(id: string): Promise<{ success: boolean; data: Award }> {
  const response = await apiClient.get<{ success: boolean; data: Award }>(`/admin/awards/${id}`);
  return response.data;
}

export async function createAdminAward(payload: Partial<Award>): Promise<{
  success: boolean;
  message: string;
  data: Award;
}> {
  const response = await apiClient.post<{ success: boolean; message: string; data: Award }>(
    '/admin/awards',
    payload
  );
  return response.data;
}

export async function updateAdminAward(
  id: string,
  payload: Partial<Award>
): Promise<{ success: boolean; message: string; data: Award }> {
  const response = await apiClient.put<{ success: boolean; message: string; data: Award }>(
    `/admin/awards/${id}`,
    payload
  );
  return response.data;
}

export async function deleteAdminAward(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/awards/${id}`);
  return response.data;
}

export async function updateAdminAwardStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; message: string; data: Award }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: Award }>(
    `/admin/awards/${id}/status`,
    { isActive }
  );
  return response.data;
}

export async function toggleAdminAwardFeatured(
  id: string,
  isFeatured?: boolean
): Promise<{ success: boolean; message: string; data: Award }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: Award }>(
    `/admin/awards/${id}/featured`,
    { isFeatured }
  );
  return response.data;
}

export async function updateAdminAwardOrder(
  id: string,
  displayOrder: number
): Promise<{ success: boolean; message: string; data: Award }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: Award }>(
    `/admin/awards/${id}/order`,
    { displayOrder }
  );
  return response.data;
}

export async function uploadAwardImage(payload: {
  base64: string;
  filename?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: { url: string; filename: string; size: number; mimeType: string };
  url: string;
}> {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    data: { url: string; filename: string; size: number; mimeType: string };
    url: string;
  }>('/admin/awards/upload-image', payload);
  return response.data;
}
