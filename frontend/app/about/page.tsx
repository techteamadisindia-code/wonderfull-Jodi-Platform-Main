import Link from 'next/link';
import { ShieldCheck, Heart, Users, Award, Sparkles, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="mx-auto max-w-6xl space-y-16">
        {/* Header Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-100 border border-red-200 px-4 py-1.5 text-xs font-bold text-red-700">
            <Heart className="w-3.5 h-3.5 fill-red-600" />
            Our Story & Mission
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Connecting Hearts, Building <span className="text-red-600">Happy Families</span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Wonderful Jodi is India&apos;s premier matrimonial platform created specifically for educated professionals, entrepreneurs, and traditional families seeking trusted, lifelong relationships.
          </p>
        </section>

        {/* Feature Cards */}
        <section className="grid gap-8 md:grid-cols-3">
          <div className="rounded-3xl border border-rose-100 bg-white p-8 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900">100% Verification</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Every profile undergoes strict document and mobile verification to maintain a transparent, spam-free community.
            </p>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-white p-8 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900">Smart Compatibility</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Our intelligent search algorithm connects candidates based on lifestyle choices, educational background, and family values.
            </p>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-white p-8 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-6">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-slate-900">Privacy Control</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Complete control over profile photos, contact visibility, and who can send match requests.
            </p>
          </div>
        </section>

        {/* Values Banner */}
        <section className="rounded-3xl bg-slate-900 text-white p-10 md:p-14 space-y-8">
          <div className="max-w-2xl space-y-4">
            <h2 className="font-serif text-3xl font-bold">Why Thousands Trust Wonderful Jodi</h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              We believe marriage is a sacred union between two families. We are committed to maintaining a secure environment where genuine intentions thrive.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-800">
            {[
              'Zero Fake Profiles Policy',
              'Protected Contact Details',
              '24/7 Customer Assistance',
              'Thousands of Matrimonial Successes',
            ].map((value, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-200 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <h3 className="font-serif text-2xl font-bold text-slate-900 mb-4">Start Your Journey Today</h3>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-red-700 transition"
          >
            Register Free Profile Now
          </Link>
        </section>
      </div>
    </main>
  );
}
