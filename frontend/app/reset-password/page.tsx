'use client';

import { FormEvent, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import {
  Heart,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { FallingHearts } from '../../components/FallingHearts';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenErrorMsg, setTokenErrorMsg] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password criteria checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&^#()_\-+={}[\]:;"'<>,.~`|\\]/.test(password);

  const criteriaCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length;
  const isPasswordValid = criteriaCount === 5;

  useEffect(() => {
    async function checkToken() {
      if (!token || token.trim() === '') {
        setTokenValid(false);
        setTokenErrorMsg('This reset link is invalid.');
        setValidatingToken(false);
        return;
      }

      try {
        await api.get(`/auth/validate-reset-token?token=${encodeURIComponent(token.trim())}`);
        setTokenValid(true);
      } catch (err: any) {
        setTokenValid(false);
        setTokenErrorMsg(
          err?.response?.data?.message ||
            'This password reset link is invalid or has expired.'
        );
      } finally {
        setValidatingToken(false);
      }
    }

    checkToken();
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet the required security criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/auth/reset-password', {
        token: token.trim(),
        password,
        confirmPassword,
      });

      // Redirect to login with success query parameter
      router.push('/login?reset=success');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to reset password. Please request a new reset link.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Loading Token State
  if (validatingToken) {
    return (
      <div className="relative z-10 mx-auto max-w-md w-full bg-white rounded-3xl border border-rose-100 shadow-xl p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-[#E51F3E]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="font-serif text-xl font-bold text-slate-900">Verifying Reset Link</h2>
        <p className="text-xs text-slate-500">Please wait while we validate your secure token...</p>
      </div>
    );
  }

  // Invalid or Expired Token State
  if (!tokenValid) {
    return (
      <div className="relative z-10 mx-auto max-w-md w-full bg-white rounded-3xl border border-rose-100 shadow-xl p-8 sm:p-10 text-center space-y-5 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-serif text-2xl font-bold text-slate-900">Reset Link Expired</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {tokenErrorMsg || 'This password reset link is invalid or has expired.'}
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <Link
            href="/forgot-password"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CE102F] py-3.5 text-sm font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Request New Reset Link</span>
          </Link>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  // Active Valid Token Reset Password Form
  return (
    <div className="relative z-10 mx-auto max-w-4xl w-full bg-white rounded-3xl border border-rose-100 shadow-xl shadow-slate-900/5 overflow-hidden grid grid-cols-1 md:grid-cols-2 animate-fade-in">
      {/* Left Column - Graphic Branding */}
      <div className="bg-gradient-to-br from-[#101828] via-[#1E293B] to-[#101828] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(229, 31, 62, 0.25) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        <div className="relative z-10 space-y-4">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E51F3E] to-[#F03554] flex items-center justify-center text-white shadow-md shadow-red-500/25">
              <Heart className="w-4 h-4 fill-white stroke-none" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">
              Wonderful <span className="text-[#E51F3E]">Jodi</span>
            </span>
          </Link>

          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">❤ Matrimony</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1 leading-tight">
              Create New Password
            </h2>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
            Set a new secure password for your Wonderful Jodi account to protect your matrimonial profile and communication.
          </p>
        </div>

        <div className="relative z-10 pt-8 border-t border-slate-800 space-y-2 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white">🔒 Bank-Grade Encryption</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal pl-6">
            Your new password will be encrypted using industry-standard bcrypt hashing.
          </p>
        </div>
      </div>

      {/* Right Column - Reset Form */}
      <div className="p-8 sm:p-10 flex flex-col justify-center">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Create New Password</h1>
        <p className="mt-1 text-xs text-slate-500">
          Set a new secure password for your Wonderful Jodi account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4.5">
          {/* New Password */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-4 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition font-medium"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Strength Meter & Requirements Checklist */}
          {password.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5 text-left text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
                  Password Strength:
                </span>
                <span
                  className={`font-bold text-[11px] ${
                    criteriaCount <= 2
                      ? 'text-rose-600'
                      : criteriaCount <= 4
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {criteriaCount <= 2 ? 'Weak' : criteriaCount <= 4 ? 'Moderate' : 'Strong'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    criteriaCount <= 2
                      ? 'bg-rose-500 w-1/3'
                      : criteriaCount <= 4
                      ? 'bg-amber-500 w-2/3'
                      : 'bg-emerald-500 w-full'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                  {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                  <span>Min 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                  {hasUppercase ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                  <span>Uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                  {hasLowercase ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                  <span>Lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                  {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                  <span>Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                  {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                  <span>Special character (!@#$)</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm New Password */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (error) setError('');
                }}
                className={`w-full rounded-xl border bg-slate-50/70 pl-4 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white transition font-medium ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:border-[#E51F3E] focus:ring-[#E51F3E]/20'
                }`}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">Passwords do not match.</p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-fade-in text-left">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CE102F] py-3.5 text-sm font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-75 cursor-pointer select-none"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Resetting Password...</span>
              </>
            ) : (
              <>
                <span>Reset Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Remembered your password?{' '}
          <Link href="/login" className="font-bold text-[#E51F3E] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen min-h-[100dvh] w-full bg-[#FFF9F5] py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Subtle Romantic Falling Hearts Background Animation */}
      <FallingHearts />

      <Suspense
        fallback={
          <div className="relative z-10 text-center text-sm text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#E51F3E]" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
