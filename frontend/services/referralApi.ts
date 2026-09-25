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
  qualificationEvent?: 'REGISTERED' | 'REGISTERED_AND_VERIFIED' | 'REGISTERED_AND_COMPLETED_PROFILE';
  qualificationTrigger?: 'REGISTERED' | 'REGISTERED_AND_VERIFIED' | 'REGISTERED_AND_COMPLETED_PROFILE';
  rewardType: 'PERCENTAGE_DISCOUNT' | 'FIXED_DISCOUNT' | 'FREE_PREMIUM' | 'ADDITIONAL_PROFILE_VIEWS' | 'ADDITIONAL_CONTACT_VIEWS' | 'COUPON' | string;
  rewardValue: number;
  rewardPlan?: string;
  rewardPlanKey?: string;
  couponValidityDays: number;
  isRecurringMilestone?: boolean;
  allowRecurringMilestones?: boolean;
  isActive: boolean;
  [key: string]: any;
}

export async function fetchMemberReferrals(): Promise<MemberReferralDashboardData> {
  const res = await api.get('/referrals/me');
  return res.data?.data;
}

export async function trackReferralLinkClick(referralCode: string) {
  const res = await api.post('/referrals/track-click', { referralCode });
  return res.data;
}

export interface ReferralAdminItem {
  id?: string;
  _id?: string;
  referralCode?: string;
  referrerName?: string;
  referrerCandidateId?: string;
  referredName?: string;
  referredCandidateId?: string;
  rewardCouponCode?: string;
  status?: string;
  rewardStatus?: string;
  registeredAt?: string;
  qualifiedAt?: string;
  rewardIssuedAt?: string;
  referrer?: {
    name?: string;
    email?: string;
    candidateId?: string;
    referralCode?: string;
  };
  referred?: {
    name?: string;
    email?: string;
    candidateId?: string;
    registeredAt?: string;
  };
  referral?: {
    clickedAt?: string;
    registeredAt?: string;
    qualifiedAt?: string;
    status?: string;
    source?: string;
  };
  reward?: {
    rewardStatus?: string;
    couponCode?: string;
    couponStatus?: string;
    discountValue?: number;
  };
  [key: string]: any;
}

export interface ReferralStats {
  totalReferrals?: number;
  totalRegistered?: number;
  totalQualified?: number;
  totalRewarded?: number;
  rewardsIssued?: number;
  rewardsUsed?: number;
  pendingReferrals?: number;
  [key: string]: any;
}

export async function fetchAdminReferrals(params?: any): Promise<{ referrals: ReferralAdminItem[]; stats: ReferralStats; [key: string]: any }> {
  const queryParams = typeof params === 'string' ? { status: params } : params;
  const res = await api.get('/referrals/admin', { params: queryParams });
  const d = res.data?.data || {};
  const list = (d.referrals || []).map((r: any) => ({
    ...r,
    _id: r._id || r.id,
    id: r.id || r._id,
    referrerName: r.referrerName || r.referrer?.name || 'Doctor Candidate',
    referrerCandidateId: r.referrerCandidateId || r.referrer?.candidateId || 'N/A',
    referredName: r.referredName || r.referred?.name || 'Pending Registration',
    referredCandidateId: r.referredCandidateId || r.referred?.candidateId || 'N/A',
    referralCode: r.referralCode || r.referrer?.referralCode || '',
    rewardCouponCode: r.rewardCouponCode || r.reward?.couponCode || '',
    status: r.status || r.referral?.status || 'CLICKED',
    rewardStatus: r.rewardStatus || r.reward?.rewardStatus || 'PENDING',
  }));
  const a = d.analytics || {};
  return {
    referrals: list,
    stats: {
      totalReferrals: a.totalReferrals || 0,
      totalRegistered: a.registeredCount || 0,
      totalQualified: a.qualifiedCount || 0,
      totalRewarded: a.rewardsIssued || 0,
      rewardsIssued: a.rewardsIssued || 0,
      rewardsUsed: a.rewardsUsed || 0,
      pendingReferrals: a.pendingReferrals || 0,
      ...a,
    },
  };
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
