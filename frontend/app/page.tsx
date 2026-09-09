<<<<<<< HEAD
'use client';

import Link from 'next/link';
import { HeroSearchBar } from '../components/HeroSearchBar';
import { FeaturedProfilesSection } from '../components/FeaturedProfilesSection';
import { WeddingSearch } from '../components/WeddingSearch';
import { Testimonials } from '../components/Testimonials';
import { AnimatedStatCounter } from '../components/AnimatedStatCounter';
import {
  Heart,
  Users,
  Sparkles,
  ArrowRight,
  Star,
  Lock,
  UserPlus,
  Search,
  Globe,
  MessageCircle,
  SlidersHorizontal,
  CheckCircle2,
  Compass,
  Scale,
  FileText,
  ShieldCheck,
} from 'lucide-react';

const confidenceFeatures = [
  {
    step: '01',
    category: 'GLOBAL REACH',
    title: 'Search Worldwide',
    description:
      'Discover highly compatible brides and grooms from across India and worldwide NRI communities without geographical limitations.',
    icon: Globe,
  },
  {
    step: '02',
    category: 'SAFE MESSAGING',
    title: 'Easy & Secure Chat',
    description:
      'Connect directly with matches, exchange preferences, and get to know each other comfortably in a protected environment.',
    icon: MessageCircle,
  },
  {
    step: '03',
    category: 'SMART FILTERS',
    title: 'Personalised Match Filters',
    description:
      'Fine-tune your partner preferences by community, education, occupation, horoscope, diet, and lifestyle with pinpoint accuracy.',
    icon: SlidersHorizontal,
  },
  {
    step: '04',
    category: 'AI MATCHING',
    title: 'AI Smart Compatibility',
    description:
      'Our intelligent matchmaking algorithms evaluate core compatibility signals to suggest your most compatible lifelong matches.',
    icon: Sparkles,
  },
];

