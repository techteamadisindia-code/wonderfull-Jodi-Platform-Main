'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Compass,
  FileText,
  Lock,
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Scale,
} from 'lucide-react';

export default function AstrologyLandingPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F4] text-[#0F172A] pb-16 text-left">
      {/* ── Page Header / Hero Banner ── */}
      <header className="bg-gradient-to-b from-[#6B0D1E] via-[#85132A] to-[#9C1830] text-white py-7 sm:py-10 px-4 sm:px-6 lg:px-8 border-b border-rose-900/40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-5xl mx-auto relative z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-100 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Vedic Astro-Compatibility • Doctor Matrimony</span>
            </div>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Kundali & Astrology Matchmaking
          </h1>

          <p className="text-sm sm:text-base font-medium text-amber-200">
            Vedic Compatibility Insights for Your Journey Together
          </p>

          <p className="text-xs sm:text-sm text-rose-100/90 max-w-2xl leading-relaxed">
            Compare birth details, explore traditional 36-Guna Milan, review Manglik considerations, and understand compatibility before taking the next step.
          </p>

          <div className="pt-1">
            <Link
              href="/kundali-match"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E51F3E] text-white text-xs sm:text-sm font-bold hover:bg-[#c91834] transition shadow-md shadow-red-950/20"
            >
              <span>Get Free Kundali Match →</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Feature Content ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8 sm:space-y-10">
        {/* The 4 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Card 1: Instant 36 Guna Milan */}
          <div className="bg-white rounded-2xl p-4.5 sm:p-6 border border-[#E8E1DB] shadow-2xs flex flex-col justify-between space-y-4 hover:border-rose-300 transition">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-[#D99A28] flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-lg font-bold text-[#0F172A]">
                Instant 36 Guna Milan
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Compare two profiles using the traditional Ashtakoota compatibility framework.
              </p>
            </div>
            <div>
              <Link
                href="/kundali-match"
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#c91834] transition shadow-xs"
              >
                <span>Match Kundalis</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Manglik Analysis */}
          <div className="bg-white rounded-2xl p-4.5 sm:p-6 border border-[#E8E1DB] shadow-2xs flex flex-col justify-between space-y-4 hover:border-rose-300 transition">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-[#E51F3E] flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-lg font-bold text-[#0F172A]">
                Manglik Analysis
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Review Mangal Dosha considerations for both partners.
              </p>
            </div>
            <div>
              <Link
                href="/kundali-match"
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 transition shadow-xs"
              >
                <span>Check Compatibility</span>
              </Link>
            </div>
          </div>

          {/* Card 3: Detailed Compatibility Report */}
          <div className="bg-white rounded-2xl p-4.5 sm:p-6 border border-[#E8E1DB] shadow-2xs flex flex-col justify-between space-y-4 hover:border-rose-300 transition">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-lg font-bold text-[#0F172A]">
                Detailed Compatibility Report
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Get a detailed compatibility report covering Guna Milan and horoscope factors.
              </p>
            </div>
            <div>
              <Link
                href="/kundali-match"
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-xl border border-[#E8E1DB] text-slate-800 text-xs font-bold hover:border-[#E51F3E] hover:text-[#E51F3E] transition shadow-xs"
              >
                <span>View Report</span>
              </Link>
            </div>
          </div>

          {/* Card 4: Privacy Protected */}
          <div className="bg-white rounded-2xl p-4.5 sm:p-6 border border-[#E8E1DB] shadow-2xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition">
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="font-serif text-lg font-bold text-[#0F172A]">
                Privacy Protected
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Birth details and horoscope information remain protected according to profile privacy settings.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full owner privacy controls in Profile Settings</span>
            </div>
          </div>
        </div>

        {/* Doctor Matrimony & Authentic Vedic Framework Highlight */}
        <div className="bg-gradient-to-r from-[#FFF9F2] to-[#FFF5F6] rounded-2xl p-5 sm:p-7 border border-[#E8E1DB] space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-amber-950 text-sm">
            <Sparkles className="w-4 h-4 text-[#D99A28]" />
            <span>Integrated Doctor Matrimonial Compatibility</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Wonderful Jodi provides calculated Vedic compatibility as one valuable cultural dimension alongside medical career compatibility, clinical specialization alignment, educational pedigree, family background, and verified credentials.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div className="bg-white p-2.5 rounded-xl border border-amber-100 font-semibold text-slate-800">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Framework</span>
              <span>36 Guna Ashtakoota</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-100 font-semibold text-slate-800">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Calculations</span>
              <span>Genuine Ephemeris</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-100 font-semibold text-slate-800">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Specialization</span>
              <span>Doctor-to-Doctor Focus</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-100 font-semibold text-slate-800">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Privacy</span>
              <span>Encrypted Storage</span>
            </div>
          </div>
        </div>

        {/* Subtle Legal Disclaimer */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E8E1DB] text-slate-500 text-[11.5px] leading-relaxed text-center shadow-2xs">
          Kundali matching is a traditional astrological practice and is provided for informational and cultural purposes. It should not be treated as a guarantee or sole basis for marriage decisions.
        </div>
      </div>
    </main>
  );
}
