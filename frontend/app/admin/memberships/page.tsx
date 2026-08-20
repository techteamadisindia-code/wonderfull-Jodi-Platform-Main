'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Crown,
  Sparkles,
  RefreshCw,
  Edit,
  X,
  CheckCircle2,
  Calendar,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import {
  fetchMemberships,
  updateMembership,
  SubscriptionItem
} from '../../../services/membershipApi';

export default function AdminMembershipsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit Modal State
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMemberships({
        plan: planFilter,
        status: statusFilter,
      });
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Failed to load memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [planFilter, statusFilter]);

  const handleOpenEdit = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setEditPlan(sub.plan);
    setEditStatus(sub.status);
    setEditExpiry(sub.expiryDate ? new Date(sub.expiryDate).toISOString().split('T')[0] : '');
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setSaving(true);
    try {
      const updated = await updateMembership(editingSub._id, {
        plan: editPlan,
        status: editStatus,
        expiryDate: editExpiry ? new Date(editExpiry).toISOString() : undefined,
      });
      setSubscriptions((prev) =>
        prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s))
      );
      setEditingSub(null);
      setNotice('Membership plan updated successfully!');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Failed to update membership:', err);
    } finally {
      setSaving(false);
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'PREMIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PREMIUM_VIP':
        return 'bg-purple-100 text-purple-800 border-purple-200 font-extrabold';
      case 'VVIP':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Membership Plans & Subscriptions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage subscriber tiers, manual upgrades, concierge extensions, and expiration dates
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Subscriptions</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">Plan Tier:</span>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="ALL">All Membership Tiers</option>
            <option value="FREE">Free Plan</option>
            <option value="PREMIUM">Premium (3 Months)</option>
            <option value="PREMIUM_VIP">Premium VIP (6 Months)</option>
            <option value="VVIP">VVIP Concierge</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Subscriber</th>
                <th className="py-3.5 px-5">Membership Tier</th>
                <th className="py-3.5 px-5">Subscription Status</th>
                <th className="py-3.5 px-5">Start Date</th>
                <th className="py-3.5 px-5">Valid Until</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No membership records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{sub.user?.fullName || 'Doctor User'}</p>
                      <p className="text-[11px] text-slate-500">{sub.user?.email || 'N/A'}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] border ${getPlanBadge(sub.plan)}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {new Date(sub.startDate).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-slate-800 font-semibold">
                      {sub.expiryDate
                        ? new Date(sub.expiryDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Lifetime Access'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 transition"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                        <span>Manage Plan</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Membership Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Membership Plan</h3>
                <p className="text-xs text-slate-500">{editingSub.user?.fullName} ({editingSub.user?.email})</p>
              </div>
              <button
                onClick={() => setEditingSub(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Tier</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="FREE">Free Plan</option>
                  <option value="PREMIUM">Premium (₹4,999)</option>
                  <option value="PREMIUM_VIP">Premium VIP (₹9,999)</option>
                  <option value="VVIP">VVIP Concierge</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subscription Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20"
                >
                  {saving ? 'Updating...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
