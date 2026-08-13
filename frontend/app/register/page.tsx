'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { setAuthToken } from '../../lib/api';
import { ShieldCheck, Sparkles, Heart } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/register', { fullName, email, mobile, password });
      if (response.data?.data?.token) {
        setAuthToken(response.data.data.token);
      }
      setSuccess('Your profile has been created successfully! Redirecting...');
      setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      setError('Registration failed. Please check your details.');
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

            <h2 className="font-serif text-3xl font-bold tracking-tight text-rose-100 mt-6">
              Create Your Free Matrimonial Profile
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Find life partners who share your culture, education, and family values. Over 100,000+ verified profiles waiting for you!
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-800 space-y-2 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Free Registration & Privacy Guaranteed</span>
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="p-10 flex flex-col justify-center">
          <h1 className="font-serif text-3xl font-bold text-slate-900">Register Free</h1>
          <p className="mt-1 text-xs text-slate-500">Fill in basic details to start searching.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. Ananya Sharma"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ananya@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="+91 9876543210"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-semibold text-white shadow-md hover:from-red-700 hover:to-rose-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating Account…' : 'Register Profile Free'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link href="/login" className="font-bold text-red-600 hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
