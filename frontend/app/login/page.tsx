'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { setAuthToken } from '../../lib/api';
import { Heart, ShieldCheck, Lock, Sparkles } from 'lucide-react';

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
    <main className="min-h-screen bg-slate-50 py-16 px-6 flex items-center justify-center">
      <div className="mx-auto max-w-4xl w-full bg-white rounded-3xl border border-rose-100 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side Graphic */}
        <div className="bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
                ❤️
              </div>
              <span className="font-serif text-2xl font-bold">Wonderful Jodi</span>
            </Link>

            <h2 className="font-serif text-3xl font-bold tracking-tight text-rose-100 mt-8">
              Welcome Back To Your Matrimonial Journey
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Log in to view newly matched verified profiles, manage interest requests, and chat securely with candidates.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-800 space-y-2 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Encrypted & Privacy Protected</span>
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="p-10 flex flex-col justify-center">
          <h1 className="font-serif text-3xl font-bold text-slate-900">Sign In</h1>
          <p className="mt-1 text-xs text-slate-500">Access your account to connect with matches.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email address or Mobile number</label>
              <input
                type="text"
                required
                value={emailOrMobile}
                onChange={(event) => setEmailOrMobile(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="enter email or mobile"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-semibold text-white shadow-md hover:from-red-700 hover:to-rose-700 transition disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In Now'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="font-bold text-red-600 hover:underline">
              Create Free Profile
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
