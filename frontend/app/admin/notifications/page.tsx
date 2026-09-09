'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Eye,
  X,
  Radio,
  ExternalLink,
  ShieldCheck,
  Crown,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Bell,
  Trash2,
} from 'lucide-react';
import {
  fetchAdminBroadcasts,
  fetchBroadcastDetails,
  fetchRecipientCount,
  searchUsersForBroadcast,
  sendBroadcastNotification,
  deleteAdminBroadcast,
  AdminBroadcastItem,
} from '../../../services/adminApi';

const CATEGORY_TYPES = [
  { value: 'SYSTEM', label: 'System Notice (Informational)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'ANNOUNCEMENT', label: 'General Announcement', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'PROMOTION', label: 'Special Offer / Promotion', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'MEMBERSHIP', label: 'Membership Plan Update', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'VERIFICATION', label: 'KYC & Verification Reminder', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'SECURITY', label: 'Security & Privacy Alert', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'MAINTENANCE', label: 'Scheduled Maintenance Notice', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

const TARGET_OPTIONS = [
  { value: 'ALL_USERS', label: 'All Users (Everyone)', icon: Users, desc: 'All registered matrimonial users' },
  { value: 'ACTIVE_USERS', label: 'Active Users Only', icon: UserCheck, desc: 'Users with active accounts' },
  { value: 'INACTIVE_USERS', label: 'Inactive Users Only', icon: UserX, desc: 'Accounts currently inactive' },
  { value: 'VERIFIED_USERS', label: 'Verified Profiles', icon: ShieldCheck, desc: '100% KYC verified members' },
  { value: 'PREMIUM_USERS', label: 'Premium Members', icon: Crown, desc: 'Active VIP / Paid subscribers' },
  { value: 'SELECTED_USERS', label: 'Selected Users (Search & Pick)', icon: Radio, desc: 'Specific target accounts' },
];

export default function AdminNotificationsPage() {
  // Broadcast history state
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [filterType, setFilterType] = useState('ALL');
  const [filterTarget, setFilterTarget] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Compose form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SYSTEM');
  const [targetType, setTargetType] = useState('ALL_USERS');
  const [actionUrl, setActionUrl] = useState('/membership');
  const [selectedUsers, setSelectedUsers] = useState<Array<{ _id: string; fullName: string; email: string }>>([]);

  // User search picker state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmRecipientCount, setConfirmRecipientCount] = useState<number | null>(null);
  const [calculatingCount, setCalculatingCount] = useState(false);
  const [sending, setSending] = useState(false);

  // Detail Modal state
  const [selectedBroadcast, setSelectedBroadcast] = useState<AdminBroadcastItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Alert/Toast notices
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load broadcasts
  const loadBroadcastHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminBroadcasts({
        page,
        limit,
        type: filterType,
        targetType: filterTarget,
        search: debouncedSearch,
      });
      setBroadcasts(res.broadcasts || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load broadcasts history:', err);
      setNotice({ type: 'error', message: 'Failed to load broadcast history. Please refresh.' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterType, filterTarget, debouncedSearch]);

  useEffect(() => {
    loadBroadcastHistory();
  }, [loadBroadcastHistory]);

  // Search users for "SELECTED_USERS"
  useEffect(() => {
    if (!userSearchQuery.trim() || targetType !== 'SELECTED_USERS') {
      setUserSearchResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await searchUsersForBroadcast(userSearchQuery);
        setUserSearchResults(results || []);
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [userSearchQuery, targetType]);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: any) => {
    if (!selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, { _id: user._id, fullName: user.fullName, email: user.email }]);
    }
    setUserSearchQuery('');
    setShowUserDropdown(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  // Open confirmation modal with dynamic backend recipient calculation
  const handleOpenConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setNotice({ type: 'error', message: 'Title and message are required' });
      return;
    }
    if (targetType === 'SELECTED_USERS' && selectedUsers.length === 0) {
      setNotice({ type: 'error', message: 'Please search and select at least one recipient user' });
      return;
    }

    setShowConfirmModal(true);
    setCalculatingCount(true);
    try {
      const targetUserIds = targetType === 'SELECTED_USERS' ? selectedUsers.map((u) => u._id) : undefined;
      const count = await fetchRecipientCount(targetType, targetUserIds);
      setConfirmRecipientCount(count);
    } catch (err) {
      console.error('Failed to calculate recipients:', err);
      setConfirmRecipientCount(null);
    } finally {
      setCalculatingCount(false);
    }
  };

  // Execute broadcast
  const handleConfirmSend = async () => {
    setSending(true);
    try {
      const targetUserIds = targetType === 'SELECTED_USERS' ? selectedUsers.map((u) => u._id) : undefined;
      const res = await sendBroadcastNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        targetType,
        targetUserIds,
        actionUrl: actionUrl.trim() || undefined,
      });

      setShowConfirmModal(false);
      setNotice({
        type: 'success',
        message: res.message || `Notification broadcasted successfully to ${res.data?.totalRecipients ?? 'all'} recipients!`,
      });

      // Clear form
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      setUserSearchQuery('');

      // Refresh list
      setPage(1);
      loadBroadcastHistory();

      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      console.error('Broadcast execution error:', err);
      const errMsg = err?.response?.data?.message || 'Failed to dispatch notification broadcast. Please try again.';
      setNotice({ type: 'error', message: errMsg });
    } finally {
      setSending(false);
    }
  };

  // View broadcast details
  const handleViewDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const data = await fetchBroadcastDetails(id);
      setSelectedBroadcast(data);
    } catch (err) {
      console.error('Failed to fetch broadcast details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Delete broadcast record
  const handleDeleteBroadcast = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this broadcast log record?')) return;
    try {
      await deleteAdminBroadcast(id);
      setNotice({ type: 'success', message: 'Broadcast record deleted successfully' });
      if (selectedBroadcast?._id === id) {
        setSelectedBroadcast(null);
      }
      loadBroadcastHistory();
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Delete failed:', err);
      setNotice({ type: 'error', message: 'Failed to delete broadcast record' });
    }
  };

  const currentCategory = CATEGORY_TYPES.find((c) => c.value === type) || CATEGORY_TYPES[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Alert Notices */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-xs animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-500 hover:text-slate-900 text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-red-100 text-[#E51F3E] flex items-center justify-center font-bold">
              <Bell className="w-4.5 h-4.5" />
            </span>
            <span>Broadcast Announcements & Alerts</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Send real-time system alerts, membership promotions, and safety updates to targeted matrimonial users
          </p>
        </div>
        <button
          onClick={loadBroadcastHistory}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Two-Column Grid: Compose Broadcast | Sent Notifications Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN: Compose Broadcast (~38% width on desktop) ── */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#E51F3E] border border-rose-100 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Compose Broadcast</h3>
              <p className="text-[11px] text-slate-500">Targets and notifies members instantly</p>
            </div>
          </div>

          <form onSubmit={handleOpenConfirm} className="space-y-4 text-xs">
            {/* Announcement Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700">Announcement Title</label>
                <span className="text-[10.5px] text-slate-400 font-medium">
                  {title.length}/150
                </span>
              </div>
              <input
                type="text"
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Festival Special: 20% Off on Premium VIP"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                required
              />
            </div>

            {/* Category Type */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Category Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              >
                {CATEGORY_TYPES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Send To Target */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Send To (Target Audience)</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              >
                {TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {TARGET_OPTIONS.find((t) => t.value === targetType)?.desc}
              </p>
            </div>

            {/* Searchable User Selector (Only when SELECTED_USERS is active) */}
            {targetType === 'SELECTED_USERS' && (
              <div className="space-y-2 p-3.5 bg-rose-50/50 border border-rose-200/80 rounded-xl" ref={userSearchRef}>
                <label className="block font-semibold text-slate-800">
                  Search & Select Recipients <span className="text-[#E51F3E]">*</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Search by name, email, mobile, or ID..."
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  {searchingUsers && (
                    <RefreshCw className="w-3 h-3 text-[#E51F3E] animate-spin absolute right-3 top-2.5" />
                  )}

                  {/* Dropdown Suggestions */}
                  {showUserDropdown && userSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                      {userSearchResults.map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full p-2.5 text-left hover:bg-rose-50 flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{user.fullName}</span>
                            <span className="text-[10.5px] text-slate-500">{user.email} • {user.mobile}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                            {user.verificationStatus}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected User Chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedUsers.map((u) => (
                      <span
                        key={u._id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-rose-300 text-slate-800 text-[11px] font-medium shadow-2xs"
                      >
                        <span>{u.fullName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(u._id)}
                          className="text-slate-400 hover:text-red-600 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {selectedUsers.length === 0 && (
                  <p className="text-[10.5px] text-rose-700">No users selected yet. Search above to add recipients.</p>
                )}
              </div>
            )}

            {/* Notification Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700">Notification Message</label>
                <span className="text-[10.5px] text-slate-400 font-medium">
                  {message.length}/2000
                </span>
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your platform announcement message here..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                required
              />
            </div>

            {/* Action Target Link */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Action Target Link (Optional)
              </label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="e.g. /membership, /search, /profile"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Live Preview Card */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-2 flex items-center gap-1.5 text-[11.5px]">
                <Sparkles className="w-3.5 h-3.5 text-[#E51F3E]" />
                <span>Live Notification Preview</span>
              </label>
              <div className="p-3.5 rounded-xl bg-[#FFFDFB] border border-rose-200/70 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${currentCategory.color}`}>
                    {currentCategory.value}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Just now</span>
                </div>
                <h4 className="font-serif font-bold text-slate-900 text-xs">
                  {title || 'Announcement Title Preview'}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {message || 'Write a message above to see how it will appear to your members.'}
                </p>
                {actionUrl && (
                  <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-[#E51F3E]">
                    <span>View Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] hover:shadow-md hover:shadow-red-600/25 transition disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Notification</span>
            </button>
          </form>
        </div>

        {/* ── RIGHT COLUMN: Sent Notifications Log (~62% width on desktop) ── */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* Header & Filter Controls */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/60 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Sent Notifications Log</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold">
                  {total}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search broadcasts..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORY_TYPES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Filter */}
              <div>
                <select
                  value={filterTarget}
                  onChange={(e) => {
                    setFilterTarget(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Target Audiences</option>
                  {TARGET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Title & Details</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Target & Delivery</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Sent Date</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                      <span>Loading notification records...</span>
                    </td>
                  </tr>
                ) : broadcasts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">No broadcast notifications found.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Compose your first announcement using the form on the left.
                      </p>
                    </td>
                  </tr>
                ) : (
                  broadcasts.map((item) => {
                    const catMeta = CATEGORY_TYPES.find((c) => c.value === item.type) || CATEGORY_TYPES[0];
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        {/* Title & snippet */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <span className="font-bold text-slate-900 block truncate" title={item.title}>
                            {item.title}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1" title={item.message}>
                            {item.message}
                          </p>
                        </td>

                        {/* Category Type */}
                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${catMeta.color}`}>
                            {item.type}
                          </span>
                        </td>

                        {/* Target & Delivery */}
                        <td className="py-3.5 px-3 text-slate-700">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {item.targetType?.replace('_', ' ')}
                          </span>
                          <span className="text-[10.5px] text-slate-500">
                            {item.totalRecipients?.toLocaleString() ?? 0} sent • {item.readCount ?? 0} read
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              item.status === 'SENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status || 'SENT'}
                          </span>
                        </td>

                        {/* Sent Date */}
                        <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewDetails(item._id)}
                              title="View Broadcast Details"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#E51F3E] hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBroadcast(item._id)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-[#E51F3E] flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirm Broadcast Dispatch</h3>
                  <p className="text-xs text-slate-500">Please review recipient count before sending</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={sending}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Count Stat Box */}
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-center space-y-1">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">
                Target Audience: {targetType.replace('_', ' ')}
              </span>
              <div className="text-2xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
                {calculatingCount ? (
                  <RefreshCw className="w-5 h-5 text-[#E51F3E] animate-spin" />
                ) : (
                  <span>{confirmRecipientCount?.toLocaleString() ?? 0} Eligible Users</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Calculated directly from the active MongoDB user directory
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="font-semibold text-slate-500 block">Title:</span>
                <span className="font-bold text-slate-900">{title}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 block">Message Preview:</span>
                <p className="text-slate-700 line-clamp-3">{message}</p>
              </div>
              {actionUrl && (
                <div>
                  <span className="font-semibold text-slate-500 block">Action Link:</span>
                  <span className="text-[#E51F3E] font-medium">{actionUrl}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={sending}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={sending || calculatingCount}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#CC1432] text-xs font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Notification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BROADCAST DETAILS MODAL ── */}
      {selectedBroadcast && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#E51F3E]" />
                <h3 className="text-base font-bold text-slate-900">Broadcast Notification Details</h3>
              </div>
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] uppercase font-bold block mb-0.5">Title</span>
                <p className="font-bold text-slate-900 text-sm">{selectedBroadcast.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Type</span>
                  <span className="font-semibold text-slate-800">{selectedBroadcast.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Target Audience</span>
                  <span className="font-semibold text-slate-800">{selectedBroadcast.targetType?.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Total Recipients</span>
                  <span className="font-bold text-slate-900">{selectedBroadcast.totalRecipients?.toLocaleString() ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Read Count</span>
                  <span className="font-bold text-emerald-600">{selectedBroadcast.readCount ?? 0}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] uppercase font-bold block mb-0.5">Notification Message</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedBroadcast.message}
                </div>
              </div>

              {selectedBroadcast.actionUrl && (
                <div>
                  <span className="text-slate-400 text-[11px] uppercase font-bold block mb-0.5">Action Target Link</span>
                  <a
                    href={selectedBroadcast.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#E51F3E] font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <span>{selectedBroadcast.actionUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                <span>
                  Sent by: {selectedBroadcast.createdBy?.fullName || selectedBroadcast.createdBy?.email || 'Admin'}
                </span>
                <span>
                  {selectedBroadcast.createdAt &&
                    new Date(selectedBroadcast.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
