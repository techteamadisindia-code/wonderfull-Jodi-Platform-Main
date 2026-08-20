'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HeroSearchBar } from '../components/HeroSearchBar';
import { ProfileCard } from '../components/ProfileCard';
import { WeddingSearch } from '../components/WeddingSearch';
import { Testimonials } from '../components/Testimonials';
import {
  ShieldCheck,
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
} from 'lucide-react';

const featuredProfiles = [
  {
    _id: 'p1',
    displayName: 'Priya Sharma',
    gender: 'Female',
    dob: '1998-05-14',
    city: 'Mumbai',
    education: 'M.Tech in CS (IIT Bombay)',
    profession: 'Senior Software Engineer',
    primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
  },
  {
    _id: 'p2',
    displayName: 'Rohan Mehta',
    gender: 'Male',
    dob: '1994-11-20',
    city: 'Bengaluru',
    education: 'MBA (IIM Ahmedabad)',
    profession: 'Product Director',
    primaryPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
  },
  {
    _id: 'p3',
    displayName: 'Dr. Ananya Verma',
    gender: 'Female',
    dob: '1996-08-03',
    city: 'Delhi NCR',
    education: 'MBBS, MD Cardiology (AIIMS)',
    profession: 'Consultant Cardiologist',
    primaryPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
  },
  {
    _id: 'p4',
    displayName: 'Vikramaditya Singh',
    gender: 'Male',
    dob: '1992-03-17',
    city: 'Jaipur',
    education: 'B.Arch (SPA Delhi)',
    profession: 'Principal Architect & Founder',
    primaryPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
  },
];

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
    value: '100,000+',
    label: 'Verified Member Profiles',
    icon: Users,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    numColor: 'text-emerald-600',
  },
  {
    value: '98.6%',
    label: 'Match Satisfaction Rate',
    icon: Star,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    numColor: 'text-amber-500',
  },
  {
    value: '50,000+',
    label: 'Happy Indian Marriages',
    icon: Heart,
    iconBg: 'bg-rose-50',
    iconColor: 'text-red-600',
    numColor: 'text-red-600',
  },
  {
    value: '100%',
    label: 'Privacy & Security Guard',
    icon: Lock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    numColor: 'text-blue-600',
  },
];

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <main className="min-h-screen bg-[#FFFDFB] text-[#0f172a]">
      {/* ── Section 1: Hero Section (Desktop ~680–720px Target) ── */}
      <section
        className="relative pt-8 sm:pt-10 lg:pt-12 pb-10 sm:pb-12 lg:pb-14 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8F3 35%, #FFF2EB 70%, #FEEFE6 100%)',
        }}
      >
        {/* Soft Warm Ambient Halo Glow Behind Couple */}
        <div
          className="absolute top-1/2 right-[8%] -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(254, 215, 215, 0.6) 0%, rgba(254, 235, 220, 0.3) 50%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Elegant Sweeping Wavy Ribbon Lines in Background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          viewBox="0 0 1600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M 200 480 C 550 430, 850 620, 1150 450 C 1350 330, 1500 370, 1600 340"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 150 510 C 500 460, 880 650, 1200 420 C 1380 300, 1520 330, 1600 310"
            stroke="rgba(248, 205, 175, 0.55)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 100 540 C 480 490, 920 680, 1250 400 C 1420 270, 1540 300, 1600 280"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Floating Petals and Subtle Hearts */}
        <div className="absolute pointer-events-none select-none" style={{ top: '18%', left: '35%' }}>
          <svg width="18" height="24" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.4 }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#F87171" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ top: '32%', right: '3%' }}>
          <svg width="14" height="18" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.35, animationDelay: '1.2s' }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#FB7185" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ bottom: '16%', right: '4%' }}>
          <svg width="16" height="20" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.3, animationDelay: '2.4s' }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#F87171" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ bottom: '18%', left: '50%' }}>
          <Heart className="w-3.5 h-3.5 fill-[#FDA4AF] text-[#FDA4AF] opacity-35 animate-float" style={{ animationDelay: '3s' }} />
        </div>

        {/* 1440px Centered Container */}
        <div className="max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center min-h-[580px] lg:min-h-[640px]">
            {/* Left Column - Hero Content (~55% on desktop) */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-6 animate-fade-in-up text-left flex flex-col items-start pr-0 lg:pr-4 max-w-[680px]">
              {/* Trust Badge Pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FCECEE] border border-[#F8CCD2] px-4.5 py-2 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[#e11d48] shrink-0" />
                <span className="text-[12.5px] sm:text-[13px] font-semibold text-[#e11d48] tracking-tight">
                  #1 Trusted Matrimony Platform for Professionals
                </span>
              </div>

              {/* Main Heading: Playfair Display 72px–80px desktop, line-height 0.95 */}
              <h1 className="font-serif text-[42px] sm:text-[54px] md:text-[64px] lg:text-[74px] xl:text-[80px] font-bold tracking-tight leading-[0.95]">
                <span className="text-[#0f172a] block">Find your</span>
                <span className="text-[#e11d48] block relative mt-1">
                  <span>perfect Jodi</span>
                  <span className="inline-flex items-center ml-2.5 sm:ml-3 -translate-y-2 sm:-translate-y-2.5">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 fill-[#e11d48] text-[#e11d48]" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </span>
                </span>
              </h1>

              {/* Description */}
              <p className="text-[17px] sm:text-[18px] leading-[1.6] text-[#475569] font-normal max-w-[680px]">
                Join over 100,000+ verified educated professionals and esteemed families discovering meaningful, lifelong relationships with complete privacy and trust.
              </p>

              {/* Primary & Secondary Buttons: Height 58px, Gap 16px */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1 w-full sm:w-auto">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#e11d48] hover:bg-[#ce102f] h-[58px] w-full sm:w-[270px] text-[16px] font-bold text-white shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <UserPlus className="w-5 h-5 shrink-0" />
                  <span>Create Free Profile</span>
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#e2e8f0] bg-white h-[58px] w-full sm:w-[320px] text-[16px] font-bold text-[#0f172a] shadow-2xs hover:border-[#e11d48] hover:text-[#e11d48] hover:bg-rose-50/40 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <Search className="w-5 h-5 text-[#0f172a] group-hover:text-[#e11d48] shrink-0 transition-colors" />
                  <span>Browse Verified Matches</span>
                </Link>
              </div>

              {/* Trust Indicators: Gap 32px */}
              <div className="pt-2 flex flex-wrap items-center gap-6 sm:gap-8 text-[14.5px] sm:text-[15.5px] font-semibold text-[#334155]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0baa70] shrink-0 stroke-[2.2]" />
                  <span>100% Free Registration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0baa70] shrink-0 stroke-[2.2]" />
                  <span>Government ID Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#0baa70] shrink-0 stroke-[2.2]" />
                  <span>Zero Spam Guarantee</span>
                </div>
              </div>
            </div>

            {/* Right Column - Natural Couple Image (~45% on desktop) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end items-center relative mt-4 lg:mt-0">
              <div className="relative z-10 w-full max-w-[480px] sm:max-w-[510px] lg:max-w-[530px] flex items-center justify-center">
                <img
                  src="/images/hero-couple-wedding.png"
                  alt="Wonderful Jodi Verified Wedding Couple"
                  className="relative z-10 w-full max-h-[520px] sm:max-h-[580px] lg:max-h-[620px] object-contain drop-shadow-[0_16px_32px_rgba(180,83,9,0.12)] transition-transform duration-500 hover:scale-[1.01]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Soft Organic Layered Wave Curve at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-6 sm:h-8 pointer-events-none overflow-hidden z-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 32"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,12 C360,28 720,4 1080,20 C1260,28 1380,16 1440,12 L1440,32 L0,32 Z"
              fill="rgba(255, 245, 238, 0.7)"
            />
            <path
              d="M0,18 C400,30 800,10 1200,24 C1350,28 1400,20 1440,18 L1440,32 L0,32 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      {/* ── Section 2: Dedicated Search Panel (1440px Container Exact Alignment) ── */}
      <section className="py-6 sm:py-7 lg:py-8 bg-white border-b border-rose-100/50 relative z-20">
        <div className="max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto">
          <HeroSearchBar />
        </div>
      </section>

      {/* ── Section 3: Featured Verified Matches (~650px Target) ── */}
      <section className="py-12 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 bg-[#FFFDFB]">
        <div className="max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto">
          {/* Header Block with Tight Intentional Spacing */}
          <div className="flex flex-col items-center text-center mb-8 sm:mb-10 space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#E51F3E] bg-[#FCECEE] border border-[#F8CCD2] px-3.5 py-1 rounded-full inline-block shadow-2xs">
              Curated Profiles
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Featured Verified <span className="text-[#E51F3E]">Matches</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Discover recently joined and 100% verified brides and grooms seeking sincere life connections.
            </p>
            <div className="pt-1">
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#E51F3E] hover:text-[#C9132F] transition"
              >
                <span>View All 100K+ Profiles</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 4 Profile Cards Grid */}
          <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProfiles.map((profile) => (
              <ProfileCard key={profile._id} profile={profile as any} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Why Choose Wonderful Jodi (~650–720px Target) ── */}
      <section className="py-12 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 bg-[#FFF9F6] border-t border-b border-rose-100/60 overflow-hidden relative">
        <div className="max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            {/* Left Column - 4 Compact Interactive Cards (~58% width) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1.5 text-left">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] font-extrabold text-[#E51F3E] bg-[#FCECEE] border border-[#F8CCD2] px-3.5 py-0.5 rounded-full shadow-2xs">
                  Why Choose Wonderful Jodi
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-[2.2rem] font-bold text-slate-900 leading-[1.2] tracking-tight">
                  Find Your Perfect Partner With <span className="text-[#E51F3E]">Confidence</span>
                </h2>
                <p className="text-slate-600 text-xs sm:text-[13.5px] leading-relaxed max-w-xl">
                  A private, secure, and dedicated matrimonial platform designed for educated professionals and esteemed families.
                </p>
              </div>

              {/* 4 Compact Interactive Cards (2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {confidenceFeatures.map((item, idx) => {
                  const isActive = activeFeature === idx;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.step}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveFeature(idx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveFeature(idx);
                        }
                      }}
                      className={`relative rounded-xl bg-white px-4 py-3.5 transition-all duration-300 cursor-pointer text-left group border ${
                        isActive
                          ? 'border-rose-300 shadow-md shadow-rose-600/10 -translate-y-0.5 ring-2 ring-[#E51F3E]/20'
                          : 'border-rose-100/80 shadow-2xs hover:border-rose-200 hover:shadow-xs hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Step & Category in header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 ${
                              isActive
                                ? 'bg-gradient-to-tr from-[#E51F3E] to-[#CE102F] text-white shadow-xs'
                                : 'bg-rose-50 text-[#E51F3E] border border-rose-100 group-hover:bg-rose-100/70'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#D99A28]">
                            {item.category}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-2xs transition-all duration-300 ${
                            isActive ? 'bg-[#E51F3E]' : 'bg-rose-400 group-hover:bg-[#E51F3E]'
                          }`}
                        >
                          {item.step}
                        </span>
                      </div>

                      {/* Feature Title */}
                      <h3 className="font-serif text-[15px] font-bold text-slate-900 tracking-tight mb-1">
                        {item.title}
                      </h3>

                      {/* Feature Description */}
                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      {/* Subtle Accent Line */}
                      <div className="pt-2">
                        <div
                          className={`h-0.5 rounded-full transition-all duration-300 ${
                            isActive
                              ? 'w-10 bg-[#E51F3E]'
                              : 'w-6 bg-rose-100 group-hover:w-8 group-hover:bg-rose-300'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Natural Floating Cutout Couple (~42% width) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end items-center relative mt-4 lg:mt-0">
              <div
                className="absolute inset-0 max-w-[380px] h-[380px] rounded-full pointer-events-none self-center mx-auto"
                style={{
                  background: 'radial-gradient(circle, rgba(254, 215, 215, 0.4) 0%, rgba(254, 240, 220, 0.2) 50%, transparent 70%)',
                  filter: 'blur(45px)',
                }}
              />

              <div className="relative z-10 w-full max-w-[440px] flex items-center justify-center">
                <img
                  src="/images/a_high_resolution_studio_like_portrait_couple_photo.png"
                  alt="Wonderful Jodi Wedding Couple"
                  className="w-full max-h-[480px] lg:max-h-[510px] object-contain drop-shadow-[0_14px_28px_rgba(180,83,9,0.11)] transition-transform duration-500 hover:scale-[1.01]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Simple 3-Step Journey (How It Works ~650px) ─ */}
      <WeddingSearch />

      {/* ── Section 6: Real Wedding Success Stories (~700px) ────── */}
      <Testimonials />

      {/* ── Section 7: Call to Action (~400–450px Target) ───────── */}
      <section
        className="relative py-12 sm:py-14 px-4 sm:px-6 lg:px-8 overflow-hidden border-t border-rose-100/60"
        style={{
          background: 'linear-gradient(135deg, #FFF9F7 0%, #FFFFFF 50%, #FFF4F5 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl text-center space-y-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FFF0F2] border border-[#FFD2D9] text-[#E51F3E] text-xs font-bold uppercase tracking-wider shadow-2xs">
              <Heart className="w-3.5 h-3.5 fill-[#E51F3E]" />
              Your Special Someone Is Waiting
            </span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.2] max-w-2xl mx-auto">
            Ready to Begin Your Journey to <span className="text-[#E51F3E]">Lifelong Happiness?</span>
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Create your free verified matrimonial profile today and explore thousands of compatible brides and grooms looking for meaningful marriage.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-[48px] px-8 rounded-full bg-gradient-to-r from-[#E51F3E] to-[#CE102F] text-white text-sm font-bold shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>Create Free Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/membership"
              className="w-full sm:w-auto inline-flex items-center justify-center h-[48px] px-7 rounded-full bg-white text-slate-800 border border-slate-300 hover:border-[#E51F3E] hover:text-[#E51F3E] hover:bg-rose-50/40 text-sm font-bold shadow-2xs hover:-translate-y-0.5 transition-all duration-200"
            >
              View Membership Plans
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 8: Key Statistics (~260–300px Target) ───────── */}
      <section className="bg-white border-t border-rose-100/60 py-10 sm:py-11 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statsData.map(({ value, label, icon: Icon, iconBg, iconColor, numColor }) => (
            <div key={label} className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-slate-50/50 border border-slate-100">
              <div className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-2.5 transition-transform duration-300 hover:scale-105 shadow-2xs`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
              <h4 className={`font-serif text-2xl sm:text-3xl font-extrabold leading-none mb-1.5 ${numColor}`}>
                {value}
              </h4>
              <p className="text-xs font-semibold text-slate-600">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
