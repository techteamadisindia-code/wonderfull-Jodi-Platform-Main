'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { BiodataRecord } from '../../services/biodataApi';

interface MyBiodatasModalProps {
  biodatas: BiodataRecord[];
  activeBiodataId?: string;
  onClose: () => void;
  onSelect: (biodata: BiodataRecord) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => Promise<void>;
  onDownloadPdf: (biodata: BiodataRecord) => void;
}

export function MyBiodatasModal({
  biodatas,
  activeBiodataId,
  onClose,
  onSelect,
  onCreateNew,
  onDelete,
  onDownloadPdf,
}: MyBiodatasModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } catch {
      // Handled
    } finally {
      setDeletingId(null);
    }
  };

  const templateLabels: Record<string, string> = {
    traditional: 'Traditional Indian',
    modern: 'Modern Minimalist',
    elegant: 'Royal Navy & Gold',
    doctor_professional: 'Doctor Professional',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-left animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900">My Saved Biodatas</h3>
              <p className="text-xs text-slate-500">Manage, edit or download your matrimonial biodata drafts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Biodatas */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {biodatas.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-600">No saved biodatas found</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Create your first doctor marriage biodata with instant profile auto-population.
              </p>
              <button
                type="button"
                onClick={() => {
                  onCreateNew();
                  onClose();
                }}
                className="px-4 py-2 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#d01533] transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Biodata</span>
              </button>
            </div>
          ) : (
            biodatas.map((item) => {
              const isActive = activeBiodataId === item._id;
              const isConfirming = confirmDeleteId === item._id;

              return (
                <div
                  key={item._id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-[#E51F3E] bg-rose-50/30 ring-2 ring-[#E51F3E]/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {item.title || `${item.personalDetails?.fullName}'s Biodata`}
                        </h4>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>{templateLabels[item.templateId] || 'Doctor Professional'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Edit in form"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDownloadPdf(item)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(isConfirming ? null : item._id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        title="Delete Biodata"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {isConfirming && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Are you sure you want to delete this biodata?</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 font-semibold text-[11px] bg-white hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700"
                        >
                          {deletingId === item._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Biodata</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
