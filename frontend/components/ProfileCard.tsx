'use client';

<<<<<<< HEAD
import React, { useState } from 'react';
import Link from 'next/link';
import { ProfileCard as ProfileCardType } from '../types/profile';
import { ShieldCheck, MapPin, Briefcase, GraduationCap, Heart, ArrowRight } from 'lucide-react';
import { addShortlist, removeShortlist, getAuthToken } from '../lib/api';

import { DoctorAvatar } from './DoctorAvatar';

function getAge(dob?: string | Date) {
  if (!dob) return 28;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 28;
=======
import Link from 'next/link';
import { ProfileCard as ProfileCardType } from '../types/profile';
import { ShieldCheck, MapPin, Briefcase, GraduationCap, Heart, ArrowRight } from 'lucide-react';
import { useState } from 'react';

function getAge(dob: string) {
  if (!dob) return 26;
  const date = new Date(dob);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

<<<<<<< HEAD
export function ProfileCard({
  profile,
  isShortlistedDefault = false,
}: {
  profile: ProfileCardType;
  isShortlistedDefault?: boolean;
}) {
  const [shortlisted, setShortlisted] = useState(isShortlistedDefault);
  const [isUpdating, setIsUpdating] = useState(false);
  const age = getAge(profile.dob);
  const [imgError, setImgError] = useState(!profile.primaryPhoto);

  const degreeLower = (profile.degree || profile.education || '').toLowerCase();
  const professionLower = (profile.profession || '').toLowerCase();
  const nameLower = (profile.displayName || '').toLowerCase();

  const isDoctor =
    nameLower.startsWith('dr.') ||
    nameLower.startsWith('dr ') ||
    degreeLower.includes('mbbs') ||
    degreeLower.includes('md cardiology') ||
    degreeLower.includes('md internal medicine') ||
    degreeLower.includes('md ') ||
    degreeLower.includes('ms general surgery') ||
    degreeLower.includes('dnb') ||
    degreeLower.includes('bds') ||
    degreeLower.includes('mds') ||
    professionLower.includes('cardiologist') ||
    professionLower.includes('surgeon') ||
    professionLower.includes('physician') ||
    professionLower.includes('doctor');

  const rawStatus = (profile.verificationStatus || '').toUpperCase();
  const isDoctorVerified = rawStatus === 'DOCTOR_VERIFIED' || (rawStatus === 'VERIFIED' && isDoctor);
  const isGeneralVerified = rawStatus === 'VERIFIED' || rawStatus === 'APPROVED' || rawStatus === 'TRUE';

  const profileUrl = `/profile/${profile._id}`;

  const handleShortlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUpdating) return;
    const nextState = !shortlisted;
    setShortlisted(nextState);

    const token = getAuthToken();
    if (token && profile._id) {
      setIsUpdating(true);
      try {
        if (nextState) {
          await addShortlist(profile._id);
        } else {
          await removeShortlist(profile._id);
        }
      } catch (err) {
        console.error('Error toggling shortlist:', err);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const candidateLocation = profile.city || profile.state || profile.country || 'India';
  const candidateEducation = profile.degree || profile.education || 'Graduate / Professional';
  const candidateProfession = profile.profession || 'Working Professional';

  return (
    <div className="flex flex-col h-full w-full max-w-[340px] xs:max-w-[360px] sm:max-w-none mx-auto overflow-hidden rounded-xl sm:rounded-2xl border border-[rgba(180,160,150,0.22)] bg-white shadow-2xs hover:shadow-md hover:border-rose-200 transition-all duration-300 group box-border">
      {/* ── Portrait Photo Area (Compact aspect ratio ~1:1.12, object-position: center) ── */}
      <div className="relative w-full aspect-[1/1.12] overflow-hidden bg-slate-100 shrink-0">
        <Link
          href={profileUrl}
          className="cursor-pointer block h-full w-full relative overflow-hidden"
          title={`View full profile of ${profile.displayName}`}
          aria-label={`View full profile of ${profile.displayName}`}
        >
          {profile.primaryPhoto && !imgError ? (
            <img
              src={profile.primaryPhoto}
              alt={profile.displayName}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover object-center block transition-transform duration-500 group-hover:scale-105 cursor-pointer"
              loading="lazy"
            />
          ) : (
            <DoctorAvatar
              name={profile.displayName}
              gender={profile.gender}
              className="w-full h-full rounded-none"
            />
          )}
        </Link>

        {/* Top Badges Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          {/* Verification Badge */}
          {isDoctorVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0BAA70] px-2.5 py-0.5 text-[10px] sm:text-[10.5px] font-bold text-white shadow-xs pointer-events-auto select-none">
              <ShieldCheck className="w-3 h-3" />
              <span className="truncate max-w-[85px] sm:max-w-none">Doctor Verified</span>
            </span>
          ) : isGeneralVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0BAA70] px-2.5 py-0.5 text-[10px] sm:text-[10.5px] font-bold text-white shadow-xs pointer-events-auto select-none">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 backdrop-blur-xs px-2.5 py-0.5 text-[10px] sm:text-[10.5px] font-semibold text-white shadow-xs pointer-events-auto select-none">
              <span>Screened</span>
            </span>
          )}

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={handleShortlistToggle}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 pointer-events-auto shadow-xs focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 cursor-pointer ${
              shortlisted
                ? 'bg-[#E51F3E] text-white scale-105 shadow-sm shadow-red-500/30'
                : 'bg-white/90 text-slate-700 hover:text-[#E51F3E] hover:scale-105 backdrop-blur-xs'
            }`}
            title={shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
            aria-label="Shortlist profile"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors duration-200 ${
                shortlisted ? 'fill-white text-white' : 'text-slate-700 hover:text-[#E51F3E]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Card Content (Compact padding: 14px to 16px, vertical breathing room, equal height) ── */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4 text-left box-border justify-between">
        <div className="space-y-1 overflow-hidden">
          {/* Profile Name */}
          <Link
            href={profileUrl}
            className="block text-[15px] sm:text-[15.5px] leading-snug font-bold text-[#101728] hover:text-[#E51F3E] truncate whitespace-nowrap overflow-hidden text-ellipsis transition-colors cursor-pointer"
          >
            {profile.displayName}
          </Link>

          {/* Age • Location */}
          <div className="flex items-center gap-1.5 text-[11.5px] sm:text-[12px] leading-none text-slate-500 truncate whitespace-nowrap overflow-hidden text-ellipsis pt-0.5">
            <span className="font-semibold text-slate-700">{age} Yrs</span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 truncate whitespace-nowrap overflow-hidden text-ellipsis">
              <MapPin className="w-3 h-3 text-[#E51F3E] shrink-0" />
              <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis">{candidateLocation}</span>
            </span>
          </div>

          {/* Profession */}
          <div className="flex items-center gap-1.5 text-[11.5px] sm:text-[12px] leading-none text-slate-800 font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis pt-0.5">
            <Briefcase className="w-3 h-3 text-[#E51F3E] shrink-0" />
            <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis">
              {candidateProfession}
            </span>
          </div>
        </div>

        {/* Aligned Button (Height: 42px, mt-auto pt-3) */}
        <div className="mt-auto pt-3">
          <Link
            href={profileUrl}
            className="w-full h-[42px] px-3 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] hover:bg-[#ce102f] text-white text-[12.5px] sm:text-[13px] font-bold shadow-2xs hover:shadow-xs hover:shadow-red-600/20 active:scale-[0.99] transition-all duration-200 inline-flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 cursor-pointer"
          >
            <span>View Full Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="flex flex-col h-full w-full max-w-[340px] xs:max-w-[360px] sm:max-w-none mx-auto overflow-hidden rounded-xl sm:rounded-2xl border border-[rgba(180,160,150,0.22)] bg-white shadow-2xs animate-pulse box-border">
      <div className="w-full aspect-[1/1.12] bg-slate-200/75 shrink-0" />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4 justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/5" />
          <div className="h-3 bg-slate-100 rounded w-2/5" />
          <div className="h-3 bg-slate-100 rounded w-4/5 pt-0.5" />
        </div>
        <div className="mt-auto pt-3">
          <div className="h-[42px] bg-slate-200/90 rounded-xl w-full" />
        </div>
      </div>
    </div>
=======
export function ProfileCard({ profile }: { profile: ProfileCardType }) {
  const [shortlisted, setShortlisted] = useState(false);
  const age = getAge(profile.dob);

  // Fallback avatars based on profile
  const defaultPhoto = profile.gender?.toLowerCase() === 'female'
    ? 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=85&w=800'
    : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=85&w=800';

  const photoUrl = profile.primaryPhoto || defaultPhoto;

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between">
      {/* Top Image Container - Enhanced */}
      <div className="relative w-full overflow-hidden bg-slate-100" style={{ aspectRatio: '3/4' }}>
        <img
          src={photoUrl}
          alt={profile.displayName}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent opacity-80 group-hover:opacity-75 transition-opacity duration-300" />

        {/* Top Badges - Enhanced */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/95 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white shadow-lg border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified
          </span>
          <button
            onClick={() => setShortlisted(!shortlisted)}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
              shortlisted
                ? 'bg-red-500/95 text-white shadow-lg scale-105'
                : 'bg-white/90 text-slate-600 hover:bg-white hover:text-red-500 hover:scale-110'
            }`}
            title="Add to Shortlist"
          >
            <Heart className={`w-5 h-5 transition-all duration-300 ${shortlisted ? 'fill-white scale-125' : ''}`} />
          </button>
        </div>

        {/* Bottom Profile Overlay - Enhanced */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10">
          <h2 className="font-serif text-2xl font-bold tracking-wide mb-2 text-white">
            {profile.displayName}
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-100">
            <span className="font-semibold">{age} Yrs</span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-rose-300 flex-shrink-0" />
              {profile.city || 'India'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Content - Enhanced */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Profession</p>
              <p className="font-medium text-slate-800 line-clamp-2 text-sm">
                {profile.profession || 'Working Professional'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <GraduationCap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Education</p>
              <p className="font-medium text-slate-700 line-clamp-2 text-sm">
                {profile.education || 'Graduate Degree'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button - Enhanced */}
        <div className="pt-2 border-t border-slate-100">
          <Link
            href={`/profile/${profile._id}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:from-red-700 hover:to-rose-700 hover:shadow-xl transition-all duration-300 group/btn"
          >
            View Full Profile
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  );
}
