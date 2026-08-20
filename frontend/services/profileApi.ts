import apiClient from './api';
import { ProfileCard } from '../types/profile';

export interface AdminProfileItem extends ProfileCard {
  user?: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
    role: string;
    isActive: boolean;
  };
  about?: string;
  foodPreference?: string;
  familyType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfilesResponse {
  profiles: AdminProfileItem[];
  total: number;
  page: number;
  pages: number;
}

export async function fetchProfiles(params?: {
  search?: string;
  gender?: string;
  religion?: string;
  profession?: string;
  verificationStatus?: string;
  page?: number;
  limit?: number;
}): Promise<ProfilesResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.gender) query.append('gender', params.gender);
  if (params?.religion) query.append('religion', params.religion);
  if (params?.profession) query.append('profession', params.profession);
  if (params?.verificationStatus) query.append('verificationStatus', params.verificationStatus);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  const response = await apiClient.get<{ success: boolean; data: ProfilesResponse }>(`/admin/profiles?${query.toString()}`);
  return response.data.data;
}

export async function fetchProfileById(id: string): Promise<AdminProfileItem> {
  const response = await apiClient.get<{ success: boolean; data: AdminProfileItem }>(`/admin/profiles/${id}`);
  return response.data.data;
}

export async function updateProfile(id: string, updateData: Partial<AdminProfileItem>): Promise<AdminProfileItem> {
  const response = await apiClient.put<{ success: boolean; data: AdminProfileItem }>(`/admin/profiles/${id}`, updateData);
  return response.data.data;
}
