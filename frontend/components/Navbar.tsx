'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
<<<<<<< HEAD
import { useEffect, useState, useRef } from 'react';
import { clearAuthToken, getAuthToken } from '../lib/api';
import { Heart, User, LogOut, Menu, X, Sparkles, UserCheck, Bell, ChevronRight, ShieldCheck, MessageSquare } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { Logo } from './Logo';
=======
import { useEffect, useState } from 'react';
import { clearAuthToken, getAuthToken } from '../lib/api';
import { Heart, User, LogOut, Menu, X, Sparkles } from 'lucide-react';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

export function Navbar() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
<<<<<<< HEAD
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAuthenticated(!!getAuthToken());

    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Lock body scrolling & handle Escape key when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
=======

  useEffect(() => {
    setAuthenticated(!!getAuthToken());
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  }, [pathname]);

  function handleLogout() {
    clearAuthToken();
    setAuthenticated(false);
    window.location.href = '/';
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search Profiles' },
<<<<<<< HEAD
    { href: '/astrology', label: 'Kundali' },
    { href: '/membership', label: 'Membership Plans' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Help & Contact' },
  ];

  if (pathname?.startsWith('/admin') || pathname === '/login') {
    return null;
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/92 backdrop-blur-md shadow-xs border-b border-rose-100/80 h-[58px] sm:h-[66px] lg:h-[72px]'
            : 'bg-white/95 backdrop-blur-xs border-b border-rose-100/40 h-[60px] sm:h-[68px] lg:h-[74px]'
        } flex items-center`}
      >
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo - Official Uploaded Logo */}
          <Logo size="md" className="scale-[0.88] sm:scale-100 origin-left" subtitle="Verified Matrimony" />

          {/* Desktop Navigation Links - Centered & Clean (No duplicate My Profile link) */}
          <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 mx-auto">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-full text-[14.5px] transition-all duration-200 relative border-0 outline-none ${
                    isActive
                      ? 'text-[#E9232E] bg-[#FFF0F3] font-semibold'
                      : 'text-[#334155] font-medium hover:text-[#E9232E] hover:bg-slate-50/80'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop & Tablet Auth Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 sm:gap-3 shrink-0">
            {authenticated ? (
              <div className="flex items-center gap-2.5 sm:gap-3">
                <NotificationBell />
                <Link
                  href="/messages"
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 h-9.5 text-xs font-bold transition shadow-xs ${
                    pathname === '/messages'
                      ? 'bg-[#E51F3E] text-white shadow-md shadow-red-600/20'
                      : 'bg-rose-50 border border-rose-200 text-[#E51F3E] hover:bg-rose-100'
                  }`}
                  title="Messages & Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                </Link>
                <Link
                  href="/profile"
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 sm:px-4.5 h-9.5 text-xs font-bold transition shadow-xs ${
                    pathname === '/profile' || pathname === '/profile/edit'
                      ? 'bg-[#E51F3E] text-white shadow-md shadow-red-600/20'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>My Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 h-9.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Sign In - Professional Outlined Pill Button */}
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#F5C7CF] bg-white px-4.5 sm:px-5 h-10 sm:h-10.5 text-[14px] font-semibold text-[#101828] hover:text-[#E51F3E] hover:bg-[#FDF2F4] hover:border-[#F2B5BF] transition-all duration-200 shadow-2xs"
                >
                  <User className="w-4 h-4 text-[#E51F3E]" />
                  <span>Sign In</span>
                </Link>

                {/* Register - Primary Red Gradient Pill Button */}
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] px-5 sm:px-6 h-10 sm:h-10.5 text-[14px] sm:text-[14.5px] font-bold text-white shadow-sm shadow-red-600/25 hover:shadow-md hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions (Visible on screens < 640px) + Hamburger */}
          <div className="flex lg:hidden items-center gap-2 sm:gap-2.5">
            {!authenticated ? (
              <div className="flex sm:hidden items-center gap-1.5">
                <Link
                  href="/login"
                  className="h-9 px-3 text-[13px] font-semibold text-slate-700 hover:text-[#E51F3E] rounded-full hover:bg-rose-50/60 transition inline-flex items-center justify-center"
=======
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
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
<<<<<<< HEAD
                  className="h-9 px-4 text-[13px] font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] hover:bg-[#ce102f] rounded-full shadow-sm shadow-red-600/25 inline-flex items-center justify-center gap-1 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            ) : (
              <div className="flex sm:hidden items-center gap-1.5">
                <NotificationBell />
                <Link
                  href="/profile"
                  className="p-1.5 rounded-full bg-rose-50 text-[#E51F3E] text-xs font-bold"
                  title="My Profile"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#E51F3E] hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/30 transition cursor-pointer shrink-0"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu Overlay Drawer (True Pop-up Overlay, never pushes header/logo) ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Container */}
          <div
            ref={menuRef}
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[360px] bg-white shadow-2xl z-50 flex flex-col justify-between overflow-y-auto animate-fade-in"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/60 to-white">
              <Logo
                size="sm"
                subtitle="Verified Matrimony"
                onClick={() => setMobileMenuOpen(false)}
              />

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-[#E51F3E] flex items-center justify-center transition focus:outline-none cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="px-5 py-6 space-y-1.5 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
                Navigation
              </p>
              <nav className="flex flex-col gap-1 text-slate-800 font-medium">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-3 rounded-xl text-[15px] font-semibold transition flex items-center justify-between border-0 outline-none ${
                        isActive
                          ? 'bg-[#FFF0F3] text-[#E9232E]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#E9232E]'
                      }`}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </Link>
                  );
                })}

                {authenticated && (
                  <>
                    <div className="pt-3 pb-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
                        My Account
                      </p>
                    </div>
                    <Link
                      href="/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-3 rounded-xl text-[15px] font-semibold transition flex items-center justify-between border-0 outline-none ${
                        pathname === '/notifications'
                          ? 'bg-[#FFF0F3] text-[#E9232E]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#E9232E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-[#E51F3E]" />
                        <span>Notifications</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </Link>
                    <Link
                      href="/messages"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-3 rounded-xl text-[15px] font-semibold transition flex items-center justify-between border-0 outline-none ${
                        pathname === '/messages'
                          ? 'bg-[#FFF0F3] text-[#E9232E]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#E9232E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-[#E51F3E]" />
                        <span>Messages & Chat</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-3 rounded-xl text-[15px] font-semibold transition flex items-center justify-between border-0 outline-none ${
                        pathname === '/profile' || pathname === '/profile/edit'
                          ? 'bg-[#FFF0F3] text-[#E9232E]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#E9232E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 text-[#E51F3E]" />
                        <span>My Profile</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </Link>
                    <Link
                      href="/profile/verification"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-3 rounded-xl text-[15px] font-semibold transition flex items-center justify-between border-0 outline-none ${
                        pathname === '/profile/verification'
                          ? 'bg-[#FFF0F3] text-[#E9232E]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#E9232E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>KYC & Verification</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/60 space-y-3">
              {authenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-full bg-white border border-slate-200 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Logout</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full rounded-full border border-[#F5C7CF] bg-white py-3 text-center text-sm font-semibold text-[#101828] hover:bg-[#FDF2F4] hover:text-[#E51F3E] transition flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <User className="w-4 h-4 text-[#E51F3E]" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-red-600/25 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
=======
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
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  );
}
