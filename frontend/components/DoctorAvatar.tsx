'use client';

import React, { useState, useEffect } from 'react';
import { Stethoscope } from 'lucide-react';

interface DoctorAvatarProps {
  photoUrl?: string | null;
  name?: string;
  gender?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  priority?: boolean;
}

export function DoctorAvatar({
  photoUrl,
  name = 'Doctor',
  gender = 'Male',
  size = 'lg',
  className = '',
}: DoctorAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  // Derive candidate initials (e.g. "RK" for Rushikesh Kulkarni)
  const initials = (name || 'Doctor')
    .replace(/^Dr\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'DR';

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 sm:w-36 sm:h-36 text-2xl',
    '2xl': 'w-36 h-36 sm:w-40 sm:h-40 text-3xl',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
    '2xl': 'w-7 h-7',
  }[size];

  // If a valid uploaded photo URL is provided and has not failed to load
  if (photoUrl && !hasError && photoUrl.trim() !== '') {
    return (
      <div
        className={`relative overflow-hidden rounded-[18px] bg-slate-100 shrink-0 select-none ${sizeClasses} ${className}`}
      >
        <img
          src={photoUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center"
        />
      </div>
    );
  }

  // Official Wonderful Jodi Doctor Avatar (neutral, privacy-safe, branded vector avatar)
  const isFemale = gender?.toLowerCase() === 'female';

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#FFF5F6] via-[#FFEBEF] to-[#FFDDE4] border border-[#FBCFE8] flex flex-col items-center justify-center text-slate-800 shrink-0 select-none shadow-2xs ${sizeClasses} ${className}`}
      title={`${name} (No photo uploaded)`}
    >
      {/* Background soft doctor silhouette SVG */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
      >
        <circle cx="50" cy="35" r="20" fill="#E51F3E" />
        <path
          d="M15 88C15 68.67 30.67 53 50 53C69.33 53 85 68.67 85 88"
          stroke="#E51F3E"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>

      {/* Initials & Stethoscope Icon */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className="font-serif font-bold text-[#800020] tracking-wider">
          {initials}
        </span>
        <div className="flex items-center gap-1 mt-0.5 text-[#E51F3E]">
          <Stethoscope className={iconSizes} />
        </div>
      </div>

      {/* Subtle bottom badge for doctor gender hint */}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-2xs border border-rose-100 text-[8.5px] font-bold text-[#800020] uppercase tracking-tighter">
        {isFemale ? 'Dr. (F)' : 'Dr. (M)'}
      </div>
    </div>
  );
}
