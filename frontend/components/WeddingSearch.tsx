'use client';

import React from 'react';
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
    },
  ];

  return (
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
        </div>
      </div>
    </section>
  );
}
