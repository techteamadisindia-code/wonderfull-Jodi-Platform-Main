'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Heart,
  MapPin,
  Camera,
  Check,
  CircleDot,
  FileText,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchAdminRegistrations,
  fetchAdminRegistrationById,
  fetchAdminRegistrationStats,
  AdminRegistrationCandidate,
  AdminRegistrationStats,
  AdminRegistrationDetailResponse,
} from '../../../services/adminApi';

export default function UnregisteredCandidatesPage() {
  const [candidates, setCandidates] = useState<AdminRegistrationCandidate[]>([]);
  const [stats, setStats] = useState<AdminRegistrationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [incompleteTotal, setIncompleteTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters & Search State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('IN_PROGRESS'); // 'ALL' | 'IN_PROGRESS' | 'STARTED' | 'ABANDONED' | 'COMPLETED'
  const [stepFilter, setStepFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('lastActiveAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal / Drawer Detail View
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<AdminRegistrationDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [regData, statsData] = await Promise.all([
          fetchAdminRegistrations({
            search: search.trim() || undefined,
            status: statusFilter,
            step: stepFilter !== 'ALL' ? Number(stepFilter) : undefined,
            sortBy,
            sortOrder,
            page,
            limit,
          }),
          fetchAdminRegistrationStats().catch(() => null),
        ]);

        setCandidates(regData.registrations || []);
        setTotal(regData.total || 0);
        setIncompleteTotal(regData.incompleteTotal || 0);
        setPages(regData.pages || 1);
        if (statsData) {
          setStats(statsData);
        }

        if (isRefresh) {
          showToast('Registration candidates refreshed successfully!');
        }
      } catch (err: any) {
        console.error('Failed to load registrations:', err);
        setError(err?.response?.data?.message || 'Unable to load candidate registrations.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, stepFilter, sortBy, sortOrder, page, limit]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Single Candidate Detail View
  const handleOpenDetail = async (id: string) => {
    setSelectedCandidateId(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await fetchAdminRegistrationById(id);
      setDetailData(data);
    } catch (err: any) {
      console.error('Failed to fetch candidate details:', err);
      setDetailError(err?.response?.data?.message || 'Could not load candidate information.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedCandidateId(null);
    setDetailData(null);
    setDetailError(null);
  };

  // Helper formatting for timestamps
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all duration-300 border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.message}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Incomplete Registrations
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-[#E51F3E] border border-rose-200 shadow-2xs">
              {incompleteTotal} Active Drafts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor and track candidates who started the multi-step registration but have not completed it yet.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing ? 'animate-spin text-[#E51F3E]' : 'text-slate-500'
              }`}
            />
            <span>{refreshing ? 'Syncing...' : 'Refresh List'}</span>
          </button>

          <Link
            href="/register"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Registration Form</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Incomplete
          </span>
          <p className="text-2xl font-extrabold text-[#E51F3E]">
            {stats ? stats.incompleteCount : incompleteTotal}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">In-progress registration drafts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Step 1: Account
          </span>
          <p className="text-2xl font-extrabold text-slate-800">
            {stats?.stepBreakdown?.step1 ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">Saved contact credentials</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Step 2: Personal
          </span>
          <p className="text-2xl font-extrabold text-slate-800">
            {stats?.stepBreakdown?.step2 ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">Filled cultural & location</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Step 3: Career
          </span>
          <p className="text-2xl font-extrabold text-slate-800">
            {stats?.stepBreakdown?.step3 ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">Filled education & career</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Fully Completed
          </span>
          <p className="text-2xl font-extrabold text-emerald-600">
            {stats?.completedCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {stats ? `${stats.completionRate}% completion rate` : 'Finalized accounts'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search candidates by name, email, mobile or registration ID..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/10 transition"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#E51F3E] cursor-pointer"
            >
              <option value="IN_PROGRESS">Status: In Progress & Started</option>
              <option value="ALL">Status: All Registrations</option>
              <option value="STARTED">Status: Started (Step 1)</option>
              <option value="ABANDONED">Status: Abandoned</option>
              <option value="COMPLETED">Status: Completed</option>
            </select>
          </div>

          {/* Step Filter */}
          <div className="sm:col-span-2">
            <select
              value={stepFilter}
              onChange={(e) => {
                setStepFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#E51F3E] cursor-pointer"
            >
              <option value="ALL">All Steps</option>
              <option value="1">Step 1 (Account)</option>
              <option value="2">Step 2 (Personal)</option>
              <option value="3">Step 3 (Career)</option>
              <option value="4">Step 4 (Photo/Pref)</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="sm:col-span-2">
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('_');
                setSortBy(f);
                setSortOrder(o as 'desc' | 'asc');
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#E51F3E] cursor-pointer"
            >
              <option value="lastActiveAt_desc">Sort: Recently Active</option>
              <option value="startedAt_desc">Sort: Newest Started</option>
              <option value="completionPercentage_desc">Sort: Highest Progress</option>
              <option value="completionPercentage_asc">Sort: Lowest Progress</option>
              <option value="currentStep_desc">Sort: Highest Step</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-4 text-xs font-semibold">
          <span>{error}</span>
          <button
            onClick={() => loadData(false)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#E51F3E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading candidate registrations...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No registrations match your filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try changing the status filter or clearing search keywords.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('IN_PROGRESS');
                setStepFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                <tr>
                  <th className="px-4 py-3.5">REGISTRATION ID</th>
                  <th className="px-4 py-3.5">CANDIDATE</th>
                  <th className="px-4 py-3.5">EMAIL</th>
                  <th className="px-4 py-3.5">MOBILE</th>
                  <th className="px-4 py-3.5 text-center">CURRENT STEP</th>
                  <th className="px-4 py-3.5">COMPLETION %</th>
                  <th className="px-4 py-3.5 text-center">STATUS</th>
                  <th className="px-4 py-3.5">STARTED ON</th>
                  <th className="px-4 py-3.5">LAST ACTIVE</th>
                  <th className="px-4 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {candidates.map((c) => {
                  const basic = c.stepData?.basicInfo || {};
                  const displayName = c.candidateName || basic.fullName || 'Anonymous Candidate';
                  const displayEmail = c.email || basic.email || '—';
                  const displayMobile = c.mobile || basic.mobile || '—';
                  const displayGender = c.gender || basic.gender || '';

                  return (
                    <tr
                      key={c._id}
                      className="hover:bg-slate-50/90 transition-colors group"
                    >
                      {/* 1. Registration ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 group-hover:border-rose-200 group-hover:bg-rose-50/50 transition">
                          {c.registrationId}
                        </span>
                      </td>

                      {/* 2. Candidate */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 truncate max-w-[160px]">
                              {displayName}
                            </p>
                            {displayGender && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {displayGender === 'Female' ? 'Bride' : 'Groom'} ({displayGender})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Email */}
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px] truncate max-w-[170px]">
                        {displayEmail}
                      </td>

                      {/* 4. Mobile */}
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                        {displayMobile}
                      </td>

                      {/* 5. Current Step */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          Step {c.currentStep} / {c.totalSteps || 4}
                        </span>
                      </td>

                      {/* 6. Completion % */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 w-28">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                            <span>{c.completionPercentage}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                c.completionPercentage >= 75
                                  ? 'bg-emerald-500'
                                  : c.completionPercentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-[#E51F3E]'
                              }`}
                              style={{ width: `${Math.max(c.completionPercentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : c.status === 'STARTED'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : c.status === 'IN_PROGRESS'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* 8. Started On */}
                      <td className="px-4 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatTimeAgo(c.startedAt || c.createdAt)}
                      </td>

                      {/* 9. Last Active */}
                      <td className="px-4 py-3.5 text-slate-700 font-medium text-[11px] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(c.lastActiveAt)}
                        </span>
                      </td>

                      {/* 10. Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(c._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs hover:border-slate-300 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#E51F3E]" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Strip */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
          <div>
            Showing <strong>{candidates.length > 0 ? (page - 1) * limit + 1 : 0}</strong>–
            <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> candidates
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700">
              Page {page} of {pages}
            </span>

            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── CANDIDATE DETAILS MODAL / DRAWER ── */}
      {selectedCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-rose-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-rose-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    {detailData?.registration.candidateName || 'Candidate Profile'}
                  </h3>
                  <span className="font-mono text-xs font-bold text-[#E51F3E] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    {detailData?.registration.registrationId}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Started: {formatFullDate(detailData?.registration.startedAt)} • Last Active:{' '}
                  {formatTimeAgo(detailData?.registration.lastActiveAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDetail}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {detailLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-[#E51F3E] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Loading saved registration details...</p>
                </div>
              ) : detailError ? (
                <div className="p-4 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold">
                  {detailError}
                </div>
              ) : detailData ? (
                <>
                  {/* Progress Bar Header */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">Registration Progress</span>
                      <span className="text-[#E51F3E]">
                        Step {detailData.registration.currentStep} of {detailData.registration.totalSteps} (
                        {detailData.registration.completionPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#E51F3E] to-rose-400 transition-all duration-300"
                        style={{ width: `${Math.max(detailData.registration.completionPercentage, 5)}%` }}
                      />
                    </div>
                  </div>

                  {/* Section 1: Basic Information */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-[#E51F3E]" />
                        1. Basic Information & Account
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          detailData.sectionStatus.basicInfo.completed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {detailData.sectionStatus.basicInfo.completed ? '✓ Completed' : '○ Not Started'}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Full Name</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.basicInfo.fields.fullName || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Address</span>
                        <p className="font-mono text-slate-800">
                          {detailData.sectionStatus.basicInfo.fields.email || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Mobile Number</span>
                        <p className="font-mono text-slate-800">
                          {detailData.sectionStatus.basicInfo.fields.mobile || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Gender</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.basicInfo.fields.gender || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Date of Birth</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.basicInfo.fields.dob || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Terms Accepted</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.basicInfo.fields.termsAccepted ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Personal & Cultural Details */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#E51F3E]" />
                        2. Personal & Cultural Details
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          detailData.sectionStatus.personalInfo.completed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {detailData.sectionStatus.personalInfo.completed ? '✓ Completed' : '○ Not Started'}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Marital Status</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.personalInfo.fields.maritalStatus || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Mother Tongue</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.personalInfo.fields.motherTongue || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Religion</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.personalInfo.fields.religion || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Caste</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.personalInfo.fields.caste || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Height</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.personalInfo.fields.height || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">City & State</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.personalInfo.fields.city
                            ? `${detailData.sectionStatus.personalInfo.fields.city}${
                                detailData.sectionStatus.personalInfo.fields.state
                                  ? `, ${detailData.sectionStatus.personalInfo.fields.state}`
                                  : ''
                              }`
                            : '—'}
                        </p>
                      </div>
                      {detailData.sectionStatus.personalInfo.fields.about && (
                        <div className="col-span-2 sm:col-span-3 pt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">About Bio</span>
                          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1 leading-relaxed">
                            {detailData.sectionStatus.personalInfo.fields.about}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Education & Career */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#E51F3E]" />
                        3. Education & Profession
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          detailData.sectionStatus.educationProfession.completed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {detailData.sectionStatus.educationProfession.completed ? '✓ Completed' : '○ Not Started'}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Qualification</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.educationProfession.fields.education || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Profession</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.educationProfession.fields.profession || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Company / Workplace</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.educationProfession.fields.company || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Annual Income</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.educationProfession.fields.annualIncome || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Preferences & Photos */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-[#E51F3E]" />
                        4. Partner Preferences & Photos
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          detailData.sectionStatus.preferences.completed || detailData.sectionStatus.photos.completed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {detailData.sectionStatus.preferences.completed || detailData.sectionStatus.photos.completed
                          ? '✓ Completed'
                          : '○ Not Started'}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Looking For</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.preferences.fields.lookingFor || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Age Preference</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.preferences.fields.prefAgeMin
                            ? `${detailData.sectionStatus.preferences.fields.prefAgeMin} - ${detailData.sectionStatus.preferences.fields.prefAgeMax} Yrs`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Diet Preference</span>
                        <p className="font-semibold text-slate-800">
                          {detailData.sectionStatus.preferences.fields.prefDiet || '—'}
                        </p>
                      </div>

                      {/* Photo preview if present */}
                      {detailData.sectionStatus.photos.fields.primaryPhoto && (
                        <div className="col-span-2 sm:col-span-3 pt-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                            Uploaded Profile Photo
                          </span>
                          <img
                            src={detailData.sectionStatus.photos.fields.primaryPhoto}
                            alt="Uploaded Candidate"
                            className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-400 font-mono">
                Read-only candidate tracking profile
              </span>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
