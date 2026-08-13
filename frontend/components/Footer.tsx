'use client';

import Link from 'next/link';
import { Heart, ShieldCheck, Phone, Mail, MapPin, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-rose-950/40">
      {/* Top Banner / Trust Badges */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 py-10 px-6 border-b border-rose-900/30">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">100% Verified Profiles</h4>
              <p className="text-xs text-slate-400 mt-0.5">Strict manual screening & document checks</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <Heart className="w-6 h-6 fill-red-500/20" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Privacy Protected</h4>
              <p className="text-xs text-slate-400 mt-0.5">Control photo visibility and contact info</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Matchmaking Excellence</h4>
              <p className="text-xs text-slate-400 mt-0.5">AI-assisted preferences matching</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand Info */}
        <div className="space-y-4 md:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-white tracking-wide">
            <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white text-sm shadow-md">
              ❤️
            </span>
            Wonderful <span className="text-red-500 font-extrabold">Jodi</span>
          </Link>
          <p className="text-sm text-slate-400 leading-relaxed">
            India&apos;s premium matrimonial platform designed for educated professionals and families seeking meaningful life connections.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-xs text-red-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Support
            </span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold text-white uppercase text-xs tracking-wider mb-5 text-red-400">Quick Navigation</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/" className="hover:text-red-400 transition">Home</Link></li>
            <li><Link href="/search" className="hover:text-red-400 transition">Search Profiles</Link></li>
            <li><Link href="/membership" className="hover:text-red-400 transition">Membership Plans</Link></li>
            <li><Link href="/about" className="hover:text-red-400 transition">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-red-400 transition">Contact & Help</Link></li>
          </ul>
        </div>

        {/* Categories / Communities */}
        <div>
          <h4 className="font-semibold text-white uppercase text-xs tracking-wider mb-5 text-red-400">Popular Searches</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/search?gender=female" className="hover:text-red-400 transition">Brides Matrimony</Link></li>
            <li><Link href="/search?gender=male" className="hover:text-red-400 transition">Grooms Matrimony</Link></li>
            <li><Link href="/search" className="hover:text-red-400 transition">Professional Matches</Link></li>
            <li><Link href="/search" className="hover:text-red-400 transition">NRI Matrimorial Services</Link></li>
            <li><Link href="/search" className="hover:text-red-400 transition">Featured Profiles</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h4 className="font-semibold text-white uppercase text-xs tracking-wider mb-5 text-red-400">Customer Support</h4>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <span>+91 1800 200 9090 (Toll Free)</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <span>support@wonderfuljodi.com</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-1" />
              <span>Cyber City, Phase II, Gurugram, Haryana - 122002</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright & Disclaimer */}
      <div className="border-t border-slate-800 bg-slate-950 py-6 px-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} WonderfulJodi.com. All rights reserved. Built with ❤️ for happy marriages.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-slate-300 transition">Privacy Policy</Link>
            <Link href="/about" className="hover:text-slate-300 transition">Terms of Service</Link>
            <Link href="/contact" className="hover:text-slate-300 transition">Security Tips</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
