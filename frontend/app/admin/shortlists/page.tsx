'use client';

import React, { useEffect, useState } from 'react';
import { Bookmark, RefreshCw, User, Star } from 'lucide-react';
import { fetchShortlists, ShortlistItem } from '../../../services/activityApi';

export default function AdminShortlistsPage() {
  const [shortlists, setShortlists] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchShortlists();
      setShortlists(data || []);
    } catch (err) {
      console.error('Failed to load shortlists:', err);
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
            Profile Shortlists Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View profiles saved and bookmarked by matrimonial seekers for follow-up
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Shortlists Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Bookmarked By User</th>
                <th className="py-3.5 px-5">Shortlisted Doctor Profile</th>
                <th className="py-3.5 px-5">Profession & City</th>
                <th className="py-3.5 px-5">Community</th>
                <th className="py-3.5 px-5">Bookmark Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading shortlist bookmarks...
                  </td>
                </tr>
              ) : shortlists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No shortlist bookmarks recorded yet.
                  </td>
                </tr>
              ) : (
                shortlists.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{item.user?.fullName || 'User'}</p>
                      <p className="text-[11px] text-slate-500">{item.user?.email}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        </div>
                        <span className="font-bold text-slate-900">
                          {item.shortlistedProfile?.displayName || 'Matrimonial Profile'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-800">{item.shortlistedProfile?.profession || 'Doctor'}</p>
                      <p className="text-[11px] text-slate-500">{item.shortlistedProfile?.city || 'India'}</p>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700">
                      {item.shortlistedProfile?.religion || 'Hindu'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
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
