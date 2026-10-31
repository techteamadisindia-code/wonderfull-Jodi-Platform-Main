'use client';

import React from 'react';

interface FlowerPetalAnimationProps {
  density?: 'normal' | 'gentle';
}

interface PetalItem {
  id: number;
  left: number; // percentage
  size: number; // width in px
  fallDuration: number; // seconds
  delay: number; // seconds
  swayDuration: number; // seconds
  swayAmount: number; // px
  rotate: number; // degrees
  opacity: number;
  color: string;
  type: 'marigold' | 'rose' | 'jasmine';
}

// Low-density, outer-margin distributed petals to avoid hero center/wedding couple
const NORMAL_PETALS: PetalItem[] = [
  // Left side petals (1% to 26%)
  { id: 1, left: 3, size: 20, fallDuration: 11, delay: -2.5, swayDuration: 3.5, swayAmount: 18, rotate: 25, opacity: 0.55, color: '#F59E0B', type: 'marigold' },
  { id: 2, left: 8, size: 16, fallDuration: 9.5, delay: -7.0, swayDuration: 3.0, swayAmount: 15, rotate: -30, opacity: 0.5, color: '#E11D48', type: 'rose' },
  { id: 3, left: 15, size: 18, fallDuration: 12, delay: -4.2, swayDuration: 4.0, swayAmount: 22, rotate: 45, opacity: 0.45, color: '#EA580C', type: 'marigold' },
  { id: 4, left: 22, size: 14, fallDuration: 10, delay: -8.5, swayDuration: 3.2, swayAmount: 14, rotate: -20, opacity: 0.4, color: '#FDA4AF', type: 'jasmine' },

  // Right side petals (74% to 97%)
  { id: 5, left: 76, size: 19, fallDuration: 11.5, delay: -1.5, swayDuration: 3.8, swayAmount: 20, rotate: 35, opacity: 0.5, color: '#E51F3E', type: 'rose' },
  { id: 6, left: 82, size: 17, fallDuration: 9, delay: -5.8, swayDuration: 2.8, swayAmount: 16, rotate: -25, opacity: 0.55, color: '#F59E0B', type: 'marigold' },
  { id: 7, left: 89, size: 21, fallDuration: 13, delay: -10.2, swayDuration: 4.2, swayAmount: 24, rotate: 40, opacity: 0.45, color: '#EA580C', type: 'marigold' },
  { id: 8, left: 95, size: 15, fallDuration: 10.5, delay: -3.8, swayDuration: 3.4, swayAmount: 15, rotate: -15, opacity: 0.4, color: '#FB7185', type: 'rose' },
];

const GENTLE_PETALS: PetalItem[] = [
  { id: 1, left: 4, size: 18, fallDuration: 12, delay: -2.0, swayDuration: 3.8, swayAmount: 16, rotate: 20, opacity: 0.45, color: '#F59E0B', type: 'marigold' },
  { id: 2, left: 16, size: 15, fallDuration: 10, delay: -6.5, swayDuration: 3.2, swayAmount: 14, rotate: -25, opacity: 0.4, color: '#E11D48', type: 'rose' },
  { id: 3, left: 80, size: 17, fallDuration: 11, delay: -4.0, swayDuration: 3.6, swayAmount: 18, rotate: 30, opacity: 0.45, color: '#EA580C', type: 'marigold' },
  { id: 4, left: 92, size: 16, fallDuration: 10.5, delay: -8.0, swayDuration: 3.4, swayAmount: 15, rotate: -20, opacity: 0.4, color: '#FDA4AF', type: 'jasmine' },
];

export function FlowerPetalAnimation({ density = 'normal' }: FlowerPetalAnimationProps) {
  const petals = density === 'gentle' ? GENTLE_PETALS : NORMAL_PETALS;

  return (
    <div
      className="diwali-petals-layer absolute inset-0 pointer-events-none select-none z-1 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes petalFall {
          0% {
            transform: translateY(-40px);
            opacity: 0;
          }
          10% {
            opacity: var(--p-opacity, 0.45);
          }
          90% {
            opacity: var(--p-opacity, 0.45);
          }
          100% {
            transform: translateY(calc(100% + 40px));
            opacity: 0;
          }
        }

        @keyframes petalSway {
          0% {
            transform: translateX(calc(-1 * var(--p-sway, 18px))) rotate(calc(-1 * var(--p-rot, 25deg)));
          }
          50% {
            transform: translateX(0px) rotate(calc(var(--p-rot, 25deg) * 0.5));
          }
          100% {
            transform: translateX(var(--p-sway, 18px)) rotate(var(--p-rot, 25deg));
          }
        }

        .diwali-petal-track {
          position: absolute;
          top: 0;
          height: 100%;
          will-change: transform, opacity;
          animation: petalFall var(--fall-dur, 11s) linear var(--fall-del, 0s) infinite;
        }

        .diwali-petal-glyph {
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
          animation: petalSway var(--sway-dur, 3.5s) ease-in-out infinite alternate;
        }

        @media (prefers-reduced-motion: reduce) {
          .diwali-petals-layer {
            display: none !important;
          }
        }
      `}</style>

      {petals.map((petal) => (
        <div
          key={petal.id}
          className="diwali-petal-track"
          style={
            {
              left: `${petal.left}%`,
              '--fall-dur': `${petal.fallDuration}s`,
              '--fall-del': `${petal.delay}s`,
              '--p-opacity': petal.opacity,
            } as React.CSSProperties
          }
        >
          <div
            className="diwali-petal-glyph"
            style={
              {
                '--sway-dur': `${petal.swayDuration}s`,
                '--p-sway': `${petal.swayAmount}px`,
                '--p-rot': `${petal.rotate}deg`,
              } as React.CSSProperties
            }
          >
            {petal.type === 'marigold' ? (
              // Traditional teardrop curved marigold petal
              <svg
                width={petal.size}
                height={Math.round(petal.size * 1.3)}
                viewBox="0 0 28 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_2px_4px_rgba(245,158,11,0.2)]"
              >
                <path
                  d="M14 0C17.5 9.5 28 15 28 24.5C28 30.5 21.7 36 14 36C6.3 36 0 30.5 0 24.5C0 15 10.5 9.5 14 0Z"
                  fill={petal.color}
                />
                {/* Subtle petal spine vein highlight */}
                <path
                  d="M14 6C14 16 14 28 14 33"
                  stroke="#FDE68A"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            ) : (
              // Curved romantic rose/jasmine petal
              <svg
                width={petal.size}
                height={Math.round(petal.size * 1.2)}
                viewBox="0 0 26 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_2px_4px_rgba(229,31,62,0.18)]"
              >
                <path
                  d="M13 0C18 8 26 13 26 21C26 27 20 32 13 32C6 32 0 27 0 21C0 13 8 8 13 0Z"
                  fill={petal.color}
                />
              </svg>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
