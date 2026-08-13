'use client';

import { FormEvent, useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <section className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs uppercase font-bold text-red-600 tracking-wider">Help & Support</span>
          <h1 className="font-serif text-4xl font-extrabold text-slate-900">We Are Here To Help You</h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Have questions about membership, profile verification, or matchmaking assistance? Our customer support team is available 24/7.
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-3 items-start">
          {/* Info Card */}
          <div className="rounded-3xl bg-slate-900 text-white p-8 space-y-6">
            <h2 className="font-serif text-2xl font-bold">Contact Details</h2>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">Toll Free Helpline</span>
                  <span className="font-semibold text-white">+91 1800 200 9090</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">Email Us</span>
                  <span className="font-semibold text-white">support@wonderfuljodi.com</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">Headquarters</span>
                  <span className="font-semibold text-white">Cyber City, Phase II, Gurugram, India</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <span className="text-xs text-amber-400 font-semibold block mb-1">Office Hours</span>
              <p className="text-xs text-slate-400">Monday – Sunday: 9:00 AM – 8:00 PM IST</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 rounded-3xl bg-white p-8 border border-rose-100 shadow-sm space-y-6">
            <h2 className="font-serif text-2xl font-bold text-slate-900">Send Us A Message</h2>

            {submitted ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  ✓
                </div>
                <h3 className="font-bold text-emerald-900">Message Received!</h3>
                <p className="text-xs text-emerald-700">Thank you for reaching out. Our support manager will respond within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Your Name</label>
                    <input required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number</label>
                    <input required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input type="email" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="name@example.com" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">How can we help?</label>
                  <textarea required rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Tell us how we can assist your partner search..." />
                </div>

                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-red-700 transition">
                  <Send className="w-4 h-4" />
                  Submit Message
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
