'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Send,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { fetchMemberReferrals, MemberReferralDashboardData } from '../../services/referralApi';
import { getAuthToken } from '../../lib/api';

export default function MemberReferralPage() {
  const router = useRouter();
  const [data, setData] = useState<MemberReferralDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/referrals');
      return;
    }

    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMemberReferrals();
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load referral dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const referralCode = data?.referralCode || 'WJ-MEMBER';
  const referralUrl = `${origin || 'https://wonderfuljodi.com'}/register?ref=${referralCode}`;

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedCode(text);
        setTimeout(() => setCopiedCode(null), 2500);
      }
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello Doctor! Join me on Wonderful Jodi, the premier matrimonial platform exclusively for medical professionals.\n\nRegister securely with my referral invite:\n${referralUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Invitation to join Wonderful Jodi Doctor Matrimony');
    const body = encodeURIComponent(
      `Hi,\n\nI invite you to explore Wonderful Jodi, a verified matrimonial platform dedicated to doctors and medical specialists.\n\nSign up with my personal invite link:\n${referralUrl}\n\nCandidate ID: ${referralCode}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaLinkedIn = () => {
    const url = encodeURIComponent(referralUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareViaFacebook = () => {
    const url = encodeURIComponent(referralUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading your referral rewards...</span>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] py-12 px-4 sm:px-6 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Referral Dashboard</h2>
          <p className="text-sm text-slate-600">{error || 'Unable to load data.'}</p>
          <button
            onClick={loadDashboard}
            className="px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { stats, config, rewards, referrals } = data;
  const threshold = config.threshold;
  const currentCount = stats.qualifiedCount;

  return (
    <main className="min-h-screen bg-[#FAF7F4] text-[#111827] pb-16">
      {/* ── Hero Header ── */}
      <section className="bg-white border-b border-rose-100/60 py-10 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-5xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[#E51F3E] text-xs font-bold">
            <Gift className="w-3.5 h-3.5" />
            <span>Referral & Rewards Hub</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-slate-900">
            Invite Doctor Colleagues, Unlock Exclusive Rewards
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Share Wonderful Jodi with fellow doctors. When your invited colleagues register, earn membership coupons, discounts, and bonus profile access.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Referral Link & Code Card ── */}
        <div className="bg-white rounded-2xl border border-rose-100/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Your Unique Candidate ID</span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900 mt-0.5">{referralCode}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Referral Link</span>
              </span>
            </div>
          </div>

          {/* Shareable URL Input Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Your Shareable Registration Link</label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-800 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(referralUrl, 'link')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Social Channels */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-600 mr-1">Direct Share:</span>
            <button
              onClick={shareViaWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
            >
              <span>WhatsApp</span>
            </button>
            <button
              onClick={shareViaEmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              <span>Email</span>
            </button>
            <button
              onClick={shareViaLinkedIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
            >
              <span>LinkedIn</span>
            </button>
            <button
              onClick={shareViaFacebook}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
            >
              <span>Facebook</span>
            </button>
          </div>
        </div>

        {/* ── Referral Progress Card ── */}
        <div className="bg-white rounded-2xl border border-rose-100/80 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Milestone Progress</h2>
              <p className="text-xs text-slate-500">
                Reward qualification trigger: {config.qualificationEvent.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#E51F3E]">
                {currentCount} / {threshold}
              </span>
              <span className="text-xs text-slate-500 ml-1.5">Successful Referrals</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="bg-gradient-to-r from-[#E51F3E] to-rose-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>

          {/* Motivational Message */}
          <div className="flex items-center justify-between text-xs">
            {stats.remainingNeeded > 0 ? (
              <span className="font-semibold text-rose-700">
                Refer {stats.remainingNeeded} more doctor {stats.remainingNeeded === 1 ? 'colleague' : 'colleagues'} to unlock your next reward!
              </span>
            ) : (
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Referral reward milestone unlocked! Check your coupons below.</span>
              </span>
            )}
            <span className="text-slate-500 font-mono">{stats.progressPercentage}% Complete</span>
          </div>
        </div>

        {/* ── Unlocked Reward Coupons Section ── */}
        <div className="bg-white rounded-2xl border border-rose-100/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">My Reward Coupons</h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{rewards.length} Unlocked</span>
          </div>

          {rewards.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
                <Gift className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">No reward coupons unlocked yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Share your personal link with colleagues. As soon as {threshold} doctor candidates complete registration, your reward coupon will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border-2 border-dashed border-rose-200 bg-[#FFF9FA] p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#E51F3E]">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Milestone {rec.milestone} Reward</span>
                      </div>
                      <div className="text-lg font-black text-slate-900 font-mono tracking-wider mt-1">
                        {rec.couponCode}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {rec.rewardValue}% Discount on Membership Plans
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rec.status === 'USED'
                          ? 'bg-slate-200 text-slate-700'
                          : rec.isExpired
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {rec.status === 'USED' ? 'Redeemed' : rec.isExpired ? 'Expired' : 'Available'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-rose-100 text-[11px] text-slate-500">
                    <span>
                      Expires:{' '}
                      {new Date(rec.expiryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {rec.status !== 'USED' && !rec.isExpired && (
                      <button
                        onClick={() => copyToClipboard(rec.couponCode, 'code')}
                        className="font-bold text-[#E51F3E] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode === rec.couponCode ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Referred Candidates List Table ── */}
        <div className="bg-white rounded-2xl border border-rose-100/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Invited Colleagues History</h2>
            <span className="text-xs text-slate-500 font-mono">{referrals.length} total</span>
          </div>

          {referrals.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No colleagues have registered using your invite link yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Colleague</th>
                    <th className="py-2.5 px-3">Candidate ID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Reward State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-800">{r.candidateName}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{r.candidateId}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(r.registeredAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold ${
                            r.status === 'QUALIFIED' || r.status === 'REWARDED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-600">{r.rewardStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
