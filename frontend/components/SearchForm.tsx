'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck } from 'lucide-react';

const options = {
  lookingFor: [
    { label: 'Bride (Woman)', value: 'Female' },
    { label: 'Groom (Man)', value: 'Male' },
  ],
  religions: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Other'],
  cities: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata'],
  education: ['B.Tech / B.E.', 'MBBS / MD', 'MBA / PGDM', 'CA / CS', 'M.Tech / MS', 'Graduate Degree'],
  professions: ['Software Professional', 'Doctor / Healthcare', 'Business Owner / Entrepreneur', 'Civil Services', 'Banker / Finance', 'Lawyer'],
};

export function SearchForm() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    gender: 'Female',
    ageMin: '21',
    ageMax: '32',
    religion: '',
    city: '',
    education: '',
    profession: '',
  });

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = new URLSearchParams(filters as Record<string, string>);
    router.push(`/search?${query.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">I am looking for</label>
          <select
            name="gender"
            value={filters.gender}
            onChange={onChange}
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
          >
            {options.lookingFor.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Age From</label>
            <input
              type="number"
              name="ageMin"
              value={filters.ageMin}
              onChange={onChange}
              className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Age To</label>
            <input
              type="number"
              name="ageMax"
              value={filters.ageMax}
              onChange={onChange}
              className="w-full rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Religion</label>
          <select
            name="religion"
            value={filters.religion}
            onChange={onChange}
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Religions</option>
            {options.religions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">City / Location</label>
          <select
            name="city"
            value={filters.city}
            onChange={onChange}
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Cities</option>
            {options.cities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Education</label>
          <select
            name="education"
            value={filters.education}
            onChange={onChange}
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Any Qualification</option>
            {options.education.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Profession</label>
          <select
            name="profession"
            value={filters.profession}
            onChange={onChange}
            className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Any Profession</option>
            {options.professions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:from-red-700 hover:to-rose-700 transition transform active:scale-95"
        >
          <Search className="w-4 h-4" />
          Find Suitable Matches
        </button>
      </div>
    </form>
  );
}
