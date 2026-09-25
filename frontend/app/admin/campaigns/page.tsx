'use client';

import React, { useEffect, useState } from 'react';
import {
  Flame,
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
  Filter,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  Award,
  ChevronRight,
  UserCheck,
  MapPin,
  GraduationCap,
  Percent,
  Tag,
  Check,
  X,
  Clock,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import {
  CampaignData,
  fetchAdminCampaigns,
  createAdminCampaign,
  updateAdminCampaign,
  archiveAdminCampaign,
  deleteAdminCampaign,
  previewMemberEligibility,
  EligibilityPreviewResult,
} from '../../../services/campaignApi';
import { DOCTOR_QUALIFICATIONS, DOCTOR_SPECIALIZATIONS } from '../../../lib/doctorConstants';

const PRESET_CAMPAIGN_NAMES = [
  "Mother's Day Offer",
  "Father's Day Offer",
  "Doctor's Day Special",
  "Independence Day Offer",
  "Raksha Bandhan Special",
  "Diwali Celebration",
  "New Year Welcome Offer",
  "Valentine's Week Special",
  "Weekend Flash Offer",
  "Custom Campaign",
];

const GENDER_OPTIONS = ['Any', 'Female', 'Male', 'Both'];
const MARITAL_STATUS_OPTIONS = ['Any', 'Never Married', 'Divorced', 'Widowed', 'Separated'];
const VERIFICATION_OPTIONS = ['Any', 'VERIFIED', 'UNVERIFIED', 'PENDING'];
const PROFILE_STATUS_OPTIONS = ['Any', 'COMPLETE', 'INCOMPLETE'];
const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%) Discount' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount (₹) Off' },
  { value: 'FREE_100_PERCENT', label: '100% Free Membership' },
  { value: 'NONE', label: 'No Discount (Tracking Only)' },
];

const PLAN_KEYS = [
  { key: 'ALL', label: 'All Paid Membership Plans' },
  { key: 'DOCTOR_CONNECT', label: 'Doctor Connect (3 Months)' },
  { key: 'PREMIUM_MATCH', label: 'Premium Match (6 Months)' },
  { key: 'EXCLUSIVE_CONCIERGE', label: 'Exclusive Concierge (12 Months)' },
];

