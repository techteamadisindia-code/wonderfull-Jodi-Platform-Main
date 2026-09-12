import apiClient from './api';

export type BlockedUserEntry = BlockedProfileItem;

export interface BlockedProfileItem {
  _id: string;
  blocker: string;
  blockedUser: {
    _id: string;
    fullName: string;
    email: string;
    photo?: string | null;
    verificationStatus?: string;
    isActive?: boolean;
  };
  profile: {
    _id: string;
    user: string;
    displayName: string;
    gender?: string;
    primaryPhoto?: string;
    photos?: string[];
    education?: string;
    degree?: string;
    profession?: string;
    city?: string;
    state?: string;
    verificationStatus?: string;
  } | null;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchBlockedProfiles(): Promise<BlockedProfileItem[]> {
  const response = await apiClient.get<{ success: boolean; data: BlockedProfileItem[] }>('/profiles/blocked');
  return response.data.data || [];
}

export async function blockProfile(
  profileId: string,
  reason?: string
): Promise<{ success: boolean; message: string; data: any }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
    `/profiles/${profileId}/block`,
    {
      reason,
    }
  );
  return response.data;
}

export async function unblockProfile(profileId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/profiles/${profileId}/block`);
  return response.data;
}
