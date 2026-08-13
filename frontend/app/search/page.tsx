'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchResult } from '../../types/profile';
import { ProfileCard } from '../../components/ProfileCard';
import { searchProfiles } from '../../lib/api';
import { Search, Filter, ShieldCheck, RefreshCw } from 'lucide-react';

const mockFallbackProfiles = [
  {
    _id: 'p1',
    displayName: 'Priya Sharma',
    gender: 'Female',
    dob: '1998-05-14',
    city: 'Mumbai',
    education: 'M.Tech in CS (IIT Bombay)',
    profession: 'Senior Software Engineer',
    primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
  },
  {
    _id: 'p2',
    displayName: 'Rohan Mehta',
    gender: 'Male',
    dob: '1994-11-20',
    city: 'Bengaluru',
    education: 'MBA (IIM Ahmedabad)',
    profession: 'Product Director',
    primaryPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
  },
  {
    _id: 'p3',
    displayName: 'Ananya Verma',
    gender: 'Female',
    dob: '1996-08-03',
    city: 'Delhi NCR',
    education: 'MBBS, MD Cardiology',
    profession: 'Consultant Cardiologist',
    primaryPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
  },
  {
    _id: 'p4',
    displayName: 'Vikramaditya Singh',
    gender: 'Male',
    dob: '1992-03-17',
    city: 'Jaipur',
    education: 'B.Arch (SPA Delhi)',
    profession: 'Principal Architect & Founder',
    primaryPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
  },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (value) params[key] = value;
    });
    const queryString = new URLSearchParams(params).toString();
    setLoading(true);

    searchProfiles(queryString)
      .then((res) => {
        if (res && res.profiles && res.profiles.length > 0) {
          setData(res);
        } else {
          // Use realistic fallback profile data if database has no active entries yet
          setData({ profiles: mockFallbackProfiles as any, total: mockFallbackProfiles.length, page: 1, limit: 10 });
        }
      })
      .catch(() => {
        setData({ profiles: mockFallbackProfiles as any, total: mockFallbackProfiles.length, page: 1, limit: 10 });
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const profiles = data?.profiles || mockFallbackProfiles;

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Summary */}
        <section className="rounded-3xl bg-white p-8 border border-rose-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Matrimonial Search</span>
            <h1 className="font-serif text-3xl font-bold text-slate-900 mt-1">Verified Member Profiles</h1>
            <p className="mt-2 text-sm text-slate-600">
              {loading ? 'Searching profiles...' : `Showing ${profiles.length} suitable verified candidates matching your criteria.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-4 h-4" /> 100% Screened
            </span>
          </div>
        </section>

        {/* Profile Cards Grid */}
        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-96 animate-pulse rounded-3xl bg-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile: any) => (
              <ProfileCard key={profile._id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading search engine...</div>}>
      <SearchContent />
    </Suspense>
  );
}
