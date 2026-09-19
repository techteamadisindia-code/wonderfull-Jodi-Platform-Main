'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  ArrowLeft,
  Search,
  Building2,
  Calendar,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { fetchPublicAwards, Award } from '../../services/awardApi';

export default function AwardsPublicIndexPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPublicAwards()
      .then((res) => {
        if (!isMounted) return;
        setAwards(res?.data || []);
      })
      .catch((err) => {
        console.error('Failed to load awards directory:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const list = Array.from(new Set(awards.map((a) => a.category).filter(Boolean)));
    return ['All', ...list];
  }, [awards]);

  const years = useMemo(() => {
    const list = Array.from(
      new Set(awards.map((a) => (a.awardYear ? String(a.awardYear) : '')).filter(Boolean))
    );
    return ['All', ...list.sort((a, b) => b.localeCompare(a))];
  }, [awards]);

  const filteredAwards = useMemo(() => {
    return awards.filter((award) => {
      const matchQuery =
        !searchQuery ||
        award.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        award.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        award.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategory === 'All' || award.category === selectedCategory;

      const matchYear = selectedYear === 'All' || String(award.awardYear) === selectedYear;

      return matchQuery && matchCategory && matchYear;
    });
  }, [awards, searchQuery, selectedCategory, selectedYear]);

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#E51F3E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>Verified Honors Directory</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Awards & <span className="text-[#E51F3E]">Recognitions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            National and industry distinctions earned by Wonderful Jodi for exemplary medical matchmaking integrity, verified privacy standards, and trusted community service.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search input */}
            <div className="relative sm:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search awards by name, organization or keyword..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] transition"
              />
            </div>

            {/* Category Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] transition"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] transition"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y === 'All' ? 'All Years' : `Year ${y}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-pulse space-y-4"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto" />
                <div className="w-3/4 h-5 bg-slate-100 rounded mx-auto" />
                <div className="w-full h-12 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAwards.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/70 shadow-xs max-w-md mx-auto space-y-3">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-slate-800">No Awards Found</h3>
            <p className="text-xs text-slate-500">
              No awards matched your search or filter criteria. Try adjusting your query.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedYear('All');
              }}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Awards Grid */}
        {!loading && filteredAwards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAwards.map((award) => (
              <Link
                key={award._id}
                href={`/awards/${award.slug}`}
                className="group relative bg-white rounded-3xl border border-slate-200/70 hover:border-[#E51F3E]/40 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-1"
              >
                <div>
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[10.5px] font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                      {award.awardYear}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 uppercase tracking-wider">
                      {award.category || 'Award'}
                    </span>
                  </div>

                  {/* Logo Container */}
                  <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-3 mb-5 mx-auto overflow-hidden group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={award.logo}
                      alt={award.name}
                      className="w-full h-full object-contain filter contrast-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=300&q=80';
                      }}
                    />
                  </div>

                  {/* Award Name */}
                  <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#E51F3E] transition-colors leading-snug text-center mb-2">
                    {award.name}
                  </h2>

                  {/* Organization */}
                  <p className="text-xs font-medium text-slate-500 text-center mb-3">
                    Conferred by {award.organization}
                  </p>

                  {/* Short Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed text-center font-normal">
                    {award.shortDescription}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="pt-5 border-t border-slate-100 mt-5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                    Official Recognition
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#E51F3E] group-hover:translate-x-0.5 transition-transform">
                    <span>Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
