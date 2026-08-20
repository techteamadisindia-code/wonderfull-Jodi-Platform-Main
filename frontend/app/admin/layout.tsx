'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminLayoutGuard } from '../../components/admin/AdminLayoutGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { fetchVerifications } from '../../services/verificationApi';
import { fetchReports } from '../../services/reportApi';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  const [pendingVerifCount, setPendingVerifCount] = useState(0);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  useEffect(() => {
    if (!isLoginPage) {
      // Fetch counters for sidebar badges
      fetchVerifications('PENDING')
        .then((items) => setPendingVerifCount(items?.length || 0))
        .catch(() => {});

      fetchReports('PENDING')
        .then((items) => setPendingReportsCount(items?.length || 0))
        .catch(() => {});
    }
  }, [pathname, isLoginPage]);

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-950">{children}</div>;
  }

  return (
    <AdminLayoutGuard>
      <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
        {/* Collapsible Sidebar */}
        <AdminSidebar
          pendingCount={pendingVerifCount}
          reportsCount={pendingReportsCount}
        />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-[1700px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminLayoutGuard>
  );
}
