'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { Heart, ShieldCheck, ArrowLeft, Mail, AlertCircle, CheckCircle2, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { FallingHearts } from '../../components/FallingHearts';
import { Logo } from '../../components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateEmail = (val: string): boolean => {
    if (!val || val.trim() === '') {
      setError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccessMsg(
        response.data?.message ||
          'If an account exists with this email address, a password reset link has been sent.'
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'An error occurred while processing your request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen min-h-[100dvh] w-full bg-[#FFF9F5] py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Subtle Romantic Falling Hearts Background Animation - strictly contained inside main */}
      <FallingHearts />

      <div className="relative z-10 mx-auto max-w-4xl w-full bg-white rounded-2xl sm:rounded-3xl border border-rose-100 shadow-xl shadow-slate-900/5 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side Graphic Banner */}
        <div className="bg-gradient-to-br from-[#101828] via-[#1E293B] to-[#101828] text-white p-6 sm:p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Red Glow */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(229, 31, 62, 0.25) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />

          <div className="relative z-10 space-y-4">
            <Logo size="md" variant="dark" subtitle="Verified Matrimony" />

            <div className="pt-2 sm:pt-4">
              <h2 className="font-serif text-xl sm:text-2xl md:text-[26px] lg:text-[28px] font-bold tracking-tight text-white mt-1 leading-tight">
                Find Your Perfect Match
              </h2>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              Reset your password securely and continue your beautiful journey to discovering your life partner.
            </p>
          </div>

          <div className="relative z-10 pt-6 sm:pt-8 border-t border-slate-800 space-y-2 text-xs text-rose-200 mt-6 md:mt-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">🔒 Secure Access</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal pl-6">
              Your account is protected with advanced security and encrypted token authentication.
            </p>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Forgot Password?</h1>
          <p className="mt-1 text-xs text-slate-500">
            Enter your registered email address and we&apos;ll send a reset link.
          </p>

          {successMsg ? (
            <div className="mt-6 space-y-5 animate-fade-in text-left">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[13px] text-emerald-950">Reset Link Dispatched</p>
                  <p className="text-emerald-800 font-normal leading-relaxed">{successMsg}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Please check your email inbox and spam folder. The link will remain active for <strong>30 minutes</strong>.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-xs font-bold text-white transition shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg('');
                    setEmail('');
                  }}
                  className="w-full inline-flex items-center justify-center py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl border border-slate-200 transition"
                >
                  Send Another Link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError('');
                    }}
                    className={`w-full rounded-xl border bg-slate-50/70 pl-10 pr-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition font-medium ${
                      error
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:border-[#E51F3E] focus:ring-[#E51F3E]/20'
                    }`}
                    placeholder="e.g. priya.sharma@example.com"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-fade-in text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-0.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CE102F] py-3 text-sm font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-75 cursor-pointer select-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Bottom Navigation Links */}
          <div className="mt-5 pt-4 sm:mt-6 sm:pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#E51F3E] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Need Help?</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
