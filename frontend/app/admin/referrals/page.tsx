'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  Users,
  Gift,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  Tag,
  ArrowRight,
  ExternalLink,
  Award,
  Clock,
  ChevronRight,
  Eye,
  Settings,
} from 'lucide-react';
import {
  ReferralAdminItem,
  fetchAdminReferrals,
  ReferralStats,
} from '../../../services/referralApi';

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralAdminItem[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<ReferralAdminItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminReferrals(statusFilter !== 'ALL' ? statusFilter : undefined);
      setReferrals(res?.referrals || []);
      setStats(res?.stats || null);
    } catch (err) {
      console.error('Failed to load admin referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const filteredReferrals = referrals.filter((r) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.referrerName && r.referrerName.toLowerCase().includes(q)) ||
      (r.referrerCandidateId && r.referrerCandidateId.toLowerCase().includes(q)) ||
      (r.referredName && r.referredName.toLowerCase().includes(q)) ||
      (r.referredCandidateId && r.referredCandidateId.toLowerCase().includes(q)) ||
      (r.referralCode && r.referralCode.toLowerCase().includes(q)) ||
      (r.rewardCouponCode && r.rewardCouponCode.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#E51F3E]">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              Referral Program & Member Attribution
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Track peer invitations, qualification milestones, anti-abuse checks, and reward coupon issuance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/referral-rewards"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span>Reward Configuration</span>
          </Link>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards (Part 24) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Referrals</span>
          <span className="text-xl font-black text-slate-900 mt-1 font-serif block">{stats?.totalReferrals || 0}</span>
          <span className="text-[10px] text-slate-500">All invite tracking links</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Registrations</span>
          <span className="text-xl font-black text-blue-700 mt-1 font-serif block">{stats?.totalRegistered || 0}</span>
          <span className="text-[10px] text-slate-500">Completed Page 1+</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Qualified</span>
          <span className="text-xl font-black text-emerald-700 mt-1 font-serif block">{stats?.totalQualified || 0}</span>
          <span className="text-[10px] text-slate-500">Counted toward milestones</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rewards Issued</span>
          <span className="text-xl font-black text-purple-700 mt-1 font-serif block">{stats?.rewardsIssued || 0}</span>
          <span className="text-[10px] text-slate-500">Unique coupons issued</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rewards Used</span>
          <span className="text-xl font-black text-[#E51F3E] mt-1 font-serif block">{stats?.rewardsUsed || 0}</span>
          <span className="text-[10px] text-slate-500">Redeemed at checkout</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
          <span className="text-xl font-black text-amber-600 mt-1 font-serif block">{stats?.pendingReferrals || 0}</span>
          <span className="text-[10px] text-slate-500">Awaiting qualification</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate ID, referrer, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-rose-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'QUALIFIED', 'REGISTERED', 'REWARDED', 'CLICKED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Referrals Table */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E51F3E]" />
          <p className="text-xs font-bold">Loading referrals log...</p>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <Share2 className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No referral records match filter</h3>
          <p className="text-xs text-slate-400">Share links from member dashboard to track live registrations.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Referrer Candidate</th>
                  <th className="py-3 px-4">Referral Code</th>
                  <th className="py-3 px-4">Referred Candidate</th>
                  <th className="py-3 px-4">Timestamps</th>
                  <th className="py-3 px-4">Attribution Status</th>
                  <th className="py-3 px-4">Reward Coupon</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredReferrals.map((r) => {
                  const statusColor =
                    r.status === 'QUALIFIED' || r.status === 'REWARDED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : r.status === 'REGISTERED'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : r.status === 'REJECTED'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.referrerName}</div>
                        <div className="text-[11px] font-mono text-[#E51F3E]">
                          {r.referrerCandidateId}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {r.referralCode}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {r.referredName ? (
                          <>
                            <div className="font-bold text-slate-900">{r.referredName}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {r.referredCandidateId}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Click Only / Not Registered</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <div>
                          Reg:{' '}
                          <strong className="text-slate-800">
                            {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString('en-IN') : 'Pending'}
                          </strong>
                        </div>
                        {r.qualifiedAt && (
                          <div className="text-emerald-700 text-[10px]">
                            Qual: {new Date(r.qualifiedAt).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusColor}`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {r.rewardCouponCode ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                              {r.rewardCouponCode}
                            </span>
                            <span className="text-[10px] text-slate-500">({r.rewardStatus})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Threshold not reached</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReferral(r)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Inspection Modal (Part 49) */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#E51F3E]">
                <Share2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Referral Attribution Details</h3>
              </div>
              <button
                onClick={() => setSelectedReferral(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Referrer Section */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  REFERRER MEMBER
                </span>
                <div className="font-bold text-slate-900 text-sm">{selectedReferral.referrerName}</div>
                <div className="text-slate-600">
                  Candidate ID: <strong>{selectedReferral.referrerCandidateId}</strong> | Referral Code:{' '}
                  <strong>{selectedReferral.referralCode}</strong>
                </div>
              </div>

              {/* Referred Candidate Section */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  REFERRED CANDIDATE
                </span>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedReferral.referredName || 'Click only / Incomplete registration'}
                </div>
                {selectedReferral.referredCandidateId && (
                  <div className="text-slate-600">
                    Candidate ID: <strong>{selectedReferral.referredCandidateId}</strong>
                  </div>
                )}
              </div>

              {/* Timeline & Audit Section */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-600">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  AUDIT TIMELINE & STATUS
                </span>
                <div>Status: <strong className="text-slate-900">{selectedReferral.status}</strong></div>
                <div>
                  Link Clicked:{' '}
                  <strong>
                    {selectedReferral.clickedAt
                      ? new Date(selectedReferral.clickedAt).toLocaleString('en-IN')
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  Registration Completed:{' '}
                  <strong>
                    {selectedReferral.registeredAt
                      ? new Date(selectedReferral.registeredAt).toLocaleString('en-IN')
                      : 'Not Registered'}
                  </strong>
                </div>
                <div>
                  Qualification Completed:{' '}
                  <strong>
                    {selectedReferral.qualifiedAt
                      ? new Date(selectedReferral.qualifiedAt).toLocaleString('en-IN')
                      : 'Not Qualified'}
                  </strong>
                </div>
              </div>

              {/* Reward Coupon Section */}
              {selectedReferral.rewardCouponCode && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1 text-purple-900">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    REWARD COUPON ISSUED
                  </span>
                  <div className="font-mono text-sm font-bold">{selectedReferral.rewardCouponCode}</div>
                  <div>Reward Status: <strong>{selectedReferral.rewardStatus}</strong></div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
