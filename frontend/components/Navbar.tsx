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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setAuthenticated(!!getAuthToken());

    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  function handleLogout() {
    clearAuthToken();
    setAuthenticated(false);
    window.location.href = '/';
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search Profiles' },
    { href: '/membership', label: 'Membership Plans' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Help & Contact' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-white transition-all duration-300 ${
        scrolled
          ? 'shadow-sm border-b border-rose-100/60 py-3.5'
          : 'border-b border-rose-100/40 py-4 lg:py-[18px]'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between px-4 sm:px-8 lg:px-12">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group select-none">
          <div className="relative">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-tr from-[#E51F3E] via-[#E82645] to-[#F03554] flex items-center justify-center text-white shadow-md shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
              <Heart className="w-5 h-5 fill-white stroke-none" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#D99A28] border-2 border-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-2.5 h-2.5 text-white fill-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="font-serif text-[26px] font-bold text-[#101828] tracking-tight leading-none">
              <span>Wonderful </span>
              <span className="text-[#E51F3E]">Jodi</span>
            </div>
            <span className="text-[9.5px] uppercase tracking-[0.24em] font-bold text-[#C99635] mt-1">
              Verified Matrimony
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-5 py-2 rounded-full text-[15px] transition-all duration-200 relative ${
                  isActive
                    ? 'text-[#E51F3E] bg-[#FCECEE] font-semibold'
                    : 'text-[#334155] font-medium hover:text-[#E51F3E] hover:bg-slate-50/80'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden sm:flex items-center gap-3.5">
          {authenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-semibold text-[#E51F3E] hover:bg-rose-100 transition shadow-xs"
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
            <div className="flex items-center gap-3.5">
              {/* Sign In - Professional Outlined Pill Button */}
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F5C7CF] bg-white px-6 py-2.5 text-sm font-medium text-[#101828] hover:text-[#E51F3E] hover:bg-[#FDF2F4] hover:border-[#F2B5BF] transition-all duration-200"
              >
                <User className="w-4 h-4 text-[#E51F3E]" />
                <span>Sign In</span>
              </Link>

              {/* Register Free - Primary Red Gradient Pill Button */}
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <Sparkles className="w-4 h-4" />
                <span>Register Free</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#E51F3E] hover:bg-rose-50 focus:outline-none transition"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white/98 backdrop-blur-lg px-6 py-6 space-y-4 shadow-xl animate-fade-in">
          <nav className="flex flex-col gap-2 text-slate-800 font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-base transition ${
                    isActive
                      ? 'bg-[#FCECEE] text-[#E51F3E] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#E51F3E]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            {authenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-full bg-slate-100 py-3.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-200 transition"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-full border border-[#F5C7CF] py-3 text-center text-sm font-semibold text-slate-800 hover:bg-[#FDF2F4] hover:text-[#E51F3E] transition flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4 text-[#E51F3E]" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-full bg-gradient-to-r from-[#E51F3E] to-[#CC1432] py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-red-600/25 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register Free</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
