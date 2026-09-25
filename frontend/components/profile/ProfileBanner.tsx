'use client';

import React from 'react';
import { Crown, Sparkles, Shield, Heart } from 'lucide-react';

interface ProfileBannerProps {
  profileId: string;
  isMembershipExpired: boolean;
  isPremiumActive: boolean;
  planName?: string;
  className?: string;
}

export function ProfileBanner({
  profileId,
  isMembershipExpired,
  isPremiumActive,
  planName = 'Free',
  className = '',
}: ProfileBannerProps) {
  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden shadow-sm border border-rose-900/30 min-h-[165px] sm:min-h-[195px] md:min-h-[210px] bg-gradient-to-br from-[#38020A] via-[#5C091A] to-[#8A0F26] p-5 sm:p-7 md:p-8 flex flex-col justify-between select-none ${className}`}
    >
      {/* ── Layer 1: Ambient Glow Orbs (Soft Gold & Pink Accents) ── */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-rose-400/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-48 h-48 rounded-full bg-pink-500/5 blur-2xl pointer-events-none" />

      {/* ── Layer 2: Decorative Subtle Matrimonial & Medical Flourishes ── */}
      {/* Delicate Watermark: Entwined Double Hearts & Stethoscope (Right side watermark) */}
      <div className="absolute right-3 sm:right-8 md:right-14 bottom-1 sm:bottom-2 opacity-[0.09] pointer-events-none text-white">
        <svg
          width="210"
          height="160"
          viewBox="0 0 210 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Double hearts */}
          <path
            d="M50 40 C35 15, 0 25, 10 65 C20 95, 65 125, 75 135 C85 125, 130 95, 140 65 C150 25, 115 15, 100 40 Z"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M90 35 C80 15, 50 22, 58 55 C65 80, 105 105, 112 112 C120 105, 158 80, 165 55 C173 22, 142 15, 132 35 Z"
            stroke="#FDE047"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Stethoscope loop */}
          <path
            d="M130 115 C130 140, 165 140, 175 115 L175 60 C175 45, 195 45, 195 60"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="195" cy="65" r="7" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>

      {/* ECG Heartbeat Line running subtly along the lower half of the banner */}
      <div className="absolute bottom-4 left-0 right-0 h-10 pointer-events-none opacity-25 overflow-hidden">
        <svg
          viewBox="0 0 1200 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full preserve-3d"
        >
          <path
            d="M0 30 L220 30 L235 30 L245 12 L255 48 L265 8 L275 52 L285 24 L295 36 L305 30 L550 30 L565 30 L575 12 L585 48 L595 8 L605 52 L615 24 L625 36 L635 30 L880 30 L895 30 L905 12 L915 48 L925 8 L935 52 L945 24 L955 36 L965 30 L1200 30"
            stroke="url(#ecg-gradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="ecg-gradient" x1="0" y1="30" x2="1200" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F472B6" stopOpacity="0.1" />
              <stop offset="25%" stopColor="#FDE047" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#FB7185" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#FDE047" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#F472B6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Decorative luxury curving flourish */}
      <div className="absolute top-0 right-0 w-96 h-full opacity-10 pointer-events-none">
        <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path
            d="M400 0 C300 80, 200 20, 100 120 C50 170, 0 190, -50 200"
            stroke="#FDE047"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="320" cy="40" r="3" fill="#FDE047" />
          <circle cx="180" cy="70" r="2.5" fill="#FDE047" />
        </svg>
      </div>

      {/* ── Layer 3: Top Navigation / Badge Bar ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-md border border-white/15 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-bold text-amber-200 uppercase tracking-widest">
            Wonderful Jodi
          </span>
          <span className="text-white/40 text-xs">•</span>
          <span className="text-[10px] font-extrabold text-white/90 tracking-wider">
            DOCTOR MATRIMONY
          </span>
        </div>

        {/* Profile ID and Membership Plan Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Profile ID Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-2xs">
            <span className="text-white/60 font-medium">Profile ID:</span>
            <span className="font-mono text-amber-200 tracking-wider">{profileId}</span>
          </div>

          {/* Membership Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border ${
              isMembershipExpired
                ? 'bg-rose-950/80 border-rose-400/40 text-rose-200'
                : isPremiumActive
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 border-amber-300 text-amber-950 font-extrabold'
                : 'bg-white/15 backdrop-blur-md border-white/25 text-white'
            }`}
          >
            {isPremiumActive && <Crown className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />}
            <span>
              {isMembershipExpired
                ? 'MEMBERSHIP EXPIRED'
                : isPremiumActive
                ? `${planName.toUpperCase()} MEMBER`
                : 'FREE MEMBER'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Layer 4: Elegant Banner Center / Bottom Title & Tagline ── */}
      <div className="relative z-10 pt-4 sm:pt-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Dedicated Healthcare Professional Matrimony</span>
          </div>

          <p className="font-serif italic text-sm sm:text-base text-rose-100/90 font-medium">
            &ldquo;Where Compassion Meets Compatibility &mdash; Trusted Connections for Doctors&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
