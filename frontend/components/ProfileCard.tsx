'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProfileCard as ProfileCardType } from '../types/profile';
import { ShieldCheck, MapPin, Briefcase, GraduationCap, Heart, ArrowRight, Star, Crown } from 'lucide-react';
import { getAuthToken } from '../lib/api';

function getAge(dob: string) {
  if (!dob) return 28;
  const date = new Date(dob);
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export function ProfileCard({ profile }: { profile: ProfileCardType }) {
  const [shortlisted, setShortlisted] = useState(false);
  const age = getAge(profile.dob);

  // Default fallback avatars
  const defaultPhoto =
    profile.gender?.toLowerCase() === 'female'
      ? 'https://images.unsplash.com/photo-1594824813599-78cc738a9e01?auto=format&fit=crop&q=85&w=800'
      : 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=85&w=800';

  const photoUrl = profile.primaryPhoto || defaultPhoto;
  const isDoctor =
    profile.displayName?.toLowerCase().startsWith('dr') ||
    profile.degree?.toLowerCase().includes('mbbs') ||
    profile.degree?.toLowerCase().includes('md') ||
    profile.degree?.toLowerCase().includes('ms') ||
    profile.profession?.toLowerCase().includes('doctor') ||
    profile.profession?.toLowerCase().includes('consultant') ||
    profile.profession?.toLowerCase().includes('surgeon');

  const handleShortlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShortlisted(!shortlisted);
  };

  return (
    <article className="group bg-white rounded-2xl border border-rose-100/90 overflow-hidden shadow-xs hover:shadow-xl hover:shadow-slate-900/8 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full w-full">
      {/* ── Top Image Container ── */}
      <div className="relative w-full h-[280px] sm:h-[290px] overflow-hidden bg-slate-100">
        <img
          src={photoUrl}
          alt={profile.displayName}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Soft Transparent Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {/* Verification Badge */}
          {profile.verificationStatus === 'VERIFIED' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0BAA70] px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isDoctor ? 'Doctor Verified' : 'Verified'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-slate-200">
              Screened
            </span>
          )}

          {/* Heart Shortlist Button */}
          <button
            onClick={handleShortlistToggle}
            className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-200 shadow-xs ${
              shortlisted
                ? 'bg-[#E51F3E] text-white scale-105 shadow-md shadow-red-500/25'
                : 'bg-white/90 text-slate-700 hover:text-[#E51F3E] hover:scale-105 backdrop-blur-xs'
            }`}
            title={shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
            aria-label="Shortlist profile"
          >
            <Heart
              className={`w-4 h-4 transition-colors duration-200 ${
                shortlisted ? 'fill-white text-white' : 'text-slate-700'
              }`}
            />
          </button>
        </div>

        {/* Profile Name, Age, Location overlay on image */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white z-10">
          <div className="flex items-center gap-1.5">
            <h3 className="font-serif text-[19px] sm:text-[20px] font-bold leading-tight drop-shadow-sm text-white line-clamp-1">
              {profile.displayName}
            </h3>
            {profile.membershipBadge === 'VVIP' && (
              <span className="shrink-0 px-1.5 py-0.2 rounded bg-slate-900 text-white text-[9px] font-extrabold border border-amber-400/60">
                💎 VVIP
              </span>
            )}
            {profile.membershipBadge === 'VIP' && (
              <span className="shrink-0 px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold">
                👑 VIP
              </span>
            )}
            {profile.membershipBadge === 'PREMIUM' && (
              <span className="shrink-0 px-1.5 py-0.2 rounded bg-[#E51F3E] text-white text-[9px] font-bold">
                ⭐
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 mt-1">
            <span>{age} Yrs</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              {profile.city || 'India'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Lower Info Section ── */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-white space-y-3.5">
        <div className="space-y-2.5">
          {/* Profession / Medical Specialization */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
              <Briefcase className="w-3.5 h-3.5 text-[#E51F3E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Profession / Specialization
              </p>
              <p className="text-[12.5px] font-semibold text-[#101728] line-clamp-1">
                {profile.profession || 'Medical Doctor'}
              </p>
            </div>
          </div>

          {/* Education / Degree */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#D99A28]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Medical Qualification
              </p>
              <p className="text-[12.5px] font-medium text-[#101728] line-clamp-1">
                {profile.degree || profile.education || 'MBBS / MD / Medical'}
              </p>
            </div>
          </div>
        </div>

        {/* View Full Profile Button */}
        <Link
          href={`/profile/${profile._id}`}
          className="w-full h-10.5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E51F3E] hover:bg-[#D41432] text-white text-[13px] font-semibold shadow-xs hover:shadow-md hover:shadow-red-600/20 transition-all duration-200 group/btn mt-1"
        >
          <span>View Full Profile</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
