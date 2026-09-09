'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAdminAuthenticated } from '../../services/authApi';
import { Loader2 } from 'lucide-react';

export function AdminLayoutGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicAuthPage =
    pathname === '/admin/login' ||
    pathname === '/admin/forgot-password' ||
    pathname === '/admin/reset-password';

  const [checking, setChecking] = useState(!isPublicAuthPage);

  useEffect(() => {
    if (isPublicAuthPage) {
      setChecking(false);
      return;
    }

    const authenticated = isAdminAuthenticated();
    if (!authenticated) {
      const redirectQuery =
        pathname && pathname !== '/admin' && pathname !== '/admin/login'
          ? `?redirect=${encodeURIComponent(pathname)}`
          : '';
      router.replace(`/admin/login${redirectQuery}`);
    } else {
      setChecking(false);
    }
  }, [pathname, router, isPublicAuthPage]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#070C16] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#E51F3E] mb-3" />
        <p className="text-sm font-semibold text-slate-300">Verifying Admin Access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
