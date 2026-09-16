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
  Flag,
  Ban,
  ShieldAlert,
  X,
  Crown,
} from 'lucide-react';
import { addShortlist, removeShortlist, getAuthToken, getMyProfile } from '../../../lib/api';
import apiClient from '../../../services/api';
import { fetchMySubscription, UserSubscriptionDetails } from '../../../services/membershipApi';
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
import { submitPublicUserReport } from '../../../services/reportApi';
import { blockProfile, unblockProfile, fetchBlockedProfiles } from '../../../services/blockApi';
import { DoctorAvatar } from '../../../components/DoctorAvatar';
import { Phone, Mail, MessageCircle, PhoneCall } from 'lucide-react';
import { getProfileDisplayName, getCandidateId } from '../../../lib/profileUtils';

function getAge(dob?: string | Date) {
  if (!dob) return 28;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 28;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

const REPORT_REASONS = [
  'Fake Profile',
  'Fake Doctor Information',
  'Fake Qualification or Documents',
  'Incorrect Personal Information',
  'Harassment or Inappropriate Behaviour',
  'Spam',
  'Fraud or Scam',
  'Inappropriate Photos or Content',
  'Duplicate Profile',
  'Other',
];

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
  const [isPaidMember, setIsPaidMember] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  // Safety: Report & Block States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

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

        // If authenticated, check own profile, interest status, contact access, and block status
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
              const [statusRes, accessRes, blockedRes, subRes] = await Promise.all([
                checkInterestStatus(id).catch(() => null),
                fetchContactAccessStatus(id).catch(() => null),
                fetchBlockedProfiles().catch(() => []),
                fetchMySubscription().catch(() => null),
              ]);
              if (statusRes) setInterestStatus(statusRes);
              if (accessRes) setContactAccess(accessRes);
              if (subRes) {
                const isPaid =
                  subRes.status === 'ACTIVE' &&
                  subRes.planKey !== 'FREE' &&
                  subRes.slug !== 'free' &&
                  (!subRes.expiryDate || new Date(subRes.expiryDate) > new Date());
                setIsPaidMember(Boolean(isPaid));
              }
              if (Array.isArray(blockedRes)) {
                const blocked = blockedRes.some(
                  (b: any) =>
                    String(b.profile?._id) === String(id) ||
                    String(b.blockedUser?._id) === String(targetUserId)
                );
                setIsBlocked(blocked);
              }
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

    // Auto-refresh when login status changes in another tab or window
    const handleAuthChange = () => {
      if (id) loadProfileAndStatus();
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('focus', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('focus', handleAuthChange);
    };
  }, [id]);

  const candidateId = getCandidateId(profile);
  const displayName = getProfileDisplayName(profile);

  // Dynamic Document Title based on privacy
  useEffect(() => {
    if (profile) {
      if (profile.isAuthenticatedViewer) {
        document.title = `${displayName} – Wonderful Jodi Doctor Matrimony`;
      } else {
        document.title = `Candidate ${candidateId} – Wonderful Jodi Doctor Matrimony`;
      }
    }
  }, [profile, displayName, candidateId]);

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

  // ── Safety Handlers: Block & Report ──
  const handleBlockProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      router.push(`/login?redirect=/profile/${id}`);
      return;
    }
    setBlockLoading(true);
    try {
      const res = await blockProfile(id);
      if (res.success) {
        setIsBlocked(true);
        setBlockModalOpen(false);
        setFeedbackMessage({
          type: 'success',
          text: 'Profile blocked successfully. They will no longer appear in your search results or recommendations, and messaging is disabled.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to block profile.',
      });
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblockProfile = async () => {
    setBlockLoading(true);
    try {
      const res = await unblockProfile(id);
      if (res.success) {
        setIsBlocked(false);
        setFeedbackMessage({
          type: 'success',
          text: 'Profile has been unblocked.',
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to unblock profile.',
      });
    } finally {
      setBlockLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportReason) {
      setReportError('Please select a reason for reporting.');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      router.push(`/login?redirect=/profile/${id}`);
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      const res = await submitPublicUserReport({
        reportedUserId: profile.user?._id || profile.user?.id || profile.user,
        profileId: id,
        reason: selectedReportReason,
        description: reportDescription,
        details: reportDescription,
        targetType: 'PROFILE',
      });
      if (res.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(false);
          setSelectedReportReason('');
          setReportDescription('');
          setFeedbackMessage({
            type: 'success',
            text: 'Your report has been submitted to Trust & Safety. Your identity is 100% confidential.',
          });
        }, 1800);
      }
    } catch (err: any) {
      setReportError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
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
    if (!isPaidMember) {
      setShowUpgradeModal(true);
      return;
    }
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
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
              Candidate ID: {candidateId}
            </span>
          </div>
        </div>

        {/* ── Public Visitor Notice Banner ── */}
        {!profile.isAuthenticatedViewer && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50/50 to-rose-50 border border-rose-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E51F3E]">
                <Lock className="w-3.5 h-3.5" />
                <span>Limited Public Preview</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Sign in or create your free profile to view more member details.
              </h3>
              <p className="text-xs text-slate-600">
                Candidate's full name, verification badge, and direct matrimonial communication are reserved for registered community members.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href={`/login?redirect=/profile/${id}`}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-rose-300 hover:text-[#E51F3E] rounded-xl shadow-2xs transition cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] hover:bg-[#ce102f] rounded-xl shadow-2xs hover:shadow-xs transition cursor-pointer"
              >
                Create Free Profile
              </Link>
            </div>
          </div>
        )}

        {/* ── Top Header Hero Card ── */}
        <section className="rounded-3xl bg-white p-6 sm:p-8 border border-rose-100/90 shadow-sm overflow-hidden text-left">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center">
            {/* Primary Photo Section */}
            <div className="w-full sm:w-80 lg:w-72 shrink-0 space-y-3">
              <div className="relative w-full h-80 sm:h-84 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-100 shadow-xs border-2 border-rose-100/60">
                {selectedPhoto ? (
                  <img
                    src={selectedPhoto}
                    alt={displayName}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <DoctorAvatar
                    photoUrl={null}
                    name={displayName}
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
                  {profile.isAuthenticatedViewer ? displayName : `Candidate ID: ${candidateId}`}
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
                  isPaidMember ? (
                    <button
                      type="button"
                      onClick={handleStartChat}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-600/20 hover:-translate-y-0.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Start Chat</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 text-xs sm:text-sm font-bold transition shadow-md shadow-amber-500/20 hover:-translate-y-0.5 cursor-pointer"
                      title="Chat is available for paid members only"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Chat 🔒</span>
                      <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Upgrade</span>
                    </button>
                  )
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
                </button>

                {/* Safety Actions: Block & Report */}
                {!isMyOwnProfile && (
                  <div className="flex items-center gap-2">
                    {isBlocked ? (
                      <button
                        type="button"
                        disabled={blockLoading}
                        onClick={handleUnblockProfile}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-3 text-xs sm:text-sm font-bold transition cursor-pointer"
                        title="Unblock this profile"
                      >
                        {blockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        <span>Unblock</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBlockModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 px-4 py-3 text-xs sm:text-sm font-semibold transition cursor-pointer"
                        title="Block this profile"
                      >
                        <Ban className="w-4 h-4 text-slate-400" />
                        <span>Block Profile</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReportError(null);
                        setReportSuccess(false);
                        setReportModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-[#E51F3E] px-4 py-3 text-xs sm:text-sm font-semibold transition cursor-pointer"
                      title="Report this profile confidentially"
                    >
                      <Flag className="w-4 h-4 text-slate-400" />
                      <span>Report Profile</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Detailed Profile Information Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 text-left">
          {/* Main 2-column info */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* About Me */}
            <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-3">
              <h2 className="font-serif text-lg font-bold text-[#101828] flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-4.5 h-4.5 text-[#E51F3E]" />
                <span>About {profile.isAuthenticatedViewer ? displayName : `Candidate ${candidateId}`}</span>
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {profile.about ||
                  `${profile.isAuthenticatedViewer ? displayName : `Candidate ${candidateId}`} is a verified professional on Wonderful Jodi seeking a compatible life partner who shares similar family values, mutual respect, and life ambitions.`}
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
                  <span>Match Kundali with {profile.isAuthenticatedViewer ? (displayName || '').split(' ')[0] : candidateId} →</span>
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
      </div>

      {/* ── Report Profile Modal ── */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-150 text-left">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-rose-50 via-white to-amber-50/40 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-[#E51F3E] flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">Report Profile</h3>
                  <p className="text-xs text-slate-500">Confidential report to Wonderful Jodi Trust & Safety</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
              {reportSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-slate-900">Report Submitted</h4>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                    Thank you for helping keep Wonderful Jodi safe. Our Trust & Safety team will review this doctor profile thoroughly. Your identity is 100% confidential.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[12px] text-amber-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Strictly Anonymous:</strong> The reported member will never know who submitted this report.
                    </span>
                  </div>

                  {reportError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{reportError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Reason <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedReportReason}
                      onChange={(e) => setSelectedReportReason(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
                    >
                      <option value="">-- Choose a reason --</option>
                      {REPORT_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Additional Details & Evidence
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {reportDescription.length} / 1000
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Please provide any specific information or context (e.g. mismatched medical council registration, suspicious demands, impersonation)..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={reportSubmitting}
                      onClick={() => setReportModalOpen(false)}
                      className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportSubmitting || !selectedReportReason}
                      className="px-6 py-2.5 rounded-full bg-[#E51F3E] hover:bg-[#CC1432] text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {reportSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Flag className="w-3.5 h-3.5" />
                          <span>Submit Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Block Profile Confirmation Modal ── */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden animate-in fade-in zoom-in duration-150 text-left">
            <div className="p-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Ban className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  Block {displayName}?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to block this profile?
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800">When you block this profile:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>They will no longer appear in your search results.</li>
                  <li>They cannot message you or view your updates.</li>
                  <li>They will not be recommended to you.</li>
                  <li>You can unblock them at any time from your Account Settings.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={blockLoading}
                  onClick={() => setBlockModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={blockLoading}
                  onClick={handleBlockProfile}
                  className="px-6 py-2.5 rounded-full bg-[#E51F3E] hover:bg-[#CC1432] text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {blockLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Blocking...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Paid Chat Upgrade Modal ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 space-y-5 text-center relative animate-scale-up">
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-md shadow-amber-500/30">
              <Crown className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-xl font-bold text-slate-900">
                Paid Membership Required
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chat is available for paid members. Upgrade your membership to start chatting with your accepted matches.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left space-y-1.5 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Premium Matchmaking Benefits:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11.5px] text-amber-800 pl-1">
                <li>Direct unlimited messaging with accepted matches</li>
                <li>Direct contact details request and phone unlocking</li>
                <li>Priority doctor profile matching recommendations</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <Link
                href="/membership"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] text-white text-xs font-bold shadow-md shadow-red-600/25 hover:shadow-lg transition text-center inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade Membership</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
