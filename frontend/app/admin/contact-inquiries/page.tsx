'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquareDot,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Inbox,
  X,
  Send,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  Tag,
  SlidersHorizontal,
  CornerDownRight,
} from 'lucide-react';
import {
  fetchContactInquiries,
  fetchContactInquiry,
  fetchContactInquirySummary,
  updateContactInquiry,
  replyToContactInquiry,
  deleteContactInquiry,
  ContactInquiry,
  ContactInquirySummary,
} from '../../../services/contactInquiryApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['ALL', 'NEW', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS = ['ALL', 'LOW', 'NORMAL', 'HIGH', 'URGENT'];
const CATEGORY_OPTIONS = [
  'ALL',
  'GENERAL',
  'TECHNICAL_SUPPORT',
  'ACCOUNT_ISSUE',
  'MEMBERSHIP',
  'PAYMENT',
  'VERIFICATION',
  'PROFILE_ISSUE',
  'OTHER',
];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NEW: { label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Inbox className="w-3 h-3" /> },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  WAITING_FOR_USER: { label: 'Waiting', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <AlertCircle className="w-3 h-3" /> },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <XCircle className="w-3 h-3" /> },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  NORMAL: { label: 'Normal', color: 'bg-sky-100 text-sky-700' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', color: 'bg-rose-100 text-rose-700 font-bold' },
};

