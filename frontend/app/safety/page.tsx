import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, AlertTriangle, ArrowLeft, CheckCircle2, EyeOff } from 'lucide-react';

export const metadata = {
  title: 'Be Safe Online & Discreet Matrimony - Wonderful Jodi',
  description: 'Safety tips, discreet profile controls, and reporting misuse on Wonderful Jodi.',
};

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-[#FFFDFB] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 text-left">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#E51F3E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-rose-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Safe Online & Discreet Matrimony
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">Your Trust & Protection Guidelines</p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4.5 h-4.5 text-[#E51F3E]" />
                <span>1. Discreet Profiles & Privacy Protection</span>
              </h2>
              <p>
                We understand that prominent professionals and discerning families require heightened privacy. Wonderful Jodi allows you to keep your profile discreet:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-900 block mb-1">Hide Photo Option</span>
                  <span className="text-slate-600">Show photos only to verified members you have accepted.</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-900 block mb-1">Masked Contact Details</span>
                  <span className="text-slate-600">Phone numbers and email addresses are revealed solely upon mutual agreement.</span>
                </div>
              </div>
            </section>

            <section className="space-y-3 pt-2">
              <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                <span>2. Safe Matchmaking Practices</span>
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Never share financial information, bank credentials, or transfer funds to any member.</li>
                <li>Verify your match&apos;s credentials using our verified badge and credentials report.</li>
                <li>Conduct initial interactions via secure on-platform messaging before exchanging personal phone numbers.</li>
                <li>Schedule initial in-person meetings in safe, public places with family accompaniment.</li>
              </ul>
            </section>

            <section className="space-y-3 pt-2">
              <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
                <span>3. Reporting Misuse</span>
              </h2>
              <p>
                If you encounter any suspicious behavior, misrepresentation, or commercial solicitation, report the profile immediately or contact our 24/7 Safety Cell at{' '}
                <a href="mailto:support@wonderfuljodi.com" className="text-[#E51F3E] font-bold">
                  support@wonderfuljodi.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
