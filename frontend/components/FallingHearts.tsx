'use client';

import { useEffect, useState } from 'react';

interface HeartItem {
  id: number;
  left: number; // percentage (3% to 97%)
  size: number; // px (10 to 24)
  fallDuration: number; // seconds (7 to 15)
  delay: number; // seconds (-12 to 2 for instant continuous flow)
  swayDuration: number; // seconds (2.5 to 5)
  swayAmount: number; // px (10 to 30)
  rotate: number; // deg (10 to 35)
  opacity: number; // (0.15 to 0.45)
  color: string;
}

const HEART_COLORS = [
  '#E51F3E', // Brand Crimson
  '#F43F5E', // Rose
  '#FB7185', // Soft Rose
  '#FDA4AF', // Warm Pink
  '#F472B6', // Blush Pink
  '#E11D48', // Deep Crimson
];

// Pre-computed balanced heart distributions to ensure zero hydration mismatch and optimal visual spread
const STATIC_HEARTS: HeartItem[] = [
  { id: 1, left: 6, size: 14, fallDuration: 9.5, delay: -2.4, swayDuration: 3.2, swayAmount: 18, rotate: 18, opacity: 0.35, color: '#E51F3E' },
  { id: 2, left: 14, size: 20, fallDuration: 12.0, delay: -8.1, swayDuration: 4.1, swayAmount: 24, rotate: 25, opacity: 0.28, color: '#FB7185' },
  { id: 3, left: 22, size: 12, fallDuration: 8.2, delay: -5.0, swayDuration: 2.8, swayAmount: 14, rotate: -20, opacity: 0.25, color: '#FDA4AF' },
  { id: 4, left: 31, size: 18, fallDuration: 11.2, delay: -11.3, swayDuration: 3.8, swayAmount: 22, rotate: 15, opacity: 0.32, color: '#F43F5E' },
  { id: 5, left: 40, size: 15, fallDuration: 9.0, delay: -1.7, swayDuration: 3.1, swayAmount: 16, rotate: -22, opacity: 0.30, color: '#E11D48' },
  { id: 6, left: 48, size: 22, fallDuration: 13.5, delay: -7.5, swayDuration: 4.5, swayAmount: 28, rotate: 30, opacity: 0.22, color: '#FDA4AF' },
  { id: 7, left: 57, size: 13, fallDuration: 8.8, delay: -3.9, swayDuration: 3.0, swayAmount: 15, rotate: -18, opacity: 0.35, color: '#FB7185' },
  { id: 8, left: 65, size: 19, fallDuration: 10.8, delay: -9.8, swayDuration: 3.6, swayAmount: 20, rotate: 22, opacity: 0.30, color: '#E51F3E' },
  { id: 9, left: 74, size: 11, fallDuration: 7.8, delay: -4.2, swayDuration: 2.6, swayAmount: 12, rotate: -15, opacity: 0.25, color: '#F472B6' },
  { id: 10, left: 82, size: 21, fallDuration: 12.8, delay: -6.4, swayDuration: 4.2, swayAmount: 26, rotate: 28, opacity: 0.26, color: '#F43F5E' },
  { id: 11, left: 91, size: 16, fallDuration: 9.8, delay: -10.5, swayDuration: 3.4, swayAmount: 19, rotate: -24, opacity: 0.32, color: '#E11D48' },
  { id: 12, left: 10, size: 17, fallDuration: 10.2, delay: -6.0, swayDuration: 3.5, swayAmount: 20, rotate: -20, opacity: 0.28, color: '#F472B6' },
  { id: 13, left: 27, size: 24, fallDuration: 14.0, delay: -3.2, swayDuration: 4.8, swayAmount: 30, rotate: 25, opacity: 0.20, color: '#FDA4AF' },
  { id: 14, left: 44, size: 13, fallDuration: 8.5, delay: -10.0, swayDuration: 2.9, swayAmount: 15, rotate: 16, opacity: 0.32, color: '#E51F3E' },
  { id: 15, left: 60, size: 16, fallDuration: 10.5, delay: -1.2, swayDuration: 3.7, swayAmount: 21, rotate: -26, opacity: 0.34, color: '#FB7185' },
  { id: 16, left: 70, size: 22, fallDuration: 13.0, delay: -8.8, swayDuration: 4.4, swayAmount: 25, rotate: 22, opacity: 0.24, color: '#F43F5E' },
  { id: 17, left: 86, size: 12, fallDuration: 8.0, delay: -2.8, swayDuration: 2.7, swayAmount: 13, rotate: -18, opacity: 0.28, color: '#FDA4AF' },
  { id: 18, left: 96, size: 18, fallDuration: 11.5, delay: -7.0, swayDuration: 3.9, swayAmount: 23, rotate: 20, opacity: 0.29, color: '#E51F3E' },
];

export function FallingHearts() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="falling-hearts-container absolute inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes fallMotion {
          0% {
            transform: translateY(-30px);
            opacity: 0;
          }
          8% {
            opacity: var(--h-opacity, 0.3);
          }
          92% {
            opacity: var(--h-opacity, 0.3);
          }
          100% {
            transform: translateY(calc(100% + 30px));
            opacity: 0;
          }
        }

        @keyframes swayMotion {
          0% {
            transform: translateX(calc(-1 * var(--h-sway, 20px))) rotate(calc(-1 * var(--h-rot, 20deg)));
          }
          100% {
            transform: translateX(var(--h-sway, 20px)) rotate(var(--h-rot, 20deg));
          }
        }

        .falling-heart-track {
          position: absolute;
          top: 0;
          height: 100%;
          will-change: transform, opacity;
          animation: fallMotion var(--fall-dur, 10s) linear var(--fall-del, 0s) infinite;
        }

        .falling-heart-glyph {
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
          animation: swayMotion var(--sway-dur, 3.5s) ease-in-out infinite alternate;
        }

        @media (prefers-reduced-motion: reduce) {
          .falling-hearts-container {
            display: none !important;
          }
        }
      `}</style>

      {STATIC_HEARTS.map((heart) => (
        <div
          key={heart.id}
          className="falling-heart-track"
          style={
            {
              left: `${heart.left}%`,
              '--fall-dur': `${heart.fallDuration}s`,
              '--fall-del': `${heart.delay}s`,
              '--h-opacity': heart.opacity,
            } as React.CSSProperties
          }
        >
          <div
            className="falling-heart-glyph"
            style={
              {
                '--sway-dur': `${heart.swayDuration}s`,
                '--h-sway': `${heart.swayAmount}px`,
                '--h-rot': `${heart.rotate}deg`,
              } as React.CSSProperties
            }
          >
            <svg
              width={heart.size}
              height={heart.size}
              viewBox="0 0 24 24"
              fill={heart.color}
              className="drop-shadow-[0_2px_4px_rgba(229,31,62,0.15)]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
