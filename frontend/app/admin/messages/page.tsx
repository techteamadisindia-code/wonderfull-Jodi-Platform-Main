'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, RefreshCw, Users, Shield, Clock } from 'lucide-react';
import { fetchMessagesMonitor, MessageMonitorData } from '../../../services/activityApi';

export default function AdminMessagesPage() {
  const [data, setData] = useState<MessageMonitorData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchMessagesMonitor();
      setData(result);
    } catch (err) {
      console.error('Failed to load message monitor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Conversations & Messages Monitor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time chat activity monitor for security compliance and inappropriate communication detection
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Activity</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-slate-400">Total Chat Threads</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {data?.totalConversations || 0}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-slate-400">Total Exchange Messages</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {data?.totalMessages || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Active Chat Threads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Participant 1</th>
                <th className="py-3.5 px-5">Participant 2</th>
                <th className="py-3.5 px-5">Last Activity</th>
                <th className="py-3.5 px-5">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading conversation streams...
                  </td>
                </tr>
              ) : !data?.conversations || data.conversations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No active chat threads recorded.
                  </td>
                </tr>
              ) : (
                data.conversations.map((thread) => (
                  <tr key={thread._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {thread.participants[0]?.fullName || 'User 1'}
                      <span className="block text-[11px] font-normal text-slate-500">
                        {thread.participants[0]?.email}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      {thread.participants[1]?.fullName || 'User 2'}
                      <span className="block text-[11px] font-normal text-slate-500">
                        {thread.participants[1]?.email}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(thread.updatedAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Secured & Monitored
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
