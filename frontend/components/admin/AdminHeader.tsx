'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ExternalLink,
  Menu,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getAdminUser } from '../../services/authApi';
import apiClient from '../../services/api';

interface AdminHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function AdminHeader({ onOpenMobileMenu }: AdminHeaderProps) {
  const pathname = usePathname();
  const adminUser = getAdminUser();
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await apiClient.get('/health');
        if (isMounted) {
          if (res.data?.status === 'ok') {
            setBackendHealthy(true);
          } else {
            setBackendHealthy(false);
          }
        }
      } catch {
        if (isMounted) {
          setBackendHealthy(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
        return 'Profiles Directory';
      case 'verification':
        return 'Verification Queue';
      case 'memberships':
        return 'Memberships & Plans';
      case 'payments':
        return 'Payments & Revenue';
      case 'interests':
        return 'Match Interests';
      case 'shortlists':
        return 'Shortlists';
      case 'messages':
        return 'Messages Monitor';
      case 'reports':
        return 'Abuse & Reports';
      case 'notifications':
        return 'Broadcasts & Alerts';
      case 'admins':
        return 'Admin Team & Roles';
      case 'campaigns':
        return 'Seasonal Campaigns & Rule Engine';
      case 'coupons':
        return 'Coupon Management';
      case 'referrals':
        return 'Referrals & Member Attribution';
      case 'referral-rewards':
        return 'Referral Reward Configuration';
      case 'settings':
        return 'Platform Settings';
      default:
        return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
  };

  const getBreadcrumbSub = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 1 || parts[1] === 'dashboard') return 'Admin';
    return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200/90 px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger & Breadcrumbs/Title */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        )}

        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 leading-none">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-[#E51F3E] font-medium">{getBreadcrumbSub()}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight mt-0.5">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: API Status Indicator, Live Site, Bell, Divider, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Platform Status Indicator */}
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60"
          title="Click to manage platform maintenance mode in settings"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Platform Online</span>
          <span className="sm:hidden">Online</span>
        </Link>

        {/* API Health Status Indicator */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
            backendHealthy === true
              ? 'bg-slate-50 text-slate-700 border-slate-200'
              : backendHealthy === false
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={
            backendHealthy === true
              ? 'Backend API is connected and responding on port :5000'
              : backendHealthy === false
              ? 'Backend API offline on http://localhost:5000'
              : 'Checking API status...'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendHealthy === true
                ? 'bg-emerald-500 animate-pulse'
                : backendHealthy === false
                ? 'bg-rose-500'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="hidden sm:inline">
            {backendHealthy === true
              ? 'API Online (:5000)'
              : backendHealthy === false
              ? 'API Offline'
              : 'Connecting...'}
          </span>
          <span className="sm:hidden">
            {backendHealthy === true ? ':5000' : 'Offline'}
          </span>
        </div>

        {/* Live Site button */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 shadow-2xs transition"
          title="Open live user site in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          <span>Live Site</span>
        </Link>

        {/* Notification Bell */}
        <Link
          href="/admin/notifications"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition relative"
          title="Broadcasts & Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E51F3E]"></span>
        </Link>

        {/* Vertical Divider */}
        <div className="h-5 w-[1px] bg-slate-200" />

        {/* Admin Avatar & Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold text-[11px] shadow-xs ring-2 ring-slate-100 shrink-0">
            {adminUser?.fullName ? adminUser.fullName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {adminUser?.fullName || 'Admin User'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold leading-none">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
