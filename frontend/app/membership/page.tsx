'use client';

import Link from 'next/link';
import { Check, Sparkles, Star, ShieldCheck, Crown } from 'lucide-react';
import { useState } from 'react';

const plans = [
  {
    title: 'Free Plan',
    price: '₹0',
    duration: 'Forever Free',
    description: 'Basic access to create profile, upload photos, and search suitable matches.',
    popular: false,
    badge: 'Basic',
    features: [
      'Create detailed matrimonial profile',
      'Upload up to 3 photos',
      'Perform basic profile searches',
      'Receive match recommendations',
    ],
  },
  {
    title: 'Premium Plan',
    price: '₹4,999',
    duration: '3 Months Access',
    description: 'Advanced search filters, direct messaging, and view phone numbers of matches.',
    popular: true,
    badge: 'Most Popular',
    features: [
      'Everything in Free Plan',
      'View phone numbers & emails of 50 profiles',
      'Send unlimited interest requests',
      'Direct messaging & Easy Chat access',
      'Highlighted profile badge in search',
      'Priority customer support',
    ],
  },
  {
    title: 'Premium VIP',
    price: '₹9,999',
    duration: '6 Months Access',
    description: 'Exclusive matchmaker assistance, unlimited contacts, and top profile placement.',
    popular: false,
    badge: 'VIP Exclusive',
    features: [
      'Everything in Premium Plan',
      'Unlimited phone number & contact access',
      'Personal Relationship Manager support',
      'Top placement in search results',
      'Background verification badge',
      'Guaranteed intro calls setup',
    ],
  },
];

export default function MembershipPage() {
  const [selectedPlan, setSelectedPlan] = useState('');

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Page Header */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-4 py-1 text-xs font-bold text-amber-800">
            <Crown className="w-4 h-4 fill-amber-600 stroke-none" />
            Upgrade Your Matrimonial Experience
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Choose Your <span className="text-red-600">Membership Plan</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Connect directly with verified brides and grooms, unlock phone numbers, and accelerate your partner search.
          </p>
        </section>

        {/* Membership Cards Grid */}
        <section className="grid gap-8 md:grid-cols-3 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.title}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                plan.popular
                  ? 'bg-slate-900 text-white shadow-2xl ring-2 ring-red-600 scale-105'
                  : 'bg-white text-slate-900 border border-rose-100 shadow-sm hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-md">
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold">{plan.title}</h2>
                  {!plan.popular && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <span className="font-serif text-4xl font-extrabold text-red-600">{plan.price}</span>
                  <span className={`text-xs ml-2 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    / {plan.duration}
                  </span>
                </div>

                <p className={`mt-4 text-xs leading-relaxed ${plan.popular ? 'text-slate-300' : 'text-slate-600'}`}>
                  {plan.description}
                </p>

                <div className="my-6 border-t border-slate-200/40" />

                {/* Features List */}
                <ul className="space-y-3 text-xs">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-red-400' : 'text-red-600'}`} />
                      <span className={plan.popular ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setSelectedPlan(plan.title)}
                  className={`w-full rounded-2xl py-3.5 text-xs font-bold transition ${
                    plan.popular
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:from-red-700 hover:to-rose-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {selectedPlan === plan.title ? 'Plan Selected ✓' : `Upgrade To ${plan.title}`}
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Guarantees Box */}
        <section className="rounded-3xl bg-rose-50/70 border border-rose-100 p-8 text-center max-w-3xl mx-auto space-y-3">
          <ShieldCheck className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-slate-900">Need Custom Assistance?</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Our relationship managers can assist you in finding suitable matches based on specific family requirements.
          </p>
          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 underline"
            >
              Contact Matrimonial Support →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
