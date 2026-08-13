'use client';

import Link from 'next/link';
import { ProfileCard as ProfileCardType } from '../types/profile';
import { ShieldCheck, MapPin, Briefcase, GraduationCap, Heart, ArrowRight } from 'lucide-react';
import { useState } from 'react';

function getAge(dob: string) {
  if (!dob) return 26;
  const date = new Date(dob);
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

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
  );
}
