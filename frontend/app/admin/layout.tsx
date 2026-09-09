'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminLayoutGuard } from '../../components/admin/AdminLayoutGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { fetchVerifications } from '../../services/verificationApi';
import { fetchReports } from '../../services/reportApi';
import { fetchIncompleteRegistrationsCount } from '../../services/adminApi';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicAuthPage =
    pathname === '/admin/login' ||
    pathname === '/admin/forgot-password' ||
    pathname === '/admin/reset-password';

  const [pendingVerifCount, setPendingVerifCount] = useState(0);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isPublicAuthPage) {
      // Fetch counters for sidebar badges
      fetchVerifications({ status: 'PENDING' })
        .then((res) => setPendingVerifCount(res?.data?.length || res?.pagination?.total || 0))
        .catch(() => {});

      fetchReports('PENDING')
        .then((items) => setPendingReportsCount(items?.length || 0))
        .catch(() => {});

      fetchIncompleteRegistrationsCount()
        .then((count) => setIncompleteCount(count || 0))
        .catch(() => {});
    }
  }, [pathname, isPublicAuthPage]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isPublicAuthPage) {
    return <div className="min-h-screen bg-[#070C16]">{children}</div>;
  }

  return (
    <AdminLayoutGuard>
      <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
        {/* Sidebar (Fixed on desktop, drawer on mobile) */}
        <AdminSidebar
          pendingCount={pendingVerifCount}
          reportsCount={pendingReportsCount}
          incompleteCount={incompleteCount}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 p-3 sm:p-[18px] lg:p-6 max-w-[1700px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminLayoutGuard>
  );
}
