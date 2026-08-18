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
    <article className="group bg-white rounded-2xl border border-rose-100/90 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-900/8 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full w-full">
      {/* ── Top Image Container ── */}
      <div className="relative w-full h-[290px] overflow-hidden bg-slate-100">
        <img
          src={photoUrl}
          alt={profile.displayName}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Soft Transparent Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {/* Verified Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0BAA70] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified
          </span>

          {/* Heart Shortlist Button */}
          <button
            onClick={() => setShortlisted(!shortlisted)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-xs ${
              shortlisted
                ? 'bg-[#E51F3E] text-white scale-105 shadow-md shadow-red-500/25'
                : 'bg-white/90 text-slate-700 hover:text-[#E51F3E] hover:scale-105 backdrop-blur-xs'
            }`}
            title="Add to Shortlist"
            aria-label="Add to Shortlist"
          >
            <Heart className={`w-4 h-4 transition-colors duration-200 ${shortlisted ? 'fill-white text-white' : 'text-slate-700'}`} />
          </button>
        </div>

        {/* Profile Name & Location overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white z-10">
          <h3 className="font-serif text-[20px] font-bold leading-snug drop-shadow-sm text-white line-clamp-1">
            {profile.displayName}
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 mt-0.5">
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
          {/* Profession */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
              <Briefcase className="w-3.5 h-3.5 text-[#E51F3E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                Profession
              </p>
              <p className="text-[13px] font-medium text-[#101828] line-clamp-1">
                {profile.profession || 'Working Professional'}
              </p>
            </div>
          </div>

          {/* Education */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#D99A28]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                Education
              </p>
              <p className="text-[13px] font-medium text-[#101828] line-clamp-1">
                {profile.education || 'Graduate Degree'}
              </p>
            </div>
          </div>
        </div>

        {/* View Full Profile Button */}
        <Link
          href={`/profile/${profile._id}`}
          className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E51F3E] hover:bg-[#D41432] text-white text-[13.5px] font-semibold shadow-xs hover:shadow-md hover:shadow-red-600/20 transition-all duration-200 group/btn mt-1"
        >
          <span>View Full Profile</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
