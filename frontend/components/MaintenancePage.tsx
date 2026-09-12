'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Wrench, Clock, Phone, Mail, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import { Logo } from './Logo';

export function MaintenancePage() {
  const { maintenance, refreshMaintenance } = useMaintenance();
  const [isChecking, setIsChecking] = React.useState(false);

  const handleRefresh = async () => {
    setIsChecking(true);
    await refreshMaintenance();
    setTimeout(() => setIsChecking(false), 600);
  };

  const title = maintenance?.title || "We'll Be Back Soon";
  const message =
    maintenance?.message ||
    'Wonderful Jodi is currently undergoing scheduled maintenance to improve your matchmaking experience. Please check back shortly.';
  const estimatedEndTime = maintenance?.estimatedEndTime
    ? new Date(maintenance.estimatedEndTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between relative overflow-hidden text-[#0f172a]"
      style={{
        background: 'linear-gradient(135deg, #FFFDF9 0%, #FFF8F3 35%, #FFF2EB 70%, #FEEFE6 100%)',
      }}
    >
      {/* Floating Ambient Glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(254, 215, 215, 0.7) 0%, rgba(254, 235, 220, 0.35) 50%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Floating Petals / Subtle Hearts */}
      <div className="absolute pointer-events-none select-none" style={{ top: '12%', left: '15%' }}>
        <Heart className="w-5 h-5 fill-[#FDA4AF] text-[#FDA4AF] opacity-40 animate-float" />
      </div>
      <div className="absolute pointer-events-none select-none" style={{ top: '22%', right: '18%' }}>
        <Heart className="w-4 h-4 fill-[#F87171] text-[#F87171] opacity-30 animate-float" style={{ animationDelay: '1.5s' }} />
      </div>
      <div className="absolute pointer-events-none select-none" style={{ bottom: '20%', left: '20%' }}>
        <Heart className="w-4 h-4 fill-[#FB7185] text-[#FB7185] opacity-35 animate-float" style={{ animationDelay: '2.8s' }} />
      </div>
      <div className="absolute pointer-events-none select-none" style={{ bottom: '15%', right: '15%' }}>
        <Heart className="w-6 h-6 fill-[#FDA4AF] text-[#FDA4AF] opacity-30 animate-float" style={{ animationDelay: '3.5s' }} />
      </div>

      {/* Header with Brand */}
      <header className="w-full max-w-5xl mx-auto px-6 py-8 relative z-10 flex items-center justify-between">
        <Logo size="md" subtitle="Doctor Matrimony" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-800 text-xs font-bold tracking-tight">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Maintenance Mode</span>
        </div>
      </header>

      {/* Main Centered Content Card */}
      <main className="w-full max-w-xl mx-auto px-6 py-6 relative z-10 flex flex-col items-center text-center my-auto">
        <div className="p-8 sm:p-10 rounded-3xl bg-white/85 backdrop-blur-md border border-rose-100 shadow-xl shadow-rose-900/5 space-y-6 w-full animate-fade-in">
          {/* Animated Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-50 to-amber-50 border border-rose-200/80 flex items-center justify-center mx-auto text-[#E51F3E] shadow-sm">
            <Wrench className="w-8 h-8 text-[#E51F3E] animate-pulse" />
          </div>

          {/* Heading and Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#E51F3E] text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Platform Upgrade in Progress</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#101728] tracking-tight leading-tight">
              {title}
            </h1>
          </div>

          {/* Message Description */}
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            {message}
          </p>

          {/* Estimated Completion Timer if provided */}
          {estimatedEndTime && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-center gap-2.5 text-xs text-amber-900 font-semibold">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Estimated Completion: <strong>{estimatedEndTime}</strong>
              </span>
            </div>
          )}

          {/* Action: Check Again Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isChecking}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-full bg-[#E51F3E] hover:bg-[#ce102f] text-white font-bold text-xs shadow-md shadow-red-500/20 transition disabled:opacity-75"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Status...' : 'Check Status Again'}</span>
            </button>
          </div>

          {/* Support Helpline & Email Box */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-500">
            <a
              href="tel:+9109607559547"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#E51F3E] font-medium transition"
            >
              <Phone className="w-3.5 h-3.5 text-[#E51F3E]" />
              <span>+91 096075 59547</span>
            </a>
            <span className="hidden sm:inline text-slate-300">•</span>
            <a
              href="mailto:support@wonderfuljodi.com"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#E51F3E] font-medium transition"
            >
              <Mail className="w-3.5 h-3.5 text-[#E51F3E]" />
              <span>support@wonderfuljodi.com</span>
            </a>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-5">
          Thank you for your patience while we make Wonderful Jodi even better.
        </p>
      </main>

      {/* Footer with Discreet Admin Portal Link */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <p>© {new Date().getFullYear()} Wonderful Jodi. All rights reserved.</p>
        <Link
          href="/admin/login"
          className="text-slate-400 hover:text-slate-600 transition text-[11px] underline underline-offset-4"
        >
          Administrator Login →
        </Link>
      </footer>
    </div>
  );
}
