'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';

/** Age range presets that map to ageMin/ageMax query params */
const AGE_RANGES = [
  { label: '18–25', min: '18', max: '25' },
  { label: '25–30', min: '25', max: '30' },
  { label: '30–35', min: '30', max: '35' },
  { label: '35–40', min: '35', max: '40' },
  { label: '40+',   min: '40', max: '60' },
] as const;

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];

const COMMUNITIES = [
  'Brahmin', 'Kshatriya', 'Vaishya', 'Maratha', 'Rajput', 'Jat',
  'Agarwal', 'Kayastha', 'Reddy', 'Nair', 'Patel', 'Sharma',
];

const CITIES = [
  'Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Chennai',
  'Hyderabad', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Lucknow',
];

interface SearchFilters {
  lookingFor: 'Female' | 'Male';
  ageRange: string;   // e.g. "25-30"
  religion: string;
  community: string;
  city: string;
}

export function HeroSearchBar() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({
    lookingFor: 'Female',
    ageRange: '25-30',
    religion: '',
    community: '',
    city: '',
  });
  const [isSearching, setIsSearching] = useState(false);

  const onChange = (field: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);

    // Build query params matching backend searchController expectations
    const params = new URLSearchParams();
    params.set('gender', filters.lookingFor);

    // Convert age range to ageMin/ageMax
    const agePreset = AGE_RANGES.find((r) => `${r.min}-${r.max}` === filters.ageRange);
    if (agePreset) {
      params.set('ageMin', agePreset.min);
      params.set('ageMax', agePreset.max);
    }

    if (filters.religion) params.set('religion', filters.religion);
    if (filters.community) params.set('caste', filters.community); // backend uses "caste" field
    if (filters.city) params.set('city', filters.city);

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="hero-search-bar"
      role="search"
      aria-label="Search for matrimonial profiles"
    >
      {/* Looking For */}
      <div className="hero-search-field">
        <label htmlFor="hs-lookingFor" className="hero-search-label">
          I Am Looking For
        </label>
        <div className="hero-search-select-wrap">
          <select
            id="hs-lookingFor"
            value={filters.lookingFor}
            onChange={(e) => onChange('lookingFor', e.target.value)}
            className="hero-search-select"
          >
            <option value="Female">Bride (Woman)</option>
            <option value="Male">Groom (Man)</option>
          </select>
          <ChevronDown className="hero-search-chevron" aria-hidden="true" />
        </div>
      </div>

      {/* Divider */}
      <div className="hero-search-divider" aria-hidden="true" />

      {/* Age */}
      <div className="hero-search-field">
        <label htmlFor="hs-age" className="hero-search-label">
          Age
        </label>
        <div className="hero-search-select-wrap">
          <select
            id="hs-age"
            value={filters.ageRange}
            onChange={(e) => onChange('ageRange', e.target.value)}
            className="hero-search-select"
          >
            {AGE_RANGES.map((r) => (
              <option key={r.label} value={`${r.min}-${r.max}`}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="hero-search-chevron" aria-hidden="true" />
        </div>
      </div>

      {/* Divider */}
      <div className="hero-search-divider" aria-hidden="true" />

      {/* Religion */}
      <div className="hero-search-field">
        <label htmlFor="hs-religion" className="hero-search-label">
          Religion
        </label>
        <div className="hero-search-select-wrap">
          <select
            id="hs-religion"
            value={filters.religion}
            onChange={(e) => onChange('religion', e.target.value)}
            className="hero-search-select"
          >
            <option value="">All Religions</option>
            {RELIGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <ChevronDown className="hero-search-chevron" aria-hidden="true" />
        </div>
      </div>

      {/* Divider */}
      <div className="hero-search-divider" aria-hidden="true" />

      {/* Community */}
      <div className="hero-search-field">
        <label htmlFor="hs-community" className="hero-search-label">
          Community
        </label>
        <div className="hero-search-select-wrap">
          <select
            id="hs-community"
            value={filters.community}
            onChange={(e) => onChange('community', e.target.value)}
            className="hero-search-select"
          >
            <option value="">Any</option>
            {COMMUNITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="hero-search-chevron" aria-hidden="true" />
        </div>
      </div>

      {/* Divider */}
      <div className="hero-search-divider" aria-hidden="true" />

      {/* City */}
      <div className="hero-search-field">
        <label htmlFor="hs-city" className="hero-search-label">
          City / Location
        </label>
        <div className="hero-search-select-wrap">
          <select
            id="hs-city"
            value={filters.city}
            onChange={(e) => onChange('city', e.target.value)}
            className="hero-search-select"
          >
            <option value="">All Cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="hero-search-chevron" aria-hidden="true" />
        </div>
      </div>

      {/* Search Button */}
      <button
        type="submit"
        disabled={isSearching}
        className="hero-search-btn"
        aria-label="Search profiles"
      >
        <Search className="w-4 h-4" aria-hidden="true" />
        <span>{isSearching ? 'Searching…' : 'Search'}</span>
      </button>
    </form>
  );
}
