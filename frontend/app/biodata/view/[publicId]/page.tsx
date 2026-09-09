'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Download,
  Share2,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  Heart,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { fetchPublicBiodata, BiodataRecord } from '../../../../services/biodataApi';
import { BiodataPreview } from '../../../../components/biodata/BiodataPreview';
import { Logo } from '../../../../components/Logo';

export default function PublicBiodataViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const resolvedParams = use(params);
  const publicId = resolvedParams.publicId;

  const [biodata, setBiodata] = useState<BiodataRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!publicId) return;

    fetchPublicBiodata(publicId)
      .then((data) => {
        if (data) {
          setBiodata(data);
        } else {
          setError('This matrimonial biodata is no longer available or has been removed.');
        }
      })
      .catch((err: any) => {
        setError(
          err.response?.data?.message ||
            'This matrimonial biodata is no longer available or has been removed.'
        );
      })
      .finally(() => setLoading(false));
  }, [publicId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-rose-200 border-t-[#E51F3E] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading verified matrimonial biodata...</p>
        </div>
      </main>
    );
  }

  if (error || !biodata) {
    return (
      <main className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4 text-left">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-slate-900">Biodata Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This matrimonial biodata is no longer available or has been removed by the user.'}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#c91230] transition shadow-sm"
            >
              Explore Wonderful Jodi Doctors
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-left">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" href="/" />
            <span className="text-xs font-bold text-slate-400">|</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Doctor Biodata</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#cf1432] transition flex items-center gap-1.5 shadow-xs"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Connect on Wonderful Jodi</span>
            </Link>
          </div>
        </div>

        {/* Rendered Biodata Preview */}
        <BiodataPreview biodata={biodata} />

        {/* Security & Platform Trust Note */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Lock className="w-4 h-4 text-[#E51F3E]" />
            <span>Privacy & Verification Assurance</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            This biodata is generated directly by the candidate on Wonderful Jodi — India's premier Doctor Matrimony platform. All medical qualifications and personal profiles are strictly validated against medical councils.
          </p>
        </div>
      </div>
    </main>
  );
}
