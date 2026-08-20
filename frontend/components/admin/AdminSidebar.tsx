'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShieldCheck,
  CreditCard,
  Receipt,
  HeartHandshake,
  Bookmark,
  MessageSquare,
  AlertTriangle,
  BellRing,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  FileText,
  MailQuestion
} from 'lucide-react';
import { adminLogout, getAdminUser } from '../../services/authApi';

interface AdminSidebarProps {
  pendingCount?: number;
  reportsCount?: number;
}

export function AdminSidebar({ pendingCount = 0, reportsCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const adminUser = getAdminUser();

  const handleLogout = () => {
    adminLogout();
    router.push('/admin/login');
  };

  const navGroups = [
    {
      group: 'Core Operations',
      items: [
        {
          href: '/admin/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          href: '/admin/users',
          label: 'User Accounts',
          icon: Users,
        },
        {
          href: '/admin/profiles',
          label: 'Profiles Directory',
          icon: UserCheck,
        },
        {
          href: '/admin/verification',
          label: 'Verification Queue',
          icon: ShieldCheck,
          badge: pendingCount > 0 ? String(pendingCount) : undefined,
          badgeColor: 'bg-amber-500 text-slate-950 font-bold',
        },
      ],
    },
    {
      group: 'Monetization & Plans',
      items: [
        {
          href: '/admin/memberships',
          label: 'Memberships',
          icon: CreditCard,
        },
        {
          href: '/admin/payments',
          label: 'Payments & Revenue',
          icon: Receipt,
        },
      ],
    },
    {
      group: 'Engagement & Safety',
      items: [
        {
          href: '/admin/interests',
          label: 'Match Interests',
          icon: HeartHandshake,
        },
        {
          href: '/admin/shortlists',
          label: 'Shortlists',
          icon: Bookmark,
        },
        {
          href: '/admin/messages',
          label: 'Messages Monitor',
          icon: MessageSquare,
        },
        {
          href: '/admin/reports',
          label: 'Abuse & Reports',
          icon: AlertTriangle,
          badge: reportsCount > 0 ? String(reportsCount) : undefined,
          badgeColor: 'bg-rose-500 text-white font-bold',
        },
        {
          href: '/admin/notifications',
          label: 'Broadcasts',
          icon: BellRing,
        },
      ],
    },
    {
      group: 'System & Security',
      items: [
        {
          href: '/admin/admins',
          label: 'Admin Team & Roles',
          icon: ShieldAlert,
        },
        {
          href: '/admin/settings',
          label: 'Platform Settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-[#0F172A] text-slate-200 border-r border-slate-800/80 transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-72'
      } shrink-0 min-h-screen`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-slate-800/70 bg-[#0B1120]/60">
        <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E51F3E] via-[#E82645] to-[#F03554] flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
            <Heart className="w-5 h-5 fill-white stroke-none" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-serif text-lg font-bold text-white tracking-tight leading-none">
                Wonderful <span className="text-[#E51F3E]">Jodi</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase font-bold text-amber-400 mt-1">
                Admin Console
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/70 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1.5">
            {!collapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600/90 to-rose-600/90 text-white shadow-md shadow-red-900/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Admin User Footer & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0B1120]/40 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">
                {adminUser?.fullName || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {adminUser?.email || 'admin@wonderfuljodi.com'}
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Superadmin
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            target="_blank"
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition"
            title="Open Live Public Site in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {!collapsed && <span>Public Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-300 hover:text-white transition text-xs font-medium inline-flex items-center justify-center gap-1.5"
            title="Sign out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
