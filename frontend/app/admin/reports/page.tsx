'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserX,
  Shield,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  fetchReports,
  resolveReport,
  dismissReport,
  ReportItem
} from '../../../services/reportApi';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchReports(statusFilter);
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleResolve = async (id: string) => {
    setProcessing(true);
    try {
      await resolveReport(id);
      setReports((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'RESOLVED' } : r))
      );
      showNotice('Report marked as RESOLVED and action taken.');
    } catch (err) {
      console.error('Failed to resolve report:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setProcessing(true);
    try {
      await dismissReport(id);
      setReports((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'REJECTED' } : r))
      );
      showNotice('Report dismissed as non-violating.');
    } catch (err) {
      console.error('Failed to dismiss report:', err);
    } finally {
      setProcessing(false);
    }
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
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
            Abuse & Safety Reports Moderation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolve member complaints regarding inappropriate behavior, fake details, or profile violations
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'ALL', label: 'All Reports' },
          { key: 'PENDING', label: 'Pending Moderation' },
          { key: 'RESOLVED', label: 'Resolved Cases' },
          { key: 'REJECTED', label: 'Dismissed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Reporter</th>
                <th className="py-3.5 px-5">Reported Account</th>
                <th className="py-3.5 px-5">Reason & Description</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Reported On</th>
                <th className="py-3.5 px-5 text-right">Moderation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading abuse reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No safety reports found in this queue.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{report.reporter?.fullName || 'User'}</p>
                      <p className="text-[11px] text-slate-500">{report.reporter?.email}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-rose-600">{report.reportedUser?.fullName || 'Reported Member'}</p>
                      <p className="text-[11px] text-slate-500">{report.reportedUser?.email}</p>
                    </td>
                    <td className="py-3.5 px-5 max-w-sm">
                      <span className="font-bold text-slate-900 block">{report.reason}</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">{report.details || 'No additional details.'}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          report.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : report.status === 'REJECTED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-100 text-rose-800 font-extrabold'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(report.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      {report.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleResolve(report._id)}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                          <button
                            onClick={() => handleDismiss(report._id)}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Dismiss</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Completed</span>
                      )}
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
