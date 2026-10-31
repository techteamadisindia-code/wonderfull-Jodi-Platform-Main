'use client';

import React from 'react';

interface FloatingDiyaProps {
  density?: 'normal' | 'gentle';
}

interface DiyaPlacement {
  id: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  flickerDelay: string;
  glowRadius: string;
}

const NORMAL_DIYAS: DiyaPlacement[] = [
  // Top corners along outer viewport
  { id: 1, top: '24px', left: '16px', size: 38, flickerDelay: '0s', glowRadius: '14px' },
  { id: 2, top: '28px', right: '18px', size: 36, flickerDelay: '1.4s', glowRadius: '13px' },
  // Margin mid-section positions
  { id: 3, top: '48%', left: '12px', size: 32, flickerDelay: '0.8s', glowRadius: '12px' },
  { id: 4, top: '52%', right: '14px', size: 34, flickerDelay: '2.1s', glowRadius: '12px' },
  // Bottom hero / banner accents
  { id: 5, bottom: '20px', left: '22px', size: 36, flickerDelay: '1.7s', glowRadius: '13px' },
  { id: 6, bottom: '24px', right: '24px', size: 36, flickerDelay: '0.5s', glowRadius: '14px' },
];

const GENTLE_DIYAS: DiyaPlacement[] = [
  { id: 1, top: '28px', right: '24px', size: 34, flickerDelay: '0.6s', glowRadius: '12px' },
  { id: 2, bottom: '24px', left: '20px', size: 32, flickerDelay: '1.8s', glowRadius: '11px' },
];

export function FloatingDiya({ density = 'normal' }: FloatingDiyaProps) {
  const diyas = density === 'gentle' ? GENTLE_DIYAS : NORMAL_DIYAS;

  return (
    <div
      className="diwali-diyas-layer absolute inset-0 pointer-events-none select-none z-1 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes diyaFlicker {
          0%, 100% {
            transform: scale(1) translateY(0);
            opacity: 0.92;
            filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.75));
          }
          25% {
            transform: scale(1.06) translateY(-1px);
            opacity: 1;
            filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.95));
          }
          50% {
            transform: scale(0.95) translateY(0.5px);
            opacity: 0.85;
            filter: drop-shadow(0 0 5px rgba(217, 119, 6, 0.7));
          }
          75% {
            transform: scale(1.04) translateY(-0.5px);
            opacity: 0.98;
            filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.9));
          }
        }

        @keyframes diyaAuraPulse {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.65;
          }
        }

        .diya-flame {
          transform-origin: 50% 90%;
          animation: diyaFlicker 2.4s ease-in-out infinite;
        }

        .diya-aura {
          transform-origin: center;
          animation: diyaAuraPulse 3.2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .diya-flame,
          .diya-aura {
            animation: none !important;
          }
        }
      `}</style>

      {diyas.map((d) => (
        <div
          key={d.id}
          className="absolute hidden sm:block transition-opacity duration-700"
          style={{
            top: d.top,
            bottom: d.bottom,
            left: d.left,
            right: d.right,
          }}
        >
          {/* Subtle Warm Amber Glow Behind Diya */}
          <div
            className="diya-aura absolute -inset-2 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.35) 0%, rgba(245, 158, 11, 0.12) 55%, transparent 75%)',
              filter: `blur(${d.glowRadius})`,
            }}
          />

          <svg
            width={d.size}
            height={Math.round(d.size * 1.05)}
            viewBox="0 0 48 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative drop-shadow-[0_4px_8px_rgba(217,119,6,0.35)]"
          >
            <defs>
              {/* Diya Clay Base Gradient */}
              <linearGradient id={`clayGrad_${d.id}`} x1="6" y1="26" x2="42" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#C2410C" />
                <stop offset="45%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#9A3412" />
              </linearGradient>

              {/* Clay Rim Gold Highlight */}
              <linearGradient id={`rimGrad_${d.id}`} x1="4" y1="26" x2="44" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#FDE68A" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              {/* Flame Outer Gradient */}
              <radialGradient id={`flameOuter_${d.id}`} cx="24" cy="18" r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="85%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0" />
              </radialGradient>

              {/* Flame Inner Core */}
              <linearGradient id={`flameInner_${d.id}`} x1="24" y1="8" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#FEF08A" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Glowing Flame */}
            <g
              className="diya-flame"
              style={{ animationDelay: d.flickerDelay }}
            >
              {/* Outer soft aura */}
              <path
                d="M24 4C21 11 16 16 16 22C16 26.4 19.6 30 24 30C28.4 30 32 26.4 32 22C32 16 27 11 24 4Z"
                fill={`url(#flameOuter_${d.id})`}
                opacity="0.85"
              />
              {/* Inner brighter core flame */}
              <path
                d="M24 8C22.5 13 19 16.5 19 21C19 23.8 21.2 26 24 26C26.8 26 29 23.8 29 21C29 16.5 25.5 13 24 8Z"
                fill={`url(#flameInner_${d.id})`}
              />
              {/* Pure white core spark */}
              <circle cx="24" cy="22" r="2.2" fill="#FFFFFF" opacity="0.9" />
            </g>

            {/* Diya Clay Base */}
            <path
              d="M6 28C8 38 15 46 24 46C33 46 40 38 42 28C36 30 29 30.5 24 30.5C19 30.5 12 30 6 28Z"
              fill={`url(#clayGrad_${d.id})`}
              stroke="#7C2D12"
              strokeWidth="0.8"
            />

            {/* Diya Golden Rim / Lip */}
            <ellipse
              cx="24"
              cy="28.5"
              rx="18"
              ry="3.5"
              fill={`url(#rimGrad_${d.id})`}
              stroke="#B45309"
              strokeWidth="0.6"
            />

            {/* Traditional Decorative Etching Lines on Clay */}
            <path
              d="M14 36C17 40 21 42 24 42C27 42 31 40 34 36"
              stroke="#FDE68A"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.75"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
