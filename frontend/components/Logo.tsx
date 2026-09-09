'use client';

import React from 'react';
import Link from 'next/link';

export interface LogoProps {
  /**
   * Size presets or custom pixel height
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  /**
   * Whether to display the text next to the emblem
   * @default true
   */
  showText?: boolean;
  /**
   * Theme variant for text & contrast:
   * - 'dark': For dark backgrounds (Footer, Admin Sidebar, Admin Login)
   * - 'light': For light/white backgrounds (Navbar Header, App Cards)
   * @default 'light'
   */
  variant?: 'light' | 'dark';
  /**
   * Custom subtitle under the brand name (e.g. 'Verified Matrimony', 'ADMIN CONSOLE', 'Doctors Matrimony')
   */
  subtitle?: string;
  /**
   * Optional custom link destination (defaults to '/', pass '' to disable link wrapping)
   */
  href?: string;
  /**
   * Custom classes for outer container
   */
  className?: string;
  /**
   * Custom classes for the logo image element
   */
  imageClassName?: string;
  /**
   * Custom classes for the text container
   */
  textClassName?: string;
  /**
   * Click handler
   */
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: { img: 'w-8 h-8', text: 'text-lg', sub: 'text-[7.5px]' },
  md: { img: 'w-10 h-10', text: 'text-xl sm:text-[22px]', sub: 'text-[8.5px] sm:text-[9px]' },
  lg: { img: 'w-12 h-12', text: 'text-2xl', sub: 'text-[9.5px]' },
  xl: { img: 'w-14 h-14', text: 'text-3xl', sub: 'text-[11px]' },
  '2xl': { img: 'w-16 h-16', text: 'text-4xl', sub: 'text-[12px]' },
};

export function Logo({
  size = 'md',
  showText = true,
  variant = 'light',
  subtitle = 'Verified Matrimony',
  href = '/',
  className = '',
  imageClassName = '',
  textClassName = '',
  onClick,
}: LogoProps) {
  const sizeConfig = typeof size === 'string' ? SIZE_MAP[size] || SIZE_MAP.md : null;
  const customImgStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}
      onClick={onClick}
    >
      {/* Official Uploaded Logo Emblem */}
      <div className="relative shrink-0 flex items-center justify-center">
        <img
          src="/images/wonderful-jodi-logo.png"
          alt="Wonderful Jodi Official Logo"
          className={`object-contain transition-transform duration-300 group-hover:scale-105 ${
            sizeConfig ? sizeConfig.img : ''
          } ${imageClassName}`}
          style={customImgStyle}
        />
      </div>

      {/* Brand Typography (Optional) */}
      {showText && (
        <div className={`flex flex-col text-left justify-center ${textClassName}`}>
          <div
            className={`font-serif font-bold tracking-tight leading-none ${
              sizeConfig ? sizeConfig.text : 'text-xl'
            } ${variant === 'dark' ? 'text-white' : 'text-[#101828]'}`}
          >
            <span>Wonderful </span>
            <span className="text-[#E51F3E]">Jodi</span>
          </div>

          {subtitle && (
            <span
              className={`uppercase tracking-[0.2em] font-bold mt-0.5 sm:mt-1 ${
                sizeConfig ? sizeConfig.sub : 'text-[8.5px]'
              } ${
                subtitle === 'ADMIN CONSOLE'
                  ? 'text-amber-400'
                  : variant === 'dark'
                  ? 'text-[#FDA4AF]'
                  : 'text-[#C99635]'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
