import React from 'react';
import Link from 'next/link';
import { Briefcase, ArrowLeft, Heart, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Careers - Wonderful Jodi',
  description: 'Join our mission to connect educated professionals and families with trust and innovation.',
};

export default function CareersPage() {
  const roles = [
    { title: 'VIP Relationship Manager', department: 'Client Services', location: 'Pune / Mumbai / Hybrid' },
    { title: 'Senior Fullstack Engineer', department: 'Engineering', location: 'Bengaluru / Remote' },
    { title: 'Compliance & Verification Specialist', department: 'Operations', location: 'Pune' },
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
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Careers at Wonderful Jodi</h1>
              <p className="text-xs sm:text-sm text-slate-500">Build the future of matrimonial matchmaking</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            We are looking for passionate, high-integrity individuals to join our mission of crafting life-changing matches for educated professionals and esteemed families across India.
          </p>

          <div className="space-y-3 pt-2">
            <h2 className="font-serif text-lg font-bold text-slate-900">Open Opportunities</h2>
            <div className="grid grid-cols-1 gap-3">
              {roles.map((r, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{r.title}</h3>
                    <p className="text-xs text-slate-500">{r.department} • {r.location}</p>
                  </div>
                  <a
                    href="mailto:careers@wonderfuljodi.com"
                    className="px-4 py-2 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs"
                  >
                    Apply Now
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
