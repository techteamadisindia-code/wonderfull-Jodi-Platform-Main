'use client';

import React, { useState } from 'react';
import { X, Sparkles, Phone, Mail, ShieldCheck, CheckCircle2, Crown, HeartHandshake } from 'lucide-react';

interface VvipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VvipModal({ isOpen, onClose }: VvipModalProps) {
  const [formData, setFormData] = useState({
    doctorName: '',
    phone: '',
    email: '',
    specialization: '',
    city: '',
    representedBy: 'Self (Doctor)',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate brief network dispatch / lead capture
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      doctorName: '',
      phone: '',
      email: '',
      specialization: '',
      city: '',
      representedBy: 'Self (Doctor)',
      notes: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-rose-100/60 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#101728] via-[#1E293B] to-[#101728] px-6 py-6 text-white relative">
          <button
            onClick={handleReset}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-[11px] font-bold text-amber-300 mb-2.5">
            <Crown className="w-3.5 h-3.5" />
            <span>DISCREET VVIP CONCIERGE MATCHMAKING</span>
          </div>
          <h3 className="font-serif text-2xl font-bold tracking-tight">
            Request Private Consultation
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-md">
            Our Senior Matchmaking Consultant will arrange a confidential introductory call for you or your family.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-serif text-2xl font-bold text-slate-900">
                Consultation Request Received
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-slate-900">{formData.doctorName || 'Doctor'}</strong>. Our Senior Concierge Lead has received your private request and will reach out to you within 4 business hours.
              </p>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center gap-2 font-semibold text-[#E51F3E]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>100% Confidentiality Assured</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Your details and preferences are handled under strict non-disclosure guidelines by dedicated relationship directors.
                </p>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleReset}
                  className="rounded-full bg-[#101728] px-8 py-3 text-xs font-bold text-white hover:bg-slate-800 transition shadow-md"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Doctor&apos;s Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Aryan Deshmukh"
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. doctor@hospital.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specialization / Degree
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MD (Cardiology), MS (Orthopedics)"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current City / State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 focus:border-[#E51F3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profile Managed By
                  </label>
                  <select
                    value={formData.representedBy}
                    onChange={(e) => setFormData({ ...formData, representedBy: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 focus:border-[#E51F3E]"
                  >
                    <option value="Self (Doctor)">Self (Doctor)</option>
                    <option value="Parents">Parents</option>
                    <option value="Sibling / Family Member">Sibling / Family Member</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Family or Match Preferences (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell us about desired medical qualifications, location preferences, or family background requirements..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/40 focus:border-[#E51F3E]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] py-3.5 text-xs font-bold text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:from-[#d11735] hover:to-[#e0203f] transition disabled:opacity-75 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Submitting Request...' : 'Schedule Private VVIP Consultation'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#E51F3E]" />
                  <span>Direct Hotline: <strong>+91 1800 200 9090</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#E51F3E]" />
                  <span>concierge@wonderfuljodi.com</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
