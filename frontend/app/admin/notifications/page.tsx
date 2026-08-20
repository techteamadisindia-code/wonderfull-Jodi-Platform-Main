'use client';

import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Send,
  RefreshCw,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle2,
  Tag,
  Link as LinkIcon
} from 'lucide-react';
import {
  fetchNotifications,
  sendBroadcastNotification,
  NotificationItem
} from '../../../services/activityApi';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SYSTEM');
  const [link, setLink] = useState('/search');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    try {
      const res = await sendBroadcastNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        target: 'ALL',
        link: link.trim(),
      });
      setNotice(res.message || 'Notification broadcasted successfully to all platform users!');
      setTitle('');
      setMessage('');
      loadData();
      setTimeout(() => setNotice(null), 5000);
    } catch (err) {
      console.error('Failed to send broadcast:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Broadcast Announcements & Alerts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Send real-time system alerts, membership promotional offers, and platform notices to registered members
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Broadcast Notification Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Compose Broadcast</h3>
              <p className="text-[11px] text-slate-500">Delivered immediately to all active members</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Announcement Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Festival Special: 20% Off on Premium VIP"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Category Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="SYSTEM">System Announcement (Informational)</option>
                <option value="OFFER">Special Discount / Promotion</option>
                <option value="VERIFICATION">KYC & Safety Reminder</option>
                <option value="EVENT">Matchmaking Event Alert</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Notification Message</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your platform announcement message here..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Action Target Link (Optional)</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/membership"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-600/20 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Broadcasting...' : 'Broadcast to All Users'}</span>
            </button>
          </form>
        </div>

        {/* Sent Notifications History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Sent Notifications Log</h3>
            <span className="text-xs text-slate-500 font-medium">Recent 100 entries</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5">Notification Title & Content</th>
                  <th className="py-3.5 px-5">Type</th>
                  <th className="py-3.5 px-5">Delivered To</th>
                  <th className="py-3.5 px-5">Sent Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                      Loading notifications history...
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      No broadcast notifications sent yet.
                    </td>
                  </tr>
                ) : (
                  notifications.map((notif) => (
                    <tr key={notif._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 max-w-sm">
                        <span className="font-bold text-slate-900 block">{notif.title}</span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{notif.message}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {notif.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 font-medium">
                        {notif.user ? `${notif.user.fullName} (${notif.user.email})` : 'All Registered Users'}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">
                        {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
