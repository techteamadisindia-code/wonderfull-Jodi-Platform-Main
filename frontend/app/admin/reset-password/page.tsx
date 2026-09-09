'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { adminValidateResetToken, adminResetPassword } from '../../../services/authApi';

function AdminResetPasswordForm() {
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
  const [error, setError] = useState<string | null>(null);

  // Strong password complexity checks (Min 12 chars, upper, lower, number, special)
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&^#()_\-+={}[\]:;"'<>,.~`|\\]/.test(password);

  const criteriaCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(
    Boolean
  ).length;
  const isPasswordValid = criteriaCount === 5;

  useEffect(() => {
    async function checkToken() {
      if (!token || token.trim() === '') {
        setTokenValid(false);
        setTokenErrorMsg('This password reset link is invalid or incomplete.');
        setValidatingToken(false);
        return;
      }

      try {
        await adminValidateResetToken(token.trim());
        setTokenValid(true);
      } catch (err: any) {
        setTokenValid(false);
        setTokenErrorMsg(
          err?.response?.data?.message ||
            'This password reset link is invalid, expired, or has already been used.'
        );
      } finally {
        setValidatingToken(false);
      }
    }

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Password does not meet the 12-character security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await adminResetPassword(token.trim(), password, confirmPassword);
      // Redirect to admin login with success indicator
      router.replace('/admin/login?reset=success');
    } catch (err: any) {
      console.error('Password reset failure:', err);
      setError(
        err?.response?.data?.message ||
          'Failed to reset administrator password. Please request a new link.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl py-10 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800/90 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-[#E51F3E]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white">Validating Security Token</h2>
        <p className="text-xs text-slate-400">Verifying cryptographic reset authorization...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800/90 text-center space-y-5 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/70 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-white">Reset Link Invalid or Expired</h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            {tokenErrorMsg || 'This administrator password reset link has expired or has already been used.'}
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <Link
            href="/admin/forgot-password"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] shadow-lg shadow-red-600/30 hover:shadow-red-600/40 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Request New Reset Link</span>
          </Link>
          <Link
            href="/admin/login"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800/90 relative animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-1">Set New Admin Password</h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        Choose a strong, unique master password for your administrator access.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {/* New Password */}
        <div>
          <label
            htmlFor="new-admin-password"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
          >
            New Secret Password
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="new-admin-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Minimum 12 characters"
              className="block w-full pl-10 pr-11 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E] focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Password Strength Indicator */}
        {password.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">
                Complexity Strength:
              </span>
              <span
                className={`font-bold text-[11px] ${
                  criteriaCount <= 2
                    ? 'text-rose-400'
                    : criteriaCount <= 4
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {criteriaCount <= 2 ? 'Weak' : criteriaCount <= 4 ? 'Moderate' : 'Strong'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
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
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {hasMinLength ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                )}
                <span>Min 12 characters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasUppercase ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {hasUppercase ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                )}
                <span>Uppercase letter (A-Z)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasLowercase ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {hasLowercase ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                )}
                <span>Lowercase letter (a-z)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {hasNumber ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                )}
                <span>Number (0-9)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 sm:col-span-2 ${
                  hasSpecialChar ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {hasSpecialChar ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                )}
                <span>Special character (!@#$%^&*()_+-=)</span>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirm-admin-password"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
          >
            Confirm New Password
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirm-admin-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Re-enter password"
              className="block w-full pl-10 pr-11 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E] focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-[11px] text-rose-400 font-medium">Passwords do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] shadow-lg shadow-red-600/30 hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <span>Save & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="pt-2 border-t border-slate-800/80 text-center">
          <Link
            href="/admin/login"
            className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel and Return to Sign In</span>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#070C16] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Background Glow */}
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
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="group focus:outline-none">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E51F3E] via-[#E82645] to-[#F03554] flex items-center justify-center text-white shadow-xl shadow-red-500/25 mb-4 group-hover:scale-105 transition-transform duration-200">
              <Heart className="w-7 h-7 fill-white stroke-none" />
            </div>
          </Link>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
            Wonderful <span className="text-[#E51F3E]">Jodi</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mt-2.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-amber-400 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Master Password Reset</span>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="bg-slate-900/95 py-10 text-center text-white rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-[#E51F3E] mx-auto" />
            </div>
          }
        >
          <AdminResetPasswordForm />
        </Suspense>

        <p className="text-center text-[11px] text-slate-500 mt-6 leading-relaxed">
          Authorized administrative personnel only. All access attempts and activities are securely audited.
        </p>
      </div>
    </div>
  );
}
