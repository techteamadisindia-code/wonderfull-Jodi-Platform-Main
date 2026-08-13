'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearAuthToken, getAuthToken } from '../lib/api';
import { Heart, User, LogOut, Menu, X, Sparkles } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setAuthenticated(!!getAuthToken());
  }, [pathname]);

  function handleLogout() {
    clearAuthToken();
    setAuthenticated(false);
    window.location.href = '/';
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search Profiles' },
    { href: '/membership', label: 'Membership' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-105">
            <Heart className="w-5 h-5 fill-white stroke-none" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
              Wonderful <span className="text-red-600">Jodi</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-amber-700 mt-0.5">
              Trusted Matrimony
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1 relative ${
                  isActive
                    ? 'text-red-600 font-semibold'
                    : 'hover:text-red-600'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {authenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-rose-100 transition"
              >
                <User className="w-3.5 h-3.5" />
                My Account
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:from-red-700 hover:to-rose-700 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Register Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:text-red-600 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-6 space-y-4 shadow-lg">
          <nav className="flex flex-col gap-4 text-slate-800 font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-base border-b border-slate-100 ${
                  pathname === link.href ? 'text-red-600 font-bold' : 'hover:text-red-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 flex flex-col gap-3">
            {authenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-xl bg-slate-100 py-3 text-center text-sm font-semibold text-slate-800"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-800"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl bg-red-600 py-3 text-center text-sm font-semibold text-white shadow-sm"
                >
                  Register Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
