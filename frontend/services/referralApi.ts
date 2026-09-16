import api from '../lib/api';

export interface MemberReferralDashboardData {
  referralCode: string;
  candidateId: string;
  config: {
    threshold: number;
    rewardType: string;
    rewardValue: number;
    qualificationEvent: string;
  };
  stats: {
    totalInvited: number;
    registeredCount: number;
    qualifiedCount: number;
    remainingNeeded: number;
    progressPercentage: number;
    isRewardUnlocked: boolean;
  };
  rewards: Array<{
    milestone: number;
    rewardType: string;
    rewardValue: number;
    couponCode: string;
    status: string;
    issuedAt: string;
    expiryDate: string;
    isExpired: boolean;
  }>;
  referrals: Array<{
    id: string;
    candidateId: string;
    candidateName: string;
    registeredAt: string;
    status: string;
    rewardStatus: string;
  }>;
}

export interface ReferralRewardConfigData {
  _id?: string;
  requiredReferrals: number;
  qualificationEvent: 'REGISTERED' | 'REGISTERED_AND_VERIFIED' | 'REGISTERED_AND_COMPLETED_PROFILE';
  rewardType: 'PERCENTAGE_DISCOUNT' | 'FIXED_DISCOUNT' | 'FREE_PREMIUM' | 'ADDITIONAL_PROFILE_VIEWS' | 'ADDITIONAL_CONTACT_VIEWS' | 'COUPON';
  rewardValue: number;
  rewardPlan: string;
  couponValidityDays: number;
  isRecurringMilestone: boolean;
  isActive: boolean;
}

export async function fetchMemberReferrals(): Promise<MemberReferralDashboardData> {
  const res = await api.get('/referrals/me');
  return res.data?.data;
}

export async function trackReferralLinkClick(referralCode: string) {
  const res = await api.post('/referrals/track-click', { referralCode });
  return res.data;
}

export async function fetchAdminReferrals(params?: { status?: string; search?: string; page?: number; limit?: number }) {
  const res = await api.get('/referrals/admin', { params });
  return res.data?.data;
}

export async function fetchAdminReferralConfig(): Promise<ReferralRewardConfigData> {
  const res = await api.get('/referrals/admin/config');
  return res.data?.data;
}

export async function updateAdminReferralConfig(payload: Partial<ReferralRewardConfigData>) {
  const res = await api.put('/referrals/admin/config', payload);
  return res.data;
}

export const fetchReferralRewardConfig = fetchAdminReferralConfig;
export const updateReferralRewardConfig = updateAdminReferralConfig;
