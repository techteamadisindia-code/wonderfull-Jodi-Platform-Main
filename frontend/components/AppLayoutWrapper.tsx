'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useMaintenance, MaintenanceProvider } from '../context/MaintenanceContext';
import { MaintenancePage } from './MaintenancePage';
import { MaintenanceBanner } from './MaintenanceBanner';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { maintenance, loading } = useMaintenance();
  const pathname = usePathname() || '';

  // 1. Identify Route Types
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminAuthRoute = [
    '/admin/login',
    '/admin/forgot-password',
    '/admin/reset-password',
  ].some((r) => pathname === r || pathname.startsWith(`${r}/`));

  // Prevent protected public content from flashing before initial maintenance status is loaded
  if (loading && !maintenance && !isAdminRoute) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPublicAuthRoute = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/register',
  ].some((r) => pathname === r || pathname.startsWith(`${r}/`));

  const isMaintenanceActive = Boolean(maintenance?.enabled);
  const isBannerActive = Boolean(maintenance?.banner);

  // 2. ADMIN ROUTES
  if (isAdminRoute) {
    // Admin auth & recovery routes are ALWAYS accessible so administrators can log in or recover
    if (isAdminAuthRoute) {
      return <>{children}</>;
    }

    // For other admin routes:
    // When full maintenance mode is active:
    // Backend maintenanceMiddleware authoritatively gates APIs. If allowAdminAccess === false,
    // ordinary admins receive HTTP 503 while the Primary Super Admin retains full recovery access.
    return <>{children}</>;
  }

  // 3. FULL MAINTENANCE MODE (PUBLIC VISITOR VIEW)
  if (isMaintenanceActive) {
    // During full maintenance mode, all public visitors (including public auth routes)
    // receive the full-screen MaintenancePage. The announcement banner is NOT rendered separately.
    return <MaintenancePage />;
  }

  // 4. PUBLIC AUTH ROUTES (NORMAL & BANNER-ONLY MODE)
  if (isPublicAuthRoute) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col">
        {isBannerActive && <MaintenanceBanner />}
        {children}
      </div>
    );
  }

  // 5. PUBLIC WEBSITE (NORMAL & BANNER-ONLY MODE)
  // When isBannerActive === true: renders MaintenanceBanner + Navbar + page content + Footer
  // When isBannerActive === false: MaintenanceBanner returns null, rendering Navbar + page content + Footer
  return (
    <>
      <MaintenanceBanner />
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MaintenanceProvider>
      <LayoutContent>{children}</LayoutContent>
    </MaintenanceProvider>
  );
}
