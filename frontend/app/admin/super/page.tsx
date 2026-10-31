'use client';

import React, { useEffect, useState } from 'react';
import {
  Crown,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  CreditCard,
  Ban,
  MessageSquare,
  FileText,
  Clock,
  Server,
  Edit,
  Send,
  Loader2,
  X,
  Eye,
} from 'lucide-react';
import {
  verifySuperAdminAccessApi,
  fetchMonetizationSummary,
  fetchSuperAdminPlans,
  updateSuperAdminPlan,
  fetchSafetySummary,
  fetchContactRequestsOversight,
  fetchBlocksList,
  fetchModerationQueue,
  fetchSecuritySummary,
  fetchAdminUsers,
  updateAdminPermissions,
  fetchAuditLogs,
  fetchSupportInquiries,
  fetchSupportInquiryDetails,
  addSupportInquiryNote,
  replySupportInquiry,
  retrySupportInquiryEmail,
} from '../../../services/superAdminApi';
import { getAdminUser, getAdminMe } from '../../../services/authApi';

type SuperAdminTab = 'monetization' | 'safety' | 'security' | 'support';
type AuthState = 'loading' | 'authorized' | 'unauthenticated' | 'forbidden' | 'error';

export default function SuperAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('monetization');
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('');
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Monetization
  const [monetizationData, setMonetizationData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planSaving, setPlanSaving] = useState(false);

  // Tab 2: Safety
  const [safetySummary, setSafetySummary] = useState<any>(null);
  const [contactRequests, setContactRequests] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Tab 3: Security & Operations
  const [securitySummary, setSecuritySummary] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [adminPermSaving, setAdminPermSaving] = useState(false);

  // Tab 4: Support
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [inquiryNote, setInquiryNote] = useState('');
  const [inquiryReply, setInquiryReply] = useState('');
  const [replyIdempotencyKey, setReplyIdempotencyKey] = useState('');
  const [replyStatus, setReplyStatus] = useState('RESOLVED');
  const [supportActionLoading, setSupportActionLoading] = useState(false);
  const [supportActionMsg, setSupportActionMsg] = useState<{ text: string; success: boolean } | null>(null);

  /**
   * Dedicated Authoritative Super Admin Authorization Check
   */
  const checkAuthorization = async (): Promise<boolean> => {
    setAuthState('loading');
    setAuthErrorMessage('');
    try {
      const res = await verifySuperAdminAccessApi();
      if (res?.success && res?.authorized) {
        setAuthState('authorized');
        setVerifiedUser(res.data);
        if (res.data && typeof window !== 'undefined') {
          localStorage.setItem('wonderfuljodi_admin_user', JSON.stringify(res.data));
          window.dispatchEvent(new CustomEvent('admin_user_updated', { detail: res.data }));
        }
        return true;
      } else {
        setAuthState('forbidden');
        setAuthErrorMessage('Super Administrator privileges required (permission "all" missing).');
        return false;
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setAuthState('unauthenticated');
        setAuthErrorMessage('Your administrator session has expired or is invalid. Please sign in again.');
        return false;
      } else if (status === 403) {
        setAuthState('forbidden');
        setAuthErrorMessage(
          err.response?.data?.message ||
            'Super Administrator privileges required. Your account does not have "all" permissions.'
        );
        return false;
      } else {
        // Network or 5xx server failure: must NOT show false permission denial
        setAuthState('error');
        setAuthErrorMessage(
          err.response?.data?.message ||
            'Temporary error connecting to Super Administrator authorization service. Please check your network and retry.'
        );
        return false;
      }
    }
  };

  // Perform initial authoritative authorization check on mount
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const ok = await checkAuthorization();
      if (ok && isMounted) {
        loadTabData(activeTab);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // When activeTab changes, load tab data if authorized
  useEffect(() => {
    if (authState === 'authorized') {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  const loadTabData = async (tab: SuperAdminTab) => {
    setLoading(true);
    setError(null);

    try {
      if (tab === 'monetization') {
        const [sumRes, plansRes] = await Promise.all([
          fetchMonetizationSummary(),
          fetchSuperAdminPlans(),
        ]);
        setMonetizationData(sumRes.data);
        setPlans(plansRes.data || []);
      } else if (tab === 'safety') {
        const [sumRes, reqsRes, blocksRes, reportsRes] = await Promise.all([
          fetchSafetySummary(),
          fetchContactRequestsOversight({ limit: 15 }),
          fetchBlocksList({ limit: 15 }),
          fetchModerationQueue({ limit: 15 }),
        ]);
        setSafetySummary(sumRes.data);
        setContactRequests(reqsRes.data?.requests || []);
        setBlocks(blocksRes.data?.blocks || []);
        setReports(reportsRes.data?.reports || []);
      } else if (tab === 'security') {
        const [sumRes, adminsRes, logsRes] = await Promise.all([
          fetchSecuritySummary(),
          fetchAdminUsers(),
          fetchAuditLogs({ limit: 20 }),
        ]);
        setSecuritySummary(sumRes.data);
        setAdminUsers(adminsRes.data || []);
        setAuditLogs(logsRes.data?.logs || []);
      } else if (tab === 'support') {
        const inqRes = await fetchSupportInquiries({ limit: 25 });
        setInquiries(inqRes.data?.inquiries || []);
      }
    } catch (err: any) {
      console.error('[SuperAdminDashboard] Error loading data:', err);
      if (err.response?.status === 401) {
        setAuthState('unauthenticated');
        setAuthErrorMessage('Your administrator session has expired. Please sign in again.');
      } else if (err.response?.status === 403) {
        // Authoritative re-verification if an endpoint returns 403
        await checkAuthorization();
      } else {
        setError(err.response?.data?.message || 'Failed to load Super Administrator dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setPlanSaving(true);
    try {
      const res = await updateSuperAdminPlan(editingPlan._id || editingPlan.id, {
        name: editingPlan.name,
        originalPrice: Number(editingPlan.originalPrice),
        discountedPrice: Number(editingPlan.discountedPrice),
        durationMonths: editingPlan.durationMonths ? Number(editingPlan.durationMonths) : null,
        contactRequestLimit: Number(editingPlan.contactRequestLimit),
        isUnlimitedContact: Boolean(editingPlan.isUnlimitedContact),
        isActive: Boolean(editingPlan.isActive),
        isPopular: Boolean(editingPlan.isPopular),
      });
      if (res.success) {
        setPlans((prev) =>
          prev.map((p) => ((p._id || p.id) === (editingPlan._id || editingPlan.id) ? res.data : p))
        );
        setEditingPlan(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update plan.');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleSaveAdminPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setAdminPermSaving(true);
    try {
      let perms: string[] = [];
      if (Array.isArray(editingAdmin.permissions)) {
        perms = editingAdmin.permissions;
      } else if (typeof editingAdmin.permissions === 'string') {
        try {
          const parsed = JSON.parse(editingAdmin.permissions);
          perms = Array.isArray(parsed) ? parsed : [];
        } catch {
          perms = editingAdmin.permissions.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      const adminId = editingAdmin.id || editingAdmin._id;
      const res = await updateAdminPermissions(adminId, perms);
      if (res.success) {
        setAdminUsers((prev) =>
          prev.map((a) => ((a.id || a._id) === adminId ? res.data : a))
        );
        setEditingAdmin(null);

        // If updating the currently logged-in admin, refresh session
        const current = getAdminUser();
        const targetUserId = editingAdmin.user?._id || editingAdmin.user?.id || editingAdmin.userId;
        if (current && (current._id === targetUserId || current.id === targetUserId)) {
          await getAdminMe();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update admin permissions.');
    } finally {
      setAdminPermSaving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !inquiryNote.trim()) return;
    setSupportActionLoading(true);
    setSupportActionMsg(null);
    try {
      const res = await addSupportInquiryNote(selectedInquiry._id || selectedInquiry.id, inquiryNote.trim());
      if (res.success) {
        setSelectedInquiry(res.data);
        setInquiryNote('');
        setSupportActionMsg({ text: 'Note appended successfully.', success: true });
      }
    } catch (err: any) {
      setSupportActionMsg({ text: err.response?.data?.message || 'Failed to add note.', success: false });
    } finally {
      setSupportActionLoading(false);
    }
  };

  const handleReplyInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !inquiryReply.trim()) return;
    setSupportActionLoading(true);
    setSupportActionMsg(null);
    try {
      // Retain and reuse identical idempotencyKey across retries for the same draft reply
      const idempotencyKey = replyIdempotencyKey || (
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      );
      if (!replyIdempotencyKey) {
        setReplyIdempotencyKey(idempotencyKey);
      }

      const res = await replySupportInquiry(selectedInquiry._id || selectedInquiry.id, {
        replyText: inquiryReply.trim(),
        newStatus: replyStatus,
        idempotencyKey,
      });
      if (res.success) {
        setSelectedInquiry(res.data);
        setInquiryReply('');
        setReplyIdempotencyKey(''); // Only cleared on successful completion
        setSupportActionMsg({
          text: res.message || 'Reply recorded and email accepted by SMTP.',
          success: true,
        });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.code === 'EMAIL_ACCEPTED_PERSISTENCE_FAILED') {
        setSupportActionMsg({
          text: 'Email was accepted by SMTP, but persisting final reply record encountered a database error. Please refresh.',
          success: false,
        });
      } else if (errorData?.code === 'REPLY_IN_PROGRESS') {
        setSupportActionMsg({
          text: 'This reply is already being transmitted to the SMTP server. Please wait a moment before retrying.',
          success: false,
        });
      } else {
        setSupportActionMsg({
          text: errorData?.message || 'Failed to send reply.',
          success: false,
        });
      }
    } finally {
      setSupportActionLoading(false);
    }
  };

  const handleRetryEmail = async (reconcileAction?: string, replyId?: string) => {
    if (!selectedInquiry) return;
    if (reconcileAction === 'FORCE_RETRY') {
      const confirmed = window.confirm(
        'Warning: When SMTP delivery is uncertain or in-progress, force-retrying may send a DUPLICATE email to the user if the original message was already accepted or delivered. Check mail server logs first. Proceed?'
      );
      if (!confirmed) return;
    }
    setSupportActionLoading(true);
    setSupportActionMsg(null);
    try {
      const res = await retrySupportInquiryEmail(selectedInquiry._id || selectedInquiry.id, {
        reconcileAction,
        replyId,
      });
      if (res.data) {
        setSelectedInquiry(res.data);
      }
      setSupportActionMsg({ text: res.message, success: res.success });
    } catch (err: any) {
      setSupportActionMsg({ text: err.response?.data?.message || 'Retry failed.', success: false });
    } finally {
      setSupportActionLoading(false);
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#800020] mb-2" />
        <h2 className="font-serif text-xl font-bold text-slate-800">Verifying Super Administrator Authorization...</h2>
        <p className="text-xs text-slate-500 max-w-sm">Checking authoritative privileges and credentials.</p>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center max-w-xl mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-amber-950">Authentication Required</h2>
          <p className="text-sm text-amber-800 leading-relaxed">
            {authErrorMessage || 'Your administrator session has expired or is invalid. Please sign in again.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <a
              href="/admin/login?redirect=/admin/super"
              className="px-5 py-2.5 rounded-full bg-[#800020] hover:bg-[#600018] text-white font-bold text-xs shadow-xs"
            >
              Sign In to Admin Portal
            </a>
            <button
              onClick={() => {
                checkAuthorization().then((ok) => {
                  if (ok) loadTabData(activeTab);
                });
              }}
              className="px-5 py-2.5 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs shadow-xs cursor-pointer"
            >
              Retry Session Check
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'forbidden') {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-3xl bg-rose-50 border border-rose-200 text-center max-w-xl mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-rose-950">Super Administrator Access Required</h2>
          <p className="text-sm text-rose-800 leading-relaxed">
            {authErrorMessage || (
              <>
                This module is restricted strictly to verified Super Administrators with full administrative permissions (
                <code className="bg-rose-100 px-2 py-0.5 rounded font-mono text-xs">all</code>).
              </>
            )}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                checkAuthorization().then((ok) => {
                  if (ok) loadTabData(activeTab);
                });
              }}
              className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Retry Access Check
            </button>
            <a
              href="/admin/dashboard"
              className="px-5 py-2.5 rounded-full bg-white border border-rose-300 text-rose-800 font-bold text-xs hover:bg-rose-100/60 transition"
            >
              Return to Admin Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center max-w-xl mx-auto my-12 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Service Temporarily Unavailable</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {authErrorMessage || 'Could not verify authorization due to a temporary network or server error. Access has not been denied.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                checkAuthorization().then((ok) => {
                  if (ok) loadTabData(activeTab);
                });
              }}
              className="px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-[#1E293B] to-[#800020] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Super Admin Console
            </span>
            <span className="text-xs text-white/60">Production Governance</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">System & Platform Governance</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Authoritative controls for monetization plans, trust & safety metrics, security audits, and support email communications.
          </p>
        </div>

        <button
          onClick={() => loadTabData(activeTab)}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 border border-white/15 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-bold">
        {[
          { id: 'monetization', label: 'Monetization & Promotion', icon: DollarSign },
          { id: 'safety', label: 'Engagement & Safety', icon: ShieldAlert },
          { id: 'security', label: 'Security & Operations', icon: Lock },
          { id: 'support', label: 'Support Notes & Email', icon: Mail },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as SuperAdminTab)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#E51F3E] text-[#E51F3E]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#E51F3E]" />
          <p className="text-xs font-semibold">Loading Super Administrator metrics...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: MONETIZATION & PROMOTION */}
      {/* ============================================================== */}
      {!loading && activeTab === 'monetization' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                ₹{(monetizationData?.totalRevenue || 0).toLocaleString()}
              </p>
              <span className="text-xs text-emerald-600 font-semibold">
                {monetizationData?.totalTransactions || 0} Successful Transactions
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Subscriptions</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {monetizationData?.activeSubscriptionsCount || 0}
              </p>
              <span className="text-xs text-slate-500 font-semibold">
                {monetizationData?.totalSubscriptions || 0} Lifetime Subscriptions
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {monetizationData?.conversionRatePercent || 0}%
              </p>
              <span className="text-xs text-slate-500 font-semibold">Paid Members / Total Active Users</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Configured Plans</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {monetizationData?.plansCount || plans.length}
              </p>
              <span className="text-xs text-emerald-600 font-semibold">Active in Catalog</span>
            </div>
          </div>

          {/* Membership Plans Management */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">Membership Plans Management</h3>
                <p className="text-xs text-slate-500">
                  Update original price, discounted price, duration, contact limits, and status with automatic audit logging.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Plan Name</th>
                    <th className="py-3 px-3">Original Price</th>
                    <th className="py-3 px-3">Discounted Price</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-3">Contact Limits</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {plans.map((p) => (
                    <tr key={p._id || p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {p.name}
                        {p.isPopular && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-100 text-[#E51F3E] text-[10px] font-bold">
                            Popular
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 line-through">
                        ₹{(p.originalPrice || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        ₹{(p.discountedPrice || p.price || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        {p.durationMonths ? `${p.durationMonths} Months` : `${p.durationDays || 30} Days`}
                      </td>
                      <td className="py-3.5 px-3">
                        {p.isUnlimitedContact ? (
                          <span className="font-bold text-emerald-600">Unlimited Contacts</span>
                        ) : (
                          <span>{p.contactRequestLimit || 0} Contacts</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {p.isActive ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setEditingPlan(p)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Edit Plan: {editingPlan.name}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 mb-1">Plan Display Name</label>
                <input
                  type="text"
                  value={editingPlan.name || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-normal focus:outline-[#E51F3E]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={editingPlan.originalPrice || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, originalPrice: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-normal focus:outline-[#E51F3E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Discounted Price (₹)</label>
                  <input
                    type="number"
                    value={editingPlan.discountedPrice || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, discountedPrice: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-normal focus:outline-[#E51F3E]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    value={editingPlan.durationMonths ?? ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, durationMonths: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-normal focus:outline-[#E51F3E]"
                    placeholder="e.g. 3, 6, 12"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Contact Unlocks Limit</label>
                  <input
                    type="number"
                    value={editingPlan.contactRequestLimit || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, contactRequestLimit: e.target.value })}
                    disabled={editingPlan.isUnlimitedContact}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-normal focus:outline-[#E51F3E] disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPlan.isUnlimitedContact)}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isUnlimitedContact: e.target.checked })}
                    className="w-4 h-4 text-[#E51F3E] rounded"
                  />
                  <span>Unlimited Contacts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPlan.isActive)}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#E51F3E] rounded"
                  />
                  <span>Active in Store</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPlan.isPopular)}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                    className="w-4 h-4 text-[#E51F3E] rounded"
                  />
                  <span>Popular Badge</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSaving}
                  className="px-5 py-2 rounded-full bg-[#E51F3E] hover:bg-[#CC1432] text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {planSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Plan Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ENGAGEMENT & SAFETY */}
      {/* ============================================================== */}
      {!loading && activeTab === 'safety' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Contact Requests</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {safetySummary?.contactRequests?.total || 0}
              </p>
              <span className="text-xs text-slate-500 font-semibold">
                {safetySummary?.contactRequests?.pending || 0} Pending • {safetySummary?.contactRequests?.accepted || 0} Accepted
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Member Blocks</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {safetySummary?.safetyMetrics?.activeBlocks || blocks.length}
              </p>
              <span className="text-xs text-rose-600 font-semibold">Enforced Mutual Block Records</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Reports</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {safetySummary?.safetyMetrics?.pendingReports || reports.length}
              </p>
              <span className="text-xs text-amber-600 font-semibold">Awaiting Moderation</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved Reports</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {safetySummary?.safetyMetrics?.resolvedReports || 0}
              </p>
              <span className="text-xs text-emerald-600 font-semibold">Audited Resolutions</span>
            </div>
          </div>

          {/* Contact Requests Oversight */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Contact Requests Oversight</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Requester</th>
                    <th className="py-3 px-3">Recipient</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Unlocked At</th>
                    <th className="py-3 px-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {contactRequests.map((req) => (
                    <tr key={req._id || req.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-3">
                        {req.requester ? (
                          <>
                            <span className="font-bold text-slate-900 block">{req.requester.fullName || 'Doctor'}</span>
                            <span className="text-[11px] text-slate-400">{req.requester.email || req.requester._id || req.requester.id}</span>
                          </>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠️ Orphaned Account
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ID: {req.requesterId || (typeof req.requester === 'string' ? req.requester : 'Unknown')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {req.recipient ? (
                          <>
                            <span className="font-bold text-slate-900 block">{req.recipient.fullName || 'Doctor'}</span>
                            <span className="text-[11px] text-slate-400">{req.recipient.email || req.recipient._id || req.recipient.id}</span>
                          </>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠️ Orphaned Account
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ID: {req.recipientId || (typeof req.recipient === 'string' ? req.recipient : 'Unknown')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            req.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {req.contactUnlockedAt ? new Date(req.contactUnlockedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: SECURITY & OPERATIONS */}
      {/* ============================================================== */}
      {!loading && activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Super Administrators</span>
              <p className="font-serif text-2xl font-bold text-[#800020]">
                {securitySummary?.superAdminCount || 0}
              </p>
              <span className="text-xs text-slate-500 font-semibold">
                Of {securitySummary?.adminsCount || adminUsers.length} Total Admins
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recent Audit Logs</span>
              <p className="font-serif text-2xl font-bold text-slate-900">
                {securitySummary?.recentAuditLogsCount || auditLogs.length}
              </p>
              <span className="text-xs text-emerald-600 font-semibold">Recorded in Last 24 Hours</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mail Service Status</span>
              <p className="font-serif text-lg font-bold text-slate-900 truncate">
                {securitySummary?.emailConfigured ? 'Connected' : 'Unconfigured'}
              </p>
              <span className="text-xs text-slate-500 font-semibold truncate block">
                {securitySummary?.smtpHost || 'SMTP Service'}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Node & Server Uptime</span>
              <p className="font-serif text-lg font-bold text-slate-900">
                {securitySummary?.uptimeSeconds
                  ? `${Math.floor(securitySummary.uptimeSeconds / 3600)}h ${Math.floor(
                      (securitySummary.uptimeSeconds % 3600) / 60
                    )}m`
                  : 'Active'}
              </p>
              <span className="text-xs text-slate-500 font-semibold">
                Node {securitySummary?.nodeVersion || process.version}
              </span>
            </div>
          </div>

          {/* Admin Accounts & Permissions */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Admin Account Privilege Management</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Admin Name / Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Permissions</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {adminUsers.map((a) => {
                    const perms: string[] = Array.isArray(a.permissions)
                      ? a.permissions
                      : typeof a.permissions === 'string'
                      ? JSON.parse(a.permissions || '[]')
                      : [];
                    const isSuper = perms.includes('all');
                    return (
                      <tr key={a._id || a.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-900 block">{a.user?.fullName || 'Administrator'}</span>
                          <span className="text-[11px] text-slate-400">{a.user?.email || a.user?._id}</span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800">{a.user?.role || 'admin'}</td>
                        <td className="py-3.5 px-3">
                          {isSuper ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] inline-flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-600" />
                              Super Admin (all)
                            </span>
                          ) : (
                            <span className="text-slate-600">{perms.join(', ') || 'standard'}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Active
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => setEditingAdmin(a)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Permissions</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-slate-900">Security & Governance Audit Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Admin</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Target</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.map((log) => (
                    <tr key={log._id || log.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {log.adminEmail || log.adminName || 'Admin'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[11px] text-[#800020]">
                        {log.action}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {log.targetModel ? `${log.targetModel} (${log.targetId || ''})` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {log.status || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin Permissions Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Edit Permissions
              </h3>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminPermissions} className="space-y-4 text-xs font-semibold">
              <p className="text-slate-600">
                Grant or revoke Super Admin privileges for <span className="font-bold text-slate-900">{editingAdmin.user?.email}</span>.
              </p>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      Array.isArray(editingAdmin.permissions)
                        ? editingAdmin.permissions.includes('all')
                        : String(editingAdmin.permissions).includes('all')
                    }
                    onChange={(e) => {
                      const hasAll = e.target.checked;
                      setEditingAdmin({
                        ...editingAdmin,
                        permissions: hasAll ? ['all', 'read', 'write'] : ['read'],
                      });
                    }}
                    className="w-4 h-4 text-[#800020] rounded"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">Super Administrator (all)</span>
                    <span className="text-[11px] text-amber-800 font-normal block">
                      Enables full system governance, monetization editing, and privilege assignments.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminPermSaving}
                  className="px-5 py-2 rounded-full bg-[#800020] hover:bg-[#600018] text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {adminPermSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SUPPORT NOTES & EMAIL INQUIRIES */}
      {/* ============================================================== */}
      {!loading && activeTab === 'support' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Inquiries List */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
              <h3 className="font-serif text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Inquiry Inbox ({inquiries.length})
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {inquiries.map((inq) => {
                  const isSelected = selectedInquiry && (selectedInquiry._id || selectedInquiry.id) === (inq._id || inq.id);
                  return (
                    <div
                      key={inq._id || inq.id}
                      onClick={() => setSelectedInquiry(inq)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer text-xs space-y-1.5 ${
                        isSelected
                          ? 'border-[#E51F3E] bg-rose-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{inq.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] ${
                            inq.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inq.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inq.status}
                        </span>
                      </div>
                      <p className="text-slate-600 truncate">{inq.message}</p>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(inq.createdAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Inspection, Notes & Email Composer */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
              {selectedInquiry ? (
                <>
                  <div className="border-b border-slate-100 pb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl font-bold text-slate-900">
                        {selectedInquiry.name} ({selectedInquiry.inquiryId || 'Inquiry'})
                      </h3>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                        {selectedInquiry.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Email: <strong className="text-slate-800">{selectedInquiry.email}</strong></span>
                      <span>Mobile: <strong className="text-slate-800">{selectedInquiry.mobileNumber || 'N/A'}</strong></span>
                      <span>Category: <strong className="text-slate-800">{selectedInquiry.category || 'General'}</strong></span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-700 leading-relaxed mt-2">
                      <span className="font-bold text-slate-900 block mb-1">User Message:</span>
                      {selectedInquiry.message}
                    </div>
                  </div>

                  {supportActionMsg && (
                    <div
                      className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                        supportActionMsg.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{supportActionMsg.text}</span>
                    </div>
                  )}

                  {/* Internal Notes Section */}
                  <div className="space-y-3">
                    <h4 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span>Internal Administrator Notes</span>
                    </h4>
                    {(() => {
                      const noteEntries = Array.isArray(selectedInquiry.statusHistory)
                        ? selectedInquiry.statusHistory.filter((h: any) => h.eventType === 'NOTE_ADDED' || h.noteText)
                        : [];
                      if (noteEntries.length > 0) {
                        return (
                          <div className="space-y-2">
                            {noteEntries.map((n: any, idx: number) => (
                              <div key={idx} className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-xs space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-amber-900/70 font-semibold">
                                  <span>{n.changedByEmail || 'Administrator'}</span>
                                  <span>{n.changedAt ? new Date(n.changedAt).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-amber-950 font-medium whitespace-pre-wrap">{n.reason || n.noteText}</p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      if (selectedInquiry.adminNotes) {
                        return (
                          <pre className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-xs font-mono text-amber-950 whitespace-pre-wrap">
                            {selectedInquiry.adminNotes}
                          </pre>
                        );
                      }
                      return null;
                    })()}
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        value={inquiryNote}
                        onChange={(e) => setInquiryNote(e.target.value)}
                        placeholder="Add internal confidential note..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-[#E51F3E]"
                      />
                      <button
                        type="submit"
                        disabled={supportActionLoading || !inquiryNote.trim()}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        Add Note
                      </button>
                    </form>
                  </div>

                  {/* Compose Reply Section */}
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <h4 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-[#E51F3E]" />
                      <span>Compose Email Reply (Delivers to {selectedInquiry.email})</span>
                    </h4>
                    <form onSubmit={handleReplyInquiry} className="space-y-3">
                      <textarea
                        rows={4}
                        value={inquiryReply}
                        onChange={(e) => setInquiryReply(e.target.value)}
                        placeholder="Type reply message to user..."
                        className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs focus:outline-[#E51F3E]"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-600 font-semibold">New Status:</span>
                          <select
                            value={replyStatus}
                            onChange={(e) => setReplyStatus(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 font-medium"
                          >
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="WAITING_FOR_USER">WAITING_FOR_USER</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={supportActionLoading || !inquiryReply.trim()}
                          className="px-5 py-2 rounded-full bg-[#E51F3E] hover:bg-[#CC1432] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {supportActionLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Send Reply & Email</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Reply History & Delivery Status */}
                  {Array.isArray(selectedInquiry.adminReplies) && selectedInquiry.adminReplies.length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <h4 className="font-serif text-sm font-bold text-slate-900">Reply History & Delivery Status</h4>
                      <div className="space-y-2">
                        {selectedInquiry.adminReplies.map((r: any, idx: number) => {
                          const isDefinitiveFailure = r.deliveryStatus === 'FAILED' || (!r.deliveryStatus && !r.emailSent);
                          const isSending = r.deliveryStatus === 'SENDING' || r.deliveryStatus === 'QUEUED';
                          const isUnknown = r.deliveryStatus === 'DELIVERY_UNKNOWN';
                          const isAccepted = r.deliveryStatus === 'SENT' || (r.emailSent && !r.deliveryStatus);

                          return (
                            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800">{r.sentByEmail || 'Support Admin'}</span>
                                {isAccepted ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    Accepted by SMTP
                                  </span>
                                ) : isSending ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    Sending in progress
                                  </span>
                                ) : isUnknown ? (
                                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">
                                    Delivery Unknown (Manual check required)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    Delivery Failed: {r.deliveryError || r.emailError || 'SMTP Error'}
                                  </span>
                                )}
                              </div>
                              {r.smtpMessageId && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Message-ID: {r.smtpMessageId}
                                </div>
                              )}
                              <p className="text-slate-700 whitespace-pre-wrap">{r.replyText}</p>
                              {isUnknown && (
                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1.5 mt-2">
                                  <p className="font-semibold text-amber-800">
                                    ⚠️ Notice: When SMTP acceptance is uncertain, force-retrying may dispatch a duplicate email if the message was delivered. Check mail logs first.
                                  </p>
                                  <button
                                    type="button"
                                    disabled={supportActionLoading}
                                    onClick={() => handleRetryEmail('FORCE_RETRY', r.replyId)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Force Retry (May Duplicate if Delivered)</span>
                                  </button>
                                </div>
                              )}
                              {isDefinitiveFailure && idx === selectedInquiry.adminReplies.length - 1 && (
                                <div className="pt-1.5">
                                  <button
                                    type="button"
                                    disabled={supportActionLoading}
                                    onClick={() => handleRetryEmail()}
                                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Retry Sending Email</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Mail className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">Select an inquiry from the left to inspect, add notes, and compose replies.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
