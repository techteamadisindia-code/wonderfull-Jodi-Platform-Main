'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Check,
  CreditCard,
  IndianRupee,
  AlertTriangle,
  MailQuestion,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  X,
  Send,
  FileText,
  AlertCircle,
  FileCheck,
  UserX,
  UserPlus,
  Wrench,
  TrendingUp,
  Calendar,
  BarChart3,
  ChevronDown,
  Info,
  Table,
} from 'lucide-react';
import {
  fetchDashboardStats,
  DashboardStats,
  sendBroadcastNotification,
  fetchDailyVisitsAnalytics,
  DailyVisitsAnalyticsResponse,
  DailyVisitDayData,
} from '../../../services/adminApi';
import {
  approveVerification,
  rejectVerification,
} from '../../../services/verificationApi';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Daily Visited Users State
  const [visitsData, setVisitsData] = useState<DailyVisitsAnalyticsResponse | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsPeriod, setVisitsPeriod] = useState<number>(7);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DailyVisitDayData | null>(null);
  const [showDailyTable, setShowDailyTable] = useState<boolean>(false);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    userName: string;
    email: string;
    documentType: string;
    documentUrl: string;
    status: string;
    id: string;
  } | null>(null);

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'SYSTEM',
    target: 'ALL',
    link: '/search',
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadVisitsData = useCallback(async (periodToFetch?: number, isBackground = false) => {
    const period = periodToFetch !== undefined ? periodToFetch : visitsPeriod;
    if (!isBackground) {
      setVisitsLoading(true);
    }
    setVisitsError(null);
    try {
      const data = await fetchDailyVisitsAnalytics(period);
      setVisitsData(data);
    } catch (err: any) {
      console.error('Failed to fetch daily visits analytics:', err);
      if (!isBackground) {
        setVisitsError(
          err?.response?.data?.message || 'Unable to load daily visitor analytics. Please try again.'
        );
      }
    } finally {
      if (!isBackground) {
        setVisitsLoading(false);
      }
    }
  }, [visitsPeriod]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [data] = await Promise.all([
        fetchDashboardStats(),
        loadVisitsData(undefined, isRefresh),
      ]);
      setStats(data);
      if (isRefresh) {
        showToast('Dashboard data synchronized successfully!');
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err?.response?.data?.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadVisitsData]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadVisitsData(undefined, true);
    }, 60000);
    return () => clearInterval(timer);
  }, [loadData, loadVisitsData]);

  const handleQuickApprove = async (id: string, userName: string) => {
    try {
      await approveVerification(id, 'Approved via Admin Dashboard verification queue');
      showToast(`Verification for ${userName} approved successfully!`);
      if (previewDoc?.id === id) setPreviewDoc(null);
      loadData(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to approve verification', 'error');
    }
  };

  const handleQuickReject = async (id: string, userName: string) => {
    try {
      await rejectVerification(
        id,
        'Uploaded certificate or ID requires re-verification',
        'Rejected via Admin Dashboard'
      );
      showToast(`Verification for ${userName} marked as rejected.`, 'success');
      if (previewDoc?.id === id) setPreviewDoc(null);
      loadData(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to reject verification', 'error');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }
    setSendingBroadcast(true);
    try {
      await sendBroadcastNotification(broadcastForm);
      showToast('Broadcast notification sent successfully to active members!');
      setShowBroadcastModal(false);
      setBroadcastForm({
        title: '',
        message: '',
        type: 'SYSTEM',
        target: 'ALL',
        link: '/search',
      });
      loadData(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to send broadcast', 'error');
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Helper formatting
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Compute metrics
  const totalUsersCount = stats?.totalUsers ?? 0;
  const activeUsersCount = stats?.activeUsers ?? 0;
  const engagementRate = totalUsersCount > 0 ? Math.round((activeUsersCount / totalUsersCount) * 100) : 100;

  // 8 KPI Card definitions
  const kpiCards = [
    {
      label: 'TOTAL USERS',
      value: (stats?.totalUsers ?? 0).toLocaleString('en-IN'),
      subValue: `+${stats?.newRegistrations7d ?? 0} this week`,
      icon: Users,
      iconBg: 'bg-blue-500/10 text-blue-600',
      href: '/admin/users',
      highlight: false,
    },
    {
      label: 'ACTIVE ACCOUNTS',
      value: (stats?.activeUsers ?? 0).toLocaleString('en-IN'),
      subValue: `${engagementRate}% engagement rate`,
      icon: Activity,
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      href: '/admin/users?status=active',
      highlight: false,
    },
    {
      label: 'INACTIVE ACCOUNTS',
      value: (stats?.inactiveUsers ?? 0).toLocaleString('en-IN'),
      subValue: 'Accounts currently inactive',
      icon: UserX,
      iconBg: 'bg-slate-500/10 text-slate-600',
      href: '/admin/users?status=inactive',
      highlight: false,
    },
    {
      label: 'INCOMPLETE REGISTRATIONS',
      value: (stats?.incompleteRegistrations ?? 0).toLocaleString('en-IN'),
      subValue: 'Candidates haven\'t completed',
      icon: UserPlus,
      iconBg: 'bg-rose-500/10 text-rose-600',
      href: '/admin/unregistered-candidates',
      highlight: (stats?.incompleteRegistrations ?? 0) > 0,
    },
    {
      label: 'VERIFIED PROFILES',
      value: (stats?.verifiedProfiles ?? 0).toLocaleString('en-IN'),
      subValue: 'Doctor & ID verified',
      icon: ShieldCheck,
      iconBg: 'bg-cyan-500/10 text-cyan-600',
      href: '/admin/profiles?verificationStatus=VERIFIED',
      highlight: false,
    },
    {
      label: 'PENDING VERIFICATIONS',
      value: (stats?.pendingVerification ?? 0).toLocaleString('en-IN'),
      subValue: 'Action required',
      icon: ShieldAlert,
      iconBg: 'bg-amber-500/10 text-amber-600',
      href: '/admin/verification',
      highlight: (stats?.pendingVerification ?? 0) > 0,
    },
    {
      label: 'PREMIUM SUBSCRIBERS',
      value: (stats?.premiumUsers ?? 0).toLocaleString('en-IN'),
      subValue: 'Paid active members',
      icon: CreditCard,
      iconBg: 'bg-purple-500/10 text-purple-600',
      href: '/admin/memberships',
      highlight: false,
    },
    {
      label: 'TOTAL REVENUE (INR)',
      value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`,
      subValue: 'Lifetime collections',
      icon: IndianRupee,
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      href: '/admin/payments',
      highlight: false,
    },
    {
      label: 'ABUSE REPORTS',
      value: (stats?.pendingReports ?? 0).toLocaleString('en-IN'),
      subValue: 'Pending moderation',
      icon: AlertTriangle,
      iconBg: 'bg-rose-500/10 text-rose-600',
      href: '/admin/reports',
      highlight: (stats?.pendingReports ?? 0) > 0,
    },
    {
      label: 'NEW INQUIRIES',
      value: (stats?.newInquiries ?? 0).toLocaleString('en-IN'),
      subValue: 'Support & VVIP requests',
      icon: MailQuestion,
      iconBg: 'bg-indigo-500/10 text-indigo-600',
      href: '/admin/settings',
      highlight: (stats?.newInquiries ?? 0) > 0,
    },
    {
      label: 'PLATFORM STATUS',
      value: stats?.maintenanceMode ? 'Maintenance' : 'Live Online',
      subValue: stats?.maintenanceMode ? 'Public traffic paused' : 'Serving active traffic',
      icon: Wrench,
      iconBg: stats?.maintenanceMode ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600',
      href: '/admin/settings',
      highlight: Boolean(stats?.maintenanceMode),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-6">
      {/* Toast Alert Feedback */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold transition-all duration-300 border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.message}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="ml-2 text-slate-400 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Heading & Control Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Platform Analytics & Control
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5">
            Real-time matrimonial database metrics, verifications queue, and billing overview.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing ? 'animate-spin text-[#E51F3E]' : 'text-slate-500'
              }`}
            />
            <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] hover:from-[#d11936] hover:to-[#e02848] text-white font-semibold text-xs shadow-xs shadow-red-500/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Broadcast Alert</span>
          </button>
        </div>
      </div>

      {/* Error state if API fails */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">Unable to load dashboard data.</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadData(false)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition self-start sm:self-auto"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4 sm:space-y-5 animate-pulse">
          {/* KPI Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1100px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-3 sm:gap-[14px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
              <div key={i} className="h-28 bg-slate-200/80 rounded-xl"></div>
            ))}
          </div>

          {/* Large Cards Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="h-72 bg-slate-200/80 rounded-xl"></div>
            <div className="h-72 bg-slate-200/80 rounded-xl"></div>
          </div>

          {/* Table Skeleton */}
          <div className="h-64 bg-slate-200/80 rounded-xl"></div>
        </div>
      ) : (
        <>
          {/* 11 KPI Cards Grid (5 per row on >=1400px, 4 on >=1100px, 3 on lg, 2 on sm, 1 on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1100px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-3 sm:gap-[14px]">
            {kpiCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <Link
                  key={idx}
                  href={card.href}
                  className={`p-3.5 sm:p-4 rounded-xl bg-white border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group relative flex flex-col justify-between h-full ${
                    card.highlight
                      ? 'border-amber-300 ring-1 ring-amber-400/30 shadow-amber-500/10'
                      : 'border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p
                        className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate"
                        title={card.label}
                      >
                        {card.label}
                      </p>
                      <p className="text-xl sm:text-2xl min-[1400px]:text-[25px] font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5 truncate">
                        {card.value}
                      </p>
                      <p
                        className="text-[11px] sm:text-[11.5px] font-medium text-slate-400 truncate mt-0.5"
                        title={card.subValue}
                      >
                        {card.subValue}
                      </p>
                    </div>

                    <div
                      className={`w-9 h-9 sm:w-[38px] sm:h-[38px] rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${card.iconBg}`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex items-center justify-between text-[11px] sm:text-[11.5px] font-semibold text-[#E51F3E] group-hover:text-[#c41530] transition">
                    <span>View Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Dedicated Analytics Block: DAILY VISITED USERS */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Block Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-rose-50/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#E51F3E]/10 to-[#E51F3E]/20 text-[#E51F3E] border border-[#E51F3E]/20 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                      DAILY VISITED USERS
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Real Activity
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Unique authenticated member activity tracked once per calendar day
                  </p>
                </div>
              </div>

              {/* Controls: Period Selector, Table View Toggle & Refresh */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <div className="relative">
                  <select
                    value={visitsPeriod}
                    onChange={(e) => {
                      const p = parseInt(e.target.value, 10);
                      setVisitsPeriod(p);
                      loadVisitsData(p);
                    }}
                    disabled={visitsLoading}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] transition cursor-pointer disabled:opacity-60"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={14}>Last 14 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowDailyTable(!showDailyTable)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
                    showDailyTable
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                  title="Toggle detailed tabular breakdown"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>{showDailyTable ? 'Hide Table' : 'View Table'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadVisitsData(visitsPeriod)}
                  disabled={visitsLoading}
                  title="Refresh Daily Visits Analytics"
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${visitsLoading ? 'animate-spin text-[#E51F3E]' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Error state for visits */}
            {visitsError && !visitsLoading && (
              <div className="p-3 m-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 text-xs">
                <span>{visitsError}</span>
                <button
                  onClick={() => loadVisitsData(visitsPeriod)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Metrics Summary Strip */}
            <div className="p-3 sm:p-3.5 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Metric 1: Today */}
              <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Today's Visitors
                </span>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {visitsLoading && !visitsData
                      ? '...'
                      : (visitsData?.today ?? 0).toLocaleString('en-IN')}
                  </span>
                  {visitsData && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold ${
                        visitsData.comparisonStatus === 'INCREASE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : visitsData.comparisonStatus === 'DECREASE'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : visitsData.comparisonStatus === 'FIRST_VISITS'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {visitsData.comparisonText ||
                        `${visitsData.percentChangeVsYesterday >= 0 ? '+' : ''}${visitsData.percentChangeVsYesterday}% vs yesterday`}
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  Unique active members today
                </p>
              </div>

              {/* Metric 2: Total Daily Visits Sum */}
              <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Daily Visits ({visitsPeriod}d Sum)
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {visitsLoading && !visitsData
                    ? '...'
                    : (visitsData?.dailyVisitsSum ?? visitsData?.totalDailyVisitsSum ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  Sum of unique daily visitor counts
                </p>
              </div>

              {/* Metric 3: Distinct Unique Users Across Period */}
              <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Distinct Unique Users
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {visitsLoading && !visitsData
                    ? '...'
                    : (visitsData?.distinctUniqueUsers ?? visitsData?.uniqueUsersAcrossPeriod ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  Unique individuals active in {visitsPeriod} days
                </p>
              </div>

              {/* Metric 4: Daily Average */}
              <div className="p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200/70 shadow-2xs space-y-0.5">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Daily Average
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {visitsLoading && !visitsData
                    ? '...'
                    : (visitsData?.dailyAverage ?? visitsData?.averageDailyVisitors ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  Avg unique visitors per day
                </p>
              </div>
            </div>

            {/* Interactive Chart Section */}
            <div className="p-3.5 sm:p-4 space-y-3">
              {visitsLoading && !visitsData ? (
                <div className="h-44 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#E51F3E]" />
                    <span>Loading daily visitor analytics...</span>
                  </div>
                </div>
              ) : visitsData && visitsData.data && visitsData.data.length > 0 ? (
                (() => {
                  const maxCount = Math.max(
                    ...visitsData.data.map((d) => d.uniqueVisitors),
                    1
                  );

                  return (
                    <div className="space-y-3">
                      {/* Chart Info Header / Active Tooltip summary */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pb-0.5">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-[11.5px]">
                            Activity Timeline ({visitsData.startDate} to {visitsData.endDate})
                          </span>
                        </div>
                        {hoveredDay ? (
                          <span className="font-bold text-slate-900 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10.5px] animate-fade-in">
                            {hoveredDay.fullLabel}: <strong>{hoveredDay.uniqueVisitors}</strong> unique visitor{hoveredDay.uniqueVisitors !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-slate-400 hidden sm:inline">
                            Hover over bars to inspect details
                          </span>
                        )}
                      </div>

                      {/* Responsive Visual Bar Chart */}
                      <div className="relative pt-4 pb-1 border-b border-slate-100 overflow-x-auto">
                        <div
                          className="flex items-end justify-between gap-1.5 sm:gap-2.5 min-w-full h-36 sm:h-40"
                          style={{
                            minWidth: visitsPeriod > 14 ? `${visitsData.data.length * 26}px` : '100%',
                          }}
                        >
                          {visitsData.data.map((item, idx) => {
                            const barHeightPercent = Math.max(
                              (item.uniqueVisitors / maxCount) * 100,
                              item.uniqueVisitors > 0 ? 8 : 2
                            );
                            const isHovered = hoveredDay?.date === item.date;

                            return (
                              <div
                                key={idx}
                                className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                                onMouseEnter={() => setHoveredDay(item)}
                                onMouseLeave={() => setHoveredDay(null)}
                              >
                                {/* Tooltip Popover */}
                                {isHovered && (
                                  <div className="absolute -top-11 z-20 px-2 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold shadow-lg whitespace-nowrap pointer-events-none transform -translate-y-0.5 transition-all">
                                    <p>{item.fullLabel}</p>
                                    <p className="text-rose-300 font-semibold">
                                      {item.uniqueVisitors} unique visitor{item.uniqueVisitors !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                )}

                                {/* Count label above bar */}
                                <span
                                  className={`text-[9.5px] font-bold mb-1 transition-colors ${
                                    item.isToday
                                      ? 'text-[#E51F3E]'
                                      : item.uniqueVisitors > 0
                                      ? 'text-slate-700'
                                      : 'text-slate-300'
                                  }`}
                                >
                                  {item.uniqueVisitors}
                                </span>

                                {/* Bar Element */}
                                <div
                                  className={`w-full max-w-[32px] sm:max-w-[42px] rounded-t-md transition-all duration-300 ${
                                    item.isToday
                                      ? 'bg-gradient-to-t from-[#E51F3E] via-[#F03554] to-rose-400 ring-2 ring-[#E51F3E]/30 shadow-xs shadow-rose-500/20'
                                      : item.uniqueVisitors > 0
                                      ? 'bg-gradient-to-t from-slate-800 to-slate-600 group-hover:from-[#E51F3E] group-hover:to-rose-400 group-hover:shadow-xs'
                                      : 'bg-slate-100 group-hover:bg-slate-200'
                                  }`}
                                  style={{ height: `${barHeightPercent}%` }}
                                />

                                {/* Date / Day label below bar */}
                                <div className="mt-1.5 text-center">
                                  <span
                                    className={`text-[9.5px] font-bold block truncate ${
                                      item.isToday
                                        ? 'text-[#E51F3E]'
                                        : 'text-slate-500 group-hover:text-slate-900'
                                    }`}
                                  >
                                    {item.displayLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-1.5">
                  <Users className="w-7 h-7 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No visitor activity recorded in this period.</p>
                  <p className="text-[11px] text-slate-400">Activity will automatically register as users sign in and browse.</p>
                </div>
              )}

              {/* Detailed Breakdown Table (Collapsible) */}
              {showDailyTable && visitsData && visitsData.data && (
                <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      Day-by-Day Activity Audit Table
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {visitsData.data.length} consecutive calendar days
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Day</th>
                          <th className="px-3 py-2 text-right">Unique Visitors</th>
                          <th className="px-3 py-2 text-right">% Contribution</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visitsData.data
                          .slice()
                          .reverse()
                          .map((row, idx) => {
                            const totalSum = visitsData.totalDailyVisitsSum || 1;
                            const sharePercent = Math.round((row.uniqueVisitors / totalSum) * 100);

                            return (
                              <tr
                                key={idx}
                                className={`hover:bg-slate-50/80 transition ${
                                  row.isToday ? 'bg-rose-50/30 font-semibold' : ''
                                }`}
                              >
                                <td className="px-4 py-2.5 font-medium text-slate-900">
                                  {row.fullLabel}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500">
                                  {row.dayName}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                  {row.uniqueVisitors}
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-500">
                                  {sharePercent}%
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {row.isToday ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                                      Today
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Recorded
                                    </span>
                                  )}
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
          </div>

          {/* Section 2: Two Large Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 lg:gap-4">
            {/* Card 1: Pending KYC & Degree Verifications */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-tight">
                      Pending KYC & Degree Verifications
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Doctor degree certificates & government IDs awaiting review
                    </p>
                  </div>
                </div>

                <Link
                  href="/admin/verification"
                  className="text-xs font-bold text-[#E51F3E] hover:text-[#c41530] inline-flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>View All ({stats?.pendingVerification ?? 0})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-3.5 sm:p-4 flex-1 divide-y divide-slate-100">
                {stats?.recentVerifications && stats.recentVerifications.length > 0 ? (
                  stats.recentVerifications.map((item) => (
                    <div
                      key={item._id}
                      className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                            {item.user?.fullName || 'Doctor Applicant'}
                          </span>
                          <span
                            className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              item.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11.5px] font-medium text-slate-600 mt-0.5">
                          {item.documentType}
                        </p>
                        <p className="text-[10.5px] text-slate-400 truncate">
                          {item.user?.email || 'N/A'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            setPreviewDoc({
                              id: item._id,
                              userName: item.user?.fullName || 'Doctor User',
                              email: item.user?.email || 'N/A',
                              documentType: item.documentType,
                              documentUrl: item.documentUrl,
                              status: item.status,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1 transition shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Preview</span>
                        </button>

                        {item.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() =>
                                handleQuickApprove(
                                  item._id,
                                  item.user?.fullName || 'User'
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-xs transition"
                              title="Approve verification"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() =>
                                handleQuickReject(
                                  item._id,
                                  item.user?.fullName || 'User'
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-xs transition"
                              title="Reject verification"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-500">
                      No pending verifications
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All doctor qualifications and IDs are up to date.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Recent Revenue & Transactions */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-tight">
                      Recent Revenue & Transactions
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Live payment orders and membership subscription upgrades
                    </p>
                  </div>
                </div>

                <Link
                  href="/admin/payments"
                  className="text-xs font-bold text-[#E51F3E] hover:text-[#c41530] inline-flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-3.5 sm:p-4 flex-1 divide-y divide-slate-100">
                {stats?.recentPayments && stats.recentPayments.length > 0 ? (
                  stats.recentPayments.map((payment) => (
                    <div
                      key={payment._id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-sm sm:text-[15px] font-extrabold text-slate-900">
                            ₹{payment.amount.toLocaleString('en-IN')}
                          </span>
                          <span
                            className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              payment.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : payment.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                          {payment.user?.fullName || 'Subscriber'}
                        </p>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          {payment.user?.email || 'N/A'}
                        </p>
                        <p className="text-[9.5px] text-slate-400 mt-0.5">
                          Gateway: <span className="font-mono">{payment.provider}</span> • ID:{' '}
                          <span className="font-mono">{payment.providerPaymentId}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                          {formatDateTime(payment.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-500">
                      No recent transactions
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      New membership payments will show up here live.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Recent User Registrations Table */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-tight">
                    Recent User Registrations
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Latest doctor matrimonial profiles joined on the platform
                  </p>
                </div>
              </div>

              <Link
                href="/admin/users"
                className="text-xs font-bold text-[#E51F3E] hover:text-[#c41530] inline-flex items-center gap-1 shrink-0 ml-2"
              >
                <span>Manage All Users</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100 text-[10.5px]">
                  <tr>
                    <th className="py-2.5 px-3.5 sm:px-4 w-[16%] whitespace-nowrap">USER NAME</th>
                    <th className="py-2.5 px-3.5 sm:px-4 w-[10%] whitespace-nowrap">USER ID</th>
                    <th className="py-2.5 px-3.5 sm:px-4 w-[24%] whitespace-nowrap">EMAIL ADDRESS</th>
                    <th className="py-2.5 px-3.5 sm:px-4 w-[16%] whitespace-nowrap">MOBILE NUMBER</th>
                    <th className="py-2.5 px-3.5 sm:px-4 w-[9%] text-center whitespace-nowrap">VERIFICATION</th>
                    <th className="py-2.5 px-3.5 sm:px-4 w-[10%] text-center whitespace-nowrap">STATUS</th>
                    <th className="py-2.5 px-3.5 sm:px-4 w-[15%] whitespace-nowrap">REGISTERED ON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                    stats.recentUsers.map((user) => {
                      const rawId = String(user._id || user.id || user.userId || '');
                      const shortId = rawId.length > 6 ? rawId.slice(-6) : rawId;
                      const isVerified =
                        String(user.verificationStatus || '').toUpperCase() === 'VERIFIED' ||
                        user.verified === true;
                      const isActive =
                        user.isActive === true ||
                        String(user.accountStatus || '').toLowerCase() === 'active';
                      const isSuspended =
                        user.isActive === false ||
                        String(user.accountStatus || '').toLowerCase() === 'suspended';

                      return (
                        <tr key={rawId || user.email} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3.5 sm:px-4 font-bold text-slate-900 whitespace-nowrap">
                            {user.fullName || user.name}
                          </td>
                          <td className="py-2.5 px-3.5 sm:px-4 whitespace-nowrap">
                            <span
                              className="font-mono text-[11px] text-slate-400 font-normal hover:text-slate-600 transition cursor-help select-all"
                              title={rawId}
                            >
                              {shortId}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 sm:px-4 text-slate-600 font-medium whitespace-nowrap">
                            {user.email}
                          </td>
                          <td className="py-2.5 px-3.5 sm:px-4 text-slate-600 font-mono whitespace-nowrap">
                            {user.mobile}
                          </td>
                          {/* VERIFICATION COLUMN: ONLY Blue ✓ (#2563EB) for Verified, Dark ✓ (#111827) for Not Verified */}
                          <td className="py-2.5 px-3.5 sm:px-4 text-center">
                            <div className="flex items-center justify-center">
                              {isVerified ? (
                                <span title="Verified">
                                  <Check
                                    className="h-4 w-4 text-[#2563EB] shrink-0"
                                    strokeWidth={2.5}
                                    aria-label="Verified"
                                  />
                                </span>
                              ) : (
                                <span title="Not Verified">
                                  <Check
                                    className="h-4 w-4 text-[#111827] shrink-0"
                                    strokeWidth={2.5}
                                    aria-label="Not Verified"
                                  />
                                </span>
                              )}
                            </div>
                          </td>
                          {/* STATUS COLUMN: ONLY Green 🛡 (#16A34A) for Active, Red 🛡 (#DC2626) for Inactive/Suspended */}
                          <td className="py-2.5 px-3.5 sm:px-4 text-center">
                            <div className="flex items-center justify-center">
                              {isActive ? (
                                <span title="Active">
                                  <Shield
                                    className="h-4 w-4 text-[#16A34A] fill-[#16A34A]/15 shrink-0"
                                    strokeWidth={2}
                                    aria-label="Active account"
                                  />
                                </span>
                              ) : isSuspended ? (
                                <span title="Suspended">
                                  <Shield
                                    className="h-4 w-4 text-[#DC2626] fill-[#DC2626]/15 shrink-0"
                                    strokeWidth={2}
                                    aria-label="Suspended account"
                                  />
                                </span>
                              ) : (
                                <span title="Inactive">
                                  <Shield
                                    className="h-4 w-4 text-[#DC2626] fill-[#DC2626]/15 shrink-0"
                                    strokeWidth={2}
                                    aria-label="Inactive account"
                                  />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 sm:px-4 text-slate-400 font-medium whitespace-nowrap text-[11px]">
                            {formatDate(user.createdAt || user.registeredAt || '')}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No registered users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Verification Document Preview
                </h3>
                <p className="text-xs text-slate-500">
                  {previewDoc.userName} ({previewDoc.email})
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Document Type:</span>{' '}
                  <span className="font-bold text-slate-800">{previewDoc.documentType}</span>
                </div>
                <div>
                  <span className="text-slate-400">Current Status:</span>{' '}
                  <span
                    className={`font-bold uppercase ${
                      previewDoc.status === 'APPROVED'
                        ? 'text-emerald-600'
                        : previewDoc.status === 'REJECTED'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {previewDoc.status}
                  </span>
                </div>
              </div>

              {/* Document Image or Fallback container */}
              <div className="min-h-[280px] max-h-[420px] bg-slate-100 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-4 overflow-hidden relative">
                {previewDoc.documentUrl ? (
                  <img
                    src={previewDoc.documentUrl}
                    alt={previewDoc.documentType}
                    className="max-h-[380px] w-auto max-w-full object-contain rounded-lg shadow-sm"
                    onError={(e) => {
                      // Fallback display if URL is not direct image
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold">Document is available online</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={previewDoc.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Document in New Tab</span>
                </a>

                {previewDoc.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickReject(previewDoc.id, previewDoc.userName)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleQuickApprove(previewDoc.id, previewDoc.userName)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Alert Modal */}
      {showBroadcastModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowBroadcastModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#E51F3E] flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Broadcast Platform Alert
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send real-time announcement to all matrimonial members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alert Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exclusive Weekend Matchmaking Event"
                  value={broadcastForm.title}
                  onChange={(e) =>
                    setBroadcastForm({ ...broadcastForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Broadcast Message *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type your platform notification message..."
                  value={broadcastForm.message}
                  onChange={(e) =>
                    setBroadcastForm({ ...broadcastForm, message: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Notification Type
                  </label>
                  <select
                    value={broadcastForm.type}
                    onChange={(e) =>
                      setBroadcastForm({ ...broadcastForm, type: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 font-medium"
                  >
                    <option value="SYSTEM">System Announcement</option>
                    <option value="SPECIAL_OFFER">Special Discount / Offer</option>
                    <option value="MAINTENANCE">Maintenance Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Call To Action Link
                  </label>
                  <input
                    type="text"
                    placeholder="/search or /pricing"
                    value={broadcastForm.link}
                    onChange={(e) =>
                      setBroadcastForm({ ...broadcastForm, link: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#F03554] hover:from-[#d11936] hover:to-[#e02848] text-white font-bold inline-flex items-center gap-2 shadow-md shadow-red-500/20 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingBroadcast ? 'Broadcasting...' : 'Send Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
