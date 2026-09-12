'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  X,
  FileText,
  Clock,
  User,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  AlertTriangle,
  History,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
  Briefcase,
  CheckCheck,
  Mail,
  Phone,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  fetchVerifications,
  fetchVerificationDetails,
  approveVerification,
  rejectVerification,
  approveAllUserVerifications,
  rejectAllUserVerifications,
  VerificationItem,
  VerificationDetailItem,
  VerificationPagination,
} from '../../../services/verificationApi';

const STANDARD_DOCUMENT_TYPES = [
  {
    key: 'EMPLOYMENT',
    title: 'Employment Document',
    subtitle: 'Hospital / Clinic Affiliation & Pay Slip',
    icon: Briefcase,
    color: 'amber',
  },
  {
    key: 'PROFESSIONAL',
    title: 'Professional Qualification',
    subtitle: 'Medical Council Registration & License',
    icon: Award,
    color: 'purple',
  },
  {
    key: 'DEGREE',
    title: 'Degree / Education Certificate',
    subtitle: 'MBBS, MD, MS Convocation Degree',
    icon: GraduationCap,
    color: 'emerald',
  },
  {
    key: 'GOVERNMENT_ID',
    title: 'Government ID / KYC',
    subtitle: 'Aadhaar, Passport, Voter ID or DL',
    icon: ShieldCheck,
    color: 'blue',
  },
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  GOVERNMENT_ID: 'Government ID / KYC',
  DEGREE: 'Degree / Education Certificate',
  PROFESSIONAL: 'Professional Qualification',
  EMPLOYMENT: 'Employment Document',
  OTHER: 'Other Document',
};

const REJECTION_REASONS = [
  'Document copy unclear or blurry',
  'Document expired or validity lapsed',
  'Name mismatch with matrimonial doctor profile',
  'Incomplete document or missing reverse side',
  'Incorrect document category submitted',
  'Official medical council seal / signature not visible',
  'Other (see custom guidance note below)',
];

export interface UserVerificationGroup {
  userId: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
    verificationStatus: string;
    verified: boolean;
    isActive: boolean;
  };
  documents: VerificationItem[];
  overallStatus: 'PENDING' | 'PARTIALLY_VERIFIED' | 'APPROVED' | 'REJECTED';
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  latestSubmissionDate: string;
}

