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

export interface UserSubscriptionDetails {
  id: string;
  userId: string;
  plan: string;
  planKey: string;
  slug: string;
  planId: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  price: string;
  duration: string;
  startDate: string;
  expiryDate?: string | null;
  contactRequestsUsed: number;
  contactRequestsRemaining: number;
  contactRequestLimit: number;
  isUnlimitedContact: boolean;
  fairUsageEnabled?: boolean;
  isPopular?: boolean;
  badge?: string | null;
  isExpired?: boolean;
}

/**
 * Fetch the logged-in user's subscription and remaining contact credits
 */
export async function fetchMySubscription(): Promise<UserSubscriptionDetails> {
  const response = await apiClient.get<{ success: boolean; data: UserSubscriptionDetails }>(
    '/subscription/me'
  );
  return response.data.data;
}

/**
 * Fetch all active membership plans
 */
export async function fetchPublicMembershipPlans(): Promise<any[]> {
  const response = await apiClient.get<{ success: boolean; data: any[] }>('/membership-plans');
  return response.data.data;
}

