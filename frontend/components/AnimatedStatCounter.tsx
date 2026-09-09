'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedStatCounterProps {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedStatCounter({
  value,
  suffix = '',
  decimals = 0,
  duration = 1600,
  className = '',
}: AnimatedStatCounterProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    decimals > 0 ? (0).toFixed(decimals) : '0'
  );
  const containerRef = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    // Check user reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayValue(
        decimals > 0
          ? value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
          : Math.floor(value).toLocaleString('en-IN')
      );
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          observer.disconnect();

          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic formula
            const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            const currentCount = value * easeOutProgress;

            if (decimals > 0) {
              setDisplayValue(
                currentCount.toLocaleString('en-IN', {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })
              );
            } else {
              setDisplayValue(Math.floor(currentCount).toLocaleString('en-IN'));
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              if (decimals > 0) {
                setDisplayValue(
                  value.toLocaleString('en-IN', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                  })
                );
              } else {
                setDisplayValue(Math.floor(value).toLocaleString('en-IN'));
              }
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [value, decimals, duration]);

  return (
    <span ref={containerRef} className={className}>
      {displayValue}
      {suffix}
    </span>
  );
}
