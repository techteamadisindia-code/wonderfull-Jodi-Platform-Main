'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  HeartHandshake,
  Heart,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import {
  fetchAdminInterests,
  updateAdminInterestStatus,
  InterestItem,
} from '../../../services/activityApi';

export default function AdminInterestsPage() {
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter, Search, Pagination state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [counts, setCounts] = useState({
    ALL: 0,
    PENDING: 0,
    ACCEPTED: 0,
    DECLINED: 0,
  });

  // Action dropdown popover tracking & confirmation modal
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    interestId: string;
    targetStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    senderName: string;
    recipientName: string;
  } | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpenId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Debounce search input by 300ms
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

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // Main Data Loader from Backend API
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const response = await fetchAdminInterests({
        page,
        limit: pageSize,
        status: statusFilter,
        search: debouncedSearch,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      setInterests(response.interests || []);
      setPagination(
        response.pagination || {
          page,
          limit: pageSize,
          total: response.interests?.length || 0,
          totalPages: 1,
        }
      );
      if (response.counts) {
        setCounts(response.counts);
      }
    } catch (err: any) {
      console.error('Failed to load interests:', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to load matchmaking interests from server.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [page, pageSize, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Tab Switch
  const handleTabChange = (tabKey: string) => {
    setStatusFilter(tabKey);
    setPage(1);
  };

  // Status Action Trigger (Opens Confirmation Modal)
  const promptStatusUpdate = (
    e: React.MouseEvent,
    interestId: string,
    targetStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED',
    senderName: string,
    recipientName: string
  ) => {
    e.stopPropagation();
    setActionMenuOpenId(null);
    setConfirmModal({
      interestId,
      targetStatus,
      senderName,
      recipientName,
    });
  };

  // Confirm Status Update & Call Real Backend
  const executeStatusUpdate = async () => {
    if (!confirmModal) return;
    const { interestId, targetStatus } = confirmModal;

    setUpdatingId(interestId);
    setConfirmModal(null);

    try {
      const res = await updateAdminInterestStatus(interestId, targetStatus);
      if (res.success) {
        setNotification({
          message: res.message || `Interest status successfully updated to ${targetStatus}`,
          type: 'success',
        });

        // Optimistically update list and silently refetch counts & data from backend
        setInterests((prev) =>
          prev.map((item) =>
            item._id === interestId ? { ...item, status: targetStatus } : item
          )
        );
        loadData(true);
      }
    } catch (err: any) {
      console.error('Failed to update interest status:', err);
      setNotification({
        message: err?.response?.data?.message || 'Failed to update interest status. Please try again.',
        type: 'error',
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap"
            title="Interest Accepted by Recipient"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>ACCEPTED</span>
          </span>
        );
      case 'DECLINED':
      case 'REJECTED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap"
            title="Interest Declined"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>DECLINED</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs whitespace-nowrap"
            title="Awaiting Recipient Response"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-fade-in transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.targetStatus === 'ACCEPTED'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : confirmModal.targetStatus === 'DECLINED'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                {confirmModal.targetStatus === 'ACCEPTED' ? (
                  <Check className="w-5 h-5" />
                ) : confirmModal.targetStatus === 'DECLINED' ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Change Interest Status?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to update this matchmaking interest between{' '}
                  <strong className="text-slate-800">{confirmModal.senderName}</strong> and{' '}
                  <strong className="text-slate-800">{confirmModal.recipientName}</strong> to{' '}
                  <span
                    className={`font-bold uppercase ${
                      confirmModal.targetStatus === 'ACCEPTED'
                        ? 'text-emerald-600'
                        : confirmModal.targetStatus === 'DECLINED'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {confirmModal.targetStatus}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeStatusUpdate}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition active:scale-95 ${
                  confirmModal.targetStatus === 'ACCEPTED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : confirmModal.targetStatus === 'DECLINED'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header (No duplicate breadcrumb) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Matchmaking Interests Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor interest requests, introductions, and mutual acceptance rates across doctor profiles
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Refresh interests feed from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : 'text-slate-500'}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Filter + Search Toolbar (Compact layout) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shrink-0">
            {[
              { key: 'ALL', label: 'All Interests', count: counts.ALL },
              { key: 'PENDING', label: 'Pending', count: counts.PENDING },
              { key: 'ACCEPTED', label: 'Accepted', count: counts.ACCEPTED },
              { key: 'DECLINED', label: 'Declined', count: counts.DECLINED },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition active:scale-95 ${
                    isActive
                      ? 'bg-[#0B1120] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by sender, recipient, email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-8.5 pl-8.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-sm font-bold"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Interests Table (Natural height, no excessive blank space) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-visible">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-4 sm:px-5 w-[27%] min-w-[210px]">Sender Profile</th>
                <th className="py-3 px-3 w-[10%] min-w-[80px] text-center">Direction</th>
                <th className="py-3 px-4 sm:px-5 w-[25%] min-w-[190px]">Recipient Profile</th>
                <th className="py-3 px-4 w-[17%] min-w-[130px]">Interest Status</th>
                <th className="py-3 px-4 w-[15%] min-w-[120px]">Date Sent</th>
                <th className="py-3 px-3 w-[6%] min-w-[60px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Compact Skeleton loading state
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-24 bg-slate-200 rounded" />
                          <div className="h-3 w-32 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 mx-auto" />
                    </td>
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-24 bg-slate-200 rounded" />
                          <div className="h-3 w-32 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-6 w-20 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-24 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="w-6 h-6 rounded bg-slate-200 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : interests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-11 h-11 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto mb-2.5 border border-rose-100">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">
                      {debouncedSearch
                        ? 'No match interests found matching your search'
                        : 'No interest requests recorded matching this filter'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                      {debouncedSearch
                        ? 'Try modifying your search keywords or clearing the search.'
                        : 'When members express interest in other doctor profiles, they will appear in this real-time log.'}
                    </p>
                    {debouncedSearch && (
                      <button
                        onClick={handleClearSearch}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Search</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                interests.map((item) => {
                  const recipientObj = item.recipient || item.receiver;
                  const senderName = item.sender?.displayName || item.sender?.fullName || 'Sender User';
                  const recipientName = recipientObj?.displayName || recipientObj?.fullName || 'Doctor User';
                  const isUpdating = updatingId === item._id;

                  const dateObj = new Date(item.createdAt);
                  const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/75 transition-colors group"
                    >
                      {/* 1. SENDER PROFILE (27%) */}
                      <td className="py-3 px-4 sm:px-5 align-middle">
                        <div className="flex items-center gap-3">
                          {/* Sender Avatar */}
                          <div className="relative shrink-0">
                            {item.sender?.primaryPhoto ? (
                              <img
                                src={item.sender.primaryPhoto}
                                alt={senderName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200/90 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-100 via-rose-50 to-red-100 text-[#E51F3E] flex items-center justify-center font-bold text-xs border border-rose-200/60 shadow-2xs">
                                {senderName.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                            )}
                          </div>

                          {/* Sender Details */}
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[180px]"
                              title={senderName}
                            >
                              {senderName}
                            </p>
                            <p
                              className="text-[11px] text-slate-500 truncate max-w-[180px]"
                              title={item.sender?.email}
                            >
                              {item.sender?.email || 'No email provided'}
                            </p>
                            {(item.sender?.profession || item.sender?.city) && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                                {item.sender?.profession}
                                {item.sender?.city ? ` • ${item.sender.city}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. DIRECTION (10% Centered) */}
                      <td className="py-3 px-3 align-middle text-center">
                        <div
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-50 border border-rose-200/80 text-[#E51F3E] shadow-2xs group-hover:scale-105 transition-transform"
                          title="Interest Sent"
                        >
                          <Heart className="w-4 h-4 fill-[#E51F3E] text-[#E51F3E]" />
                        </div>
                      </td>

                      {/* 3. RECIPIENT PROFILE (25%) */}
                      <td className="py-3 px-4 sm:px-5 align-middle">
                        <div className="flex items-center gap-3">
                          {/* Recipient Avatar */}
                          <div className="relative shrink-0">
                            {recipientObj?.primaryPhoto ? (
                              <img
                                src={recipientObj.primaryPhoto}
                                alt={recipientName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200/90 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 shadow-2xs">
                                {recipientName.charAt(0)?.toUpperCase() || 'R'}
                              </div>
                            )}
                          </div>

                          {/* Recipient Details */}
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[180px]"
                              title={recipientName}
                            >
                              {recipientName}
                            </p>
                            <p
                              className="text-[11px] text-slate-500 truncate max-w-[180px]"
                              title={recipientObj?.email}
                            >
                              {recipientObj?.email || 'Registered Member'}
                            </p>
                            {(recipientObj?.profession || recipientObj?.city) && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                                {recipientObj?.profession}
                                {recipientObj?.city ? ` • ${recipientObj.city}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. INTEREST STATUS (17%) */}
                      <td className="py-3 px-4 align-middle">
                        {isUpdating ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E51F3E]" />
                            <span>Updating...</span>
                          </span>
                        ) : (
                          renderStatusBadge(item.status)
                        )}
                      </td>

                      {/* 5. DATE SENT (15%) */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs">
                            {formattedDate}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formattedTime}
                          </span>
                        </div>
                      </td>

                      {/* 6. ACTIONS (6%) */}
                      <td className="py-3 px-3 align-middle text-right">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId(
                                actionMenuOpenId === item._id ? null : item._id
                              );
                            }}
                            disabled={isUpdating}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                            title="Status Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Relative Action Dropdown */}
                          {actionMenuOpenId === item._id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 animate-scale-up"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                Set Status
                              </div>

                              {item.status !== 'ACCEPTED' && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    promptStatusUpdate(
                                      e,
                                      item._id,
                                      'ACCEPTED',
                                      senderName,
                                      recipientName
                                    )
                                  }
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Accept</span>
                                </button>
                              )}

                              {item.status !== 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    promptStatusUpdate(
                                      e,
                                      item._id,
                                      'PENDING',
                                      senderName,
                                      recipientName
                                    )
                                  }
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Set Pending</span>
                                </button>
                              )}

                              {item.status !== 'DECLINED' && item.status !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    promptStatusUpdate(
                                      e,
                                      item._id,
                                      'DECLINED',
                                      senderName,
                                      recipientName
                                    )
                                  }
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Decline</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Real Pagination */}
        <div className="p-3 sm:p-3.5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {pagination.total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(page * pageSize, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{pagination.total}</span> entries
            {statusFilter !== 'ALL' && (
              <>
                {' '}filtered by <span className="font-semibold text-slate-800">{statusFilter}</span>
              </>
            )}
          </div>

          {/* Pagination Navigation (Only if > 1 page) */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              {Array.from({ length: pagination.totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  pageNum === 1 ||
                  pageNum === pagination.totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition ${
                        page === pageNum
                          ? 'bg-[#0B1120] text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span key={pageNum} className="text-slate-400 px-1">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
