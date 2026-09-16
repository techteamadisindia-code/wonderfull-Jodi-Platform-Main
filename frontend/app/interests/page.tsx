'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Lock,
  Crown,
  ShieldCheck,
  MapPin,
  GraduationCap,
  Briefcase,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import {
  fetchReceivedInterests,
  fetchSentInterests,
  fetchAcceptedConnections,
  acceptInterest,
  rejectInterest,
  InterestItem,
} from '../../services/interestApi';
import { fetchMySubscription, UserSubscriptionDetails } from '../../services/membershipApi';
import { getAuthToken } from '../../lib/api';
import { DoctorAvatar } from '../../components/DoctorAvatar';

function getAge(dob?: string | Date) {
  if (!dob) return 28;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 28;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export default function InterestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'received';

  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'accepted' | 'rejected'>(
    ['received', 'sent', 'accepted', 'rejected'].includes(initialTab)
      ? (initialTab as any)
      : 'received'
  );

  const [receivedList, setReceivedList] = useState<InterestItem[]>([]);
  const [sentList, setSentList] = useState<InterestItem[]>([]);
  const [acceptedList, setAcceptedList] = useState<InterestItem[]>([]);
  const [rejectedList, setRejectedList] = useState<InterestItem[]>([]);

  const [subscription, setSubscription] = useState<UserSubscriptionDetails | null>(null);
  const [isPaidMember, setIsPaidMember] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 1. Check Auth & Load Membership
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/interests');
      return;
    }

    fetchMySubscription()
      .then((sub) => {
        setSubscription(sub);
        // Paid if active and plan is not free
        const isPaid =
          sub?.status === 'ACTIVE' &&
          sub.planKey !== 'FREE' &&
          sub.slug !== 'free' &&
          (!sub.expiryDate || new Date(sub.expiryDate) > new Date());
        setIsPaidMember(Boolean(isPaid));
      })
      .catch(() => {
        setIsPaidMember(false);
      });
  }, [router]);

  // 2. Load Interests Data
  const loadAllInterests = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [received, sent, accepted] = await Promise.all([
        fetchReceivedInterests(),
        fetchSentInterests(),
        fetchAcceptedConnections(),
      ]);

      setReceivedList(received.filter((i) => i.status === 'PENDING'));
      setSentList(sent);
      setAcceptedList(accepted);

      // Rejected list combines received rejected and sent rejected/declined
      const allRejected = [
        ...received.filter((i) => i.status === 'REJECTED' || i.status === 'DECLINED'),
        ...sent.filter((i) => i.status === 'REJECTED' || i.status === 'DECLINED'),
      ];
      setRejectedList(allRejected);
    } catch (err) {
      console.error('Failed to load interests:', err);
      setFeedback({ text: 'Unable to load interest requests. Please refresh.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllInterests();
  }, [loadAllInterests]);

  // Handle Accept
  const handleAccept = async (interestId: string) => {
    setActionLoadingId(interestId);
    setFeedback(null);
    try {
      await acceptInterest(interestId);
      setFeedback({
        text: 'Interest accepted successfully! You are now connected.',
        type: 'success',
      });
      await loadAllInterests();
    } catch (err: any) {
      console.error('Error accepting interest:', err);
      setFeedback({
        text: err.response?.data?.message || 'Failed to accept interest. Please try again.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject
  const handleReject = async (interestId: string) => {
    setActionLoadingId(interestId);
    setFeedback(null);
    try {
      await rejectInterest(interestId);
      setFeedback({ text: 'Interest declined.', type: 'success' });
      await loadAllInterests();
    } catch (err: any) {
      console.error('Error rejecting interest:', err);
      setFeedback({
        text: err.response?.data?.message || 'Failed to reject interest. Please try again.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Chat Click on Accepted Connection
  const handleChatClick = (otherUserId?: string, otherProfileId?: string) => {
    if (!isPaidMember) {
      setShowUpgradeModal(true);
      return;
    }
    if (otherUserId) {
      router.push(`/messages?user=${otherUserId}&profile=${otherProfileId || ''}`);
    } else {
      router.push('/messages');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-[#FFFDFB] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title & Membership Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-[#E51F3E] text-xs font-bold mb-2">
              <Heart className="w-3.5 h-3.5 fill-[#E51F3E]" />
              <span>Doctor Matrimony Interest Center</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Express & Mutual Interests
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage doctor proposals, review incoming connections, and initiate verified chats
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isPaidMember ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <Crown className="w-4 h-4 text-emerald-600" />
                <span>Paid Member • Chat Unlocked</span>
              </div>
            ) : (
              <Link
                href="/membership"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade to Paid for Chat</span>
              </Link>
            )}

            <button
              onClick={loadAllInterests}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
              title="Refresh interests"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'received'
                ? 'bg-[#E51F3E] text-white shadow-sm shadow-red-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>Received</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === 'received' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {receivedList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'sent'
                ? 'bg-[#E51F3E] text-white shadow-sm shadow-red-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>Sent</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === 'sent' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {sentList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accepted')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'accepted'
                ? 'bg-[#E51F3E] text-white shadow-sm shadow-red-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>Accepted ({acceptedList.length})</span>
            {acceptedList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'rejected'
                ? 'bg-[#E51F3E] text-white shadow-sm shadow-red-600/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>Declined / Rejected ({rejectedList.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#E51F3E] animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading doctor interests...</p>
          </div>
        ) : (
          <div>
            {/* 1. RECEIVED TAB */}
            {activeTab === 'received' && (
              <div className="space-y-4">
                {receivedList.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-3xl border border-rose-100/70 p-8 space-y-3">
                    <Heart className="w-10 h-10 text-rose-300 mx-auto" />
                    <h3 className="font-serif text-lg font-bold text-slate-800">
                      No pending received interests
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      When prospective doctors express interest in your profile, their requests will appear here for you to accept or reject.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {receivedList.map((interest) => {
                      const profile = interest.senderProfile;
                      const sender = interest.sender as any;
                      const name = profile?.displayName || sender?.fullName || 'Doctor Candidate';
                      const age = getAge(profile?.dob);
                      const loc = profile?.city || profile?.state || 'India';
                      const degree = profile?.degree || profile?.education || 'MBBS';
                      const spec = profile?.profession || profile?.specialization || 'Doctor';
                      const profileId = profile?._id || profile?.user;

                      return (
                        <div
                          key={interest._id}
                          className="bg-white rounded-2xl border border-slate-200/90 hover:border-rose-200 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                              {profile?.primaryPhoto ? (
                                <img
                                  src={profile.primaryPhoto}
                                  alt={name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <DoctorAvatar name={name} className="w-full h-full rounded-none" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                                  {name}
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md shrink-0">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              </div>

                              <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                                <p className="flex items-center gap-1.5 truncate">
                                  <GraduationCap className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                                  <span className="font-semibold text-slate-800">{degree}</span>
                                  <span>•</span>
                                  <span className="truncate">{spec}</span>
                                </p>
                                <p className="flex items-center gap-1.5 text-slate-500 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{age} Yrs</span>
                                  <span>•</span>
                                  <span className="truncate">{loc}</span>
                                </p>
                              </div>

                              <p className="text-[11px] text-slate-400 mt-2">
                                Received on {formatDate(interest.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Actions: View Profile, Accept, Reject */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            {profileId ? (
                              <Link
                                href={`/profile/${profileId}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-[#E51F3E] transition"
                              >
                                <span>View Profile</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <div />
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={actionLoadingId === interest._id}
                                onClick={() => handleAccept(interest._id)}
                                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {actionLoadingId === interest._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Accept</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionLoadingId === interest._id}
                                onClick={() => handleReject(interest._id)}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. SENT TAB */}
            {activeTab === 'sent' && (
              <div className="space-y-4">
                {sentList.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-3xl border border-rose-100/70 p-8 space-y-3">
                    <Heart className="w-10 h-10 text-rose-300 mx-auto" />
                    <h3 className="font-serif text-lg font-bold text-slate-800">
                      No sent interests yet
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Explore verified doctor profiles and click &quot;Send Interest&quot; to connect with matches for free.
                    </p>
                    <Link
                      href="/search"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E51F3E] text-white text-xs font-bold shadow-xs hover:bg-[#C9132F] transition"
                    >
                      <span>Browse Doctor Profiles</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sentList.map((interest) => {
                      const profile = interest.receiverProfile;
                      const receiver = interest.receiver as any;
                      const name = profile?.displayName || receiver?.fullName || 'Doctor Candidate';
                      const age = getAge(profile?.dob);
                      const loc = profile?.city || profile?.state || 'India';
                      const degree = profile?.degree || profile?.education || 'MBBS';
                      const spec = profile?.profession || profile?.specialization || 'Doctor';
                      const profileId = profile?._id || profile?.user;

                      const statusColors: Record<string, string> = {
                        PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
                        ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        DECLINED: 'bg-slate-100 text-slate-600 border-slate-200',
                        REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
                      };

                      return (
                        <div
                          key={interest._id}
                          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                              {profile?.primaryPhoto ? (
                                <img
                                  src={profile.primaryPhoto}
                                  alt={name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <DoctorAvatar name={name} className="w-full h-full rounded-none" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                                  {name}
                                </h4>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                                    statusColors[interest.status] || 'bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {interest.status === 'ACCEPTED'
                                    ? 'Accepted'
                                    : interest.status === 'REJECTED' || interest.status === 'DECLINED'
                                    ? 'Declined'
                                    : 'Pending'}
                                </span>
                              </div>

                              <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                                <p className="flex items-center gap-1.5 truncate">
                                  <GraduationCap className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                                  <span className="font-semibold text-slate-800">{degree}</span>
                                  <span>•</span>
                                  <span className="truncate">{spec}</span>
                                </p>
                                <p className="flex items-center gap-1.5 text-slate-500 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{age} Yrs</span>
                                  <span>•</span>
                                  <span className="truncate">{loc}</span>
                                </p>
                              </div>

                              <p className="text-[11px] text-slate-400 mt-2">
                                Sent on {formatDate(interest.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            {profileId ? (
                              <Link
                                href={`/profile/${profileId}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-[#E51F3E] transition"
                              >
                                <span>View Profile</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <div />
                            )}

                            {interest.status === 'ACCEPTED' && (
                              <button
                                type="button"
                                onClick={() => handleChatClick(receiver?._id, profileId)}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                                  isPaidMember
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
                                }`}
                              >
                                {isPaidMember ? (
                                  <>
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Start Chat</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Chat 🔒 (Upgrade)</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. ACCEPTED CONNECTIONS TAB */}
            {activeTab === 'accepted' && (
              <div className="space-y-4">
                {acceptedList.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-3xl border border-rose-100/70 p-8 space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h3 className="font-serif text-lg font-bold text-slate-800">
                      No accepted connections yet
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Once you or another prospective candidate accepts an interest, your verified doctor connection will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acceptedList.map((interest) => {
                      const otherUser = interest.otherUser || (interest.isSender ? interest.receiver : interest.sender);
                      const otherProfile = interest.otherProfile || (interest.isSender ? interest.receiverProfile : interest.senderProfile);
                      const name = otherProfile?.displayName || otherUser?.fullName || 'Doctor Match';
                      const age = getAge(otherProfile?.dob);
                      const loc = otherProfile?.city || otherProfile?.state || 'India';
                      const degree = otherProfile?.degree || otherProfile?.education || 'MBBS';
                      const spec = otherProfile?.profession || otherProfile?.specialization || 'Doctor';
                      const profileId = otherProfile?._id || otherProfile?.user;
                      const targetUserId = otherUser?._id || otherUser;

                      return (
                        <div
                          key={interest._id}
                          className="bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-300 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-emerald-200">
                              {otherProfile?.primaryPhoto ? (
                                <img
                                  src={otherProfile.primaryPhoto}
                                  alt={name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <DoctorAvatar name={name} className="w-full h-full rounded-none" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate flex items-center gap-1.5">
                                  <span>{name}</span>
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                </h4>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                  <span>Connected ✓</span>
                                </span>
                              </div>

                              <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                                <p className="flex items-center gap-1.5 truncate">
                                  <GraduationCap className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                                  <span className="font-semibold text-slate-800">{degree}</span>
                                  <span>•</span>
                                  <span className="truncate">{spec}</span>
                                </p>
                                <p className="flex items-center gap-1.5 text-slate-500 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{age} Yrs</span>
                                  <span>•</span>
                                  <span className="truncate">{loc}</span>
                                </p>
                              </div>

                              <p className="text-[11px] text-slate-400 mt-2">
                                Connected since {formatDate(interest.updatedAt || interest.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            {profileId ? (
                              <Link
                                href={`/profile/${profileId}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-[#E51F3E] transition"
                              >
                                <span>View Profile</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <div />
                            )}

                            {isPaidMember ? (
                              <button
                                type="button"
                                onClick={() => handleChatClick(targetUserId, profileId)}
                                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Start Chat</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowUpgradeModal(true)}
                                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition shadow-2xs cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Chat 🔒 Upgrade</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. REJECTED TAB */}
            {activeTab === 'rejected' && (
              <div className="space-y-4">
                {rejectedList.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-3xl border border-rose-100/70 p-8 space-y-3">
                    <XCircle className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-serif text-lg font-bold text-slate-800">
                      No declined interests
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Interests that were declined by you or the candidate will be listed here for record keeping.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rejectedList.map((interest) => {
                      const profile = interest.senderProfile || interest.receiverProfile;
                      const sender = interest.sender as any;
                      const receiver = interest.receiver as any;
                      const name =
                        profile?.displayName ||
                        sender?.fullName ||
                        receiver?.fullName ||
                        'Candidate';
                      const age = getAge(profile?.dob);
                      const loc = profile?.city || profile?.state || 'India';
                      const profileId = profile?._id || profile?.user;

                      return (
                        <div
                          key={interest._id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs opacity-90 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                              {profile?.primaryPhoto ? (
                                <img
                                  src={profile.primaryPhoto}
                                  alt={name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <DoctorAvatar name={name} className="w-full h-full rounded-none" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                                {name}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {age} Yrs • {loc}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Updated on {formatDate(interest.updatedAt || interest.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-bold">
                              Declined
                            </span>
                            {profileId && (
                              <Link
                                href={`/profile/${profileId}`}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                                title="View profile"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upgrade Membership Modal for Free Members */}
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
                  Chat is available for paid members only. Upgrade your membership to start chatting with your accepted matches and exchange verified communications.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left space-y-1.5 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Premium Chat Benefits:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11.5px] text-amber-800 pl-1">
                  <li>Unlimited messaging with all accepted doctors</li>
                  <li>Direct contact requests and verified details</li>
                  <li>Instant real-time message notifications</li>
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
      </div>
    </main>
  );
}
