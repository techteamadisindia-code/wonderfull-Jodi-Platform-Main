'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchForm } from '../components/SearchForm';
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
    <main className="min-h-screen bg-[#fffdfb] text-[#172033]">
      {/* ── Section 1: Hero Section (Same 2 Same Reference Design) ── */}
      <section
        className="relative pt-6 sm:pt-8 lg:pt-10 pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-8 lg:px-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF7F0 35%, #FFF0E6 70%, #FEECE2 100%)',
        }}
      >
        {/* Soft Warm Ambient Halo Glow Behind Couple & Center */}
        <div
          className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[650px] h-[650px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255, 225, 210, 0.65) 0%, rgba(255, 235, 220, 0.35) 45%, transparent 70%)',
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
          <path
            d="M 50 570 C 450 520, 960 700, 1300 380 C 1450 250, 1560 270, 1600 250"
            stroke="rgba(248, 205, 175, 0.4)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>

        {/* Glowing Bokeh Orbs */}
        <div
          className="absolute bottom-8 left-[48%] w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,245,235,0.4) 50%, transparent 70%)', filter: 'blur(24px)' }}
        />
        <div
          className="absolute bottom-4 right-[22%] w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,230,200,0.5) 0%, transparent 70%)', filter: 'blur(35px)' }}
        />

        {/* Scattered Floating Petals and Tiny Hearts */}
        <div className="absolute pointer-events-none select-none" style={{ top: '19%', left: '35%' }}>
          <svg width="18" height="24" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.45 }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#F87171" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ top: '33%', right: '2%' }}>
          <svg width="14" height="18" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.35, animationDelay: '1.2s' }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#FB7185" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ bottom: '14%', right: '3%' }}>
          <svg width="16" height="20" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.3, animationDelay: '2.4s' }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#F87171" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ top: '63%', right: '40%' }}>
          <svg width="12" height="16" viewBox="0 0 28 34" className="animate-float" style={{ opacity: 0.35, animationDelay: '0.8s' }}>
            <path d="M14 0C17 9 28 14 28 23C28 28.5 21.7 34 14 34C6.3 34 0 28.5 0 23C0 14 11 9 14 0Z" fill="#FDA4AF" />
          </svg>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ bottom: '16%', left: '52%' }}>
          <Heart className="w-3.5 h-3.5 fill-[#FDA4AF] text-[#FDA4AF] opacity-40 animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="mx-auto max-w-[1520px] relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center min-h-[540px] lg:min-h-[580px]">
            {/* Left Column - Hero Content */}
            <div className="lg:col-span-7 space-y-5 lg:space-y-6 animate-fade-in-up text-left flex flex-col items-start pr-0 lg:pr-4">
              {/* Trust Badge Pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FCECEE] border border-[#F8CCD2] px-4 py-1.5 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#E51F3E] shrink-0" />
                <span className="text-xs sm:text-[13px] font-semibold text-[#E51F3E] tracking-tight">
                  #1 Trusted Matrimony Platform for Professionals
                </span>
              </div>

              {/* Main Heading: Proportionally balanced serif heading */}
              <h1 className="font-serif text-[42px] sm:text-[54px] md:text-[62px] lg:text-[70px] xl:text-[76px] font-bold tracking-tight leading-[1.03]">
                <span className="text-[#101828] block">Find your</span>
                <span className="text-[#E51F3E] block relative mt-0.5">
                  <span>perfect Jodi</span>
                  <span className="inline-flex items-center ml-2 -translate-y-2.5 sm:-translate-y-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 fill-[#E51F3E] text-[#E51F3E]" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </span>
                </span>
              </h1>

              {/* Professional Description */}
              <p className="text-sm sm:text-base lg:text-[17px] leading-relaxed text-[#475467] font-normal max-w-[560px]">
                Join over 100,000+ verified educated professionals and esteemed families discovering meaningful, lifelong relationships with complete privacy and trust.
              </p>

              {/* Primary CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3.5 pt-1 w-full sm:w-auto">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CE102F] h-[52px] sm:h-[54px] px-7 sm:px-8 text-[15px] font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <UserPlus className="w-4.5 h-4.5 shrink-0" />
                  <span>Create Free Profile</span>
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#D0D5DD] bg-white h-[52px] sm:h-[54px] px-7 sm:px-8 text-[15px] font-bold text-[#101828] shadow-xs hover:border-[#E51F3E] hover:text-[#E51F3E] hover:bg-rose-50/30 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <Search className="w-4 h-4 text-[#101828] group-hover:text-[#E51F3E] shrink-0 transition-colors" />
                  <span>Browse Verified Matches</span>
                </Link>
              </div>

              {/* Trust Indicators Below Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-5 sm:gap-6 text-xs sm:text-[13.5px] font-semibold text-[#344054]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0BAA70] shrink-0" />
                  <span>100% Free Registration</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0BAA70] shrink-0" />
                  <span>Government ID Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0BAA70] shrink-0" />
                  <span>Zero Spam Guarantee</span>
                </div>
              </div>
            </div>

            {/* Right Column - Natural Cutout Wedding Couple (Feet Fully Visible) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end items-center relative mt-4 lg:mt-0">
              <div className="relative z-10 w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[510px] flex items-center justify-center">
                <img
                  src="/images/wedding-couple-transparent.png"
                  alt="Wonderful Jodi Verified Wedding Couple"
                  className="relative z-10 w-full max-h-[500px] sm:max-h-[550px] lg:max-h-[600px] object-contain drop-shadow-[0_16px_30px_rgba(180,83,9,0.12)] transition-transform duration-500 hover:scale-[1.01]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Soft Organic Layered Wave Curve at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-10 pointer-events-none overflow-hidden z-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 40"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,15 C360,35 720,5 1080,25 C1260,35 1380,20 1440,15 L1440,40 L0,40 Z"
              fill="rgba(255, 245, 238, 0.7)"
            />
            <path
              d="M0,22 C400,38 800,12 1200,30 C1350,35 1400,25 1440,22 L1440,40 L0,40 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      {/* ── Section 2: Curated Profiles & Search Panel ── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          {/* Curated Profiles Badge */}
          <div className="flex justify-center mb-5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#E51F3E] bg-[#FCECEE] border border-[#F8CCD2] px-4 py-1.5 rounded-full inline-block shadow-2xs">
              Curated Profiles
            </span>
          </div>

          {/* Search Filter Panel */}
          <div className="mx-auto max-w-6xl mb-12 sm:mb-14">
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-900/4 border border-rose-100/90 p-4 sm:p-5 lg:p-6">
              <SearchForm layout="row" />
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="flex flex-col items-center text-center gap-4 mb-10">
            <div className="flex flex-col items-center space-y-2 max-w-[650px]">
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                Featured Verified <span className="text-[#E51F3E]">Matches</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Discover recently joined and 100% verified brides and grooms seeking sincere life connections.
              </p>
            </div>

            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#E51F3E] hover:text-[#C9132F] transition"
            >
              <span>View All 100K+ Profiles</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 4 Profile Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProfiles.map((profile) => (
              <ProfileCard key={profile._id} profile={profile as any} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Why Choose Wonderful Jodi (Compact 30-40% shorter cards) ── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FFF9F6] border-t border-b border-rose-100/60 overflow-hidden relative">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            {/* Left Column - 4 Compact Interactive Cards (30-40% shorter height) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2 text-left">
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

              {/* 4 Compact Interactive Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
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
                      className={`relative rounded-xl bg-white px-4 py-3.5 sm:px-4.5 sm:py-4 transition-all duration-300 cursor-pointer text-left group border ${
                        isActive
                          ? 'border-rose-300 shadow-md shadow-rose-600/10 -translate-y-0.5 ring-2 ring-[#E51F3E]/20'
                          : 'border-rose-100/80 shadow-2xs hover:border-rose-200 hover:shadow-xs hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Step & Category in header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0 ${
                              isActive
                                ? 'bg-gradient-to-tr from-[#E51F3E] to-[#CE102F] text-white shadow-xs'
                                : 'bg-rose-50 text-[#E51F3E] border border-rose-100 group-hover:bg-rose-100/70'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D99A28]">
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
                      <h3 className="font-serif text-[15.5px] font-bold text-slate-900 tracking-tight mb-1">
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

            {/* Right Column - Natural Floating Cutout Wedding Couple */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end items-center relative mt-4 lg:mt-0">
              {/* Soft ambient warm glow */}
              <div
                className="absolute inset-0 max-w-[420px] h-[420px] rounded-full pointer-events-none self-center mx-auto"
                style={{
                  background: 'radial-gradient(circle, rgba(254, 215, 215, 0.45) 0%, rgba(254, 240, 220, 0.25) 50%, transparent 70%)',
                  filter: 'blur(50px)',
                }}
              />

              {/* Natural cutout couple without square background */}
              <div className="relative z-10 w-full max-w-[460px] flex items-center justify-center">
                <img
                  src="/images/a_high_resolution_studio_like_portrait_couple_photo.png"
                  alt="Wonderful Jodi Wedding Couple"
                  className="w-full max-h-[500px] lg:max-h-[530px] object-contain drop-shadow-[0_16px_32px_rgba(180,83,9,0.12)] transition-transform duration-500 hover:scale-[1.01]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Simple 3-Step Journey (How It Works) ─────── */}
      <WeddingSearch />

      {/* ── Section 7: Real Wedding Success Stories (Testimonials) ── */}
      <Testimonials />

      {/* ── Section 8: Call to Action ────────────────────────────── */}
      <section
        className="relative py-14 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden border-t border-rose-100/60"
        style={{
          background: 'linear-gradient(135deg, #FFF9F7 0%, #FFFFFF 50%, #FFF4F5 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl text-center space-y-5 relative z-10">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF0F2] border border-[#FFD2D9] text-[#E51F3E] text-xs font-bold uppercase tracking-wider shadow-2xs">
              <Heart className="w-3.5 h-3.5 fill-[#E51F3E]" />
              Your Special Someone Is Waiting
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-[2.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.2] max-w-2xl mx-auto">
            Ready to Begin Your Journey to <span className="text-[#E51F3E]">Lifelong Happiness?</span>
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Create your free verified matrimonial profile today and explore thousands of compatible brides and grooms looking for meaningful marriage.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
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

      {/* ── Section 9: Matrimonial Key Statistics ─────────────────── */}
      <section className="bg-white border-t border-rose-100/60 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map(({ value, label, icon: Icon, iconBg, iconColor, numColor }) => (
            <div key={label} className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-50/40 border border-slate-100/80">
              <div className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-3 transition-transform duration-300 hover:scale-105 shadow-2xs`}>
                <Icon className="w-6 h-6" />
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
