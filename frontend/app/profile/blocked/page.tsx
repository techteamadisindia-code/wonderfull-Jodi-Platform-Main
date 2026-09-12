'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ban,
  ShieldCheck,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  UserX,
} from 'lucide-react';
import { fetchBlockedProfiles, unblockProfile, BlockedUserEntry } from '../../../services/blockApi';
import { getAuthToken } from '../../../lib/api';
import { DoctorAvatar } from '../../../components/DoctorAvatar';

export default function BlockedProfilesPage() {
  const router = useRouter();
  const [blockedList, setBlockedList] = useState<BlockedUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadBlockedProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBlockedProfiles();
      setBlockedList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching blocked profiles:', err);
      setError(err.response?.data?.message || 'Failed to load blocked profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/profile/blocked');
      return;
    }
    loadBlockedProfiles();
  }, []);

  const handleUnblock = async (profileIdOrUserId: string, name: string) => {
    if (!confirm(`Are you sure you want to unblock ${name || 'this profile'}?`)) {
      return;
    }

    setUnblockingId(profileIdOrUserId);
    setSuccessMsg(null);
    try {
      const res = await unblockProfile(profileIdOrUserId);
      if (res.success) {
        setSuccessMsg(`${name || 'Profile'} unblocked successfully.`);
        // Remove from list locally
        setBlockedList((prev) =>
          prev.filter(
            (b) =>
              b.profile?._id !== profileIdOrUserId &&
              b.blockedUser?._id !== profileIdOrUserId &&
              b._id !== profileIdOrUserId
          )
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unblock profile. Please try again.');
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFDFB] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#E51F3E] transition py-2 px-3 rounded-full bg-white border border-slate-200 shadow-2xs group cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Profile</span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 w-fit">
            <ShieldCheck className="w-4 h-4 text-[#E51F3E]" />
            <span>Profile Privacy & Safety</span>
          </div>
        </div>

        {/* Page Title & Intro */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Blocked Profiles
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage members you have blocked on Wonderful Jodi. Blocked users cannot view your details, search for you, or send you messages.
              </p>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Blocked Profiles List */}
        {loading ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <Loader2 className="w-8 h-8 text-[#E51F3E] animate-spin mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-slate-600">
              Loading your blocked profiles...
            </p>
          </div>
        ) : blockedList.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserX className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-slate-800">
                No Blocked Profiles
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                You haven&apos;t blocked any members. If you ever encounter an inappropriate or unsolicited profile, you can block them directly from their profile page.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#E51F3E] hover:bg-[#CC1432] text-white text-xs sm:text-sm font-bold shadow-xs transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Search Verified Doctors</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {blockedList.length} {blockedList.length === 1 ? 'Profile' : 'Profiles'} Blocked
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {blockedList.map((entry) => {
                const targetProfile = entry.profile;
                const targetUser = entry.blockedUser;
                const displayName =
                  targetProfile?.displayName || targetUser?.fullName || 'Doctor Profile';
                const photo =
                  targetProfile?.primaryPhoto ||
                  (targetProfile?.photos && targetProfile.photos[0]) ||
                  targetUser?.photo ||
                  null;
                const unblockTargetId = targetProfile?._id || targetUser?._id || entry._id;
                const isUnblockingThis = unblockingId === unblockTargetId;

                return (
                  <div
                    key={entry._id}
                    className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-rose-200 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {photo ? (
                          <img
                            src={photo}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DoctorAvatar
                            name={displayName}
                            gender={targetProfile?.gender}
                            className="w-full h-full rounded-none text-base"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900">
                            {displayName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                            Blocked
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {targetProfile?.profession && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <Briefcase className="w-3.5 h-3.5 text-[#E51F3E]" />
                              <span>{targetProfile.profession}</span>
                            </span>
                          )}
                          {targetProfile?.degree && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                              <span>{targetProfile.degree}</span>
                            </span>
                          )}
                          {targetProfile?.city && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{targetProfile.city}</span>
                            </span>
                          )}
                        </div>

                        {entry.createdAt && (
                          <p className="text-[11px] text-slate-400">
                            Blocked on {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={isUnblockingThis}
                        onClick={() => handleUnblock(unblockTargetId, displayName)}
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border border-slate-300 hover:border-[#E51F3E] bg-white hover:bg-rose-50 text-slate-700 hover:text-[#E51F3E] text-xs font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        {isUnblockingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Unblocking...</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span>Unblock Profile</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
