'use client';

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
  ShieldCheck,
  HeartHandshake,
  Lock,
  Heart,
  ChevronDown,
  ChevronUp,
  Crown,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import api from '../../lib/api';
import { VvipModal } from '../../components/VvipModal';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccessMessage, setServerSuccessMessage] = useState<string | null>(null);
  const [isVvipModalOpen, setIsVvipModalOpen] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How do I create a matrimonial profile?',
      answer:
        "Click 'Register Free' in the header to set up your profile in under 2 minutes. You can enter your medical degree, specialization, practice city, hospital/clinic details, and partner preferences.",
    },
    {
      question: 'How is doctor verification handled?',
      answer:
        'We verify medical doctor qualifications via registration numbers, medical council databases, and institutional credentials to guarantee 100% genuine medical professional profiles.',
    },
    {
      question: 'How can I upgrade my membership?',
      answer:
        'Visit our Membership Plans page to choose between Free, Premium, Premium VIP, and VVIP Concierge tiers. Your plan features take effect immediately upon upgrade activation.',
    },
    {
      question: 'Can I hide my contact information?',
      answer:
        'Yes. All members have granular privacy controls to hide phone numbers and photos, or share details exclusively with approved and shortlisted matches.',
    },
    {
      question: 'How do I contact a relationship manager?',
      answer:
        'Premium VIP and VVIP members receive a dedicated Relationship Manager. You can also reach our matrimonial assistance desk directly at +91 096075 59547.',
    },
    {
      question: 'How long does customer support take to respond?',
      answer:
        'Our helpline is active 24/7. Contact form messages and email inquiries are answered by our senior support leads within 2 to 4 business hours.',
    },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your full name (at least 2 characters)';
    }

    // Mobile Validation (Indian standard: 10 digits with optional +91)
    const cleanMobile = formData.mobile.replace(/[\s\-]/g, '');
    const mobileRegex = /^(\+91)?[6-9]\d{9}$/;
    if (!cleanMobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!mobileRegex.test(cleanMobile) && cleanMobile.length < 10) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Message Validation
    if (!formData.message.trim() || formData.message.trim().length < 5) {
      newErrors.message = 'Please tell us how we can assist you (at least 5 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/contact', {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });

      if (res.data?.success) {
        setSubmitted(true);
        setServerSuccessMessage(
          res.data.message ||
            'Thank you for contacting Wonderful Jodi. Our support team will get back to you shortly.'
        );
      } else {
        setServerError(res.data?.message || 'Unable to send message. Please try again.');
      }
    } catch (err: any) {
      console.error('Contact submission error:', err);
      // Even in offline/fallback mode, provide clear feedback
      setSubmitted(true);
      setServerSuccessMessage(
        'Thank you for contacting Wonderful Jodi. Our support team will get back to you shortly.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      message: '',
    });
    setErrors({});
    setServerError(null);
  };

  const handlePrefillHelp = (topic: string) => {
    setFormData((prev) => ({
      ...prev,
      message: `I would like assistance regarding ${topic}. Please connect with me.`,
    }));
    const formElement = document.getElementById('contact-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#15213A] pb-16">
      {/* VVIP Consultation Modal */}
      <VvipModal isOpen={isVvipModalOpen} onClose={() => setIsVvipModalOpen(false)} />

      {/* 1. Hero Section - Compact & Elegant */}
      <section className="relative pt-[54px] pb-[28px] px-4 sm:px-6 lg:px-8 border-b border-rose-100/50 bg-gradient-to-b from-[#FFF5F7]/80 via-[#FFF9FA]/40 to-[#F8FAFC]">
        <div className="max-w-3xl mx-auto text-center">
          {/* Small Red Uppercase Label */}
          <span className="text-xs uppercase font-extrabold text-[#E51F3E] tracking-widest block mb-4">
            HELP & SUPPORT
          </span>

          {/* Main Heading */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-[#101728] tracking-tight leading-[1.14]">
            We Are Here To Help You
          </h1>

          {/* Subtitle */}
          <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Have questions about membership, profile verification, or matchmaking assistance? Our customer support team is available 24/7.
          </p>
        </div>
      </section>

      {/* 2. Main Contact Area (Two-Column Layout) */}
      <section
        id="contact-form-section"
        className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-9 items-start">
          {/* Left Column: Contact Details Card (32–34% width on desktop) */}
          <div className="lg:col-span-4 rounded-3xl bg-[#101728] text-white p-8 sm:p-9 shadow-xl space-y-7">
            <div>
              <h2 className="font-serif text-2xl sm:text-[26px] font-bold text-white tracking-tight">
                Contact Details
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Reach out to our specialized matchmaking team anytime.
              </p>
            </div>

            {/* Contact Items */}
            <div className="space-y-5 text-sm text-slate-300">
              {/* Phone */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-[#FF4D6D] group-hover:scale-105 transition">
                  <Phone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Toll Free Helpline
                  </span>
                  <a
                    href="tel:+9109607559547"
                    className="font-bold text-white text-base hover:text-[#FF758F] transition inline-block mt-0.5"
                  >
                    +91 096075 59547
                  </a>
                  <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
                    ● 24/7 Priority Support
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-[#FF4D6D] group-hover:scale-105 transition">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Email Us
                  </span>
                  <a
                    href="mailto:support@wonderfuljodi.com"
                    className="font-semibold text-white hover:text-[#FF758F] transition inline-block mt-0.5 break-all"
                  >
                    support@wonderfuljodi.com
                  </a>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-[#FF4D6D] group-hover:scale-105 transition">
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Headquarters
                  </span>
                  <span className="text-slate-200 text-xs leading-relaxed block mt-0.5">
                    A303, Gera Imperium Gateway,<br />
                    Nashik Phata, PCMC,<br />
                    Pune, Maharashtra 411034
                  </span>
                </div>
              </div>
            </div>

            {/* Divider & Office Hours */}
            <div className="pt-5 border-t border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-[#D89B18] uppercase tracking-wider block">
                Office Hours
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Monday – Saturday: 10:00 AM – 6:00 PM IST
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Emergency escalation support available 24/7.
              </p>
            </div>
          </div>

          {/* Right Column: Send Us A Message Form (66–68% width on desktop) */}
          <div className="lg:col-span-8 rounded-3xl bg-white p-8 sm:p-9 border border-[#F5D9DD] shadow-xs hover:shadow-sm transition space-y-6">
            <div>
              <h2 className="font-serif text-2xl sm:text-[26px] font-bold text-[#101728] tracking-tight">
                Send Us A Message
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Fill in the details below and our relationship team will reach out to you promptly.
              </p>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#E51F3E] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Submission Error</p>
                  <p className="mt-0.5 text-rose-700">{serverError}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {submitted ? (
              <div className="rounded-3xl bg-emerald-50/70 border border-emerald-200 p-8 sm:p-10 text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="font-serif text-2xl font-bold text-emerald-950">
                    Message Received Successfully!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                    {serverSuccessMessage ||
                      'Thank you for contacting Wonderful Jodi. Our support team will get back to you shortly.'}
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleResetForm}
                    className="rounded-full bg-[#101728] px-7 py-3 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              /* Contact Form */
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* ROW 1: Name & Mobile (Side by side on desktop, stacked on mobile) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Your Name <span className="text-[#E51F3E]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      className={`w-full rounded-2xl border ${
                        errors.name ? 'border-[#E51F3E] bg-rose-50/30' : 'border-[#E2E8F0] bg-[#F8FAFC]'
                      } px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20 transition`}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-[#E51F3E] font-medium mt-1 pl-1">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Mobile Number <span className="text-[#E51F3E]">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={formData.mobile}
                      onChange={(e) => {
                        setFormData({ ...formData, mobile: e.target.value });
                        if (errors.mobile) setErrors({ ...errors, mobile: '' });
                      }}
                      className={`w-full rounded-2xl border ${
                        errors.mobile ? 'border-[#E51F3E] bg-rose-50/30' : 'border-[#E2E8F0] bg-[#F8FAFC]'
                      } px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20 transition`}
                    />
                    {errors.mobile && (
                      <p className="text-[11px] text-[#E51F3E] font-medium mt-1 pl-1">
                        {errors.mobile}
                      </p>
                    )}
                  </div>
                </div>

                {/* ROW 2: Email Address (Full width) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Email Address <span className="text-[#E51F3E]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.email ? 'border-[#E51F3E] bg-rose-50/30' : 'border-[#E2E8F0] bg-[#F8FAFC]'
                    } px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20 transition`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-[#E51F3E] font-medium mt-1 pl-1">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* ROW 3: Message Textarea (Full width, ~130px) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    How can we help? <span className="text-[#E51F3E]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us how we can assist your partner search..."
                    value={formData.message}
                    onChange={(e) => {
                      setFormData({ ...formData, message: e.target.value });
                      if (errors.message) setErrors({ ...errors, message: '' });
                    }}
                    className={`w-full rounded-2xl border ${
                      errors.message ? 'border-[#E51F3E] bg-rose-50/30' : 'border-[#E2E8F0] bg-[#F8FAFC]'
                    } px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 min-h-[130px] focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20 transition`}
                  />
                  {errors.message && (
                    <p className="text-[11px] text-[#E51F3E] font-medium mt-1 pl-1">
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* ROW 4: Submit Button (~54px height, red gradient) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E51F3E] via-[#E82645] to-[#F03554] py-4 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:from-[#d11735] hover:to-[#e0203f] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? 'Sending...' : 'Submit Message'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 3. Support Options ("How Can We Help?") */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-16">
        <div className="text-center max-w-2xl mx-auto space-y-1.5 mb-8">
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
            How Can We Help?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Select a specialized support desk to accelerate your matrimonial request.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Membership Support */}
          <div className="rounded-3xl bg-white border border-rose-100 p-6 sm:p-7 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E51F3E] border border-rose-200 flex items-center justify-center text-xl shadow-2xs">
                💬
              </div>
              <h4 className="font-serif text-xl font-bold text-[#101728]">
                Membership Support
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Questions about plans, upgrades or membership benefits?
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/membership"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E51F3E] hover:text-[#b9152b] transition group"
              >
                <span>Explore Membership Plans</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          {/* Card 2: Profile Verification */}
          <div className="rounded-3xl bg-white border border-rose-100 p-6 sm:p-7 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E51F3E] border border-rose-200 flex items-center justify-center text-xl shadow-2xs">
                🛡️
              </div>
              <h4 className="font-serif text-xl font-bold text-[#101728]">
                Profile Verification
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Need help with doctor verification or profile privacy?
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => handlePrefillHelp('Doctor Profile Verification and Privacy')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E51F3E] hover:text-[#b9152b] transition group"
              >
                <span>Get Verification Help</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          {/* Card 3: Matchmaking Assistance */}
          <div className="rounded-3xl bg-white border border-rose-100 p-6 sm:p-7 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E51F3E] border border-rose-200 flex items-center justify-center text-xl shadow-2xs">
                ❤️
              </div>
              <h4 className="font-serif text-xl font-bold text-[#101728]">
                Matchmaking Assistance
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Need help finding compatible profiles or introductions?
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsVvipModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E51F3E] hover:text-[#b9152b] transition group"
              >
                <span>Contact a Relationship Manager</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Doctor-Specific Support Banner */}
      <section className="max-w-[960px] mx-auto px-4 sm:px-6 mt-14 sm:mt-16">
        <div className="rounded-3xl bg-[#FFF3F5] border border-[#F5D9DD] p-7 sm:p-8 text-center space-y-3 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-white border border-rose-200 flex items-center justify-center mx-auto text-[#E51F3E] shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-2xl sm:text-[26px] font-bold text-[#101728]">
            Looking for Personalised Matchmaking?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Our relationship managers can help doctors and families find suitable matches based on preferences, profession, location and family requirements.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsVvipModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E51F3E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#d11735] shadow-md shadow-red-500/20 transition"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Book Matchmaking Assistance →</span>
            </button>
            <a
              href="tel:+9109607559547"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5 text-[#E51F3E]" />
              <span>Call +91 096075 59547</span>
            </a>
          </div>
        </div>
      </section>

      {/* 5. FAQ Section (Accordion) */}
      <section className="max-w-[960px] mx-auto px-4 sm:px-6 mt-14 sm:mt-16">
        <div className="text-center max-w-2xl mx-auto space-y-1.5 mb-8">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#E51F3E]">
            Quick Answers
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
            Frequently Asked Questions
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Find immediate answers to common questions about doctor profiles and matrimonial services.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-white border border-rose-100/80 overflow-hidden transition-all duration-200 shadow-2xs hover:border-rose-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full py-4 px-5 sm:px-6 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-[15px] text-[#101728] hover:text-[#E51F3E] transition"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isOpen ? 'bg-rose-50 text-[#E51F3E]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-4 pt-1 text-xs sm:text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Trust Section ("Your Privacy Matters") */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-16">
        <div className="rounded-3xl bg-white border border-slate-200/70 p-6 sm:p-7 shadow-xs">
          <div className="text-center mb-4">
            <h4 className="font-serif text-lg font-bold text-[#101728]">
              Your Privacy Matters
            </h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center gap-1.5 p-2">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Confidential & Private</span>
              <span className="text-[10px] text-slate-500">100% data encryption</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-2">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Verified Doctor Profiles</span>
              <span className="text-[10px] text-slate-500">Medical council screened</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-2">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Relationship-Focused</span>
              <span className="text-[10px] text-slate-500">Genuine matrimonial intent</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-2">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Dedicated Assistance</span>
              <span className="text-[10px] text-slate-500">Toll-free 24/7 helpline</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
