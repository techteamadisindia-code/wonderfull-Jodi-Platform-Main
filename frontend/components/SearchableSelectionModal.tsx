'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Check, Globe, MapPin, Building, ChevronRight } from 'lucide-react';

export interface SelectionItem {
  id: string;
  name: string;
  secondaryText?: string;
  badge?: string;
  isTop?: boolean;
}

interface SearchableSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder?: string;
  items: SelectionItem[];
  selectedId?: string;
  onSelect: (item: SelectionItem) => void;
  loading?: boolean;
  onSearchChange?: (query: string) => void;
  topSectionTitle?: string;
  showTopSection?: boolean;
  emptyMessage?: string;
  allowCustom?: boolean;
  customPrompt?: string;
  onCustomSubmit?: (value: string) => void;
}

export function SearchableSelectionModal({
  isOpen,
  onClose,
  title,
  placeholder = 'Type to search...',
  items,
  selectedId,
  onSelect,
  loading = false,
  onSearchChange,
  topSectionTitle = 'Top Options',
  showTopSection = true,
  emptyMessage = 'No matches found',
  allowCustom = false,
  customPrompt = 'Other / Type custom name',
  onCustomSubmit,
}: SearchableSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setCustomValue('');
      setShowCustomInput(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearchChange) {
      onSearchChange(query);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.secondaryText && item.secondaryText.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const topItems = useMemo(() => {
    if (!showTopSection || searchQuery.trim()) return [];
    return items.filter((i) => i.isTop);
  }, [items, showTopSection, searchQuery]);

  const regularItems = useMemo(() => {
    if (!showTopSection || searchQuery.trim()) return filteredItems;
    return filteredItems.filter((i) => !i.isTop);
  }, [filteredItems, showTopSection, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-[#E51F3E]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
              <p className="text-[11px] font-medium text-slate-400">Search & select from official directory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={placeholder}
              className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/10 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (onSearchChange) onSearchChange('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-[#E51F3E] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading options...</span>
            </div>
          ) : (
            <>
              {/* TOP / POPULAR SECTION */}
              {topItems.length > 0 && (
                <div className="pb-2 mb-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {topSectionTitle}
                  </div>
                  <div className="space-y-1">
                    {topItems.map((item) => {
                      const isSelected = selectedId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelect(item);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition ${
                            isSelected
                              ? 'bg-rose-50/80 border border-rose-200 text-[#E51F3E]'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-[#E51F3E] bg-[#E51F3E]' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm font-semibold">{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ALL ITEMS SECTION */}
              <div>
                {topItems.length > 0 && !searchQuery.trim() && (
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    All Options
                  </div>
                )}

                {regularItems.length === 0 && topItems.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
                    {allowCustom && (
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(true)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#E51F3E] hover:underline"
                      >
                        Add &quot;{searchQuery}&quot; as custom value
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {regularItems.map((item) => {
                      const isSelected = selectedId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelect(item);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition ${
                            isSelected
                              ? 'bg-rose-50/80 border border-rose-200 text-[#E51F3E]'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-[#E51F3E] bg-[#E51F3E]' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <span className="text-sm font-semibold">{item.name}</span>
                              {item.secondaryText && (
                                <span className="block text-[11px] font-normal text-slate-400">
                                  {item.secondaryText}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* CUSTOM VALUE / FOOTER */}
        {allowCustom && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/60">
            {showCustomInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Enter custom name..."
                  className="flex-1 h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#E51F3E]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customValue.trim() && onCustomSubmit) {
                      onCustomSubmit(customValue.trim());
                      onClose();
                    }
                  }}
                  className="h-9 px-4 rounded-lg bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#c91834] transition"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="h-9 px-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomValue(searchQuery);
                  setShowCustomInput(true);
                }}
                className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-[#E51F3E] transition flex items-center justify-center gap-1"
              >
                <span>{customPrompt}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
