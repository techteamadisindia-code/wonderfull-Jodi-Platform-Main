'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCcw, AlertCircle, Users } from 'lucide-react';
import { ProfileCard, ProfileCardSkeleton } from './ProfileCard';
import { searchProfiles, getShortlisted, getAuthToken } from '../lib/api';
import { ProfileCard as ProfileCardType } from '../types/profile';

export function FeaturedProfilesSection() {
  const [profiles, setProfiles] = useState<ProfileCardType[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeaturedProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch top verified & active profiles from backend API (limited to 4)
      const result = await searchProfiles('limit=4&sort=bestMatch');
      const fetchedProfiles: ProfileCardType[] = (result?.profiles || []).map((p: any) => ({
        _id: p._id,
        id: p._id,
        candidateId: p.candidateId,
        profileId: p.profileId,
        isAuthenticatedViewer: p.isAuthenticatedViewer,
        displayName: p.displayName,
        name: p.name,
        publicName: p.publicName,
        age: p.age,
        gender: p.gender,
        dob: p.dob,
        city: p.city,
        state: p.state,
        country: p.country,
        education: p.education,
        degree: p.degree,
        profession: p.profession,
        specialization: p.specialization,
        primaryPhoto: p.primaryPhoto || (p.photos && p.photos[0]) || '',
        verificationStatus: p.verificationStatus,
      }));

      // Pick top 4 distinct profiles
      setProfiles(fetchedProfiles.slice(0, 4));

      // 2. If logged in, fetch shortlist to populate favourite states
      const token = getAuthToken();
      if (token) {
        try {
          const shortlists = await getShortlisted();
          if (Array.isArray(shortlists)) {
            const ids = shortlists
              .map((s: any) => s.profile?._id || s.profile || s.shortlistedProfile?._id || s.shortlistedProfile)
              .filter(Boolean);
            setShortlistedIds(ids);
          }
        } catch {
          // Non-critical, ignore shortlist fetch error for guests/expired token
        }
      }
    } catch (err) {
      console.error('Failed to load featured verified profiles:', err);
      setError('Unable to load verified matches. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedProfiles();
  }, [fetchFeaturedProfiles]);

  return (
    <section className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] w-full">
      <div className="max-w-[1280px] mx-auto">
        {/* ── Section Header (Centered with clean spacing) ── */}
        <div className="flex flex-col items-center text-center mb-5 sm:mb-6 space-y-1.5">
          <h2 className="font-serif text-[22px] sm:text-2xl lg:text-[30px] font-bold text-slate-900 tracking-tight leading-snug">
            Featured <span className="text-[#E51F3E]">Verified Matches</span>
          </h2>
          <p className="text-[13px] sm:text-[14px] text-slate-600 max-w-xl mx-auto leading-relaxed">
            Discover recently joined and 100% verified brides and grooms seeking sincere life connections.
          </p>
          <div className="pt-0.5">
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-1.5 text-[13px] sm:text-[13.5px] font-bold text-[#E51F3E] hover:text-[#C9132F] transition focus:outline-none focus:underline"
            >
              <span>View All 100K+ Profiles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ── Profile Cards Grid: 1 col on mobile, 2 cols on tablet, 4 compact cols on desktop ── */}
        {loading ? (
          /* Loading State: 4 Skeleton Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 sm:gap-5 w-full max-w-[1180px] mx-auto items-stretch">
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
          </div>
        ) : error ? (
          /* Error State with friendly message & Try Again button */
          <div className="max-w-md mx-auto p-6 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-[#E51F3E] flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">{error}</p>
            <button
              type="button"
              onClick={fetchFeaturedProfiles}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#CE102F] text-white text-xs font-bold transition shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        ) : profiles.length === 0 ? (
          /* Empty State */
          <div className="max-w-md mx-auto p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-slate-800">
              No verified matches available right now.
            </h3>
            <p className="text-xs text-slate-500">
              We are constantly onboarding new members. Check out the full directory.
            </p>
            <div className="pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs"
              >
                <span>Explore All Profiles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 sm:gap-5 w-full max-w-[1180px] mx-auto items-stretch">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                isShortlistedDefault={shortlistedIds.includes(profile._id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
