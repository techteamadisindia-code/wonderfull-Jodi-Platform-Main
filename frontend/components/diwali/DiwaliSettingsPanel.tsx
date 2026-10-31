'use client';

import React, { useEffect, useRef } from 'react';
import { Sparkles, Flower2, Flame, Star, PartyPopper, EyeOff, X, Check } from 'lucide-react';
import { DiwaliEffect, DIWALI_EFFECT_OPTIONS } from './types';

interface DiwaliSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEffect: DiwaliEffect;
  onSelectEffect: (effect: DiwaliEffect) => void;
  currentAutoEffect?: DiwaliEffect;
}

export function DiwaliSettingsPanel({
  isOpen,
  onClose,
  selectedEffect,
  onSelectEffect,
  currentAutoEffect,
}: DiwaliSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use small timeout so the button click itself doesn't trigger outside click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = (id: DiwaliEffect) => {
    switch (id) {
      case 'auto':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'petals':
        return <Flower2 className="w-4 h-4 text-rose-500" />;
      case 'diyas':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'sparkles':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'fireworks':
        return <PartyPopper className="w-4 h-4 text-amber-600" />;
      case 'off':
        return <EyeOff className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Diwali Animation Settings"
      aria-modal="true"
      className="fixed bottom-20 right-4 sm:right-6 z-50 w-[310px] sm:w-[340px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-amber-200/80 p-4 animate-scale-in text-slate-800 backdrop-blur-md"
      style={{
        boxShadow: '0 12px 36px -8px rgba(217, 119, 6, 0.22), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shadow-2xs">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-slate-900 leading-tight">
              Diwali Celebrations
            </h3>
            <p className="text-[11px] text-slate-500 leading-tight">
              Select your preferred festive animation
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close Diwali Settings"
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Options List */}
      <div className="py-2.5 space-y-1.5 max-h-[340px] overflow-y-auto">
        {DIWALI_EFFECT_OPTIONS.map((opt) => {
          const isSelected = selectedEffect === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => {
                onSelectEffect(opt.id);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-300/80 shadow-2xs'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-white shadow-2xs border border-amber-200/60' : 'bg-slate-50'
                }`}
              >
                {renderIcon(opt.id)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isSelected ? 'text-amber-900 font-bold' : 'text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-500 leading-tight line-clamp-1">
                  {opt.description}
                </p>
                {opt.id === 'auto' && isSelected && currentAutoEffect && (
                  <p className="text-[9.5px] font-medium text-amber-700 mt-0.5">
                    Currently showing: <span className="underline capitalize">{currentAutoEffect}</span>
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-amber-100/80 flex items-center justify-between text-[10.5px] text-slate-400">
        <span>Preferences saved locally</span>
        <button
          onClick={() => onSelectEffect('off')}
          className="text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
        >
          Turn off all
        </button>
      </div>
    </div>
  );
}
