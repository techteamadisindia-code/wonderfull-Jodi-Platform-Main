'use client';

import { FormEvent, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api, { setAuthToken } from '../../lib/api';
import { Heart, ShieldCheck, Lock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FallingHearts } from '../../components/FallingHearts';
import { Logo } from '../../components/Logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'success';

  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { emailOrMobile, password });
      if (response.data?.data?.token) {
        setAuthToken(response.data.data.token);
      }
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-4xl w-full bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1DB] shadow-md shadow-slate-900/5 overflow-hidden grid grid-cols-1 md:grid-cols-2">
      {/* Left Side Graphic */}
      <div className="bg-gradient-to-br from-[#101828] via-[#1E293B] to-[#101828] text-white p-6 sm:p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle Ambient Red Glow */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(229, 31, 62, 0.25) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        <div className="relative z-10 space-y-4">
          <Logo size="md" variant="dark" subtitle="Doctor Matrimony" />

          <h2 className="font-serif text-xl sm:text-2xl md:text-[26px] lg:text-[28px] font-bold tracking-tight text-white mt-4 sm:mt-6 md:mt-8 leading-tight">
            Welcome back to the sweet journey of finding your other half
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
            Log in to continue your journey, discover meaningful connections, and take the next step toward finding your perfect match.
          </p>
        </div>

        <div className="relative z-10 pt-6 sm:pt-8 border-t border-slate-800 space-y-2 text-xs text-rose-200 mt-6 md:mt-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Encrypted & Privacy Protected</span>
          </div>
        </div>
      </div>

      {/* Right Side Form */}
      <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Sign In</h1>
        <p className="mt-1 text-xs text-slate-500">Access your account to connect with matches.</p>

        {resetSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-fade-in text-left">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>Your password has been reset successfully. Please log in with your new password.</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email address or Mobile number</label>
            <input
              type="text"
              required
              value={emailOrMobile}
              onChange={(event) => setEmailOrMobile(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition font-medium"
              placeholder="e.g. rahul@example.com or 9876543210"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#E51F3E] hover:text-[#CE102F] hover:underline transition"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition font-medium"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="pt-0.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CE102F] py-3 text-sm font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Signing in…' : 'Sign In Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-5 text-center text-xs text-slate-500">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="font-bold text-[#E51F3E] hover:underline">
            Create Free Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen min-h-[100dvh] w-full bg-[#FAF7F4] py-6 sm:py-10 md:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Subtle Romantic Falling Hearts Background Animation */}
      <FallingHearts />

      <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
