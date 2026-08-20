'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  X,
  FileText,
  Clock,
  User,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import {
  fetchVerifications,
  approveVerification,
  rejectVerification,
  VerificationItem
} from '../../../services/verificationApi';

export default function AdminVerificationPage() {
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  // Action Modals
  const [previewDoc, setPreviewDoc] = useState<VerificationItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<VerificationItem | null>(null);
  const [rejectReason, setRejectReason] = useState('Document copy unclear or missing official seal');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchVerifications(statusFilter);
      setVerifications(data || []);
    } catch (err) {
      console.error('Failed to load verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleApprove = async (id: string, userName: string) => {
    setProcessing(true);
    try {
      await approveVerification(id, 'Approved by Administrator after credential audit');
      setVerifications((prev) =>
        prev.map((v) => (v._id === id ? { ...v, status: 'APPROVED', notes: 'Approved by Administrator' } : v))
      );
      showNotice(`Successfully verified credentials for ${userName}!`);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setProcessing(true);
    try {
      await rejectVerification(rejectingItem._id, rejectReason, rejectReason);
      setVerifications((prev) =>
        prev.map((v) => (v._id === rejectingItem._id ? { ...v, status: 'REJECTED', notes: rejectReason } : v))
      );
      showNotice(`Verification rejected for ${rejectingItem.user?.fullName}.`);
      setRejectingItem(null);
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            KYC & Degree Verification Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit government IDs, medical certificates, and degrees to maintain 100% verified matrimonial trust
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: 'PENDING', label: 'Pending Review' },
          { key: 'APPROVED', label: 'Approved & Verified' },
          { key: 'REJECTED', label: 'Rejected Documents' },
          { key: 'ALL', label: 'All Records' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Verifications Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Document / Qualification Type</th>
                <th className="py-3.5 px-5">Submitted Date</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Admin Notes / Audit Reason</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading verification requests...
                  </td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No verification records found in this queue.
                  </td>
                </tr>
              ) : (
                verifications.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{item.user?.fullName || 'Doctor User'}</p>
                      <p className="text-[11px] text-slate-500">{item.user?.email}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{item.documentType}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate">
                      {item.notes || '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => setPreviewDoc(item)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview</span>
                      </button>

                      {item.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(item._id, item.user?.fullName || 'User')}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRejectingItem(item)}
                            disabled={processing}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs transition disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewDoc.documentType}</h3>
                <p className="text-xs text-slate-500">Submitted by: {previewDoc.user?.fullName} ({previewDoc.user?.email})</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-950/5 rounded-b-2xl">
              <img
                src={previewDoc.documentUrl}
                alt="Document preview"
                className="max-h-[60vh] rounded-xl shadow-md object-contain border border-slate-200 bg-white"
              />
              <div className="mt-4 flex items-center gap-3">
                <a
                  href={previewDoc.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Resolution Document</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Verification Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Reject Verification Request</h3>
            </div>

            <p className="text-xs text-slate-600">
              Specify the reason for rejection so {rejectingItem.user?.fullName} can re-upload proper credentials:
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              placeholder="e.g. Document image is blurry or expired..."
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={processing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
