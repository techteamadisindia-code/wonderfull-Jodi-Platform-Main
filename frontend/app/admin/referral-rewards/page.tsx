'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Gift,
  ArrowLeft,
  Settings,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  Sparkles,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';
import {
  ReferralRewardConfigData,
  fetchReferralRewardConfig,
  updateReferralRewardConfig,
} from '../../../services/referralApi';

const QUALIFICATION_TRIGGERS = [
  {
    value: 'REGISTERED',
    label: 'Successful Unique Registration (Default)',
    desc: 'Reward counts when the referred doctor completes their initial account registration.',
  },
  {
    value: 'REGISTERED_AND_VERIFIED',
    label: 'Registration + Identity/Doctor Verified',
    desc: 'Reward counts only when the referred doctor\'s profile or documents are verified by Admin.',
  },
  {
    value: 'REGISTERED_AND_COMPLETED_PROFILE',
    label: 'Registration + 100% Completed Profile',
    desc: 'Reward counts when the referred candidate completes all personal, career, and photo steps.',
  },
];

const REWARD_TYPES = [
  { value: 'PERCENTAGE_DISCOUNT', label: 'Percentage (%) Discount Coupon' },
  { value: 'FIXED_DISCOUNT', label: 'Fixed Amount (₹) Off Coupon' },
  { value: 'FREE_PREMIUM', label: '100% Free Premium Membership' },
  { value: 'PROFILE_VIEWS', label: 'Additional Profile View Credits' },
  { value: 'CONTACT_VIEWS', label: 'Additional Verified Contact Credits' },
];

export default function ReferralRewardsConfigPage() {
  const [config, setConfig] = useState<ReferralRewardConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [requiredReferrals, setRequiredReferrals] = useState<number>(5);
  const [qualificationTrigger, setQualificationTrigger] = useState<
    'REGISTERED' | 'REGISTERED_AND_VERIFIED' | 'REGISTERED_AND_COMPLETED_PROFILE'
  >('REGISTERED');
  const [rewardType, setRewardType] = useState<any>('PERCENTAGE_DISCOUNT');
  const [rewardValue, setRewardValue] = useState<number>(50);
  const [rewardPlanKey, setRewardPlanKey] = useState<string>('ALL');
  const [couponValidityDays, setCouponValidityDays] = useState<number>(30);
  const [allowRecurringMilestones, setAllowRecurringMilestones] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchReferralRewardConfig();
      if (data) {
        setConfig(data);
        setRequiredReferrals(data.requiredReferrals || 5);
        setQualificationTrigger((data.qualificationTrigger || data.qualificationEvent || 'REGISTERED') as any);
        setRewardType(data.rewardType || 'PERCENTAGE_DISCOUNT');
        setRewardValue(data.rewardValue ?? 50);
        setRewardPlanKey(data.rewardPlanKey || 'ALL');
        setCouponValidityDays(data.couponValidityDays || 30);
        setAllowRecurringMilestones(data.allowRecurringMilestones ?? true);
        setIsActive(data.isActive ?? true);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load referral reward settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiredReferrals < 1) {
      return showToast('Required referrals must be at least 1', 'error');
    }

    setSaving(true);
    try {
      const updated = await updateReferralRewardConfig({
        requiredReferrals: Number(requiredReferrals),
        qualificationTrigger,
        rewardType,
        rewardValue: Number(rewardValue),
        rewardPlanKey,
        couponValidityDays: Number(couponValidityDays),
        allowRecurringMilestones,
        isActive,
      });

      setConfig(updated);
      showToast('Referral reward configuration saved successfully');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update referral configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/referrals"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              Referral Reward Engine Configuration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Configure referral thresholds, qualification event triggers, automatic coupon issuance, and anti-abuse limits.
            </p>
          </div>
        </div>

        <button
          onClick={loadConfig}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="Reload Configuration"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E51F3E]" />
          <p className="text-xs font-bold">Loading reward configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            {/* Section 1: Referral Milestone Threshold */}
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Users className="w-5 h-5 text-[#E51F3E]" />
                <span>1. Referral Milestone Threshold</span>
              </div>
              <p className="text-xs text-slate-500">
                Specify how many successful qualifying referrals a member must achieve to unlock their reward.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Required Referrals *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={requiredReferrals}
                    onChange={(e) => setRequiredReferrals(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E]"
                    required
                  />
                  <span className="text-[11px] text-slate-400 block">
                    e.g. 5 referrals = milestone 1, 10 referrals = milestone 2
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Recurring Milestones?</label>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      Enable next rewards at multiples (e.g. 5, 10, 15)
                    </span>
                    <input
                      type="checkbox"
                      checked={allowRecurringMilestones}
                      onChange={(e) => setAllowRecurringMilestones(e.target.checked)}
                      className="rounded text-[#E51F3E] w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Anti-Abuse Qualification Criteria (Part 17) */}
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>2. Referral Qualification Event (Anti-Abuse)</span>
              </div>
              <p className="text-xs text-slate-500">
                Clicks and links alone do NOT count. Choose what verified action qualifies a peer referral.
              </p>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                {QUALIFICATION_TRIGGERS.map((qt) => {
                  const isSelected = qualificationTrigger === qt.value;
                  return (
                    <div
                      key={qt.value}
                      onClick={() => setQualificationTrigger(qt.value as any)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-rose-50/70 border-[#E51F3E] shadow-2xs'
                          : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="qualificationTrigger"
                          checked={isSelected}
                          onChange={() => setQualificationTrigger(qt.value as any)}
                          className="text-[#E51F3E]"
                        />
                        <span className="text-xs font-bold text-slate-900">{qt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 ml-5">{qt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Reward Configuration */}
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Gift className="w-5 h-5 text-purple-600" />
                <span>3. Reward Benefit & Automatic Coupon Generation</span>
              </div>
              <p className="text-xs text-slate-500">
                When a member hits the required count, the system automatically creates an idempotent unique coupon code (e.g. <code>WJREF-XXXXXX</code>).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Reward Type</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  >
                    {REWARD_TYPES.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {rewardType === 'PERCENTAGE_DISCOUNT'
                      ? 'Discount Percentage (%)'
                      : rewardType === 'FIXED_DISCOUNT'
                      ? 'Discount Amount (₹)'
                      : rewardType === 'FREE_PREMIUM'
                      ? '100% Free'
                      : 'Credit Units'}
                  </label>
                  <input
                    type="number"
                    disabled={rewardType === 'FREE_PREMIUM'}
                    value={rewardType === 'FREE_PREMIUM' ? 100 : rewardValue}
                    onChange={(e) => setRewardValue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white disabled:bg-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Coupon Expiry (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={couponValidityDays}
                    onChange={(e) => setCouponValidityDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="pt-2 flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">Program Status:</label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-100 text-rose-900 border border-rose-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{isActive ? 'ACTIVE & ISSUING REWARDS' : 'PROGRAM PAUSED'}</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#E51F3E] hover:bg-[#CC1432] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
