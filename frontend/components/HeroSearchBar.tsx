'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';

const RELIGIONS = ['Any Religion', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Parsi', 'Buddhist', 'Other'];

const CITIES = [
  'Any Location', 'Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Lucknow',
];

export function HeroSearchBar() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    gender: 'Female',
    ageMin: '21',
    ageMax: '32',
    religion: '',
    city: '',
  });
  const [isSearching, setIsSearching] = useState(false);

  const onChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);

    const params = new URLSearchParams();
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.ageMin) params.set('ageMin', filters.ageMin);
    if (filters.ageMax) params.set('ageMax', filters.ageMax);
    if (filters.religion && filters.religion !== 'Any Religion') params.set('religion', filters.religion);
    if (filters.city && filters.city !== 'Any Location') params.set('city', filters.city);

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Search for matrimonial profiles"
      className="w-full bg-white rounded-[20px] sm:rounded-[24px] border border-[#e5e7eb] p-5 sm:p-6 shadow-[0_12px_36px_rgba(0,0,0,0.06),0_2px_8px_rgba(225,29,72,0.04)]"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3.5 sm:gap-4 items-end">
        {/* I AM LOOKING FOR */}
        <div className="lg:col-span-3 space-y-1.5 text-left">
          <label htmlFor="hs-gender" className="block text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700">
            I AM LOOKING FOR
          </label>
          <div className="relative">
            <select
              id="hs-gender"
              value={filters.gender}
              onChange={(e) => onChange('gender', e.target.value)}
              className="w-full h-[58px] appearance-none rounded-[14px] border border-[#e2e8f0] bg-white px-4 pr-10 text-[15px] sm:text-[16px] font-semibold text-[#0f172a] focus:border-[#e11d48] focus:outline-none focus:ring-3 focus:ring-[#e11d48]/10 transition shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              <option value="Female">Bride (Female)</option>
              <option value="Male">Groom (Male)</option>
            </select>
            <ChevronDown className="w-4.5 h-4.5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* AGE FROM */}
        <div className="lg:col-span-2 space-y-1.5 text-left">
          <label htmlFor="hs-ageMin" className="block text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700">
            AGE FROM
          </label>
          <input
            type="number"
            id="hs-ageMin"
            min="18"
            max="70"
            value={filters.ageMin}
            onChange={(e) => onChange('ageMin', e.target.value)}
            className="w-full h-[58px] rounded-[14px] border border-[#e2e8f0] bg-white px-4 text-[15px] sm:text-[16px] font-semibold text-[#0f172a] focus:border-[#e11d48] focus:outline-none focus:ring-3 focus:ring-[#e11d48]/10 transition shadow-2xs hover:border-slate-300"
          />
        </div>

        {/* AGE TO */}
        <div className="lg:col-span-2 space-y-1.5 text-left">
          <label htmlFor="hs-ageMax" className="block text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700">
            AGE TO
          </label>
          <input
            type="number"
            id="hs-ageMax"
            min="18"
            max="70"
            value={filters.ageMax}
            onChange={(e) => onChange('ageMax', e.target.value)}
            className="w-full h-[58px] rounded-[14px] border border-[#e2e8f0] bg-white px-4 text-[15px] sm:text-[16px] font-semibold text-[#0f172a] focus:border-[#e11d48] focus:outline-none focus:ring-3 focus:ring-[#e11d48]/10 transition shadow-2xs hover:border-slate-300"
          />
        </div>

        {/* RELIGION */}
        <div className="lg:col-span-2 space-y-1.5 text-left">
          <label htmlFor="hs-religion" className="block text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700">
            RELIGION
          </label>
          <div className="relative">
            <select
              id="hs-religion"
              value={filters.religion}
              onChange={(e) => onChange('religion', e.target.value)}
              className="w-full h-[58px] appearance-none rounded-[14px] border border-[#e2e8f0] bg-white px-4 pr-10 text-[15px] sm:text-[16px] font-semibold text-[#0f172a] focus:border-[#e11d48] focus:outline-none focus:ring-3 focus:ring-[#e11d48]/10 transition shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              {RELIGIONS.map((r) => (
                <option key={r} value={r === 'Any Religion' ? '' : r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="w-4.5 h-4.5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* CITY / LOCATION */}
        <div className="lg:col-span-2 space-y-1.5 text-left">
          <label htmlFor="hs-city" className="block text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-700">
            CITY / LOCATION
          </label>
          <div className="relative">
            <select
              id="hs-city"
              value={filters.city}
              onChange={(e) => onChange('city', e.target.value)}
              className="w-full h-[58px] appearance-none rounded-[14px] border border-[#e2e8f0] bg-white px-4 pr-10 text-[15px] sm:text-[16px] font-semibold text-[#0f172a] focus:border-[#e11d48] focus:outline-none focus:ring-3 focus:ring-[#e11d48]/10 transition shadow-2xs hover:border-slate-300 cursor-pointer"
            >
              {CITIES.map((c) => (
                <option key={c} value={c === 'Any Location' ? '' : c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="w-4.5 h-4.5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* SEARCH BUTTON */}
        <div className="lg:col-span-1 min-w-[145px]">
          <button
            type="submit"
            disabled={isSearching}
            className="w-full h-[58px] rounded-[14px] bg-[#e11d48] hover:bg-[#ce102f] text-white text-[15.5px] sm:text-[16px] font-bold shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 select-none"
            aria-label="Find Matches"
          >
            <Search className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
            <span className="whitespace-nowrap">{isSearching ? 'Searching…' : 'Find Matches'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
