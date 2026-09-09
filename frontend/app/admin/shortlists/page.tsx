'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Bookmark,
  RefreshCw,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  User,
  Star,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  Trash2,
  Eye,
  X,
  Building2,
  Calendar,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';
import {
  fetchAdminShortlists,
  deleteAdminShortlist,
  ShortlistItem,
} from '../../../services/activityApi';

export default function AdminShortlistsPage() {
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedProfession, setSelectedProfession] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [filterOptions, setFilterOptions] = useState<{
    professions: string[];
    cities: string[];
    religions: string[];
  }>({
    professions: [],
    cities: [],
    religions: [],
  });

  const [stats, setStats] = useState<{ totalShortlists: number }>({
    totalShortlists: 0,
  });

  // Modals state
  const [selectedProfileForModal, setSelectedProfileForModal] = useState<ShortlistItem['shortlistedProfile'] | null>(
    null
  );
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    id: string;
    userName: string;
    profileName: string;
  } | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss toast after 4s
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

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedProfession('ALL');
    setSelectedCity('ALL');
    setSelectedCommunity('ALL');
    setSelectedVerification('ALL');
    setFromDate('');
    setToDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch !== '' ||
    selectedProfession !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedCommunity !== 'ALL' ||
    selectedVerification !== 'ALL' ||
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
        const response = await fetchAdminShortlists({
          page,
          limit: pageSize,
          search: debouncedSearch,
          profession: selectedProfession,
          city: selectedCity,
          community: selectedCommunity,
          verification: selectedVerification,
          from: fromDate || undefined,
          to: toDate || undefined,
          sortBy,
          sortOrder,
        });

        setShortlists(response.shortlists || []);
        setPagination(response.pagination);
        if (response.filters?.professions?.length) {
          setFilterOptions(response.filters);
        }
        if (response.stats) {
          setStats(response.stats);
        }
      } catch (err: any) {
        console.error('Failed to load shortlists:', err);
        setError(err?.response?.data?.message || 'Unable to load shortlisted profiles. Please check server connection.');
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      pageSize,
      debouncedSearch,
      selectedProfession,
      selectedCity,
      selectedCommunity,
      selectedVerification,
      fromDate,
      toDate,
      sortBy,
      sortOrder,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Remove Shortlist
  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    const { id, profileName, userName } = deleteConfirmModal;
    setDeletingId(id);

    try {
      await deleteAdminShortlist(id);
      setToast({
        message: `Successfully removed ${profileName} from ${userName}'s shortlist`,
        type: 'success',
      });
      setDeleteConfirmModal(null);
      loadData(true);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Failed to remove shortlist bookmark.',
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Age Calculator helper
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <Bookmark className="w-4.5 h-4.5 fill-white stroke-none" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Profile Shortlists Tracker
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time monitor of saved profiles and shortlisted matrimonial candidates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Total Bookmarks:</span>
            <span className="font-bold text-slate-900">{stats.totalShortlists}</span>
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            title="Reload live shortlists from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Search Line */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by bookmarker name, email, phone, shortlisted profile, profession or city..."
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
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-[#E51F3E] text-xs font-semibold border border-slate-200 transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 border-t border-slate-100">
          {/* Profession */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Profession</label>
            <select
              value={selectedProfession}
              onChange={(e) => {
                setSelectedProfession(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            >
              <option value="ALL">All Professions</option>
              {filterOptions.professions.map((prof) => (
                <option key={prof} value={prof}>
                  {prof}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">City</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            >
              <option value="ALL">All Cities</option>
              {filterOptions.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Community / Religion */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Community</label>
            <select
              value={selectedCommunity}
              onChange={(e) => {
                setSelectedCommunity(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            >
              <option value="ALL">All Communities</option>
              {filterOptions.religions.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Verification</label>
            <select
              value={selectedVerification}
              onChange={(e) => {
                setSelectedVerification(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-[#E51F3E] focus:bg-white transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="REJECTED">Rejected</option>
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
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
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
                <th className="py-3.5 px-5 w-[24%]">Bookmarked By User</th>
                <th className="py-3.5 px-5 w-[26%]">Shortlisted Profile</th>
                <th className="py-3.5 px-5 w-[22%]">Profession & City</th>
                <th className="py-3.5 px-5 w-[14%]">Community</th>
                <th className="py-3.5 px-5 w-[14%]">Bookmark Date</th>
                <th className="py-3.5 px-5 text-right w-[10%]">Actions</th>
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
                          <div className="h-2.5 bg-slate-100 rounded w-36" />
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
                      <div className="h-3.5 bg-slate-200 rounded w-32" />
                      <div className="h-2.5 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-3.5 bg-slate-200 rounded w-20" />
                    </td>
                    <td className="py-4 px-5 space-y-1">
                      <div className="h-3.5 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-7 w-16 bg-slate-200 rounded-lg inline-block" />
                    </td>
                  </tr>
                ))
              ) : shortlists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-[#E51F3E] mb-3 shadow-xs">
                      <Bookmark className="w-6 h-6 stroke-1.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No shortlisted profiles found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'No shortlisted bookmarks match your active search and filter criteria.'
                        : 'No profiles have been shortlisted yet by platform users.'}
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
                shortlists.map((item) => {
                  const bookmarker = item.user;
                  const profile = item.shortlistedProfile;
                  const age = calculateAge(profile?.dob);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition group">
                      {/* 1. Bookmarked By User */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {bookmarker?.photo ? (
                            <img
                              src={bookmarker.photo}
                              alt={bookmarker.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                              {bookmarker?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">
                                {bookmarker?.fullName || 'Anonymous User'}
                              </span>
                              {bookmarker?.verificationStatus === 'VERIFIED' && (
                                <span title="Verified User">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{bookmarker?.email || 'No email'}</p>
                            {bookmarker?.mobile && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{bookmarker.mobile}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Shortlisted Profile */}
                      <td className="py-3.5 px-5">
                        {profile ? (
                          <div
                            onClick={() => setSelectedProfileForModal(profile)}
                            className="flex items-center gap-3 cursor-pointer group-hover:text-[#E51F3E] transition"
                            title="Click to view complete profile details"
                          >
                            {profile.primaryPhoto ? (
                              <img
                                src={profile.primaryPhoto}
                                alt={profile.displayName}
                                className="w-10 h-10 rounded-xl object-cover border border-rose-100 shadow-xs shrink-0 group-hover:scale-105 transition"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-50 to-pink-50 border border-rose-100 flex items-center justify-center text-[#E51F3E] font-bold text-sm shrink-0">
                                {profile.displayName?.charAt(0) || 'P'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 group-hover:text-[#E51F3E] transition truncate">
                                  {profile.displayName}
                                </span>
                                {profile.verificationStatus === 'VERIFIED' && (
                                  <span title="Verified Matrimonial Profile">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {profile.gender || 'Profile'} {age ? `• ${age} yrs` : ''}
                              </p>
                              {profile.education && (
                                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <GraduationCap className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{profile.education}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Profile no longer active</span>
                        )}
                      </td>

                      {/* 3. Profession & City */}
                      <td className="py-3.5 px-5">
                        {profile ? (
                          <div>
                            <p className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{profile.profession || 'Not specified'}</span>
                            </p>
                            {profile.company && (
                              <p className="text-[11px] text-slate-500 truncate pl-5">{profile.company}</p>
                            )}
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 pl-5 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {profile.city}
                                {profile.state ? `, ${profile.state}` : ''}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 4. Community */}
                      <td className="py-3.5 px-5 text-slate-700">
                        {profile ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-800">
                              {profile.religion || 'Not specified'}
                            </span>
                            {profile.caste && (
                              <p className="text-[11px] text-slate-500 mt-1 truncate">{profile.caste}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 5. Bookmark Date */}
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-slate-800">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </p>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {profile && (
                            <button
                              onClick={() => setSelectedProfileForModal(profile)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs"
                              title="View Full Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setDeleteConfirmModal({
                                id: item._id,
                                userName: bookmarker?.fullName || 'User',
                                profileName: profile?.displayName || 'Profile',
                              })
                            }
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 transition shadow-2xs cursor-pointer"
                            title="Remove Shortlist Bookmark"
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

        {/* Pagination Footer */}
        {!loading && pagination.total > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(page * pageSize, pagination.total)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{pagination.total}</span> shortlisted profiles
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

      {/* ── MODAL: Profile Details ── */}
      {selectedProfileForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-rose-100 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-t-3xl flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white font-bold shadow-md">
                  <Star className="w-5 h-5 fill-white stroke-none" />
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

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Photo & Key Stats */}
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
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Annual Income</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{selectedProfileForModal.annualIncome || 'Confidential'}</span>
                  </div>
                </div>
              </div>

              {/* Additional Photos */}
              {selectedProfileForModal.photos && selectedProfileForModal.photos.length > 1 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Profile Gallery</h4>
                  <div className="flex gap-2.5 overflow-x-auto pb-2">
                    {selectedProfileForModal.photos.map((photo, pIdx) => (
                      <img
                        key={pIdx}
                        src={photo}
                        alt={`Photo ${pIdx + 1}`}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* About Section */}
              {selectedProfileForModal.about && (
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs space-y-1">
                  <h4 className="font-bold text-rose-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#E51F3E]" />
                    <span>About Candidate</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed">{selectedProfileForModal.about}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
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

      {/* ── MODAL: Delete Shortlist Confirmation ── */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-[#E51F3E] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">Remove Shortlist Bookmark?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800">{deleteConfirmModal.profileName}</strong> from{' '}
                <strong className="text-slate-800">{deleteConfirmModal.userName}</strong>&apos;s shortlist?
              </p>
              <p className="text-[11px] text-slate-400">
                This only removes the bookmark relationship. The user account and profile remain intact.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Remove Bookmark</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
