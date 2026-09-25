'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { Search, Loader2, Building2, Check, Plus, X } from 'lucide-react';

export interface InstitutionItem {
  _id: string;
  name: string;
  normalizedName?: string;
  type?: string;
  city?: string;
  state?: string;
  country?: string;
  usageCount?: number;
  isVerified?: boolean;
}

interface InstitutionAutocompleteProps {
  label?: string;
  value: string;
  institutionId?: string;
  onChange: (name: string, institutionId?: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function InstitutionAutocomplete({
  label = 'Medical College / University',
  value,
  institutionId,
  onChange,
  placeholder = 'Search or enter college name (e.g. Grant Medical, AIIMS)',
  required = false,
  error = '',
  disabled = false,
  className = '',
}: InstitutionAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<InstitutionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize internal query state if outer value changes externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get(`/institutions/search?q=${encodeURIComponent(trimmed)}&limit=15`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSuggestions(res.data.data);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.warn('Institution search notice:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    onChange(newVal, undefined); // clear ID when user types fresh query
    setIsOpen(true);
    setHighlightedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newVal.trim().length >= 2) {
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(newVal);
      }, 280);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  const handleSelect = (item: InstitutionItem) => {
    setQuery(item.name);
    onChange(item.name, item._id);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleCreateNew = async () => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setIsCreating(true);
    try {
      const res = await api.post('/institutions', {
        name: trimmed,
        type: 'COLLEGE',
      });

      if (res.data?.success && res.data.data) {
        const created: InstitutionItem = res.data.data;
        setQuery(created.name);
        onChange(created.name, created._id);
        setIsOpen(false);
      } else {
        onChange(trimmed, undefined);
        setIsOpen(false);
      }
    } catch (err) {
      console.warn('Institution save notice (fallback to text):', err);
      onChange(trimmed, undefined);
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    // Total items include suggestions + 1 (for create button if query length >= 2)
    const canCreate = query.trim().length >= 2 && !suggestions.some(
      (s) => s.name.toLowerCase() === query.trim().toLowerCase()
    );
    const totalOptions = suggestions.length + (canCreate ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 >= totalOptions ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 < 0 ? totalOptions - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (canCreate && highlightedIndex === suggestions.length) {
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onChange('', undefined);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const isExactMatch = suggestions.some(
    (s) => s.name.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
          {label} {required && <span className="text-[#E51F3E]">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#E51F3E]" />
          ) : (
            <Building2 className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
              if (suggestions.length === 0) performSearch(query);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full h-[46px] pl-10 pr-9 rounded-[12px] border ${
            error
              ? 'border-rose-500 bg-rose-50/20'
              : institutionId
              ? 'border-emerald-300 bg-emerald-50/10'
              : 'border-[#DCE3EC] bg-white'
          } text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/10 transition disabled:bg-slate-50 disabled:text-slate-500`}
        />

        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition"
            title="Clear institution"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-600 font-medium mt-1">{error}</p>}

      {/* Floating Suggestions Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden max-h-72 overflow-y-auto animate-fade-in">
          {/* Header */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Suggestions ({suggestions.length})</span>
            <span>WJ Medical Directory</span>
          </div>

          {suggestions.length > 0 ? (
            <ul className="divide-y divide-slate-100 text-left">
              {suggestions.map((item, idx) => {
                const isSelected = item._id === institutionId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={item._id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between text-xs transition ${
                      isHighlighted
                        ? 'bg-rose-50/80 text-[#E51F3E]'
                        : isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-medium'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex-1 pr-3">
                      <p className="font-semibold text-slate-900 leading-snug">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {item.city && <span>{item.city}</span>}
                        {item.state && <span>• {item.state}</span>}
                        {item.type && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium text-[10px] uppercase">
                            {item.type}
                          </span>
                        )}
                        {item.isVerified && (
                          <span className="text-emerald-600 font-medium text-[10px]">Verified</span>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          ) : (
            !isLoading && (
              <div className="p-4 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-700">No matching institution found in directory.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You can add your institution below and it will be saved to the database for future suggestions.
                </p>
              </div>
            )
          )}

          {/* Option to create new institution if query is not an exact match */}
          {!isExactMatch && query.trim().length >= 2 && (
            <div className="p-2 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={isCreating}
                className={`w-full py-2 px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-[#E51F3E] text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer ${
                  highlightedIndex === suggestions.length ? 'ring-2 ring-[#E51F3E]' : ''
                }`}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add "{query.trim()}" to Directory</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
