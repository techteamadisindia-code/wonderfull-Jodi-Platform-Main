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
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${awards.length === 3 ? 'md:grid-cols-3 max-w-4xl' : 'md:grid-cols-4 max-w-5xl'} gap-5 sm:gap-6 mx-auto`}>
            {awards.map((award) => (
              <Link
                key={award._id}
                href={`/awards/${award.slug}`}
                className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 p-6 sm:p-7 flex flex-col items-center justify-between text-center transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1"
              >
                {/* Top Year Badge */}
                <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200/50 uppercase tracking-wider mb-2.5">
                  {award.awardYear}
                </span>

                {/* Award Logo / Image Container */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/90 border border-slate-200/80 flex items-center justify-center p-2 mb-4 overflow-hidden transition-transform duration-300 group-hover:scale-105 shadow-2xs relative">
                  <img
                    src={award.logo || (award as any).image || (award.galleryImages && award.galleryImages[0])}
                    alt={award.name}
                    className="w-full h-full object-cover rounded-xl"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.award-fallback-icon');
                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                    }}
                  />
                  <div
                    className="award-fallback-icon hidden w-full h-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-rose-50 text-amber-600 rounded-xl"
                    aria-hidden="true"
                  >
                    <Trophy className="w-9 h-9 text-amber-500 mb-0.5" />
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-700/80">Honor</span>
                  </div>
                </div>

                {/* Award Name */}
                <h3 className="font-serif text-sm sm:text-[15px] font-bold text-slate-900 leading-snug group-hover:text-[#E51F3E] transition-colors line-clamp-2">
                  {award.name}
                </h3>

                {/* Organization Subtitle */}
                <p className="text-xs sm:text-[12.5px] text-slate-500 line-clamp-1 mt-1 font-medium">
                  {award.organization}
                </p>

                {/* Subtle Hover Action Hint */}
                <div className="mt-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11.5px] font-bold text-[#E51F3E]">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
