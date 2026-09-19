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
  Users,
  ChevronRight,
  Shield,
  Heart,
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
      bgClass: 'bg-[#0077B5] hover:bg-[#006399] text-white hover:shadow-[0_0_12px_rgba(0,119,181,0.5)]',
    },
    {
      name: 'Instagram',
      href: 'https://www.instagram.com/adisindiaplacementpvtltd/?hl=en',
      ariaLabel: 'Wonderful Jodi on Instagram',
      title: 'Follow Wonderful Jodi on Instagram',
      icon: Instagram,
      bgClass: 'bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] text-white hover:shadow-[0_0_12px_rgba(225,48,108,0.5)]',
    },
    {
      name: 'Facebook',
      href: 'https://www.facebook.com/adisindiaplacementpvtltd',
      ariaLabel: 'Wonderful Jodi on Facebook',
      title: 'Follow Wonderful Jodi on Facebook',
      icon: Facebook,
      bgClass: 'bg-[#1877F2] hover:bg-[#1263cf] text-white hover:shadow-[0_0_12px_rgba(24,119,242,0.5)]',
    },
    {
      name: 'X',
      href: 'https://x.com/LtdAdis',
      ariaLabel: 'Wonderful Jodi on X',
      title: 'Follow Wonderful Jodi on X (formerly Twitter)',
      icon: XIcon,
      bgClass: 'bg-[#000000] border border-slate-700 hover:border-slate-500 text-white hover:shadow-[0_0_12px_rgba(255,255,255,0.2)]',
    },
  ];

  return (
    <footer className="bg-[#07111E] text-slate-300 border-t border-slate-800/80 overflow-hidden text-left w-full relative">
      {/* Background Decorative Heart Watermark on the Right (matches visual inspiration) */}
      <div 
        className="absolute -right-8 top-12 w-80 h-80 pointer-events-none opacity-[0.045] select-none hidden lg:block"
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path
            d="M100 170 C100 170 20 120 20 65 C20 30 50 15 80 35 C100 50 100 50 100 50 C100 50 100 50 120 35 C150 15 180 30 180 65 C180 120 100 170 100 170 Z"
            stroke="#E51F3E"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ── Main Footer Grid Container ── */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
          
          {/* ── SECTION A: BRAND INTRODUCTION (approx 32% desktop width) ── */}
          <div className="lg:col-span-4 space-y-5 pr-0 lg:pr-4">
            {/* Logo with high contrast dark emblem */}
            <div className="inline-block">
              <Logo
                size="lg"
                variant="dark"
                subtitle="DOCTOR MATRIMONY"
                imageClassName="w-12 h-12 sm:w-[52px] sm:h-[52px]"
                textClassName="text-xl sm:text-2xl"
              />
            </div>

            {/* Brand Mission Statement */}
            <p className="text-[13.5px] sm:text-sm text-slate-300/90 leading-relaxed">
              Bringing medical professionals together for meaningful, secure, and compatible lifelong connections.
            </p>

            {/* 3 Mini Trust Indicators */}
            <div className="pt-1 pb-1 flex items-center justify-between text-slate-300 text-[11px] sm:text-[11.5px] max-w-[380px]">
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Verified Profiles</span>
              </div>
              <div className="h-4 w-px bg-slate-700/60 shrink-0 mx-1" aria-hidden="true" />
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Doctors Community</span>
              </div>
              <div className="h-4 w-px bg-slate-700/60 shrink-0 mx-1" aria-hidden="true" />
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <Heart className="w-3.5 h-3.5 text-[#E51F3E] shrink-0 fill-[#E51F3E]/20" />
                <span>Safe &amp; Secure</span>
              </div>
            </div>

            {/* Compact Promotional Card */}
            <Link
              href="/register"
              className="group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900/70 to-slate-900/90 border border-rose-500/25 hover:border-rose-500/50 hover:shadow-[0_4px_20px_rgba(229,31,62,0.15)] transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-900/60 border border-rose-500/30 flex items-center justify-center text-rose-300 shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <Users className="w-4 h-4 text-[#FF4D6D]" />
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-[13px] font-medium text-slate-200 group-hover:text-white transition-colors">
                    Join doctors looking for meaningful connections.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>

          {/* ── SECTION B: COMPANY (approx 17% width) ── */}
          <section aria-labelledby="footer-company-heading" className="lg:col-span-2">
            <h3
              id="footer-company-heading"
              className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-white mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-5 after:h-[2px] after:bg-[#E51F3E] after:rounded-full"
            >
              Company
            </h3>
            <ul className="space-y-2.5 text-[13.5px] sm:text-[14px]">
              <li>
                <Link
                  href="/about"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/stories"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Success Stories
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/awards"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Awards &amp; Recognition
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </section>

          {/* ── SECTION C: SERVICES (approx 17% width) ── */}
          <section aria-labelledby="footer-services-heading" className="lg:col-span-2">
            <h3
              id="footer-services-heading"
              className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-white mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-5 after:h-[2px] after:bg-[#E51F3E] after:rounded-full"
            >
              Services
            </h3>
            <ul className="space-y-2.5 text-[13.5px] sm:text-[14px]">
              <li>
                <Link
                  href="/search"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Search Doctors
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Create Your Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/membership"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Membership Plans
                </Link>
              </li>
              <li>
                <Link
                  href="/centres"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Matchmaking Centres
                </Link>
              </li>
              <li>
                <Link
                  href="/kundali-match"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Kundali &amp; Astrology
                </Link>
              </li>
              <li>
                <Link
                  href="/live"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Live Meetups
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Doctor Community
                </Link>
              </li>
              <li>
                <Link
                  href="/membership"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Premium Benefits
                </Link>
              </li>
            </ul>
          </section>

          {/* ── SECTION D: SUPPORT & SAFETY (approx 17% width) ── */}
          <section aria-labelledby="footer-support-heading" className="lg:col-span-2">
            <h3
              id="footer-support-heading"
              className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-white mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-5 after:h-[2px] after:bg-[#E51F3E] after:rounded-full"
            >
              Support
            </h3>
            <ul className="space-y-2.5 text-[13.5px] sm:text-[14px]">
              <li>
                <Link
                  href="/help"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Help &amp; Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Safety Guidelines
                </Link>
              </li>
              <li>
                <Link
                  href="/safety"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Report a Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions#refund-policy"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy#cookies"
                  className="text-slate-300/90 hover:text-white hover:translate-x-1 inline-flex items-center transition-all duration-150 focus-visible:outline-none focus-visible:text-rose-400"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </section>

          {/* ── SECTION E: CONTACT US & FOLLOW US (approx 20% width) ── */}
          <section aria-labelledby="footer-contact-heading" className="lg:col-span-2 space-y-6">
            <div>
              <h3
                id="footer-contact-heading"
                className="font-bold uppercase text-[13px] sm:text-[14px] tracking-wider text-white mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-5 after:h-[2px] after:bg-[#E51F3E] after:rounded-full"
              >
                Contact Us
              </h3>
              <div className="space-y-3 text-[13px] sm:text-[13.5px] text-slate-300">
                {/* Phone */}
                <div>
                  <a
                    href="tel:+9109607559547"
                    className="inline-flex items-center gap-2.5 py-0.5 text-slate-300 hover:text-white font-medium transition-colors group focus-visible:ring-2 focus-visible:ring-[#E51F3E] rounded"
                    aria-label="Call customer support at +91 096075 59547"
                  >
                    <span className="w-7 h-7 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-[#E51F3E] shrink-0 group-hover:scale-105 group-hover:bg-rose-900 transition-all duration-200">
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
                    <span className="w-7 h-7 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-[#E51F3E] shrink-0 group-hover:scale-105 group-hover:bg-rose-900 transition-all duration-200">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <span className="break-all sm:break-normal">support@wonderfuljodi.com</span>
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
                    <span className="w-7 h-7 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-[#E51F3E] shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-rose-900 transition-all duration-200">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <span className="leading-snug text-xs sm:text-[12.5px] text-slate-400 group-hover:text-slate-200 transition-colors">
                      A303, Gera Imperium Gateway,<br />
                      Nashik Phata, PMC, Pune 411034
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* ── FOLLOW US Social Media Section ── */}
            <div className="pt-2">
              <h4 className="font-bold uppercase text-[12px] sm:text-[13px] tracking-wider text-white mb-3 relative pb-1.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-4 after:h-[2px] after:bg-[#E51F3E] after:rounded-full">
                Follow Us
              </h4>
              <div className="flex items-center gap-2.5">
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
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${social.bgClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* ── SECTION F: FOOTER TRUST FEATURES ROW ── */}
      <div className="border-t border-slate-800/80 bg-[#050D18]/90">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:divide-x md:divide-slate-800/80 text-xs sm:text-[13px] text-slate-300">
            <div className="flex items-center justify-center gap-2.5 py-1 px-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-200">Verified Profiles</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 py-1 px-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-200">Secure &amp; Private</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 py-1 px-2">
              <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-200">Doctor Community</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 py-1 px-2">
              <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-200">Dedicated Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION G: COPYRIGHT SECTION (Clean, Centered, No Raw Links) ── */}
      <div className="border-t border-slate-800/90 bg-[#030810] py-4 text-xs sm:text-[13px] text-center">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="text-slate-200 font-medium tracking-wide">
            © 2026 Wonderful Jodi. All rights reserved.
          </p>
          <p className="text-[12px] text-emerald-400/90 font-medium tracking-normal">
            Trusted connections. Healthier tomorrows.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
