import React from 'react';
import Link from 'next/link';
import { Heart, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="max-w-md w-full text-center space-y-5 bg-white p-8 rounded-3xl border border-rose-100 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8 fill-[#E51F3E]" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-slate-900">Page Not Found</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            The page you are looking for might have been moved, removed, or is temporarily unavailable.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-[#E51F3E] text-white font-bold text-xs hover:bg-[#d11735] transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Go to Home</span>
          </Link>
          <Link
            href="/search"
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Search Profiles</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
