'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  const pathname = usePathname();

  // Hide footer on admin portal and dedicated authentication views
  const isAuthPage = ['/login', '/forgot-password', '/reset-password', '/register'].some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );
  if (pathname?.startsWith('/admin') || isAuthPage) {
    return null;
  }

  const mapUrl =
    'https://www.google.com/maps/search/?api=1&query=A303+Gera+Imperium+Gateway+Nashik+Phata+PMC+Pune+Maharashtra+411034';

  return (
    <footer className="bg-[#111827] text-slate-300 border-t border-slate-800/90 overflow-hidden text-left w-full">
      {/* ── Top & Main Content Container (Mobile: 24px top / 12px bottom; Desktop: 32px top / 16px bottom) ── */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-3 lg:pb-4">
        {/* ── Top Footer Area: Logo & Badges on same level on desktop ── */}
        <div className="pb-3.5 border-b border-slate-800/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
          {/* Brand Left */}
          <div className="space-y-1 max-w-xl">
            <Logo
              size="md"
              variant="dark"
              subtitle="DOCTOR MATRIMONY"
              imageClassName="w-8 h-8 sm:w-9 sm:h-9"
              textClassName="text-base sm:text-[20px]"
            />
            <p className="text-[12.5px] sm:text-[13px] text-slate-400 leading-[1.45] max-w-md">
              Helping verified professionals, healthcare specialists, and families discover meaningful, secure, and compatible matrimonial connections.
            </p>
          </div>

          {/* Trust Badges Right (Compact Pill Badges) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch sm:self-auto">
            {/* Badge 1: Verified Profiles & Credentials */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 text-[11px] sm:text-[11.5px] font-semibold text-emerald-400 shadow-2xs transition-all duration-200 hover:border-emerald-500/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">Verified Profiles & Credentials</span>
            </div>

            {/* Badge 2: Dedicated Matchmaking Support */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-rose-500/30 text-[11px] sm:text-[11.5px] font-semibold text-rose-300 shadow-2xs transition-all duration-200 hover:border-rose-500/50">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="whitespace-nowrap">Dedicated Matchmaking Support</span>
            </div>
          </div>
        </div>

        {/* ── Main Footer Columns (2 cols on mobile >=360px, 4 on desktop) ── */}
        <div className="pt-4 sm:pt-5 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_1.2fr] gap-4 sm:gap-5 lg:gap-7">
          {/* Column 1: COMPANY & INFO */}
          <section aria-labelledby="footer-company-heading">
            <h3
              id="footer-company-heading"
              className="font-bold uppercase text-[12px] tracking-wider text-[#FDA4AF] mb-2"
            >
              Company & Info
            </h3>
            <ul className="space-y-1.5 text-[12px] sm:text-[12.5px]">
              <li>
                <Link
                  href="/about"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Shaadi Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/awards"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Awards & Recognition
                </Link>
              </li>
              <li>
                <Link
                  href="/stories"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Success Stories
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </section>

          {/* Column 2: SERVICES & OFFERINGS */}
          <section aria-labelledby="footer-services-heading">
            <h3
              id="footer-services-heading"
              className="font-bold uppercase text-[11.5px] sm:text-[12px] tracking-wider text-[#FDA4AF] mb-2"
            >
              Services & Offerings
            </h3>
            <ul className="space-y-1.5 text-[12px] sm:text-[12.5px]">
              <li>
                <Link
                  href="/biodata-maker"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Marriage Biodata Maker
                </Link>
              </li>
              <li>
                <Link
                  href="/live"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Shaadi Live Meetups
                </Link>
              </li>
              <li>
                <Link
                  href="/centres"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Matchmaking Centres
                </Link>
              </li>
              <li>
                <Link
                  href="/astrology"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Kundali & Astrology
                </Link>
              </li>
              <li>
                <Link
                  href="/membership"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  VIP Membership Plans
                </Link>
              </li>
            </ul>
          </section>

          {/* Column 3: VERIFICATION & SAFETY */}
          <section aria-labelledby="footer-safety-heading">
            <h3
              id="footer-safety-heading"
              className="font-bold uppercase text-[11.5px] sm:text-[12px] tracking-wider text-[#FDA4AF] mb-2"
            >
              Verification & Safety
            </h3>
            <ul className="space-y-1.5 text-[12px] sm:text-[12.5px]">
              <li>
                <Link
                  href="/verification-policy"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Medical License Verification
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  ID & Education Verification
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Be Safe Online & Discreet
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Hide Photo & Privacy Guard
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-slate-400 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-1 py-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Customer Support & FAQs
                </Link>
              </li>
            </ul>
          </section>

          {/* Column 4: CONTACT DETAILS (Compact rows with 26px icon boxes, 8px row gaps) */}
          <section aria-labelledby="footer-contact-heading">
            <h3
              id="footer-contact-heading"
              className="font-bold uppercase text-[11.5px] sm:text-[12px] tracking-wider text-[#FDA4AF] mb-2"
            >
              Contact Details
            </h3>
            <div className="space-y-2 text-[12px] sm:text-[12.5px] text-slate-300">
              {/* Phone */}
              <div>
                <a
                  href="tel:+9109607559547"
                  className="inline-flex items-center gap-2 py-0.5 text-slate-300 hover:text-white font-medium transition-colors group focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded"
                  aria-label="Call customer support at +91 096075 59547"
                >
                  <span className="w-6.5 h-6.5 rounded-md bg-rose-950/60 border border-rose-900/60 flex items-center justify-center text-[#E51F3E] shrink-0 group-hover:scale-105 group-hover:border-rose-500/50 group-hover:bg-rose-900/70 transition-all duration-200 shadow-2xs">
                    <Phone className="w-3 h-3" />
                  </span>
                  <span className="tracking-wide text-[12px] sm:text-[12.5px]">+91 096075 59547</span>
                </a>
              </div>

              {/* Email */}
              <div>
                <a
                  href="mailto:support@wonderfuljodi.com"
                  className="inline-flex items-center gap-2 py-0.5 text-slate-300 hover:text-white font-medium transition-colors group focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded"
                  aria-label="Email customer support at support@wonderfuljodi.com"
                >
                  <span className="w-6.5 h-6.5 rounded-md bg-rose-950/60 border border-rose-900/60 flex items-center justify-center text-[#E51F3E] shrink-0 group-hover:scale-105 group-hover:border-rose-500/50 group-hover:bg-rose-900/70 transition-all duration-200 shadow-2xs">
                    <Mail className="w-3 h-3" />
                  </span>
                  <span className="truncate text-[12px] sm:text-[12.5px]">support@wonderfuljodi.com</span>
                </a>
              </div>

              {/* Location */}
              <div>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 py-0.5 text-slate-300 hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded"
                  aria-label="View office location on Google Maps"
                >
                  <span className="w-6.5 h-6.5 rounded-md bg-rose-950/60 border border-rose-900/60 flex items-center justify-center text-[#E51F3E] shrink-0 mt-0.5 group-hover:scale-105 group-hover:border-rose-500/50 group-hover:bg-rose-900/70 transition-all duration-200 shadow-2xs">
                    <MapPin className="w-3 h-3" />
                  </span>
                  <span className="leading-snug text-[11.5px] sm:text-[12px] text-slate-400 group-hover:text-slate-300 transition-colors">
                    A303, Gera Imperium Gateway,<br />
                    Nashik Phata, PMC, Pune 411034
                  </span>
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Bottom Footer Section (Compact: 14px-16px vertical padding, 12px font) ── */}
      <div className="border-t border-slate-800/90 bg-[#0A0F1D] py-3.5 sm:py-4 text-xs text-slate-400">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 text-center md:text-left">
          {/* Copyright & Tagline Left */}
          <div className="space-y-0.5">
            <p className="text-slate-300 font-medium tracking-wide text-[12px]">
              © 2026 Wonderful Jodi. All rights reserved.
            </p>
            <p className="text-[11px] text-slate-500">
              Trusted connections. Meaningful beginnings.
            </p>
          </div>

          {/* Bottom Legal Navigation Right (16px-20px gap, 12px text) */}
          <nav aria-label="Legal & Information Navigation" className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 sm:gap-x-5 gap-y-1.5 text-[12px] text-slate-400">
            <Link
              href="/"
              className="hover:text-[#E51F3E] transition-colors duration-200 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="hover:text-[#E51F3E] transition-colors duration-200 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Search
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[#E51F3E] transition-colors duration-200 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="hover:text-[#E51F3E] transition-colors duration-200 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/verification-policy"
              className="hover:text-[#E51F3E] transition-colors duration-200 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Verification Policy
            </Link>
            <Link
              href="/safety"
              className="hover:text-[#E51F3E] transition-colors duration-200 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Safety Guidelines
            </Link>
            <Link
              href="/contact"
              className="hover:text-[#E51F3E] transition-colors duration-200 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Contact Us
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
