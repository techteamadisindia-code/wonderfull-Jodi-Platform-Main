'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Globe,
  MessageCircle,
  Sliders,
  X,
  ChevronDown,
  ChevronUp,
  Heart,
  Sparkles,
  Lock,
  Phone,
  ArrowRight,
  SlidersHorizontal,
  Bookmark,
  Check,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { SearchResult, ProfileCard as ProfileCardType } from '../../types/profile';
import { ProfileCard } from '../../components/ProfileCard';
import { searchProfiles, getAuthToken } from '../../lib/api';

const SPECIALIZATIONS = [
  'All',
  'Cardiology',
  'Dermatology',
  'General Surgery',
  'Internal Medicine',
  'Pediatrics',
  'Orthopedics',
  'Gynecology & Obstetrics',
  'Neurology',
  'Ophthalmology',
  'Radiology',
  'Anesthesiology',
  'Dentistry / MDS',
  'Psychiatry',
  'ENT / Otorhinolaryngology',
  'Pathology',
];

const DEGREES = ['All', 'MBBS', 'MD', 'MS', 'DNB', 'DM', 'MCh', 'BDS', 'MDS', 'PhD (Medical)'];

const CITIES = [
  'All',
  'Mumbai',
  'Delhi NCR',
  'New Delhi',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Jaipur',
  'Kolkata',
  'Ahmedabad',
  'Chandigarh',
  'Lucknow',
];

