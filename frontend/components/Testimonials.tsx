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
    image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=1000&h=1000',
    quote: 'We found each other on Wonderful Jodi within 3 weeks. The verified profile process gave our families complete confidence from day one!',
  },
  {
    id: '2',
    names: 'Rohan & Meera',
    weddingDate: 'Married Oct 2025',
    location: 'Bengaluru, Karnataka',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1000&h=1000',
    quote: 'The personalized search filters helped us discover shared values, interests, and family backgrounds effortlessly. Highly recommended!',
  },
  {
    id: '3',
    names: 'Aditya & Pooja',
    weddingDate: 'Married Jan 2026',
    location: 'Delhi NCR',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1000&h=1000',
    quote: 'Easy Chat made getting to know each other simple and comfortable before arranging the family meeting. Thank you Wonderful Jodi!',
  },
  {
    id: '4',
    names: 'Rahul & Sneha',
    weddingDate: 'Married Feb 2026',
    location: 'Pune, Maharashtra',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1000&h=1000',
    quote: 'Wonderful Jodi made our search meaningful and secure. We loved how the platform respects privacy while ensuring authenticity. Our forever gratitude!',
  },
];

export function Testimonials() {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-slate-50 via-rose-50/30 to-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-red-600 bg-red-50 border border-red-200 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-4">
            <Heart className="w-3.5 h-3.5 fill-red-600" /> Real Matrimonial Stories
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Thousands of <span className="text-red-600">Happy Marriages</span>
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
            Read heartwarming stories from couples who found their soulmate and began their lifelong journey together through Wonderful Jodi.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-3xl overflow-hidden border border-rose-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between group"
            >
              {/* Couple Image Container */}
              <div className="relative h-64 overflow-hidden bg-slate-100">
                <img
                  src={story.image}
                  alt={story.names}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent flex flex-col justify-end p-6">
                  <span className="text-xs font-medium text-amber-300 bg-amber-950/60 backdrop-blur-md px-3 py-1 rounded-full w-fit mb-1 border border-amber-500/30">
                    {story.weddingDate}
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-white tracking-wide">
                    {story.names}
                  </h3>
                  <p className="text-xs text-slate-300">{story.location}</p>
                </div>
              </div>

              {/* Story Content */}
              <div className="p-8 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 stroke-none" />
                  ))}
                </div>
                <div className="relative">
                  <Quote className="w-8 h-8 text-rose-200 absolute -top-3 -left-2 -z-10" />
                  <p className="text-sm text-slate-600 leading-relaxed italic relative z-10">
                    &ldquo;{story.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-red-600">
                  <span>Verified Match Story</span>
                  <Heart className="w-4 h-4 fill-red-600 stroke-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
