'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminAuthenticated } from '../../services/authApi';
import { Loader2 } from 'lucide-react';

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
    </div>
  );
}
