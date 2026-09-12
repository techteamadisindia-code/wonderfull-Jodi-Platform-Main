import apiClient from './api';

export interface MembershipPlanData {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  key?: string;
  planId?: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  price?: number | string;
  originalPriceFormatted?: string;
  discountedPriceFormatted?: string;
  discountPercent?: number;
  currency: string;
  billingPeriod: string;
  duration?: string;
  durationDays: number;
  durationMonths?: number | null;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  seasonalLabel?: string;
  seasonalDiscount?: number;
  isSeasonalOffer?: boolean;
  badge?: string;
  bestFor?: string;
  profileViewLimit?: 'limited' | 'unlimited';
  contactRequestLimit?: number;
  isUnlimitedContact?: boolean;
  fairUsageEnabled?: boolean;
  ctaText?: string;
  ctaAction?: 'register' | 'order' | 'contact';
  disclaimer?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionItem {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  plan: 'FREE' | 'PREMIUM' | 'PREMIUM_VIP' | 'VVIP' | string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ─── PUBLIC APIS ───
 */

/**
 * Fetch all active membership plans for public users
 */
export async function fetchPublicMembershipPlans(): Promise<MembershipPlanData[]> {
  const timestamp = Date.now();
  const response = await apiClient.get<{ success: boolean; data: MembershipPlanData[] }>(
    `/memberships?_t=${timestamp}`
  );
  return response.data.data;
}

/**
 * ─── ADMIN MEMBERSHIP PLAN MANAGEMENT APIS ───
 */

/**
 * Fetch all membership plans for admin (both active and inactive)
 */
export async function fetchAdminMembershipPlans(): Promise<MembershipPlanData[]> {
  const timestamp = Date.now();
  const response = await apiClient.get<{ success: boolean; data: MembershipPlanData[] }>(
    `/admin/memberships?_t=${timestamp}`
  );
  return response.data.data;
}

/**
 * Fetch a single membership plan by ID or slug
 */
export async function fetchAdminMembershipPlanById(id: string): Promise<MembershipPlanData> {
  const response = await apiClient.get<{ success: boolean; data: MembershipPlanData }>(
    `/admin/memberships/${id}`
  );
  return response.data.data;
}

/**
 * Create a new membership plan
 */
export async function createAdminMembershipPlan(
  data: Partial<MembershipPlanData>
): Promise<MembershipPlanData> {
  const response = await apiClient.post<{ success: boolean; message: string; data: MembershipPlanData }>(
    '/admin/memberships',
    data
  );
  return response.data.data;
}

/**
 * Update an existing membership plan
 */
export async function updateAdminMembershipPlan(
  id: string,
  data: Partial<MembershipPlanData>
): Promise<MembershipPlanData> {
  const response = await apiClient.put<{ success: boolean; message: string; data: MembershipPlanData }>(
    `/admin/memberships/${id}`,
    data
  );
  return response.data.data;
}

/**
 * Delete a membership plan
 */
export async function deleteAdminMembershipPlan(
  id: string
): Promise<{ id: string; name: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string; data: { id: string; name: string } }>(
    `/admin/memberships/${id}`
  );
  return response.data.data;
}

/**
 * Toggle plan active status
 */
export async function toggleAdminMembershipPlanStatus(
  id: string,
  isActive?: boolean
): Promise<{ _id: string; slug: string; name: string; isActive: boolean }> {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
    data: { _id: string; slug: string; name: string; isActive: boolean };
  }>(`/admin/memberships/${id}/status`, { isActive });
  return response.data.data;
}

/**
 * ─── USER SUBSCRIPTIONS (PRESERVED) ───
 */

export async function fetchMemberships(params?: { plan?: string; status?: string }): Promise<SubscriptionItem[]> {
  const query = new URLSearchParams();
  query.append('type', 'subscriptions');
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
  const response = await apiClient.put<{ success: boolean; data: SubscriptionItem }>(
    `/admin/memberships/${id}?type=subscriptions`,
    data
  );
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

