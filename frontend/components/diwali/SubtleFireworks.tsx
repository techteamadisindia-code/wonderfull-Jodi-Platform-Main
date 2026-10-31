'use client';

import React from 'react';

interface SubtleFireworksProps {
  density?: 'normal' | 'gentle';
}

interface BurstItem {
  id: number;
  top: string;
  left?: string;
  right?: string;
  colorTheme: 'gold' | 'rose' | 'amber';
  delay: string;
  scale: number;
}

const NORMAL_BURSTS: BurstItem[] = [
  // Upper sky margin (corners only, avoiding central hero & couple)
  { id: 1, top: '12%', left: '7%', colorTheme: 'gold', delay: '0.4s', scale: 0.9 },
  { id: 2, top: '22%', right: '8%', colorTheme: 'rose', delay: '2.6s', scale: 0.85 },
  { id: 3, top: '48%', left: '5%', colorTheme: 'amber', delay: '4.8s', scale: 0.75 },
  { id: 4, top: '56%', right: '6%', colorTheme: 'gold', delay: '7.0s', scale: 0.8 },
];

const GENTLE_BURSTS: BurstItem[] = [
  { id: 1, top: '14%', right: '10%', colorTheme: 'gold', delay: '0.5s', scale: 0.8 },
  { id: 2, top: '40%', left: '6%', colorTheme: 'amber', delay: '3.8s', scale: 0.75 },
];

export function SubtleFireworks({ density = 'normal' }: SubtleFireworksProps) {
  const bursts = density === 'gentle' ? GENTLE_BURSTS : NORMAL_BURSTS;

  return (
    <div
      className="diwali-fireworks-layer absolute inset-0 pointer-events-none select-none z-1 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes fireworkBurst {
          0% {
            transform: scale(0.1);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          45% {
            transform: scale(1.05);
            opacity: 0.9;
          }
          85% {
            transform: scale(1.15);
            opacity: 0.25;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        .diwali-firework-burst {
          transform-origin: center;
          animation: fireworkBurst 4.8s cubic-bezier(0.25, 1, 0.5, 1) var(--fw-del, 0s) infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .diwali-fireworks-layer {
            display: none !important;
          }
        }
      `}</style>

      {bursts.map((b) => {
        const primaryColor =
          b.colorTheme === 'gold' ? '#F59E0B' : b.colorTheme === 'rose' ? '#E11D48' : '#EA580C';
        const secondaryColor =
          b.colorTheme === 'gold' ? '#FEF08A' : b.colorTheme === 'rose' ? '#FDA4AF' : '#FDE68A';

        return (
          <div
            key={b.id}
            className="absolute hidden sm:block"
            style={
              {
                top: b.top,
                left: b.left,
                right: b.right,
                '--fw-del': b.delay,
              } as React.CSSProperties
            }
          >
            <div
              className="diwali-firework-burst relative w-20 h-20"
              style={{ transform: `scale(${b.scale})` }}
            >
              <svg viewBox="0 0 80 80" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Central Soft Halo */}
                <circle cx="40" cy="40" r="4" fill={secondaryColor} opacity="0.9" />
                <circle cx="40" cy="40" r="12" fill={primaryColor} opacity="0.15" />

                {/* 8 Radial Starlight Trails */}
                {/* 0 deg */}
                <line x1="40" y1="28" x2="40" y2="8" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                <circle cx="40" cy="6" r="1.5" fill={secondaryColor} />

                {/* 45 deg */}
                <line x1="48" y1="32" x2="62" y2="18" stroke={secondaryColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <circle cx="64" cy="16" r="1.4" fill={primaryColor} />

                {/* 90 deg */}
                <line x1="52" y1="40" x2="72" y2="40" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                <circle cx="74" cy="40" r="1.5" fill={secondaryColor} />

                {/* 135 deg */}
                <line x1="48" y1="48" x2="62" y2="62" stroke={secondaryColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <circle cx="64" cy="64" r="1.4" fill={primaryColor} />

                {/* 180 deg */}
                <line x1="40" y1="52" x2="40" y2="72" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                <circle cx="40" cy="74" r="1.5" fill={secondaryColor} />

                {/* 225 deg */}
                <line x1="32" y1="48" x2="18" y2="62" stroke={secondaryColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <circle cx="16" cy="64" r="1.4" fill={primaryColor} />

                {/* 270 deg */}
                <line x1="28" y1="40" x2="8" y2="40" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                <circle cx="6" cy="40" r="1.5" fill={secondaryColor} />

                {/* 315 deg */}
                <line x1="32" y1="32" x2="18" y2="18" stroke={secondaryColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <circle cx="16" cy="16" r="1.4" fill={primaryColor} />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