const statsData = [
  {
    target: 100000,
    suffix: '+',
    decimals: 0,
    label: 'Verified Member Profiles',
    icon: Users,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    numColor: 'text-emerald-600',
  },
  {
    target: 98.6,
    suffix: '%',
    decimals: 1,
    label: 'Match Satisfaction Rate',
    icon: Star,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    numColor: 'text-amber-500',
  },
  {
    target: 50000,
    suffix: '+',
    decimals: 0,
    label: 'Happy Indian Marriages',
    icon: Heart,
    iconBg: 'bg-rose-50',
    iconColor: 'text-red-600',
    numColor: 'text-red-600',
  },
  {
    target: 100,
    suffix: '%',
    decimals: 0,
    label: 'Privacy & Security Guard',
    icon: Lock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    numColor: 'text-blue-600',
=======
import Link from 'next/link';
import { SearchForm } from '../components/SearchForm';
import { WeddingSearch } from '../components/WeddingSearch';
import { Testimonials } from '../components/Testimonials';
import { ProfileCard } from '../components/ProfileCard';
import { ShieldCheck, Heart, Users, Sparkles, CheckCircle2, ArrowRight, Star, Lock, Phone } from 'lucide-react';

const mockProfiles = [
  {
    _id: 'p1',
    displayName: 'Priya Sharma',
    gender: 'Female',
    dob: '1998-05-14',
    city: 'Mumbai',
    education: 'M.Tech in CS (IIT Bombay)',
    profession: 'Senior Software Engineer',
    primaryPhoto: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=85&w=800&h=1000',
  },
  {
    _id: 'p2',
    displayName: 'Rohan Mehta',
    gender: 'Male',
    dob: '1994-11-20',
    city: 'Bengaluru',
    education: 'MBA (IIM Ahmedabad)',
    profession: 'Product Director',
    primaryPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=85&w=800&h=1000',
  },
  {
    _id: 'p3',
    displayName: 'Ananya Verma',
    gender: 'Female',
    dob: '1996-08-03',
    city: 'Delhi NCR',
    education: 'MBBS, MD Cardiology',
    profession: 'Consultant Cardiologist',
    primaryPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=85&w=800&h=1000',
  },
  {
    _id: 'p4',
    displayName: 'Arjun Iyer',
    gender: 'Male',
    dob: '1997-03-15',
    city: 'Pune',
    education: 'M.Sc. Data Science (BITS Pilani)',
    profession: 'Data Scientist',
    primaryPhoto: 'https://images.unsplash.com/photo-1500959915551-4e8d30928e4f?auto=format&fit=crop&q=85&w=800&h=1000',
  },
];

const stats = [
  { value: '100k+', label: 'Verified Members', color: 'text-slate-900' },
  { value: '98%',   label: 'Success Rate',     color: 'text-red-600'   },
  { value: '50k+',  label: 'Happy Marriages',  color: 'text-amber-700' },
];

const whyChooseFeatures = [
  {
    icon: ShieldCheck,
    title: '100% Safe',
    desc: 'Multi-layer verification ensures real, trustworthy profiles only.',
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    icon: Heart,
    title: 'Smart Match',
    desc: 'AI recommendation algorithms based on lifestyle compatibility.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  {
    icon: Users,
    title: 'Family Friendly',
    desc: 'Built for manageability by parents and family guardians.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Sparkles,
    title: 'Dedicated Support',
    desc: 'Personal relationship manager assistance available.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  },
];

export default function HomePage() {
  return (
<<<<<<< HEAD
    <main className="min-h-screen bg-[#FAF8F5] text-[#0f172a] overflow-x-hidden">
      {/* ── Section 1: Hero Section (Fluid, Responsive Background Coverage) ── */}
      <section
        className="relative pt-3 sm:pt-4 lg:pt-6 pb-4 sm:pb-6 lg:pb-7 w-full"
        style={{
          background: 'linear-gradient(135deg, #FAF8F5 0%, #FFF9F5 45%, #FAF8F5 100%)',
        }}
      >
        {/* Floating Petals and Subtle Hearts */}
        <div className="absolute pointer-events-none select-none hidden sm:block" style={{ top: '18%', left: '35%' }}>
          <svg width="18" height="24" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.4 }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#F87171" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none hidden sm:block" style={{ top: '32%', right: '3%' }}>
          <svg width="14" height="18" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.35, animationDelay: '1.2s' }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#FB7185" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none hidden sm:block" style={{ bottom: '16%', right: '4%' }}>
          <svg width="16" height="20" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.3, animationDelay: '2.4s' }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#F87171" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none hidden sm:block" style={{ bottom: '18%', left: '50%' }}>
          <Heart className="w-3.5 h-3.5 fill-[#FDA4AF] text-[#FDA4AF] opacity-35 animate-float" style={{ animationDelay: '3s' }} />
        </div>

        {/* 1280px Centered Container */}
        <div className="max-w-[1280px] px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center min-h-[360px] sm:min-h-[390px] lg:min-h-[420px]">
            {/* Left Column - Hero Content (~50% on desktop) */}
            <div className="lg:col-span-6 space-y-3 sm:space-y-3.5 animate-fade-in-up text-left flex flex-col items-start pr-0 lg:pr-3 w-full max-w-[560px] lg:max-w-[580px]">
              {/* Main Heading: Responsive serif typography */}
              <h1 className="font-serif text-[38px] sm:text-[45px] md:text-[50px] lg:text-[56px] xl:text-[60px] font-bold tracking-tight leading-[1.08] w-full">
                <span className="text-[#0f172a] block">Find your</span>
                <span className="text-[#E51F3E] inline-flex items-baseline flex-wrap gap-x-2 sm:gap-x-3 mt-0.5">
                  <span>perfect</span>
                  <span className="relative inline-flex items-baseline">
                    <span>Jod</span>
                    <span className="relative inline-block">
                      <span>ı</span>
                      <Heart
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4.5 lg:h-4.5 fill-[#E51F3E] text-[#E51F3E] absolute -top-1 sm:-top-2 lg:-top-2.5 left-1/2 -translate-x-1/2 animate-pulse"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </span>
              </h1>

              {/* Description */}
              <p className="text-[13.5px] sm:text-[15px] leading-[1.55] text-[#475569] font-normal max-w-[540px]">
                Join over 100,000+ verified educated professionals and esteemed families discovering meaningful, lifelong relationships with complete privacy and trust.
              </p>

              {/* Primary & Secondary Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-0.5 w-full sm:w-auto">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] hover:bg-[#ce102f] h-[46px] sm:h-[48px] w-full sm:w-[220px] text-[14px] sm:text-[14.5px] font-bold text-white shadow-sm shadow-rose-600/25 hover:shadow-md hover:shadow-rose-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <UserPlus className="w-4.5 h-4.5 shrink-0" />
                  <span>Register Free Profile</span>
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(180,160,150,0.3)] bg-white h-[46px] sm:h-[48px] w-full sm:w-[240px] text-[14px] sm:text-[14.5px] font-bold text-[#0f172a] shadow-2xs hover:border-[#E51F3E] hover:text-[#E51F3E] hover:bg-rose-50/40 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <Search className="w-4.5 h-4.5 text-[#0f172a] group-hover:text-[#E51F3E] shrink-0 transition-colors" />
                  <span>Browse Verified Matches</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-1 flex flex-wrap items-center gap-3 sm:gap-4 text-[12px] sm:text-[13px] font-semibold text-[#334155]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0baa70] shrink-0 stroke-[2.2]" />
                  <span>Free Registration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0baa70] shrink-0 stroke-[2.2]" />
                  <span>Government ID Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0baa70] shrink-0 stroke-[2.2]" />
                  <span>Zero Spam Guarantee</span>
                </div>
              </div>
            </div>

            {/* Right Column - Traditional Indian Wedding Couple Image */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end items-center relative mt-3 lg:mt-0">
              <div className="relative z-10 w-full flex items-center justify-center lg:justify-end">
                <img
                  src="/images/hero-couple-wedding.png"
                  alt="Wonderful Jodi Traditional Indian Wedding Couple"
                  className="w-full h-auto max-w-[380px] sm:max-w-[460px] md:max-w-[500px] lg:max-w-[580px] xl:max-w-[620px] object-contain select-none"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Dedicated Search Panel (Responsive 1280px Container) ── */}
      <section className="pt-1 pb-3 sm:pt-1.5 sm:pb-4 lg:pt-1 lg:pb-5 bg-[#FAF8F5] relative z-20">
        <div className="max-w-[1280px] px-4 sm:px-6 lg:px-8 mx-auto">
          <HeroSearchBar />
        </div>
      </section>

      {/* ── Section 3: Featured Verified Matches (Dynamic) ── */}
      <FeaturedProfilesSection />

      {/* ── Section 4: Why Choose Wonderful Jodi (Balanced 58%/42% Layout) ── */}
      <section className="py-8 sm:py-11 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] overflow-hidden relative">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
            {/* Left Column - Header + 4 Balanced Feature Cards (~58% width) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1.5 text-left">
                <h2 className="font-serif text-[22px] sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-[1.2] tracking-tight">
                  Find Your Perfect Partner With <span className="text-[#E51F3E]">Confidence</span>
                </h2>
                <p className="text-slate-600 text-[13px] sm:text-[14px] leading-relaxed max-w-xl">
                  A private, secure, and dedicated matrimonial platform designed for educated professionals and esteemed families.
                </p>
              </div>

              {/* 4 Feature Cards (2 columns on mobile >=360px) */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-3.5 pt-0.5">
                {confidenceFeatures.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.step}
                      tabIndex={0}
                      className="relative flex flex-col justify-between rounded-xl sm:rounded-2xl bg-white p-3.5 sm:p-4 border border-[rgba(180,160,150,0.22)] shadow-2xs hover:border-rose-300 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 ease-out group text-left cursor-default focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20"
                    >
                      <div>
                        {/* Step & Category Header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 text-[#E51F3E] group-hover:bg-[#E51F3E] group-hover:text-white group-hover:border-transparent flex items-center justify-center transition-all duration-300 shrink-0 shadow-2xs">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D99A28]">
                              {item.category}
                            </span>
                          </div>
                          <span className="rounded-full px-2 py-0.5 text-[9.5px] font-extrabold tracking-wider text-rose-500 bg-rose-50 border border-rose-100 group-hover:bg-[#E51F3E] group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-2xs">
                            {item.step}
                          </span>
                        </div>

                        {/* Feature Title */}
                        <h3 className="font-serif text-[15px] sm:text-[16px] font-bold text-slate-900 tracking-tight mb-1 group-hover:text-[#E51F3E] transition-colors duration-200">
                          {item.title}
                        </h3>

                        {/* Feature Description */}
                        <p className="text-slate-600 text-[12px] sm:text-[12.5px] leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Subtle Bottom Accent Line */}
                      <div className="pt-2.5">
                        <div className="h-0.5 w-5 bg-rose-100 rounded-full group-hover:w-9 group-hover:bg-[#E51F3E] transition-all duration-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Natural Couple Portrait (~42% width) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end items-center relative mt-3 lg:mt-0">
              {/* Soft Ambient Halo Glow */}
              <div
                className="absolute inset-0 max-w-[300px] h-[300px] rounded-full pointer-events-none self-center mx-auto"
                style={{
                  background: 'radial-gradient(circle, rgba(254, 215, 215, 0.45) 0%, rgba(254, 240, 220, 0.25) 50%, transparent 70%)',
                  filter: 'blur(45px)',
                }}
              />

              <div className="relative z-10 w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[400px] flex items-center justify-center">
                <img
                  src="/images/a_high_resolution_studio_like_portrait_couple_photo.png"
                  alt="Wonderful Jodi Verified Couple"
                  className="w-full h-auto max-h-[260px] sm:max-h-[360px] lg:max-h-[440px] object-contain drop-shadow-[0_8px_20px_rgba(180,83,9,0.1)] transition-transform duration-500 hover:scale-[1.01]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Simple 3-Step Journey (How It Works) ─ */}
      <WeddingSearch />

      {/* ── Section 6: Real Wedding Success Stories ────── */}
      <Testimonials />

      {/* ── Section 6.5: Kundali & Astrology Matchmaking ── */}
      <section className="py-8 sm:py-11 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-100/70 border border-rose-200/80 text-[11px] font-bold text-[#E51F3E]">
              <Sparkles className="w-3 h-3 text-[#E51F3E]" />
              <span>Vedic Compatibility Insights</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Kundali & Astrology <span className="text-[#E51F3E]">Matchmaking</span>
            </h2>
            <p className="text-[13px] sm:text-[14px] text-slate-600 max-w-xl mx-auto leading-relaxed">
              Compare birth details, explore traditional 36-Guna Milan, review Manglik considerations, and understand compatibility before taking the next step.
            </p>
          </div>

          {/* 4 Kundali Cards: Equal height, subtle accents as requested */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
            {/* Card 1: Free Kundali Match (Warm Gold Accent) */}
            <Link
              href="/kundali-match"
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-200/40 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-0.5 text-left h-full"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#D99A28] border border-amber-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Compass className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-serif text-[15.5px] sm:text-[16px] font-bold text-slate-900 leading-snug group-hover:text-[#D99A28] transition-colors">
                  Free Kundali Match
                </h3>
                <p className="text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed">
                  Compare two profiles using the traditional Ashtakoota 36 Guna Milan framework with instant results.
                </p>
              </div>
              <div className="pt-3 border-t border-amber-100/60 mt-3 flex items-center justify-between text-[12px] font-bold text-[#D99A28]">
                <span>Instant 36 Guna Milan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 2: Manglik Analysis (Red Accent) */}
            <Link
              href="/kundali-match"
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-rose-200/40 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-0.5 text-left h-full"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E51F3E] border border-rose-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scale className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-serif text-[15.5px] sm:text-[16px] font-bold text-slate-900 leading-snug group-hover:text-[#E51F3E] transition-colors">
                  Manglik Analysis
                </h3>
                <p className="text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed">
                  Review Mangal Dosha considerations and planetary alignments for both prospective partners.
                </p>
              </div>
              <div className="pt-3 border-t border-rose-100/60 mt-3 flex items-center justify-between text-[12px] font-bold text-[#E51F3E]">
                <span>Dosha Analysis</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 3: Detailed Compatibility Report (Blue Accent) */}
            <Link
              href="/kundali-match"
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-200/40 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-0.5 text-left h-full"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-serif text-[15.5px] sm:text-[16px] font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                  Detailed Compatibility Report
                </h3>
                <p className="text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed">
                  Get a comprehensive compatibility report covering Guna Milan, planetary positions, and remedies.
                </p>
              </div>
              <div className="pt-3 border-t border-blue-100/60 mt-3 flex items-center justify-between text-[12px] font-bold text-blue-600">
                <span>Full Horoscope Report</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 4: Privacy Protected (Green Accent) */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-emerald-200/40 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group text-left h-full">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-serif text-[15.5px] sm:text-[16px] font-bold text-slate-900 leading-snug">
                  Privacy Protected
                </h3>
                <p className="text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed">
                  Birth details and horoscope calculations remain 100% confidential under your personal privacy controls.
                </p>
              </div>
              <div className="pt-3 border-t border-emerald-100/60 mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>100% Confidential & Secure</span>
              </div>
            </div>
          </div>

          {/* Primary & Secondary Kundali Actions (Always accessible to guests) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3.5 mt-6">
            <Link
              href="/kundali-match"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 h-[46px] rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] text-white text-[13.5px] sm:text-sm font-bold shadow-sm shadow-red-600/25 hover:shadow-md hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <span>Get Free Kundali Match</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/kundali-match"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 h-[46px] rounded-full bg-[#0F172A] hover:bg-slate-800 text-white text-[13.5px] sm:text-sm font-bold shadow-2xs hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <span>Check Compatibility</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 7: Call to Action ───────── */}
      <section className="relative py-8 sm:py-10 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#FAF8F5]">
        <div className="max-w-[1280px] mx-auto">
          <div className="mx-auto max-w-2xl text-center space-y-3.5 relative z-10 bg-white rounded-2xl border border-[rgba(180,160,150,0.22)] p-6 sm:p-8 shadow-2xs">
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-[1.2] max-w-xl mx-auto">
              Ready to Begin Your Journey to <span className="text-[#E51F3E]">Lifelong Happiness?</span>
            </h2>

            <p className="text-slate-600 text-[13px] sm:text-[14px] max-w-lg mx-auto leading-relaxed">
              Create your verified matrimonial profile today and explore thousands of compatible brides and grooms looking for meaningful marriage.
            </p>

            <div className="pt-2 flex justify-center">
              <Link
                href="/register"
                className="w-full max-w-[280px] sm:max-w-none sm:w-auto min-w-[240px] sm:min-w-[260px] inline-flex items-center justify-center gap-2 h-[48px] sm:h-[50px] px-8 sm:px-10 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] text-white text-[14px] sm:text-[15px] font-bold shadow-sm shadow-red-600/25 hover:shadow-md hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none"
              >
                <span>Create Free Profile</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 8: Key Statistics (Interactive Viewport Count-up Animation) ───────── */}
      <section className="bg-[#FAF8F5] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
          {statsData.map(({ target, suffix, decimals, label, icon: Icon, iconBg, iconColor, numColor }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center text-center p-3.5 sm:p-4.5 rounded-xl sm:rounded-2xl bg-white border border-[rgba(180,160,150,0.22)] shadow-2xs hover:shadow-xs transition-all duration-200 min-h-[130px] sm:min-h-[140px] h-full"
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-2 transition-transform duration-300 hover:scale-105 shadow-2xs`}
              >
                <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <h4
                className={`font-serif text-xl sm:text-2xl lg:text-[26px] font-extrabold leading-none mb-1 ${numColor}`}
              >
                <AnimatedStatCounter
                  value={target}
                  suffix={suffix}
                  decimals={decimals}
                />
              </h4>
              <p className="text-[12px] sm:text-[12.5px] font-semibold text-slate-600 leading-tight">
                {label}
              </p>
=======
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── Hero Section ───────────────────────────── */}
      <section className="relative bg-gradient-to-br from-rose-50 via-white to-amber-50/30 pt-14 pb-24 px-6 overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-red-200/20 blur-3xl animate-orb-pulse pointer-events-none" />
        <div className="absolute top-10 -right-28 w-80 h-80 rounded-full bg-rose-300/15 blur-3xl animate-orb-pulse delay-300 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 rounded-full bg-amber-200/10 blur-3xl animate-orb-pulse delay-500 pointer-events-none" />

        <div className="mx-auto max-w-7xl lg:flex lg:items-center lg:gap-16 relative z-10">
          {/* Left Content */}
          <div className="max-w-2xl lg:w-1/2 space-y-7 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100/80 border border-red-200 px-4 py-1.5 text-xs font-bold text-red-700 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 fill-red-600 text-red-600" />
              #1 Trusted Matrimony Platform for Professionals
            </span>

            <h1 className="font-serif-wedding text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.12]">
              Find Your{' '}
              <span className="text-gradient-crimson">Perfect Partner</span>{' '}
              <br className="hidden sm:block" />
              With Complete Trust
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-slate-600 font-normal max-w-xl">
              Join thousands of educated professionals discovering compatible life partners through verified profiles, smart filters, and complete privacy control.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-1 animate-fade-in-up delay-200">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:from-red-700 hover:to-rose-700 transition transform active:scale-95 btn-press"
              >
                Create Free Profile
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 backdrop-blur-sm px-8 py-4 text-base font-semibold text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 transition btn-press"
              >
                Browse Profiles
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/80 animate-fade-in-up delay-300">
              {stats.map(({ value, label, color }) => (
                <div key={label}>
                  <h4 className={`font-serif-wedding text-2xl font-bold ${color}`}>{value}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Search Card */}
          <div className="mt-14 lg:mt-0 lg:w-1/2 animate-fade-in-up delay-200">
            <div className="rounded-3xl bg-white/90 backdrop-blur-sm p-8 shadow-2xl border border-rose-100/80 relative">
              {/* Top glint */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-200 to-transparent rounded-t-3xl" />

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 animate-heartbeat">
                  <Heart className="w-5 h-5 fill-red-600 stroke-none" />
                </div>
                <div>
                  <h2 className="font-serif-wedding text-xl font-bold text-slate-900">Quick Match Search</h2>
                  <p className="text-xs text-slate-500">Filter profiles based on your requirements</p>
                </div>
              </div>

              <SearchForm />

              {/* Trust Micro-badges below form */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Only
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <Lock className="w-3.5 h-3.5" /> Privacy Protected
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 stroke-none" /> 98% Success Rate
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wedding Search Feature Section ──────────── */}
      <WeddingSearch />

      {/* ── Featured Verified Profiles ──────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-white via-slate-50/50 to-white border-t border-b border-slate-100">
        <div className="mx-auto max-w-7xl space-y-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.25em] font-bold text-red-600 bg-red-50/60 px-4 py-1.5 rounded-full inline-block border border-red-200/50">
                ✦ Featured Profiles
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
                Discover <span className="text-gradient-crimson">Verified Life Partners</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
                Explore verified profiles of educated professionals seeking meaningful connections. All members are manually screened and verified.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 font-semibold text-red-600 hover:text-red-700 transition text-sm whitespace-nowrap"
            >
              Explore All Profiles
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mockProfiles.map((profile) => (
              <ProfileCard key={profile._id} profile={profile} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Wonderful Jodi ────────────────── */}
      <section className="py-20 px-6 bg-slate-900 text-white relative overflow-hidden">
        {/* Background decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 pointer-events-none" />

        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-red-400 bg-red-950/80 px-4 py-1.5 rounded-full border border-red-800/50 inline-block">
              Why Choose Us
            </span>
            <h2 className="font-serif-wedding text-3xl sm:text-4xl font-bold leading-tight">
              Designed For Serious{' '}
              <span className="text-gradient-crimson">Marriage Seeking</span>{' '}
              Families
            </h2>
            <p className="text-slate-300 text-base leading-relaxed">
              Unlike generic dating apps, Wonderful Jodi is dedicated strictly to matrimony. We empower individuals and parents with verified data, background security, and seamless tools.
            </p>

            <div className="space-y-4 pt-2">
              {[
                'Strict manual photo & government ID verification',
                'Advanced preference filters including Education, Profession & Family Values',
                'Protected phone numbers and photo privacy locks',
                'Dedicated Matchmaker support for Premium members',
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition btn-press"
              >
                Learn More About Our Mission
              </Link>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-6">
            {whyChooseFeatures.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="bg-slate-800/80 border border-slate-700/70 p-6 rounded-3xl space-y-3 hover:border-slate-500 transition card-lift"
              >
                <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-serif-wedding text-lg font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real Success Stories ─────────────────────── */}
      <Testimonials />

      {/* ── Social Proof Stats Banner ────────────────── */}
      <section className="py-12 px-6 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '1,00,000+', label: 'Registered Members' },
            { num: '50,000+',   label: 'Successful Matches' },
            { num: '500+',      label: 'Cities Covered' },
            { num: '24/7',      label: 'Customer Support' },
          ].map(({ num, label }) => (
            <div key={label} className="space-y-1">
              <p className="font-serif-wedding text-3xl font-extrabold text-gradient-crimson">{num}</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
            </div>
          ))}
        </div>
      </section>
<<<<<<< HEAD
    </main>
  );
}
=======

      {/* ── Membership CTA Banner ───────────────────── */}
      <section className="py-16 px-6 bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.04%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")',
          }}
        />

        <div className="mx-auto max-w-4xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-rose-100 mb-2">
            <Heart className="w-3.5 h-3.5 fill-rose-200" />
            Your perfect match is waiting
          </div>

          <h2 className="font-serif-wedding text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready To Begin Your Search For Happiness?
          </h2>
          <p className="text-rose-100 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Create your free account today and discover thousands of verified brides and grooms looking for a life partner.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-red-700 shadow-xl hover:bg-rose-50 transition btn-press"
            >
              Get Started For Free
              <ArrowRight className="w-5 h-5 text-red-700" />
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition btn-press"
            >
              View Membership Plans
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
