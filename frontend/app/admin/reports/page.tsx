'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserX,
  Shield,
  ShieldCheck,
  Clock,
  AlertCircle,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  X,
  User,
  Calendar,
  MessageSquare,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Ban,
  Check,
} from 'lucide-react';
import {
  fetchAdminReports,
  resolveAdminReport,
  dismissAdminReport,
  blockUserFromAdminReport,
  ReportItem,
} from '../../../services/reportApi';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination & Counts State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [counts, setCounts] = useState<{
    ALL: number;
    PENDING: number;
    RESOLVED: number;
    DISMISSED: number;
  }>({
    ALL: 0,
    PENDING: 0,
    RESOLVED: 0,
    DISMISSED: 0,
  });

  const [filterOptions, setFilterOptions] = useState<{ reasons: string[] }>({
    reasons: [],
  });

  // Action / Menu States
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modals
  const [selectedReportForModal, setSelectedReportForModal] = useState<ReportItem | null>(null);
  const [selectedProfileForModal, setSelectedProfileForModal] = useState<any | null>(null);

  const [resolveModalData, setResolveModalData] = useState<{
    reportId: string;
    reportedName: string;
    reason: string;
  } | null>(null);
  const [resolveNotes, setResolveNotes] = useState<string>('');

  const [dismissModalData, setDismissModalData] = useState<{
    reportId: string;
    reportedName: string;
    reason: string;
  } | null>(null);
  const [dismissNotes, setDismissNotes] = useState<string>('');

  const [blockModalData, setBlockModalData] = useState<{
    reportId: string;
    userId: string;
    userName: string;
    reason: string;
  } | null>(null);
  const [blockReason, setBlockReason] = useState<string>('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Debounced search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  };

  const handleTabChange = (tab: 'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED') => {
    setActiveTab(tab);
    setPage(1);
    setActionMenuOpenId(null);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedReason('ALL');
    setFromDate('');
    setToDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch !== '' ||
    selectedReason !== 'ALL' ||
    fromDate !== '' ||
    toDate !== '' ||
    sortBy !== 'createdAt' ||
    sortOrder !== 'desc';

  // Main Data Fetcher
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setError(null);

      try {
        const response = await fetchAdminReports({
          page,
          limit: pageSize,
          status: activeTab,
          search: debouncedSearch,
          reason: selectedReason,
          from: fromDate || undefined,
          to: toDate || undefined,
          sortBy,
          sortOrder,
        });

        setReports(response.reports || []);
        setPagination(response.pagination);
        if (response.counts) {
          setCounts(response.counts);
        }
        if (response.filters?.reasons?.length) {
          setFilterOptions(response.filters);
        }
      } catch (err: any) {
        console.error('Failed to load reports:', err);
        setError(err?.response?.data?.message || 'Unable to load abuse reports. Please check server connection.');
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, activeTab, debouncedSearch, selectedReason, fromDate, toDate, sortBy, sortOrder]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Resolve Report Handler
  const handleConfirmResolve = async () => {
    if (!resolveModalData) return;
    setActionLoading(true);
    try {
      await resolveAdminReport(resolveModalData.reportId, resolveNotes);
      setToast({
        message: `Report for ${resolveModalData.reportedName} marked as RESOLVED.`,
        type: 'success',
      });
      setResolveModalData(null);
      setResolveNotes('');
      if (selectedReportForModal && selectedReportForModal._id === resolveModalData.reportId) {
        setSelectedReportForModal((prev) =>
          prev ? { ...prev, status: 'RESOLVED', resolutionNotes: resolveNotes, actionTaken: 'RESOLVED' } : null
        );
      }
      loadData(true);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Failed to resolve report.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Dismiss Report Handler
  const handleConfirmDismiss = async () => {
    if (!dismissModalData) return;
    setActionLoading(true);
    try {
      await dismissAdminReport(dismissModalData.reportId, dismissNotes);
      setToast({
        message: `Report dismissed as non-violating.`,
        type: 'success',
      });
      setDismissModalData(null);
      setDismissNotes('');
      if (selectedReportForModal && selectedReportForModal._id === dismissModalData.reportId) {
        setSelectedReportForModal((prev) =>
          prev ? { ...prev, status: 'DISMISSED', resolutionNotes: dismissNotes, actionTaken: 'DISMISSED' } : null
        );
      }
      loadData(true);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Failed to dismiss report.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Block User Handler
  const handleConfirmBlock = async () => {
    if (!blockModalData) return;
    setActionLoading(true);
    try {
      await blockUserFromAdminReport(blockModalData.reportId, blockReason);
      setToast({
        message: `Account for ${blockModalData.userName} has been deactivated/blocked.`,
        type: 'success',
      });
      setBlockModalData(null);
      setBlockReason('');
      if (selectedReportForModal && selectedReportForModal._id === blockModalData.reportId) {
        setSelectedReportForModal((prev) =>
          prev
            ? {
                ...prev,
                status: 'RESOLVED',
                actionTaken: 'ACCOUNT_BLOCKED',
                resolutionNotes: blockReason,
                reportedUser: prev.reportedUser ? { ...prev.reportedUser, isActive: false } : null,
              }
            : null
        );
      }
      loadData(true);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Failed to block account.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Age calculator helper
  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const diffMs = Date.now() - birthDate.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-fade-in text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Abuse & Safety Reports Moderation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit, review, and resolve member safety complaints, harassment, and policy violations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            title="Reload live reports from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
            <span>Refresh Reports</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Navigation Tabs with live counts */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => handleTabChange('ALL')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-[#E51F3E] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>All Reports</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.ALL}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('PENDING')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Moderation</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'PENDING' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {counts.PENDING}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('RESOLVED')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved Cases</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'RESOLVED' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {counts.RESOLVED}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('DISMISSED')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'DISMISSED'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Dismissed</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'DISMISSED' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.DISMISSED}
            </span>
          </button>
        </div>

        {/* Search Bar Line */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by reporter, reported account, email, reason or description..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-[#E51F3E] text-xs font-semibold border border-slate-200 transition shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          {/* Reason */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Violation Reason</label>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            >
              <option value="ALL">All Reasons</option>
              {filterOptions.reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            >
              <option value="createdAt-desc">Newest Reports</option>
              <option value="createdAt-asc">Oldest Reports</option>
              <option value="status-asc">Status</option>
              <option value="reason-asc">Reason</option>
            </select>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Error State Banner */}
        {error && (
          <div className="p-5 bg-rose-50/80 border-b border-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData()}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5 w-[20%]">Reporter</th>
                <th className="py-3.5 px-5 w-[22%]">Reported Account</th>
                <th className="py-3.5 px-5 w-[26%]">Reason & Description</th>
                <th className="py-3.5 px-5 w-[12%]">Status</th>
                <th className="py-3.5 px-5 w-[12%]">Reported On</th>
                <th className="py-3.5 px-5 text-right w-[8%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-slate-200 rounded w-24" />
                          <div className="h-2.5 bg-slate-100 rounded w-32" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-slate-200 rounded w-28" />
                          <div className="h-2.5 bg-slate-100 rounded w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 space-y-1.5">
                      <div className="h-3.5 bg-slate-200 rounded w-28" />
                      <div className="h-2.5 bg-slate-100 rounded w-44" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-6 bg-slate-200 rounded-full w-20" />
                    </td>
                    <td className="py-4 px-5 space-y-1">
                      <div className="h-3.5 bg-slate-200 rounded w-20" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-7 w-8 bg-slate-200 rounded-lg inline-block" />
                    </td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600 mb-3 shadow-xs">
                      <Shield className="w-6 h-6 stroke-1.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {activeTab === 'PENDING'
                        ? 'No pending reports require moderation'
                        : activeTab === 'RESOLVED'
                        ? 'No resolved reports found'
                        : activeTab === 'DISMISSED'
                        ? 'No dismissed reports found'
                        : 'No abuse or safety reports found'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'No reports match your active search and filter criteria.'
                        : 'All member accounts and conversations are currently compliant with platform guidelines.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearAllFilters}
                        className="mt-4 px-4 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#CE102F] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const reporter = report.reporter;
                  const targetUser = report.reportedUser;
                  const targetProfile = targetUser?.profile;
                  const isMenuOpen = actionMenuOpenId === report._id;

                  return (
                    <tr key={report._id} className="hover:bg-slate-50/80 transition group">
                      {/* 1. Reporter */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {reporter?.photo ? (
                            <img
                              src={reporter.photo}
                              alt={reporter.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                              {reporter?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {reporter?.fullName || 'Anonymous User'}
                              </span>
                              {reporter?.verificationStatus === 'VERIFIED' && (
                                <span title="Verified User">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{reporter?.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Reported Account */}
                      <td className="py-3.5 px-5">
                        {targetUser ? (
                          <div
                            onClick={() => {
                              if (targetProfile) setSelectedProfileForModal(targetProfile);
                            }}
                            className="flex items-center gap-3 cursor-pointer group-hover:text-[#E51F3E] transition"
                            title="Click to view full reported profile details"
                          >
                            {targetUser.photo ? (
                              <img
                                src={targetUser.photo}
                                alt={targetUser.fullName}
                                className="w-9 h-9 rounded-xl object-cover border border-rose-100 shadow-xs shrink-0 group-hover:scale-105 transition"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-50 to-pink-50 border border-rose-100 flex items-center justify-center text-[#E51F3E] font-bold text-xs shrink-0">
                                {targetUser.fullName?.charAt(0) || 'U'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 group-hover:text-[#E51F3E] transition truncate">
                                  {targetProfile?.displayName || targetUser.fullName}
                                </span>
                                {targetUser.verificationStatus === 'VERIFIED' && (
                                  <span title="Verified Member">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  </span>
                                )}
                                {targetUser.isActive === false && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {targetProfile?.profession || targetUser.email}
                                {targetProfile?.city ? ` • ${targetProfile.city}` : ''}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">User no longer active</span>
                        )}
                      </td>

                      {/* 3. Reason & Description */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-1 max-w-xs sm:max-w-md">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900">
                            {report.reason}
                          </span>
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {report.details || report.description || 'No additional details provided.'}
                          </p>
                          {report.targetType === 'MESSAGE' && report.messageSnippet && (
                            <p className="text-[10px] text-slate-500 bg-slate-50 border-l-2 border-rose-400 pl-2 py-0.5 italic truncate mt-1">
                              &ldquo;{report.messageSnippet}&rdquo;
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 4. Status */}
                      <td className="py-3.5 px-5">
                        {report.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        ) : report.status === 'RESOLVED' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Resolved</span>
                            </span>
                            {report.actionTaken === 'ACCOUNT_BLOCKED' && (
                              <span className="block text-[10px] font-bold text-rose-600">
                                Account Blocked
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                            <XCircle className="w-3 h-3 text-slate-500" />
                            <span>Dismissed</span>
                          </span>
                        )}
                      </td>

                      {/* 5. Reported On */}
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-slate-800">
                          {new Date(report.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(report.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </p>
                      </td>

                      {/* 6. Action Menu */}
                      <td className="py-3.5 px-5 text-right relative">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedReportForModal(report)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
                            title="View Complete Report Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setActionMenuOpenId(isMenuOpen ? null : report._id)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
                            title="More Moderation Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dropdown Action Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-5 top-12 z-30 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-left animate-fade-in text-xs font-semibold">
                            <button
                              onClick={() => {
                                setSelectedReportForModal(report);
                                setActionMenuOpenId(null);
                              }}
                              className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>View Details</span>
                            </button>

                            {targetProfile && (
                              <button
                                onClick={() => {
                                  setSelectedProfileForModal(targetProfile);
                                  setActionMenuOpenId(null);
                                }}
                                className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                              >
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Profile</span>
                              </button>
                            )}

                            {report.status === 'PENDING' && (
                              <>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => {
                                    setResolveModalData({
                                      reportId: report._id,
                                      reportedName: targetProfile?.displayName || targetUser?.fullName || 'User',
                                      reason: report.reason,
                                    });
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Resolve Report</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setDismissModalData({
                                      reportId: report._id,
                                      reportedName: targetProfile?.displayName || targetUser?.fullName || 'User',
                                      reason: report.reason,
                                    });
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Dismiss Report</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setBlockModalData({
                                      reportId: report._id,
                                      userId: targetUser?._id || '',
                                      userName: targetProfile?.displayName || targetUser?.fullName || 'User',
                                      reason: report.reason,
                                    });
                                    setActionMenuOpenId(null);
                                  }}
                                  className="w-full px-3 py-2 text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Block Account</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && pagination.total > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(page * pageSize, pagination.total)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{pagination.total}</span> reports
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                .map((p, index, array) => {
                  const showEllipsis = index > 0 && p - array[index - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg font-bold transition text-xs shadow-xs cursor-pointer ${
                          page === p
                            ? 'bg-[#E51F3E] text-white border border-[#E51F3E]'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Report Details & Moderation History ── */}
      {selectedReportForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-rose-100 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-t-3xl flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-bold shadow-md">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>Report Details</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                        selectedReportForModal.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                          : selectedReportForModal.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}
                    >
                      {selectedReportForModal.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">ID: {selectedReportForModal._id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReportForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Reporter vs Reported User Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reporter */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Reporter
                  </span>
                  <div className="flex items-center gap-3">
                    {selectedReportForModal.reporter?.photo ? (
                      <img
                        src={selectedReportForModal.reporter.photo}
                        alt="Reporter"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0">
                        {selectedReportForModal.reporter?.fullName?.charAt(0) || 'R'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {selectedReportForModal.reporter?.fullName || 'Anonymous'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedReportForModal.reporter?.email || 'No email'}
                      </p>
                      {selectedReportForModal.reporter?.mobile && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          {selectedReportForModal.reporter.mobile}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reported Account */}
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                    Reported Account
                  </span>
                  <div className="flex items-center gap-3">
                    {selectedReportForModal.reportedUser?.photo ? (
                      <img
                        src={selectedReportForModal.reportedUser.photo}
                        alt="Reported User"
                        className="w-10 h-10 rounded-xl object-cover border border-rose-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#E51F3E] flex items-center justify-center font-bold shrink-0">
                        {selectedReportForModal.reportedUser?.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {selectedReportForModal.reportedUser?.profile?.displayName ||
                          selectedReportForModal.reportedUser?.fullName ||
                          'Unknown User'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedReportForModal.reportedUser?.email}
                      </p>
                      {selectedReportForModal.reportedUser?.profile?.profession && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {selectedReportForModal.reportedUser.profile.profession}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Reason & Description */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Report Reason
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                    {selectedReportForModal.reason}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedReportForModal.details || selectedReportForModal.description || 'No details provided.'}
                </p>
                {selectedReportForModal.targetType === 'MESSAGE' && selectedReportForModal.messageSnippet && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white border border-amber-200">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Offending Message Content</span>
                    <p className="text-slate-800 italic">&ldquo;{selectedReportForModal.messageSnippet}&rdquo;</p>
                  </div>
                )}
              </div>

              {/* Moderation History & Audit */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Moderation History & Audit</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-bold">Reported Date</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedReportForModal.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">Current Status</span>
                    <span className="font-bold text-slate-800">{selectedReportForModal.status}</span>
                  </div>
                  {selectedReportForModal.moderator && (
                    <div>
                      <span className="text-slate-400 block font-bold">Reviewed By</span>
                      <span className="font-semibold text-slate-800">
                        {selectedReportForModal.moderator.fullName} ({selectedReportForModal.moderator.email})
                      </span>
                    </div>
                  )}
                  {selectedReportForModal.resolvedAt && (
                    <div>
                      <span className="text-slate-400 block font-bold">Resolved Timestamp</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(selectedReportForModal.resolvedAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>

                {selectedReportForModal.resolutionNotes && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Resolution Notes</span>
                    <p className="text-slate-700">{selectedReportForModal.resolutionNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex items-center justify-between gap-3">
              {selectedReportForModal.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setResolveModalData({
                        reportId: selectedReportForModal._id,
                        reportedName:
                          selectedReportForModal.reportedUser?.profile?.displayName ||
                          selectedReportForModal.reportedUser?.fullName ||
                          'User',
                        reason: selectedReportForModal.reason,
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>

                  <button
                    onClick={() => {
                      setDismissModalData({
                        reportId: selectedReportForModal._id,
                        reportedName:
                          selectedReportForModal.reportedUser?.profile?.displayName ||
                          selectedReportForModal.reportedUser?.fullName ||
                          'User',
                        reason: selectedReportForModal.reason,
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Dismiss</span>
                  </button>

                  <button
                    onClick={() => {
                      setBlockModalData({
                        reportId: selectedReportForModal._id,
                        userId: selectedReportForModal.reportedUser?._id || '',
                        userName:
                          selectedReportForModal.reportedUser?.profile?.displayName ||
                          selectedReportForModal.reportedUser?.fullName ||
                          'User',
                        reason: selectedReportForModal.reason,
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Block</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Moderation completed for this case.</div>
              )}

              <button
                onClick={() => setSelectedReportForModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Profile Details ── */}
      {selectedProfileForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-rose-100 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-t-3xl flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white font-bold shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>{selectedProfileForModal.displayName}</span>
                    {selectedProfileForModal.verificationStatus === 'VERIFIED' && (
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full font-bold border border-emerald-400/30">
                        Verified
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {selectedProfileForModal.gender} • {calculateAge(selectedProfileForModal.dob) || '—'} years •{' '}
                    {selectedProfileForModal.city}, {selectedProfileForModal.state || selectedProfileForModal.country}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfileForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {selectedProfileForModal.primaryPhoto ? (
                  <img
                    src={selectedProfileForModal.primaryPhoto}
                    alt={selectedProfileForModal.displayName}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-rose-100 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 text-3xl font-bold shrink-0">
                    {selectedProfileForModal.displayName.charAt(0)}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 flex-1 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Profession</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedProfileForModal.profession || '—'}</span>
                    {selectedProfileForModal.company && (
                      <span className="text-slate-500 text-[11px] block">{selectedProfileForModal.company}</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Education</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedProfileForModal.education || '—'}</span>
                    {selectedProfileForModal.degree && (
                      <span className="text-slate-500 text-[11px] block">{selectedProfileForModal.degree}</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Community</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedProfileForModal.religion || '—'}</span>
                    {selectedProfileForModal.caste && (
                      <span className="text-slate-500 text-[11px] block">{selectedProfileForModal.caste}</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Income</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedProfileForModal.annualIncome || 'Confidential'}</span>
                  </div>
                </div>
              </div>

              {selectedProfileForModal.about && (
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs space-y-1">
                  <h4 className="font-bold text-rose-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#E51F3E]" />
                    <span>About Bio</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed">{selectedProfileForModal.about}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-end">
              <button
                onClick={() => setSelectedProfileForModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Resolve Report Confirmation ── */}
      {resolveModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">Resolve Safety Report</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mark report against <strong className="text-slate-800">{resolveModalData.reportedName}</strong> for{' '}
                <strong className="text-slate-800">{resolveModalData.reason}</strong> as resolved?
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Resolution Notes / Action Taken
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="E.g. Warning issued to user, content purged, or credentials verified..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setResolveModalData(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Resolve Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Dismiss Report Confirmation ── */}
      {dismissModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">Dismiss Safety Report</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dismiss complaint against <strong className="text-slate-800">{dismissModalData.reportedName}</strong> as
                non-violating?
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Dismissal Reason / Notes</label>
              <textarea
                value={dismissNotes}
                onChange={(e) => setDismissNotes(e.target.value)}
                placeholder="E.g. No policy breach found upon manual dialogue audit..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-600 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDismissModalData(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDismiss}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Dismiss Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: Block User Account Confirmation ── */}
      {blockModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">Block Member Account?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Suspending <strong className="text-slate-800">{blockModalData.userName}</strong> will immediately
                deactivate their login access and hide their profile from matrimony searches.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Suspension Reason</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="E.g. Repeated violation of safety policy and harassment..."
                rows={3}
                className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50/30 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setBlockModalData(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlock}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                <span>Block Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