export default function AdminVerificationPage() {
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [pagination, setPagination] = useState<VerificationPagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters and Query State
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Accordion Expand/Collapse State (keyed by userId)
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  // Single Document Review Modal State
  const [selectedItem, setSelectedItem] = useState<VerificationDetailItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customRejectNote, setCustomRejectNote] = useState('');

  // Bulk User Action Modals State
  const [bulkApproveUser, setBulkApproveUser] = useState<UserVerificationGroup | null>(null);
  const [bulkRejectUser, setBulkRejectUser] = useState<UserVerificationGroup | null>(null);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkRejectReason, setBulkRejectReason] = useState(REJECTION_REASONS[0]);
  const [bulkCustomRejectNote, setBulkCustomRejectNote] = useState('');

  const [processingAction, setProcessingAction] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchVerifications({
        status: statusFilter,
        documentType: docTypeFilter,
        search: activeSearch,
        page,
        limit,
      });
      setVerifications(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      console.error('Failed to load verifications:', err);
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Unable to load verification records. Please check connection.',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, docTypeFilter, activeSearch, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group raw verification documents by User ID
  const groupedUsers = useMemo<UserVerificationGroup[]>(() => {
    const map = new Map<string, UserVerificationGroup>();

    for (const item of verifications) {
      const userId = item.user?._id || 'unknown';
      if (!map.has(userId)) {
        map.set(userId, {
          userId,
          user: item.user || {
            _id: userId,
            fullName: 'Doctor User',
            email: '—',
            mobile: '—',
            verificationStatus: 'PENDING',
            verified: false,
            isActive: true,
          },
          documents: [],
          overallStatus: 'PENDING',
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          latestSubmissionDate: item.submittedAt || item.createdAt || new Date().toISOString(),
        });
      }

      const group = map.get(userId)!;
      group.documents.push(item);

      if (item.status === 'PENDING') group.pendingCount++;
      else if (item.status === 'APPROVED') group.approvedCount++;
      else if (item.status === 'REJECTED') group.rejectedCount++;

      const itemDate = new Date(item.submittedAt || item.createdAt || 0).getTime();
      const groupDate = new Date(group.latestSubmissionDate).getTime();
      if (itemDate > groupDate) {
        group.latestSubmissionDate = item.submittedAt || item.createdAt;
      }
    }

    // Determine overall verification status for each doctor group
    for (const group of map.values()) {
      group.documents.sort(
        (a, b) =>
          new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime()
      );

      const total = group.documents.length;
      if (group.user.verified || (group.approvedCount > 0 && group.pendingCount === 0 && group.rejectedCount === 0)) {
        group.overallStatus = 'APPROVED';
      } else if (group.approvedCount > 0) {
        group.overallStatus = 'PARTIALLY_VERIFIED';
      } else if (group.rejectedCount === total && total > 0) {
        group.overallStatus = 'REJECTED';
      } else {
        group.overallStatus = 'PENDING';
      }
    }

    return Array.from(map.values());
  }, [verifications]);

  // Set default expanded state when users load
  useEffect(() => {
    if (groupedUsers.length > 0) {
      setExpandedUsers((prev) => {
        const nextState = { ...prev };
        for (const g of groupedUsers) {
          if (nextState[g.userId] === undefined) {
            // Auto-expand users that require attention (pending review or partially verified)
            nextState[g.userId] = g.pendingCount > 0 || g.overallStatus === 'PENDING';
          }
        }
        return nextState;
      });
    }
  }, [groupedUsers]);

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleExpandAll = () => {
    const nextState: Record<string, boolean> = {};
    for (const g of groupedUsers) {
      nextState[g.userId] = true;
    }
    setExpandedUsers(nextState);
  };

  const handleCollapseAll = () => {
    const nextState: Record<string, boolean> = {};
    for (const g of groupedUsers) {
      nextState[g.userId] = false;
    }
    setExpandedUsers(nextState);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchQuery);
  };

  // Open single document review modal
  const handleOpenReview = async (item: VerificationItem) => {
    setSelectedItem(item);
    setAdminNotes(item.adminNotes || '');
    setLoadingDetails(true);
    try {
      const details = await fetchVerificationDetails(item._id);
      setSelectedItem(details.data);
    } catch (err) {
      console.error('Failed to load full verification details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Approve single document
  const handleApproveSingle = async () => {
    if (!selectedItem) return;
    setProcessingAction(true);
    try {
      const res = await approveVerification(selectedItem._id, adminNotes);
      setActionNotice({
        type: 'success',
        message: res.message || `Successfully verified document for ${selectedItem.user?.fullName}!`,
      });
      setShowApproveConfirm(false);
      setSelectedItem(null);
      loadData();
    } catch (err: any) {
      console.error('Approval failed:', err);
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to approve verification record.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Reject single document
  const handleRejectSingle = async () => {
    if (!selectedItem) return;
    if (!rejectReason) {
      setActionNotice({ type: 'error', message: 'Please select a rejection reason.' });
      return;
    }

    const finalReason =
      rejectReason === 'Other (see custom guidance note below)'
        ? customRejectNote.trim() || 'Document does not meet matrimonial verification requirements'
        : `${rejectReason}${customRejectNote.trim() ? ` - ${customRejectNote.trim()}` : ''}`;

    setProcessingAction(true);
    try {
      const res = await rejectVerification(selectedItem._id, finalReason, adminNotes || finalReason);
      setActionNotice({
        type: 'success',
        message: res.message || `Verification rejected for ${selectedItem.user?.fullName}.`,
      });
      setShowRejectModal(false);
      setSelectedItem(null);
      setCustomRejectNote('');
      loadData();
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to reject verification record.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Bulk Approve all documents for a user
  const handleBulkApprove = async () => {
    if (!bulkApproveUser) return;
    setProcessingAction(true);
    try {
      const res = await approveAllUserVerifications(bulkApproveUser.userId, bulkNotes);
      setActionNotice({
        type: 'success',
        message: res.message || `All credentials approved for ${bulkApproveUser.user.fullName}. User is now Verified!`,
      });
      setBulkApproveUser(null);
      setBulkNotes('');
      loadData();
    } catch (err: any) {
      console.error('Bulk approval failed:', err);
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to bulk approve user verifications.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Bulk Reject all pending documents for a user
  const handleBulkReject = async () => {
    if (!bulkRejectUser) return;
    const finalReason =
      bulkRejectReason === 'Other (see custom guidance note below)'
        ? bulkCustomRejectNote.trim() || 'Documents do not meet matrimonial verification requirements'
        : `${bulkRejectReason}${bulkCustomRejectNote.trim() ? ` - ${bulkCustomRejectNote.trim()}` : ''}`;

    setProcessingAction(true);
    try {
      const res = await rejectAllUserVerifications(bulkRejectUser.userId, finalReason, bulkNotes || finalReason);
      setActionNotice({
        type: 'success',
        message: res.message || `Documents rejected for ${bulkRejectUser.user.fullName}. Re-upload requested.`,
      });
      setBulkRejectUser(null);
      setBulkCustomRejectNote('');
      setBulkNotes('');
      loadData();
    } catch (err: any) {
      console.error('Bulk rejection failed:', err);
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to reject user verification documents.',
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const getEmptyStateMessage = () => {
    if (activeSearch) return `No verification records matching "${activeSearch}".`;
    if (statusFilter === 'PENDING') return 'No pending verification documents in queue.';
    if (statusFilter === 'APPROVED') return 'No approved verification records found.';
    if (statusFilter === 'REJECTED') return 'No rejected verification records found.';
    return 'No verification records found.';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notice */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-500 hover:text-slate-900 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              KYC & Degree Verification Queue
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold">
              {groupedUsers.length} Doctors ({pagination.total} Documents)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Grouped user verification cards: audit Employment, Council Registration, University Degree, and Government ID in one consolidated block
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            Collapse All
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { key: 'PENDING', label: 'Pending Review' },
              { key: 'APPROVED', label: 'Approved & Verified' },
              { key: 'REJECTED', label: 'Rejected Documents' },
              { key: 'ALL', label: 'All Records' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Document Category Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctor, email, mobile..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            <select
              value={docTypeFilter}
              onChange={(e) => {
                setDocTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="GOVERNMENT_ID">Government ID / KYC</option>
              <option value="DEGREE">Degree / Education</option>
              <option value="PROFESSIONAL">Professional Qualification</option>
              <option value="EMPLOYMENT">Employment Document</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Grouped User Verification Queue (ONE CARD PER USER) ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#E51F3E] mb-3" />
            <p className="font-bold text-slate-700 text-sm">Loading Doctor Verification Queue...</p>
            <p className="text-xs text-slate-400 mt-1">Grouping submitted documents by doctor candidate</p>
          </div>
        ) : groupedUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-sm">{getEmptyStateMessage()}</p>
            <p className="text-xs text-slate-400 mt-1">
              All credentials in this category have been processed.
            </p>
          </div>
        ) : (
          groupedUsers.map((group) => {
            const isExpanded = !!expandedUsers[group.userId];

            // Organize user's documents into the 4 standard categories
            const docMap = new Map<string, VerificationItem>();
            const otherDocs: VerificationItem[] = [];

            for (const doc of group.documents) {
              const typeUpper = (doc.documentType || '').toUpperCase();
              if (
                typeUpper.includes('GOV') ||
                typeUpper.includes('ID') ||
                typeUpper.includes('AADHAAR') ||
                typeUpper.includes('PASSPORT')
              ) {
                if (!docMap.has('GOVERNMENT_ID') || doc.status === 'PENDING') {
                  docMap.set('GOVERNMENT_ID', doc);
                }
              } else if (typeUpper.includes('DEGREE') || typeUpper.includes('EDU') || typeUpper.includes('MBBS')) {
                if (!docMap.has('DEGREE') || doc.status === 'PENDING') {
                  docMap.set('DEGREE', doc);
                }
              } else if (
                typeUpper.includes('PROFESSIONAL') ||
                typeUpper.includes('COUNCIL') ||
                typeUpper.includes('LICENSE') ||
                typeUpper.includes('MEDICAL')
              ) {
                if (!docMap.has('PROFESSIONAL') || doc.status === 'PENDING') {
                  docMap.set('PROFESSIONAL', doc);
                }
              } else if (
                typeUpper.includes('EMPLOY') ||
                typeUpper.includes('WORK') ||
                typeUpper.includes('HOSPITAL') ||
                typeUpper.includes('SALARY')
              ) {
                if (!docMap.has('EMPLOYMENT') || doc.status === 'PENDING') {
                  docMap.set('EMPLOYMENT', doc);
                }
              } else {
                otherDocs.push(doc);
              }
            }

            return (
              <div
                key={group.userId}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* ── CARD HEADER: Doctor Identity + Overall Status + Bulk Actions ── */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 via-white to-slate-50/30">
                  {/* Left: Doctor Details */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 text-[#E51F3E] border border-rose-100 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                      <User className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                          {group.user.fullName || 'Doctor Candidate'}
                        </h3>

                        {/* Overall Verification Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            group.overallStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : group.overallStatus === 'PARTIALLY_VERIFIED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : group.overallStatus === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {group.overallStatus === 'APPROVED'
                            ? 'Verified Doctor'
                            : group.overallStatus === 'PARTIALLY_VERIFIED'
                            ? 'Partially Verified'
                            : group.overallStatus === 'REJECTED'
                            ? 'Rejected'
                            : 'Pending Review'}
                        </span>

                        {group.user.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified Profile
                          </span>
                        )}
                      </div>

                      {/* Doctor Meta: Email, Mobile, Submission Date */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-700 font-semibold">{group.user.email || '—'}</span>
                        </span>
                        {group.user.mobile && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-700">{group.user.mobile}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Latest Activity:{' '}
                            {new Date(group.latestSubmissionDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Document Counts & Admin Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
                    {/* Document Breakdown Badges */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs mr-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                      <span className="font-bold text-slate-800">{group.documents.length} Docs:</span>
                      {group.pendingCount > 0 && (
                        <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                          {group.pendingCount} Pending
                        </span>
                      )}
                      {group.approvedCount > 0 && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                          {group.approvedCount} Approved
                        </span>
                      )}
                      {group.rejectedCount > 0 && (
                        <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                          {group.rejectedCount} Rejected
                        </span>
                      )}
                    </div>

                    {/* Bulk Actions (Only visible when pending documents exist) */}
                    {group.pendingCount > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBulkRejectUser(group);
                            setBulkRejectReason(REJECTION_REASONS[0]);
                            setBulkCustomRejectNote('');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs"
                        >
                          Reject All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBulkApproveUser(group);
                            setBulkNotes('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Approve All</span>
                        </button>
                      </div>
                    )}

                    {/* View Full Profile Link */}
                    <Link
                      href={`/admin/profiles/${group.userId}?tab=verification`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="View complete matrimonial profile"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Profile</span>
                    </Link>

                    {/* Expand/Collapse Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleUserExpand(group.userId)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Documents' : 'Review Documents'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  </div>
                </div>

                {/* ── EXPANDED VIEW: All 4 Document Categories in a single unified grid ── */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-50/40 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-[#E51F3E]" />
                        <span>Submitted Verification Credentials ({group.documents.length})</span>
                      </span>
                      <span className="text-slate-400 text-[11px]">Click Review on any document to inspect full-resolution scan</span>
                    </div>

                    {/* Standard 4-Category Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
                      {STANDARD_DOCUMENT_TYPES.map((cat) => {
                        const doc = docMap.get(cat.key);
                        const IconComponent = cat.icon;

                        return (
                          <div
                            key={cat.key}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                              doc
                                ? doc.status === 'APPROVED'
                                  ? 'bg-white border-emerald-200 shadow-2xs'
                                  : doc.status === 'REJECTED'
                                  ? 'bg-white border-rose-200 shadow-2xs'
                                  : 'bg-white border-amber-200 shadow-2xs ring-1 ring-amber-400/20'
                                : 'bg-slate-50/60 border-dashed border-slate-200 opacity-65'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Document Type Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                      cat.color === 'amber'
                                        ? 'bg-amber-100 text-amber-700'
                                        : cat.color === 'purple'
                                        ? 'bg-purple-100 text-purple-700'
                                        : cat.color === 'emerald'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    <IconComponent className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-900 text-xs leading-snug">
                                      {cat.title}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-1">{cat.subtitle}</p>
                                  </div>
                                </div>

                                {doc && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase shrink-0 ${
                                      doc.status === 'APPROVED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : doc.status === 'REJECTED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800 animate-pulse'
                                    }`}
                                  >
                                    {doc.status}
                                  </span>
                                )}
                              </div>

                              {/* Document Details if Submitted */}
                              {doc ? (
                                <div className="space-y-1.5 pt-1 text-xs">
                                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1">
                                    <p className="font-bold text-slate-800 text-[11.5px] truncate" title={doc.documentName || 'Document'}>
                                      {doc.documentName || cat.title}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                      <span>
                                        Uploaded:{' '}
                                        {new Date(doc.submittedAt || doc.createdAt).toLocaleDateString('en-IN', {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                      {doc.attemptNumber > 1 && (
                                        <span className="font-semibold text-slate-500">Attempt #{doc.attemptNumber}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Rejection Note if Rejected */}
                                  {doc.status === 'REJECTED' && doc.rejectionReason && (
                                    <p className="text-[10.5px] text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-100 line-clamp-2" title={doc.rejectionReason}>
                                      <strong>Rejected:</strong> {doc.rejectionReason}
                                    </p>
                                  )}

                                  {/* Admin Audit Note if Approved */}
                                  {doc.status === 'APPROVED' && doc.adminNotes && (
                                    <p className="text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 line-clamp-1" title={doc.adminNotes}>
                                      ✓ {doc.adminNotes}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="py-4 text-center">
                                  <p className="text-[11px] text-slate-400 font-medium">Not Uploaded Yet</p>
                                  <p className="text-[9.5px] text-slate-300">Awaiting candidate submission</p>
                                </div>
                              )}
                            </div>

                            {/* Action Button */}
                            {doc && (
                              <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {doc.fileType?.includes('pdf') || doc.documentUrl?.endsWith('.pdf') ? 'PDF File' : 'Image Scan'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(doc)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 transition shadow-2xs"
                                >
                                  <Eye className="w-3 h-3 text-[#E51F3E]" />
                                  <span>{doc.status === 'PENDING' ? 'Review' : 'View'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional Documents if any */}
                    {otherDocs.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Additional Uploaded Documents ({otherDocs.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                          {otherDocs.map((doc) => (
                            <div
                              key={doc._id}
                              className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="truncate">
                                <span className="font-bold text-slate-800 text-xs block truncate">
                                  {doc.documentName || doc.documentType}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(doc.submittedAt || doc.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                    doc.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : doc.status === 'REJECTED'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {doc.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(doc)}
                                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                                  title="Review"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#E51F3E]" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing {groupedUsers.length} doctor candidate verification cards ({pagination.total} total documents)
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Documents limit:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-800">
              {page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Single Document Review Modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto animate-fade-in flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-[#E51F3E] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Document Credential Audit
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        selectedItem.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedItem.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedItem.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Doctor Candidate: <strong className="text-slate-800">{selectedItem.user?.fullName}</strong> ({selectedItem.user?.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setShowApproveConfirm(false);
                  setShowRejectModal(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Top Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Document Type</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {DOCUMENT_TYPE_LABELS[selectedItem.documentType] || selectedItem.documentType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Attempt Number</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    Attempt #{selectedItem.attemptNumber || 1}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Submitted Date</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {new Date(selectedItem.submittedAt || selectedItem.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">User Status</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {selectedItem.user?.verificationStatus || 'PENDING'}
                  </span>
                </div>
              </div>

              {/* Document Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#E51F3E]" />
                    <span>Submitted Document Preview</span>
                  </span>
                  <a
                    href={selectedItem.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#E51F3E] hover:underline text-[11px]"
                  >
                    <span>Open Full Resolution</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="bg-slate-950/5 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[260px] max-h-[420px] overflow-hidden">
                  {selectedItem.fileType?.includes('pdf') || selectedItem.documentUrl?.endsWith('.pdf') ? (
                    <div className="text-center space-y-3 py-6">
                      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-[#E51F3E] flex items-center justify-center mx-auto shadow-sm">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{selectedItem.documentName || 'PDF Document'}</p>
                        <p className="text-slate-500 text-xs">Secure Authenticated PDF Document</p>
                      </div>
                      <a
                        href={selectedItem.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Document in Protected Viewer</span>
                      </a>
                    </div>
                  ) : (
                    <img
                      src={selectedItem.documentUrl}
                      alt={selectedItem.documentName}
                      className="max-h-[380px] rounded-xl object-contain shadow-sm border border-slate-200 bg-white"
                    />
                  )}
                </div>
              </div>

              {/* Verification Attempt History (if exists) */}
              {selectedItem.history && selectedItem.history.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-600" />
                    <span>Previous Verification History for this Doctor</span>
                  </span>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto">
                    {selectedItem.history.map((hist) => (
                      <div key={hist._id} className="p-2.5 flex items-center justify-between text-[11px] bg-slate-50/50">
                        <div>
                          <span className="font-bold text-slate-800">{hist.documentName || hist.documentType}</span>
                          <span className="text-slate-400 ml-2">
                            Attempt #{hist.attemptNumber || 1} • {new Date(hist.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            hist.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : hist.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {hist.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes Box */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Administrator Internal Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Verified registration certificate against official state medical council register..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 font-medium"
                />
              </div>

              {/* Approve Confirmation Prompt */}
              {showApproveConfirm && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Approve this Document?</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    This will mark the document as <strong>APPROVED</strong>, update {selectedItem.user?.fullName}&apos;s verified credentials, and send a status notification to the candidate.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowApproveConfirm(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApproveSingle}
                      disabled={processingAction}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {processingAction ? 'Approving...' : 'Confirm Approval'}
                    </button>
                  </div>
                </div>
              )}

              {/* Reject Reason Form */}
              {showRejectModal && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>Reject Verification Document</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    Select a structured reason. The doctor candidate will be notified and guided to re-upload:
                  </p>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Rejection Category</label>
                      <select
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full p-2 bg-white border border-rose-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                      >
                        {REJECTION_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Additional Candidate Guidance Note</label>
                      <textarea
                        rows={2}
                        value={customRejectNote}
                        onChange={(e) => setCustomRejectNote(e.target.value)}
                        placeholder="e.g. Please upload clear color scan showing official council seal and registration number..."
                        className="w-full p-2 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-800 text-xs font-semibold hover:bg-rose-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRejectSingle}
                      disabled={processingAction}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {processingAction ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            {!showApproveConfirm && !showRejectModal && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Document</span>
                  </button>

                  <button
                    onClick={() => setShowApproveConfirm(true)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Document</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk Approve Modal ── */}
      {bulkApproveUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Approve All Pending Documents
                </h3>
                <p className="text-xs text-slate-500">
                  Candidate: <strong>{bulkApproveUser.user.fullName}</strong>
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 space-y-2">
              <p>
                You are about to approve <strong>{bulkApproveUser.pendingCount} pending verification document(s)</strong> for this doctor candidate.
              </p>
              <p className="text-[11px] text-emerald-700">
                This will grant full <strong>Verified Doctor Badge</strong> status on their matrimonial profile and dispatch an instant confirmation notification.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-800 block">Optional Administrator Audit Note</label>
              <input
                type="text"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="e.g. All medical council credentials and degree validated."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBulkApproveUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={processingAction}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {processingAction ? 'Approving All...' : 'Confirm Approve All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Reject Modal ── */}
      {bulkRejectUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Reject Pending Documents & Request Re-upload
                </h3>
                <p className="text-xs text-slate-500">
                  Candidate: <strong>{bulkRejectUser.user.fullName}</strong>
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-900">
              <p>
                Rejecting <strong>{bulkRejectUser.pendingCount} pending document(s)</strong>. The candidate will receive a structured notification with instructions to upload fresh copies.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Rejection Category</label>
                <select
                  value={bulkRejectReason}
                  onChange={(e) => setBulkRejectReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-rose-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Candidate Guidance Note</label>
                <textarea
                  rows={2}
                  value={bulkCustomRejectNote}
                  onChange={(e) => setBulkCustomRejectNote(e.target.value)}
                  placeholder="e.g. Please provide clear scans showing doctor name and council registration clearly..."
                  className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBulkRejectUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkReject}
                disabled={processingAction}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {processingAction ? 'Rejecting All...' : 'Confirm Reject All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
