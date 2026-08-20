'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  X as CrossIcon,
  Crown,
  Sparkles,
  Flame,
  Shield,
  ShieldCheck,
  Star,
  Users,
  Heart,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Phone,
  Lock,
  Medal,
  Calendar,
  Gift,
  Home,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  MEMBERSHIP_PLANS,
  COMPARISON_DATA,
  JOURNEY_STEPS,
  PlanConfig,
} from '../../lib/membershipConfig';
import { getAuthToken } from '../../lib/api';
import api from '../../lib/api';
import { VvipModal } from '../../components/VvipModal';

export default function MembershipPage() {
  const router = useRouter();
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isVvipModalOpen, setIsVvipModalOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setAuthenticated(!!getAuthToken());
  }, []);

  const toggleCardExpansion = (planId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  const handleToggleExpandAll = () => {
    const newState = !expandAll;
    setExpandAll(newState);
    const updated: Record<string, boolean> = {};
    MEMBERSHIP_PLANS.forEach((p) => {
      updated[p.planId] = newState;
    });
    setExpandedCards(updated);
  };

  const handlePlanAction = async (plan: PlanConfig) => {
    setSelectedPlan(plan.name);
    setOrderError(null);
    setOrderSuccess(null);

    if (plan.ctaAction === 'contact' || plan.isVvip) {
      setIsVvipModalOpen(true);
      return;
    }

    if (plan.ctaAction === 'register' || plan.planId === 'free') {
      if (authenticated) {
        router.push('/search');
      } else {
        router.push('/register');
      }
      return;
    }

    // For Premium / Premium VIP (Paid Plans)
    if (!authenticated) {
      router.push('/login?redirect=/membership');
      return;
    }

    try {
      setProcessingOrder(true);
      const res = await api.post('/memberships/create-order', {
        planKey: plan.key,
      });

      if (res.data?.success) {
        setOrderSuccess(
          `You have successfully initiated upgrade to ${plan.name}. Our matrimonial concierge team has activated your priority access.`
        );
      } else {
        setOrderError(res.data?.message || 'Unable to process plan upgrade. Please try again.');
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      setOrderError(
        err.response?.data?.message ||
          'Subscription initialized. If payment window did not open, please contact support at +91 1800 200 9090.'
      );
    } finally {
      setProcessingOrder(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#15213A] pb-16">
      {/* VVIP Consultation Modal */}
      <VvipModal isOpen={isVvipModalOpen} onClose={() => setIsVvipModalOpen(false)} />

      {/* 1. Hero Section - Reduced Height & Optimized Spacing */}
      <section className="relative pt-16 sm:pt-[70px] pb-8 px-4 sm:px-6 lg:px-8 border-b border-rose-100/50 bg-gradient-to-b from-[#FFF5F7]/80 via-[#FFF9FA]/40 to-[#F8FAFC]">
        <div className="max-w-4xl mx-auto text-center">
          {/* Gold Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] border border-[#FDE68A] px-4 py-1.5 text-xs font-extrabold text-[#92400E] shadow-2xs">
            <Crown className="w-3.5 h-3.5 fill-[#D89B18] text-[#D89B18]" />
            <span>👑 Find Your Perfect Doctor Match</span>
          </div>

          {/* Heading */}
          <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-[58px] font-extrabold text-[#101728] tracking-tight leading-[1.12]">
            Choose Your <span className="text-[#E51F3E]">Membership Plan</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-3.5 text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Connect with verified doctors, discover compatible matches, and choose the level of support that fits your matchmaking journey.
          </p>

          {/* Trust Indicators Strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#E51F3E]" />
              100% Doctor ID Verification
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#E51F3E]" />
              Confidential & Private
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#E51F3E]" />
              Dedicated Relationship Managers
            </span>
          </div>

          {/* Global Expand/Collapse Controller */}
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleToggleExpandAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#E51F3E] hover:border-rose-300 hover:bg-rose-50/50 shadow-2xs transition"
            >
              {expandAll ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Collapse Extended Feature Lists</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expand All Categorized Features</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Order Status Toast / Alert */}
      {orderSuccess && (
        <div className="max-w-4xl mx-auto mt-5 px-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-sm">Subscription Request Successful</p>
              <p className="mt-0.5 text-emerald-700">{orderSuccess}</p>
            </div>
            <button
              onClick={() => setOrderSuccess(null)}
              className="text-emerald-500 hover:text-emerald-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {orderError && (
        <div className="max-w-4xl mx-auto mt-5 px-4">
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-[#E51F3E] shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-sm">Notice</p>
              <p className="mt-0.5 text-rose-700">{orderError}</p>
            </div>
            <button
              onClick={() => setOrderError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Four Membership Plans Grid */}
      <section className="max-w-[1720px] mx-auto px-6 sm:px-8 lg:px-10 mt-10 sm:mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7 xl:gap-[28px] items-stretch">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isExpanded = expandedCards[plan.planId] || expandAll;
            const isFree = plan.planId === 'free';
            const isPopular = plan.isPopular;
            const isVip = plan.isVip;
            const isVvip = plan.isVvip;

            // Compute total features in this plan
            const totalFeaturesCount = plan.sections.reduce((acc, s) => acc + s.features.length, 0);

            // Specific CTA text as requested
            const ctaButtonLabel = isFree
              ? 'Create Your Free Profile →'
              : isPopular
              ? 'Start Connecting →'
              : isVip
              ? 'Get Personalised Matchmaking →'
              : 'Request VVIP Matchmaking →';

            return (
              <div
                key={plan.planId}
                className={`rounded-3xl flex flex-col justify-between transition-all duration-300 relative ${
                  isPopular
                    ? 'bg-[#101728] text-white shadow-2xl shadow-slate-950/40 border-2 border-[#E51F3E] ring-1 ring-[#E51F3E]/40 lg:-translate-y-3 z-20'
                    : isVip
                    ? 'bg-gradient-to-b from-[#FFFDF9] to-[#FFF8F0] text-[#15213A] border-2 border-[#F3D9A2] shadow-md hover:shadow-xl hover:border-[#E8C278]'
                    : isVvip
                    ? 'bg-gradient-to-b from-[#F0F4F8] to-[#E2E8F0] text-[#15213A] border-2 border-[#CBD5E1] shadow-md hover:shadow-xl'
                    : 'bg-white text-[#15213A] border border-[#F5D9DD] shadow-xs hover:shadow-md'
                } p-6 sm:p-7`}
              >
                {/* Floating Badge for Most Popular Plan */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#E51F3E] to-[#EF1D4D] px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-red-600/30 whitespace-nowrap">
                    ⭐ MOST POPULAR
                  </div>
                )}

                {/* Card Header & Content */}
                <div>
                  {/* Badge Header for Non-Popular Cards */}
                  <div className="flex items-start justify-between gap-2 min-h-[30px]">
                    {!isPopular && (
                      <span
                        className={`inline-block text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider ${
                          isVip
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            : isVvip
                            ? 'bg-slate-900 text-white border border-slate-700'
                            : 'bg-rose-50 text-[#E51F3E] border border-rose-200'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  {/* Plan Title & Subtitle */}
                  <div className="mt-2.5">
                    <h2
                      className={`font-serif text-2xl sm:text-[26px] font-bold tracking-tight leading-snug ${
                        isPopular ? 'text-white' : 'text-[#101728]'
                      }`}
                    >
                      {plan.title}
                    </h2>
                    {isVip && (
                      <p className="text-[10px] font-bold tracking-wider uppercase text-amber-800 mt-1">
                        FOR DOCTORS WHO VALUE TIME & PRIVACY
                      </p>
                    )}
                  </div>

                  {/* Best For Tagline Box */}
                  <div
                    className={`mt-3 rounded-xl px-3.5 py-2 text-[11px] font-medium leading-snug ${
                      isPopular
                        ? 'bg-slate-800/90 text-slate-300 border border-slate-700'
                        : isVip
                        ? 'bg-amber-50/90 text-amber-900 border border-amber-200/70'
                        : isVvip
                        ? 'bg-slate-200/80 text-slate-800 border border-slate-300'
                        : 'bg-slate-50 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    <span className={`font-bold mr-1 ${isPopular ? 'text-[#FF758F]' : 'text-[#E51F3E]'}`}>
                      Best For:
                    </span>
                    {plan.bestFor}
                  </div>

                  {/* Price & Description Block */}
                  <div className="mt-5 pb-4 border-b border-slate-200/40">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`font-serif text-3xl sm:text-4xl font-extrabold tracking-tight ${
                          isPopular ? 'text-[#FF4D6D]' : 'text-[#E51F3E]'
                        }`}
                      >
                        {plan.price}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isPopular ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {isFree ? '/ Forever Free' : isVvip ? '/ Tailored Concierge' : `/ ${plan.duration}`}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-xs leading-relaxed ${
                        isPopular ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  {/* Primary 5 Key Features List */}
                  <div className="mt-5 space-y-2.5">
                    <p
                      className={`text-[11px] uppercase tracking-wider font-bold ${
                        isPopular ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Key Inclusions:
                    </p>
                    <ul className="space-y-2 text-xs">
                      {plan.highlightFeatures.slice(0, 5).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-snug">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isPopular
                                ? 'bg-red-500/20 text-[#FF4D6D]'
                                : isVip
                                ? 'bg-amber-100 text-amber-800'
                                : isVvip
                                ? 'bg-slate-300 text-slate-800'
                                : 'bg-rose-50 text-[#E51F3E]'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span
                            className={
                              isPopular
                                ? 'text-slate-200 font-normal'
                                : 'text-slate-700 font-medium'
                            }
                          >
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expandable Grouped Categorized Features */}
                  {isExpanded && (
                    <div className="mt-5 pt-4 border-t border-slate-200/30 space-y-4 animate-fade-in">
                      {plan.sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-1.5">
                          <h4
                            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              isPopular ? 'text-[#FF758F]' : isVip ? 'text-amber-800' : isVvip ? 'text-slate-800' : 'text-[#E51F3E]'
                            }`}
                          >
                            <span>{section.title}</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs pl-1">
                            {section.features.map((fItem, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2 leading-relaxed">
                                <Check
                                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                    isPopular
                                      ? 'text-[#FF4D6D]'
                                      : isVip
                                      ? 'text-[#D89B18]'
                                      : isVvip
                                      ? 'text-slate-700'
                                      : 'text-[#E51F3E]'
                                  }`}
                                />
                                <span
                                  className={
                                    isPopular
                                      ? 'text-slate-300 text-[11px]'
                                      : 'text-slate-600 text-[11px]'
                                  }
                                >
                                  {fItem}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toggle Button for Features */}
                  <button
                    onClick={() => toggleCardExpansion(plan.planId)}
                    className={`mt-4 w-full py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                      isPopular
                        ? 'text-rose-300 hover:text-white hover:bg-slate-800/80'
                        : isVip
                        ? 'text-amber-800 hover:text-amber-900 hover:bg-amber-100/50'
                        : isVvip
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                        : 'text-[#E51F3E] hover:text-[#b9152b] hover:bg-rose-50'
                    }`}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>View All Features ({totalFeaturesCount})</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Aligned Card CTA Button at the Bottom */}
                <div className="mt-7 pt-2">
                  <button
                    onClick={() => handlePlanAction(plan)}
                    disabled={processingOrder}
                    className={`w-full rounded-2xl py-3.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                      isPopular
                        ? 'bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] text-white shadow-lg shadow-red-600/30 hover:shadow-xl hover:from-[#d11735] hover:to-[#e0203f] active:scale-[0.99]'
                        : isVip
                        ? 'bg-[#101728] text-white hover:bg-slate-800 border border-[#D89B18]/40 hover:shadow-md'
                        : isVvip
                        ? 'bg-[#101728] text-white hover:bg-slate-800 border border-slate-700 shadow-sm'
                        : 'bg-[#E51F3E] text-white hover:bg-[#d11735]'
                    }`}
                  >
                    <span>{ctaButtonLabel}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Support Journey Section - Compact Spacing */}
      <section className="max-w-[1720px] mx-auto px-6 sm:px-8 lg:px-10 mt-14 sm:mt-16">
        <div className="text-center max-w-2xl mx-auto space-y-1.5 mb-8">
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
            Choose the Support That Fits Your Journey
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            From independent exploration to private concierge representation, our plans progress naturally to fit your clinical schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {JOURNEY_STEPS.map((item, idx) => (
            <div
              key={idx}
              className="rounded-3xl bg-white border border-rose-100/70 p-5 sm:p-6 shadow-xs hover:shadow-md transition space-y-2.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${item.badgeColor}`}
                >
                  {item.tier}
                </span>
                <span className="text-xs font-serif font-bold text-slate-400">
                  Step 0{idx + 1}
                </span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[#101728] flex items-center gap-2">
                {item.step}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.tagline}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Plan Comparison Table */}
      <section className="max-w-[1720px] mx-auto px-6 sm:px-8 lg:px-10 mt-14 sm:mt-16">
        <div className="text-center max-w-2xl mx-auto space-y-1.5 mb-8">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#E51F3E]">
            Detailed Feature Breakdown
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#101728]">
            Compare Membership Benefits
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Choose the level of access and matchmaking support that works best for you.
          </p>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-3xl border border-rose-100/80 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-4 px-6 font-serif text-base font-bold text-[#101728] w-1/3 min-w-[260px] sticky left-0 bg-slate-50/95 z-10">
                    Membership Feature
                  </th>
                  <th className="py-4 px-4 font-serif text-sm font-bold text-[#101728] text-center w-1/6">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        FREE
                      </span>
                      <span className="text-slate-800">₹0</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 font-serif text-sm font-bold text-white text-center w-1/6 bg-[#101728] relative border-t-4 border-[#E51F3E]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-sans font-extrabold px-2.5 py-0.5 rounded-full bg-[#E51F3E] text-white">
                        ⭐ PREMIUM
                      </span>
                      <span className="text-[#FF4D6D]">₹4,999</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 font-serif text-sm font-bold text-[#101728] text-center w-1/6 bg-amber-50/40">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                        👑 PREMIUM VIP
                      </span>
                      <span className="text-[#E51F3E]">₹9,999</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 font-serif text-sm font-bold text-white text-center w-1/6 bg-[#1E293B]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                        💎 VVIP
                      </span>
                      <span className="text-slate-200">Concierge</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {COMPARISON_DATA.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`transition hover:bg-slate-50/80 ${
                      rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Feature Name */}
                    <td className="py-3.5 px-6 font-medium text-slate-900 sticky left-0 bg-inherit z-10">
                      {row.feature}
                    </td>

                    {/* Free Value */}
                    <td className="py-3.5 px-4 text-center">
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <CrossIcon className="w-4 h-4 text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {row.free}
                        </span>
                      )}
                    </td>

                    {/* Premium Value */}
                    <td className="py-3.5 px-4 text-center bg-rose-50/20 font-medium">
                      {typeof row.premium === 'boolean' ? (
                        row.premium ? (
                          <Check className="w-4 h-4 text-[#E51F3E] mx-auto stroke-[2.5]" />
                        ) : (
                          <CrossIcon className="w-4 h-4 text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-100 text-[#E51F3E] text-[11px] font-bold">
                          {row.premium}
                        </span>
                      )}
                    </td>

                    {/* Premium VIP Value */}
                    <td className="py-3.5 px-4 text-center bg-amber-50/20 font-medium">
                      {typeof row.vip === 'boolean' ? (
                        row.vip ? (
                          <Check className="w-4 h-4 text-amber-700 mx-auto stroke-[2.5]" />
                        ) : (
                          <CrossIcon className="w-4 h-4 text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-[11px] font-bold">
                          {row.vip}
                        </span>
                      )}
                    </td>

                    {/* VVIP Value */}
                    <td className="py-3.5 px-4 text-center bg-slate-100/40 font-medium">
                      {typeof row.vvip === 'boolean' ? (
                        row.vvip ? (
                          <Check className="w-4 h-4 text-slate-900 mx-auto stroke-[2.5]" />
                        ) : (
                          <CrossIcon className="w-4 h-4 text-slate-300 mx-auto" />
                        )
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                          {row.vvip}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with CTAs */}
          <div className="border-t border-slate-200 bg-slate-50/90 p-4 sm:p-5 overflow-x-auto">
            <div className="grid grid-cols-5 gap-4 min-w-[800px] items-center">
              <div className="col-span-1 pl-2">
                <span className="text-xs text-slate-500 font-medium">
                  Need assistance choosing? Call <strong>+91 1800 200 9090</strong>
                </span>
              </div>
              <div className="text-center">
                <button
                  onClick={() => handlePlanAction(MEMBERSHIP_PLANS[0])}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-[#E51F3E] hover:bg-rose-50 transition shadow-2xs"
                >
                  Join Free
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => handlePlanAction(MEMBERSHIP_PLANS[1])}
                  className="rounded-xl bg-[#E51F3E] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#d11735] transition"
                >
                  Get Premium
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => handlePlanAction(MEMBERSHIP_PLANS[2])}
                  className="rounded-xl bg-[#101728] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Get VIP
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => handlePlanAction(MEMBERSHIP_PLANS[3])}
                  className="rounded-xl bg-[#1E293B] px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 transition shadow-sm"
                >
                  Request Concierge
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Custom Assistance Section */}
      <section className="max-w-[920px] mx-auto px-6 sm:px-8 mt-14 sm:mt-16">
        <div className="rounded-3xl bg-[#FFF3F5] border border-[#F5D9DD] p-7 sm:p-8 text-center space-y-3 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-white border border-rose-200 flex items-center justify-center mx-auto text-[#E51F3E] shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#101728]">
            Need Custom Assistance?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Our relationship managers can assist you in finding suitable matches based on specific family requirements.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E51F3E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#d11735] shadow-md shadow-red-500/20 transition"
            >
              <span>Contact Matrimonial Support →</span>
            </Link>
            <button
              onClick={() => setIsVvipModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Crown className="w-3.5 h-3.5 text-[#D89B18]" />
              <span>Book VVIP Concierge Consultation</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
