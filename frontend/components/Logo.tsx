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
   * Custom subtitle under the brand name (e.g. 'Doctor Matrimony', 'ADMIN CONSOLE')
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
   * Optional custom image source override
   */
  src?: string;
  /**
   * Click handler
   */
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: { img: 'w-8 h-8 sm:w-9 sm:h-9', text: 'text-base sm:text-lg', sub: 'text-[7.5px] sm:text-[8px]' },
  md: { img: 'w-10 h-10 sm:w-11 sm:h-11', text: 'text-lg sm:text-[20px] xl:text-[21px]', sub: 'text-[8px] sm:text-[8.5px] xl:text-[9px]' },
  lg: { img: 'w-12 h-12 sm:w-13 sm:h-13', text: 'text-xl sm:text-2xl', sub: 'text-[9px] sm:text-[9.5px]' },
  xl: { img: 'w-14 h-14 sm:w-15 sm:h-15', text: 'text-2xl sm:text-3xl', sub: 'text-[10px] sm:text-[11px]' },
  '2xl': { img: 'w-16 h-16', text: 'text-4xl', sub: 'text-[12px]' },
};

export function Logo({
  size = 'md',
  showText = true,
  variant = 'light',
  subtitle = 'Doctor Matrimony',
  href = '/',
  className = '',
  imageClassName = '',
  textClassName = '',
  src,
  onClick,
}: LogoProps) {
  const sizeConfig = typeof size === 'string' ? SIZE_MAP[size] || SIZE_MAP.md : null;
  const customImgStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;
  const emblemSrc = src || '/images/wonderful-jodi-logo.png';

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none shrink-0 whitespace-nowrap ${className}`}
      onClick={onClick}
    >
      {/* Official Uploaded Logo Emblem */}
      <div className="relative shrink-0 flex items-center justify-center">
        {variant === 'dark' ? (
          <div
            className={`rounded-full bg-white p-1 sm:p-1.5 shadow-sm border border-white/30 flex items-center justify-center shrink-0 ${
              sizeConfig ? sizeConfig.img : 'w-10 h-10 sm:w-11 sm:h-11'
            } ${imageClassName}`}
            style={customImgStyle}
          >
            <img
              src={emblemSrc}
              alt="Wonderful Jodi Official Logo"
              className="w-full h-full object-contain block select-none"
            />
          </div>
        ) : (
          <img
            src={emblemSrc}
            alt="Wonderful Jodi Official Logo"
            className={`object-contain block select-none ${
              sizeConfig ? sizeConfig.img : 'w-10 h-10 sm:w-11 sm:h-11'
            } ${imageClassName}`}
            style={customImgStyle}
          />
        )}
      </div>

      {/* Brand Typography (Optional) */}
      {showText && (
        <div className={`flex flex-col text-left justify-center shrink-0 whitespace-nowrap ${textClassName}`}>
          <div
            className={`font-serif font-bold tracking-tight leading-none whitespace-nowrap ${
              sizeConfig ? sizeConfig.text : 'text-xl'
            } ${variant === 'dark' ? 'text-white' : 'text-[#101828]'}`}
          >
            <span>Wonderful </span>
            <span className="text-[#E51F3E]">Jodi</span>
          </div>

          {subtitle && (
            <span
              className={`uppercase tracking-[0.25em] font-extrabold mt-0.5 sm:mt-1 whitespace-nowrap ${
                sizeConfig ? sizeConfig.sub : 'text-[8.5px]'
              } ${
                subtitle === 'ADMIN CONSOLE'
                  ? 'text-amber-400'
                  : variant === 'dark'
                  ? 'text-[#FF385C]'
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
      <Link href={href} className="inline-flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
