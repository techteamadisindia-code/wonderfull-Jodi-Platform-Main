import Link from 'next/link';
import { SearchForm } from '../components/SearchForm';
import { WeddingSearch } from '../components/WeddingSearch';
import { Testimonials } from '../components/Testimonials';
import { ProfileCard } from '../components/ProfileCard';
import { ShieldCheck, Heart, Users, Sparkles, CheckCircle2, ArrowRight, Star, Lock, Phone } from 'lucide-react';

const mockProfiles = [
  {
    _id: 'p1',
    displayName: 'Priya Sharma',
    gender: 'Female',
    dob: '1998-05-14',
    city: 'Mumbai',
    education: 'M.Tech in CS (IIT Bombay)',
    profession: 'Senior Software Engineer',
    primaryPhoto: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=85&w=800&h=1000',
  },
  {
    _id: 'p2',
    displayName: 'Rohan Mehta',
    gender: 'Male',
    dob: '1994-11-20',
    city: 'Bengaluru',
    education: 'MBA (IIM Ahmedabad)',
    profession: 'Product Director',
    primaryPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=85&w=800&h=1000',
  },
  {
    _id: 'p3',
    displayName: 'Ananya Verma',
    gender: 'Female',
    dob: '1996-08-03',
    city: 'Delhi NCR',
    education: 'MBBS, MD Cardiology',
    profession: 'Consultant Cardiologist',
    primaryPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=85&w=800&h=1000',
  },
  {
    _id: 'p4',
    displayName: 'Arjun Iyer',
    gender: 'Male',
    dob: '1997-03-15',
    city: 'Pune',
    education: 'M.Sc. Data Science (BITS Pilani)',
    profession: 'Data Scientist',
    primaryPhoto: 'https://images.unsplash.com/photo-1500959915551-4e8d30928e4f?auto=format&fit=crop&q=85&w=800&h=1000',
  },
];

const stats = [
  { value: '100k+', label: 'Verified Members', color: 'text-slate-900' },
  { value: '98%',   label: 'Success Rate',     color: 'text-red-600'   },
  { value: '50k+',  label: 'Happy Marriages',  color: 'text-amber-700' },
];

