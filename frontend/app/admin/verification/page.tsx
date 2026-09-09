'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import {
  fetchVerifications,
  fetchVerificationDetails,
  approveVerification,
  rejectVerification,
  VerificationItem,
  VerificationDetailItem,
  VerificationPagination,
} from '../../../services/verificationApi';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  GOVERNMENT_ID: 'Government ID / KYC',
  DEGREE: 'Degree / Education',
  PROFESSIONAL: 'Professional Qualification',
  EMPLOYMENT: 'Employment Document',
  OTHER: 'Other Document',
};

const REJECTION_REASONS = [
  'Document copy unclear or blurry',
  'Document expired or validity lapsed',
  'Name mismatch with matrimonial profile',
  'Incomplete document or missing pages',
  'Incorrect document type submitted',
  'Official seal / signature not visible',
  'Other (see custom admin note below)',
];

export default function AdminVerificationPage() {
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [pagination, setPagination] = useState<VerificationPagination>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters and Query State
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Review and Modal State
  const [selectedItem, setSelectedItem] = useState<VerificationDetailItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customRejectNote, setCustomRejectNote] = useState('');
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchQuery);
  };

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

  const handleApprove = async () => {
    if (!selectedItem) return;
    setProcessingAction(true);
    try {
      const res = await approveVerification(selectedItem._id, adminNotes);
      setActionNotice({
        type: 'success',
        message: res.message || `Successfully verified credentials for ${selectedItem.user?.fullName}!`,
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

  const handleReject = async () => {
    if (!selectedItem) return;
    if (!rejectReason) {
      setActionNotice({ type: 'error', message: 'Please select a rejection reason.' });
      return;
    }

    const finalReason = rejectReason === 'Other (see custom admin note below)'
      ? (customRejectNote.trim() || 'Document does not meet matrimonial verification requirements')
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

  const getEmptyStateMessage = () => {
    if (activeSearch) return `No verification records matching "${activeSearch}".`;
    if (statusFilter === 'PENDING') return 'No verification records found in this queue.';
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
              {pagination.total} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit government IDs, medical certificates, degrees, and employment proof to maintain 100% verified matrimonial trust
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
          <span>Refresh Queue</span>
        </button>
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

          {/* Search & Document Type Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, email, ID..."
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
              <option value="ALL">All Document Types</option>
              <option value="GOVERNMENT_ID">Government ID / KYC</option>
              <option value="DEGREE">Degree / Education</option>
              <option value="PROFESSIONAL">Professional Qualification</option>
              <option value="EMPLOYMENT">Employment Document</option>
            </select>
          </div>
        </div>
      </div>

      {/* Verifications Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Document / Qualification Type</th>
                <th className="py-3.5 px-5">Submitted Date</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Admin Notes / Audit Reason</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E51F3E] mb-2" />
                    Loading verification requests...
                  </td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">{getEmptyStateMessage()}</p>
                    <p className="text-xs text-slate-400 mt-1">All doctor qualifications and IDs in this category are up to date.</p>
                  </td>
                </tr>
              ) : (
                verifications.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{item.user?.fullName || 'Doctor User'}</p>
                          <p className="text-[11px] text-slate-500">{item.user?.email || item.user?.mobile}</p>
                        </div>
                        {item.user?.verified && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            VERIFIED USER
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0 font-bold">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {DOCUMENT_TYPE_LABELS[item.documentType] || item.documentType}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                            {item.documentName || 'Document'} {item.attemptNumber > 1 && `(Attempt #${item.attemptNumber})`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      <p className="font-medium text-slate-700">
                        {new Date(item.submittedAt || item.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.submittedAt || item.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 max-w-xs">
                      {item.rejectionReason ? (
                        <span className="text-rose-600 font-semibold block truncate" title={item.rejectionReason}>
                          Reason: {item.rejectionReason}
                        </span>
                      ) : (
                        <span className="truncate block" title={item.adminNotes || ''}>
                          {item.adminNotes || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenReview(item)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + (verifications.length > 0 ? 1 : 0)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
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
      </div>

      {/* ── Comprehensive Review Modal ── */}
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
                      Verification Credential Audit
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
                    Candidate: <strong className="text-slate-800">{selectedItem.user?.fullName}</strong> ({selectedItem.user?.email})
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
                  {selectedItem.fileType?.includes('pdf') || selectedItem.documentUrl.endsWith('.pdf') ? (
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
                    <span>Previous Verification History for this User</span>
                  </span>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto">
                    {selectedItem.history.map((hist) => (
                      <div key={hist._id} className="p-2.5 flex items-center justify-between text-[11px] bg-slate-50/50">
                        <div>
                          <span className="font-bold text-slate-800">{hist.documentName || hist.documentType}</span>
                          <span className="text-slate-400 ml-2">Attempt #{hist.attemptNumber || 1} • {new Date(hist.createdAt).toLocaleDateString()}</span>
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
                  placeholder="e.g. Verified registration certificate against official council register..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50 font-medium"
                />
              </div>

              {/* Approve Confirmation Prompt */}
              {showApproveConfirm && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Approve and Grant Matrimonial Verified Status?</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    This will mark the document as <strong>APPROVED</strong>, update {selectedItem.user?.fullName}&apos;s profile verification status to <strong>VERIFIED</strong>, and dispatch an instant confirmation notification.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowApproveConfirm(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApprove}
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
                    Select a structured reason. The candidate will be notified and invited to submit a replacement document:
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
                        placeholder="e.g. Please upload clear scan of the degree certificate with official seal..."
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
                      onClick={handleReject}
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
                  Close Review
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
                    <span>Approve Verification</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
