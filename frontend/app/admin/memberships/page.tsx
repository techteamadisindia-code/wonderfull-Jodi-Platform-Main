'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Crown,
  Sparkles,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  UserCheck,
  ShieldCheck,
  Tag,
  Flame,
  Star,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  Percent,
  Layers,
  Users,
} from 'lucide-react';
import {
  MembershipPlanData,
  SubscriptionItem,
  fetchAdminMembershipPlans,
  createAdminMembershipPlan,
  updateAdminMembershipPlan,
  deleteAdminMembershipPlan,
  toggleAdminMembershipPlanStatus,
  fetchMemberships,
  updateMembership,
} from '../../../services/membershipApi';

export default function AdminMembershipsPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'subscriptions'>('plans');

  // ─── Plan Management State ───
  const [plans, setPlans] = useState<MembershipPlanData[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Modal State for Plan Create/Edit
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanData | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | string>(0);
  const [formDiscountedPrice, setFormDiscountedPrice] = useState<number | string>(0);
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formDurationDays, setFormDurationDays] = useState<number | string>(90);
  const [formBillingPeriod, setFormBillingPeriod] = useState('3 Months');
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [formNewFeatureInput, setFormNewFeatureInput] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formDisplayOrder, setFormDisplayOrder] = useState<number | string>(1);
  const [formIsSeasonalOffer, setFormIsSeasonalOffer] = useState(false);
  const [formSeasonalLabel, setFormSeasonalLabel] = useState('');
  const [formSeasonalDiscount, setFormSeasonalDiscount] = useState<number | string>(0);
  const [formContactLimit, setFormContactLimit] = useState<number | string>(25);

  // Delete Confirmation Modal
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<MembershipPlanData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast / Notice
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── User Subscriptions State (Preserved) ───
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [savingSub, setSavingSub] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // ─── Load Plans ───
  const loadPlans = async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await fetchAdminMembershipPlans();
      setPlans(data || []);
    } catch (err: any) {
      console.error('Failed to load plans:', err);
      setPlansError(err.response?.data?.message || 'Failed to load membership plans.');
    } finally {
      setPlansLoading(false);
    }
  };

  // ─── Load Subscriptions ───
  const loadSubscriptions = async () => {
    setSubsLoading(true);
    try {
      const data = await fetchMemberships({
        plan: planFilter,
        status: statusFilter,
      });
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setSubsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions();
    }
  }, [activeTab, planFilter, statusFilter]);

  // ─── Open Create Modal ───
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormOriginalPrice(4999);
    setFormDiscountedPrice(2999);
    setFormCurrency('INR');
    setFormDurationDays(90);
    setFormBillingPeriod('3 Months');
    setFormFeatures([
      'Unlimited Profile Views',
      'Send Unlimited Interests',
      'Priority Search Ranking',
      'Chat with Matches',
      'View Contact Details',
    ]);
    setFormNewFeatureInput('');
    setFormIsActive(true);
    setFormIsPopular(false);
    setFormDisplayOrder(plans.length + 1);
    setFormIsSeasonalOffer(false);
    setFormSeasonalLabel('');
    setFormSeasonalDiscount(0);
    setFormContactLimit(25);
    setIsPlanModalOpen(true);
  };

  // ─── Open Edit Modal ───
  const handleOpenEdit = (plan: MembershipPlanData) => {
    setEditingPlan(plan);
    setFormName(plan.name || '');
    setFormSlug(plan.slug || '');
    setFormDescription(plan.description || '');
    setFormOriginalPrice(plan.originalPrice ?? 0);
    setFormDiscountedPrice(plan.discountedPrice ?? plan.price ?? 0);
    setFormCurrency(plan.currency || 'INR');
    setFormDurationDays(plan.durationDays || 90);
    setFormBillingPeriod(plan.billingPeriod || '3 Months');
    setFormFeatures(plan.features && Array.isArray(plan.features) ? [...plan.features] : []);
    setFormNewFeatureInput('');
    setFormIsActive(plan.isActive !== undefined ? plan.isActive : true);
    setFormIsPopular(Boolean(plan.isPopular));
    setFormDisplayOrder(plan.displayOrder ?? 1);
    setFormIsSeasonalOffer(Boolean(plan.isSeasonalOffer || plan.seasonalLabel));
    setFormSeasonalLabel(plan.seasonalLabel || '');
    setFormSeasonalDiscount(plan.seasonalDiscount ?? 0);
    setFormContactLimit(plan.contactRequestLimit ?? 0);
    setIsPlanModalOpen(true);
  };

  // ─── Feature List Management in Modal ───
  const handleAddFeature = () => {
    if (!formNewFeatureInput.trim()) return;
    setFormFeatures([...formFeatures, formNewFeatureInput.trim()]);
    setFormNewFeatureInput('');
  };

  const handleUpdateFeature = (index: number, val: string) => {
    const updated = [...formFeatures];
    updated[index] = val;
    setFormFeatures(updated);
  };

  const handleDeleteFeature = (index: number) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== index));
  };

  const handleMoveFeature = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formFeatures.length - 1)
    )
      return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...formFeatures];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFormFeatures(updated);
  };

  // ─── Save Plan (Create or Update) ───
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Plan name is required.', 'error');
      return;
    }

    setSavingPlan(true);
    try {
      const payload: Partial<MembershipPlanData> = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        description: formDescription.trim(),
        originalPrice: Number(formOriginalPrice) || 0,
        discountedPrice: Number(formDiscountedPrice) || 0,
        currency: formCurrency.toUpperCase().trim(),
        durationDays: Number(formDurationDays) || 30,
        billingPeriod: formBillingPeriod.trim() || 'Monthly',
        features: formFeatures.filter(Boolean),
        isActive: formIsActive,
        isPopular: formIsPopular,
        displayOrder: Number(formDisplayOrder) || 1,
        seasonalLabel: formSeasonalLabel.trim(),
        seasonalDiscount: Number(formSeasonalDiscount) || 0,
        isSeasonalOffer: formIsSeasonalOffer || Boolean(formSeasonalLabel.trim()),
        contactRequestLimit: Number(formContactLimit) || 0,
      };

      if (editingPlan) {
        const updated = await updateAdminMembershipPlan(editingPlan._id, payload);
        setPlans((prev) =>
          prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p))
        );
        showToast(`Membership plan "${updated.name}" updated successfully!`);
      } else {
        const created = await createAdminMembershipPlan(payload);
        setPlans((prev) => [...prev, created].sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1)));
        showToast(`Membership plan "${created.name}" created successfully!`);
      }

      setIsPlanModalOpen(false);
      loadPlans();
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      showToast(err.response?.data?.message || 'Failed to save membership plan.', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  // ─── Toggle Plan Status ───
  const handleToggleStatus = async (plan: MembershipPlanData) => {
    try {
      const res = await toggleAdminMembershipPlanStatus(plan._id, !plan.isActive);
      setPlans((prev) =>
        prev.map((p) => (p._id === plan._id ? { ...p, isActive: res.isActive } : p))
      );
      showToast(`Plan "${plan.name}" is now ${res.isActive ? 'Active' : 'Disabled'}.`);
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      showToast('Failed to update plan status.', 'error');
    }
  };

  // ─── Delete Plan ───
  const handleDeletePlan = async () => {
    if (!deleteConfirmPlan) return;
    setDeleting(true);
    try {
      await deleteAdminMembershipPlan(deleteConfirmPlan._id);
      setPlans((prev) => prev.filter((p) => p._id !== deleteConfirmPlan._id));
      showToast(`Plan "${deleteConfirmPlan.name}" deleted successfully.`);
      setDeleteConfirmPlan(null);
    } catch (err: any) {
      console.error('Failed to delete plan:', err);
      showToast(err.response?.data?.message || 'Failed to delete membership plan.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Save User Subscription (Preserved) ───
  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setSavingSub(true);
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
      showToast('User subscription updated successfully!');
    } catch (err) {
      console.error('Failed to update subscription:', err);
      showToast('Failed to update user subscription.', 'error');
    } finally {
      setSavingSub(false);
    }
  };

  // Stats
  const totalPlans = plans.length;
  const activePlansCount = plans.filter((p) => p.isActive).length;
  const popularPlan = plans.find((p) => p.isPopular);
  const seasonalOffersCount = plans.filter((p) => p.isSeasonalOffer || p.seasonalLabel).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {notice && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
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

      {/* ─── Header & Primary Action ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Membership Management
            </h1>
            <span className="bg-rose-100 text-[#E51F3E] text-xs px-2.5 py-0.5 rounded-full font-bold">
              Full Dynamic Control
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage pricing, features, seasonal offers, and active status. Changes automatically reflect on the public membership page.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (activeTab === 'plans' ? loadPlans() : loadSubscriptions())}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>

          {activeTab === 'plans' && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#E51F3E] hover:bg-[#c91834] transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Membership Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Summary Metrics ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalPlans}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Plans
            </div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{activePlansCount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Plans Live
            </div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-lg font-bold text-slate-900 truncate">
              {popularPlan ? popularPlan.name : 'None'}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Most Popular Plan
            </div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-700">{seasonalOffersCount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Seasonal Offers
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs Switcher ─── */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'plans'
              ? 'border-[#E51F3E] text-[#E51F3E]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Membership Plans ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'border-[#E51F3E] text-[#E51F3E]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Subscriptions</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 1: MEMBERSHIP PLANS DASHBOARD (CORE USER REQUIREMENT)   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {plansLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-[#E51F3E] animate-spin mb-3" />
              <div className="text-slate-700 font-semibold">Loading membership plans...</div>
              <div className="text-xs text-slate-400 mt-1">Fetching live settings from MongoDB</div>
            </div>
          ) : plansError ? (
            <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <div className="text-rose-900 font-bold">{plansError}</div>
              <button
                onClick={loadPlans}
                className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No Membership Plans Configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Get started by creating your first dynamic matrimonial membership plan.
              </p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#E51F3E] hover:bg-[#c91834] transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Membership Plan</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Plan Name</th>
                      <th className="py-3 px-4">Regular Price</th>
                      <th className="py-3 px-4">Offer Price</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Popular</th>
                      <th className="py-3 px-4">Seasonal Offer</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {plans.map((plan) => {
                      const orig = plan.originalPrice ?? 0;
                      const disc = plan.discountedPrice ?? plan.price ?? orig;
                      const discountPct =
                        plan.seasonalDiscount ||
                        (orig > disc && orig > 0
                          ? Math.round(((orig - disc) / orig) * 100)
                          : 0);

                      return (
                        <tr
                          key={plan._id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !plan.isActive ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          {/* Plan Name & Slug */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-rose-50 text-[#E51F3E] flex items-center justify-center font-bold text-xs shrink-0 border border-rose-100">
                                {plan.displayOrder || 1}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{plan.name}</span>
                                  {plan.slug === 'free' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                                      Free Tier
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  /{plan.slug}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Regular Price */}
                          <td className="py-3.5 px-4 font-semibold text-slate-500">
                            {orig > 0 ? (
                              orig > disc ? (
                                <span className="line-through text-slate-400">
                                  ₹{orig.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span>₹{orig.toLocaleString('en-IN')}</span>
                              )
                            ) : (
                              <span>₹0</span>
                            )}
                          </td>

                          {/* Offer Price */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-700 text-sm">
                                ₹{disc.toLocaleString('en-IN')}
                              </span>
                              {discountPct > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  {discountPct}% OFF
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{plan.billingPeriod || `${plan.durationDays} Days`}</div>
                            <div className="text-[11px] text-slate-400">
                              {plan.durationDays} days
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(plan)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                plan.isActive
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Click to toggle status"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  plan.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              <span>{plan.isActive ? 'Active' : 'Disabled'}</span>
                            </button>
                          </td>

                          {/* Most Popular */}
                          <td className="py-3.5 px-4 text-center">
                            {plan.isPopular ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#E51F3E] text-white shadow-2xs">
                                <Star className="w-3 h-3 fill-current" />
                                <span>Popular</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Seasonal Offer */}
                          <td className="py-3.5 px-4">
                            {plan.seasonalLabel || plan.isSeasonalOffer ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                                <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[150px]">
                                  {plan.seasonalLabel || 'Active Offer'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs font-normal">None</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(plan)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Plan"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>

                              <button
                                onClick={() => handleToggleStatus(plan)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title={plan.isActive ? 'Disable Plan' : 'Enable Plan'}
                              >
                                {plan.isActive ? (
                                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                                )}
                              </button>

                              <button
                                onClick={() => setDeleteConfirmPlan(plan)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Plan"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 2: USER SUBSCRIPTIONS (PRESERVED PREVIOUS FUNCTION)      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Filter Plan:
              </label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="ALL">All Plans</option>
                <option value="FREE">Free</option>
                <option value="DOCTOR_CONNECT">Doctor Connect</option>
                <option value="PREMIUM">Premium</option>
                <option value="PREMIUM_VIP">Premium VIP</option>
                <option value="VVIP">VVIP</option>
              </select>

              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-2">
                Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Current Plan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {subsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Loading member subscriptions...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No member subscriptions match the filters.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{sub.user?.fullName || 'Anonymous Member'}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {sub.user?.email || 'No email'} • {sub.user?.mobile || ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {sub.plan}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'EXPIRED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(sub.startDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {sub.expiryDate
                            ? new Date(sub.expiryDate).toLocaleDateString('en-IN')
                            : 'Lifetime'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingSub(sub);
                              setEditPlan(sub.plan);
                              setEditStatus(sub.status);
                              setEditExpiry(
                                sub.expiryDate
                                  ? new Date(sub.expiryDate).toISOString().split('T')[0]
                                  : ''
                              );
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE OR EDIT MEMBERSHIP PLAN                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#E51F3E] flex items-center justify-center font-bold">
                  {editingPlan ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Membership Plan'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Control pricing, durations, dynamic features and seasonal promotions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSavePlan} className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Section 1: Plan Information */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#E51F3E]" />
                  <span>Plan Information</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Plan Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Premium"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Slug (URL Identifier)
                    </label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="auto-generated if blank (e.g. premium)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Plan Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief highlights of this package for members..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              {/* Section 2: Pricing & Currency */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pricing & Currency</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Original Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formOriginalPrice}
                      onChange={(e) => setFormOriginalPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Discounted / Offer Price (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formDiscountedPrice}
                      onChange={(e) => setFormDiscountedPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                    <input
                      type="text"
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none uppercase font-semibold text-slate-700"
                    />
                  </div>
                </div>

                {Number(formOriginalPrice) > Number(formDiscountedPrice) && (
                  <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Frontend will show: strikethrough{' '}
                      <strong>₹{Number(formOriginalPrice).toLocaleString('en-IN')}</strong> and
                      highlighted <strong>₹{Number(formDiscountedPrice).toLocaleString('en-IN')}</strong>{' '}
                      (
                      {Math.round(
                        ((Number(formOriginalPrice) - Number(formDiscountedPrice)) /
                          Number(formOriginalPrice)) *
                          100
                      )}
                      % discount)
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Duration & Contacts */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Duration & Contact Requests</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Duration in Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formDurationDays}
                      onChange={(e) => setFormDurationDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Billing Period Label
                    </label>
                    <input
                      type="text"
                      value={formBillingPeriod}
                      onChange={(e) => setFormBillingPeriod(e.target.value)}
                      placeholder="e.g. 3 Months, 6 Months"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contact Request Credits
                    </label>
                    <input
                      type="number"
                      value={formContactLimit}
                      onChange={(e) => setFormContactLimit(e.target.value)}
                      placeholder="e.g. 25, 60, -1 for unlimited"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Dynamic Features List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#E51F3E]" />
                    <span>Membership Features ({formFeatures.length})</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {formFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50/50"
                    >
                      <span className="text-[11px] font-bold text-slate-400 w-5 text-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleMoveFeature(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFeature(idx, 'down')}
                        disabled={idx === formFeatures.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFeature(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete Feature"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Feature input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={formNewFeatureInput}
                      onChange={(e) => setFormNewFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      placeholder="Add a new feature (e.g. Priority Wedding Season Matches)..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 5: Promotions & Seasonal Offers */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Promotions & Seasonal Offers</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Is Most Popular Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        Mark as "Most Popular"
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Highlights card with rose border and badge
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formIsPopular}
                      onChange={(e) => setFormIsPopular(e.target.checked)}
                      className="w-5 h-5 text-[#E51F3E] rounded accent-[#E51F3E] cursor-pointer"
                    />
                  </div>

                  {/* Seasonal Offer Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        Activate Seasonal Offer
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Enables special event tag and banners
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formIsSeasonalOffer}
                      onChange={(e) => setFormIsSeasonalOffer(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>

                {formIsSeasonalOffer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 animate-in fade-in">
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        Seasonal Offer Label
                      </label>
                      <input
                        type="text"
                        value={formSeasonalLabel}
                        onChange={(e) => setFormSeasonalLabel(e.target.value)}
                        placeholder="e.g. Wedding Season Special"
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white focus:outline-none text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        Seasonal Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formSeasonalDiscount}
                        onChange={(e) => setFormSeasonalDiscount(e.target.value)}
                        placeholder="e.g. 40"
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white focus:outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Plan Status & Display Order */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Status & Display Settings</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        Active on Public Page
                      </div>
                      <div className="text-[11px] text-slate-500">
                        When disabled, hidden from public users
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Display Order (Position 1, 2, 3...)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#E51F3E] hover:bg-[#c91834] transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingPlan ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingPlan ? 'Save Changes' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteConfirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Membership Plan?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>"{deleteConfirmPlan.name}"</strong>?
                This will remove it from the platform permanently. Existing historical subscription
                and payment records will not be deleted.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlan(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlan}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Subscription Modal (Preserved) ─── */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Modify User Subscription</h3>
              <button
                onClick={() => setEditingSub(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSub} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
                >
                  <option value="FREE">FREE</option>
                  <option value="DOCTOR_CONNECT">DOCTOR_CONNECT</option>
                  <option value="PREMIUM">PREMIUM</option>
                  <option value="PREMIUM_VIP">PREMIUM_VIP</option>
                  <option value="VVIP">VVIP</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSub}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#E51F3E] hover:bg-[#c91834] disabled:opacity-50"
                >
                  {savingSub ? 'Saving...' : 'Update Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
