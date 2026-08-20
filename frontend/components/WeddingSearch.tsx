'use client';

import React from 'react';
import { UserCheck, MessageSquareHeart, HeartHandshake, Sparkles, ArrowRight } from 'lucide-react';
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
    <div className="group relative bg-white rounded-2xl p-6 sm:p-7 text-center flex flex-col items-center justify-between border border-rose-100/90 shadow-sm hover:shadow-xl hover:shadow-red-500/8 transition-all duration-300 ease-out hover:-translate-y-1.5 z-10">
      {/* Top Step Pill */}
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-[#E51F3E] to-[#CE102F] text-white text-[10.5px] font-extrabold uppercase tracking-wider shadow-xs">
        {step}
      </span>

      {/* Icon container */}
      <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shadow-inner mt-2 mb-4 text-[#E51F3E] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#E51F3E] group-hover:text-white">
        {icon}
      </div>

      {/* Card Content */}
      <div className="space-y-2 flex-1 flex flex-col justify-center">
        <span className="text-[10.5px] font-bold text-[#D99A28] uppercase tracking-widest block">
          {badge}
        </span>
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-[13.5px] text-slate-600 leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      </div>

      {/* Bottom Accent */}
      <div className="w-10 h-0.5 bg-rose-100 rounded-full mt-5 group-hover:w-16 group-hover:bg-[#E51F3E] transition-all duration-300" />
    </div>
  );
}

export function WeddingSearch() {
  const steps = [
    {
      step: 'Step 01',
      badge: 'Quick & Free',
      title: 'Create Your Profile',
      description:
        'Register in under 2 minutes. Add your photos, education, profession, and partner preferences with 100% privacy.',
      icon: <UserCheck className="w-7 h-7 stroke-[2]" />,
    },
    {
      step: 'Step 02',
      badge: 'AI Smart Matching',
      title: 'Discover & Connect',
      description:
        'Explore verified candidates matching your cultural and educational background. Express interest with one click.',
      icon: <MessageSquareHeart className="w-7 h-7 stroke-[2]" />,
    },
    {
      step: 'Step 03',
      badge: 'Safe & Meaningful',
      title: 'Meet & Celebrate',
      description:
        'Communicate securely through protected chat, connect with verified families, and begin your lifelong marital journey.',
      icon: <HeartHandshake className="w-7 h-7 stroke-[2]" />,
    },
  ];

  return (
    <section className="relative py-12 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-white via-[#FFF8F4] to-white border-b border-rose-100/60">
      <div className="w-[calc(100%-32px)] sm:w-[calc(100%-64px)] lg:w-[calc(100%-96px)] max-w-[1600px] mx-auto text-center relative z-10 space-y-9">
        {/* Main Heading */}
        <div className="space-y-2.5 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-100/80 border border-red-200/80 text-[#E51F3E] text-xs font-bold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            Simple 3-Step Matrimonial Journey
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            How Wonderful Jodi <span className="text-[#E51F3E]">Works For You</span>
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
            From discovering compatible matches to arranging your first meaningful conversation — we make finding a life partner safe, respectful, and joyful.
          </p>
        </div>

        {/* Steps Grid with Horizontal Connector Line on Desktop */}
        <div className="relative pt-2">
          {/* Subtle Horizontal Connector Progression Line (Desktop only) */}
          <div className="hidden md:block absolute top-[52px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-rose-200 via-rose-300 to-rose-200 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 relative z-10">
            {steps.map((item) => (
              <StepCard
                key={item.step}
                step={item.step}
                badge={item.badge}
                title={item.title}
                description={item.description}
                icon={item.icon}
              />
            ))}
          </div>
        </div>

        {/* Bottom Action */}
        <div className="pt-1">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#101828] hover:bg-slate-800 text-white px-7 py-3 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            <span>Get Started in 2 Minutes</span>
            <ArrowRight className="w-4 h-4 text-rose-400" />
          </Link>
        </div>
      </div>
    </section>
  );
}
