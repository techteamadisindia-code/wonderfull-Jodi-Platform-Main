import apiClient from './api';

export interface SubscriptionItem {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  plan: 'FREE' | 'PREMIUM' | 'PREMIUM_VIP' | 'VVIP';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchMemberships(params?: { plan?: string; status?: string }): Promise<SubscriptionItem[]> {
  const query = new URLSearchParams();
  if (params?.plan && params.plan !== 'ALL') query.append('plan', params.plan);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);

  const endpoint = `/admin/memberships?${query.toString()}`;
  const response = await apiClient.get<{ success: boolean; data: SubscriptionItem[] }>(endpoint);
  return response.data.data;
}

export async function updateMembership(
  id: string,
  data: { plan?: string; status?: string; expiryDate?: string }
): Promise<SubscriptionItem> {
  const response = await apiClient.put<{ success: boolean; data: SubscriptionItem }>(`/admin/memberships/${id}`, data);
  return response.data.data;
}
