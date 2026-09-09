'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X, Check } from 'lucide-react';
import { searchStructuredLocations, StructuredBirthPlace } from '../services/kundaliApi';

interface LocationAutocompleteProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value?: StructuredBirthPlace | null;
  onChange: (location: StructuredBirthPlace) => void;
  required?: boolean;
  error?: string;
}

export default function LocationAutocomplete({
  id = 'location-search',
  label = 'Birth Place',
  placeholder = 'Search village, taluka, city, or district...',
  value,
  onChange,
  required = false,
  error,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState<StructuredBirthPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal input text when parent value changes externally
  useEffect(() => {
    if (value?.name && value.name !== query) {
      setQuery(value.name);
    }
  }, [value?.name]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const results = await searchStructuredLocations(query);
        setSuggestions(results);
      } catch (err) {
        console.error('Location search error:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (item: StructuredBirthPlace) => {
    setQuery(item.name);
    onChange(item);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onChange({
      name: '',
      latitude: 18.5204,
      longitude: 73.8567,
      timezone: 'Asia/Kolkata',
    });
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-rose-600 font-bold">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <MapPin className="w-4 h-4 text-[#85132A]" />
        </div>

        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 text-sm bg-white rounded-xl border transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#85132A]/20 ${
            error
              ? 'border-rose-300 focus:border-rose-500'
              : 'border-slate-200 hover:border-slate-300 focus:border-[#85132A]'
          } text-[#0F172A] placeholder-slate-400`}
          autoComplete="off"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {isLoading && <Loader2 className="w-4 h-4 text-[#85132A] animate-spin" />}
          {!isLoading && query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Clear location input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs font-medium text-rose-600 mt-1">{error}</p>}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-72 overflow-y-auto overflow-x-hidden p-1.5 divide-y divide-slate-100">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#85132A]" />
              <span>Searching Indian villages, talukas & cities...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No matching locations found. Try searching by village, taluka, or district name.
            </div>
          ) : (
            suggestions.map((loc, idx) => {
              const isSelected = value?.name === loc.name;
              return (
                <button
                  key={`${loc.name}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-rose-50/80 text-[#85132A] font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5 pr-2">
                    <MapPin className="w-3.5 h-3.5 text-[#85132A] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 text-xs leading-snug">
                        {loc.village || loc.city || loc.taluka || loc.name.split(',')[0]}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {loc.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {loc.village && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        Village
                      </span>
                    )}
                    {loc.taluka && !loc.village && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                        Taluka
                      </span>
                    )}
                    {loc.city && !loc.village && !loc.taluka && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                        City
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-[#85132A]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
