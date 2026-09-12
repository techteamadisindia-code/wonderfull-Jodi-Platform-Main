'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  ChevronLeft,
  ChevronRight,
  Eye,
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
  Flag,
  ShieldAlert,
  History,
  Send,
  Trash2,
  Mail,
  Phone,
  HelpCircle,
  Lock,
  Layers,
} from 'lucide-react';
import {
  fetchAdminReportsGrouped,
  fetchReportsByProfileId,
  updateReportStatusByAdmin,
  sendProfileWarning,
  updateProfileSafetyStatus,
  suspendProfileByAdmin,
  blockProfileByAdmin,
  deleteProfileByAdmin,
  fetchSafetyStats,
  fetchSafetyAuditLogs,
  GroupedProfileReport,
  ReportItem,
} from '../../../services/reportApi';
import { DoctorAvatar } from '../../../components/DoctorAvatar';

export default function AdminReportsPage() {
  const [groupedProfiles, setGroupedProfiles] = useState<GroupedProfileReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'SUSPENDED_BLOCKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Safety Statistics
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    underReviewReports: 0,
    resolvedReports: 0,
    dismissedReports: 0,
    profilesWithMultipleReports: 0,
    suspendedProfiles: 0,
    blockedProfiles: 0,
    deletedProfiles: 0,
  });

  // Modal States
  const [selectedGroup, setSelectedGroup] = useState<GroupedProfileReport | null>(null);
  const [viewReportsModalOpen, setViewReportsModalOpen] = useState(false);
  const [reportsListForProfile, setReportsListForProfile] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Full Profile View Modal
  const [viewProfileModalOpen, setViewProfileModalOpen] = useState(false);

  // Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<
    'UNDER_REVIEW' | 'WARNING' | 'SUSPEND' | 'BLOCK' | 'DELETE' | 'RESOLVE' | 'DISMISS' | 'INFO_REQUEST'
  >('UNDER_REVIEW');
  const [actionReason, setActionReason] = useState('');
  const [actionWarningMsg, setActionWarningMsg] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Audit History Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let statusFilter: string | undefined = undefined;
      if (activeTab === 'PENDING') statusFilter = 'PENDING';
      if (activeTab === 'UNDER_REVIEW') statusFilter = 'UNDER_REVIEW';
      if (activeTab === 'RESOLVED') statusFilter = 'RESOLVED';

      const res = await fetchAdminReportsGrouped({
        page,
        limit: 10,
        status: statusFilter,
        search: debouncedSearch || undefined,
      });

      if (res.success && res.data) {
        let items = res.data.groupedProfiles || [];
        if (activeTab === 'SUSPENDED_BLOCKED') {
          items = items.filter(
            (item) =>
              item.profileStatus === 'Suspended' ||
              item.profileStatus === 'Blocked' ||
              item.profileStatus === 'Deleted'
          );
        }
        setGroupedProfiles(items);
        setPagination({
          page: res.data.pagination?.page || 1,
          limit: res.data.pagination?.limit || 10,
          total: res.data.pagination?.total || 0,
          totalPages: res.data.pagination?.totalPages || 1,
        });
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Error loading grouped reports:', err);
      setError(err.response?.data?.message || 'Failed to load safety reports.');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open "View Reports" Drawer/Modal
  const handleOpenReportsModal = async (group: GroupedProfileReport) => {
    setSelectedGroup(group);
    setViewReportsModalOpen(true);
    setReportsLoading(true);
    try {
      const reports = await fetchReportsByProfileId(group.profileId);
      setReportsListForProfile(reports);
    } catch (err: any) {
      console.error('Error loading profile reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  // Open "View Full Profile" Modal
  const handleOpenProfileModal = (group: GroupedProfileReport) => {
    setSelectedGroup(group);
    setViewProfileModalOpen(true);
  };

  // Open "Take Action" Modal
  const handleOpenActionModal = (
    group: GroupedProfileReport,
    initialAction: 'UNDER_REVIEW' | 'WARNING' | 'SUSPEND' | 'BLOCK' | 'DELETE' | 'RESOLVE' | 'DISMISS' | 'INFO_REQUEST' = 'UNDER_REVIEW'
  ) => {
    setSelectedGroup(group);
    setActionType(initialAction);
    setActionReason('');
    setActionWarningMsg('');
    setActionNotes('');
    setActionModalOpen(true);
  };

  // Open "Audit History" Modal
  const handleOpenAuditModal = async (group: GroupedProfileReport) => {
    setSelectedGroup(group);
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const logs = await fetchSafetyAuditLogs(group.profileId);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err: any) {
      console.error('Error loading safety audit logs:', err);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Submit Admin Safety Action
  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    if (
      (actionType === 'SUSPEND' || actionType === 'BLOCK' || actionType === 'DELETE') &&
      !actionReason.trim()
    ) {
      alert('An administrative reason is mandatory for this action.');
      return;
    }

    if (actionType === 'WARNING' && !actionWarningMsg.trim()) {
      alert('Please provide the warning message to send to the member.');
      return;
    }

    setActionSubmitting(true);
    try {
      if (actionType === 'UNDER_REVIEW') {
        await updateProfileSafetyStatus(selectedGroup.profileId, {
          status: 'Under Review',
          reason: actionReason || 'Multiple safety reports received. Under review by Trust team.',
          notes: actionNotes,
        });
        setToast({ message: 'Profile marked Under Review successfully.', type: 'success' });
      } else if (actionType === 'WARNING') {
        await sendProfileWarning(selectedGroup.profileId, {
          warningMessage: actionWarningMsg,
          reason: actionReason || 'Violation of profile guidelines',
        });
        setToast({ message: 'Formal warning notification dispatched to member.', type: 'success' });
      } else if (actionType === 'SUSPEND') {
        await suspendProfileByAdmin(selectedGroup.profileId, actionReason);
        setToast({ message: 'Profile temporarily suspended. Excluded from search & messaging.', type: 'success' });
      } else if (actionType === 'BLOCK') {
        await blockProfileByAdmin(selectedGroup.profileId, actionReason);
        setToast({ message: 'Profile blocked platform-wide.', type: 'success' });
      } else if (actionType === 'DELETE') {
        await deleteProfileByAdmin(selectedGroup.profileId, actionReason);
        setToast({ message: 'Profile safely soft-deleted from platform.', type: 'success' });
      } else if (actionType === 'RESOLVE') {
        // Resolve all reports for this profile
        for (const rep of selectedGroup.reports) {
          await updateReportStatusByAdmin(rep._id, {
            status: 'RESOLVED',
            adminNotes: actionNotes || 'Resolved after administrative verification',
            actionTaken: 'RESOLVED',
          });
        }
        await updateProfileSafetyStatus(selectedGroup.profileId, {
          status: 'Active',
          reason: 'Reports resolved after review',
          notes: actionNotes,
        });
        setToast({ message: 'All reports marked Resolved. Profile reinstated as Active.', type: 'success' });
      } else if (actionType === 'DISMISS') {
        for (const rep of selectedGroup.reports) {
          await updateReportStatusByAdmin(rep._id, {
            status: 'DISMISSED',
            adminNotes: actionNotes || 'Dismissed as unfounded or invalid report',
            actionTaken: 'DISMISSED',
          });
        }
        setToast({ message: 'Reports dismissed as unfounded.', type: 'success' });
      }

      setActionModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Error executing admin action:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to execute administrative action.',
        type: 'error',
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'Active').toLowerCase();
    if (s === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          <span>Active</span>
        </span>
      );
    }
    if (s === 'under review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          <span>Under Review</span>
        </span>
      );
    }
    if (s === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3" />
          <span>Suspended</span>
        </span>
      );
    }
    if (s === 'blocked') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Ban className="w-3 h-3" />
          <span>Blocked</span>
        </span>
      );
    }
    if (s === 'deleted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <Trash2 className="w-3 h-3" />
          <span>Deleted</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-semibold border animate-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 border border-rose-200 text-[#E51F3E]">
              Safety & Compliance Center
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
            Reports & Safety Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor reported doctor profiles, investigate user complaints, enforce platform safety, and log moderation audits.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold transition shadow-2xs hover:bg-slate-50 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ── Real Statistics KPI Banner ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Reports
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 block">
            {stats.totalReports}
          </span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Flag className="w-3 h-3 text-[#E51F3E]" />
            <span>All submissions</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
            Pending Review
          </span>
          <span className="text-xl sm:text-2xl font-bold text-amber-600 block">
            {stats.pendingReports}
          </span>
          <span className="text-[10px] text-amber-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Needs action</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-sky-200/80 bg-sky-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
            Under Review
          </span>
          <span className="text-xl sm:text-2xl font-bold text-sky-600 block">
            {stats.underReviewReports}
          </span>
          <span className="text-[10px] text-sky-700 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Investigating</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Resolved
          </span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 block">
            {stats.resolvedReports}
          </span>
          <span className="text-[10px] text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Settled</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#E51F3E] uppercase tracking-wider block">
            Multi Reports
          </span>
          <span className="text-xl sm:text-2xl font-bold text-[#E51F3E] block">
            {stats.profilesWithMultipleReports}
          </span>
          <span className="text-[10px] text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>High Risk Doctors</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            Suspended
          </span>
          <span className="text-xl sm:text-2xl font-bold text-purple-600 block">
            {stats.suspendedProfiles}
          </span>
          <span className="text-[10px] text-purple-700 flex items-center gap-1">
            <UserX className="w-3 h-3" />
            <span>Restricted access</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            Blocked
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-800 block">
            {stats.blockedProfiles}
          </span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Ban className="w-3 h-3 text-slate-600" />
            <span>Platform blocked</span>
          </span>
        </div>
      </div>

      {/* ── Filters & Tabs ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ALL');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Reported Profiles ({stats.totalReports})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('PENDING');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white'
                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            Pending Review ({stats.pendingReports})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('UNDER_REVIEW');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'UNDER_REVIEW'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
            }`}
          >
            Under Review ({stats.underReviewReports})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('RESOLVED');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'RESOLVED'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Resolved ({stats.resolvedReports})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('SUSPENDED_BLOCKED');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'SUSPENDED_BLOCKED'
                ? 'bg-[#E51F3E] text-white'
                : 'text-slate-600 hover:text-[#E51F3E] hover:bg-rose-50'
            }`}
          >
            Suspended / Blocked ({stats.suspendedProfiles + stats.blockedProfiles})
          </button>
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name, email, reason..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 self-end sm:self-center">
            Showing {groupedProfiles.length} of {pagination.total} reported candidates
          </div>
        </div>

        {/* Pagination Footer */}
        {!loading && pagination.total > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{(page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(page * pagination.limit, pagination.total)}
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

      {/* ── Main Grouped Profile Reports List ── */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="w-8 h-8 text-[#E51F3E] animate-spin mx-auto" />
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            Fetching safety reports & candidate profiles...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 shadow-xs space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-slate-900">Failed to Load Reports</h3>
          <p className="text-xs sm:text-sm text-slate-600">{error}</p>
          <button
            onClick={loadData}
            className="px-5 py-2 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] transition"
          >
            Retry
          </button>
        </div>
      ) : groupedProfiles.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-slate-900">
              No Reported Profiles in This View
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              All member safety reports for this filter have been addressed or no complaints match your search.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedProfiles.map((group) => {
            const hasMultiple = group.totalReports > 1;
            const latestDate = group.latestReportDate
              ? new Date(group.latestReportDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently';

            return (
              <div
                key={group.profileId}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md p-5 sm:p-6 ${
                  hasMultiple
                    ? 'border-rose-300 ring-1 ring-rose-200/50 bg-gradient-to-r from-rose-50/20 via-white to-white'
                    : 'border-slate-200/90 hover:border-rose-200'
                }`}
              >
                {/* Top: Doctor & Profile Information */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative shadow-2xs">
                    {group.profilePhoto ? (
                      <img
                        src={group.profilePhoto}
                        alt={group.doctorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <DoctorAvatar
                        name={group.doctorName}
                        className="w-full h-full rounded-none text-base"
                      />
                    )}
                    {hasMultiple && (
                      <span
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E51F3E] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs"
                        title="Multiple safety reports filed"
                      >
                        !
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 truncate">
                        {group.doctorName}
                      </h2>
                      {getStatusBadge(group.profileStatus)}

                      {hasMultiple && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider border border-rose-200">
                          High Priority ({group.totalReports} Reports)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      {group.email && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{group.email}</span>
                        </span>
                      )}
                      {group.mobile && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{group.mobile}</span>
                        </span>
                      )}
                      {group.education && (
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                          <span>{group.education}</span>
                        </span>
                      )}
                      {group.profession && (
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <Briefcase className="w-3.5 h-3.5 text-[#E51F3E]" />
                          <span>{group.profession}</span>
                        </span>
                      )}
                      {group.city && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{group.city}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Safety Status & Report Reasons (Left) + Action Buttons (Right) */}
                <div className="mt-4 pt-4 border-t border-slate-100/90 flex flex-col min-[1360px]:flex-row min-[1360px]:items-center justify-between gap-3.5">
                  {/* Left: Safety Summary Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                      Total Reports: <strong className="text-slate-900">{group.totalReports}</strong>
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                      Latest: <span className="text-slate-800 font-medium">{latestDate}</span>
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                      Status:
                      <span
                        className={`font-bold ${
                          group.overallStatus === 'PENDING'
                            ? 'text-amber-600'
                            : group.overallStatus === 'UNDER_REVIEW'
                            ? 'text-sky-600'
                            : group.overallStatus === 'RESOLVED'
                            ? 'text-emerald-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {group.overallStatus}
                      </span>
                    </span>

                    {group.reasonsSummary && group.reasonsSummary.length > 0 && (
                      <div className="flex items-center gap-1">
                        {group.reasonsSummary.slice(0, 2).map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200"
                          >
                            {r}
                          </span>
                        ))}
                        {group.reasonsSummary.length > 2 && (
                          <span className="text-[11px] text-slate-400">
                            +{group.reasonsSummary.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Consolidated Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 self-start sm:self-end min-[1360px]:self-auto">
                    <Link
                      href={`/admin/profiles/${group.profileId}?tab=reports`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs whitespace-nowrap cursor-pointer"
                      title="View complete candidate details and safety reports"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Profile</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenReportsModal(group)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs whitespace-nowrap cursor-pointer"
                      title="Inspect all individual reports submitted against this profile"
                    >
                      <Flag className="w-3.5 h-3.5 text-[#E51F3E]" />
                      <span>View Reports ({group.totalReports})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(group, 'UNDER_REVIEW')}
                      className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2 rounded-full bg-[#E51F3E] hover:bg-[#CC1432] text-white text-xs font-bold transition shadow-xs hover:shadow-md hover:shadow-red-600/20 whitespace-nowrap cursor-pointer"
                      title="Take moderation or safety action on this profile"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Take Action</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAuditModal(group)}
                      className="w-9 h-9 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shadow-2xs shrink-0 cursor-pointer"
                      title="View moderation audit trail"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 px-2">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── View Reports Modal (Group breakdown with confidential reporter data) ── */}
      {viewReportsModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-rose-50 via-white to-amber-50/40 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-[#E51F3E] flex items-center justify-center">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    Reports Against {selectedGroup.doctorName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total {reportsListForProfile.length} formal complaints filed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewReportsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Confidentiality Notice */}
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200/70 flex items-center gap-2 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Confidential Admin View:</strong> Reporter identities are only visible to authorized administrators and are never disclosed to the reported member.
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
              {reportsLoading ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#E51F3E] animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">Loading individual report dossiers...</p>
                </div>
              ) : reportsListForProfile.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No individual report records found.
                </div>
              ) : (
                reportsListForProfile.map((report, idx) => {
                  const reporterName = report.reporter?.fullName || 'Anonymous Member';
                  const reporterEmail = report.reporter?.email || 'N/A';
                  const reporterId = report.reporter?._id || 'N/A';
                  const dateStr = report.createdAt
                    ? new Date(report.createdAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';

                  return (
                    <div
                      key={report._id || idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Report #{report._id?.slice(-6).toUpperCase() || idx + 1}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                report.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : report.status === 'UNDER_REVIEW'
                                  ? 'bg-sky-100 text-sky-800'
                                  : report.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {report.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            Reason: <span className="text-[#E51F3E]">{report.reason}</span>
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">{dateStr}</span>
                      </div>

                      {/* Reporter Information (Confidential Admin View) */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Reporter Name
                          </span>
                          <span className="font-semibold text-slate-800">{reporterName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Reporter Email
                          </span>
                          <span className="font-medium text-slate-600 truncate block">
                            {reporterEmail}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Reporter ID
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {reporterId}
                          </span>
                        </div>
                      </div>

                      {/* Description & Evidence */}
                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-slate-700 block">Description & Evidence:</span>
                        <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                          {report.description || report.details || 'No additional details provided by member.'}
                        </p>
                      </div>

                      {/* Admin Notes if any */}
                      {report.adminNotes && (
                        <div className="text-xs p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 text-rose-900">
                          <strong>Admin Note:</strong> {report.adminNotes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewReportsModalOpen(false)}
                className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewReportsModalOpen(false);
                  handleOpenActionModal(selectedGroup, 'UNDER_REVIEW');
                }}
                className="px-5 py-2 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Take Administrative Action</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Full Profile Modal ── */}
      {viewProfileModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {selectedGroup.doctorName}
                  </h3>
                  <p className="text-xs text-slate-500">Candidate Matrimonial Dossier</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Photo & Basic Details */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  {selectedGroup.profilePhoto ? (
                    <img
                      src={selectedGroup.profilePhoto}
                      alt={selectedGroup.doctorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <DoctorAvatar
                      name={selectedGroup.doctorName}
                      className="w-full h-full rounded-none"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-bold text-slate-900">
                    {selectedGroup.doctorName}
                  </h4>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedGroup.profileStatus)}
                    <span className="text-xs text-slate-500 font-mono">
                      ID: #{selectedGroup.profileId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                  <span className="font-semibold text-slate-800">{selectedGroup.email || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Mobile Phone</span>
                  <span className="font-semibold text-slate-800">{selectedGroup.mobile || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Highest Qualification</span>
                  <span className="font-semibold text-slate-800">{selectedGroup.education || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Profession</span>
                  <span className="font-semibold text-slate-800">{selectedGroup.profession || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                  <span className="font-semibold text-slate-800">{selectedGroup.city || 'India'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Safety Reports</span>
                  <span className="font-bold text-[#E51F3E]">{selectedGroup.totalReports} reports</span>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <Link
                  href={`/profile/${selectedGroup.profileId}`}
                  target="_blank"
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Live Public Page</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setViewProfileModalOpen(false);
                    handleOpenActionModal(selectedGroup, 'UNDER_REVIEW');
                  }}
                  className="px-4 py-2 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] transition"
                >
                  Moderate Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Take Action Modal (Under review, warning, suspend, block, delete) ── */}
      {actionModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-rose-50 via-white to-amber-50/40 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-[#E51F3E] flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    Safety Action: {selectedGroup.doctorName}
                  </h3>
                  <p className="text-xs text-slate-500">Apply administrative safety enforcement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAction} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Administrative Action <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('UNDER_REVIEW')}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      actionType === 'UNDER_REVIEW'
                        ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Mark Under Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('WARNING')}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      actionType === 'WARNING'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Send className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Send Warning</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('SUSPEND')}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      actionType === 'SUSPEND'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-[#E51F3E] shrink-0" />
                    <span>Suspend Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('BLOCK')}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      actionType === 'BLOCK'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Ban className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Block Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('RESOLVE')}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      actionType === 'RESOLVE'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Resolve Reports</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('DELETE')}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      actionType === 'DELETE'
                        ? 'border-red-600 bg-red-50 text-red-950 ring-2 ring-red-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Soft Delete Profile</span>
                  </button>
                </div>
              </div>

              {/* Warning Message input if actionType === 'WARNING' */}
              {actionType === 'WARNING' && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Member Warning Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={actionWarningMsg}
                    onChange={(e) => setActionWarningMsg(e.target.value)}
                    placeholder="We have received reports concerning your profile details. Please update your qualifications according to medical council guidelines..."
                    className="w-full px-4 py-2.5 rounded-xl border border-amber-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <p className="text-[11px] text-slate-500">
                    This notice will be sent directly to the member&apos;s notifications without revealing reporter identities.
                  </p>
                </div>
              )}

              {/* Warning Confirmation Alert for Suspend / Block / Delete */}
              {(actionType === 'SUSPEND' || actionType === 'BLOCK' || actionType === 'DELETE') && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1 animate-in fade-in">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#E51F3E]" />
                    <span>Confirmation Required: Serious Action</span>
                  </p>
                  <p className="leading-relaxed">
                    {actionType === 'SUSPEND' &&
                      'Suspending will immediately exclude this doctor from all search results, recommendations, and messaging.'}
                    {actionType === 'BLOCK' &&
                      'Blocking will revoke login and interactive matrimonial privileges for this candidate.'}
                    {actionType === 'DELETE' &&
                      'Soft deletion safely archives this profile with audit logs. Data is not permanently removed.'}
                  </p>
                </div>
              )}

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Administrative Reason / Justification{' '}
                  {(actionType === 'SUSPEND' || actionType === 'BLOCK' || actionType === 'DELETE') && (
                    <span className="text-rose-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  required={actionType === 'SUSPEND' || actionType === 'BLOCK' || actionType === 'DELETE'}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Multiple reports of fraudulent medical registration / Fake qualification"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Internal Trust & Safety Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Internal notes recorded in the compliance audit log..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => setActionModalOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className={`px-6 py-2.5 rounded-full text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                    actionType === 'DELETE'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#E51F3E] hover:bg-[#CC1432]'
                  }`}
                >
                  {actionSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Confirm & Apply</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Audit History Modal ── */}
      {auditModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    Safety Audit Log: {selectedGroup.doctorName}
                  </h3>
                  <p className="text-xs text-slate-500">Chronological history of administrative actions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
              {auditLoading ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#E51F3E] animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">Retrieving audit trail...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  No previous administrative safety actions logged for this candidate.
                </div>
              ) : (
                auditLogs.map((log, index) => {
                  const dateStr = log.createdAt
                    ? new Date(log.createdAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';

                  return (
                    <div
                      key={log._id || index}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 text-sm">{log.action}</span>
                          <p className="text-slate-500">
                            By Admin: <strong>{log.adminName || 'Admin'}</strong>
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">{dateStr}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                        <span>
                          Previous: <strong>{log.previousStatus || 'Active'}</strong>
                        </span>
                        <span>→</span>
                        <span>
                          New: <strong className="text-[#E51F3E]">{log.newStatus || log.action}</strong>
                        </span>
                      </div>

                      {log.reason && (
                        <p className="text-slate-700">
                          <strong>Reason:</strong> {log.reason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