export default function AdminCampaignsPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'preview'>('campaigns');

  // Campaign List State
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignData | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [targetGender, setTargetGender] = useState('Female');
  const [minAge, setMinAge] = useState<number | ''>(24);
  const [maxAge, setMaxAge] = useState<number | ''>(45);
  const [maritalStatus, setMaritalStatus] = useState<string[]>(['Any']);
  const [verificationStatus, setVerificationStatus] = useState('Any');
  const [profileStatus, setProfileStatus] = useState('Any');
  const [qualification, setQualification] = useState<string[]>([]);
  const [applicablePlans, setApplicablePlans] = useState<string[]>(['ALL']);
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>(50);
  const [priority, setPriority] = useState<number>(10);
  const [status, setStatus] = useState('ACTIVE');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [perMemberLimit, setPerMemberLimit] = useState<number>(1);
  const [femaleLimit, setFemaleLimit] = useState<number | ''>('');
  const [maleLimit, setMaleLimit] = useState<number | ''>('');
  const [couponRequired, setCouponRequired] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  // Eligibility Preview State (Part 25)
  const [previewMember, setPreviewMember] = useState('');
  const [previewPlan, setPreviewPlan] = useState('DOCTOR_CONNECT');
  const [previewCampaignId, setPreviewCampaignId] = useState('');
  const [previewCouponCode, setPreviewCouponCode] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<EligibilityPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCampaigns(statusFilter !== 'ALL' ? statusFilter : undefined);
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setName("Mother's Day 2027 Special");
    setDescription('Celebrate Mother\'s Day with exclusive 100% free premium membership for eligible female doctor candidates.');
    const now = new Date();
    setStartDate(now.toISOString().substring(0, 16));
    const nextWeek = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setEndDate(nextWeek.toISOString().substring(0, 16));
    setTimezone('Asia/Kolkata');
    setTargetGender('Female');
    setMinAge(24);
    setMaxAge(45);
    setMaritalStatus(['Never Married']);
    setVerificationStatus('Any');
    setProfileStatus('Any');
    setQualification([]);
    setApplicablePlans(['ALL']);
    setDiscountType('FREE_100_PERCENT');
    setDiscountValue(100);
    setPriority(10);
    setStatus('ACTIVE');
    setUsageLimit('');
    setPerMemberLimit(1);
    setFemaleLimit('');
    setMaleLimit('');
    setCouponRequired(false);
    setCouponCode('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: CampaignData) => {
    setEditingCampaign(c);
    setName(c.campaignName || c.name || '');
    setDescription(c.description || '');
    setStartDate(c.startDate ? new Date(c.startDate).toISOString().substring(0, 16) : '');
    setEndDate(c.endDate ? new Date(c.endDate).toISOString().substring(0, 16) : '');
    setTimezone(c.timezone || 'Asia/Kolkata');
    setTargetGender(c.targetGender || c.eligibility?.gender || 'Any');
    setMinAge(c.minAge ?? c.eligibility?.minAge ?? '');
    setMaxAge(c.maxAge ?? c.eligibility?.maxAge ?? '');
    setMaritalStatus(c.maritalStatus || c.eligibility?.maritalStatus || ['Any']);
    setVerificationStatus(c.verificationStatus || c.eligibility?.verificationStatus || 'Any');
    setProfileStatus(c.profileStatus || c.eligibility?.profileStatus || 'Any');
    setQualification(c.qualification || c.eligibility?.qualification || []);
    setApplicablePlans(c.applicablePlans || ['ALL']);
    setDiscountType(c.discountType || 'PERCENTAGE');
    setDiscountValue(c.discountValue ?? 0);
    setPriority(c.priority ?? 10);
    setStatus(c.status || 'ACTIVE');
    setUsageLimit(c.usageLimit ?? '');
    setPerMemberLimit(c.perMemberLimit ?? 1);
    setFemaleLimit(c.genderUsageLimit?.femaleLimit ?? '');
    setMaleLimit(c.genderUsageLimit?.maleLimit ?? '');
    setCouponRequired(Boolean(c.couponRequired));
    setCouponCode(c.couponCode || '');
    setIsModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Campaign Name is required', 'error');
    if (!startDate || !endDate) return showToast('Start and End dates are required', 'error');
    if (new Date(startDate) >= new Date(endDate)) {
      return showToast('End Date must be after Start Date', 'error');
    }

    setSaving(true);
    try {
      const payload: Partial<CampaignData> = {
        name: name.trim(),
        campaignName: name.trim(),
        description: description.trim(),
        startDate,
        endDate,
        timezone,
        targetGender: targetGender as any,
        minAge: minAge !== '' ? Number(minAge) : undefined,
        maxAge: maxAge !== '' ? Number(maxAge) : undefined,
        maritalStatus,
        verificationStatus: verificationStatus as any,
        profileStatus: profileStatus as any,
        qualification,
        applicablePlans,
        discountType: discountType as any,
        discountValue: discountValue !== '' ? Number(discountValue) : 0,
        priority: Number(priority),
        status: status as any,
        usageLimit: usageLimit !== '' ? Number(usageLimit) : undefined,
        perMemberLimit: Number(perMemberLimit),
        genderUsageLimit: {
          femaleLimit: femaleLimit !== '' ? Number(femaleLimit) : undefined,
          maleLimit: maleLimit !== '' ? Number(maleLimit) : undefined,
        },
        couponRequired,
        couponCode: couponRequired ? couponCode.trim().toUpperCase() : undefined,
      };

      if (editingCampaign?._id) {
        await updateAdminCampaign(editingCampaign._id, payload);
        showToast('Campaign rule updated successfully');
      } else {
        await createAdminCampaign(payload);
        showToast('New seasonal campaign created successfully');
      }

      setIsModalOpen(false);
      loadCampaigns();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save campaign rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c: CampaignData, nextStatus: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') => {
    if (!c._id) return;
    try {
      await updateAdminCampaign(c._id, { status: nextStatus });
      showToast(`Campaign status changed to ${nextStatus}`);
      loadCampaigns();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update campaign status', 'error');
    }
  };

  const handleDelete = async (c: CampaignData) => {
    if (!c._id) return;
    const displayName = c.campaignName || c.name || 'this campaign';
    if (!window.confirm(`Are you sure you want to delete campaign "${displayName}"?`)) return;
    try {
      await deleteAdminCampaign(c._id);
      showToast('Campaign deleted successfully');
      loadCampaigns();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete campaign', 'error');
    }
  };

  // Run Eligibility Check Preview (Part 25)
  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewMember.trim()) {
      setPreviewError('Please enter candidate email, phone, or candidate ID.');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);

    try {
      const res = await previewMemberEligibility({
        identifier: previewMember.trim(),
        planKey: previewPlan,
        campaignId: previewCampaignId || undefined,
        couponCode: previewCouponCode ? previewCouponCode.trim().toUpperCase() : undefined,
      });
      setPreviewResult(res);
    } catch (err: any) {
      setPreviewError(err.response?.data?.message || 'Failed to evaluate member eligibility.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const cName = (c.campaignName || c.name || '').toLowerCase();
    const cDesc = (c.description || '').toLowerCase();
    const cCoupon = (c.couponCode || '').toLowerCase();
    const matchesSearch = !q || cName.includes(q) || cDesc.includes(q) || cCoupon.includes(q);
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
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
              Seasonal Campaigns & Rule Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Configure dynamic seasonal membership offers, demographic rules, and 100% free promotions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'campaigns'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-[#E51F3E] text-white shadow-xs'
                : 'bg-rose-50 text-[#E51F3E] hover:bg-rose-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Eligibility Preview Tool</span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CAMPAIGNS LIST ─── */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns, coupons, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'ACTIVE', 'SCHEDULED', 'PAUSED', 'DRAFT', 'EXPIRED', 'ARCHIVED'].map((st) => (
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
                onClick={loadCampaigns}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Campaign Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E51F3E]" />
              <p className="text-xs font-bold">Loading campaign rules from database...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Flame className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No campaigns found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active seasonal campaigns match your criteria. Click "New Campaign" to create a special offer.
              </p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432]"
              >
                Create First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCampaigns.map((c) => {
                const isFree = c.discountType === 'FREE_100_PERCENT' || c.discountValue === 100;
                const statusColor =
                  c.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : c.status === 'PAUSED'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : c.status === 'SCHEDULED'
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : c.status === 'EXPIRED'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <div
                    key={c._id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-900 font-serif">
                              {c.campaignName || c.name || 'Seasonal Campaign'}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${statusColor}`}
                            >
                              {c.status}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              Priority: {c.priority ?? 0}
                            </span>
                          </div>
                          {c.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                          )}
                        </div>

                        {/* Discount Big Badge */}
                        <div
                          className={`px-3 py-1.5 rounded-xl text-center shrink-0 border ${
                            isFree
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                              : 'bg-rose-50 text-[#E51F3E] border-rose-200'
                          }`}
                        >
                          <div className="text-xs font-extrabold uppercase">
                            {isFree
                              ? '100% FREE'
                              : c.discountType === 'FIXED_AMOUNT'
                              ? `₹${c.discountValue} OFF`
                              : `${c.discountValue}% OFF`}
                          </div>
                          <div className="text-[9px] font-bold opacity-80">
                            {(c.discountType || 'PERCENTAGE').replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>

                      {/* Criteria Highlights */}
                      <div className="py-3.5 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Target:{' '}
                              <strong className="text-slate-900">
                                {c.targetGender || c.eligibility?.gender || 'Any Gender'}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Age:{' '}
                              <strong className="text-slate-900">
                                {c.minAge
                                  ? `${c.minAge}–${c.maxAge || 99} yrs`
                                  : c.eligibility?.minAge
                                  ? `${c.eligibility.minAge}–${c.eligibility.maxAge || 99} yrs`
                                  : 'Any'}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Marital:{' '}
                              <strong className="text-slate-900">
                                {Array.isArray(c.maritalStatus)
                                  ? c.maritalStatus.join(', ')
                                  : c.maritalStatus || (Array.isArray(c.eligibility?.maritalStatus) ? c.eligibility.maritalStatus.join(', ') : 'Any')}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Degree:{' '}
                              <strong className="text-slate-900">
                                {Array.isArray(c.qualification) && c.qualification.length && !c.qualification.includes('Any')
                                  ? c.qualification.slice(0, 2).join(', ') + (c.qualification.length > 2 ? '...' : '')
                                  : Array.isArray(c.eligibility?.qualification) && c.eligibility.qualification.length
                                  ? c.eligibility.qualification.slice(0, 2).join(', ')
                                  : 'All Doctors'}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Dates & Usage */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Validity:{' '}
                            <strong className="text-slate-700">
                              {c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN') : 'N/A'}
                            </strong>{' '}
                            to{' '}
                            <strong className="text-slate-700">
                              {c.endDate ? new Date(c.endDate).toLocaleDateString('en-IN') : 'N/A'}
                            </strong>
                          </span>
                          <span>
                            Claimed: <strong className="text-emerald-700">{c.usedCount || 0}</strong>
                            {c.usageLimit ? ` / ${c.usageLimit}` : ' (Unlimited)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {c.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleToggleStatus(c, 'PAUSED')}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1"
                            title="Pause Campaign"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(c, 'ACTIVE')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                            title="Activate Campaign"
                          >
                            <Play className="w-3 h-3" />
                            <span>Activate</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleStatus(c, 'ARCHIVED')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center gap-1"
                          title="Archive Campaign"
                        >
                          <Archive className="w-3 h-3" />
                          <span>Archive</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ─── TAB 2: ELIGIBILITY PREVIEW TOOL (Part 25) ─── */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#E51F3E] text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Super Admin Rule Verifier</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              Check Member Eligibility & Dynamic Pricing
            </h2>
            <p className="text-xs text-slate-500">
              Select any registered candidate, membership package, and campaign to view the exact server-evaluated discount breakdown.
            </p>
          </div>

          <form onSubmit={handleCheckEligibility} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Member Identifier</label>
              <input
                type="text"
                placeholder="Candidate ID (WJ-XXXX) or Email"
                value={previewMember}
                onChange={(e) => setPreviewMember(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Membership Package</label>
              <select
                value={previewPlan}
                onChange={(e) => setPreviewPlan(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E] bg-white"
              >
                {PLAN_KEYS.filter((p) => p.key !== 'ALL').map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Optional Campaign Focus</label>
              <select
                value={previewCampaignId}
                onChange={(e) => setPreviewCampaignId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E] bg-white"
              >
                <option value="">Auto-evaluate all active campaigns</option>
                {campaigns.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Optional Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. WJ50OFF"
                value={previewCouponCode}
                onChange={(e) => setPreviewCouponCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 pt-2">
              <button
                type="submit"
                disabled={previewLoading}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {previewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{previewLoading ? 'Evaluating Rules...' : 'Run Eligibility Check'}</span>
              </button>
            </div>
          </form>

          {/* Preview Results Breakdown */}
          {previewError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {previewResult && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Candidate Profile</div>
                  <h4 className="text-base font-bold text-slate-900">
                    {previewResult.member?.fullName || previewResult.member?.name} ({previewResult.member?.candidateId})
                  </h4>
                  <div className="text-xs text-slate-600 flex items-center gap-3 mt-0.5">
                    <span>Gender: <strong>{previewResult.member?.gender}</strong></span>
                    <span>Age: <strong>{previewResult.member?.age} yrs</strong></span>
                    <span>Qualification: <strong>{previewResult.member?.qualification}</strong></span>
                    <span>Status: <strong>{previewResult.member?.verificationStatus}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Final Payable Price</div>
                  <div className="text-2xl font-black text-slate-900 font-serif">
                    ₹{(previewResult.pricing?.finalAmount ?? previewResult.pricing?.finalPrice)?.toLocaleString('en-IN')}{' '}
                    {previewResult.pricing?.isFree && (
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        100% FREE
                      </span>
                    )}
                  </div>
                  {previewResult.pricing?.discountAmount > 0 && (
                    <div className="text-xs text-slate-400 line-through">
                      Original: ₹{previewResult.pricing?.originalAmount?.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>

              {/* Evaluation Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(previewResult.criteriaBreakdown || {}).map(([key, item]: [string, any]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      item.pass
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div>
                      <div className="font-bold capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="text-[10px] opacity-80">{item.detail || (item.pass ? 'Matched' : 'Unmatched')}</div>
                    </div>
                    {item.pass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Selected Campaign / Coupon Info */}
              <div className="pt-2 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
                <div>
                  Applied Campaign:{' '}
                  <strong className="text-slate-900">
                    {previewResult.appliedCampaign?.name || 'None (Standard Pricing)'}
                  </strong>
                </div>
                {previewResult.appliedCoupon && (
                  <div className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon: {previewResult.appliedCoupon.code}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT CAMPAIGN ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#E51F3E]">
                <Flame className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingCampaign ? 'Edit Campaign Rule' : 'Create Seasonal Campaign'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4 text-xs">
              {/* Preset Quick Select */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Quick Campaign Preset</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CAMPAIGN_NAMES.map((pn) => (
                    <button
                      key={pn}
                      type="button"
                      onClick={() => {
                        setName(pn);
                        if (pn.includes('Mother')) {
                          setTargetGender('Female');
                          setDiscountType('FREE_100_PERCENT');
                          setDiscountValue(100);
                        } else if (pn.includes('Father')) {
                          setTargetGender('Male');
                          setDiscountType('PERCENTAGE');
                          setDiscountValue(50);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-[#E51F3E] text-[11px] font-semibold text-slate-700 transition"
                    >
                      {pn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Campaign Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E] font-medium"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Public Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              {/* Dates & Timezone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Start Date *</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">End Date *</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Eligibility Criteria (Part 3) */}
              <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#E51F3E]" />
                  <span>Target Eligibility Criteria</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Target Gender</label>
                    <select
                      value={targetGender}
                      onChange={(e) => setTargetGender(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Min Age</label>
                    <input
                      type="number"
                      value={minAge}
                      onChange={(e) => setMinAge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Max Age</label>
                    <input
                      type="number"
                      value={maxAge}
                      onChange={(e) => setMaxAge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Marital Status</label>
                    <select
                      value={maritalStatus[0] || 'Any'}
                      onChange={(e) => setMaritalStatus([e.target.value])}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      {MARITAL_STATUS_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Doctor Qualifications</label>
                    <select
                      multiple
                      value={qualification}
                      onChange={(e) =>
                        setQualification(Array.from(e.target.selectedOptions, (option) => option.value))
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white h-20"
                    >
                      {DOCTOR_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400">Hold Ctrl/Cmd to select multiple</span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Verification Status</label>
                      <select
                        value={verificationStatus}
                        onChange={(e) => setVerificationStatus(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {VERIFICATION_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Profile Status</label>
                      <select
                        value={profileStatus}
                        onChange={(e) => setProfileStatus(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {PROFILE_STATUS_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discount Rules (Part 4) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <span>Discount & Applicable Plans</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Discount Type *</label>
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
                      disabled={discountType === 'FREE_100_PERCENT' || discountType === 'NONE'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Rule Priority (Higher = First)</label>
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
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

              {/* Limits & Coupon Requirement */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Total Usage Limit</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Per Member Limit</label>
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
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Coupon Required?</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      type="checkbox"
                      checked={couponRequired}
                      onChange={(e) => setCouponRequired(e.target.checked)}
                      className="rounded text-[#E51F3E]"
                    />
                    <span>Yes</span>
                  </div>
                </div>
              </div>

              {couponRequired && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <label className="font-bold text-amber-900">Required Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. WJDOCTOR100"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 uppercase tracking-wider font-bold bg-white"
                  />
                </div>
              )}

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
                  {saving ? 'Saving...' : editingCampaign ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
