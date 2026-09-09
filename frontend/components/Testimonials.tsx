'use client';

import React from 'react';
import { Heart, Star, Quote } from 'lucide-react';

interface Story {
  id: string;
  names: string;
  weddingDate: string;
  location: string;
  image: string;
  quote: string;
}

const stories: Story[] = [
  {
    id: '1',
    names: 'Vikram & Ananya',
    weddingDate: 'Married Dec 2025',
    location: 'Mumbai, Maharashtra',
    image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800&h=600',
    quote: 'We found each other on Wonderful Jodi within 3 weeks. The verified profile process gave our families complete confidence from day one!',
  },
  {
    id: '2',
    names: 'Rohan & Meera',
    weddingDate: 'Married Oct 2025',
    location: 'Bengaluru, Karnataka',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800&h=600',
    quote: 'The personalized search filters helped us discover shared values, interests, and family backgrounds effortlessly. Highly recommended!',
  },
  {
    id: '3',
    names: 'Aditya & Pooja',
    weddingDate: 'Married Jan 2026',
    location: 'Delhi NCR',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800&h=600',
    quote: 'Easy Chat made getting to know each other simple and comfortable before arranging the family meeting. Thank you Wonderful Jodi!',
  },
  {
    id: '4',
    names: 'Rahul & Sneha',
    weddingDate: 'Married Feb 2026',
    location: 'Pune, Maharashtra',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800&h=600',
    quote: 'Wonderful Jodi made our search meaningful and secure. We loved how the platform respects privacy while ensuring authenticity.',
  },
];

import Link from 'next/link';

export function Testimonials() {
  return (
    <section className="py-8 sm:py-11 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] relative overflow-hidden">
      <div className="w-full max-w-[1280px] mx-auto relative z-10 space-y-5 sm:space-y-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Thousands of <span className="text-[#E51F3E]">Happy Marriages</span>
          </h2>
          <p className="text-slate-600 text-[13px] sm:text-[14px] leading-relaxed max-w-xl mx-auto">
            Read heartwarming stories from couples who found their soulmate and began their lifelong journey together through Wonderful Jodi.
          </p>
        </div>

        {/* Stories Grid: 2 cols on mobile (>=360px), 1 col on <360px, 4 cols on desktop */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-[rgba(180,160,150,0.22)] shadow-2xs hover:shadow-md hover:border-rose-200 transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between group"
            >
              {/* Couple Image Container */}
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={story.image}
                  alt={story.names}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,23,42,0.85)] via-[rgba(15,23,42,0.30)] to-[rgba(15,23,42,0.05)] flex flex-col justify-end p-3 sm:p-3.5">
                  <span className="text-[11px] font-medium text-amber-200 bg-amber-950/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full w-fit mb-1 border border-amber-500/30">
                    {story.weddingDate}
                  </span>
                  <h3 className="font-serif text-[15.5px] sm:text-[17px] font-bold text-white tracking-wide leading-tight">
                    {story.names}
                  </h3>
                  <p className="text-[12px] text-slate-300">{story.location}</p>
                </div>
              </div>

              {/* Story Content */}
              <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center gap-1 text-[#D99A28]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D99A28] stroke-none" />
                  ))}
                </div>
                <div className="relative">
                  <Quote className="w-5 h-5 text-rose-200 absolute -top-2 -left-1 -z-10" />
                  <p className="text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed italic relative z-10">
                    &ldquo;{story.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-500 flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-[#E51F3E] text-[#E51F3E]" />
                    <span>Verified Story</span>
                  </span>
                  <Link
                    href="/stories"
                    className="font-bold text-[#E51F3E] hover:text-[#c91834] transition inline-flex items-center gap-0.5 hover:underline"
                  >
                    <span>View Full Story</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
