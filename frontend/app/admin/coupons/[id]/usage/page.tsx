'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Tag,
  ArrowLeft,
  Receipt,
  Users,
  Calendar,
  DollarSign,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { fetchCouponUsage, CouponUsageData } from '../../../../services/couponApi';

export default function CouponUsagePage() {
  const params = useParams();
  const router = useRouter();
  const couponId = params?.id as string;

  const [data, setData] = useState<CouponUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');

  const loadUsage = async () => {
    if (!couponId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCouponUsage(couponId);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load coupon usage analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, [couponId]);

  const coupon = data?.coupon;
  const stats = data?.stats;
  const redemptions = data?.redemptions || [];

  const filteredRedemptions = redemptions.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (r.memberName && r.memberName.toLowerCase().includes(q)) ||
      (r.candidateId && r.candidateId.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.orderId && r.orderId.toLowerCase().includes(q));
    const matchesPlan = planFilter === 'ALL' || r.planKey === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/coupons"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-2xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              Coupon Redemption Audit Ledger
            </h1>
            {coupon && (
              <span className="font-mono text-sm font-bold uppercase tracking-wider bg-rose-50 border border-rose-200 text-[#E51F3E] px-2.5 py-0.5 rounded-lg">
                {coupon.couponCode}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Atomic financial transaction log for all member claims and discount redemptions.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E51F3E]" />
          <p className="text-xs font-bold">Loading redemption transactions...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 max-w-md mx-auto text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <div className="text-sm font-bold text-rose-900">{error}</div>
          <button
            onClick={loadUsage}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards (Part 12) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claims</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-serif">
                {stats?.totalRedemptions || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Limit: {coupon?.usageLimit || 'Unlimited'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining Uses</span>
                <Tag className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-serif">
                {stats?.remainingUses !== undefined ? stats.remainingUses : '∞'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Per Member Limit: {coupon?.perMemberLimit || 1}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discount Given</span>
                <DollarSign className="w-4 h-4 text-[#E51F3E]" />
              </div>
              <div className="text-2xl font-black text-[#E51F3E] mt-2 font-serif">
                ₹{stats?.totalDiscountGiven?.toLocaleString('en-IN') || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Total savings granted to members
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Status</span>
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm font-bold text-slate-900 mt-2">
                {coupon?.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString('en-IN') : 'No Expiry'}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 mt-1">
                Status: {coupon?.status}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate ID, name, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Membership Plans</option>
                <option value="DOCTOR_CONNECT">Doctor Connect</option>
                <option value="PREMIUM_MATCH">Premium Match</option>
                <option value="EXCLUSIVE_CONCIERGE">Exclusive Concierge</option>
              </select>

              <button
                onClick={loadUsage}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Refresh Ledger"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Usage Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-4">Member / Candidate</th>
                    <th className="py-3 px-4">Plan Purchased</th>
                    <th className="py-3 px-4">Original Price</th>
                    <th className="py-3 px-4">Discount Applied</th>
                    <th className="py-3 px-4">Final Amount</th>
                    <th className="py-3 px-4">Redeemed At</th>
                    <th className="py-3 px-4">Payment Reference</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredRedemptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No redemptions recorded for this coupon yet.
                      </td>
                    </tr>
                  ) : (
                    filteredRedemptions.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{r.memberName || 'Candidate'}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {r.candidateId || 'N/A'} • {r.email}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {r.planKey?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-400 line-through">
                          ₹{r.originalAmount?.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 font-bold text-[#E51F3E]">
                          -₹{r.discountAmount?.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          ₹{r.finalAmount?.toLocaleString('en-IN')}{' '}
                          {r.finalAmount === 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              FREE
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-600">
                          {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : 'N/A'}
                        </td>

                        <td className="py-3 px-4 text-[11px] font-mono text-slate-500">
                          <div>Pay: {r.paymentId || 'N/A'}</div>
                          <div>Ord: {r.orderId || 'N/A'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {r.status || 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
