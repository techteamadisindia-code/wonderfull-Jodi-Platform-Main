'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  Archive,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  Calendar,
  Sparkles,
  ExternalLink,
  Percent,
  PercentCircle,
  Copy,
  Check,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import {
  CouponData,
  fetchAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
} from '../../../services/couponApi';
import { DOCTOR_QUALIFICATIONS } from '../../../lib/doctorConstants';

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%) Discount' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount (₹) Off' },
  { value: 'FREE_100_PERCENT', label: '100% Free Offer' },
];

const PLAN_KEYS = [
  { key: 'ALL', label: 'All Paid Membership Plans' },
  { key: 'DOCTOR_CONNECT', label: 'Doctor Connect (3 Months)' },
  { key: 'PREMIUM_MATCH', label: 'Premium Match (6 Months)' },
  { key: 'EXCLUSIVE_CONCIERGE', label: 'Exclusive Concierge (12 Months)' },
];

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [couponCode, setCouponCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>(50);
  const [applicablePlans, setApplicablePlans] = useState<string[]>(['ALL']);
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState<number | ''>(100);
  const [perMemberLimit, setPerMemberLimit] = useState<number>(1);
  const [minimumMembershipAmount, setMinimumMembershipAmount] = useState<number | ''>('');
  const [newMemberOnly, setNewMemberOnly] = useState(false);
  const [gender, setGender] = useState('Any');
  const [minAge, setMinAge] = useState<number | ''>('');
  const [maxAge, setMaxAge] = useState<number | ''>('');
  const [status, setStatus] = useState('ACTIVE');
  const [canStackWithCampaign, setCanStackWithCampaign] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCoupons(statusFilter !== 'ALL' ? statusFilter : undefined);
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [statusFilter]);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCouponCode('WJ50OFF');
    setName('50% Off Welcome Offer');
    setDescription('Exclusive 50% discount on doctor membership plans.');
    const now = new Date();
    setStartDate(now.toISOString().substring(0, 16));
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setExpiryDate(nextMonth.toISOString().substring(0, 16));
    setDiscountType('PERCENTAGE');
    setDiscountValue(50);
    setApplicablePlans(['ALL']);
    setUsageLimit(100);
    setPerMemberLimit(1);
    setMinimumMembershipAmount('');
    setNewMemberOnly(false);
    setGender('Any');
    setMinAge('');
    setMaxAge('');
    setStatus('ACTIVE');
    setCanStackWithCampaign(false);
    setIsModalOpen(true);
  };

  const openEditModal = (c: CouponData) => {
    setEditingCoupon(c);
    setCouponCode(c.couponCode || '');
    setName(c.name || '');
    setDescription(c.description || '');
    setStartDate(c.startDate ? new Date(c.startDate).toISOString().substring(0, 16) : '');
    setExpiryDate(c.expiryDate ? new Date(c.expiryDate).toISOString().substring(0, 16) : '');
    setDiscountType(c.discountType || 'PERCENTAGE');
    setDiscountValue(c.discountValue ?? 0);
    setApplicablePlans(c.applicablePlans || ['ALL']);
    setUsageLimit(c.usageLimit ?? '');
    setPerMemberLimit(c.perMemberLimit ?? 1);
    setMinimumMembershipAmount(c.minimumMembershipAmount ?? '');
    setNewMemberOnly(Boolean(c.newMemberOnly));
    setGender(c.eligibility?.gender || 'Any');
    setMinAge(c.eligibility?.minAge ?? '');
    setMaxAge(c.eligibility?.maxAge ?? '');
    setStatus(c.status || 'ACTIVE');
    setCanStackWithCampaign(Boolean(c.canStackWithCampaign));
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return showToast('Coupon Code is required', 'error');
    if (!name.trim()) return showToast('Coupon Name is required', 'error');
    if (!startDate || !expiryDate) return showToast('Start and Expiry dates are required', 'error');

    setSaving(true);
    try {
      const payload: Partial<CouponData> = {
        couponCode: couponCode.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        discountType: discountType as any,
        discountValue: discountValue !== '' ? Number(discountValue) : 0,
        applicablePlans,
        startDate,
        expiryDate,
        usageLimit: usageLimit !== '' ? Number(usageLimit) : undefined,
        perMemberLimit: Number(perMemberLimit),
        minimumMembershipAmount: minimumMembershipAmount !== '' ? Number(minimumMembershipAmount) : undefined,
        newMemberOnly,
        eligibility: {
          gender: gender as any,
          minAge: minAge !== '' ? Number(minAge) : undefined,
          maxAge: maxAge !== '' ? Number(maxAge) : undefined,
        },
        status: status as any,
        canStackWithCampaign,
      };

      if (editingCoupon?._id) {
        await updateAdminCoupon(editingCoupon._id, payload);
        showToast('Coupon updated successfully');
      } else {
        await createAdminCoupon(payload);
        showToast('New coupon code created successfully');
      }

      setIsModalOpen(false);
      loadCoupons();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save coupon', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c: CouponData, nextStatus: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') => {
    if (!c._id) return;
    try {
      await updateAdminCoupon(c._id, { status: nextStatus });
      showToast(`Coupon status set to ${nextStatus}`);
      loadCoupons();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update coupon status', 'error');
    }
  };

  const handleDelete = async (c: CouponData) => {
    if (!c._id) return;
    if (!window.confirm(`Are you sure you want to delete coupon code "${c.couponCode}"?`)) return;
    try {
      await deleteAdminCoupon(c._id);
      showToast('Coupon deleted successfully');
      loadCoupons();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete coupon', 'error');
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const codeStr = (c.couponCode || '').toLowerCase();
    const nameStr = (c.name || '').toLowerCase();
    const descStr = (c.description || '').toLowerCase();
    const matchesSearch = !q || codeStr.includes(q) || nameStr.includes(q) || descStr.includes(q);
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notice && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#E51F3E]">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              Coupon Management & Redemption
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Create unique promo codes, set usage limits, track member redemptions, and monitor financial discounts.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-[#E51F3E] hover:bg-[#CC1432] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, name, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-rose-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'PAUSED', 'EXPIRED', 'DRAFT', 'ARCHIVED'].map((st) => (
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
          <button
            onClick={loadCoupons}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Coupons Table / Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E51F3E]" />
          <p className="text-xs font-bold">Loading active coupons...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Tag className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No coupons found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first promotional discount coupon code for matrimonial packages.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432]"
          >
            Create Coupon
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount Value</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Usage & Limits</th>
                  <th className="py-3 px-4">Targeting</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCoupons.map((c) => {
                  const isFree = c.discountType === 'FREE_100_PERCENT' || c.discountValue === 100;
                  const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                  const remainingUses =
                    c.usageLimit !== undefined ? Math.max(0, c.usageLimit - (c.usedCount || 0)) : 'Unlimited';

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900 uppercase tracking-wider bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                            {c.couponCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.couponCode)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy code"
                          >
                            {copiedCode === c.couponCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-1">{c.name}</div>
                        {c.isReferralReward && (
                          <span className="inline-block mt-0.5 text-[9.5px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                            Referral Reward
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${
                            isFree
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-50 text-[#E51F3E] border border-rose-200'
                          }`}
                        >
                          {isFree
                            ? '100% FREE'
                            : c.discountType === 'FIXED_AMOUNT'
                            ? `₹${c.discountValue?.toLocaleString('en-IN')} OFF`
                            : `${c.discountValue}% OFF`}
                        </span>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">
                          {c.applicablePlans?.join(', ')}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        <div>
                          Exp:{' '}
                          <strong className={isExpired ? 'text-rose-600' : 'text-slate-800'}>
                            {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN') : 'Never'}
                          </strong>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Start: {c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN') : 'Immediate'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        <div>
                          Used: <strong className="text-emerald-700">{c.usedCount || 0}</strong> /{' '}
                          {c.usageLimit || '∞'}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Per Member: {c.perMemberLimit || 1}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        <div>Gender: <strong className="text-slate-800">{c.eligibility?.gender || 'Any'}</strong></div>
                        {c.newMemberOnly && (
                          <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                            New Members Only
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : c.status === 'PAUSED'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Usage Ledger Link (Part 12) */}
                          <Link
                            href={`/admin/coupons/${c._id}/usage`}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1"
                            title="View Usage Ledger"
                          >
                            <Receipt className="w-3 h-3 text-slate-500" />
                            <span>Usage</span>
                          </Link>

                          {c.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleToggleStatus(c, 'PAUSED')}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                              title="Pause Coupon"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(c, 'ACTIVE')}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              title="Activate Coupon"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                            title="Edit Coupon"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT COUPON ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#E51F3E]">
                <Tag className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingCoupon ? 'Edit Coupon Code' : 'Create New Coupon'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Coupon Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. WJ50OFF"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-[#E51F3E]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Coupon Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-[#E51F3E]"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              {/* Discount Details */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-[#E51F3E]" />
                  <span>Discount & Rules</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value);
                        if (e.target.value === 'FREE_100_PERCENT') setDiscountValue(100);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {DISCOUNT_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">
                      {discountType === 'PERCENTAGE'
                        ? 'Discount Percentage (%)'
                        : discountType === 'FIXED_AMOUNT'
                        ? 'Fixed Amount (₹)'
                        : 'Value'}
                    </label>
                    <input
                      type="number"
                      disabled={discountType === 'FREE_100_PERCENT'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Applicable Plans</label>
                  <div className="flex flex-wrap gap-2">
                    {PLAN_KEYS.map((pk) => {
                      const isChecked = applicablePlans.includes(pk.key);
                      return (
                        <button
                          key={pk.key}
                          type="button"
                          onClick={() => {
                            if (pk.key === 'ALL') {
                              setApplicablePlans(['ALL']);
                            } else {
                              const withoutAll = applicablePlans.filter((k) => k !== 'ALL');
                              if (isChecked) {
                                setApplicablePlans(withoutAll.filter((k) => k !== pk.key));
                              } else {
                                setApplicablePlans([...withoutAll, pk.key]);
                              }
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            isChecked
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {pk.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dates & Limits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Start Date</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Expiry Date</label>
                  <input
                    type="datetime-local"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Total Uses</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Per Member</label>
                  <input
                    type="number"
                    value={perMemberLimit}
                    onChange={(e) => setPerMemberLimit(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Any">Any</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberOnly}
                    onChange={(e) => setNewMemberOnly(e.target.checked)}
                    className="rounded text-[#E51F3E]"
                  />
                  <span className="font-semibold text-slate-700">New Members Only</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canStackWithCampaign}
                    onChange={(e) => setCanStackWithCampaign(e.target.checked)}
                    className="rounded text-[#E51F3E]"
                  />
                  <span className="font-semibold text-slate-700">Can Stack With Campaigns</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#CC1432] text-white font-bold transition shadow-xs"
                >
                  {saving ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
