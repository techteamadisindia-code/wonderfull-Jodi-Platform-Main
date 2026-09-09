'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Mail,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { adminForgotPassword } from '../../../services/authApi';
import { Logo } from '../../../components/Logo';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your admin email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await adminForgotPassword(trimmedEmail);
      setSuccessMessage(
        response.message ||
          'If an administrative account exists with this email address, a password reset link has been sent.'
      );
    } catch (err: any) {
      console.error('Forgot password error:', err);
      // To prevent enumeration, still show generic safe confirmation or rate-limit notice
      const msg =
        err?.response?.data?.message ||
        'If an administrative account exists with this email address, a password reset link has been sent.';
      setSuccessMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070C16] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(229, 31, 62, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Logo size="xl" variant="dark" showText={false} className="mb-3" />
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Wonderful <span className="text-[#E51F3E]">Jodi</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mt-2.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-amber-400 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Password Recovery</span>
          </div>
        </div>

        {/* Recovery Card */}
        <div className="mt-8 bg-slate-900/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800/90 relative">
          <h2 className="text-xl font-bold text-white mb-1.5">Reset Admin Password</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Enter your authorized administrative email address. We will verify credentials and dispatch a secure recovery token.
          </p>

          {successMessage ? (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-300">Recovery Instructions Sent</p>
                  <p className="text-emerald-200 leading-relaxed">{successMessage}</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                For security reasons, admin reset links expire after <strong>20 minutes</strong> and are single-use.
              </p>

              <div className="pt-2">
                <Link
                  href="/admin/login"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Admin Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-recovery-email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Admin Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-recovery-email"
                    type="email"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="admin@wonderfuljodi.com"
                    className="block w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E] focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] shadow-lg shadow-red-600/30 hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href="/admin/login"
                  className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>

                <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
                  Back to Site
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6 leading-relaxed">
          Authorized administrative personnel only. All recovery requests are logged and monitored.
        </p>
      </div>
    </div>
  );
}
