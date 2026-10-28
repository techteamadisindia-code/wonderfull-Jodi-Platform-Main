'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, X, ShieldAlert, ShieldCheck } from 'lucide-react';

interface BulkStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  targetAction: 'active' | 'deactivated';
  selectedCount: number;
  loading?: boolean;
}

export default function BulkStatusConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  targetAction,
  selectedCount,
  loading = false,
}: BulkStatusConfirmModalProps) {
  const [reason, setReason] = useState('Administrative bulk update');

  if (!isOpen) return null;

  const isDeactivate = targetAction === 'deactivated';

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4.5 text-white flex items-center justify-between ${
            isDeactivate
              ? 'bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900'
              : 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs ${
                isDeactivate ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {isDeactivate ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                {isDeactivate ? 'Confirm Bulk Deactivation' : 'Confirm Bulk Activation'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {selectedCount} user account{selectedCount === 1 ? '' : 's'} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
              isDeactivate
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {isDeactivate ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">
                {isDeactivate
                  ? `You are about to deactivate ${selectedCount} account(s).`
                  : `You are about to restore ${selectedCount} account(s) to Active status.`}
              </p>
              <p className="text-[11px] opacity-90">
                {isDeactivate
                  ? 'Deactivated users cannot log in, browse profiles, or exchange messages. All active authentication sessions will be revoked immediately.'
                  : 'Reactivated users will regain full platform access according to their role and membership plan.'}
              </p>
            </div>
          </div>

          {/* Super Admin Protection Safeguard notice */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Automatic Server Safeguards:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Your current logged-in account cannot be deactivated.</li>
              <li>Super Admin accounts are immune to bulk deactivation.</li>
              <li>The last active administrator will always be protected.</li>
            </ul>
          </div>

          {/* Administrative Reason input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Administrative Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Inactive candidate cleanup, verification review..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs disabled:opacity-50 ${
                isDeactivate
                  ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Updates...</span>
                </>
              ) : (
                <span>
                  {isDeactivate ? `Deactivate ${selectedCount} User(s)` : `Activate ${selectedCount} User(s)`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
