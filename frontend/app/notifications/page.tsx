'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  UserNotificationItem,
} from '../../services/notificationApi';
import { acceptInterest, rejectInterest } from '../../services/interestApi';
import { DoctorAvatar } from '../../components/DoctorAvatar';
import { getAuthToken } from '../../lib/api';

export default function UserNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});
  const limit = 15;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserNotifications({ page, limit, unreadOnly });
      setNotifications(res.notifications || []);
      setTotal(res.total || 0);
      setUnreadCount(res.unreadCount || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, unreadOnly]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/notifications');
      return;
    }
    loadNotifications();
  }, [loadNotifications, router]);

  const handleItemClick = async (notif: UserNotificationItem) => {
    if (!notif.read) {
      try {
        await markNotificationAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((item) => (item._id === notif._id ? { ...item, read: true } : item))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    const targetUrl = notif.actionUrl || notif.link;
    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

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
      console.error('Failed to accept:', err);
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
      console.error('Failed to reject:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'INTEREST':
        return <Heart className="w-4 h-4 text-[#E51F3E] fill-[#E51F3E]" />;
      case 'INTEREST_ACCEPTED':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'INTEREST_DECLINED':
        return <Info className="w-4 h-4 text-slate-500" />;
      case 'PROMOTION':
      case 'OFFER':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'MEMBERSHIP':
        return <Crown className="w-4 h-4 text-amber-600" />;
      case 'VERIFICATION':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'SECURITY':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeBadgeClass = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'INTEREST':
        return 'bg-rose-50 text-[#E51F3E] border-rose-200';
      case 'INTEREST_ACCEPTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INTEREST_DECLINED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PROMOTION':
      case 'OFFER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MEMBERSHIP':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'VERIFICATION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SECURITY':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFDFB] py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-rose-100/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E51F3E] to-[#F03554] text-white flex items-center justify-center shadow-sm shadow-red-500/25">
                <Bell className="w-5 h-5 fill-white stroke-none" />
              </div>
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Notifications & Alerts
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Stay updated with your latest match alerts, membership offers, and safety updates
                </p>
              </div>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#E51F3E] text-xs font-bold transition cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-3 border-b border-rose-100/60 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                !unreadOnly
                  ? 'bg-[#E51F3E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>All Notifications</span>
              <span className="ml-1.5 opacity-80">({total})</span>
            </button>
            <button
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                unreadOnly
                  ? 'bg-[#E51F3E] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-[#E51F3E] text-[10px] font-extrabold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={loadNotifications}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#E51F3E] hover:bg-rose-50 transition cursor-pointer shadow-2xs"
            title="Refresh Notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            /* Skeleton Loading State */
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 animate-pulse flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            /* Empty State */
            <div className="bg-white p-12 rounded-3xl border border-slate-200/90 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {unreadOnly
                  ? 'You have read all your alerts! Check "All Notifications" to view your full notification history.'
                  : 'You are all caught up! New matchmaking recommendations and system alerts will appear here.'}
              </p>
              <div className="pt-2">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs"
                >
                  <span>Explore Matches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* Notifications Cards */
            notifications.map((notif) => (
              <article
                key={notif._id}
                onClick={() => handleItemClick(notif)}
                className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  !notif.read
                    ? 'bg-white border-rose-300 shadow-sm shadow-red-500/5 hover:border-red-400'
                    : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getTypeBadgeClass(notif.type)}`}>
                        {notif.type}
                      </span>
                      <h2
                        className={`text-sm sm:text-[15px] leading-tight ${
                          !notif.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </h2>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#E51F3E] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {notif.message}
                    </p>

                    {/* Doctor Details & Inline Actions for Interest Notifications */}
                    {notif.metadata?.interestId && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-700">
                          {notif.metadata?.qualification && (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                              <GraduationCap className="w-3.5 h-3.5 text-[#E51F3E]" />
                              <span>{notif.metadata.qualification}</span>
                            </span>
                          )}
                          {notif.metadata?.specialization && (
                            <span className="text-slate-500 font-medium">
                              • {notif.metadata.specialization}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {actionFeedback[notif._id] === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Connected ✓</span>
                            </span>
                          ) : actionFeedback[notif._id] === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                              <span>Declined</span>
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={actionLoadingId === notif._id}
                                onClick={(e) => handleNotificationAccept(e, notif)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {actionLoadingId === notif._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                <span>Accept</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === notif._id}
                                onClick={(e) => handleNotificationReject(e, notif)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                              >
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {notif.metadata?.profileId && (
                            <Link
                              href={`/profile/${notif.metadata.profileId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-[#E51F3E] bg-rose-50/60 hover:bg-rose-100 text-xs font-bold transition"
                            >
                              <span>View Profile</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span>
                        {notif.createdAt &&
                          new Date(notif.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </span>
                    </div>
                  </div>
                </div>

                {(notif.actionUrl || notif.link) && (
                  <div className="self-end sm:self-center shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#E51F3E] text-xs font-bold transition shadow-2xs border border-rose-200/70">
                      <span>Open Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-rose-100/60 text-xs">
            <span className="text-slate-500 font-medium">
              Page {page} of {totalPages} ({total} notifications)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
