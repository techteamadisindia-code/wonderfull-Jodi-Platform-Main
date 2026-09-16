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
  CheckCircle2,
  XCircle,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import {
  fetchUserNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  UserNotificationItem,
} from '../services/notificationApi';
import { acceptInterest, rejectInterest } from '../services/interestApi';
import { DoctorAvatar } from './DoctorAvatar';

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<UserNotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});
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

  const handleNotificationAccept = async (e: React.MouseEvent, notif: UserNotificationItem) => {
    e.stopPropagation();
    const interestId = notif.metadata?.interestId;
    if (!interestId) return;

    setActionLoadingId(notif._id);
    try {
      await acceptInterest(interestId);
      setActionFeedback((prev) => ({ ...prev, [notif._id]: 'ACCEPTED' }));
      await markNotificationAsRead(notif._id).catch(() => null);
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      console.error('Failed to accept from bell:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNotificationReject = async (e: React.MouseEvent, notif: UserNotificationItem) => {
    e.stopPropagation();
    const interestId = notif.metadata?.interestId;
    if (!interestId) return;

    setActionLoadingId(notif._id);
    try {
      await rejectInterest(interestId);
      setActionFeedback((prev) => ({ ...prev, [notif._id]: 'REJECTED' }));
      await markNotificationAsRead(notif._id).catch(() => null);
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      console.error('Failed to reject from bell:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

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
    const targetUrl = notif.actionUrl || notif.link || '/interests';
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

  const getTypeIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'INTEREST':
      case 'INTEREST_RECEIVED':
        return <Heart className="w-3.5 h-3.5 text-[#E51F3E] fill-[#E51F3E]" />;
      case 'INTEREST_ACCEPTED':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'INTEREST_DECLINED':
      case 'INTEREST_REJECTED':
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
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
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
              recentNotifications.map((item) => {
                const isInterestReceived =
                  item.type === 'INTEREST_RECEIVED' ||
                  (item.type === 'INTEREST' && item.metadata?.interestId);
                const feedbackStatus = actionFeedback[item._id];

                return (
                  <div
                    key={item._id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 hover:bg-rose-50/40 transition cursor-pointer flex flex-col gap-2 relative ${
                      !item.read ? 'bg-[#FFFDFB]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isInterestReceived ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-rose-100 mt-0.5">
                          {item.metadata?.senderPhoto ? (
                            <img
                              src={item.metadata.senderPhoto}
                              alt={item.metadata?.senderName || 'Doctor'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <DoctorAvatar
                              name={item.metadata?.senderName || 'Doctor'}
                              className="w-full h-full rounded-none"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          {getTypeIcon(item.type)}
                        </div>
                      )}

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

                        {isInterestReceived && item.metadata?.senderName ? (
                          <div className="space-y-0.5 mb-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.metadata.senderName}
                            </p>
                            {(item.metadata.senderDegree || item.metadata.senderSpecialization) && (
                              <p className="text-[11px] text-[#E51F3E] font-medium flex items-center gap-1 truncate">
                                <GraduationCap className="w-3 h-3 shrink-0" />
                                <span>
                                  {[item.metadata.senderDegree, item.metadata.senderSpecialization]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </span>
                              </p>
                            )}
                          </div>
                        ) : null}

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        {/* Interactive Accept / Reject Actions for Interest Notifications */}
                        {isInterestReceived && item.metadata?.interestId && (
                          <div className="mt-2 pt-1 flex items-center gap-2">
                            {feedbackStatus === 'ACCEPTED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Accepted ✓</span>
                              </span>
                            ) : feedbackStatus === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                <span>Declined</span>
                              </span>
                            ) : (
                              <>
                                {item.metadata?.senderProfileId && (
                                  <Link
                                    href={`/profile/${item.metadata.senderProfileId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                                  >
                                    View Profile
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item._id}
                                  onClick={(e) => handleNotificationAccept(e, item)}
                                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  {actionLoadingId === item._id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  <span>Accept</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === item._id}
                                  onClick={(e) => handleNotificationReject(e, item)}
                                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#E51F3E] shrink-0 self-center" />
                      )}
                    </div>
                  </div>
                );
              })
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
