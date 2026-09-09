import React from 'react';
import Link from 'next/link';
import { HelpCircle, Phone, Mail, MapPin, ArrowLeft, MessageSquare } from 'lucide-react';

export const metadata = {
  title: 'Customer Support & Help - Wonderful Jodi',
  description: 'Frequently asked questions, customer support, and contact information for Wonderful Jodi.',
};

export default function HelpPage() {
  const faqs = [
    {
      q: 'How does credential and KYC verification work?',
      a: 'Members submit their Government ID (Aadhaar, Passport) and University Degree certificates. Our compliance team verifies the documents against statutory boards within 24 hours.',
    },
    {
      q: 'How do I protect my photos and contact details?',
      a: 'In your Profile Settings, you can configure your photo privacy to "Visible Only to Accepted Matches" and mask your mobile number until you choose to reveal it.',
    },
    {
      q: 'Can families create and manage profiles on behalf of candidates?',
      a: 'Yes, parents, guardians, and siblings can register and manage matrimonial profiles with candidate consent.',
    },
    {
      q: 'What is included in the VIP Matchmaking Membership?',
      a: 'VIP Members receive a dedicated Relationship Manager, personalized candidate shortlisting, verified credential dossiers, and direct family introductions.',
    },
  ];

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

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-rose-100 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Customer Support & Help Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">We are here to assist you every step of the way</p>
            </div>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4.5 bg-rose-50/60 rounded-2xl border border-rose-100">
              <Phone className="w-5 h-5 text-[#E51F3E] mb-2" />
              <span className="text-xs font-bold text-slate-900 block">VIP Helpline</span>
              <a href="tel:+9109607559547" className="text-xs font-semibold text-[#E51F3E] mt-0.5 block hover:underline">
                +91 096075 59547
              </a>
              <span className="text-[11px] text-slate-500">Toll Free, 9 AM - 9 PM</span>
            </div>

            <div className="p-4.5 bg-slate-50 rounded-2xl border border-slate-100">
              <Mail className="w-5 h-5 text-[#E51F3E] mb-2" />
              <span className="text-xs font-bold text-slate-900 block">Email Support</span>
              <a href="mailto:support@wonderfuljodi.com" className="text-xs font-semibold text-[#E51F3E] mt-0.5 block hover:underline truncate">
                support@wonderfuljodi.com
              </a>
              <span className="text-[11px] text-slate-500">24/7 Response Time</span>
            </div>

            <div className="p-4.5 bg-slate-50 rounded-2xl border border-slate-100">
              <MapPin className="w-5 h-5 text-[#E51F3E] mb-2" />
              <span className="text-xs font-bold text-slate-900 block">Registered Office</span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                PCMC Pune, Maharashtra 411034
              </span>
            </div>
          </div>

          {/* FAQs */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="font-serif text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{faq.q}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
