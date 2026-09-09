'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';
import { SearchResult } from '../../types/profile';
import { ProfileCard } from '../../components/ProfileCard';
import { searchProfiles } from '../../lib/api';

import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
} from '../../lib/doctorConstants';

const PROFESSIONS = [
  'All',
  ...DOCTOR_SPECIALIZATIONS,
];

const QUALIFICATIONS = [
  'All',
  ...DOCTOR_QUALIFICATIONS,
];

const CITIES = [
  'All',
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Jaipur',
  'Pune',
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

  // Filter Form State
  const parseGender = (val: string | null) => {
    if (!val) return 'All';
    const lower = val.toLowerCase();
    if (lower === 'female' || lower === 'bride') return 'Female';
    if (lower === 'male' || lower === 'groom') return 'Male';
    return val === 'any' ? 'All' : val;
  };

  const parseParam = (val: string | null, fallback = 'All') => {
    if (!val || val === 'any' || val === 'All') return fallback;
    return val;
  };

  const [gender, setGender] = useState(() =>
    parseGender(searchParams.get('gender') || searchParams.get('lookingFor'))
  );
  const [minAge, setMinAge] = useState(
    searchParams.get('ageFrom') || searchParams.get('minAge') || searchParams.get('ageMin') || '21'
  );
  const [maxAge, setMaxAge] = useState(
    searchParams.get('ageTo') || searchParams.get('maxAge') || searchParams.get('ageMax') || '45'
  );
  const [city, setCity] = useState(() =>
    parseParam(searchParams.get('location') || searchParams.get('city'), 'All')
  );
  const [profession, setProfession] = useState(searchParams.get('profession') || 'All');
  const [education, setEducation] = useState(searchParams.get('education') || 'All');
  const [maritalStatus, setMaritalStatus] = useState(searchParams.get('maritalStatus') || 'All');
  const [religion, setReligion] = useState(() =>
    parseParam(searchParams.get('religion'), 'All')
  );
  const [motherTongue, setMotherTongue] = useState(searchParams.get('motherTongue') || 'All');
  const [diet, setDiet] = useState(searchParams.get('diet') || 'All');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [hasPhoto, setHasPhoto] = useState(searchParams.get('hasPhoto') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'bestMatch');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Sync state from searchParams on load/navigation
  useEffect(() => {
    setGender(parseGender(searchParams.get('gender') || searchParams.get('lookingFor')));
    setMinAge(
      searchParams.get('ageFrom') || searchParams.get('minAge') || searchParams.get('ageMin') || '21'
    );
    setMaxAge(
      searchParams.get('ageTo') || searchParams.get('maxAge') || searchParams.get('ageMax') || '45'
    );
    setCity(parseParam(searchParams.get('location') || searchParams.get('city'), 'All'));
    setProfession(searchParams.get('profession') || 'All');
    setEducation(searchParams.get('education') || 'All');
    setMaritalStatus(searchParams.get('maritalStatus') || 'All');
    setReligion(parseParam(searchParams.get('religion'), 'All'));
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
    if (profession && profession !== 'All') params.set('profession', profession);
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
    profession,
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
    if (profession && profession !== 'All') params.set('profession', profession);
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
    setProfession('All');
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

  // Count active applied filters
  const activeFiltersCount = [
    gender !== 'All',
    minAge !== '21' || maxAge !== '45',
    city !== 'All',
    profession !== 'All',
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

  const showingStart = total > 0 ? (page - 1) * limit + 1 : 0;
  const showingEnd = Math.min(page * limit, total);

  return (
    <main className="min-h-screen bg-[#FAF7F4] text-[#15213A] pb-14">
      {/* Save Search Toast */}
      {savedSearchToast && (
        <div className="fixed top-20 right-5 z-50 rounded-xl bg-[#101728] text-white p-3.5 shadow-xl border border-rose-500/30 flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-[13px]">Search Criteria Saved</p>
            <p className="text-slate-300">You will receive match notifications for new verified candidates.</p>
          </div>
        </div>
      )}

      {/* ── 1. Top Candidate Count Section ── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 sm:pt-5">
        <div className="rounded-xl bg-white border border-[#E8E1DB] px-4 sm:px-6 py-2.5 min-h-[48px] shadow-2xs flex items-center justify-between">
          <span className="text-xs sm:text-[13px] font-semibold text-slate-700">
            {loading ? (
              'Searching verified candidates...'
            ) : total > 0 ? (
              `Showing ${showingStart}–${showingEnd} of ${total} verified candidates.`
            ) : (
              'No verified candidates found matching your criteria.'
            )}
          </span>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time Verified Database</span>
          </div>
        </div>
      </section>

      {/* ── 2. Search & Filter Panel ── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3 sm:mt-4">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E8E1DB] px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 sm:pb-4 shadow-xs">
          {/* Row 1: Filter Fields with Proportional Widths and Consistent 40px Height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.15fr_1.1fr_1fr_1fr] gap-3 sm:gap-3.5 items-end">
            {/* Looking For (~24%) */}
            <div className="w-full">
              <label className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Looking For
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-9 sm:h-10 min-h-[38px] rounded-lg sm:rounded-xl border border-[#E8E1DB] bg-[#FAF7F4]/40 px-3 text-xs sm:text-[13px] font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20"
              >
                <option value="All">Bride or Groom (All)</option>
                <option value="Female">Bride (Female)</option>
                <option value="Male">Groom (Male)</option>
              </select>
            </div>

            {/* Age Range (~20%) with centered 'To' */}
            <div className="w-full">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Age Range
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  className="w-full h-9 sm:h-10 min-h-[38px] rounded-lg sm:rounded-xl border border-[#E8E1DB] bg-[#FAF7F4]/40 px-2 text-xs sm:text-[13px] font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                >
                  {[21, 23, 25, 27, 29, 31, 33, 35, 38, 40].map((a) => (
                    <option key={a} value={a}>
                      {a} Yrs
                    </option>
                  ))}
                </select>
                <span className="text-[11px] font-semibold text-slate-400 shrink-0">To</span>
                <select
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  className="w-full h-9 sm:h-10 min-h-[38px] rounded-lg sm:rounded-xl border border-[#E8E1DB] bg-[#FAF7F4]/40 px-2 text-xs sm:text-[13px] font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                >
                  {[26, 28, 30, 32, 35, 38, 42, 45, 50, 60].map((a) => (
                    <option key={a} value={a}>
                      {a} Yrs
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location / City (~22%) */}
            <div className="w-full">
              <label className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Location / City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-9 sm:h-10 min-h-[38px] rounded-lg sm:rounded-xl border border-[#E8E1DB] bg-[#FAF7F4]/40 px-3 text-xs sm:text-[13px] font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Locations (Pan India)' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Profession (~20%) */}
            <div className="w-full">
              <label className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Profession
              </label>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full h-9 sm:h-10 min-h-[38px] rounded-lg sm:rounded-xl border border-[#E8E1DB] bg-[#FAF7F4]/40 px-3 text-xs sm:text-[13px] font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20"
              >
                {PROFESSIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Matches Button (~20% with max-width: 310px, min-height: 38px) */}
            <div className="w-full flex justify-start lg:justify-end">
              <button
                onClick={() => applyFiltersAndPushUrl(1)}
                className="w-full max-w-[310px] h-9 sm:h-10 min-h-[38px] inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] px-4 text-xs sm:text-[13.5px] font-bold text-white shadow-sm shadow-red-600/20 hover:shadow-md hover:from-[#d11735] hover:to-[#b91c1c] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Matches →</span>
              </button>
            </div>
          </div>

          {/* Divider with clean spacing (margin: 20px 0 16px) */}
          <div className="mt-5 mb-4 border-t border-slate-100" />

          {/* Row 2: Quick Filters & Sort Aligned on Horizontal Line */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-[#E51F3E] transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#E51F3E]" />
                <span>{showAdvancedFilters ? 'Hide Advanced Filters' : 'More Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#E51F3E] text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <label className="hidden sm:inline-flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded border-slate-300 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <span>Verified Candidates Only</span>
              </label>

              <label className="hidden sm:inline-flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasPhoto}
                  onChange={(e) => setHasPhoto(e.target.checked)}
                  className="rounded border-slate-300 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <span>With Photos</span>
              </label>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearAllFilters}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition underline"
                >
                  Clear All Filters
                </button>
              )}

              {/* Sort Dropdown aligned to far right (width: 175px, height: 40px) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                  Sort:
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
                  className="w-[175px] h-10 min-h-[40px] rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 text-xs font-semibold text-[#101728] focus:outline-none focus:border-[#E51F3E]"
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

          {/* Advanced Filter Collapsible Drawer Inside Card */}
          {showAdvancedFilters && (
            <div className="mt-3.5 pt-3.5 border-t border-[#E8E1DB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in bg-[#FAF7F4] p-3.5 rounded-xl border border-[#E8E1DB]">
              {/* Education */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Education / Degree
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full h-9 min-h-[38px] rounded-lg border border-[#E8E1DB] bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {QUALIFICATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marital Status */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Marital Status
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full h-9 min-h-[38px] rounded-lg border border-[#E8E1DB] bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
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
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Religion
                </label>
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full h-9 min-h-[38px] rounded-lg border border-[#E8E1DB] bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
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
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Mother Tongue
                </label>
                <select
                  value={motherTongue}
                  onChange={(e) => setMotherTongue(e.target.value)}
                  className="w-full h-9 min-h-[38px] rounded-lg border border-[#E8E1DB] bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {MOTHER_TONGUES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Diet */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                  Diet Preference
                </label>
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full h-9 min-h-[38px] rounded-lg border border-[#E8E1DB] bg-white px-3 text-xs text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                >
                  {DIETS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3 flex items-end justify-end gap-2.5 pt-1.5">
                <button
                  onClick={handleClearAllFilters}
                  className="rounded-lg border border-[#E8E1DB] bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => applyFiltersAndPushUrl(1)}
                  className="rounded-lg bg-[#101728] px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Profile Grid (Responsive 4 cards / 3 cards / 2 cards / 1 card) ── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6 sm:mt-7">
        {loading ? (
          /* Loading Skeletons matching exact responsive layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 justify-items-center">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="w-full max-w-[280px] rounded-xl border border-[#E8E1DB] bg-white overflow-hidden animate-pulse flex flex-col"
              >
                <div className="w-full h-[205px] sm:h-[220px] bg-slate-200 shrink-0" />
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-4/5 pt-1" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="h-[36px] bg-slate-200 rounded-lg w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length > 0 ? (
          /* Real Database Profile Cards in Responsive Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 justify-items-center">
            {profiles.map((profile: any) => (
              <div key={profile._id} className="w-full max-w-[280px] flex flex-col">
                <ProfileCard profile={profile} />
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl bg-white border border-slate-200/80 p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto text-2xl">
              🔎
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#101728]">
              No profiles found
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Try changing your search filters to find more matches.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleClearAllFilters}
                className="rounded-xl bg-[#E51F3E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#d11735] transition shadow-sm"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* ── Pagination Controls ── */}
        {!loading && totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <span className="text-xs font-medium text-slate-600">
              Showing {showingStart}–{showingEnd} of {total} verified candidates
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
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center text-xs font-semibold text-slate-500">
          Loading matrimonial candidate search...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
