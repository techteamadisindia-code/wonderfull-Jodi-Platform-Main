'use client';

import React from 'react';

interface GoldenSparklesProps {
  density?: 'normal' | 'gentle';
}

interface SparkleItem {
  id: number;
  top: string;
  left?: string;
  right?: string;
  size: number;
  delay: string;
  duration: string;
}

const NORMAL_SPARKLES: SparkleItem[] = [
  // Outer upper left perimeter
  { id: 1, top: '15%', left: '4%', size: 18, delay: '0.2s', duration: '2.6s' },
  { id: 2, top: '28%', left: '8%', size: 14, delay: '1.2s', duration: '2.2s' },
  { id: 3, top: '42%', left: '3%', size: 16, delay: '0.8s', duration: '3.0s' },
  { id: 4, top: '65%', left: '6%', size: 15, delay: '1.9s', duration: '2.4s' },

  // Outer upper right perimeter
  { id: 5, top: '14%', right: '5%', size: 20, delay: '0.5s', duration: '2.8s' },
  { id: 6, top: '30%', right: '9%', size: 15, delay: '1.6s', duration: '2.5s' },
  { id: 7, top: '45%', right: '4%', size: 17, delay: '0.9s', duration: '3.1s' },
  { id: 8, top: '68%', right: '7%', size: 14, delay: '2.2s', duration: '2.3s' },
];

const GENTLE_SPARKLES: SparkleItem[] = [
  { id: 1, top: '18%', left: '6%', size: 16, delay: '0.4s', duration: '2.8s' },
  { id: 2, top: '22%', right: '7%', size: 18, delay: '1.4s', duration: '2.6s' },
  { id: 3, top: '55%', left: '5%', size: 14, delay: '1.0s', duration: '3.2s' },
  { id: 4, top: '58%', right: '6%', size: 15, delay: '2.0s', duration: '2.5s' },
];

export function GoldenSparkles({ density = 'normal' }: GoldenSparklesProps) {
  const sparkles = density === 'gentle' ? GENTLE_SPARKLES : NORMAL_SPARKLES;

  return (
    <div
      className="diwali-sparkles-layer absolute inset-0 pointer-events-none select-none z-1 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes sparkleTwinkle {
          0%, 100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          40%, 60% {
            transform: scale(1) rotate(90deg);
            opacity: 0.95;
            filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9));
          }
          75% {
            transform: scale(0.6) rotate(135deg);
            opacity: 0.4;
          }
        }

        .diwali-sparkle-star {
          transform-origin: center;
          animation: sparkleTwinkle var(--spk-dur, 2.5s) ease-in-out var(--spk-del, 0s) infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .diwali-sparkles-layer {
            display: none !important;
          }
        }
      `}</style>

      {sparkles.map((spk) => (
        <div
          key={spk.id}
          className="absolute"
          style={
            {
              top: spk.top,
              left: spk.left,
              right: spk.right,
              '--spk-dur': spk.duration,
              '--spk-del': spk.delay,
            } as React.CSSProperties
          }
        >
          <svg
            width={spk.size}
            height={spk.size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="diwali-sparkle-star"
          >
            <defs>
              <radialGradient id={`spkGrad_${spk.id}`} cx="12" cy="12" r="11" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#FEF08A" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </radialGradient>
            </defs>

            {/* 4-point Diamond Star with central halo */}
            <path
              d="M12 0C12 7.2 16.8 12 24 12C16.8 12 12 16.8 12 24C12 16.8 7.2 12 0 12C7.2 12 12 7.2 12 0Z"
              fill={`url(#spkGrad_${spk.id})`}
            />

            {/* Secondary diagonal soft glint */}
            <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" opacity="0.9" />
          </svg>
        </div>
      ))}
    </div>
  );
}
