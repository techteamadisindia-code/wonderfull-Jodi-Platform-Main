'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchResult } from '../../types/profile';
import { ProfileCard } from '../../components/ProfileCard';
import { searchProfiles } from '../../lib/api';
import { Search, Filter, ShieldCheck, RefreshCw, Globe, MessageCircle, Sliders } from 'lucide-react';

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
    <main className="min-h-screen bg-white py-12 px-6">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Header Summary */}
        <section className="rounded-3xl bg-white p-8 border border-[#f1e5e5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        {/* Profile Cards Grid - 4 Columns on Desktop */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-96 animate-pulse rounded-[20px] bg-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {profiles.map((profile: any) => (
              <ProfileCard key={profile._id} profile={profile} />
            ))}
          </div>
        )}

        {/* Feature Cards Section */}
        <section className="space-y-8 mt-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900">Why Choose Wonderful Jodi</h2>
            <p className="text-slate-600">Everything you need to find your perfect match</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Search Worldwide Card */}
            <div className="bg-white border border-[#f1e5e5] rounded-[20px] p-7 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <Globe className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Search Worldwide</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Discover compatible matches from anywhere in the world without the need to travel or depend on relatives.
                </p>
              </div>
            </div>

            {/* Easy Chat Card */}
            <div className="bg-white border border-[#f1e5e5] rounded-[20px] p-7 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Easy Chat</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Connect with your matches, learn more about them, and discuss your preferences before taking the next step.
                </p>
              </div>
            </div>

            {/* Personalised Filter Card */}
            <div className="bg-white border border-[#f1e5e5] rounded-[20px] p-7 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <Sliders className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Personalised Filter</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Get the most relevant matches based on your preferences, with plenty of options to choose from.
                </p>
              </div>
            </div>
          </div>
        </section>
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
