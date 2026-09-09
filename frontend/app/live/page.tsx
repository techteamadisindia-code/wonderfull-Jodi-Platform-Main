import React from 'react';
import Link from 'next/link';
import { Video, ArrowLeft, Users, Calendar, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Shaadi Live - Video Matchmaking - Wonderful Jodi',
  description: 'Participate in curated live online matrimonial meetups with verified candidates and families.',
};

export default function LiveMatchmakingPage() {
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
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Shaadi Live Meetups</h1>
              <p className="text-xs sm:text-sm text-slate-500">Virtual curated speed-matchmaking for verified professionals</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Shaadi Live brings prospective brides, grooms, and esteemed families together through secure, moderated 5-minute video interactions from the comfort of your home.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">100% ID Verified</h3>
              <p className="text-[11px] text-slate-500">Only verified profiles can enter live video rooms.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <Users className="w-4 h-4 text-[#E51F3E]" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Community Specific</h3>
              <p className="text-[11px] text-slate-500">Doctors, Engineers, NRI & Regional focused events every Sunday.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Weekly Schedules</h3>
              <p className="text-[11px] text-slate-500">Reserve your spot in advance with 1-click registration.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-start">
            <Link
              href="/register"
              className="px-6 py-3 rounded-full bg-[#E51F3E] text-white text-xs sm:text-sm font-bold hover:bg-[#CE102F] transition shadow-md shadow-red-600/20"
            >
              Join Upcoming Live Event
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
