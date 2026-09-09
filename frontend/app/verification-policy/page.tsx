import React from 'react';
import Link from 'next/link';
import { ShieldCheck, GraduationCap, Award, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Credentials Verification Policy - Wonderful Jodi',
  description: 'Our stringent verification standards for Government ID, Education, and Medical Council Licenses.',
};

export default function VerificationPolicyPage() {
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Credentials Verification Policy
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Ensuring 100% authenticity for educated professionals & esteemed families
              </p>
            </div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#0BAA70]" />
                <span>1. Government ID & Age Verification</span>
              </h2>
              <p>
                Every candidate is requested to verify their identity through valid government identification (Aadhaar, Passport, Voter ID, Driving License). This confirms full legal identity, date of birth, and single/unmarried status eligibility.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4.5 h-4.5 text-[#D99A28]" />
                <span>2. Educational Degree & University Verification</span>
              </h2>
              <p>
                Candidates with degrees (MBBS, MD/MS, B.Tech, MBA, M.Tech, Ph.D.) provide degree convocation or provisional certificates. Our compliance team verifies degree issuance against recognized universities and accrediting bodies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-[#E51F3E]" />
                <span>3. Medical Council & Statutory Licenses</span>
              </h2>
              <p>
                For doctors and healthcare professionals, registration certificates from the National Medical Commission (NMC), State Medical Councils, Dental Council of India (DCI), or respective statutory regulatory bodies are independently authenticated.
              </p>
            </section>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Want to verify your credentials today?</span>
              <Link
                href="/profile/verification"
                className="px-5 py-2.5 rounded-full bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CE102F] transition shadow-xs"
              >
                Go to Verification Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
