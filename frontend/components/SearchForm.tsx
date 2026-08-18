'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, Sparkles } from 'lucide-react';

const options = {
  lookingFor: [
    { label: 'Bride (Female)', value: 'Female' },
    { label: 'Groom (Male)', value: 'Male' },
  ],
  religions: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Parsi', 'Buddhist', 'All Religions'],
  cities: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur'],
  education: ['B.Tech / B.E.', 'MBBS / MD', 'MBA / PGDM', 'CA / CS', 'M.Tech / MS', 'Graduate Degree'],
};

interface SearchFormProps {
  layout?: 'grid' | 'row';
}

export function SearchForm({ layout = 'grid' }: SearchFormProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    gender: 'Female',
    ageMin: '21',
    ageMax: '32',
    religion: '',
    city: '',
    education: '',
  });

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanFilters: Record<string, string> = {};
    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== 'All Religions') cleanFilters[key] = val;
    });
    const query = new URLSearchParams(cleanFilters);
    router.push(`/search?${query.toString()}`);
  };

  if (layout === 'row') {
    return (
      <form onSubmit={onSubmit} className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-3.5 items-end">
          {/* Looking For */}
          <div className="space-y-1">
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              I AM LOOKING FOR
            </label>
            <div className="relative">
              <select
                name="gender"
                value={filters.gender}
                onChange={onChange}
                className="w-full h-[46px] appearance-none rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white px-3.5 text-[13.5px] text-[#101828] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium transition pr-8 shadow-2xs"
              >
                {options.lookingFor.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Age From */}
          <div className="space-y-1">
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              AGE FROM
            </label>
            <input
              type="number"
              name="ageMin"
              min="18"
              max="70"
              value={filters.ageMin}
              onChange={onChange}
              className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white px-3.5 text-[13.5px] text-[#101828] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium transition shadow-2xs"
            />
          </div>

          {/* Age To */}
          <div className="space-y-1">
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              AGE TO
            </label>
            <input
              type="number"
              name="ageMax"
              min="18"
              max="70"
              value={filters.ageMax}
              onChange={onChange}
              className="w-full h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white px-3.5 text-[13.5px] text-[#101828] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium transition shadow-2xs"
            />
          </div>

          {/* Religion */}
          <div className="space-y-1">
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              RELIGION
            </label>
            <div className="relative">
              <select
                name="religion"
                value={filters.religion}
                onChange={onChange}
                className="w-full h-[46px] appearance-none rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white px-3.5 text-[13.5px] text-[#101828] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium transition pr-8 shadow-2xs"
              >
                <option value="">Any Religion</option>
                {options.religions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* City / Location */}
          <div className="space-y-1">
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              CITY / LOCATION
            </label>
            <div className="relative">
              <select
                name="city"
                value={filters.city}
                onChange={onChange}
                className="w-full h-[46px] appearance-none rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white px-3.5 text-[13.5px] text-[#101828] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium transition pr-8 shadow-2xs"
              >
                <option value="">Any Location</option>
                {options.cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Search Button */}
          <div>
            <button
              type="submit"
              className="w-full h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CE102F] px-5 text-sm font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>Find Matches</span>
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 sm:p-7 border border-rose-100/90 shadow-lg shadow-slate-900/5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900">Custom Partner Search</h3>
          <p className="text-xs text-slate-500 mt-0.5">Filter profiles matching your precise criteria</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-[#E51F3E]">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">Looking For</label>
          <select
            name="gender"
            value={filters.gender}
            onChange={onChange}
            className="w-full h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium"
          >
            {options.lookingFor.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">Religion</label>
          <select
            name="religion"
            value={filters.religion}
            onChange={onChange}
            className="w-full h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium"
          >
            <option value="">Any Religion</option>
            {options.religions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">Age Range (Years)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="ageMin"
              placeholder="Min"
              min="18"
              value={filters.ageMin}
              onChange={onChange}
              className="w-full h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
            />
            <input
              type="number"
              name="ageMax"
              placeholder="Max"
              max="70"
              value={filters.ageMax}
              onChange={onChange}
              className="w-full h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">City / Location</label>
          <select
            name="city"
            value={filters.city}
            onChange={onChange}
            className="w-full h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] font-medium"
          >
            <option value="">Any Location</option>
            {options.cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#CE102F] text-sm font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg transition-all duration-200"
      >
        <Search className="w-4 h-4" />
        Search Matching Profiles
      </button>
    </form>
  );
}
