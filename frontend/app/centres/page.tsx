import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, ArrowLeft, Clock } from 'lucide-react';

export const metadata = {
  title: 'Matchmaking Centres & VIP Lounges - Wonderful Jodi',
  description: 'Visit our physical matchmaking lounges across Pune, Mumbai, Delhi, and Bengaluru.',
};

export default function MatchmakingCentresPage() {
  const centres = [
    {
      city: 'Pune (Headquarters)',
      address: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034',
      phone: '+91 096075 59547',
      hours: 'Mon - Sat: 10:00 AM - 7:00 PM',
    },
    {
      city: 'Mumbai',
      address: 'Level 4, Platina Tower, Bandra Kurla Complex (BKC), Mumbai, Maharashtra 400051',
      phone: '+91 096075 59547',
      hours: 'Mon - Sat: 10:00 AM - 7:00 PM',
    },
    {
      city: 'Bengaluru',
      address: 'Prestige Meridian, MG Road, Ashok Nagar, Bengaluru, Karnataka 560001',
      phone: '+91 096075 59547',
      hours: 'Mon - Sat: 10:00 AM - 7:00 PM',
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
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">VIP Matchmaking Lounges & Centres</h1>
              <p className="text-xs sm:text-sm text-slate-500">Meet our relationship managers in person for dedicated family assistance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {centres.map((c, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-sm">{c.city}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{c.address}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#E51F3E]">
                    <Phone className="w-3 h-3" />
                    <span>{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{c.hours}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
