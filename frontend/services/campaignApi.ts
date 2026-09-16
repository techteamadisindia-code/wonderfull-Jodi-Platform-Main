import api from '../lib/api';

export interface CampaignData {
  _id?: string;
  id?: string;
  campaignName?: string;
  name?: string;
  description?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  priority: number;
  targetGender: 'Male' | 'Female' | 'Both' | 'Any';
  eligibility?: any;
  minAge?: number;
  maxAge?: number;
  maritalStatus?: string[];
  membershipType?: string[];
  registrationStatus?: 'New Member' | 'Existing Member' | 'Any';
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'Any';
  profileStatus?: 'Complete' | 'Incomplete' | 'Any';
  location?: {
    countries?: string[];
    states?: string[];
    districts?: string[];
    cities?: string[];
  };
  qualification?: string[];
  specialization?: string[];
  applicablePlans: string[];
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE' | 'NONE';
  discountValue: number;
  couponRequired?: boolean;
  couponCode?: string;
  usageLimit?: number;
  usedCount?: number;
  genderUsageLimit?: {
    maleLimit?: number;
    femaleLimit?: number;
    maleUsed?: number;
    femaleUsed?: number;
  };
  perMemberLimit?: number;
  allowStacking?: boolean;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'REJECTED' | 'ARCHIVED';
  analytics?: {
    totalDiscountGiven: number;
    totalRevenueGenerated: number;
    timesClaimed: number;
  };
  createdAt?: string;
}

export async function fetchPublicActiveCampaigns() {
  const res = await api.get('/campaigns/active');
  return res.data?.data || [];
}

export async function fetchAdminCampaigns(params?: any) {
  const queryParams = typeof params === 'string' ? { status: params } : params;
  const res = await api.get('/campaigns/admin', { params: queryParams });
  return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
}

export async function createAdminCampaign(payload: Partial<CampaignData>) {
  const res = await api.post('/campaigns/admin', payload);
  return res.data;
}

export async function updateAdminCampaign(id: string, payload: Partial<CampaignData>) {
  const res = await api.patch(`/campaigns/admin/${id}`, payload);
  return res.data;
}

export interface EligibilityPreviewResult {
  member: {
    id: string;
    name: string;
    candidateId?: string;
    gender?: string;
    age?: number;
    maritalStatus?: string;
    qualification?: string;
    verificationStatus?: string;
    registrationStatus?: string;
    profileStatus?: string;
  };
  plan: {
    key: string;
    slug: string;
    name: string;
    durationDays?: number;
    contactRequestLimit?: number;
  };
  pricing: {
    originalPrice: number;
    discountAmount: number;
    discountPercentage: number;
    finalPrice: number;
    isFree: boolean;
  };
  appliedCampaign?: any;
  appliedCoupon?: any;
  couponValidation?: any;
  specificCampaignPreview?: any;
  evaluationReasons?: string[];
}

export async function previewMemberEligibility(payload: {
  memberId?: string;
  identifier?: string;
  planKey: string;
  couponCode?: string;
  campaignId?: string;
}) {
  const body = {
    ...payload,
    memberId: payload.memberId || payload.identifier,
  };
  const res = await api.post('/campaigns/admin/preview-eligibility', body);
  return res.data?.data;
}

export async function archiveAdminCampaign(id: string) {
  const res = await api.patch(`/campaigns/admin/${id}`, { status: 'ARCHIVED' });
  return res.data;
}

export async function deleteAdminCampaign(id: string) {
  const res = await api.delete(`/campaigns/admin/${id}`);
  return res.data;
}
