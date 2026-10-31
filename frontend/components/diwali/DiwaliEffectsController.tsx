'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Flame } from 'lucide-react';
import { DiwaliEffect } from './types';
import { FloatingDiya } from './FloatingDiya';
import { FlowerPetalAnimation } from './FlowerPetalAnimation';
import { GoldenSparkles } from './GoldenSparkles';
import { SubtleFireworks } from './SubtleFireworks';
import { DiwaliSettingsPanel } from './DiwaliSettingsPanel';

const STORAGE_KEY = 'wj_diwali_effect_preference';

// Sequential order of effects in Auto (Gentle) mode
// Cycles: petals -> pause -> diyas -> pause -> sparkles -> pause -> fireworks -> pause
const AUTO_SEQUENCE: (DiwaliEffect | 'pause')[] = [
  'petals',
  'pause',
  'diyas',
  'pause',
  'sparkles',
  'pause',
  'fireworks',
  'pause',
];

export function DiwaliEffectsController() {
  const [mounted, setMounted] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<DiwaliEffect>('auto');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [autoStepIndex, setAutoStepIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Initialize preference from localStorage and reduced motion check
  useEffect(() => {
    setMounted(true);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (
        stored &&
        ['auto', 'petals', 'diyas', 'sparkles', 'fireworks', 'off'].includes(stored)
      ) {
        setSelectedEffect(stored as DiwaliEffect);
      }
    } catch {
      // LocalStorage access may fail in private mode
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  // Save selection
  const handleSelectEffect = useCallback((effect: DiwaliEffect) => {
    setSelectedEffect(effect);
    try {
      localStorage.setItem(STORAGE_KEY, effect);
    } catch {
      // Ignore
    }
  }, []);

  // Auto rotation timer: changes effect every 8-10 seconds
  useEffect(() => {
    if (selectedEffect !== 'auto' || prefersReducedMotion) {
      return;
    }

    const currentStep = AUTO_SEQUENCE[autoStepIndex];
    // Active animation runs for 8s; pause period is 3s for a calm natural rhythm
    const duration = currentStep === 'pause' ? 3000 : 8000;

    const timer = setTimeout(() => {
      setAutoStepIndex((prev) => (prev + 1) % AUTO_SEQUENCE.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [selectedEffect, autoStepIndex, prefersReducedMotion]);

  if (!mounted) {
    return null;
  }

  // If reduced motion is active, festive motion effects are automatically suppressed
  const effectiveMode = prefersReducedMotion ? 'off' : selectedEffect;

  // Determine which single active animation to render
  let activeAnimationToRender: DiwaliEffect = 'off';
  let currentAutoEffect: DiwaliEffect | undefined = undefined;

  if (effectiveMode === 'auto') {
    const currentStep = AUTO_SEQUENCE[autoStepIndex];
    if (currentStep !== 'pause') {
      activeAnimationToRender = currentStep;
      currentAutoEffect = currentStep;
    } else {
      activeAnimationToRender = 'off';
    }
  } else {
    activeAnimationToRender = effectiveMode;
  }

  const isEffectsActive = effectiveMode !== 'off';

  return (
    <>
      {/* ── Active Festive Animation Layer (Single effect rendered at a time) ── */}
      {activeAnimationToRender === 'petals' && (
        <FlowerPetalAnimation density={effectiveMode === 'auto' ? 'gentle' : 'normal'} />
      )}
      {activeAnimationToRender === 'diyas' && (
        <FloatingDiya density={effectiveMode === 'auto' ? 'gentle' : 'normal'} />
      )}
      {activeAnimationToRender === 'sparkles' && (
        <GoldenSparkles density={effectiveMode === 'auto' ? 'gentle' : 'normal'} />
      )}
      {activeAnimationToRender === 'fireworks' && (
        <SubtleFireworks density={effectiveMode === 'auto' ? 'gentle' : 'normal'} />
      )}

      {/* ── Floating Diwali Sticker / Control Button (Bottom Right) ── */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
        <button
          onClick={() => setIsPanelOpen((prev) => !prev)}
          aria-expanded={isPanelOpen}
          aria-haspopup="dialog"
          aria-label={`Diwali Effects settings. Currently ${isEffectsActive ? 'ON' : 'OFF'}`}
          className={`group flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 border transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
            isEffectsActive
              ? 'border-amber-300 shadow-amber-500/15 ring-2 ring-amber-400/20'
              : 'border-slate-200 shadow-slate-900/5 text-slate-500'
          }`}
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Diya Icon with soft golden glow */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
              isEffectsActive ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                isEffectsActive ? 'fill-amber-500 text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]' : ''
              }`}
            />
          </div>

          {/* Text: Diwali Effects */}
          <span className="text-xs font-serif font-bold tracking-tight text-slate-800">
            Diwali Effects
          </span>

          {/* ON / OFF Indicator Badge */}
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold tracking-wide uppercase transition-colors ${
              isEffectsActive
                ? 'bg-amber-100 text-amber-800 border border-amber-300/60'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {isEffectsActive ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* ── Settings Panel Modal ── */}
      <DiwaliSettingsPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        selectedEffect={selectedEffect}
        onSelectEffect={handleSelectEffect}
        currentAutoEffect={currentAutoEffect}
      />
    </>
  );
}
