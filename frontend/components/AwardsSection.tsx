'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Award as AwardIcon, ArrowRight, Sparkles } from 'lucide-react';
import { fetchPublicAwards, Award } from '../services/awardApi';

export function AwardsSection() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchPublicAwards({ featured: true })
      .then((res) => {
        if (!isMounted) return;
        setAwards(res?.data || []);
      })
      .catch((err) => {
        console.error('Failed to load homepage awards:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!loading && awards.length === 0) {
    return null; // Gracefully hide section if no featured awards are active
  }

  return (
    <section className="bg-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-100 relative">
      <div className="max-w-6xl mx-auto">
        {/* Centered Minimal Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11.5px] font-semibold tracking-wide">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Honors & Recognitions</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Awards
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 font-light max-w-md mx-auto leading-relaxed">
            Recognized by esteemed healthcare councils and matrimonial federations for trust, verification, and matchmaking excellence.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center space-y-3 shadow-xs animate-pulse"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-xl" />
                <div className="w-24 h-4 bg-slate-100 rounded-md" />
                <div className="w-16 h-3 bg-slate-100 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Responsive Logo Grid */}
        {!loading && awards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {awards.map((award) => (
              <Link
                key={award._id}
                href={`/awards/${award.slug}`}
                className="group relative bg-white rounded-2xl border border-slate-100 hover:border-slate-300 p-6 sm:p-7 flex flex-col items-center justify-between text-center transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1"
              >
                {/* Top Year Badge */}
                <span className="text-[10px] font-mono font-semibold text-slate-400 group-hover:text-amber-600 transition-colors uppercase tracking-wider mb-2">
                  {award.awardYear}
                </span>

                {/* Award Logo / Image Container */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-3 mb-4 overflow-hidden transition-transform duration-300 group-hover:scale-105">
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
                <h3 className="font-serif text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-[#E51F3E] transition-colors line-clamp-2">
                  {award.name}
                </h3>

                {/* Organization Subtitle */}
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-medium">
                  {award.organization}
                </p>

                {/* Subtle Hover Action Hint */}
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10.5px] font-bold text-[#E51F3E]">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
