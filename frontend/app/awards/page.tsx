import React from 'react';
import Link from 'next/link';
import { Award, ArrowLeft, Star, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Awards & Recognition - Wonderful Jodi',
  description: 'National and industry recognitions earned by Wonderful Jodi Matrimonial Platform.',
};

export default function AwardsPage() {
  const awards = [
    { title: 'Best Trusted Matrimonial Platform 2025', by: 'Indian Consumer Trust Summit', year: '2025' },
    { title: 'Excellence in Professional Matchmaking', by: 'National Matchmakers Conclave', year: '2024' },
    { title: 'Best Digital KYC & Security Innovation', by: 'FinTech & Security Leadership Awards', year: '2024' },
  ];

  return (
    <main className="min-h-screen bg-[#FFFDFB] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 text-left">
        <Link href="/" className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#E51F3E] transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-rose-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Awards & Industry Recognition</h1>
              <p className="text-xs sm:text-sm text-slate-500">Recognized for integrity, matchmaking precision & trust</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {awards.map((a, i) => (
              <div key={i} className="p-5 rounded-2xl bg-gradient-to-b from-amber-50/50 to-white border border-amber-200/60 space-y-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-serif font-bold text-slate-900 text-sm">{a.title}</h3>
                <p className="text-xs text-slate-600">{a.by}</p>
                <span className="inline-block text-[11px] font-extrabold text-[#D99A28]">{a.year}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