const MARITAL_STATUSES = ['All', 'Never Married', 'Divorced', 'Widowed', 'Separated'];
const RELIGIONS = ['All', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Parsi', 'Other'];
const MOTHER_TONGUES = [
  'All',
  'Hindi',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Bengali',
  'Punjabi',
  'Kannada',
  'Odia',
  'Marwari',
];

const DIETS = ['All', 'Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Primary State
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savedSearchToast, setSavedSearchToast] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    specialization: true,
    location: true,
    education: true,
    lifestyle: false,
    religion: false,
    status: true,
  });

  // Filter Form State
  const [gender, setGender] = useState(searchParams.get('gender') || 'All');
  const [minAge, setMinAge] = useState(searchParams.get('minAge') || '21');
  const [maxAge, setMaxAge] = useState(searchParams.get('maxAge') || '45');
  const [city, setCity] = useState(searchParams.get('city') || 'All');
  const [specialization, setSpecialization] = useState(searchParams.get('specialization') || 'All');
  const [education, setEducation] = useState(searchParams.get('education') || 'All');
  const [maritalStatus, setMaritalStatus] = useState(searchParams.get('maritalStatus') || 'All');
  const [religion, setReligion] = useState(searchParams.get('religion') || 'All');
  const [motherTongue, setMotherTongue] = useState(searchParams.get('motherTongue') || 'All');
  const [diet, setDiet] = useState(searchParams.get('diet') || 'All');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [hasPhoto, setHasPhoto] = useState(searchParams.get('hasPhoto') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'bestMatch');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Sync state from searchParams on load/navigation
  useEffect(() => {
    setGender(searchParams.get('gender') || 'All');
    setMinAge(searchParams.get('minAge') || '21');
    setMaxAge(searchParams.get('maxAge') || '45');
    setCity(searchParams.get('city') || 'All');
    setSpecialization(searchParams.get('specialization') || 'All');
    setEducation(searchParams.get('education') || 'All');
    setMaritalStatus(searchParams.get('maritalStatus') || 'All');
    setReligion(searchParams.get('religion') || 'All');
    setMotherTongue(searchParams.get('motherTongue') || 'All');
    setDiet(searchParams.get('diet') || 'All');
    setVerifiedOnly(searchParams.get('verified') === 'true');
    setHasPhoto(searchParams.get('hasPhoto') === 'true');
    setSort(searchParams.get('sort') || 'bestMatch');
    setPage(Number(searchParams.get('page')) || 1);
  }, [searchParams]);

  // Fetch search results from backend API
  const fetchResults = useCallback(() => {
    const params = new URLSearchParams();

    if (gender && gender !== 'All') params.set('gender', gender);
    if (minAge && minAge !== '21') params.set('minAge', minAge);
    if (maxAge && maxAge !== '45') params.set('maxAge', maxAge);
    if (city && city !== 'All') params.set('city', city);
    if (specialization && specialization !== 'All') params.set('specialization', specialization);
    if (education && education !== 'All') params.set('education', education);
    if (maritalStatus && maritalStatus !== 'All') params.set('maritalStatus', maritalStatus);
    if (religion && religion !== 'All') params.set('religion', religion);
    if (motherTongue && motherTongue !== 'All') params.set('motherTongue', motherTongue);
    if (diet && diet !== 'All') params.set('diet', diet);
    if (verifiedOnly) params.set('verified', 'true');
    if (hasPhoto) params.set('hasPhoto', 'true');
    if (sort) params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    params.set('limit', '12');

    const queryString = params.toString();
    setLoading(true);

    searchProfiles(queryString)
      .then((res) => {
        if (res) {
          setData(res);
        } else {
          setData({ total: 0, page: 1, limit: 12, profiles: [] });
        }
      })
      .catch((err) => {
        console.error('Search fetch error:', err);
        setData({ total: 0, page: 1, limit: 12, profiles: [] });
      })
      .finally(() => setLoading(false));
  }, [
    gender,
    minAge,
    maxAge,
    city,
    specialization,
    education,
    maritalStatus,
    religion,
    motherTongue,
    diet,
    verifiedOnly,
    hasPhoto,
    sort,
    page,
  ]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Handle Search Submission & URL Sync
  const applyFiltersAndPushUrl = (overridePage?: number) => {
    const targetPage = overridePage ?? 1;
    setPage(targetPage);

    const params = new URLSearchParams();
    if (gender && gender !== 'All') params.set('gender', gender);
    if (minAge && minAge !== '21') params.set('minAge', minAge);
    if (maxAge && maxAge !== '45') params.set('maxAge', maxAge);
    if (city && city !== 'All') params.set('city', city);
    if (specialization && specialization !== 'All') params.set('specialization', specialization);
    if (education && education !== 'All') params.set('education', education);
    if (maritalStatus && maritalStatus !== 'All') params.set('maritalStatus', maritalStatus);
    if (religion && religion !== 'All') params.set('religion', religion);
    if (motherTongue && motherTongue !== 'All') params.set('motherTongue', motherTongue);
    if (diet && diet !== 'All') params.set('diet', diet);
    if (verifiedOnly) params.set('verified', 'true');
    if (hasPhoto) params.set('hasPhoto', 'true');
    if (sort && sort !== 'bestMatch') params.set('sort', sort);
    if (targetPage > 1) params.set('page', String(targetPage));

    const newQuery = params.toString();
    router.push(newQuery ? `/search?${newQuery}` : '/search');
  };

  const handleClearAllFilters = () => {
    setGender('All');
    setMinAge('21');
    setMaxAge('45');
    setCity('All');
    setSpecialization('All');
    setEducation('All');
    setMaritalStatus('All');
    setReligion('All');
    setMotherTongue('All');
    setDiet('All');
    setVerifiedOnly(false);
    setHasPhoto(false);
    setSort('bestMatch');
    setPage(1);
    router.push('/search');
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Count active applied filters
  const activeFiltersCount = [
    gender !== 'All',
    minAge !== '21' || maxAge !== '45',
    city !== 'All',
    specialization !== 'All',
    education !== 'All',
    maritalStatus !== 'All',
    religion !== 'All',
    motherTongue !== 'All',
    diet !== 'All',
    verifiedOnly,
    hasPhoto,
  ].filter(Boolean).length;

  const handleSaveSearch = () => {
    setSavedSearchToast(true);
    setTimeout(() => setSavedSearchToast(false), 3000);
  };

  const profiles = data?.profiles || [];
  const total = data?.total || 0;
  const limit = data?.limit || 12;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#15213A] pb-16">
      {/* Save Search Toast */}
      {savedSearchToast && (
        <div className="fixed top-24 right-6 z-50 rounded-2xl bg-[#101728] text-white p-4 shadow-2xl border border-rose-500/30 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-sm">Search Criteria Saved</p>
            <p className="text-slate-300">You will receive new doctor match notifications.</p>
          </div>
        </div>
      )}

      {/* 1. Search Hero (~250–300px) */}
      <section className="relative pt-[50px] pb-[30px] px-4 sm:px-6 lg:px-8 border-b border-rose-100/50 bg-gradient-to-b from-[#FFF5F7]/80 via-[#FFF9FA]/40 to-[#F8FAFC]">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          {/* Small Red Uppercase Label */}
          <span className="text-xs uppercase font-extrabold text-[#E51F3E] tracking-widest block">
            DOCTOR MATRIMONIAL SEARCH
          </span>

          {/* Main Heading */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#101728] tracking-tight leading-tight">
            Find Your Perfect <span className="text-[#E51F3E]">Doctor Match</span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Discover verified doctors based on profession, specialization, location, education, lifestyle and family preferences.
          </p>

          {/* Compact Trust Row */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#0BAA70]" />
              Verified Doctor Profiles
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-[#E51F3E]" />
              Confidential & Private
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <Heart className="w-3.5 h-3.5 text-[#E51F3E]" />
              Personalised Matchmaking
            </span>
          </div>
        </div>
      </section>

      {/* 2. Quick Search Panel */}
      <section className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 -mt-5 z-20 relative">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#F5D9DD] p-5 sm:p-6 shadow-md shadow-rose-900/5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 items-end">
            {/* Looking For (Bride / Groom) */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Looking For
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20"
              >
                <option value="All">Bride or Groom (All)</option>
                <option value="Female">Bride (Female Doctors)</option>
                <option value="Male">Groom (Male Doctors)</option>
              </select>
            </div>

            {/* Age Range */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Age Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-[#F8FAFC] px-2.5 text-xs sm:text-sm font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                >
                  {[21, 23, 25, 27, 29, 31, 33, 35, 38, 40].map((a) => (
                    <option key={a} value={a}>
                      {a} Yrs
                    </option>
                  ))}
                </select>
                <select
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-[#F8FAFC] px-2.5 text-xs sm:text-sm font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                >
                  {[26, 28, 30, 32, 35, 38, 42, 45, 50, 60].map((a) => (
                    <option key={a} value={a}>
                      {a} Yrs
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* City Selection */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Practice City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Cities (Pan India)' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Specialization
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20"
              >
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Specializations' : s}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <div>
              <button
                onClick={() => applyFiltersAndPushUrl(1)}
                className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] px-5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:from-[#d11735] hover:to-[#e0203f] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <Search className="w-4 h-4" />
                <span>Search Profiles →</span>
              </button>
            </div>
          </div>

          {/* Quick Filters Footer Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-[#E51F3E] transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E51F3E]" />
                <span>{showAdvancedFilters ? 'Hide Advanced Filters' : 'Advanced Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#E51F3E] text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <label className="hidden sm:inline-flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                  }}
                  className="rounded border-slate-300 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <span>Doctor Verified Only</span>
              </label>

              <label className="hidden sm:inline-flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasPhoto}
                  onChange={(e) => {
                    setHasPhoto(e.target.checked);
                  }}
                  className="rounded border-slate-300 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <span>With Photos</span>
              </label>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition underline"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {/* Advanced Filter Collapsible Drawer Inside Card */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in bg-slate-50/70 p-4 rounded-2xl">
              {/* Medical Degree */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Medical Qualification / Degree
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {DEGREES.map((d) => (
                    <option key={d} value={d}>
                      {d === 'All' ? 'All Degrees' : d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marital Status */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Marital Status
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {MARITAL_STATUSES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Religion */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Religion
                </label>
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {RELIGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mother Tongue */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Mother Tongue
                </label>
                <select
                  value={motherTongue}
                  onChange={(e) => setMotherTongue(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {MOTHER_TONGUES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Diet / Lifestyle */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Diet Preference
                </label>
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {DIETS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkbox controls on mobile */}
              <div className="sm:hidden flex flex-col gap-2 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                  />
                  <span>Doctor Verified Only</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasPhoto}
                    onChange={(e) => setHasPhoto(e.target.checked)}
                  />
                  <span>With Photos</span>
                </label>
              </div>

              <div className="lg:col-span-3 flex items-end justify-end gap-2.5 pt-2">
                <button
                  onClick={handleClearAllFilters}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => applyFiltersAndPushUrl(1)}
                  className="rounded-xl bg-[#101728] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Search Results Header */}
      <section className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-6 border border-[#F5D9DD] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
                Verified Doctor Matches
              </h2>
              {activeFiltersCount > 0 && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#E51F3E] border border-rose-200">
                  {activeFiltersCount} {activeFiltersCount === 1 ? 'Filter' : 'Filters'} Applied
                </span>
              )}
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              {loading
                ? 'Searching doctor database...'
                : total > 0
                ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} verified candidates matching your criteria.`
                : 'Showing 0 profiles matching your criteria.'}
            </p>
          </div>

          {/* Right Controls: Sort & Save Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Save Search */}
            <button
              onClick={handleSaveSearch}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3.5 py-2 text-xs font-bold text-[#E51F3E] hover:bg-rose-100 transition shadow-2xs"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Search</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Sort By:
              </span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('sort', e.target.value);
                  params.set('page', '1');
                  router.push(`/search?${params.toString()}`);
                }}
                className="h-9.5 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="bestMatch">Best Match</option>
                <option value="recentlyActive">Recently Active</option>
                <option value="newest">Newest Profiles</option>
                <option value="ageAsc">Age: Low to High</option>
                <option value="ageDesc">Age: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Profile Grid (4 Columns on Desktop) */}
      <section className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-7">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 animate-pulse h-[460px]"
              >
                <div className="h-[280px] rounded-xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-10 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : profiles.length > 0 ? (
          /* Profile Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 xl:gap-7 items-stretch">
            {profiles.map((profile: any) => (
              <ProfileCard key={profile._id} profile={profile} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-3xl bg-white border border-[#F5D9DD] p-12 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto text-2xl">
              🔎
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#101728]">
              No Compatible Profiles Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Try adjusting your medical qualification filters, expanding age preferences, or broadening your city search.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleClearAllFilters}
                className="rounded-xl bg-[#E51F3E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#d11735] transition shadow-sm"
              >
                Clear All Filters
              </button>
              <button
                onClick={() => {
                  setCity('All');
                  setSpecialization('All');
                  applyFiltersAndPushUrl(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Expand Search (Pan India)
              </button>
            </div>
          </div>
        )}

        {/* 5. Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <span className="text-xs font-medium text-slate-600">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} doctor profiles
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => applyFiltersAndPushUrl(page - 1)}
                disabled={page <= 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, pIdx) => {
                  const pNum = pIdx + 1;
                  const isCurrent = pNum === page;
                  return (
                    <button
                      key={pNum}
                      onClick={() => applyFiltersAndPushUrl(pNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition ${
                        isCurrent
                          ? 'bg-[#E51F3E] text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => applyFiltersAndPushUrl(page + 1)}
                disabled={page >= totalPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 6. Doctor Trust Strip (~90–110px) */}
      <section className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center items-center">
            <div className="flex items-center justify-center gap-3 p-2">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#101728] block">Verified Doctor Profiles</span>
                <span className="text-[10px] text-slate-500">Medical Council Screened</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-2">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#101728] block">Privacy First</span>
                <span className="text-[10px] text-slate-500">Photo & Contact Controls</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-2">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#101728] block">Compatibility Focused</span>
                <span className="text-[10px] text-slate-500">Clinical & Family Alignment</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-2">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#101728] block">Relationship Manager</span>
                <span className="text-[10px] text-slate-500">Toll-Free 24/7 Helpline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Why Choose Wonderful Jodi Section (Positioned After Results) */}
      <section className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="text-center space-y-2 max-w-2xl mx-auto mb-8">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#E51F3E]">
            Premium Matrimonial Features
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
            Why Choose Wonderful Jodi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Everything medical professionals and esteemed families need to discover their ideal life partner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search Worldwide */}
          <div className="bg-white border border-[#f1e5e5] rounded-3xl p-7 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-[#E51F3E]">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#101728] mb-2">Search Worldwide</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Discover compatible doctors across India and worldwide NRI communities without geographical limitations.
              </p>
            </div>
          </div>

          {/* Easy Chat */}
          <div className="bg-white border border-[#f1e5e5] rounded-3xl p-7 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-[#E51F3E]">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#101728] mb-2">Easy Chat</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Connect with compatible matches, exchange preferences and communicate securely before taking the next step.
              </p>
            </div>
          </div>

          {/* Personalised Filter */}
          <div className="bg-white border border-[#f1e5e5] rounded-3xl p-7 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-[#E51F3E]">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#101728] mb-2">Personalised Filter</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Find relevant matches using specialization, location, education, lifestyle and family preferences.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center text-xs font-semibold text-slate-500">
          Loading doctor search engine...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
