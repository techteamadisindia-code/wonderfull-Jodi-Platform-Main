'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useMaintenance, MaintenanceProvider } from '../context/MaintenanceContext';
import { MaintenancePage } from './MaintenancePage';
import { MaintenanceBanner } from './MaintenanceBanner';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { maintenance } = useMaintenance();
  const pathname = usePathname();

  // Check route types
  const isAdminRoute = pathname?.startsWith('/admin');
  const isAuthRoute = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/register',
  ].some((route) => pathname === route || pathname?.startsWith(`${route}/`));

  // If maintenance mode is ON and visitor is not accessing admin panel or auth pages, show maintenance page
  if (maintenance?.enabled && !isAdminRoute) {
    return <MaintenancePage />;
  }

  // Admin routes: Render admin content directly (handled by AdminSidebar/AdminHeader)
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Standalone Authentication routes: Render clean full-viewport auth screen without public Header/Footer
  if (isAuthRoute) {
    return <div className="min-h-screen min-h-[100dvh] flex flex-col">{children}</div>;
  }

  // Public Website Layout: Includes MaintenanceBanner, Navbar, Main Content, and Footer
  return (
    <>
      <MaintenanceBanner />
      <Navbar />
      <div className="flex-1 flex flex-col">{children}</div>
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
