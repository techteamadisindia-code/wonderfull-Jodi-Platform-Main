<<<<<<< HEAD
'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Heart,
  MessageSquare,
  MapPin,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  User,
  Building,
  DollarSign,
  Users2,
  Utensils,
  Sparkles,
  Calendar,
  Layers,
  Lock,
  Share2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Award,
  Home,
  Compass,
} from 'lucide-react';
import { addShortlist, removeShortlist, getAuthToken, getMyProfile } from '../../../lib/api';
import apiClient from '../../../services/api';
import {
  sendInterest,
  checkInterestStatus,
  acceptInterest,
  declineInterest,
  InterestStatusResult,
} from '../../../services/interestApi';
import {
  fetchContactAccessStatus,
  sendContactRequest,
  acceptContactRequest,
  declineContactRequest,
  ContactAccessStatus,
} from '../../../services/contactRequestApi';
import { DoctorAvatar } from '../../../components/DoctorAvatar';
import { Phone, Mail, MessageCircle, PhoneCall } from 'lucide-react';

function getAge(dob?: string | Date) {
  if (!dob) return 28;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 28;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export default function ProfileDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  
  // Real Database Interest & Chat State
  const [interestStatus, setInterestStatus] = useState<InterestStatusResult>({
    hasInterest: false,
    status: 'NONE',
    isSender: false,
    isReceiver: false,
    interestId: null,
    canChat: false,
  });
  const [interestActionLoading, setInterestActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isMyOwnProfile, setIsMyOwnProfile] = useState(false);

  // Mutual Interest + Contact Privacy & Credits State
  const [contactAccess, setContactAccess] = useState<ContactAccessStatus>({
    hasAccess: false,
    status: 'NONE',
  });
  const [contactActionLoading, setContactActionLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'upgrade';
  } | null>(null);

  useEffect(() => {
    async function loadProfileAndStatus() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/profiles/${id}`);
        const profileData = res.data?.data;
        if (!profileData) {
          throw new Error('Profile could not be loaded or was not found');
        }

        setProfile(profileData);
        setSelectedPhoto(profileData.primaryPhoto || (profileData.photos && profileData.photos[0]) || '');

        // If authenticated, check own profile, interest status and contact access status
        const token = getAuthToken();
        if (token) {
          try {
            const myProfile = await getMyProfile().catch(() => null);
            const myUserId = myProfile?.user?._id || myProfile?.user?.id || myProfile?.user;
            const targetUserId = profileData.user?._id || profileData.user?.id || profileData.user;
            const isOwn =
              Boolean(myProfile) &&
              (String(myProfile._id) === String(profileData._id) ||
                (Boolean(myUserId) && Boolean(targetUserId) && String(myUserId) === String(targetUserId)));

            if (isOwn) {
              setIsMyOwnProfile(true);
            } else {
              const [statusRes, accessRes] = await Promise.all([
                checkInterestStatus(id).catch(() => null),
                fetchContactAccessStatus(id).catch(() => null),
              ]);
              if (statusRes) setInterestStatus(statusRes);
              if (accessRes) setContactAccess(accessRes);
            }
          } catch {
            // Ignore status check errors
          }
        }
      } catch (err: any) {
        console.error('Error fetching profile details:', err);
        setError(err.response?.data?.message || err.message || 'Unable to load profile.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProfileAndStatus();
    }
  }, [id]);

  const handleRequestContact = async () => {
    const token = getAuthToken();
    if (!token) {
      router.push(`/login?redirect=/profile/${id}`);
      return;
    }
    setContactActionLoading(true);
    setContactMessage(null);
    try {
      const res = await sendContactRequest({ profileId: id });
      if (res.success) {
        setContactAccess((prev) => ({
          ...prev,
          hasAccess: res.alreadyUnlocked ?? false,
          status: res.alreadyUnlocked ? 'ACCEPTED' : 'PENDING',
          message: res.alreadyUnlocked
            ? 'Contact details unlocked!'
            : 'Contact request sent. Awaiting member acceptance.',
        }));
        setContactMessage({
          text: res.message || 'Contact request sent securely. Your contact credit will only be deducted when accepted.',
          type: 'success',
        });
        if (res.alreadyUnlocked) {
          const fresh = await fetchContactAccessStatus(id);
          setContactAccess(fresh);
        }
      }
    } catch (err: any) {
      console.error('Error requesting contact:', err);
      const serverMsg = err.response?.data?.message || 'Failed to send contact request.';
      if (err.response?.data?.canUpgrade || err.response?.status === 403) {
        setContactMessage({
          text: serverMsg,
          type: 'upgrade',
        });
      } else {
        setContactMessage({
          text: serverMsg,
          type: 'error',
        });
      }
    } finally {
      setContactActionLoading(false);
    }
  };

  const handleAcceptContact = async () => {
    if (!contactAccess.requestId) return;
    setContactActionLoading(true);
    setContactMessage(null);
    try {
      const res = await acceptContactRequest(contactAccess.requestId);
      if (res.success) {
        const fresh = await fetchContactAccessStatus(id);
        setContactAccess(fresh);
        setContactMessage({ text: 'Contact request accepted. Contact details unlocked!', type: 'success' });
      }
    } catch (err: any) {
      console.error('Error accepting contact:', err);
      setContactMessage({ text: err.response?.data?.message || 'Failed to accept request.', type: 'error' });
    } finally {
      setContactActionLoading(false);
    }
  };

  const handleDeclineContact = async () => {
    if (!contactAccess.requestId) return;
    setContactActionLoading(true);
    setContactMessage(null);
    try {
      const res = await declineContactRequest(contactAccess.requestId);
      if (res.success) {
        setContactAccess((prev) => ({ ...prev, status: 'DECLINED', hasAccess: false }));
        setContactMessage({ text: 'Contact request declined. No credits were deducted.', type: 'success' });
      }
    } catch (err: any) {
      console.error('Error declining contact:', err);
      setContactMessage({ text: err.response?.data?.message || 'Failed to decline request.', type: 'error' });
    } finally {
      setContactActionLoading(false);
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/search');
    }
  };

  const handleShortlist = async () => {
    if (!profile?._id) return;
    const token = getAuthToken();
    if (!token) {
      router.push(`/login?redirect=/profile/${id}`);
      return;
    }

    const nextState = !isShortlisted;
    setIsShortlisted(nextState);

    try {
      if (nextState) {
        await addShortlist(profile._id);
      } else {
        await removeShortlist(profile._id);
      }
    } catch (e) {
      console.error('Error updating shortlist:', e);
    }
  };

  // ── Send Express Interest ──
  const handleSendInterest = async () => {
    const token = getAuthToken();
    if (!token) {
      router.push(`/login?redirect=/profile/${id}`);
      return;
    }

    setInterestActionLoading(true);
    setFeedbackMessage(null);

    try {
      await sendInterest({ profileId: profile._id });
      setInterestStatus({
        hasInterest: true,
        status: 'PENDING',
        isSender: true,
        isReceiver: false,
        interestId: null,
        canChat: false,
      });
      setFeedbackMessage({ text: 'Interest sent successfully! Recipient has been notified.', type: 'success' });
    } catch (err: any) {
      console.error('Error sending interest:', err);
      const msg = err.response?.data?.message || 'Failed to send interest. Please try again.';
      setFeedbackMessage({ text: msg, type: 'error' });
    } finally {
      setInterestActionLoading(false);
    }
  };

  // ── Accept Received Interest ──
  const handleAcceptInterest = async () => {
    if (!interestStatus.interestId) return;
    setInterestActionLoading(true);
    setFeedbackMessage(null);

    try {
      const result = await acceptInterest(interestStatus.interestId);
      setInterestStatus((prev) => ({
        ...prev,
        status: 'ACCEPTED',
        canChat: true,
      }));
      setFeedbackMessage({ text: 'Interest accepted! You can now start chatting.', type: 'success' });
    } catch (err: any) {
      console.error('Error accepting interest:', err);
      setFeedbackMessage({ text: err.response?.data?.message || 'Failed to accept interest.', type: 'error' });
    } finally {
      setInterestActionLoading(false);
    }
  };

  // ── Decline Received Interest ──
  const handleDeclineInterest = async () => {
    if (!interestStatus.interestId) return;
    setInterestActionLoading(true);
    setFeedbackMessage(null);

    try {
      await declineInterest(interestStatus.interestId);
      setInterestStatus((prev) => ({
        ...prev,
        status: 'DECLINED',
        canChat: false,
      }));
      setFeedbackMessage({ text: 'Interest declined.', type: 'success' });
    } catch (err: any) {
      console.error('Error declining interest:', err);
      setFeedbackMessage({ text: err.response?.data?.message || 'Failed to decline interest.', type: 'error' });
    } finally {
      setInterestActionLoading(false);
    }
  };

  // ── Start Chat ──
  const handleStartChat = () => {
    const targetUserId = profile.user?._id || profile.user || interestStatus.targetUserId;
    if (targetUserId) {
      router.push(`/messages?user=${targetUserId}&profile=${profile._id}`);
    } else {
      router.push('/messages');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFDFB] py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
          <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-sm animate-pulse space-y-6">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-72 h-80 bg-slate-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-slate-200 rounded-lg w-2/3" />
                <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="h-12 bg-slate-100 rounded-xl" />
                  <div className="h-12 bg-slate-100 rounded-xl" />
                  <div className="h-12 bg-slate-100 rounded-xl" />
                  <div className="h-12 bg-slate-100 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#FFFDFB] py-14 px-4 sm:px-6">
        <div className="max-w-md mx-auto p-8 bg-white border border-rose-200 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-[#E51F3E] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-slate-900">Profile Not Available</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {error || 'This profile is either inactive, private, or has been updated.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs"
            >
              <span>Search Verified Profiles</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const age = getAge(profile.dob);
  const rawStatus = (profile.verificationStatus || profile.user?.verificationStatus || '').toUpperCase();
  const isVerified = rawStatus === 'VERIFIED' || rawStatus === 'APPROVED' || rawStatus === 'DOCTOR_VERIFIED';

  const degreeLower = (profile.degree || profile.education || '').toLowerCase();
  const isDoctor =
    (profile.displayName || '').toLowerCase().startsWith('dr') ||
    degreeLower.includes('mbbs') ||
    degreeLower.includes('md') ||
    degreeLower.includes('bds');

  const allPhotos = [
    profile.primaryPhoto,
    ...(Array.isArray(profile.photos) ? profile.photos : []),
  ].filter(Boolean);

  const uniquePhotos = Array.from(new Set(allPhotos));

  return (
    <main className="min-h-screen bg-[#FFFDFB] py-8 sm:py-10 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        {/* Navigation & Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-[#E51F3E] transition-colors py-2 px-3.5 rounded-full bg-white border border-slate-200 hover:border-rose-200 shadow-2xs cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#E51F3E] transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Profile ID: #{profile._id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Top Header Hero Card ── */}
        <section className="rounded-3xl bg-white p-6 sm:p-8 border border-rose-100/90 shadow-sm overflow-hidden text-left">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center">
            {/* Primary Photo Section */}
            <div className="w-full sm:w-80 lg:w-72 shrink-0 space-y-3">
              <div className="relative w-full h-80 sm:h-84 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-100 shadow-xs border-2 border-rose-100/60">
                {selectedPhoto ? (
                  <img
                    src={selectedPhoto}
                    alt={profile.displayName}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <DoctorAvatar
                    photoUrl={null}
                    name={profile.displayName}
                    gender={profile.gender}
                    className="w-full h-full rounded-none"
                  />
                )}
                <span
                  className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-xs ${
                    isVerified ? 'bg-[#0BAA70]' : 'bg-slate-900/85 backdrop-blur-xs'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isVerified ? (isDoctor ? 'Doctor Verified' : 'Verified Member') : 'Screened Member'}</span>
                </span>
              </div>

              {/* Photo Thumbnails Gallery if multiple photos */}
              {uniquePhotos.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {uniquePhotos.map((photo, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedPhoto(photo)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                        selectedPhoto === photo
                          ? 'border-[#E51F3E] ring-2 ring-[#E51F3E]/20 scale-105'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={photo} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Candidate Header Metadata & Actions */}
            <div className="flex-1 space-y-4 w-full">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E51F3E] mb-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Verified Matrimonial Match</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#101828]">
                  {profile.displayName}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-[#E51F3E] shrink-0" />
                    <span>
                      {profile.city}, {profile.state || profile.country || 'India'}
                    </span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{age} Years</span>
                  <span className="text-slate-300">•</span>
                  <span>{profile.gender}</span>
                  {profile.height && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{profile.height}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Quick Highlight Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-4 border-y border-slate-100 text-xs sm:text-sm">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Profession & Role
                  </span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                    <span className="truncate">{profile.profession || 'Working Professional'}</span>
                  </span>
                  {profile.company && (
                    <span className="text-xs text-slate-500 block truncate">{profile.company}</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Highest Education
                  </span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#D99A28] shrink-0" />
                    <span className="truncate">{profile.degree || profile.education || 'Graduate'}</span>
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Religion & Community
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.religion || 'Hindu'} {profile.caste ? `(${profile.caste})` : ''}
                  </span>
                  {profile.motherTongue && (
                    <span className="text-xs text-slate-500 block">Mother Tongue: {profile.motherTongue}</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Marital Status
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.maritalStatus || 'Never Married'}
                  </span>
                  {profile.annualIncome && (
                    <span className="text-xs text-emerald-600 font-semibold block">
                      Income: {profile.annualIncome}
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback Alert if Action Performed */}
              {feedbackMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 ${
                    feedbackMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feedbackMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{feedbackMessage.text}</span>
                  </div>
                  <button
                    onClick={() => setFeedbackMessage(null)}
                    className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {isMyOwnProfile ? (
                  <Link
                    href="/profile/edit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E51F3E] text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-xs hover:bg-[#CC1432] transition cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Edit My Profile</span>
                  </Link>
                ) : interestStatus.status === 'ACCEPTED' ? (
                  <button
                    type="button"
                    onClick={handleStartChat}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-600/20 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Start Chat</span>
                  </button>
                ) : interestStatus.status === 'PENDING' && interestStatus.isReceiver ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={interestActionLoading}
                      onClick={handleAcceptInterest}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {interestActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      disabled={interestActionLoading}
                      onClick={handleDeclineInterest}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-3 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (interestStatus.status === 'PENDING' && interestStatus.isSender) ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 text-[#E51F3E] px-5 py-3 text-xs sm:text-sm font-bold shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-[#E51F3E]" />
                    <span>✓ Interest Sent</span>
                  </div>
                ) : interestStatus.status === 'DECLINED' || interestStatus.status === 'REJECTED' ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 px-5 py-3 text-xs sm:text-sm font-semibold">
                    <span>Interest declined</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={interestActionLoading}
                    onClick={handleSendInterest}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] text-white px-6 py-3 text-xs sm:text-sm font-bold transition shadow-xs hover:shadow-md hover:shadow-red-600/25 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60"
                  >
                    {interestActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 fill-white" />
                    )}
                    <span>Send Interest</span>
                  </button>
                )}

                {/* Mutual Contact Action Button */}
                {!isMyOwnProfile && (
                  contactAccess.hasAccess ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 text-xs sm:text-sm font-bold shadow-2xs">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>Contact Unlocked</span>
                    </div>
                  ) : contactAccess.status === 'PENDING' ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 text-xs sm:text-sm font-bold shadow-2xs">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Contact Requested</span>
                    </div>
                  ) : contactAccess.status === 'RECEIVED_PENDING' ? (
                    <button
                      type="button"
                      disabled={contactActionLoading}
                      onClick={handleAcceptContact}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Contact Request</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={contactActionLoading}
                      onClick={handleRequestContact}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-5 py-3 text-xs sm:text-sm font-bold transition shadow-2xs hover:-translate-y-0.5 cursor-pointer disabled:opacity-60"
                    >
                      {contactActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#E51F3E]" />
                      ) : (
                        <PhoneCall className="w-4 h-4 text-[#E51F3E]" />
                      )}
                      <span>Request Contact</span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={handleShortlist}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    isShortlisted
                      ? 'bg-rose-50 border-rose-300 text-[#E51F3E]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50/50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#E51F3E]" />
                  <span>{isShortlisted ? 'Shortlisted' : 'Shortlist Profile'}</span>
=======
import Link from 'next/link';
import { ShieldCheck, Heart, MessageSquare, MapPin, Briefcase, GraduationCap, ArrowLeft, CheckCircle2, User } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

const mockProfilesMap: Record<string, any> = {
  p1: {
    _id: 'p1',
    displayName: 'Priya Sharma',
    gender: 'Female',
    dob: '1998-05-14',
    city: 'Mumbai',
    state: 'Maharashtra',
    education: 'M.Tech in Computer Science (IIT Bombay)',
    profession: 'Senior Software Engineer at Global Tech',
    verificationStatus: 'VERIFIED',
    about: 'I am a passionate software professional with a blend of modern thinking and deep family values. I love traveling, exploring classical music, and spending quality weekend time with family.',
    primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    maritalStatus: 'Never Married',
    religion: 'Hindu',
    caste: 'Brahmin',
    height: "5' 5\"",
    diet: 'Vegetarian',
  },
  p2: {
    _id: 'p2',
    displayName: 'Rohan Mehta',
    gender: 'Male',
    dob: '1994-11-20',
    city: 'Bengaluru',
    state: 'Karnataka',
    education: 'MBA (IIM Ahmedabad) & B.Tech',
    profession: 'Product Director',
    verificationStatus: 'VERIFIED',
    about: 'Ambitious product leader working with a top fintech startup in Bengaluru. Looking for an educated, understanding partner with whom I can share life goals and adventurous travels.',
    primaryPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
    maritalStatus: 'Never Married',
    religion: 'Hindu',
    caste: 'Vaishya / Jain',
    height: "5' 11\"",
    diet: 'Eggetarian',
  },
  p3: {
    _id: 'p3',
    displayName: 'Ananya Verma',
    gender: 'Female',
    dob: '1996-08-03',
    city: 'Delhi NCR',
    state: 'Delhi',
    education: 'MBBS, MD Cardiology (AIIMS Delhi)',
    profession: 'Consultant Cardiologist',
    primaryPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    maritalStatus: 'Never Married',
    religion: 'Hindu',
    caste: 'Kayastha',
    height: "5' 6\"",
    diet: 'Non-Vegetarian',
  },
};

export default async function ProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  let profile = mockProfilesMap[id];

  if (!profile) {
    try {
      const res = await fetch(`/api/profiles/${id}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        profile = json.data;
      }
    } catch (e) {
      // fallback
    }
  }

  if (!profile) {
    profile = mockProfilesMap['p1'];
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Back Link */}
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search Results
        </Link>

        {/* Top Header Card */}
        <section className="rounded-3xl bg-white p-8 border border-rose-100 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            {/* Photo */}
            <div className="lg:w-1/3">
              <div className="relative h-80 rounded-3xl overflow-hidden bg-slate-100 shadow-md">
                <img
                  src={profile.primaryPhoto}
                  alt={profile.displayName}
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Member
                </span>
              </div>
            </div>

            {/* Profile Brief */}
            <div className="lg:w-2/3 space-y-4">
              <div>
                <span className="text-xs uppercase font-semibold text-red-600 tracking-wider">
                  Matrimonial Profile ID #{id.toUpperCase()}
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
                  {profile.displayName}
                </h1>
                <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  {profile.city}, {profile.state || 'India'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-y border-slate-100 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Education</span>
                  <span className="font-semibold text-slate-800">{profile.education}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Profession</span>
                  <span className="font-semibold text-slate-800">{profile.profession}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Marital Status</span>
                  <span className="font-semibold text-slate-800">{profile.maritalStatus || 'Never Married'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Religion & Caste</span>
                  <span className="font-semibold text-slate-800">{profile.religion} ({profile.caste || 'Open'})</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-4">
                <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-red-700 hover:to-rose-700 transition">
                  <Heart className="w-4 h-4 fill-white" />
                  Send Express Interest
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/50 px-6 py-3 text-sm font-semibold text-red-700 hover:bg-rose-100 transition">
                  <MessageSquare className="w-4 h-4" />
                  Easy Chat
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
                </button>
              </div>
            </div>
          </div>
        </section>

<<<<<<< HEAD
        {/* ── Detailed Profile Information Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 text-left">
          {/* Main 2-column info */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* About Me */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-3">
              <h2 className="font-serif text-lg font-bold text-[#101828] flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-4.5 h-4.5 text-[#E51F3E]" />
                <span>About {profile.displayName}</span>
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {profile.about ||
                  `${profile.displayName} is a verified professional on Wonderful Jodi seeking a compatible life partner who shares similar family values, mutual respect, and life ambitions.`}
              </p>
            </section>

            {/* Education & Career Details */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#101828] flex items-center gap-2 border-b border-slate-100 pb-3">
                <Briefcase className="w-4.5 h-4.5 text-[#E51F3E]" />
                <span>Education & Career Background</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-3.5 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Highest Degree
                  </span>
                  <span className="font-bold text-slate-800">{profile.degree || profile.education || 'N/A'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Occupation
                  </span>
                  <span className="font-bold text-slate-800">{profile.profession || 'N/A'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Organization / Company
                  </span>
                  <span className="font-bold text-slate-800">{profile.company || 'Reputed Organization'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Work Location
                  </span>
                  <span className="font-bold text-slate-800">{profile.workLocation || profile.city || 'India'}</span>
                </div>
                {profile.annualIncome && (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl sm:col-span-2">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Annual Income Range
                    </span>
                    <span className="font-extrabold text-emerald-900 text-base">{profile.annualIncome}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Medical Registration (Compliant view) */}
            {(profile.medicalCouncil || profile.medicalRegistrationNumber) && (
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#101828] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Award className="w-4.5 h-4.5 text-[#E51F3E]" />
                  <span>Medical Council Registration</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-3.5 bg-slate-50 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Medical Council</span>
                    <span className="font-bold text-slate-800">{profile.medicalCouncil || 'State Medical Council / MCI'}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Registration Status</span>
                    <span className="font-bold text-emerald-700">✓ Council Registered Doctor</span>
                  </div>
                </div>
              </section>
            )}

            {/* Family Details */}
            {(profile.familyType || profile.fatherOccupation || profile.motherOccupation || profile.nativePlace) && (
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#101828] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Home className="w-4.5 h-4.5 text-[#E51F3E]" />
                  <span>Family Background</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-3.5 bg-slate-50 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Family Type & Status</span>
                    <span className="font-bold text-slate-800">
                      {profile.familyType || 'Nuclear Family'} • {profile.familyStatus || 'Upper Middle Class'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Native Place</span>
                    <span className="font-bold text-slate-800">{profile.nativePlace || profile.city}</span>
                  </div>
                  {profile.fatherOccupation && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Father's Occupation</span>
                      <span className="font-bold text-slate-800">{profile.fatherOccupation}</span>
                    </div>
                  )}
                  {profile.motherOccupation && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mother's Occupation</span>
                      <span className="font-bold text-slate-800">{profile.motherOccupation}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Partner Preferences */}
            {profile.partnerPreferences && (
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#101828] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Heart className="w-4.5 h-4.5 text-[#E51F3E]" />
                  <span>Partner Expectations</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-3.5 bg-slate-50 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Age Range</span>
                    <span className="font-bold text-slate-800">
                      {profile.partnerPreferences.preferredAgeMin || 24} - {profile.partnerPreferences.preferredAgeMax || 36} Years
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Qualification</span>
                    <span className="font-bold text-slate-800">
                      {profile.partnerPreferences.preferredQualification || 'MBBS / MD / MS / Medical Specialist'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl sm:col-span-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Location</span>
                    <span className="font-bold text-slate-800">{profile.partnerPreferences.preferredLocation || 'Anywhere in India'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Horoscope / Kundali with Privacy & Matching CTA */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h2 className="font-serif text-lg font-bold text-[#101828] flex items-center gap-2">
                  <Compass className="w-4.5 h-4.5 text-[#E51F3E]" />
                  <span>Horoscope & Kundali</span>
                </h2>

                <Link
                  href={`/kundali-match?partnerId=${profile._id || profile.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 text-[#800020] text-xs font-bold hover:bg-amber-100 transition border border-amber-200/80"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Match Kundali with {profile.displayName?.split(' ')[0]} →</span>
                </Link>
              </div>

              {profile.horoscope?.isPrivate ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Horoscope details are private.</span>
                </div>
              ) : profile.horoscope?.rashi ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Rashi</span>
                    <span className="font-bold text-slate-800">{profile.horoscope.rashi}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Nakshatra</span>
                    <span className="font-bold text-slate-800">{profile.horoscope.nakshatra || 'Not specified'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Manglik</span>
                    <span className="font-bold text-slate-800">{profile.horoscope.manglik || 'Non-Manglik'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Birth Place</span>
                    <span className="font-bold text-slate-800 truncate">
                      {profile.horoscope.placeOfBirth || profile.city || 'Discreet'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 flex items-center justify-between">
                  <span>Horoscope details not specified by member.</span>
                  <Link
                    href={`/kundali-match?partnerId=${profile._id || profile.id}`}
                    className="text-[#E51F3E] font-bold hover:underline"
                  >
                    Check Compatibility
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar (1-column): Safety, Verification & Contact Info */}
          <div className="space-y-6">
            {/* Contact Details & Mutual Privacy System */}
            <section className="bg-white rounded-3xl border border-rose-200/90 p-6 sm:p-7 shadow-xs space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#101828] flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-[#E51F3E]" />
                  <span>Contact Information</span>
                </h3>
                {contactAccess.hasAccess && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                    Unlocked
                  </span>
                )}
              </div>

              {/* Feedback / Alert */}
              {contactMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
                    contactMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : contactMessage.type === 'upgrade'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p>{contactMessage.text}</p>
                    {contactMessage.type === 'upgrade' && (
                      <Link
                        href="/membership"
                        className="inline-flex items-center gap-1 text-[#E51F3E] font-bold hover:underline mt-1"
                      >
                        <span>Upgrade Membership Plans →</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {contactAccess.hasAccess && contactAccess.contactDetails ? (
                /* Unlocked Contact Details */
                <div className="space-y-3 pt-1 text-xs">
                  {contactAccess.contactDetails.mobile && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Mobile Number
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {contactAccess.contactDetails.mobile}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`tel:${contactAccess.contactDetails.mobile}`}
                        className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs"
                      >
                        Call
                      </a>
                    </div>
                  )}

                  {contactAccess.contactDetails.email && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-rose-600 shrink-0" />
                        <div className="truncate max-w-[180px]">
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Verified Email
                          </span>
                          <span className="font-semibold text-slate-800 text-xs truncate block">
                            {contactAccess.contactDetails.email}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`mailto:${contactAccess.contactDetails.email}`}
                        className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs"
                      >
                        Email
                      </a>
                    </div>
                  )}

                  {contactAccess.contactDetails.currentHospital && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                        Hospital / Clinic Workplace
                      </span>
                      <span className="font-medium text-slate-800 text-xs block">
                        {contactAccess.contactDetails.currentHospital}
                      </span>
                    </div>
                  )}

                  <div className="pt-1 text-[11px] text-slate-500 italic">
                    ✓ Contact access granted via mutual interest.
                  </div>
                </div>
              ) : contactAccess.status === 'PENDING' ? (
                /* Contact Request Pending */
                <div className="space-y-3 pt-1">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 text-xs text-amber-900">
                    <span className="font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Contact Request Sent (Pending)</span>
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Awaiting member acceptance. Contact information will be revealed once the request is accepted.
                    </p>
                  </div>
                </div>
              ) : contactAccess.status === 'RECEIVED_PENDING' ? (
                /* Received Pending Contact Request */
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs">
                    <p className="font-bold text-[#9E132D]">
                      This member has requested your contact information.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={contactActionLoading}
                        onClick={handleAcceptContact}
                        className="flex-1 py-2 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={contactActionLoading}
                        onClick={handleDeclineContact}
                        className="py-2 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Protected Contact Details */
                <div className="space-y-3 pt-1">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Contact details are protected for your privacy.
                    </p>
                    {!isMyOwnProfile && (
                      <button
                        type="button"
                        disabled={contactActionLoading}
                        onClick={handleRequestContact}
                        className="w-full py-2.5 px-4 rounded-full bg-[#E51F3E] hover:bg-[#CC1432] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {contactActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PhoneCall className="w-3.5 h-3.5" />
                        )}
                        <span>Request Contact</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Contact details are shared only after mutual interest and acceptance.</span>
                  </p>
                </div>
              )}
            </section>

            <section className="bg-gradient-to-b from-rose-50/70 via-white to-white rounded-3xl border border-rose-200/80 p-6 sm:p-7 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-[#101828] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Verification & Trust Audit</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This candidate&apos;s matrimonial credentials are authenticated according to Wonderful Jodi Trust Guidelines.
              </p>

              <div className="space-y-2.5 pt-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Government ID / KYC Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>University Degree & Education</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Contact & Mobile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Privacy Guard</span>
                </div>
              </div>
            </section>

            {/* Back Button Action in Sidebar */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-3">
              <button
                type="button"
                onClick={handleBack}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Previous Page</span>
              </button>
            </div>
          </div>
        </div>
=======
        {/* Detailed Info Grid */}
        <section className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl bg-white p-8 border border-rose-100 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">About {profile.displayName}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {profile.about}
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">Personal & Lifestyle Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-500 block">Height</span>
                  <span className="font-bold text-slate-800">{profile.height || "5' 6\""}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-500 block">Diet</span>
                  <span className="font-bold text-slate-800">{profile.diet || 'Vegetarian'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl">
                  <span className="text-slate-500 block">Verification</span>
                  <span className="font-bold text-emerald-600">ID & Photo Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side Card */}
          <div className="rounded-3xl bg-gradient-to-b from-rose-50 to-white p-8 border border-rose-200/60 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Safety & Trust First</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Wonderful Jodi ensures that all communication and photo viewing is protected by your personal privacy settings.
            </p>
            <div className="space-y-2 pt-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Protected Phone Number</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Family Credentials</span>
              </div>
            </div>
          </div>
        </section>
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
      </div>
    </main>
  );
}
