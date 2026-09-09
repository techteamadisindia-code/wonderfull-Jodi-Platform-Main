'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
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
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  X,
} from 'lucide-react';
import { adminLogout, getAdminUser } from '../../services/authApi';
import { Logo } from '../Logo';

interface AdminSidebarProps {
  pendingCount?: number;
  reportsCount?: number;
  incompleteCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  pendingCount = 0,
  reportsCount = 0,
  incompleteCount = 0,
  mobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
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
      group: 'CORE OPERATIONS',
      items: [
        {
          href: '/admin/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          href: '/admin/unregistered-candidates',
          label: 'Incomplete Registrations',
          icon: UserPlus,
          badge: incompleteCount > 0 ? String(incompleteCount) : undefined,
          badgeColor: 'bg-rose-500 text-white font-bold',
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
      group: 'MONETIZATION & PLANS',
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
      group: 'ENGAGEMENT & SAFETY',
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
      group: 'SYSTEM & SECURITY',
      items: [
        {
          href: '/admin/master-data',
          label: 'Master Data (LGD/Caste)',
          icon: Database,
        },
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1120] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="h-14 sm:h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80 bg-[#070B14]/80">
        <Logo
          size="md"
          variant="dark"
          showText={!collapsed || mobileOpen}
          subtitle="ADMIN CONSOLE"
          href="/admin/dashboard"
          onClick={onCloseMobile}
        />

        {/* Desktop collapse toggle or Mobile close button */}
        {mobileOpen ? (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            aria-label="Close menu"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/70 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-0.5 sm:space-y-1">
            {(!collapsed || mobileOpen) && (
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                  onClick={onCloseMobile}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] sm:text-[13.5px] font-medium transition-all duration-150 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] text-white font-semibold shadow-md shadow-red-950/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {(!collapsed || mobileOpen) && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {(!collapsed || mobileOpen) && item.badge && (
                    <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                  {collapsed && !mobileOpen && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0B1120]"></span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Admin User Footer & Logout */}
      <div className="p-2.5 border-t border-slate-800/80 bg-[#070B14]/80 space-y-1.5">
        {(!collapsed || mobileOpen) && (
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">
                {adminUser?.fullName || 'Admin User'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {adminUser?.email || 'admin@wonderfuljodi.com'}
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Super Admin
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            target="_blank"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-[11.5px] font-medium text-slate-300 hover:text-white transition"
            title="Open Live Public Site in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {(!collapsed || mobileOpen) && <span>Public Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-300 hover:text-white transition text-[11.5px] font-medium inline-flex items-center justify-center gap-1.5"
            title="Sign out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            {(!collapsed || mobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-800/80 transition-all duration-300 shrink-0 min-h-screen sticky top-0 h-screen ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 md:hidden flex"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 max-w-[85vw] h-full shadow-2xl animate-slide-right"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
