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

export function Testimonials() {
  return (
    <section className="py-12 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50/70 via-rose-50/20 to-white relative overflow-hidden">
      <div className="w-[calc(100%-32px)] sm:w-[calc(100%-64px)] lg:w-[calc(100%-96px)] max-w-[1600px] mx-auto relative z-10 space-y-9">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <span className="text-xs uppercase tracking-[0.22em] font-semibold text-[#E51F3E] bg-[#FCECEE] border border-[#F8CCD2] px-3.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Heart className="w-3.5 h-3.5 fill-[#E51F3E]" /> Real Matrimonial Stories
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Thousands of <span className="text-[#E51F3E]">Happy Marriages</span>
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
            Read heartwarming stories from couples who found their soulmate and began their lifelong journey together through Wonderful Jodi.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-2xl overflow-hidden border border-rose-100/90 shadow-sm hover:shadow-xl hover:shadow-slate-900/6 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group"
            >
              {/* Couple Image Container */}
              <div className="relative h-52 sm:h-56 overflow-hidden bg-slate-100">
                <img
                  src={story.image}
                  alt={story.names}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-4">
                  <span className="text-[10.5px] font-medium text-amber-200 bg-amber-950/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full w-fit mb-1 border border-amber-500/30">
                    {story.weddingDate}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide leading-tight">
                    {story.names}
                  </h3>
                  <p className="text-[11px] text-slate-300">{story.location}</p>
                </div>
              </div>

              {/* Story Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                <div className="flex items-center gap-1 text-[#D99A28]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D99A28] stroke-none" />
                  ))}
                </div>
                <div className="relative">
                  <Quote className="w-6 h-6 text-rose-200 absolute -top-2.5 -left-1.5 -z-10" />
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed italic relative z-10">
                    &ldquo;{story.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#E51F3E]">
                  <span>Verified Match Story</span>
                  <Heart className="w-3.5 h-3.5 fill-[#E51F3E] stroke-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
