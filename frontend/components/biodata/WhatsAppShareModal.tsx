'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { BiodataRecord } from '../../services/biodataApi';

interface WhatsAppShareModalProps {
  biodata: Partial<BiodataRecord>;
  downloadUrl?: string;
  onClose: () => void;
  onDownloadPdf: () => void;
}

export function WhatsAppShareModal({
  biodata,
  downloadUrl,
  onClose,
  onDownloadPdf,
}: WhatsAppShareModalProps) {
  const [copied, setCopied] = useState(false);

  const name = biodata.personalDetails?.fullName || 'Doctor Candidate';
  const qual = [
    biodata.education?.primaryQualification,
    biodata.education?.postgraduateQualification,
  ]
    .filter(Boolean)
    .join(', ');

  const currentHost =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://wonderfuljodi.com';

  const publicUrl = `${currentHost}/biodata/view/${biodata.publicId}`;

  const shareText = `Namaste! Sharing matrimonial biodata of ${name}${
    qual ? ` (${qual})` : ''
  } from Wonderful Jodi (Doctor Matrimony Platform).\n\nView Biodata: ${publicUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${name} - Matrimonial Biodata`,
          text: shareText,
          url: publicUrl,
        });
      } catch {
        // User canceled share
      }
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-left animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">Share on WhatsApp</h3>
              <p className="text-[11px] text-slate-500">Send verified biodata to families & matchmaking circles</p>
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

        {/* Message Preview Box */}
        <div className="p-3.5 rounded-2xl bg-[#E7F8E9]/60 border border-emerald-200/80 text-xs text-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>WhatsApp Message Preview</span>
            </span>
          </div>
          <p className="whitespace-pre-line text-slate-700 leading-relaxed font-sans text-xs">
            {shareText}
          </p>
        </div>

        {/* Share Buttons */}
        <div className="space-y-2.5">
          {/* Direct WhatsApp Share */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open WhatsApp Chat</span>
          </a>

          {/* Native Web Share */}
          {typeof navigator !== 'undefined' && (navigator as any).share && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via Device Apps</span>
            </button>
          )}

          {/* Copy Public Link */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center text-xs text-slate-600 truncate select-all">
              {publicUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* PDF Download Shortcut */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="w-4 h-4 text-[#E51F3E]" />
            <span>Need the raw PDF file?</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onDownloadPdf();
              onClose();
            }}
            className="text-xs font-bold text-[#E51F3E] hover:text-[#b8122d] flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
