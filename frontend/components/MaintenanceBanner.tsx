'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';

export function MaintenanceBanner() {
  const { maintenance, isBannerDismissed, dismissBanner } = useMaintenance();
  const pathname = usePathname();

  // 1. Must be enabled by maintenance.banner flag
  if (!maintenance?.banner) {
    return null;
  }

  // 2. Hide when full-screen maintenance page is active to avoid duplicate announcements
  if (maintenance?.enabled) {
    return null;
  }

  // 3. Hide on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // 4. Respect dismissal for the current announcement configuration
  if (isBannerDismissed) {
    return null;
  }

  const title = maintenance.title || 'Scheduled Maintenance';
  const message =
    maintenance.message ||
    'Wonderful Jodi is currently undergoing scheduled maintenance. Some features may be temporarily unavailable.';

  const formattedEndTime = (() => {
    if (!maintenance.estimatedEndTime) return null;
    try {
      const d = new Date(maintenance.estimatedEndTime);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  })();

  return (
    <aside
      aria-label="Maintenance Announcement"
      className="bg-gradient-to-r from-amber-500 via-amber-600 to-rose-500 text-white text-xs font-semibold py-2.5 px-4 relative z-50 shadow-sm flex items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-center gap-2.5 max-w-5xl mx-auto flex-1 justify-center text-center flex-wrap">
        <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
        <span className="leading-snug">
          <strong className="underline underline-offset-2 mr-1">{title}:</strong>
          {message}
        </span>
        {formattedEndTime && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-medium ml-1">
            <Clock className="w-3 h-3" />
            Expected by {formattedEndTime}
          </span>
        )}
      </div>

      <button
        onClick={dismissBanner}
        aria-label="Dismiss maintenance banner"
        className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
}
