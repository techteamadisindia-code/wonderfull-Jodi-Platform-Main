'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, Loader2, AlertCircle } from 'lucide-react';

const RELIGIONS = [
  'Any Religion',
  'Hindu',
  'Muslim',
  'Christian',
  'Sikh',
  'Jain',
  'Parsi',
  'Buddhist',
  'Other',
];

const CITIES = [
  'Any Location',
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Chennai',
  'Hyderabad',
  'Kolkata',
  'Jaipur',
  'Ahmedabad',
  'Lucknow',
];

export function HeroSearchBar() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    lookingFor: 'female',
    ageFrom: '21',
    ageTo: '32',
    religion: 'any',
    location: 'any',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const onChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const validate = (): boolean => {
    const ageFromNum = Number(filters.ageFrom);
    const ageToNum = Number(filters.ageTo);

    if (!filters.ageFrom || isNaN(ageFromNum)) {
      setErrorMsg('Please enter a valid "Age From" number.');
      return false;
    }
    if (!filters.ageTo || isNaN(ageToNum)) {
      setErrorMsg('Please enter a valid "Age To" number.');
      return false;
    }
    if (ageFromNum < 18 || ageFromNum > 70) {
      setErrorMsg('Age From must be between 18 and 70.');
      return false;
    }
    if (ageToNum < 18 || ageToNum > 70) {
      setErrorMsg('Age To must be between 18 and 70.');
      return false;
    }
    if (ageFromNum > ageToNum) {
      setErrorMsg('Age From cannot be greater than Age To.');
      return false;
    }
    return true;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validate()) {
      return;
    }

    setIsSearching(true);

    const params = new URLSearchParams();
    params.set('gender', filters.lookingFor);
    params.set('ageFrom', filters.ageFrom);
    params.set('ageTo', filters.ageTo);
    params.set('religion', filters.religion);
    params.set('location', filters.location);

    // Also set legacy aliases for max backwards compatibility
    params.set('minAge', filters.ageFrom);
    params.set('maxAge', filters.ageTo);
    if (filters.religion !== 'any') params.set('religion', filters.religion);
    if (filters.location !== 'any') params.set('city', filters.location);

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Search for matrimonial profiles"
      className="w-full max-w-full bg-white rounded-xl sm:rounded-2xl border border-[rgba(180,160,150,0.22)] p-3.5 sm:p-4.5 shadow-sm box-border overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_0.75fr_0.75fr_1.1fr_1.1fr_1.25fr] gap-2.5 sm:gap-3 lg:gap-2.5 xl:gap-3 items-end">
        {/* I AM LOOKING FOR */}
        <div className="w-full min-w-0 space-y-1 text-left">
          <label
            htmlFor="hs-gender"
            className="block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-700 truncate"
          >
            I AM LOOKING FOR
          </label>
          <div className="relative">
            <select
              id="hs-gender"
              value={filters.lookingFor}
              onChange={(e) => onChange('lookingFor', e.target.value)}
              className="w-full h-[46px] sm:h-[48px] appearance-none rounded-xl border border-[rgba(180,160,150,0.25)] bg-[#FAF8F5]/60 px-3.5 pr-8 text-[14px] sm:text-[14.5px] font-semibold text-[#0f172a] focus:border-[#E51F3E] focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/10 transition shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              <option value="female">Bride (Female)</option>
              <option value="male">Groom (Male)</option>
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* AGE RANGE - Responsive Container */}
        <div className="grid grid-cols-2 gap-2 sm:contents">
          {/* AGE FROM */}
          <div className="w-full min-w-0 space-y-1 text-left">
            <label
              htmlFor="hs-ageFrom"
              className="block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-700 truncate"
            >
              AGE FROM
            </label>
            <input
              type="number"
              id="hs-ageFrom"
              min="18"
              max="70"
              value={filters.ageFrom}
              onChange={(e) => onChange('ageFrom', e.target.value)}
              className={`w-full h-[46px] sm:h-[48px] rounded-xl border bg-[#FAF8F5]/60 px-3.5 text-[14px] sm:text-[14.5px] font-semibold text-[#0f172a] focus:outline-none focus:ring-2 transition shadow-2xs ${
                errorMsg && (Number(filters.ageFrom) > Number(filters.ageTo) || Number(filters.ageFrom) < 18)
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-[rgba(180,160,150,0.25)] focus:border-[#E51F3E] focus:ring-[#E51F3E]/10 hover:border-slate-300'
              }`}
            />
          </div>

          {/* AGE TO */}
          <div className="w-full min-w-0 space-y-1 text-left">
            <label
              htmlFor="hs-ageTo"
              className="block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-700 truncate"
            >
              AGE TO
            </label>
            <input
              type="number"
              id="hs-ageTo"
              min="18"
              max="70"
              value={filters.ageTo}
              onChange={(e) => onChange('ageTo', e.target.value)}
              className={`w-full h-[46px] sm:h-[48px] rounded-xl border bg-[#FAF8F5]/60 px-3.5 text-[14px] sm:text-[14.5px] font-semibold text-[#0f172a] focus:outline-none focus:ring-2 transition shadow-2xs ${
                errorMsg && (Number(filters.ageFrom) > Number(filters.ageTo) || Number(filters.ageTo) > 70)
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-[rgba(180,160,150,0.25)] focus:border-[#E51F3E] focus:ring-[#E51F3E]/10 hover:border-slate-300'
              }`}
            />
          </div>
        </div>

        {/* RELIGION */}
        <div className="w-full min-w-0 space-y-1 text-left">
          <label
            htmlFor="hs-religion"
            className="block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-700 truncate"
          >
            RELIGION
          </label>
          <div className="relative">
            <select
              id="hs-religion"
              value={filters.religion}
              onChange={(e) => onChange('religion', e.target.value)}
              className="w-full h-[46px] sm:h-[48px] appearance-none rounded-xl border border-[rgba(180,160,150,0.25)] bg-[#FAF8F5]/60 px-3.5 pr-8 text-[14px] sm:text-[14.5px] font-semibold text-[#0f172a] focus:border-[#E51F3E] focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/10 transition shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              {RELIGIONS.map((r) => (
                <option key={r} value={r === 'Any Religion' ? 'any' : r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* CITY / LOCATION */}
        <div className="w-full min-w-0 space-y-1 text-left">
          <label
            htmlFor="hs-city"
            className="block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-slate-700 truncate"
          >
            CITY / LOCATION
          </label>
          <div className="relative">
            <select
              id="hs-city"
              value={filters.location}
              onChange={(e) => onChange('location', e.target.value)}
              className="w-full h-[46px] sm:h-[48px] appearance-none rounded-xl border border-[rgba(180,160,150,0.25)] bg-[#FAF8F5]/60 px-3.5 pr-8 text-[14px] sm:text-[14.5px] font-semibold text-[#0f172a] focus:border-[#E51F3E] focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/10 transition shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              {CITIES.map((c) => (
                <option key={c} value={c === 'Any Location' ? 'any' : c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* SEARCH BUTTON */}
        <div className="w-full min-w-0 pt-0.5 sm:pt-0">
          <button
            type="submit"
            disabled={isSearching}
            className="w-full h-[46px] sm:h-[48px] px-4 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] hover:bg-[#ce102f] text-white text-[14.5px] sm:text-[15px] font-bold shadow-sm shadow-rose-600/25 hover:shadow-md hover:shadow-rose-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 select-none"
            aria-label="Find Matches"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 stroke-[2.5] shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">Find Matches</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Validation Alert Message */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in text-left">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </form>
  );
}
