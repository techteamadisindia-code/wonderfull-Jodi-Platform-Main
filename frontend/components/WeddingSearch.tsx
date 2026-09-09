'use client';

import React from 'react';
<<<<<<< HEAD
import { UserCheck, MessageSquareHeart, HeartHandshake, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface StepCardProps {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
}

function StepCard({ step, icon, title, description, badge }: StepCardProps) {
  return (
    <div className="group relative bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center flex flex-col items-center justify-between border border-[rgba(180,160,150,0.22)] shadow-2xs hover:shadow-md hover:border-rose-200 transition-all duration-300 ease-out hover:-translate-y-0.5 z-10">
      {/* Top Step Pill */}
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#E51F3E] to-[#CE102F] text-white text-[11px] font-bold uppercase tracking-wider shadow-2xs">
        {step}
      </span>

      {/* Icon container */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-rose-50 rounded-xl flex items-center justify-center mt-1 mb-2.5 text-[#E51F3E] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#E51F3E] group-hover:text-white">
        {icon}
      </div>

      {/* Card Content */}
      <div className="space-y-1.5 flex-1 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-[#D99A28] uppercase tracking-wider block">
          {badge}
        </span>
        <h3 className="font-serif text-[17px] sm:text-[19px] font-bold text-slate-900 tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-[13px] sm:text-[13.5px] text-slate-600 leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      </div>

      {/* Bottom Accent */}
      <div className="w-8 h-0.5 bg-rose-100 rounded-full mt-3 group-hover:w-12 group-hover:bg-[#E51F3E] transition-all duration-300" />
=======
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
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    </div>
  );
}

export function WeddingSearch() {
<<<<<<< HEAD
  const steps = [
    {
      step: 'Step 01',
      badge: 'Quick & Free',
      title: 'Create Your Profile',
      description:
        'Register in under 2 minutes. Add your photos, education, profession, and partner preferences with 100% privacy.',
      icon: <UserCheck className="w-5 h-5 stroke-[2]" />,
    },
    {
      step: 'Step 02',
      badge: 'AI Smart Matching',
      title: 'Discover & Connect',
      description:
        'Explore verified candidates matching your cultural and educational background. Express interest with one click.',
      icon: <MessageSquareHeart className="w-5 h-5 stroke-[2]" />,
    },
    {
      step: 'Step 03',
      badge: 'Safe & Meaningful',
      title: 'Meet & Celebrate',
      description:
        'Communicate securely through protected chat, connect with verified families, and begin your lifelong marital journey.',
      icon: <HeartHandshake className="w-5 h-5 stroke-[2]" />,
=======
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
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    },
  ];

  return (
<<<<<<< HEAD
    <section className="relative py-8 sm:py-11 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#FAF8F5]">
      <div className="w-full max-w-[1280px] mx-auto text-center relative z-10 space-y-5 sm:space-y-6">
        {/* Main Heading */}
        <div className="space-y-1.5 max-w-2xl mx-auto">
          <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            How Wonderful Jodi <span className="text-[#E51F3E]">Works For You</span>
          </h2>
          <p className="text-slate-600 text-[13px] sm:text-[14px] leading-relaxed max-w-xl mx-auto">
            From discovering compatible matches to arranging your first meaningful conversation — we make finding a life partner safe, respectful, and joyful.
          </p>
        </div>

        {/* Steps Grid with Horizontal Connector Line on Desktop & Vertical Sequence on Mobile */}
        <div className="relative pt-1">
          {/* Subtle Horizontal Connector Progression Line (Desktop only) */}
          <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-rose-200 via-rose-300 to-rose-200 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative z-10">
            {steps.map((item, index) => (
              <React.Fragment key={item.step}>
                <StepCard
                  step={item.step}
                  badge={item.badge}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Bottom Action */}
        <div className="pt-0.5">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#101828] hover:bg-slate-800 text-white px-6 h-10 sm:h-11 text-[13px] sm:text-sm font-semibold shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <span>Get Started in 2 Minutes</span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
          </Link>
=======
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
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
        </div>
      </div>
    </section>
  );
}
