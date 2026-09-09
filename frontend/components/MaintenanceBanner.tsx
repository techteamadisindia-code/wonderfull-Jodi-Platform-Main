'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';

export function MaintenanceBanner() {
  const { maintenance, isBannerDismissed, dismissBanner } = useMaintenance();
  const pathname = usePathname();

  // Do not show banner on admin pages or if banner is disabled/dismissed or if full maintenance is active
  if (
    !maintenance?.banner ||
    maintenance?.enabled ||
    isBannerDismissed ||
    pathname?.startsWith('/admin')
  ) {
    return null;
  }

  const message =
    maintenance.message ||
    'Wonderful Jodi is currently undergoing scheduled maintenance. Some features may be temporarily unavailable.';

  return (
    <aside
      aria-label="Maintenance Announcement"
      className="bg-gradient-to-r from-amber-500 via-amber-600 to-rose-500 text-white text-xs font-semibold py-2.5 px-4 relative z-50 shadow-sm flex items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-center gap-2.5 max-w-5xl mx-auto flex-1 justify-center text-center">
        <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
        <span className="leading-snug">
          <strong className="underline underline-offset-2 mr-1">Scheduled Maintenance:</strong>
          {message}
        </span>
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
