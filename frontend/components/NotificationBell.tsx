'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Crown,
  AlertTriangle,
  Info,
  ArrowRight,
  RefreshCw,
  Heart,
  MessageSquare,
} from 'lucide-react';
import {
  fetchUserNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  UserNotificationItem,
} from '../services/notificationApi';

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<UserNotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Ignore unauthenticated / error
    }
  }, []);

  // Fetch recent notifications when dropdown opens
  const loadRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserNotifications({ page: 1, limit: 6 });
      setRecentNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load user notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    // Poll unread count conservatively every 60 seconds
    const interval = setInterval(refreshUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (open) {
      loadRecentNotifications();
    }
  }, [open, loadRecentNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single as read
  const handleItemClick = async (notif: UserNotificationItem) => {
    if (!notif.read) {
      try {
        await markNotificationAsRead(notif._id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setRecentNotifications((prev) =>
          prev.map((item) => (item._id === notif._id ? { ...item, read: true } : item))
        );
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    setOpen(false);
    const targetUrl = notif.actionUrl || notif.link;
    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Format relative timestamp
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Icon by type
  const getTypeIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'INTEREST':
        return <Heart className="w-3.5 h-3.5 text-[#E51F3E] fill-[#E51F3E]" />;
      case 'INTEREST_ACCEPTED':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'INTEREST_DECLINED':
        return <Info className="w-3.5 h-3.5 text-slate-500" />;
      case 'PROMOTION':
      case 'OFFER':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
      case 'MEMBERSHIP':
        return <Crown className="w-3.5 h-3.5 text-amber-600" />;
      case 'VERIFICATION':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />;
      case 'SECURITY':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-[#E51F3E] flex items-center justify-center transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/30 cursor-pointer"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E51F3E] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-xl z-50 overflow-hidden animate-fade-in divide-y divide-slate-100">
          {/* Dropdown Header */}
          <div className="p-3.5 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[#E51F3E] text-[10px] font-extrabold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#E51F3E] hover:text-[#C9132F] flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#E51F3E] mb-2" />
                <span>Loading notifications...</span>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <Bell className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">No notifications yet</p>
                <p className="text-[10.5px] text-slate-400">You are all caught up!</p>
              </div>
            ) : (
              recentNotifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 hover:bg-rose-50/50 transition cursor-pointer flex items-start gap-3 relative ${
                    !item.read ? 'bg-[#FFFDFB]' : 'bg-white'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`text-xs block truncate ${
                          !item.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    {(item.actionUrl || item.link) && (
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-[#E51F3E] mt-1 hover:underline">
                        <span>View</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-[#E51F3E] shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="p-2.5 bg-slate-50 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#E51F3E] hover:text-[#C9132F] transition py-1"
            >
              <span>View All Notifications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
