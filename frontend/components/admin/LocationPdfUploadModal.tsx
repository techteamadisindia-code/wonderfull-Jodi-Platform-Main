'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  Download,
  ShieldCheck,
  Building,
  MapPin,
  RefreshCw,
  Search,
  ArrowRight,
} from 'lucide-react';
import {
  uploadLocationPdf,
  confirmLocationImport,
  getImportErrorReportUrl,
  LocationImportMetrics,
  LocationExtractedRow,
  LocationImportError,
} from '../../services/masterDataApi';

interface LocationPdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onImportSuccess?: () => void;
}

export function LocationPdfUploadModal({
  isOpen,
  onClose,
  onSuccess,
  onImportSuccess,
}: LocationPdfUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parsed Data State
  const [importId, setImportId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LocationImportMetrics | null>(null);
  const [previewRows, setPreviewRows] = useState<LocationExtractedRow[]>([]);
  const [errorsList, setErrorsList] = useState<LocationImportError[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'DUPLICATE' | 'INVALID'>('ALL');
  const [previewSearch, setPreviewSearch] = useState('');

  // Confirmation Dialog Modal State
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setMetrics(null);
    setPreviewRows([]);
    setImportId(null);

    // Validate type
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Invalid file type. Only authentic PDF documents (.pdf) are supported.');
      return;
    }

    // Validate size (15MB limit)
    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15MB limit. Please provide an authentic, compressed PDF.');
      return;
    }

    setFile(selectedFile);
  };

  const handleUploadAndParse = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await uploadLocationPdf(file);
      if (res.success && res.data) {
        setImportId(res.data.importId);
        setMetrics(res.data.metrics);
        setPreviewRows(res.data.preview);
        setErrorsList(res.data.errors || []);
        setSuccessMessage(
          `Extracted ${res.data.metrics.totalExtracted} location records. Review the preview below before importing.`
        );
      } else {
        setErrorMessage(res.message || 'Failed to extract records from PDF.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Error uploading and processing PDF document.';
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importId) return;

    setConfirming(true);
    setErrorMessage(null);

    try {
      const res = await confirmLocationImport(importId, 'CONFIRM');
      if (res.success && res.data) {
        setSuccessMessage(
          `Success! Imported ${res.data.insertedCount} new locations (${res.data.updatedCount} updated, ${res.data.skippedCount} skipped).`
        );
        setShowConfirmDialog(false);
        if (onImportSuccess) {
          onImportSuccess();
        }
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setErrorMessage(res.message || 'Import operation failed.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error executing database import.';
      setErrorMessage(msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelImport = async () => {
    if (importId) {
      try {
        await confirmLocationImport(importId, 'CANCEL');
      } catch {
        // Ignore background cancel errors
      }
    }
    resetState();
    onClose();
  };

  const resetState = () => {
    setFile(null);
    setImportId(null);
    setMetrics(null);
    setPreviewRows([]);
    setErrorsList([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowConfirmDialog(false);
  };

  const filteredPreview = previewRows.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      const match =
        (r.state && r.state.toLowerCase().includes(q)) ||
        (r.district && r.district.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q)) ||
        (r.village && r.village.toLowerCase().includes(q)) ||
        (r.pinCode && r.pinCode.includes(q)) ||
        (r.officialCode && r.officialCode.includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-[#E51F3E] border border-rose-100">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-900">
                Upload Master Location Data (PDF)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official Government LGD Directory / Census Directory Importer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Upload / Processing Notice:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Import Status:</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Step 1: File Selection & Upload (Hidden when preview is ready and no re-upload requested) */}
          {!metrics && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  dragActive
                    ? 'border-[#E51F3E] bg-rose-50/40'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#E51F3E] mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {file ? file.name : 'Click to upload or drag and drop your LGD PDF'}
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Accepts official Local Government Directory (LGD) or Census location PDFs (max 15MB)
                </p>
                {file && (
                  <span className="mt-3 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to Parse
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!file || uploading}
                  onClick={handleUploadAndParse}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs disabled:opacity-50 transition"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing PDF Document...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract & Preview Records</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Extracted Preview & Metrics */}
          {metrics && (
            <div className="space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Extracted
                  </span>
                  <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
                    {metrics.totalExtracted}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
                    Valid Records
                  </span>
                  <span className="text-xl font-extrabold text-emerald-800 mt-0.5 block">
                    {metrics.validRecords}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">
                    Existing / Duplicates
                  </span>
                  <span className="text-xl font-extrabold text-amber-800 mt-0.5 block">
                    {metrics.duplicateRecords}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">
                    Invalid / Missing Parent
                  </span>
                  <span className="text-xl font-extrabold text-rose-800 mt-0.5 block">
                    {metrics.invalidRecords}
                  </span>
                </div>
              </div>

              {/* Table Controls (Search, Filter, Actions) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Search preview rows..."
                      className="h-8 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E] w-48 sm:w-64"
                    />
                  </div>
                  <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50 text-[11px] font-bold">
                    {(['ALL', 'VALID', 'DUPLICATE', 'INVALID'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFilterStatus(st)}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          filterStatus === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {importId && (
                    <a
                      href={getImportErrorReportUrl(importId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Error Report (CSV)</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={resetState}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    Re-upload
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2.5">State / UT</th>
                        <th className="px-4 py-2.5">District</th>
                        <th className="px-4 py-2.5">Taluka / Tehsil</th>
                        <th className="px-4 py-2.5">City / Village</th>
                        <th className="px-4 py-2.5">PIN Code</th>
                        <th className="px-4 py-2.5">LGD Code</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Note / Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredPreview.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No records found matching filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-2.5 font-bold text-slate-900">
                              {row.state || '—'}
                              {row.stateType && (
                                <span className="block text-[10px] font-normal text-slate-400">
                                  {row.stateType}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">{row.district || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-600">{row.subDistrict || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-700">{row.city || row.village || '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">{row.pinCode || '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">{row.officialCode || row.stateLgdCode || '—'}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  row.status === 'VALID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.status === 'DUPLICATE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-[11px] max-w-xs truncate">
                              {row.reason || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancelImport}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          {metrics && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={confirming || metrics.validRecords === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs disabled:opacity-50 transition"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing into Database...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Import ({metrics.validRecords} Valid Records)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Confirmation Modal Pop-up */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900">Confirm Location Data Import</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  You are about to import <span className="font-bold text-slate-900">{metrics?.validRecords}</span> verified
                  geographical records into the Wonderful Jodi Master Location Database.
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Existing locations will be preserved and enriched with official LGD codes and parent mappings.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirming}
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] shadow-xs transition"
                >
                  {confirming ? 'Importing...' : 'Yes, Confirm Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationPdfUploadModal;
