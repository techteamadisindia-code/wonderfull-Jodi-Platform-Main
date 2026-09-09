'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { adminLogin } from '../../../services/authApi';
import { Logo } from '../../../components/Logo';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [resetSuccessNotice, setResetSuccessNotice] = useState(false);

  // Handle URL query parameters (?session_expired=1, ?reset=success)
  useEffect(() => {
    const expiredParam = searchParams.get('session_expired');
    const resetParam = searchParams.get('reset');

    if (expiredParam === '1' || expiredParam === 'true') {
      setSessionExpiredNotice(true);
      // Clean query parameter from address bar using History API without causing a page reload
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    if (resetParam === 'success') {
      setResetSuccessNotice(true);
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [searchParams]);

  // Safe redirect validator to prevent open redirect vulnerabilities
  const getSafeRedirectUrl = (): string => {
    const redirectParam = searchParams.get('redirect');
    if (
      redirectParam &&
      redirectParam.startsWith('/admin') &&
      !redirectParam.startsWith('/admin/login') &&
      !redirectParam.includes('//') &&
      !redirectParam.includes(':')
    ) {
      return redirectParam;
    }
    return '/admin/dashboard';
  };

  const validateInputs = (): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your admin email.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Please enter your password.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSessionExpiredNotice(false);
    setResetSuccessNotice(false);

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      await adminLogin(email.trim(), password);
      const targetUrl = getSafeRedirectUrl();
      router.replace(targetUrl);
    } catch (err: any) {
      console.error('Admin login authentication error:', err?.message);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Invalid email or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isDevMode = process.env.NODE_ENV === 'development';

  const handleDevFill = () => {
    setEmail('admin@wonderfuljodi.com');
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070C16] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Subtle Background Glow Elements */}
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
            <span>Administrator Control Center</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-slate-900/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800/90 relative">
          {/* Session Expired Banner */}
          {sessionExpiredNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-200 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Session Expired</p>
                <p className="mt-0.5">Your admin session has expired. Please sign in again.</p>
              </div>
            </div>
          )}

          {/* Password Reset Success Banner */}
          {resetSuccessNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300">Password Reset Successful</p>
                <p className="mt-0.5">Your password has been reset. Please sign in with your new credentials.</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-300">Authentication Failed:</span>
                <span className="ml-1 text-rose-200">{error}</span>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Admin Email Input */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
              >
                Admin Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
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

            {/* Secret Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Secret Password
                </label>
                <Link
                  href="/admin/forgot-password"
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-11 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none focus:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] shadow-lg shadow-red-600/30 hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Dev Only Helper & Back to Site */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              {isDevMode ? (
                <button
                  type="button"
                  onClick={handleDevFill}
                  className="text-xs font-semibold text-amber-400/80 hover:text-amber-300 flex items-center gap-1.5 transition"
                  title="Development mode autofill helper"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dev Autofill</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">Secure 256-bit TLS</span>
              )}

              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                <span>Back to Site</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </form>
        </div>

        {/* Security Audit Notice */}
        <p className="text-center text-[11px] text-slate-500 mt-6 leading-relaxed">
          Authorized administrative personnel only. All access attempts and activities are securely audited.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070C16] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#E51F3E]" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
