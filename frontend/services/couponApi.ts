import api from '../lib/api';

export interface CouponData {
  _id?: string;
  id?: string;
  couponCode: string;
  name: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE' | 'FREE_100_PERCENT' | 'FIXED_AMOUNT';
  discountValue: number;
  applicablePlans?: string[];
  startDate?: string;
  expiryDate: string;
  usageLimit?: number;
  usedCount?: number;
  perMemberLimit?: number;
  minimumMembershipAmount?: number;
  newMemberOnly?: boolean;
  existingMemberOnly?: boolean;
  gender?: 'Male' | 'Female' | 'Both' | 'Any';
  minAge?: number;
  maxAge?: number;
  eligibility?: {
    gender?: 'Male' | 'Female' | 'Both' | 'Any' | string;
    minAge?: number;
    maxAge?: number;
    maritalStatus?: string[];
    verificationStatus?: string[];
    [key: string]: any;
  };
  canStackWithCampaign?: boolean;
  maritalStatus?: string[];
  verificationStatus?: string[];
  isReferralReward?: boolean;
  issuedToCandidateId?: string;
  allowStacking?: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'REJECTED' | 'ARCHIVED';
  createdAt?: string;
  [key: string]: any;
}

export interface CouponValidationResponse {
  valid: boolean;
  couponId?: string;
  couponCode?: string;
  name?: string;
  discountType?: string;
  discountValue?: number;
  originalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  isFree?: boolean;
  campaignId?: string;
  message?: string;
  reasonCode?: string;
}

export interface CouponUsageData {
  coupon?: any;
  stats?: {
    totalRedemptions?: number;
    remainingUses?: number | string;
    totalDiscountGiven?: number;
  };
  redemptions?: Array<{
    _id?: string;
    id: string;
    memberName: string;
    candidateId: string;
    email: string;
    planKey: string;
    originalPrice: number;
    discount: number;
    finalPrice: number;
    usedAt: string;
    paymentId: string;
    orderId: string;
    status: string;
    [key: string]: any;
  }>;
}

export async function validateCoupon(couponCode: string, planKey: string): Promise<CouponValidationResponse> {
  const res = await api.post('/coupons/validate', { couponCode, planKey });
  return res.data;
}

export async function fetchAdminCoupons(params?: any) {
  const queryParams = typeof params === 'string' ? { status: params } : params;
  const res = await api.get('/coupons/admin', { params: queryParams });
  return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
}

export async function createAdminCoupon(payload: Partial<CouponData>) {
  const res = await api.post('/coupons/admin', payload);
  return res.data;
}

export async function updateAdminCoupon(id: string, payload: Partial<CouponData>) {
  const res = await api.patch(`/coupons/admin/${id}`, payload);
  return res.data;
}

export async function fetchCouponUsage(id: string, params?: { status?: string; page?: number; limit?: number }): Promise<CouponUsageData> {
  const res = await api.get(`/coupons/admin/${id}/usage`, { params });
  const d = res.data?.data || {};
  const rawList = d.usageTable || d.redemptions || [];
  return {
    coupon: d.coupon,
    stats: {
      totalRedemptions: d.pagination?.total || d.coupon?.usedCount || 0,
      remainingUses: d.coupon?.remainingUses,
      totalDiscountGiven: d.coupon?.totalDiscountGiven || 0,
    },
    redemptions: rawList.map((r: any) => ({
      ...r,
      _id: r._id || r.id,
      id: r.id || r._id,
    })),
  };
}

export const fetchAdminCouponUsage = fetchCouponUsage;

export async function deleteAdminCoupon(id: string) {
  const res = await api.delete(`/coupons/admin/${id}`);
  return res.data;
}
