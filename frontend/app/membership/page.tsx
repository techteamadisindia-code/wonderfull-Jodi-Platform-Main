'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Crown,
  Sparkles,
  Flame,
  Shield,
  ShieldCheck,
  Star,
  Heart,
  Lock,
  Medal,
  Gem,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import {
  MEMBERSHIP_PLANS,
  COMPARISON_TABLE_DATA,
  PRIVACY_POINTS,
  PRIVACY_HIGHLIGHT,
  PlanConfig,
} from '../../lib/membershipConfig';
import { getAuthToken } from '../../lib/api';
import api from '../../lib/api';
import { VvipModal } from '../../components/VvipModal';
import { PaymentModal, PaymentOrderData } from '../../components/PaymentModal';

export default function MembershipPage() {
  const router = useRouter();
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

  useEffect(() => {
    loadMembershipStatus();
  }, []);

  const handlePlanAction = async (plan: PlanConfig) => {
    setSelectedPlan(plan.name);
    setOrderError(null);
    setOrderSuccess(null);

    // Concierge / Consultation flow
    if (plan.ctaAction === 'contact' || plan.isVvip) {
      setIsVvipModalOpen(true);
      return;
    }

    // Free plan flow
    if (plan.ctaAction === 'register' || plan.planId === 'free') {
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

    try {
      setProcessingOrder(true);
      const res = await api.post('/memberships/create-order', {
        planKey: plan.key,
        slug: plan.slug,
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

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Sparkles className="w-5 h-5 text-slate-600" />;
      case 'doctor-connect':
        return <Heart className="w-5 h-5 text-[#E51F3E]" />;
      case 'premium-match':
        return <Flame className="w-5 h-5 text-[#E51F3E]" />;
      case 'priority-matchmaking':
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 'exclusive-concierge':
        return <Gem className="w-5 h-5 text-purple-600" />;
      default:
        return <Star className="w-5 h-5 text-[#E51F3E]" />;
    }
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
                <span>Current Plan: <strong className="text-slate-900 uppercase">{activePlanKey.replace('-', ' ')}</strong></span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Contact Credits: <strong className="text-[#E51F3E]">{contactCredits} Available</strong>
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
            Compare key features and contact request limits across our 5 membership packages
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
                {COMPARISON_TABLE_DATA.map((row, idx) => (
                  <tr
                    key={row.packageName}
                    className={`transition-colors ${
                      row.isPopular
                        ? 'bg-rose-50/50 hover:bg-rose-50/80 font-semibold'
                        : idx % 2 === 0
                        ? 'bg-white hover:bg-slate-50/60'
                        : 'bg-slate-50/30 hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="py-2.5 sm:py-3 px-3.5 sm:px-5 font-bold text-[#111827] flex items-center gap-2">
                      <span>{row.packageName}</span>
                      {row.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            row.isPopular
                              ? 'bg-[#E51F3E] text-white shadow-2xs'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {row.badge}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3.5 sm:px-5 font-bold text-slate-900">
                      {row.price}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        {row.duration !== 'Forever Free' ? `/ ${row.duration}` : ''}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3 px-3.5 sm:px-5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.profileViewing === 'Unlimited'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.profileViewing}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3 px-3.5 sm:px-5 font-bold text-[#111827]">
                      {row.contactViews}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 3. Five Pricing Cards Section (3 Top Row, 2 Centered Bottom Row) ── */}
      <section className="py-5 sm:py-7 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="font-serif text-xl sm:text-3xl font-extrabold text-[#111827]">
            Select Your Matrimonial Package
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Transparent pricing designed for healthcare professionals. All contact requests are protected by mutual consent.
          </p>
        </div>

        {/* Top Row (3 Cards: Free, Doctor Connect, Premium Match) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {MEMBERSHIP_PLANS.slice(0, 3).map((plan) => (
            <div
              key={plan.planId}
              className={`relative flex flex-col rounded-2xl bg-white p-4.5 sm:p-5.5 transition-all duration-300 ${
                plan.isPopular
                  ? 'border-2 border-[#E51F3E] shadow-lg shadow-rose-900/10 lg:-translate-y-1.5'
                  : 'border border-[#E8E1DB] shadow-2xs hover:shadow-sm hover:border-slate-300'
              }`}
            >
              {/* Most Popular Highlight Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E51F3E] text-white px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase shadow-2xs">
                  {plan.badge}
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    plan.isPopular
                      ? 'bg-rose-50 border border-rose-200'
                      : 'bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {getPlanIcon(plan.planId)}
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#111827]">{plan.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {plan.duration}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 mt-2 min-h-[32px] leading-relaxed">
                {plan.description}
              </p>

              {/* Pricing Display */}
              <div className="mt-3 pb-3 border-b border-slate-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl sm:text-3xl font-extrabold text-[#111827]">
                    {plan.price}
                  </span>
                  {plan.durationMonths && (
                    <span className="text-xs font-semibold text-slate-500">
                      / {plan.durationMonths} Months
                    </span>
                  )}
                </div>

                {/* Badges for Profile Viewing and Contact Credits */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-700">
                    <UserCheck className="w-3 h-3 text-slate-500" />
                    <span>{plan.profileViewing} Viewing</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      plan.contactRequestLimit > 0
                        ? 'bg-rose-50 text-[#E51F3E] border border-rose-200/60'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{plan.contactViews}</span>
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="mt-3 flex-1 space-y-2 text-xs text-slate-700">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Included Features
                </span>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                    </div>
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Card CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={processingOrder}
                  onClick={() => handlePlanAction(plan)}
                  className={`w-full h-10 min-h-[40px] px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-2xs flex items-center justify-center ${
                    plan.isPopular
                      ? 'bg-[#E51F3E] hover:bg-[#CC1432] text-white shadow-rose-900/20 hover:shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {processingOrder && selectedPlan === plan.name ? 'Processing...' : plan.ctaText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Row (2 Centered Cards: Priority Matchmaking, Exclusive Concierge) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto items-stretch">
          {MEMBERSHIP_PLANS.slice(3, 5).map((plan) => (
            <div
              key={plan.planId}
              className="relative flex flex-col rounded-2xl bg-white p-4.5 sm:p-5.5 border border-[#E8E1DB] shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all duration-300"
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase shadow-2xs ${
                    plan.isVvip
                      ? 'bg-purple-900 text-purple-100 border border-purple-700'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  {getPlanIcon(plan.planId)}
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#111827]">{plan.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    {plan.duration}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 mt-2 min-h-[32px] leading-relaxed">
                {plan.description}
              </p>

              {/* Pricing Display */}
              <div className="mt-3 pb-3 border-b border-slate-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl sm:text-3xl font-extrabold text-[#111827]">
                    {plan.price}
                  </span>
                  {plan.durationMonths && (
                    <span className="text-xs font-semibold text-slate-500">
                      / {plan.durationMonths} Months
                    </span>
                  )}
                </div>

                {/* Badges */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-700">
                    <UserCheck className="w-3 h-3 text-slate-500" />
                    <span>{plan.profileViewing} Viewing</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-[#E51F3E] border border-rose-200/60 text-[11px] font-bold">
                    <Lock className="w-3 h-3" />
                    <span>{plan.contactViews}</span>
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="mt-3 flex-1 space-y-2 text-xs text-slate-700">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Included Features
                </span>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                    </div>
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}

                {plan.disclaimer && (
                  <p className="text-[11px] text-slate-400 italic pt-1.5">{plan.disclaimer}</p>
                )}
              </div>

              {/* Card CTA */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={processingOrder}
                  onClick={() => handlePlanAction(plan)}
                  className={`w-full h-10 min-h-[40px] px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-2xs flex items-center justify-center ${
                    plan.isVvip
                      ? 'bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {processingOrder && selectedPlan === plan.name ? 'Processing...' : plan.ctaText}
                </button>
              </div>
            </div>
          ))}
        </div>
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
