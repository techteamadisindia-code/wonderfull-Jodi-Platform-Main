'use client';

import React from 'react';
import { Home, Mail, Heart } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative bg-[#f6d5d5] rounded-2xl p-8 text-center flex flex-col items-center justify-between border border-[#f0c4c4] shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:bg-[#f8dcdc]">
      {/* Icon container */}
      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
        {icon}
      </div>

      {/* Card Title */}
      <h3 className="font-serif-wedding text-2xl font-bold text-slate-800 tracking-tight mb-4">
        {title}
      </h3>

      {/* Card Divider Line */}
      <div className="w-full border-t border-rose-200/90 my-3"></div>

      {/* Card Description */}
      <p className="text-sm font-normal text-slate-700 leading-relaxed max-w-xs mx-auto mt-2">
        {description}
      </p>
    </div>
  );
}

export function WeddingSearch() {
  // Use CSS class `.pattern-mandala` instead of inline data-URL background

  const cardsData = [
    {
      id: 'worldwide',
      title: 'Search worldwide',
      description:
        'Promote your profile without compromising your time and no traveling needed or no more telling you relatives.',
      icon: <Home className="w-6 h-6 text-red-600 stroke-[2.2]" />,
    },
    {
      id: 'easy-chat',
      title: 'Easy Chat',
      description:
        'Find out more about your match talk about your choices after you find your catergarised match.',
      icon: <Mail className="w-6 h-6 text-red-600 stroke-[2.2]" />,
    },
    {
      id: 'personalised-filter',
      title: 'Personalised Filter',
      description:
        'Get most option relative to your specifications ,and many option to choose from. pick what seems best for you.',
      icon: (
        <div className="relative flex items-center justify-center">
          <Heart className="w-6 h-6 text-red-600 fill-red-600" />
        </div>
      ),
    },
  ];

  return (
    <section className="relative py-20 px-6 overflow-hidden pattern-mandala">
      <div className="mx-auto max-w-6xl text-center relative z-10">
        {/* Main Heading */}
        <h2 className="font-serif-wedding text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Your specified{' '}
          <span className="text-red-600 font-extrabold">Wedding Search</span>{' '}
          gets easier here
        </h2>

        {/* Traditional Ornamental Red Divider */}
        <div className="flex items-center justify-center my-6">
          <svg
            className="w-72 md:w-96 h-8 text-red-600"
            viewBox="0 0 340 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left line & flourish */}
            <line x1="10" y1="15" x2="125" y2="15" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="10" cy="15" r="3.5" fill="#dc2626" />
            <path d="M50 15 C55 10, 65 10, 70 15 C65 20, 55 20, 50 15 Z" fill="#dc2626" opacity="0.85" />

            {/* Center Swirl & Heart/Floral Motif */}
            <g transform="translate(170, 15)">
              <circle cx="0" cy="0" r="4.5" fill="#dc2626" />
              {/* Petals / Loops */}
              <path d="M-14 -12 C-6 -18 6 -18 14 -12 C18 0 10 12 0 16 C-10 12 -18 0 -14 -12 Z" fill="none" stroke="#dc2626" strokeWidth="1.6" />
              <path d="M-22 0 C-14 -8 -6 -8 0 0 C-6 8 -14 8 -22 0 Z" fill="#dc2626" opacity="0.75" />
              <path d="M22 0 C14 -8 6 -8 0 0 C6 8 14 8 22 0 Z" fill="#dc2626" opacity="0.75" />
              <circle cx="-12" cy="0" r="2.5" fill="#dc2626" />
              <circle cx="12" cy="0" r="2.5" fill="#dc2626" />
              <circle cx="0" cy="-10" r="2" fill="#dc2626" />
              <circle cx="0" cy="10" r="2" fill="#dc2626" />
            </g>

            {/* Right line & flourish */}
            <line x1="215" y1="15" x2="330" y2="15" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="330" cy="15" r="3.5" fill="#dc2626" />
            <path d="M270 15 C275 10, 285 10, 290 15 C285 20, 275 20, 270 15 Z" fill="#dc2626" opacity="0.85" />
          </svg>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {cardsData.map((card) => (
            <FeatureCard
              key={card.id}
              icon={card.icon}
              title={card.title}
              description={card.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
