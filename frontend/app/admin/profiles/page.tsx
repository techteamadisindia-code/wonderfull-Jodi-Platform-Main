'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Eye,
  Edit2,
  RefreshCw,
  X,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Heart,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  User,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Building,
} from 'lucide-react';
import {
  fetchProfiles,
  fetchProfileById,
  updateProfile,
  AdminProfileItem,
} from '../../../services/profileApi';
import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  validateDateOfBirth,
  validateMedicalQualification,
} from '../../../lib/doctorConstants';
import { DobInput } from '../../../components/DobInput';

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<AdminProfileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [religionFilter, setReligionFilter] = useState('');
  const [verifFilter, setVerifFilter] = useState('');

  // Profile Viewer / Editor Modal State
  const [selectedProfile, setSelectedProfile] = useState<AdminProfileItem | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [editingProfile, setEditingProfile] = useState<AdminProfileItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await fetchProfiles({
        search: search.trim() || undefined,
        gender: genderFilter || undefined,
        religion: religionFilter || undefined,
        verificationStatus: verifFilter || undefined,
        page,
        limit: 12,
      });
      setProfiles(data?.profiles || []);
      setTotal(data?.total || 0);
      setPages(data?.pages || 1);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [page, search, genderFilter, religionFilter, verifFilter]);

  // When selectedProfile changes, reset active photo index
  useEffect(() => {
    setActivePhotoIdx(0);
  }, [selectedProfile]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setGenderFilter('');
    setReligionFilter('');
    setVerifFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || genderFilter || religionFilter || verifFilter);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    if (editingProfile.dob) {
      const dobCheck = validateDateOfBirth(editingProfile.dob);
      if (!dobCheck.isValid) {
        setNotice({ type: 'error', message: dobCheck.error || 'Date of birth year must be exactly 4 digits.' });
        return;
      }
    }

    const qual = editingProfile.education || editingProfile.degree;
    if (qual) {
      const qualCheck = validateMedicalQualification(qual);
      if (!qualCheck.isValid) {
        setNotice({ type: 'error', message: qualCheck.error || 'Please select a valid medical/doctor qualification.' });
        return;
      }
    }

    setSaveLoading(true);
    try {
      const updated = await updateProfile(editingProfile._id, editingProfile);
      setProfiles((prev) =>
        prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p))
      );
      if (selectedProfile?._id === updated._id) {
        setSelectedProfile((prev) => (prev ? { ...prev, ...updated } : null));
      }
      setEditingProfile(null);
      setNotice({ type: 'success', message: `Profile for "${updated.displayName}" updated successfully!` });
      setTimeout(() => setNotice(null), 4500);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setNotice({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile. Please try again.',
      });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper for age calculation
  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const diffMs = Date.now() - new Date(dob).getTime();
    const ageDt = new Date(diffMs);
    const age = Math.abs(ageDt.getUTCFullYear() - 1970);
    return isNaN(age) ? null : age;
  };

  // Helper for KYC badge
  const renderKycBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap"
            title="KYC Verified Member"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>VERIFIED</span>
          </span>
        );
      case 'PENDING':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs whitespace-nowrap"
            title="KYC Document Pending Admin Review"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>PENDING</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap"
            title="KYC Document Rejected"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80 whitespace-nowrap"
            title="Unverified User"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>UNVERIFIED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="p-1 rounded hover:bg-slate-200/40 text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <span>Admin Console</span>
            <span>/</span>
            <span className="text-[#E51F3E]">Profiles Directory</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Matrimonial Profiles Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total <span className="font-semibold text-slate-700">{total}</span> doctor and professional matrimonial profiles published
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadProfiles}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Refresh directory data from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : 'text-slate-500'}`} />
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, profession, city, company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 pl-10 pr-24 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 h-7 px-3.5 rounded-lg bg-[#E51F3E] hover:bg-[#C81432] text-white text-xs font-bold transition shadow-xs shadow-red-500/20 active:scale-95 flex items-center justify-center"
            >
              Search
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] cursor-pointer transition"
            >
              <option value="">All Genders</option>
              <option value="Female">Female (Brides)</option>
              <option value="Male">Male (Grooms)</option>
            </select>

            <select
              value={religionFilter}
              onChange={(e) => {
                setReligionFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] cursor-pointer transition"
            >
              <option value="">All Religions</option>
              <option value="Hindu">Hindu</option>
              <option value="Muslim">Muslim</option>
              <option value="Sikh">Sikh</option>
              <option value="Christian">Christian</option>
              <option value="Jain">Jain</option>
              <option value="Parsi">Parsi</option>
              <option value="Buddhist">Buddhist</option>
            </select>

            <select
              value={verifFilter}
              onChange={(e) => {
                setVerifFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] cursor-pointer transition"
            >
              <option value="">All Verification</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="PENDING">Pending Review</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
                title="Reset all search filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-400 mr-1">Active filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/80 font-medium">
                Keyword: "{search}"
                <button
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                    setPage(1);
                  }}
                  className="hover:text-red-900"
                >
                  ×
                </button>
              </span>
            )}
            {genderFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Gender: {genderFilter}
                <button onClick={() => setGenderFilter('')} className="hover:text-slate-900">
                  ×
                </button>
              </span>
            )}
            {religionFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Religion: {religionFilter}
                <button onClick={() => setReligionFilter('')} className="hover:text-slate-900">
                  ×
                </button>
              </span>
            )}
            {verifFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                KYC: {verifFilter}
                <button onClick={() => setVerifFilter('')} className="hover:text-slate-900">
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Profiles Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <th className="py-3.5 px-4 sm:px-5 w-[28%] min-w-[220px]">Profile</th>
                <th className="py-3.5 px-4 sm:px-5 w-[22%] min-w-[190px]">Profession & Degree</th>
                <th className="py-3.5 px-4 sm:px-5 w-[14%] min-w-[130px]">Location</th>
                <th className="py-3.5 px-4 sm:px-5 w-[13%] min-w-[125px]">Community</th>
                <th className="py-3.5 px-4 sm:px-5 w-[11%] min-w-[110px]">Annual Income</th>
                <th className="py-3.5 px-4 sm:px-5 w-[12%] min-w-[115px] text-center">KYC Status</th>
                <th className="py-3.5 px-4 sm:px-5 w-[8%] min-w-[90px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#E51F3E] mb-3" />
                    <p className="font-semibold text-slate-700 text-sm">Loading profiles directory...</p>
                    <p className="text-xs text-slate-400 mt-0.5">Fetching latest records from database</p>
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">No matrimonial profiles found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Try clearing or adjusting your search filters to find matching profiles.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Clear All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => {
                  const age = calculateAge(profile.dob);
                  const isAccountActive = profile.user?.isActive !== false;

                  return (
                    <tr
                      key={profile._id}
                      className="hover:bg-slate-50/75 transition-colors group"
                    >
                      {/* 1. Profile Column */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <div className="flex items-center gap-3">
                          {/* Profile Avatar */}
                          <div className="relative shrink-0">
                            {profile.primaryPhoto ? (
                              <img
                                src={profile.primaryPhoto}
                                alt={profile.displayName}
                                className="w-11 h-11 rounded-full object-cover border border-slate-200/90 shadow-2xs"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-100 via-rose-50 to-red-100 text-[#E51F3E] flex items-center justify-center font-bold text-sm border border-rose-200/60 shadow-2xs">
                                {profile.displayName?.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                            )}

                            {/* User Active / Inactive Status Shield Indicator */}
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs"
                              title={isAccountActive ? 'Active User Account' : 'Account Suspended/Inactive'}
                            >
                              {isAccountActive ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 fill-rose-100" />
                              )}
                            </span>
                          </div>

                          {/* Profile Name, Age, Height */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[160px] group-hover:text-[#E51F3E] transition-colors cursor-pointer"
                                onClick={() => setSelectedProfile(profile)}
                                title={profile.displayName}
                              >
                                {profile.displayName}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {profile.gender}
                              {age ? ` • ${age} yrs` : ''}
                              {profile.height ? ` • ${profile.height}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Profession & Degree */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p
                          className="font-semibold text-slate-900 truncate max-w-[190px]"
                          title={profile.profession}
                        >
                          {profile.profession || 'Professional'}
                        </p>
                        <p
                          className="text-[11px] text-slate-500 truncate max-w-[190px] mt-0.5"
                          title={profile.degree || profile.education}
                        >
                          {profile.degree || profile.education || 'Education Details'}
                        </p>
                        {profile.company && (
                          <p
                            className="text-[10px] text-slate-400 truncate max-w-[190px]"
                            title={profile.company}
                          >
                            @ {profile.company}
                          </p>
                        )}
                      </td>

                      {/* 3. Location */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p
                          className="text-slate-800 font-medium truncate max-w-[130px]"
                          title={profile.city}
                        >
                          {profile.city || 'City'}
                        </p>
                        <p
                          className="text-[11px] text-slate-400 truncate max-w-[130px] mt-0.5"
                          title={profile.state || profile.country}
                        >
                          {profile.state ? `${profile.state}` : profile.country || 'India'}
                        </p>
                      </td>

                      {/* 4. Community */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <p
                          className="text-slate-800 font-medium truncate max-w-[125px]"
                          title={profile.religion}
                        >
                          {profile.religion || 'Religion'}
                        </p>
                        <p
                          className="text-[11px] text-slate-400 truncate max-w-[125px] mt-0.5"
                          title={profile.caste || profile.motherTongue}
                        >
                          {profile.caste || profile.motherTongue || '-'}
                        </p>
                      </td>

                      {/* 5. Annual Income */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle font-semibold text-slate-800 whitespace-nowrap">
                        <span className="text-slate-900 text-xs">
                          {profile.annualIncome || 'Confidential'}
                        </span>
                      </td>

                      {/* 6. KYC Status */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle text-center">
                        {renderKycBadge(profile.verificationStatus)}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-4 sm:px-5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setSelectedProfile(profile)}
                            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition flex items-center justify-center shadow-2xs active:scale-95"
                            title="View Profile Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingProfile({ ...profile })}
                            className="w-8 h-8 rounded-lg border border-red-200/80 bg-red-50/50 hover:bg-red-100/70 text-[#E51F3E] hover:text-[#C81432] transition flex items-center justify-center shadow-2xs active:scale-95"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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

        {/* Pagination Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="text-center sm:text-left">
            <span>
              Showing <span className="font-semibold text-slate-700">{profiles.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> profiles
              {pages > 1 && (
                <>
                  {' '}(Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
                  <span className="font-semibold text-slate-700">{pages}</span>)
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-700 shadow-2xs transition active:scale-95 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Page number indicators */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                let pNum = i + 1;
                if (pages > 5 && page > 3) {
                  pNum = page - 3 + i;
                  if (pNum > pages) pNum = pages - (4 - i);
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                      page === pNum
                        ? 'bg-[#E51F3E] text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            <button
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-medium text-slate-700 shadow-2xs transition active:scale-95 disabled:pointer-events-none"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REDESIGNED VIEW PROFILE PREVIEW MODAL (Two-Column Balanced Layout)        */}
      {/* ========================================================================= */}
      {selectedProfile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#E51F3E] flex items-center justify-center font-bold text-xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Profile Preview
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Matrimonial directory record preview & credentials
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProfile(null)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Balanced Two-Column Layout */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* LEFT COLUMN: Profile Image (~40% desktop)                     */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="w-full md:w-[40%] bg-slate-50/70 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-slate-200/80 flex flex-col items-center justify-between gap-4 shrink-0 md:overflow-y-auto">
                <div className="w-full flex flex-col items-center space-y-4">
                  {/* Image Container with strict max dimensions & aspect ratio */}
                  <div className="relative w-full max-w-[260px] aspect-[4/5] rounded-2xl overflow-hidden border border-slate-200 bg-slate-200 shadow-sm shrink-0">
                    {(() => {
                      const allPhotos = selectedProfile.photos && selectedProfile.photos.length > 0
                        ? selectedProfile.photos
                        : selectedProfile.primaryPhoto
                        ? [selectedProfile.primaryPhoto]
                        : [];
                      const displayImg = allPhotos[activePhotoIdx] || selectedProfile.primaryPhoto;

                      if (displayImg) {
                        return (
                          <img
                            src={displayImg}
                            alt={selectedProfile.displayName}
                            className="w-full h-full object-cover"
                          />
                        );
                      }
                      return (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-rose-100 via-rose-50 to-red-100 text-[#E51F3E]">
                          <span className="font-bold text-5xl mb-2">
                            {selectedProfile.displayName?.charAt(0)?.toUpperCase() || 'P'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">No Photo Uploaded</span>
                        </div>
                      );
                    })()}

                    {/* KYC Badge Floating Overlay */}
                    <div className="absolute top-2.5 left-2.5">
                      {renderKycBadge(selectedProfile.verificationStatus)}
                    </div>

                    {/* Account Status Shield Floating Overlay */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-white/90 backdrop-blur-xs text-slate-800 flex items-center gap-1 shadow-xs"
                        title={selectedProfile.user?.isActive !== false ? 'Active Account' : 'Suspended Account'}
                      >
                        {selectedProfile.user?.isActive !== false ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                            <span className="text-emerald-700">Active</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 fill-rose-100" />
                            <span className="text-rose-700">Suspended</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Photo Gallery Thumbnails (if multiple exist) */}
                  {selectedProfile.photos && selectedProfile.photos.length > 1 && (
                    <div className="w-full max-w-[260px]">
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-center">
                        {selectedProfile.photos.map((photoUrl, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActivePhotoIdx(idx)}
                            className={`relative w-11 h-11 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                              activePhotoIdx === idx
                                ? 'border-[#E51F3E] ring-2 ring-red-500/20 scale-105'
                                : 'border-slate-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={photoUrl}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile ID / Quick Metadata card */}
                <div className="w-full max-w-[260px] p-3 rounded-xl bg-white border border-slate-200 text-center text-xs space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Profile System ID
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 font-semibold truncate select-all">
                    {selectedProfile._id}
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* RIGHT COLUMN: Profile Information Details (~60% desktop)      */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  {/* Top Profile Header Info */}
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {selectedProfile.displayName}
                      </h4>
                      {renderKycBadge(selectedProfile.verificationStatus)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2 flex-wrap">
                      <span>{selectedProfile.gender}</span>
                      {calculateAge(selectedProfile.dob) && (
                        <>
                          <span>•</span>
                          <span>{calculateAge(selectedProfile.dob)} years old</span>
                        </>
                      )}
                      {selectedProfile.height && (
                        <>
                          <span>•</span>
                          <span>{selectedProfile.height}</span>
                        </>
                      )}
                      {selectedProfile.maritalStatus && (
                        <>
                          <span>•</span>
                          <span className="text-slate-700 font-semibold">{selectedProfile.maritalStatus}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Primary Details Key-Value Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Profession */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <Briefcase className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Profession
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {selectedProfile.profession || 'Not Specified'}
                        </span>
                        {selectedProfile.company && (
                          <span className="text-[11px] text-slate-500 truncate block">
                            @{selectedProfile.company}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Education */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <GraduationCap className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Education & Degree
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {selectedProfile.degree || selectedProfile.education || 'Not Specified'}
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Location
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {selectedProfile.city || 'City'}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {selectedProfile.state ? `${selectedProfile.state}, ` : ''}{selectedProfile.country || 'India'}
                        </span>
                      </div>
                    </div>

                    {/* Community / Religion */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <User className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Community & Religion
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {selectedProfile.religion || 'Religion'} {selectedProfile.caste ? `(${selectedProfile.caste})` : ''}
                        </span>
                        {selectedProfile.motherTongue && (
                          <span className="text-[11px] text-slate-500 truncate block">
                            Mother tongue: {selectedProfile.motherTongue}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Annual Income */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <IndianRupee className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Annual Income
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {selectedProfile.annualIncome || 'Confidential'}
                        </span>
                      </div>
                    </div>

                    {/* Food / Diet Preference */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <Heart className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Diet & Lifestyle
                        </span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {selectedProfile.foodPreference || 'Vegetarian'}
                        </span>
                        {selectedProfile.familyType && (
                          <span className="text-[11px] text-slate-500 truncate block">
                            Family: {selectedProfile.familyType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* About / Bio Statement */}
                  {selectedProfile.about && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-50/50 to-orange-50/30 border border-rose-100/70 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1 text-[11px] uppercase tracking-wider text-[#E51F3E]">
                        <Sparkles className="w-3.5 h-3.5 text-[#E51F3E]" />
                        <span>About Statement</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        {selectedProfile.about}
                      </p>
                    </div>
                  )}

                  {/* Registered Account Information (if populated) */}
                  {selectedProfile.user && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Registered User Account
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold truncate">{selectedProfile.user.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">{selectedProfile.user.mobile || 'No mobile listed'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions Buttons */}
                <div className="pt-4 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {/* View Full Public Profile in new tab */}
                    <Link
                      href="/"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-2xs transition active:scale-95"
                      title="Open public live portal"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Full Profile</span>
                    </Link>

                    {/* Edit Profile Button */}
                    <button
                      onClick={() => {
                        const toEdit = selectedProfile;
                        setSelectedProfile(null);
                        setEditingProfile({ ...toEdit });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#C81432] text-white font-bold text-xs shadow-xs shadow-red-500/25 transition active:scale-95"
                      title="Open Profile Editor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PROFILE MODAL                                                        */}
      {/* ========================================================================= */}
      {editingProfile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
          onClick={() => setEditingProfile(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveEdit} className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Profile: {editingProfile.displayName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update matrimonial directory profile details and verification status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body Scroll Area */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Display Name *</label>
                    <input
                      type="text"
                      value={editingProfile.displayName || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, displayName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={editingProfile.gender || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, gender: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                      required
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Medical Qualification *</label>
                    <select
                      value={editingProfile.education || ''}
                      onChange={(e) =>
                        setEditingProfile({
                          ...editingProfile,
                          education: e.target.value,
                          degree: editingProfile.degree || e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    >
                      <option value="" disabled>Select medical qualification</option>
                      {DOCTOR_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Medical Specialization *</label>
                    <select
                      value={editingProfile.profession || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, profession: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                      required
                    >
                      <option value="" disabled>Select medical specialization</option>
                      {DOCTOR_SPECIALIZATIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <DobInput
                      label="Date of Birth"
                      value={editingProfile.dob ? new Date(editingProfile.dob).toISOString().split('T')[0] : ''}
                      required={false}
                      onChange={(isoDate) => {
                        setEditingProfile({ ...editingProfile, dob: isoDate });
                      }}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Degree / College / Institution Details</label>
                    <input
                      type="text"
                      placeholder="e.g. MBBS, MD Cardiology (AIIMS)"
                      value={editingProfile.degree || ''}
                      onChange={(e) =>
                        setEditingProfile({
                          ...editingProfile,
                          degree: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company / Workplace</label>
                    <input
                      type="text"
                      value={editingProfile.company || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, company: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Annual Income</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹ 40 - 55 Lakhs"
                      value={editingProfile.annualIncome || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, annualIncome: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      value={editingProfile.city || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, city: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={editingProfile.state || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, state: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Religion</label>
                    <input
                      type="text"
                      value={editingProfile.religion || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, religion: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Caste / Subcaste</label>
                    <input
                      type="text"
                      value={editingProfile.caste || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, caste: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Height</label>
                    <input
                      type="text"
                      placeholder="e.g. 5ft 8in"
                      value={editingProfile.height || ''}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, height: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">KYC Verification Status</label>
                    <select
                      value={editingProfile.verificationStatus || 'UNVERIFIED'}
                      onChange={(e) =>
                        setEditingProfile({ ...editingProfile, verificationStatus: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    >
                      <option value="UNVERIFIED">UNVERIFIED</option>
                      <option value="PENDING">PENDING REVIEW</option>
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">About Bio Statement</label>
                  <textarea
                    rows={4}
                    value={editingProfile.about || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, about: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white"
                    placeholder="Brief description about lifestyle, interests, and partner preferences..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#C81432] text-white font-bold text-xs shadow-xs shadow-red-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  {saveLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
