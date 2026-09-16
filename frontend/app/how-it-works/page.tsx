'use client';

import React from 'react';
import Link from 'next/link';
import {
  UserPlus,
  FileCheck2,
  ShieldCheck,
  Search,
  Eye,
  Crown,
  HeartHandshake,
  Gift,
  ArrowRight,
  Sparkles,
  Stethoscope,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      step: 1,
      title: 'Register',
      short: 'Candidate Profile Setup',
      icon: UserPlus,
      accentColor: 'from-rose-500 to-red-600',
      tag: 'Step 1',
      desc: 'Create your Wonderful Jodi doctor matrimonial profile with verified basic credentials, specialty interest, and secure authentication.',
      details: [
        'Quick 3-minute initial signup',
        'Automatic unique Candidate ID generation (e.g. WJ-100001)',
        'Privacy-first account controls from day one',
      ],
    },
    {
      step: 2,
      title: 'Complete Your Profile',
      short: 'Personal & Partner Preferences',
      icon: FileCheck2,
      accentColor: 'from-emerald-500 to-teal-600',
      tag: 'Step 2',
      desc: 'Add your medical qualification (MBBS, MD, MS, BDS, etc.), current practice or hospital role, horoscope coordinates, and partner expectations.',
      details: [
        'Detailed medical qualification & specialty details',
        'Family values, native place, and lifestyle choices',
        'Flexible partner age, location, and education preferences',
      ],
    },
    {
      step: 3,
      title: 'Doctor Verification',
      short: 'Trust & Authenticity',
      icon: ShieldCheck,
      accentColor: 'from-blue-500 to-indigo-600',
      tag: 'Step 3',
      desc: 'Complete medical registration number verification and government ID review to attain the official Blue Verified Doctor badge.',
      details: [
        'State / National Medical Council verification',
        'Confidential document processing with bank-grade security',
        'Enhanced visibility and trust score across the network',
      ],
    },
    {
      step: 4,
      title: 'Discover Profiles',
      short: 'Smart Doctor Matchmaking',
      icon: Search,
      accentColor: 'from-amber-500 to-orange-600',
      tag: 'Step 4',
      desc: 'Filter profiles by medical qualification, surgical/clinical specialties, native state, gotra/kundali compatibility, and lifestyle preferences.',
      details: [
        'Targeted search by doctor specialization & hospital location',
        'Kundali / Guna Milan score computation',
        'Daily personalized matchmaking recommendations',
      ],
    },
    {
      step: 5,
      title: 'View Profile Details',
      short: 'Privacy-Governed Access',
      icon: Eye,
      accentColor: 'from-purple-500 to-violet-600',
      tag: 'Step 5',
      desc: 'Inspect permissible credentials while respecting strict candidate privacy choices and matrimonial boundary settings.',
      details: [
        'Public visitors: Candidate ID & basic anonymized details',
        'Logged-in doctors: Verified first name, bio & horoscope details',
        'Photos & contact numbers protected by candidate consent',
      ],
    },
    {
      step: 6,
      title: 'Membership & Offers',
      short: 'Dynamic Healthcare Packages',
      icon: Crown,
      accentColor: 'from-rose-600 to-pink-600',
      tag: 'Step 6',
      desc: 'Upgrade when premium features are needed. Unlock dynamic seasonal offers (Doctor’s Day, Mother’s Day, festive discounts) and promotional coupons.',
      details: [
        'Doctor Connect & Premium VIP packages',
        'Eligible seasonal campaigns with up to 100% discount',
        'Transparent server-calculated pricing with no hidden charges',
      ],
    },
    {
      step: 7,
      title: 'Connect & Communicate',
      short: 'Consent-Based Contact',
      icon: HeartHandshake,
      accentColor: 'from-teal-500 to-emerald-600',
      tag: 'Step 7',
      desc: 'Send complimentary Interests to prospective doctors. Once accepted, initiate direct platform messaging or request verified contact information.',
      details: [
        'Free Members: Send & receive express interest requests',
        'Paid Members: Real-time messaging and direct contact access',
        'Complete mutual consent safeguards against spam',
      ],
    },
    {
      step: 8,
      title: 'Referral & Rewards',
      short: 'Share with Doctor Colleagues',
      icon: Gift,
      accentColor: 'from-fuchsia-500 to-rose-600',
      tag: 'Step 8',
      desc: 'Invite trusted doctor friends and batchmates using your personal referral link. Unlock milestone coupons, membership discounts, and bonus view credits.',
      details: [
        'Personal shareable referral link with Candidate ID',
        'Automated reward coupon generation upon qualifying milestone',
        'Live progress tracking on your Referral Dashboard',
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF7F4] text-[#111827] pb-16">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-rose-50/40 to-[#FAF7F4] border-b border-rose-100/60 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold tracking-wide uppercase">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor Matrimonial Journey</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            How Wonderful Jodi Works
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Connect with compatible medical professionals through a simple, secure, and dignified matrimonial journey designed specifically for healthcare specialists.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#E51F3E] text-white px-6 py-3 text-sm font-bold shadow-md shadow-rose-600/20 hover:bg-[#CE102F] transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 text-slate-700 px-6 py-3 text-sm font-bold hover:bg-slate-50 transition-all shadow-xs"
            >
              <span>Explore Plans & Offers</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8 Steps Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            A Step-by-Step Pathway to Your Medical Match
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            From verified registration to confidential conversations and community rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative bg-white rounded-2xl border border-rose-100/80 p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-rose-300 transition-all duration-300"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF0F3] text-[#E51F3E] flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                      {item.tag}
                    </span>
                  </div>

                  {/* Title & Short */}
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#E51F3E] transition-colors">
                    {item.title}
                  </h3>
                  <div className="text-xs font-semibold text-[#E51F3E] mb-2">{item.short}</div>

                  {/* Description */}
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mb-4">
                    {item.desc}
                  </p>
                </div>

                {/* Highlights */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  {item.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11.5px] text-slate-600 leading-snug">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Privacy & Verification Assurance Section ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-[#101828] text-white p-6 sm:p-10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Doctor Confidentiality Guaranteed</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold">
              Built Exclusively for Doctors by Doctors
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Zero public contact scraping. Strict identity and qualification checks. Full control over who can see your photos, birth horoscope, and phone number.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-[#E51F3E] text-white text-xs font-bold text-center hover:bg-[#CE102F] transition shadow-lg shadow-rose-600/30"
            >
              Create Doctor Profile
            </Link>
            <Link
              href="/referrals"
              className="px-5 py-3 rounded-xl bg-white/10 text-white border border-white/20 text-xs font-bold text-center hover:bg-white/20 transition"
            >
              Refer & Earn Rewards
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
