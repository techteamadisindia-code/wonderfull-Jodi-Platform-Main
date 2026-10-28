'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Users,
  UserX,
  Filter,
} from 'lucide-react';
import { downloadCandidateExport } from '../../services/userApi';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: {
    search?: string;
    status?: string;
    role?: string;
    gender?: string;
    registrationStatus?: string;
  };
  filteredCount?: number;
}

export default function ExportDataModal({
  isOpen,
  onClose,
  currentFilters = {},
  filteredCount = 0,
}: ExportDataModalProps) {
  const [exportType, setExportType] = useState<'active' | 'incomplete' | 'all' | 'filtered'>('active');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setDownloading(true);
    setStatusMessage(null);

    try {
      const result = await downloadCandidateExport({
        type: exportType,
        format: exportFormat,
        search: currentFilters.search,
        status: currentFilters.status,
        role: currentFilters.role,
        gender: currentFilters.gender,
        registrationStatus: currentFilters.registrationStatus,
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully exported ${result.count > 0 ? `${result.count} records` : 'dataset'} to ${result.filename}!`,
      });
    } catch (err: any) {
      console.error('Candidate export failed:', err);
      setStatusMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to generate export file. Please check permissions.',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E51F3E] flex items-center justify-center text-white shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">Export Candidate Data</h3>
              <p className="text-[11px] text-slate-300">Generate certified Excel or CSV spreadsheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          )}

          {/* Export Dataset Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Dataset Scope
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: All Active Candidates */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  exportType === 'active'
                    ? 'border-[#E51F3E] bg-rose-50/40 ring-1 ring-[#E51F3E]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value="active"
                  checked={exportType === 'active'}
                  onChange={() => setExportType('active')}
                  className="mt-0.5 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Users className="w-3.5 h-3.5 text-[#E51F3E]" />
                    <span>Export All Active Candidates</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Full matrimonial profiles with Doctor qualifications, registration details, KYC, and preferences.
                  </p>
                </div>
              </label>

              {/* Option 2: Incomplete Registrations */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  exportType === 'incomplete'
                    ? 'border-[#E51F3E] bg-rose-50/40 ring-1 ring-[#E51F3E]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value="incomplete"
                  checked={exportType === 'incomplete'}
                  onChange={() => setExportType('incomplete')}
                  className="mt-0.5 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <UserX className="w-3.5 h-3.5 text-amber-600" />
                    <span>Export Incomplete Registrations</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Candidates who started registration with current step, missing sections, and completion percentage.
                  </p>
                </div>
              </label>

              {/* Option 3: Filtered Results */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  exportType === 'filtered'
                    ? 'border-[#E51F3E] bg-rose-50/40 ring-1 ring-[#E51F3E]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value="filtered"
                  checked={exportType === 'filtered'}
                  onChange={() => setExportType('filtered')}
                  className="mt-0.5 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    <span>Export Currently Filtered Results ({filteredCount} records)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Exports all records matching current search query, status, role, and gender filters.
                  </p>
                </div>
              </label>

              {/* Option 4: Combined Export (Both) */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  exportType === 'all'
                    ? 'border-[#E51F3E] bg-rose-50/40 ring-1 ring-[#E51F3E]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value="all"
                  checked={exportType === 'all'}
                  onChange={() => setExportType('all')}
                  className="mt-0.5 text-[#E51F3E] focus:ring-[#E51F3E]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                    <span>Export Both (Multi-Sheet Workbook)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Generates an Excel workbook with separate sheets for Active Candidates and Incomplete Registrations.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition ${
                  exportFormat === 'xlsx'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition ${
                  exportFormat === 'csv'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-700" />
                <span>CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Security & Safeguards Notice */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Security & Privacy Assurance:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Protected against CSV formula injection attacks (`=`, `+`, `-`, `@`).</li>
              <li>Passkeys, tokens, and internal credentials are permanently excluded.</li>
              <li>Exports all matching records across every page without truncation.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#E51F3E] hover:bg-[#ce102f] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Export...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download {exportFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
