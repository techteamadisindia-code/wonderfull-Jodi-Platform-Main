'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Crown,
  Sparkles,
  Flame,
  ShieldCheck,
  Star,
  Heart,
  Lock,
  Gem,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  PRIVACY_POINTS,
  PRIVACY_HIGHLIGHT,
} from '../../lib/membershipConfig';
import {
  fetchPublicMembershipPlans,
  MembershipPlanData,
} from '../../services/membershipApi';
import { getAuthToken } from '../../lib/api';
import api from '../../lib/api';
import { VvipModal } from '../../components/VvipModal';
import { PaymentModal, PaymentOrderData } from '../../components/PaymentModal';
import { Tag, Gift, Percent } from 'lucide-react';

interface CalculatedOfferData {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  discountPercentage: number;
  isFree: boolean;
  campaign?: {
    id: string;
    name: string;
    discountType: string;
    discountValue: number;
  } | null;
  coupon?: {
    id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
  } | null;
}

export default function MembershipPage() {
  const router = useRouter();

  // Dynamic Plans State
  const [plans, setPlans] = useState<MembershipPlanData[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Dynamic Server-Calculated Offers per plan key
  const [planOffers, setPlanOffers] = useState<Record<string, CalculatedOfferData>>({});
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Coupon / Promo Code State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponAlert, setCouponAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User & Order State
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isVvipModalOpen, setIsVvipModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<PaymentOrderData | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [activePlanKey, setActivePlanKey] = useState<string>('FREE');
  const [isPremium, setIsPremium] = useState(false);
  const [contactCredits, setContactCredits] = useState<number>(0);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Load Active Plans from Backend
  const loadDynamicPlans = async () => {
    setLoadingPlans(true);
    setPlansError(null);
    try {
      const data = await fetchPublicMembershipPlans();
      setPlans(data || []);
    } catch (err: any) {
      console.error('Failed to load membership plans from backend:', err);
      setPlansError(
        err.response?.data?.message ||
          'Unable to load membership packages. Please check your connection and try again.'
      );
    } finally {
      setLoadingPlans(false);
    }
  };

  // Load User Subscription Status
  const loadMembershipStatus = async () => {
    const token = getAuthToken();
    setAuthenticated(!!token);
    if (!token) return;
    try {
      const res = await api.get('/subscription/me');
      if (res.data?.success && res.data.data) {
        setActivePlanKey(res.data.data.slug || res.data.data.planKey || 'free');
        setIsPremium(res.data.data.planKey !== 'FREE');
        setContactCredits(res.data.data.contactRequestsRemaining || 0);
      }
    } catch (e) {
      // Fallback to legacy endpoint
      try {
        const legacyRes = await api.get('/memberships/my-status');
        if (legacyRes.data?.success && legacyRes.data.data) {
          setIsPremium(legacyRes.data.data.isPremium);
          setActivePlanKey(legacyRes.data.data.plan || 'FREE');
          setContactCredits(legacyRes.data.data.contactRequestsRemaining || 0);
        }
      } catch (err) {
        console.warn('Failed to load membership status:', err);
      }
    }
  };

  // Fetch Server-Authoritative Offers for all plans
  const fetchOffers = async (planList: MembershipPlanData[], coupon?: string | null) => {
    if (!planList.length) return;
    setLoadingOffers(true);
    const newOffers: Record<string, CalculatedOfferData> = {};

    await Promise.all(
      planList.map(async (p) => {
        const pKey = p.key || p.slug;
        if (!pKey || p.slug === 'free' || p.ctaAction === 'register') return;

        try {
          const res = await api.post('/memberships/calculate-offer', {
            planKey: pKey,
            couponCode: coupon || undefined,
          });
          if (res.data?.success && res.data.data) {
            newOffers[pKey] = res.data.data;
          }
        } catch (err) {
          // If unauthenticated or no rule, fallback to plan's listed price
          newOffers[pKey] = {
            originalPrice: p.originalPrice ?? 0,
            discountAmount: (p.originalPrice ?? 0) - (p.discountedPrice ?? p.originalPrice ?? 0),
            finalPrice: p.discountedPrice ?? p.originalPrice ?? 0,
            discountPercentage: p.seasonalDiscount ?? 0,
            isFree: (p.discountedPrice ?? p.originalPrice ?? 0) === 0,
          };
        }
      })
    );

    setPlanOffers(newOffers);
    setLoadingOffers(false);
  };

  useEffect(() => {
    loadDynamicPlans();
    loadMembershipStatus();
  }, []);

  // Whenever plans or appliedCoupon or auth changes, calculate server offers
  useEffect(() => {
    if (plans.length > 0) {
      fetchOffers(plans, appliedCoupon);
    }
  }, [plans, appliedCoupon, authenticated]);

  // Handle Apply Coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponApplying(true);
    setCouponAlert(null);

    try {
      // Pick first paid plan to validate
      const testPlan = plans.find((p) => p.slug !== 'free' && p.ctaAction !== 'register') || plans[0];
      const pKey = testPlan?.key || testPlan?.slug || 'DOCTOR_CONNECT';

      const res = await api.post('/coupons/validate', {
        couponCode: couponInput.trim().toUpperCase(),
        planKey: pKey,
      });

      if (res.data?.valid) {
        setAppliedCoupon(couponInput.trim().toUpperCase());
        setCouponAlert({
          type: 'success',
          text: `Coupon applied successfully! ${res.data.discountPercentage ? `${res.data.discountPercentage}% OFF` : `₹${res.data.discountAmount} OFF`}`,
        });
      } else {
        setCouponAlert({
          type: 'error',
          text: res.data?.message || 'Invalid coupon code or eligibility requirement not met.',
        });
      }
    } catch (err: any) {
      setCouponAlert({
        type: 'error',
        text: err.response?.data?.message || 'Failed to validate coupon. Please check the code.',
      });
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponAlert(null);
  };

  const handlePlanAction = async (plan: MembershipPlanData) => {
    const planKey = plan.key || plan.slug;
    setSelectedPlan(plan.name);
    setOrderError(null);
    setOrderSuccess(null);

    // Concierge / Consultation flow
    if (plan.ctaAction === 'contact' || plan.slug === 'exclusive-concierge') {
      setIsVvipModalOpen(true);
      return;
    }

    // Free plan flow
    if (
      plan.ctaAction === 'register' ||
      plan.slug === 'free' ||
      (plan.originalPrice === 0 && plan.discountedPrice === 0)
    ) {
      if (authenticated) {
        router.push('/search');
      } else {
        router.push('/register');
      }
      return;
    }

    // Paid Plan upgrade flow
    if (!authenticated) {
      router.push('/login?redirect=/membership');
      return;
    }

    const calculatedOffer = planOffers[planKey];
    const isFreeClaim = calculatedOffer?.isFree || calculatedOffer?.finalPrice === 0;

    // 100% Free Campaign / Coupon Entitlement Flow (Part 27)
    if (isFreeClaim) {
      try {
        setProcessingOrder(true);
        const res = await api.post('/memberships/claim-free', {
          planKey,
          slug: plan.slug,
          couponCode: appliedCoupon || undefined,
        });

        if (res.data?.success) {
          setOrderSuccess(
            res.data.message ||
              `Congratulations! Your free ${plan.name} membership has been activated successfully with full privileges.`
          );
          await loadMembershipStatus();
          await fetchOffers(plans, appliedCoupon);
        } else {
          setOrderError(res.data?.message || 'Unable to claim free membership offer.');
        }
      } catch (err: any) {
        console.error('Free membership claim error:', err);
        setOrderError(
          err.response?.data?.message ||
            'Unable to activate free offer. You may already have claimed this or limits were reached.'
        );
      } finally {
        setProcessingOrder(false);
      }
      return;
    }

    // Standard / Discounted Paid Plan Order Flow
    try {
      setProcessingOrder(true);
      const res = await api.post('/memberships/create-order', {
        planKey,
        slug: plan.slug,
        id: plan._id,
        couponCode: appliedCoupon || undefined,
      });

      if (res.data?.success) {
        if (res.data.data?.order) {
          setCheckoutOrder(res.data.data);
          setIsPaymentModalOpen(true);
        } else {
          setOrderSuccess(res.data?.message || `You have successfully activated ${plan.name}.`);
          loadMembershipStatus();
        }
      } else {
        setOrderError(res.data?.message || 'Unable to process plan upgrade. Please try again.');
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      const serverMsg = err.response?.data?.message;
      if (err.response?.status === 409 || err.response?.data?.alreadyActive) {
        setOrderError(serverMsg || `You already have an active ${plan.name} membership.`);
      } else if (err.response?.status === 401) {
        router.push('/login?redirect=/membership');
      } else {
        setOrderError(
          serverMsg || 'Unable to initiate upgrade at this moment. Please check your network and try again.'
        );
      }
    } finally {
      setProcessingOrder(false);
    }
  };

  const getPlanIcon = (slug: string) => {
    const s = slug?.toLowerCase() || '';
    if (s.includes('free')) return <Sparkles className="w-5 h-5 text-slate-600" />;
    if (s.includes('doctor') || s.includes('connect')) return <Heart className="w-5 h-5 text-[#E51F3E]" />;
    if (s.includes('premium') || s.includes('popular')) return <Flame className="w-5 h-5 text-[#E51F3E]" />;
    if (s.includes('priority') || s.includes('vip')) return <Crown className="w-5 h-5 text-amber-500" />;
    if (s.includes('concierge') || s.includes('vvip')) return <Gem className="w-5 h-5 text-purple-600" />;
    return <Star className="w-5 h-5 text-[#E51F3E]" />;
  };

  return (
    <main className="min-h-screen bg-[#FAF7F4] text-[#111827] pb-12 sm:pb-16">
      {/* VVIP Concierge Consultation Modal */}
      <VvipModal isOpen={isVvipModalOpen} onClose={() => setIsVvipModalOpen(false)} />

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        orderData={checkoutOrder}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={(planName) => {
          setOrderSuccess(
            `Congratulations! Your ${planName} membership has been activated successfully with full matrimonial privileges.`
          );
          loadMembershipStatus();
        }}
      />

      {/* ── 1. Hero Header Section ── */}
      <section className="relative pt-6 sm:pt-9 pb-5 sm:pb-7 px-4 sm:px-6 lg:px-8 border-b border-[#E8E1DB] bg-gradient-to-b from-[#FFF5F7]/80 via-[#FAF7F4] to-[#FAF7F4]">
        <div className="max-w-4xl mx-auto text-center">
          {/* Subtle Trust Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-3.5 py-1 text-xs font-bold text-[#9E132D] shadow-2xs">
            <Crown className="w-3.5 h-3.5 text-[#E51F3E]" />
            <span>Verified Doctor Matrimonial Plans</span>
          </div>

          <h1 className="mt-2.5 font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight leading-tight">
            Choose Your <span className="text-[#E51F3E]">Membership Plan</span>
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Connect directly with verified doctors, healthcare professionals, and respected families.
            Enjoy secure contact requests, privacy protection, and personalized matchmaking support.
          </p>

          {/* User's Active Status Banner if Authenticated */}
          {authenticated && (
            <div className="mt-3.5 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E8E1DB] shadow-2xs text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Current Plan:{' '}
                  <strong className="text-slate-900 uppercase">
                    {activePlanKey.replace('-', ' ')}
                  </strong>
                </span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Contact Credits:{' '}
                <strong className="text-[#E51F3E]">{contactCredits} Available</strong>
              </span>
            </div>
          )}

          {/* Notification Alerts */}
          {orderSuccess && (
            <div className="mt-4 max-w-xl mx-auto p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>{orderSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setOrderSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {orderError && (
            <div className="mt-4 max-w-xl mx-auto p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs text-left">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                <span>{orderError}</span>
              </div>
              <button
                type="button"
                onClick={() => setOrderError(null)}
                className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. Top Quick Comparison Table Section ── */}
      <section className="py-5 sm:py-7 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-4 sm:mb-5">
          <h2 className="font-serif text-lg sm:text-2xl font-bold text-[#111827]">
            Plan Overview & Contact Allowances
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compare key features and contact request limits across our active membership packages
          </p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E8E1DB] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/90 border-b border-[#E8E1DB] text-slate-700 font-bold">
                  <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Package</th>
                  <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Price</th>
                  <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Profile Viewing</th>
                  <th className="py-2.5 sm:py-3 px-3.5 sm:px-5">Phone / Contact Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loadingPlans ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Loading plan comparisons...
                    </td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No plans available.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan, idx) => {
                    const finalPrice =
                      plan.discountedPrice !== undefined && plan.discountedPrice !== null
                        ? plan.discountedPrice
                        : plan.originalPrice ?? 0;

                    return (
                      <tr
                        key={plan._id || plan.slug}
                        className={`transition-colors ${
                          plan.isPopular
                            ? 'bg-rose-50/50 hover:bg-rose-50/80 font-semibold'
                            : idx % 2 === 0
                            ? 'bg-white hover:bg-slate-50/60'
                            : 'bg-slate-50/30 hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-2.5 sm:py-3 px-3.5 sm:px-5 font-bold text-[#111827] flex items-center gap-2">
                          <span>{plan.name}</span>
                          {plan.isPopular && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#E51F3E] text-white shadow-2xs">
                              Popular
                            </span>
                          )}
                          {plan.seasonalLabel && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                              Offer
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 sm:py-3 px-3.5 sm:px-5 font-bold text-slate-900">
                          ₹{finalPrice.toLocaleString('en-IN')}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            {plan.billingPeriod && plan.billingPeriod !== 'Forever Free'
                              ? `/ ${plan.billingPeriod}`
                              : ''}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3.5 sm:px-5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              plan.profileViewLimit === 'unlimited'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {plan.profileViewLimit === 'unlimited' ? 'Unlimited' : 'Limited'}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3.5 sm:px-5 font-bold text-[#111827]">
                          {plan.contactRequestLimit === -1
                            ? 'Unlimited / Fair Use'
                            : plan.contactRequestLimit && plan.contactRequestLimit > 0
                            ? `${plan.contactRequestLimit} Contacts`
                            : '0 Contacts'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 2.5 Promo / Coupon Code Section ── */}
      <section className="pt-4 pb-2 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0 border border-rose-100">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>Have a Promo or Referral Coupon?</span>
                <span className="text-[10px] uppercase font-extrabold bg-rose-100 text-[#E51F3E] px-2 py-0.5 rounded-full">
                  Special Savings
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Enter your seasonal coupon or referral reward code to apply discounts instantly.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            {appliedCoupon ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-800">
                  Applied: <span className="tracking-wider">{appliedCoupon}</span>
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="ml-2 text-xs text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                  title="Remove coupon"
                >
                  ✕
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex items-center gap-2 w-full sm:w-72">
                <input
                  type="text"
                  placeholder="e.g. WJ50OFF / WJREF-XXXX"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl border border-[#E8E1DB] focus:outline-none focus:border-[#E51F3E] bg-slate-50 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={couponApplying || !couponInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#CC1432] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  {couponApplying ? 'Verifying...' : 'Apply'}
                </button>
              </form>
            )}
          </div>
        </div>

        {couponAlert && (
          <div
            className={`mt-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              couponAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{couponAlert.text}</span>
            <button
              type="button"
              onClick={() => setCouponAlert(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* ── 3. Dynamic Pricing Cards Section ── */}
      <section className="py-5 sm:py-7 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="font-serif text-xl sm:text-3xl font-extrabold text-[#111827]">
            Select Your Matrimonial Package
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Transparent pricing designed for healthcare professionals. All contact requests are protected by mutual consent.
          </p>
        </div>

        {/* Loading State */}
        {loadingPlans && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-96 rounded-2xl bg-white border border-[#E8E1DB] p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-24 h-5 bg-slate-200 rounded" />
                  <div className="w-36 h-8 bg-slate-200 rounded" />
                  <div className="w-full h-12 bg-slate-100 rounded" />
                </div>
                <div className="w-full h-10 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {plansError && !loadingPlans && (
          <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 max-w-md mx-auto text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <div className="text-sm font-bold text-rose-900">{plansError}</div>
            <button
              onClick={loadDynamicPlans}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Grid of Membership Cards */}
        {!loadingPlans && !plansError && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            {plans.map((plan) => {
              const planKey = plan.key || plan.slug;
              const calculatedOffer = planOffers[planKey];

              const origPrice = calculatedOffer ? calculatedOffer.originalPrice : (plan.originalPrice ?? 0);
              const discPrice = calculatedOffer
                ? calculatedOffer.finalPrice
                : plan.discountedPrice !== undefined && plan.discountedPrice !== null
                ? plan.discountedPrice
                : plan.price
                ? Number(plan.price)
                : origPrice;

              const hasDiscount = origPrice > discPrice && origPrice > 0;
              const discountPct = calculatedOffer
                ? calculatedOffer.discountPercentage
                : plan.seasonalDiscount ||
                  (hasDiscount ? Math.round(((origPrice - discPrice) / origPrice) * 100) : 0);

              const isFree =
                calculatedOffer?.isFree ||
                (discPrice === 0 && origPrice > 0 && plan.slug !== 'free' && plan.ctaAction !== 'register');

              const isExclusive =
                plan.slug === 'exclusive-concierge' ||
                plan.slug.includes('concierge') ||
                plan.key === 'EXCLUSIVE_CONCIERGE';

              const activeCampaignName = calculatedOffer?.campaign?.name;
              const activeCoupon = calculatedOffer?.coupon;

              return (
                <div
                  key={plan._id || plan.slug}
                  className={`relative flex flex-col rounded-2xl bg-white p-5 sm:p-6 transition-all duration-300 ${
                    isFree
                      ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-900/10 lg:-translate-y-1.5'
                      : plan.isPopular
                      ? 'border-2 border-[#E51F3E] shadow-lg shadow-rose-900/10 lg:-translate-y-1.5'
                      : 'border border-[#E8E1DB] shadow-2xs hover:shadow-sm hover:border-slate-300'
                  }`}
                >
                  {/* Highlight Badges */}
                  {isFree ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase shadow-2xs flex items-center gap-1 animate-bounce">
                      <Sparkles className="w-3 h-3 fill-current" />
                      <span>100% FREE OFFER</span>
                    </div>
                  ) : plan.isPopular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E51F3E] text-white px-3.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase shadow-2xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{plan.badge || 'MOST POPULAR'}</span>
                    </div>
                  ) : plan.badge ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-0.5 rounded-full text-[10.5px] font-extrabold tracking-wide uppercase shadow-2xs">
                      {plan.badge}
                    </div>
                  ) : null}

                  {/* Card Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isFree
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                          : plan.isPopular
                          ? 'bg-rose-50 border border-rose-200'
                          : 'bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      {getPlanIcon(plan.slug)}
                    </div>
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#111827]">
                        {plan.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        {plan.billingPeriod || `${plan.durationDays} Days`}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className="text-xs text-slate-600 mt-2.5 min-h-[36px] leading-relaxed">
                      {plan.description}
                    </p>
                  )}

                  {/* Pricing Display */}
                  <div className="mt-3.5 pb-3.5 border-b border-slate-100">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {/* Strikethrough Original Price */}
                      {hasDiscount && (
                        <span className="font-serif text-lg sm:text-xl text-slate-400 line-through font-semibold">
                          ₹{origPrice.toLocaleString('en-IN')}
                        </span>
                      )}

                      {/* Offer Price */}
                      <span
                        className={`font-serif text-2xl sm:text-3xl font-extrabold ${
                          isFree ? 'text-emerald-700' : 'text-[#111827]'
                        }`}
                      >
                        ₹{discPrice.toLocaleString('en-IN')}
                      </span>

                      {/* Discount Percentage Badge */}
                      {discountPct > 0 && (
                        <span
                          className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-md border ${
                            isFree
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    {/* Active Campaign / Coupon Promotion Label */}
                    {activeCampaignName && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-50 via-[#FFF0F3] to-amber-50 border border-rose-200 text-[#9E132D] text-xs font-bold shadow-2xs">
                        <Flame className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                        <span>{activeCampaignName}</span>
                      </div>
                    )}

                    {activeCoupon && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                        <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Coupon: {activeCoupon.code} Applied</span>
                      </div>
                    )}

                    {!activeCampaignName && !activeCoupon && (plan.seasonalLabel || plan.isSeasonalOffer) && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-50 via-[#FFF0F3] to-amber-50 border border-rose-200 text-[#9E132D] text-xs font-bold shadow-2xs">
                        <Flame className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                        <span>{plan.seasonalLabel || 'Special Limited Offer'}</span>
                      </div>
                    )}

                    {/* Badges for Profile Viewing and Contact Credits */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-700">
                        <UserCheck className="w-3 h-3 text-slate-500" />
                        <span>
                          {plan.profileViewLimit === 'unlimited' ? 'Unlimited' : 'Limited'} Viewing
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          plan.contactRequestLimit && plan.contactRequestLimit !== 0
                            ? 'bg-rose-50 text-[#E51F3E] border border-rose-200/60'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>
                          {plan.contactRequestLimit === -1
                            ? 'Unlimited Contacts'
                            : plan.contactRequestLimit && plan.contactRequestLimit > 0
                            ? `${plan.contactRequestLimit} Contacts`
                            : '0 Contacts'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-3.5 flex-1 space-y-2.5 text-xs text-slate-700">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                      Included Features
                    </span>
                    {plan.features && plan.features.length > 0 ? (
                      plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                          </div>
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 italic">Standard membership privileges</div>
                    )}

                    {plan.disclaimer && (
                      <p className="text-[11px] text-slate-400 italic pt-1.5">{plan.disclaimer}</p>
                    )}
                  </div>

                  {/* Card CTA */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={processingOrder}
                      onClick={() => handlePlanAction(plan)}
                      className={`w-full h-11 min-h-[44px] px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-2xs flex items-center justify-center ${
                        isFree
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20 hover:shadow-md animate-pulse'
                          : plan.isPopular
                          ? 'bg-[#E51F3E] hover:bg-[#CC1432] text-white shadow-rose-900/20 hover:shadow-md'
                          : isExclusive
                          ? 'bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {processingOrder && selectedPlan === plan.name
                        ? 'Processing...'
                        : isFree
                        ? '🎉 Claim 100% Free Offer'
                        : plan.ctaText || 'Select Plan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 4. Dedicated Privacy Section ── */}
      <section className="mt-6 sm:mt-8 py-6 sm:py-9 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-white border border-[#E8E1DB] p-5 sm:p-8 shadow-2xs text-center">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-[#E51F3E] mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <h2 className="font-serif text-xl sm:text-2xl font-extrabold text-[#111827]">
            Your Privacy Comes First
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-xl mx-auto">
            At Wonderful Jodi, we prioritize the confidentiality and security of every doctor and medical family.
          </p>

          {/* 8 Privacy Points Grid */}
          <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-3xl mx-auto">
            {PRIVACY_POINTS.map((point, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#FAF7F4] border border-[#E8E1DB] text-xs font-medium text-slate-800"
              >
                <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  ✓
                </div>
                <span>{point}</span>
              </div>
            ))}
          </div>

          {/* Highlighted Privacy Message Box */}
          <div className="mt-5 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-rose-50 via-[#FFF5F7] to-rose-50 border border-rose-200 max-w-2xl mx-auto shadow-2xs">
            <p className="text-xs sm:text-sm font-bold text-[#9E132D] flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-[#E51F3E] shrink-0" />
              <span>{PRIVACY_HIGHLIGHT}</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
