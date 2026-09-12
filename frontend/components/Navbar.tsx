'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { clearAuthToken, getAuthToken } from '../lib/api';
import { Heart, User, LogOut, Menu, X, Sparkles, UserCheck, Bell, ChevronRight, ShieldCheck, MessageSquare, Ban } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { Logo } from './Logo';

export function Navbar() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  }, [pathname]);

  function handleLogout() {
    clearAuthToken();
    setAuthenticated(false);
    window.location.href = '/';
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/search', label: 'Search' },
    { href: '/astrology', label: 'Kundali' },
    { href: '/membership', label: 'Membership' },
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
            ? 'bg-white/92 backdrop-blur-md shadow-xs border-b border-rose-100/80 h-[60px] sm:h-[66px] lg:h-[72px]'
            : 'bg-white/95 backdrop-blur-xs border-b border-rose-100/40 h-[62px] sm:h-[68px] lg:h-[74px]'
        } flex items-center`}
      >
        <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 flex items-center justify-between flex-nowrap gap-2 sm:gap-3 xl:gap-4">
          {/* Brand Logo - Official Uploaded Logo */}
          <Logo size="md" className="shrink-0" subtitle="Doctor Matrimony" />

          {/* Desktop Navigation Links - Centered & Clean Horizontal Row */}
          <nav className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-1.5 2xl:gap-2 flex-nowrap shrink-0 mx-auto">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap px-2.5 py-1.5 xl:px-3.5 xl:py-2 rounded-full text-[13px] xl:text-[14px] 2xl:text-[14.5px] font-medium transition-all duration-200 relative border-0 outline-none shrink-0 ${
                    isActive
                      ? 'text-[#E9232E] bg-[#FFF0F3] font-semibold'
                      : 'text-[#334155] hover:text-[#E9232E] hover:bg-slate-50/80'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth Buttons (lg screens and up) */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 shrink-0 flex-nowrap">
            {authenticated ? (
              <div className="flex items-center gap-1.5 xl:gap-2.5 shrink-0 flex-nowrap">
                <NotificationBell />
                <Link
                  href="/messages"
                  className={`inline-flex items-center gap-1 xl:gap-1.5 rounded-full px-2.5 xl:px-3.5 h-9 text-xs font-bold transition shadow-xs whitespace-nowrap shrink-0 ${
                    pathname === '/messages'
                      ? 'bg-[#E51F3E] text-white shadow-md shadow-red-600/20'
                      : 'bg-rose-50 border border-rose-200 text-[#E51F3E] hover:bg-rose-100'
                  }`}
                  title="Messages & Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                  <span>Messages</span>
                </Link>
                <Link
                  href="/profile"
                  className={`inline-flex items-center gap-1 xl:gap-1.5 rounded-full px-2.5 xl:px-3.5 h-9 text-xs font-bold transition shadow-xs whitespace-nowrap shrink-0 ${
                    pathname === '/profile' || pathname === '/profile/edit'
                      ? 'bg-[#E51F3E] text-white shadow-md shadow-red-600/20'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                  <span>My Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 xl:gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 xl:px-3 h-9 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 xl:gap-2.5 shrink-0 flex-nowrap">
                {/* Sign In - Professional Outlined Pill Button */}
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#F5C7CF] bg-white px-3.5 xl:px-4.5 h-9 xl:h-10 text-[13.5px] xl:text-[14px] font-semibold text-[#101828] hover:text-[#E51F3E] hover:bg-[#FDF2F4] hover:border-[#F2B5BF] transition-all duration-200 shadow-2xs whitespace-nowrap shrink-0"
                >
                  <User className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#E51F3E]" />
                  <span>Sign In</span>
                </Link>

                {/* Register - Primary Red Gradient Pill Button */}
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-1.5 xl:gap-2 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] px-4 xl:px-5.5 h-9 xl:h-10 text-[13.5px] xl:text-[14.5px] font-bold text-white shadow-sm shadow-red-600/25 hover:shadow-md hover:shadow-red-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Tablet & Mobile Right Actions (< lg screens) + Hamburger */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2.5 shrink-0 flex-nowrap">
            {!authenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Link
                  href="/login"
                  className="h-8.5 sm:h-9 px-2.5 sm:px-3.5 text-[12.5px] sm:text-[13px] font-semibold text-slate-700 hover:text-[#E51F3E] rounded-full hover:bg-rose-50/60 transition inline-flex items-center justify-center whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="h-8.5 sm:h-9 px-3 sm:px-4 text-[12.5px] sm:text-[13px] font-bold text-white bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] hover:bg-[#ce102f] rounded-full shadow-sm shadow-red-600/25 inline-flex items-center justify-center gap-1 transition whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <NotificationBell />
                <Link
                  href="/messages"
                  className="p-1.5 sm:p-2 rounded-full bg-rose-50 text-[#E51F3E] hover:bg-rose-100 transition inline-flex items-center justify-center"
                  title="Messages & Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </Link>
                <Link
                  href="/profile"
                  className="p-1.5 sm:p-2 rounded-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition inline-flex items-center justify-center"
                  title="My Profile"
                >
                  <UserCheck className="w-4 h-4" />
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
                subtitle="Doctor Matrimony"
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
                    <Link
                      href="/profile/blocked"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-3 rounded-xl text-[15px] font-semibold transition flex items-center justify-between border-0 outline-none ${
                        pathname === '/profile/blocked'
                          ? 'bg-[#FFF0F3] text-[#E9232E]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#E9232E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Ban className="w-4 h-4 text-[#E51F3E]" />
                        <span>Blocked Profiles</span>
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
  );
}
