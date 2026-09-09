import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft, Heart, Calendar } from 'lucide-react';

export const metadata = {
  title: 'Shaadi & Matrimony Blog - Wonderful Jodi',
  description: 'Expert relationship advice, wedding planning tips, and matrimonial guides.',
};

export default function BlogPage() {
  const articles = [
    {
      title: 'How Doctors and Healthcare Professionals Navigate Modern Matrimony',
      date: 'August 18, 2026',
      readTime: '4 min read',
      snippet: 'Balancing hectic residency schedules with life partner search: practical tips from happily married doctors.',
    },
    {
      title: 'Top 7 Things to Discuss Before Matrimonial Commitment',
      date: 'August 10, 2026',
      readTime: '6 min read',
      snippet: 'From financial planning and career goals to core family values: how to communicate transparently.',
    },
    {
      title: 'Understanding Matrimonial KYC & Why Verification Matters',
      date: 'July 28, 2026',
      readTime: '5 min read',
      snippet: 'Why verified Government IDs and educational credentials guarantee safer matchmaking for families.',
    },
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
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Wonderful Jodi Matrimony Blog</h1>
              <p className="text-xs sm:text-sm text-slate-500">Relationship advice, wedding wisdom & family guidance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {articles.map((a, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#E51F3E]">
                    <Calendar className="w-3 h-3" />
                    <span>{a.date}</span>
                  </div>
                  <h3 className="font-serif font-bold text-slate-900 text-sm leading-snug">{a.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">{a.snippet}</p>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">{a.readTime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
