'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Search,
  CheckCircle2,
  Server,
  User,
  Shield,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { getAdminUser } from '../../services/authApi';
import apiClient from '../../services/api';

export function AdminHeader() {
  const pathname = usePathname();
  const adminUser = getAdminUser();
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // Check backend health periodically
    const checkHealth = async () => {
      try {
        const res = await apiClient.get('/health');
        if (res.data?.status === 'ok') {
          setBackendHealthy(true);
        } else {
          setBackendHealthy(false);
        }
      } catch {
        setBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute breadcrumb title from pathname
  const getPageTitle = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return 'Dashboard Overview';
    const slug = parts[1];
    switch (slug) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'users':
        return 'User Accounts Management';
      case 'profiles':
        return 'Matrimonial Profiles Directory';
      case 'verification':
        return 'KYC & Qualification Verifications';
      case 'memberships':
        return 'Membership Plans & Subscriptions';
      case 'payments':
        return 'Payments & Revenue Transactions';
      case 'interests':
        return 'Matchmaking Interests Log';
      case 'shortlists':
        return 'Profile Shortlists Tracker';
      case 'messages':
        return 'Messaging & Conversations Monitor';
      case 'reports':
        return 'Abuse & Safety Moderation';
      case 'notifications':
        return 'Broadcast Notifications & Alerts';
      case 'admins':
        return 'Admin Team & Permissions';
      case 'settings':
        return 'Platform Configuration & Settings';
      default:
        return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Title & Breadcrumbs */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-red-600 font-medium capitalize">
            {pathname.split('/')[1] || 'dashboard'}
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right: Health Status, Quick Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Backend Status Indicator */}
        <div
          className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            backendHealthy
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : backendHealthy === false
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title="Backend connection status on http://localhost:5000"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span>{backendHealthy ? 'API Online (:5000)' : 'API Connecting...'}</span>
        </div>

        {/* View Public Matrimony Portal Link */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          <span>Live Site</span>
        </Link>

        {/* Notifications Icon Button */}
        <Link
          href="/admin/notifications"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition relative"
          title="Broadcast notifications center"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
        </Link>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {adminUser?.fullName ? adminUser.fullName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {adminUser?.fullName || 'Administrator'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
