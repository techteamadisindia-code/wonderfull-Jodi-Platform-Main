'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { setAuthToken } from '../../lib/api';
import { Heart, ShieldCheck, Lock, Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] py-12 sm:py-16 px-4 sm:px-6 flex items-center justify-center">
      <div className="mx-auto max-w-4xl w-full bg-white rounded-3xl border border-rose-100 shadow-xl shadow-slate-900/5 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side Graphic */}
        <div className="bg-gradient-to-br from-[#101828] via-[#1E293B] to-[#101828] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Red Glow */}
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

            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white mt-8 leading-tight">
              Welcome Back To Your Matrimonial Journey
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              Log in to view newly matched verified profiles, manage interest requests, and chat securely with candidates.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-800 space-y-2 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Encrypted & Privacy Protected</span>
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">Sign In</h1>
          <p className="mt-1 text-xs text-slate-500">Access your account to connect with matches.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email address or Mobile number</label>
              <input
                type="text"
                required
                value={emailOrMobile}
                onChange={(event) => setEmailOrMobile(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition font-medium"
                placeholder="e.g. rahul@example.com or 9876543210"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CE102F] py-3.5 text-sm font-bold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50"
            >
              <span>{loading ? 'Signing in…' : 'Sign In Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="font-bold text-[#E51F3E] hover:underline">
              Create Free Profile
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
