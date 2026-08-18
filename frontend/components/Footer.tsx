'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#0B111E] text-slate-300 border-t border-slate-900">
      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
        {/* Brand Info */}
        <div className="space-y-3.5">
          <Link href="/" className="inline-flex items-center gap-2.5 font-serif text-2xl font-bold text-white tracking-wide">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E51F3E] to-[#F03554] flex items-center justify-center text-white text-sm shadow-md shadow-red-500/20">
              <Heart className="w-4 h-4 fill-white stroke-none" />
            </div>
            <span>Wonderful <span className="text-[#E51F3E] font-extrabold">Jodi</span></span>
          </Link>
          <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
            India&apos;s premier matrimonial platform dedicated to connecting educated professionals, entrepreneurs, and esteemed families looking for genuine life connections.
          </p>
          <div className="pt-1 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-[11px] font-medium text-rose-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              24/7 Matchmaking Support
            </span>
          </div>
        </div>

        {/* Quick Navigation */}
        <div>
          <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-4 text-[#FDA4AF]">
            Quick Navigation
          </h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/" className="text-slate-400 hover:text-white transition">Home</Link></li>
            <li><Link href="/search" className="text-slate-400 hover:text-white transition">Search Verified Profiles</Link></li>
            <li><Link href="/membership" className="text-slate-400 hover:text-white transition">Membership Plans & Pricing</Link></li>
            <li><Link href="/about" className="text-slate-400 hover:text-white transition">About Our Mission</Link></li>
            <li><Link href="/contact" className="text-slate-400 hover:text-white transition">Customer Help & Support</Link></li>
          </ul>
        </div>

        {/* Popular Searches */}
        <div>
          <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-4 text-[#FDA4AF]">
            Popular Searches
          </h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/search?gender=Female" className="text-slate-400 hover:text-white transition">Brides Matrimony (Female)</Link></li>
            <li><Link href="/search?gender=Male" className="text-slate-400 hover:text-white transition">Grooms Matrimony (Male)</Link></li>
            <li><Link href="/search?religion=Hindu" className="text-slate-400 hover:text-white transition">Hindu Matrimonial Profiles</Link></li>
            <li><Link href="/search?city=Mumbai" className="text-slate-400 hover:text-white transition">Mumbai Matrimony</Link></li>
            <li><Link href="/search?city=Bengaluru" className="text-slate-400 hover:text-white transition">Bengaluru Tech Professionals</Link></li>
          </ul>
        </div>

        {/* Customer Support */}
        <div className="space-y-3.5">
          <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-4 text-[#FDA4AF]">
            Contact Support
          </h4>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <Phone className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
              <span>+91 1800 200 9090 (Toll Free)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
              <span>support@wonderfuljodi.com</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-[#E51F3E] shrink-0 mt-0.5" />
              <span className="text-slate-400">Cyber City, Phase II, Gurugram, Haryana - 122002</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright & Disclaimer */}
      <div className="border-t border-slate-900 bg-[#070C16] py-5 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} WonderfulJodi.com. All rights reserved. Designed for happy, lasting marriages.</p>
          <div className="flex items-center gap-5">
            <Link href="/about" className="hover:text-slate-300 transition">Privacy Policy</Link>
            <Link href="/about" className="hover:text-slate-300 transition">Terms of Service</Link>
            <Link href="/contact" className="hover:text-slate-300 transition">Safety Tips</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
