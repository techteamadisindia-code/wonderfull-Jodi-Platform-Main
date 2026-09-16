'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Lock,
  Stethoscope,
  Headphones,
  Crown,
  Sparkles,
  Linkedin,
  Instagram,
  Facebook,
} from 'lucide-react';
import { Logo } from './Logo';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 23.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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

  const socialLinks = [
    {
      name: 'LinkedIn',
      href: 'https://www.linkedin.com/company/adisindiaplacement/posts/?feedView=all',
      ariaLabel: 'Wonderful Jodi on LinkedIn',
      title: 'Follow Wonderful Jodi on LinkedIn',
      icon: Linkedin,
      hoverClass: 'hover:bg-[#0A66C2]/15 hover:border-[#0A66C2] hover:text-[#0A66C2]',
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/adisindiaplacementpvtltd/?hl=en',
      ariaLabel: 'Wonderful Jodi on Instagram',
      title: 'Follow Wonderful Jodi on Instagram',
      icon: Instagram,
      hoverClass: 'hover:bg-[#E4405F]/15 hover:border-[#E4405F] hover:text-[#E4405F]',
    },
    {
      name: 'Facebook',
      href: 'https://www.facebook.com/adisindiaplacementpvtltd',
      ariaLabel: 'Wonderful Jodi on Facebook',
      title: 'Follow Wonderful Jodi on Facebook',
      icon: Facebook,
      hoverClass: 'hover:bg-[#1877F2]/15 hover:border-[#1877F2] hover:text-[#1877F2]',
    },
    {
      name: 'X',
      href: 'https://x.com/LtdAdis',
      ariaLabel: 'Wonderful Jodi on X',
      title: 'Follow Wonderful Jodi on X (formerly Twitter)',
      icon: XIcon,
      hoverClass: 'hover:bg-white/15 hover:border-slate-300 hover:text-white',
    },
  ];

  return (
    <footer className="bg-[#0B1424] text-slate-300 border-t border-slate-800/80 overflow-hidden text-left w-full">
      {/* ── Top & Main Content Container ── */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 sm:pt-8 pb-5">
        {/* ── Top Brand Area: Logo, Tagline & CTAs (Height approx 70-90px) ── */}
        <div className="pb-6 border-b border-slate-800/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Brand Left: Logo + Short description */}
          <div className="space-y-2 max-w-xl">
            <div className="inline-block">
              <Logo
                size="md"
                variant="dark"
                subtitle="DOCTOR MATRIMONY"
                imageClassName="w-10 h-10 sm:w-11 sm:h-11"
                textClassName="text-xl sm:text-[22px]"
              />
            </div>
            <p className="text-[13.5px] sm:text-sm text-slate-300 leading-relaxed max-w-lg">
              Bringing medical professionals together for meaningful, secure, and compatible lifelong connections.
            </p>
          </div>

          {/* Action CTAs Right (Height ~38px) */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 self-stretch sm:self-auto">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 h-9 sm:h-10 px-4 rounded-full bg-slate-900/80 hover:bg-emerald-950/40 border border-emerald-500/40 text-xs sm:text-[13px] font-semibold text-emerald-400 shadow-2xs transition-all duration-200 hover:border-emerald-400 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Join Doctor Community</span>
            </Link>

            <Link
              href="/membership"
              className="inline-flex items-center justify-center gap-2 h-9 sm:h-10 px-4 rounded-full bg-slate-900/80 hover:bg-rose-950/40 border border-rose-500/40 text-xs sm:text-[13px] font-semibold text-rose-300 shadow-2xs transition-all duration-200 hover:border-rose-400 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <Crown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Upgrade to Premium</span>
            </Link>
          </div>
        </div>

        {/* ── 4 Main Footer Columns (Height approx 150-190px) ── */}
        <div className="pt-6 sm:pt-7 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7 lg:gap-8">
          {/* Column 1: COMPANY */}
          <section aria-labelledby="footer-company-heading">
            <h3
              id="footer-company-heading"
              className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-[#FDA4AF] mb-3 flex items-center gap-1.5"
            >
              <span>Company</span>
            </h3>
            <ul className="space-y-2 text-[13.5px] sm:text-[14px]">
              <li>
                <Link
                  href="/about"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/stories"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Success Stories
                </Link>
              </li>
              <li>
                <Link
                  href="/membership"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </section>

          {/* Column 2: SERVICES */}
          <section aria-labelledby="footer-services-heading">
            <h3
              id="footer-services-heading"
              className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-[#FDA4AF] mb-3 flex items-center gap-1.5"
            >
              <span>Services</span>
            </h3>
            <ul className="space-y-2 text-[13.5px] sm:text-[14px]">
              <li>
                <Link
                  href="/search"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Search Doctors
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Create Your Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/membership"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Membership Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Matrimony Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/kundali"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Kundali & Astrology
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Doctor Community
                </Link>
              </li>
            </ul>
          </section>

          {/* Column 3: TRUST & SAFETY */}
          <section aria-labelledby="footer-safety-heading">
            <h3
              id="footer-safety-heading"
              className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-[#FDA4AF] mb-3 flex items-center gap-1.5"
            >
              <span>Trust & Safety</span>
            </h3>
            <ul className="space-y-2 text-[13.5px] sm:text-[14px]">
              <li>
                <Link
                  href="/verification-policy"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Profile Verification
                </Link>
              </li>
              <li>
                <Link
                  href="/verification-policy"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Medical Verification
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Safety Guidelines
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Report a Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="text-slate-300 hover:text-[#E51F3E] inline-flex items-center transition-all duration-200 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </section>

          {/* Column 4: CONTACT US & FOLLOW US */}
          <section aria-labelledby="footer-contact-heading" className="space-y-4">
            <div>
              <h3
                id="footer-contact-heading"
                className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-[#FDA4AF] mb-3 flex items-center gap-1.5"
              >
                <span>Contact Us</span>
              </h3>
              <div className="space-y-2 text-[13.5px] sm:text-[14px] text-slate-300">
                {/* Phone */}
                <div>
                  <a
                    href="tel:+9109607559547"
                    className="inline-flex items-center gap-2.5 py-0.5 text-slate-300 hover:text-white font-medium transition-colors group focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded"
                    aria-label="Call customer support at +91 096075 59547"
                  >
                    <span className="w-7 h-7 rounded-md bg-rose-950/60 border border-rose-900/60 flex items-center justify-center text-[#E51F3E] shrink-0 group-hover:scale-105 group-hover:border-rose-500/50 group-hover:bg-rose-900/70 transition-all duration-200 shadow-2xs">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <span className="tracking-wide">+91 096075 59547</span>
                  </a>
                </div>

                {/* Email */}
                <div>
                  <a
                    href="mailto:support@wonderfuljodi.com"
                    className="inline-flex items-center gap-2.5 py-0.5 text-slate-300 hover:text-white font-medium transition-colors group focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded"
                    aria-label="Email customer support at support@wonderfuljodi.com"
                  >
                    <span className="w-7 h-7 rounded-md bg-rose-950/60 border border-rose-900/60 flex items-center justify-center text-[#E51F3E] shrink-0 group-hover:scale-105 group-hover:border-rose-500/50 group-hover:bg-rose-900/70 transition-all duration-200 shadow-2xs">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">support@wonderfuljodi.com</span>
                  </a>
                </div>

                {/* Location */}
                <div>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2.5 py-0.5 text-slate-300 hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded"
                    aria-label="View office location on Google Maps"
                  >
                    <span className="w-7 h-7 rounded-md bg-rose-950/60 border border-rose-900/60 flex items-center justify-center text-[#E51F3E] shrink-0 mt-0.5 group-hover:scale-105 group-hover:border-rose-500/50 group-hover:bg-rose-900/70 transition-all duration-200 shadow-2xs">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <span className="leading-snug text-[13px] text-slate-400 group-hover:text-slate-300 transition-colors">
                      A303, Gera Imperium Gateway,<br />
                      Nashik Phata, PMC, Pune 411034
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* ── Follow Us Social Media Section (40px x 40px, 10px gap) ── */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="font-bold uppercase text-[11px] sm:text-[12px] tracking-wider text-[#FDA4AF] mb-2.5 block">
                Follow Us
              </span>
              <div className="flex items-center gap-[10px]">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.ariaLabel}
                      title={social.title}
                      className={`w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 flex items-center justify-center transition-all duration-200 ease-out shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E51F3E] ${social.hoverClass}`}
                    >
                      <Icon className="w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110" />
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* ── Compact Trust Row (Small & Subtle) ── */}
        <div className="py-3.5 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-slate-300 text-xs sm:text-[13px]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-slate-200">Verified Profiles</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-slate-200">Secure &amp; Private</span>
          </div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-slate-200">Doctor Community</span>
          </div>
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-slate-200">Dedicated Support</span>
          </div>
        </div>
      </div>

      {/* ── Copyright Bar (Height approx 60-70px, background #070D18) ── */}
      <div className="border-t border-slate-800/90 bg-[#070D18] py-4 text-xs sm:text-[13px] text-slate-400">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          {/* Copyright & Tagline Left */}
          <div className="space-y-0.5">
            <p className="text-slate-300 font-medium tracking-wide">
              © 2026 Wonderful Jodi. All rights reserved.
            </p>
            <p className="text-[12px] text-emerald-400/90 font-medium">
              Trusted connections. Healthier tomorrows.
            </p>
          </div>

          {/* Bottom Legal Navigation Right */}
          <nav aria-label="Legal & Information Navigation" className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 sm:gap-x-5 gap-y-1.5 text-[12.5px] sm:text-[13px] text-slate-400">
            <Link
              href="/"
              className="hover:text-[#E51F3E] transition-colors duration-150 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="hover:text-[#E51F3E] transition-colors duration-150 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Search
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[#E51F3E] transition-colors duration-150 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="hover:text-[#E51F3E] transition-colors duration-150 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/terms-and-conditions#refund-policy"
              className="hover:text-[#E51F3E] transition-colors duration-150 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Refund Policy
            </Link>
            <Link
              href="/contact"
              className="hover:text-[#E51F3E] transition-colors duration-150 focus-visible:outline-none focus-visible:text-rose-400"
            >
              Contact Us
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