function formatLabel(str?: string | null) {
  if (!str) return '';
  return str.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, color: 'bg-slate-100 text-slate-600', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] || { label: priority, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  color,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1 p-4 rounded-2xl border transition-all text-left w-full ${
        active
          ? 'bg-[#E51F3E] text-white border-[#E51F3E] shadow-md shadow-red-200'
          : 'bg-white border-slate-200 hover:border-[#E51F3E]/40 hover:shadow-sm'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? 'bg-white/20' : color}`}>
        {icon}
      </div>
      <span className={`text-2xl font-extrabold leading-none mt-1 ${active ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </span>
      <span className={`text-[11px] font-medium ${active ? 'text-white/80' : 'text-slate-500'}`}>{label}</span>
    </button>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function InquiryDetailModal({
  inquiry,
  onClose,
  onUpdated,
}: {
  inquiry: ContactInquiry;
  onClose: () => void;
  onUpdated: (updated: ContactInquiry) => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'replies' | 'notes'>('details');
  const [updatingStatus, setUpdatingStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState(inquiry.priority);
  const [selectedCategory, setSelectedCategory] = useState(inquiry.category);
  const [adminNotes, setAdminNotes] = useState(inquiry.adminNotes || '');
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [replyResult, setReplyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [statusNote, setStatusNote] = useState('');

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const updated = await updateContactInquiry(inquiry._id, {
        status: newStatus,
        note: statusNote || undefined,
      });
      onUpdated(updated);
      setUpdatingStatus('');
      setStatusNote('');
    } catch {
      alert('Failed to update status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const updated = await updateContactInquiry(inquiry._id, {
        priority: selectedPriority,
        category: selectedCategory,
        adminNotes,
      });
      onUpdated(updated);
    } catch {
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    setReplyResult(null);
    try {
      const result = await replyToContactInquiry(inquiry._id, replyText.trim());
      setReplyResult({
        success: result.emailSent,
        message: result.emailSent
          ? 'Reply sent successfully via email.'
          : `Reply saved but email not sent: ${result.emailError || 'SMTP not configured'}`,
      });
      setReplyText('');
      // Refresh the inquiry
      const refreshed = await fetchContactInquiry(inquiry._id);
      onUpdated(refreshed);
    } catch {
      setReplyResult({ success: false, message: 'Failed to send reply. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const statusButtons = [
    { status: 'IN_PROGRESS', label: 'Mark In Progress', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
    { status: 'WAITING_FOR_USER', label: 'Waiting for User', color: 'bg-purple-500 hover:bg-purple-600 text-white' },
    { status: 'RESOLVED', label: 'Mark Resolved', color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { status: 'CLOSED', label: 'Close Inquiry', color: 'bg-slate-500 hover:bg-slate-600 text-white' },
  ].filter((b) => b.status !== inquiry.status);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 backdrop-blur-sm overflow-y-auto py-6 px-3">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E51F3E]/10 border border-[#E51F3E]/20 flex items-center justify-center text-[#E51F3E]">
              <MessageSquareDot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-sm">{inquiry.inquiryId}</span>
                <StatusBadge status={inquiry.status} />
                <PriorityBadge priority={inquiry.priority} />
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(inquiry.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4">
          {(['details', 'history', 'replies', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-semibold capitalize transition border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#E51F3E] text-[#E51F3E]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'replies' ? `Replies (${inquiry.adminReplies.length})` : tab}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Submitter Info */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitter</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold">{inquiry.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${inquiry.userType === 'REGISTERED_MEMBER' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {inquiry.userType === 'REGISTERED_MEMBER' ? 'Member' : 'Guest'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    {inquiry.mobileNumber}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 col-span-full sm:col-span-1">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`mailto:${inquiry.email}`} className="text-[#E51F3E] hover:underline break-all">
                      {inquiry.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    {formatDate(inquiry.createdAt)}
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="rounded-2xl border border-slate-100 bg-blue-50/50 p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</h4>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
              </div>

              {/* Update Settings */}
              <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Priority</label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#E51F3E]"
                    >
                      {PRIORITY_OPTIONS.filter((p) => p !== 'ALL').map((p) => (
                        <option key={p} value={p}>{formatLabel(p)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#E51F3E]"
                    >
                      {CATEGORY_OPTIONS.filter((c) => c !== 'ALL').map((c) => (
                        <option key={c} value={c}>{formatLabel(c)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSaveDetails}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold transition disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              {/* Status Actions */}
              <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Change Status</h4>
                <div className="flex flex-wrap gap-2">
                  {statusButtons.map((btn) => (
                    <button
                      key={btn.status}
                      onClick={() => setUpdatingStatus(btn.status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${btn.color}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                {updatingStatus && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Optional note for this status change..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-[#E51F3E]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange(updatingStatus)}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-xl bg-[#E51F3E] hover:bg-[#d11735] text-white text-xs font-semibold transition disabled:opacity-60"
                      >
                        {saving ? 'Updating...' : `Confirm: ${formatLabel(updatingStatus)}`}
                      </button>
                      <button
                        onClick={() => { setUpdatingStatus(''); setStatusNote(''); }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {inquiry.statusHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No status history available.</p>
              ) : (
                [...inquiry.statusHistory].reverse().map((h, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={h.status} />
                        {h.changedByEmail && (
                          <span className="text-[11px] text-slate-500">by {h.changedByEmail}</span>
                        )}
                      </div>
                      {h.note && <p className="text-xs text-slate-600 mt-1">{h.note}</p>}
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(h.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* REPLIES TAB */}
          {activeTab === 'replies' && (
            <div className="space-y-5">
              {/* Past Replies */}
              {inquiry.adminReplies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previous Replies</h4>
                  {[...inquiry.adminReplies].reverse().map((r, i) => (
                    <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {r.sentByEmail || 'Admin'} • {formatDate(r.sentAt)}
                        </span>
                        {r.emailSent ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            Email Sent ✓
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold" title={r.emailError}>
                            Email Not Sent
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{r.replyText}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* New Reply Form */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Send Reply to {inquiry.name}</h4>
                <p className="text-[11px] text-slate-400">Reply will be emailed to <strong className="text-slate-600">{inquiry.email}</strong></p>
                <textarea
                  rows={5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Write your reply to ${inquiry.name}...`}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20 resize-none"
                />
                {replyResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-medium ${replyResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                    {replyResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                    {replyResult.message}
                  </div>
                )}
                <button
                  onClick={handleSendReply}
                  disabled={saving || !replyText.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E51F3E] hover:bg-[#d11735] text-white text-xs font-bold shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  {saving ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Internal notes are <strong>never visible</strong> to the submitter or public users.
              </div>
              <textarea
                rows={8}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes for your team..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20 resize-none"
              />
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminContactInquiriesPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [summary, setSummary] = useState<ContactInquirySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Detail modal
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchContactInquiries({
        page,
        limit: LIMIT,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search: search || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setInquiries(res.data);
      setSummary(res.summary);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.pages);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load contact inquiries.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, search]);

  useEffect(() => {
    const debounce = setTimeout(loadData, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [loadData, search]);

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await deleteContactInquiry(id);
      setDeletingId(null);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete inquiry.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInquiryUpdated = (updated: ContactInquiry) => {
    setInquiries((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    setSelectedInquiry(updated);
    // Refresh summary
    fetchContactInquirySummary().then(setSummary).catch(() => {});
  };

  const handleStatusCardClick = (status: string) => {
    const map: Record<string, string> = {
      new: 'NEW',
      inProgress: 'IN_PROGRESS',
      waitingForUser: 'WAITING_FOR_USER',
      resolved: 'RESOLVED',
      closed: 'CLOSED',
    };
    const mapped = map[status] || 'ALL';
    setStatusFilter(mapped === statusFilter ? 'ALL' : mapped);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquareDot className="w-5 h-5 text-[#E51F3E]" />
            Contact Inquiries
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and respond to all contact form submissions</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-[#E51F3E] hover:text-[#E51F3E] text-xs font-semibold transition shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard
            label="Total"
            value={summary.total}
            color="bg-slate-100 text-slate-600"
            icon={<FileText className="w-4 h-4" />}
            active={statusFilter === 'ALL'}
            onClick={() => { setStatusFilter('ALL'); setPage(1); }}
          />
          <SummaryCard
            label="New"
            value={summary.new}
            color="bg-blue-100 text-blue-600"
            icon={<Inbox className="w-4 h-4" />}
            active={statusFilter === 'NEW'}
            onClick={() => { setStatusFilter(statusFilter === 'NEW' ? 'ALL' : 'NEW'); setPage(1); }}
          />
          <SummaryCard
            label="In Progress"
            value={summary.inProgress}
            color="bg-amber-100 text-amber-600"
            icon={<Clock className="w-4 h-4" />}
            active={statusFilter === 'IN_PROGRESS'}
            onClick={() => { setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS'); setPage(1); }}
          />
          <SummaryCard
            label="Waiting"
            value={summary.waitingForUser}
            color="bg-purple-100 text-purple-600"
            icon={<AlertCircle className="w-4 h-4" />}
            active={statusFilter === 'WAITING_FOR_USER'}
            onClick={() => { setStatusFilter(statusFilter === 'WAITING_FOR_USER' ? 'ALL' : 'WAITING_FOR_USER'); setPage(1); }}
          />
          <SummaryCard
            label="Resolved"
            value={summary.resolved}
            color="bg-emerald-100 text-emerald-600"
            icon={<CheckCircle2 className="w-4 h-4" />}
            active={statusFilter === 'RESOLVED'}
            onClick={() => { setStatusFilter(statusFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED'); setPage(1); }}
          />
          <SummaryCard
            label="High Priority"
            value={summary.highPriority}
            color="bg-rose-100 text-rose-600"
            icon={<AlertTriangle className="w-4 h-4" />}
            active={priorityFilter === 'HIGH'}
            onClick={() => { setPriorityFilter(priorityFilter === 'HIGH' ? 'ALL' : 'HIGH'); setPage(1); }}
          />
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, name, email, mobile..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-[#E51F3E] text-slate-700"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#E51F3E] text-slate-700"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : formatLabel(s)}</option>)}
            </select>
          </div>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#E51F3E] text-slate-700"
          >
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : formatLabel(p)}</option>)}
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#E51F3E] text-slate-700"
          >
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : formatLabel(c)}</option>)}
          </select>

          {/* Clear Filters */}
          {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL' || search) && (
            <button
              onClick={() => { setStatusFilter('ALL'); setPriorityFilter('ALL'); setCategoryFilter('ALL'); setSearch(''); setPage(1); }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-[#E51F3E] hover:bg-rose-50 transition"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {total > 0 && (
          <p className="text-[11px] text-slate-400">
            Showing {inquiries.length} of {total} inquiries
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Inquiry ID', 'Name', 'Email', 'Mobile', 'Category', 'Priority', 'Status', 'Submitted', 'Actions'].map(
                  (col) => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Inbox className="w-10 h-10 text-slate-300" />
                      <p className="text-sm font-medium">No inquiries found</p>
                      <p className="text-xs">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                inquiries.map((inq) => (
                  <tr key={inq._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-slate-700">{inq.inquiryId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-800 max-w-[100px] truncate">{inq.name}</span>
                        {inq.userType === 'REGISTERED_MEMBER' && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold shrink-0">M</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[140px] truncate">{inq.email}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{inq.mobileNumber}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-600">{formatLabel(inq.category)}</span>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={inq.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={inq.status} /></td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(inq.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedInquiry(inq)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#E51F3E]/10 hover:text-[#E51F3E] text-slate-600 transition"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(inq._id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition"
                          title="Delete Inquiry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-2">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onUpdated={handleInquiryUpdated}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Inquiry</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action is permanent and will be audit logged.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700">Are you sure you want to permanently delete this inquiry? All data including replies and notes will be lost.</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#E51F3E] hover:bg-[#d11735] text-white text-xs font-bold transition disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