const whyChooseFeatures = [
  {
    icon: ShieldCheck,
    title: '100% Safe',
    desc: 'Multi-layer verification ensures real, trustworthy profiles only.',
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    icon: Heart,
    title: 'Smart Match',
    desc: 'AI recommendation algorithms based on lifestyle compatibility.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  {
    icon: Users,
    title: 'Family Friendly',
    desc: 'Built for manageability by parents and family guardians.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Sparkles,
    title: 'Dedicated Support',
    desc: 'Personal relationship manager assistance available.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── Hero Section ───────────────────────────── */}
      <section className="relative bg-gradient-to-br from-rose-50 via-white to-amber-50/30 pt-14 pb-24 px-6 overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-red-200/20 blur-3xl animate-orb-pulse pointer-events-none" />
        <div className="absolute top-10 -right-28 w-80 h-80 rounded-full bg-rose-300/15 blur-3xl animate-orb-pulse delay-300 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 rounded-full bg-amber-200/10 blur-3xl animate-orb-pulse delay-500 pointer-events-none" />

        <div className="mx-auto max-w-7xl lg:flex lg:items-center lg:gap-16 relative z-10">
          {/* Left Content */}
          <div className="max-w-2xl lg:w-1/2 space-y-7 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100/80 border border-red-200 px-4 py-1.5 text-xs font-bold text-red-700 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 fill-red-600 text-red-600" />
              #1 Trusted Matrimony Platform for Professionals
            </span>

            <h1 className="font-serif-wedding text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.12]">
              Find Your{' '}
              <span className="text-gradient-crimson">Perfect Partner</span>{' '}
              <br className="hidden sm:block" />
              With Complete Trust
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-slate-600 font-normal max-w-xl">
              Join thousands of educated professionals discovering compatible life partners through verified profiles, smart filters, and complete privacy control.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-1 animate-fade-in-up delay-200">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:from-red-700 hover:to-rose-700 transition transform active:scale-95 btn-press"
              >
                Create Free Profile
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 backdrop-blur-sm px-8 py-4 text-base font-semibold text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 transition btn-press"
              >
                Browse Profiles
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/80 animate-fade-in-up delay-300">
              {stats.map(({ value, label, color }) => (
                <div key={label}>
                  <h4 className={`font-serif-wedding text-2xl font-bold ${color}`}>{value}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Search Card */}
          <div className="mt-14 lg:mt-0 lg:w-1/2 animate-fade-in-up delay-200">
            <div className="rounded-3xl bg-white/90 backdrop-blur-sm p-8 shadow-2xl border border-rose-100/80 relative">
              {/* Top glint */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-200 to-transparent rounded-t-3xl" />

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 animate-heartbeat">
                  <Heart className="w-5 h-5 fill-red-600 stroke-none" />
                </div>
                <div>
                  <h2 className="font-serif-wedding text-xl font-bold text-slate-900">Quick Match Search</h2>
                  <p className="text-xs text-slate-500">Filter profiles based on your requirements</p>
                </div>
              </div>

              <SearchForm />

              {/* Trust Micro-badges below form */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Only
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <Lock className="w-3.5 h-3.5" /> Privacy Protected
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 stroke-none" /> 98% Success Rate
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Wedding Search Feature Section ──────────── */}
      <WeddingSearch />

      {/* ── Featured Verified Profiles ──────────────── */}
      <section className="py-24 px-6 bg-gradient-to-b from-white via-slate-50/50 to-white border-t border-b border-slate-100">
        <div className="mx-auto max-w-7xl space-y-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.25em] font-bold text-red-600 bg-red-50/60 px-4 py-1.5 rounded-full inline-block border border-red-200/50">
                ✦ Featured Profiles
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
                Discover <span className="text-gradient-crimson">Verified Life Partners</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
                Explore verified profiles of educated professionals seeking meaningful connections. All members are manually screened and verified.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 font-semibold text-red-600 hover:text-red-700 transition text-sm whitespace-nowrap"
            >
              Explore All Profiles
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mockProfiles.map((profile) => (
              <ProfileCard key={profile._id} profile={profile} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Wonderful Jodi ────────────────── */}
      <section className="py-20 px-6 bg-slate-900 text-white relative overflow-hidden">
        {/* Background decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 pointer-events-none" />

        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-red-400 bg-red-950/80 px-4 py-1.5 rounded-full border border-red-800/50 inline-block">
              Why Choose Us
            </span>
            <h2 className="font-serif-wedding text-3xl sm:text-4xl font-bold leading-tight">
              Designed For Serious{' '}
              <span className="text-gradient-crimson">Marriage Seeking</span>{' '}
              Families
            </h2>
            <p className="text-slate-300 text-base leading-relaxed">
              Unlike generic dating apps, Wonderful Jodi is dedicated strictly to matrimony. We empower individuals and parents with verified data, background security, and seamless tools.
            </p>

            <div className="space-y-4 pt-2">
              {[
                'Strict manual photo & government ID verification',
                'Advanced preference filters including Education, Profession & Family Values',
                'Protected phone numbers and photo privacy locks',
                'Dedicated Matchmaker support for Premium members',
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition btn-press"
              >
                Learn More About Our Mission
              </Link>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-6">
            {whyChooseFeatures.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="bg-slate-800/80 border border-slate-700/70 p-6 rounded-3xl space-y-3 hover:border-slate-500 transition card-lift"
              >
                <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-serif-wedding text-lg font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real Success Stories ─────────────────────── */}
      <Testimonials />

      {/* ── Social Proof Stats Banner ────────────────── */}
      <section className="py-12 px-6 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '1,00,000+', label: 'Registered Members' },
            { num: '50,000+',   label: 'Successful Matches' },
            { num: '500+',      label: 'Cities Covered' },
            { num: '24/7',      label: 'Customer Support' },
          ].map(({ num, label }) => (
            <div key={label} className="space-y-1">
              <p className="font-serif-wedding text-3xl font-extrabold text-gradient-crimson">{num}</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Membership CTA Banner ───────────────────── */}
      <section className="py-16 px-6 bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.04%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")',
          }}
        />

        <div className="mx-auto max-w-4xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-rose-100 mb-2">
            <Heart className="w-3.5 h-3.5 fill-rose-200" />
            Your perfect match is waiting
          </div>

          <h2 className="font-serif-wedding text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready To Begin Your Search For Happiness?
          </h2>
          <p className="text-rose-100 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Create your free account today and discover thousands of verified brides and grooms looking for a life partner.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-red-700 shadow-xl hover:bg-rose-50 transition btn-press"
            >
              Get Started For Free
              <ArrowRight className="w-5 h-5 text-red-700" />
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition btn-press"
            >
              View Membership Plans
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


