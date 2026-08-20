'use client';

import React, { useEffect, useState } from 'react';
import {
  HeartHandshake,
  Heart,
  RefreshCw,
  ArrowRight,
  Clock,
  UserCheck
} from 'lucide-react';
import { fetchInterests, InterestItem } from '../../../services/activityApi';

export default function AdminInterestsPage() {
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchInterests(statusFilter);
      setInterests(data || []);
    } catch (err) {
      console.error('Failed to load interests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Matchmaking Interests Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor interest requests, introductions, and mutual acceptance rates across doctor profiles
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['ALL', 'PENDING', 'ACCEPTED', 'DECLINED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === status
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {status === 'ALL' ? 'All Interests' : status}
          </button>
        ))}
      </div>

      {/* Interests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Sender Profile</th>
                <th className="py-3.5 px-5 text-center">Direction</th>
                <th className="py-3.5 px-5">Recipient Profile</th>
                <th className="py-3.5 px-5">Interest Status</th>
                <th className="py-3.5 px-5">Date Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading matchmaking interests...
                  </td>
                </tr>
              ) : interests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No interest requests recorded matching this filter.
                  </td>
                </tr>
              ) : (
                interests.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{item.sender?.fullName || 'Doctor User'}</p>
                      <p className="text-[11px] text-slate-500">{item.sender?.email}</p>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                        <Heart className="w-3.5 h-3.5 fill-rose-500" />
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{item.recipient?.fullName || 'Doctor User'}</p>
                      <p className="text-[11px] text-slate-500">{item.recipient?.email}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'DECLINED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
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
  );
}
