'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAdminAuthenticated } from '../../services/authApi';
import { Loader2 } from 'lucide-react';

export function AdminLayoutGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(pathname !== '/admin/login');
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const authenticated = isAdminAuthenticated();
    setIsAuth(authenticated);

    if (pathname === '/admin/login') {
      if (authenticated) {
        router.replace('/admin/dashboard');
      } else {
        setChecking(false);
      }
    } else if (pathname === '/admin') {
      if (authenticated) {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/admin/login');
      }
    } else {
      if (!authenticated) {
        router.replace('/admin/login');
      } else {
        setChecking(false);
      }
    }
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-3" />
        <p className="text-sm font-semibold text-slate-300">Verifying Admin Access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
