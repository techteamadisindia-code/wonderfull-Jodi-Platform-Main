'use client';

import Link from 'next/link';
import { ShieldCheck, Heart, Sparkles, Award, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#15213A] pb-16">
      {/* 1. ABOUT HERO */}
      <section className="pt-[70px] pb-[55px] px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-[850px] mx-auto space-y-4">
          {/* Small Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF0F3] border border-[#F5D9DD] px-4 py-1.5 text-xs font-bold text-[#E9232E] shadow-2xs">
            <Heart className="w-3.5 h-3.5 fill-[#E9232E]" />
            <span>Our Story & Mission</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-serif text-[38px] sm:text-[46px] lg:text-[58px] font-extrabold text-[#101728] tracking-tight leading-[1.08]">
            Connecting Hearts, Building <span className="text-[#E9232E]">Happy Families</span>
          </h1>

          {/* Hero Description */}
          <p className="text-slate-600 text-base sm:text-[18px] leading-[1.6] max-w-[850px] mx-auto pt-1">
            Wonderful Jodi is India&apos;s premier matrimonial platform created specifically for educated professionals, entrepreneurs, and traditional families seeking trusted, lifelong relationships.
          </p>
        </div>
      </section>

      {/* 2. THREE FEATURE CARDS */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 sm:gap-8 items-stretch">
          {/* 100% Verification */}
          <div className="rounded-[24px] border border-[#F5D9DD] bg-white p-8 sm:p-9 shadow-xs hover:shadow-md transition-all duration-200 min-h-[250px] flex flex-col justify-start">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#E9232E] mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#101728]">100% Verification</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Every profile undergoes strict document and mobile verification to maintain a transparent, spam-free community.
            </p>
          </div>

          {/* Smart Compatibility */}
          <div className="rounded-[24px] border border-[#F5D9DD] bg-white p-8 sm:p-9 shadow-xs hover:shadow-md transition-all duration-200 min-h-[250px] flex flex-col justify-start">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-[#D89B18] mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#101728]">Smart Compatibility</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Our intelligent search algorithm connects candidates based on lifestyle choices, educational background, and family values.
            </p>
          </div>

          {/* Privacy Control */}
          <div className="rounded-[24px] border border-[#F5D9DD] bg-white p-8 sm:p-9 shadow-xs hover:shadow-md transition-all duration-200 min-h-[250px] flex flex-col justify-start">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-[#EF1D4D] mb-6">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#101728]">Privacy Control</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Complete control over profile photos, contact visibility, and who can send match requests.
            </p>
          </div>
        </div>
      </section>

      {/* 3. TRUST SECTION */}
      <section className="mt-[60px] max-w-[1350px] w-[calc(100%-32px)] sm:w-[calc(100%-64px)] mx-auto bg-[#101728] text-white rounded-[28px] p-8 sm:p-12 lg:px-[65px] lg:py-[55px] shadow-lg">
        <div className="max-w-3xl space-y-3">
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Why Thousands Trust Wonderful Jodi
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            We believe marriage is a sacred union between two families. We are committed to maintaining a secure environment where genuine intentions thrive.
          </p>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="border-t border-white/[0.12] mt-[30px] pt-[30px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            {[
              'Zero Fake Profiles Policy',
              'Protected Contact Details',
              '24/7 Customer Assistance',
              'Thousands of Matrimonial Successes',
            ].map((value, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#E9232E] shrink-0" />
                <span className="text-[15px] sm:text-base font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CTA SECTION */}
      <section className="py-[65px] px-5 text-center mt-[10px] sm:mt-[15px] max-w-3xl mx-auto">
        <h3 className="font-serif text-3xl sm:text-[32px] font-bold text-[#101728]">
          Start Your Journey Today
        </h3>
        <p className="text-base text-[#64748B] max-w-[600px] mx-auto mt-2.5 mb-7">
          Create your profile for free and start discovering verified matches.
        </p>
        <Link
          href="/register"
          className="h-[56px] px-[34px] inline-flex items-center justify-center rounded-full bg-[#E9232E] hover:bg-[#d11735] text-white font-bold text-base shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(233,35,46,0.22)] active:translate-y-0"
        >
          Register Free Profile Now
        </Link>
      </section>
    </main>
  );
}
