'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  FileText,
  AlertTriangle,
  CreditCard,
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowUp,
  HelpCircle,
  ChevronDown,
  Info,
  Scale,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { TERMS_LAST_UPDATED } from '../../lib/termsConfig';

interface SectionItem {
  id: string;
  num: number;
  title: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'about-wonderfuljodi', num: 1, title: 'About WonderfulJodi' },
  { id: 'acceptance', num: 2, title: 'Acceptance of Terms' },
  { id: 'eligibility', num: 3, title: 'Eligibility' },
  { id: 'registration', num: 4, title: 'Registration' },
  { id: 'one-person-one-profile', num: 5, title: 'One Person — One Profile' },
  { id: 'profile-accuracy', num: 6, title: 'Accuracy of Profile Information' },
  { id: 'verification', num: 7, title: 'Verification' },
  { id: 'matching-services', num: 8, title: 'Matching Services' },
  { id: 'communication', num: 9, title: 'Communication Between Members' },
  { id: 'financial-safety', num: 10, title: 'Financial Safety' },
  { id: 'prohibited-activities', num: 11, title: 'Prohibited Activities' },
  { id: 'contact-privacy', num: 12, title: 'Contact Information & Privacy' },
  { id: 'photos-content', num: 13, title: 'Profile Photos and Content' },
  { id: 'member-content', num: 14, title: 'Member-Generated Content' },
  { id: 'paid-membership', num: 15, title: 'Paid Membership' },
  { id: 'payment', num: 16, title: 'Payment' },
  { id: 'refund-policy', num: 17, title: 'Refund & Cancellation Policy' },
  { id: 'membership-termination', num: 18, title: 'Membership Termination' },
  { id: 'blocking-reporting', num: 19, title: 'Blocking and Reporting' },
  { id: 'no-guarantee', num: 20, title: 'No Guarantee of Marriage' },
  { id: 'interactions-outside', num: 21, title: 'Interactions Outside WonderfulJodi' },
  { id: 'intellectual-property', num: 22, title: 'Intellectual Property' },
  { id: 'automated-access', num: 23, title: 'Automated Access and Scraping' },
  { id: 'website-availability', num: 24, title: 'Website Availability' },
  { id: 'privacy', num: 25, title: 'Privacy' },
  { id: 'child-safety', num: 26, title: 'Child Safety' },
  { id: 'grievance', num: 27, title: 'Grievance / Complaints' },
  { id: 'limitation-responsibility', num: 28, title: 'Limitation of Responsibility' },
  { id: 'indemnification', num: 29, title: 'Indemnification' },
  { id: 'changes-terms', num: 30, title: 'Changes to These Terms' },
  { id: 'governing-law', num: 31, title: 'Governing Law' },
  { id: 'contact-us', num: 32, title: 'Contact Us' },
];

export default function TermsAndConditionsPage() {
  const [activeSection, setActiveSection] = useState('about-wonderfuljodi');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);

      const sectionElements = SECTIONS.map((sec) => document.getElementById(sec.id));
      const scrollPos = window.scrollY + 140;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-[#FFFDFB] text-[#0F172A] pb-24 text-left">
      {/* ── Page Header / Hero Banner ── */}
      <header className="bg-gradient-to-b from-[#6B0D1E] via-[#85132A] to-[#9C1830] text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-rose-900/40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-6xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-100">
            <Scale className="w-3.5 h-3.5 text-rose-300" />
            <span>Official Legal Document • WonderfulJodi.com</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Terms & Conditions
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-rose-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-300" />
            <span>Last Updated: {TERMS_LAST_UPDATED}</span>
          </p>

          <p className="text-sm sm:text-base text-rose-100/90 max-w-3xl leading-relaxed pt-1">
            Welcome to WonderfulJodi.com, an online matrimonial and matchmaking platform designed to help
            individuals discover, connect and communicate with prospective matrimonial partners.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {/* Mobile Table of Contents Accordion / Selector */}
        <div className="lg:hidden mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <label htmlFor="mobile-toc" className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
            Table of Contents (Jump to Section)
          </label>
          <div className="relative">
            <select
              id="mobile-toc"
              value={activeSection}
              onChange={(e) => scrollToSection(e.target.value)}
              className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:border-[#E51F3E]"
            >
              {SECTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.num}. {sec.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Two-Column Layout (Desktop sticky TOC rail + Legal Article content) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Desktop Sticky Table of Contents (4 cols) ── */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 max-h-[82vh] flex flex-col">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#E51F3E]" />
                  <span>Table of Contents</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">32 legal clauses & provisions</p>
              </div>

              <nav aria-label="Table of Contents" className="overflow-y-auto space-y-0.5 pr-1 text-xs">
                {SECTIONS.map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-start gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-rose-50 text-[#800020] font-bold border-l-4 border-[#E51F3E]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span className="text-[11px] text-slate-400 font-bold shrink-0">{sec.num}.</span>
                      <span className="truncate">{sec.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ── Main Legal Article Content (8 cols) ── */}
          <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-10">
            {/* 1. About WonderfulJodi */}
            <section id="about-wonderfuljodi" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">1.</span>
                <span>About WonderfulJodi</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi is a matrimonial and matchmaking platform. The platform is intended solely for matrimonial purposes and is not intended to operate as a dating, casual relationship or entertainment platform. Members can create profiles, search profiles, send and receive interests, communicate with compatible prospects, view available profile information, utilize matchmaking features, and purchase optional paid services.
              </p>
            </section>

            {/* 2. Acceptance of Terms */}
            <section id="acceptance" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">2.</span>
                <span>Acceptance of Terms</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                By accessing, registering with, browsing, downloading, or utilizing the WonderfulJodi website or associated matchmaking services, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms & Conditions ("Terms") and our Privacy Policy. If you do not agree with any part of these Terms, you must discontinue accessing or using the platform immediately.
              </p>
            </section>

            {/* 3. Eligibility */}
            <section id="eligibility" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">3.</span>
                <span>Eligibility</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Users must be at least 18 years of age. Users must possess the legal capacity and authority under the applicable personal laws of India or the jurisdiction of their citizenship to enter into a lawful contract of marriage. Users should not create an account for another person without their express knowledge and lawful authorization. Where an account is managed by a parent, sibling, or legal guardian, it must be created with the full awareness, consent, and authorization of the prospective bride or groom.
              </p>
            </section>

            {/* 4. Registration */}
            <section id="registration" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">4.</span>
                <span>Registration</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                To access matchmaking services, individuals must complete account registration. Registrants agree to provide truthful, complete, and verifiable information. Each user is responsible for maintaining the confidentiality of their login credentials (including passwords and one-time verification passcodes) and is fully responsible for all actions taken through their registered account.
              </p>
            </section>

            {/* 5. One Person — One Profile */}
            <section id="one-person-one-profile" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">5.</span>
                <span>One Person — One Profile</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Each individual member is permitted only one active profile on WonderfulJodi. Registering duplicate, overlapping, or multiple profiles for the same individual is strictly prohibited. WonderfulJodi reserves the right to merge, deactivate, or delete duplicate accounts without prior notice.
              </p>
            </section>

            {/* 6. Accuracy of Profile Information */}
            <section id="profile-accuracy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">6.</span>
                <span>Accuracy of Profile Information</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Members represent, warrant, and covenant that all information submitted during registration and profile completion is truthful, accurate, complete, and current. This includes:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>Legal Full Name</li>
                <li>Verified Mobile Number and Email Address</li>
                <li>Age and Date of Birth</li>
                <li>Matrimonial information (Marital status, Religion, Caste, Community, Mother tongue)</li>
                <li>Professional information (Designation, Current Hospital/Clinic, Employer, Work location, Income)</li>
                <li>Photographs depicting the genuine candidate</li>
                <li>Medical qualifications (MBBS, MD, MS, DNB, BDS, MDS, DM, MCh) and medical council registrations</li>
                <li>Location, residence, and native place</li>
                <li>Family details, parental occupations, and siblings</li>
                <li>Contact information</li>
              </ul>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Because WonderfulJodi is dedicated to doctors and medical professionals, misrepresentation of educational degrees, medical council licenses, clinical practice, or matrimonial status will lead to immediate profile termination and potential referral to relevant statutory bodies.
              </p>
            </section>

            {/* 7. Verification */}
            <section id="verification" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">7.</span>
                <span>Verification</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi provides verification features allowing verification of:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>Mobile number via OTP</li>
                <li>Email address via activation link or passcode</li>
                <li>Photographs for identity consistency</li>
                <li>Identity documents (Government-issued photo identification)</li>
                <li>Educational and professional documents</li>
                <li>Medical council registration qualifications</li>
              </ul>
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-950 text-xs sm:text-sm space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Important Verification Disclaimer</span>
                </div>
                <p className="leading-relaxed">
                  Verification on WonderfulJodi confirms only that the submitted documents or electronic contact channels were validated against platform screening standards. Verification does NOT guarantee a member's character, background, financial condition, matrimonial intentions or future conduct. Members and their families are solely responsible for conducting their own independent due diligence, character verification, and marital eligibility checks prior to proceeding with any engagement or marriage.
                </p>
              </div>
            </section>

            {/* 8. Matching Services */}
            <section id="matching-services" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">8.</span>
                <span>Matching Services</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi provides automated matchmaking algorithms, search filters, and prospect recommendations based on the preferences, medical specializations, and criteria specified by members. Match suggestions are intended solely to assist discovery and do not constitute an endorsement, representation, or guarantee of suitability by WonderfulJodi.
              </p>
            </section>

            {/* 9. Communication Between Members */}
            <section id="communication" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">9.</span>
                <span>Communication Between Members</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                All communications between members on WonderfulJodi must remain courteous, dignified, and strictly matrimonial. The following communication behavior is strictly prohibited:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-700">
                <li>Harassment, abusive language, or intimidating conduct</li>
                <li>Threats of any kind</li>
                <li>Obscene material, vulgar expressions, or profanity</li>
                <li>Unwanted sexual content or solicitation</li>
                <li>Repeated unwanted contact following a clear rejection or refusal</li>
                <li>Impersonation of any person or doctor</li>
                <li>Illegal activities of any nature</li>
                <li>Fraudulent money requests or financial appeals</li>
                <li>Scams and social engineering</li>
                <li>Unrelated commercial activity or advertising</li>
              </ul>
            </section>

            {/* 10. Financial Safety */}
            <section id="financial-safety" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">10.</span>
                <span>Financial Safety</span>
              </h2>
              <div className="p-5 rounded-3xl bg-rose-50/90 border-2 border-rose-300 text-rose-950 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-rose-900">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>CRITICAL WARNING: NEVER SEND MONEY TO ANY MEMBER</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900">
                  WonderfulJodi strongly advises members to exercise extreme caution regarding financial matters. You must NEVER send money or share financial credentials with anyone you interact with on the platform. Specifically:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-rose-900 font-medium">
                  <li>Never send money, wire transfers, or digital currency to any member.</li>
                  <li>Never disclose your bank account details, UPI PINs, Internet banking passwords, or OTPs.</li>
                  <li>Never share credit or debit card numbers, expiration dates, or CVV security codes.</li>
                  <li>Never provide personal financial loans, advances, or business investments.</li>
                  <li>Never purchase tickets, goods, or transfer valuables for a prospective match.</li>
                  <li>
                    Be on alert against emergency requests (e.g. fabricated medical emergencies, travel distress, customs clearance fees, or foreign visa assistance).
                  </li>
                </ul>
                <p className="text-xs text-rose-800 font-bold pt-1">
                  WonderfulJodi representatives will NEVER contact you asking for your banking passwords, OTPs, or to transfer money to another member. Report any financial solicitation immediately.
                </p>
              </div>
            </section>

            {/* 11. Prohibited Activities */}
            <section id="prohibited-activities" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">11.</span>
                <span>Prohibited Activities</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Members agree not to engage in any of the following 19 prohibited activities:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-slate-700">
                <li>Creating fake, fictional, or misleading matrimonial profiles</li>
                <li>Impersonating another person, doctor, medical institution, or entity</li>
                <li>Harassment, emotional abuse, threats, or intimidation of any member</li>
                <li>Stalking, cyberbullying, or persistent unwanted messaging after a request to cease</li>
                <li>Spamming, bulk message distribution, or unsolicited chain messages</li>
                <li>Phishing, credential harvesting, or deceptive social engineering</li>
                <li>Fraud, deceptive financial misrepresentation, or extortion</li>
                <li>Solicitation of money, funds, loans, charity donations, or financial aid</li>
                <li>Commercial advertising, marketing, or promotional solicitations</li>
                <li>Recruitment, job offerings, multi-level marketing, or business promotion</li>
                <li>Political campaigning, lobbying, or ideological propaganda</li>
                <li>Any illegal activities under Indian law or the laws of your jurisdiction</li>
                <li>Publishing unauthorized private contact details, photos, or documents of another individual</li>
                <li>Copyright, trademark, or intellectual property infringement</li>
                <li>Automated scraping, crawling, or systematic data extraction from profiles</li>
                <li>Deploying bots, spiders, automated tools, or unauthorized scripts</li>
                <li>Unauthorized access to servers, databases, platform infrastructure, or user accounts</li>
                <li>Circumventing security features, rate limits, paywalls, or administrative controls</li>
                <li>Using member information obtained through the platform for any purpose outside genuine matrimonial communication</li>
              </ol>
            </section>

            {/* 12. Contact Information & Privacy */}
            <section id="contact-privacy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">12.</span>
                <span>Contact Information & Privacy</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                To safeguard personal privacy, WonderfulJodi may restrict or remove personal residential addresses, banking/financial information, passwords, OTPs, government identification numbers (such as Aadhaar, PAN, Passport), and other highly sensitive information from public profile displays. Members control their contact number and email visibility using privacy preference controls within their account settings.
              </p>
            </section>

            {/* 13. Profile Photos and Content */}
            <section id="photos-content" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">13.</span>
                <span>Profile Photos and Content</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Photos uploaded to WonderfulJodi must depict the genuine individual for whom the matrimonial profile is maintained. Uploading photographs of celebrities, models, strangers, memes, cartoons, copyrighted graphics, or inappropriate, provocative, or obscene imagery is strictly prohibited and will be removed without notice.
              </p>
            </section>

            {/* 14. Member-Generated Content */}
            <section id="member-content" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">14.</span>
                <span>Member-Generated Content</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Members retain ownership of the text, photographs, and bio information they post. By submitting content to WonderfulJodi, members grant WonderfulJodi a worldwide, royalty-free, non-exclusive license to host, display, adapt, and distribute such content solely for the purpose of operating, improving, and promoting the matrimonial platform. Members represent that they possess all legal rights to post such material without infringing third-party rights.
              </p>
            </section>

            {/* 15. Paid Membership */}
            <section id="paid-membership" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">15.</span>
                <span>Paid Membership</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi offers optional paid membership packages designed to enhance matchmaking. Paid services may include:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>Additional profile visibility in search rankings</li>
                <li>Direct contact access (verified mobile numbers and emails)</li>
                <li>Direct in-platform chat and messaging</li>
                <li>Premium advanced search and specialty filters</li>
                <li>Matchmaking assistance and profile advisor support</li>
                <li>Profile highlighting and featured badge</li>
                <li>Other premium features activated on specific tiers</li>
              </ul>
            </section>

            {/* 16. Payment */}
            <section id="payment" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">16.</span>
                <span>Payment</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                All membership fees must be paid through authorized payment gateways (credit cards, debit cards, UPI, net banking) available on the platform. All transactions are charged in Indian Rupees (INR) unless otherwise specified. Applicable goods and services taxes (GST) are levied in accordance with prevailing statutory tax regulations.
              </p>
            </section>

            {/* 17. Refund & Cancellation Policy */}
            <section id="refund-policy" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">17.</span>
                <span>Refund & Cancellation Policy</span>
              </h2>
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-slate-800 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
                  <CreditCard className="w-5 h-5 text-[#E51F3E] shrink-0" />
                  <span>General Non-Refundability & Permitted Refund Exceptions</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">
                  Paid membership fees are generally non-refundable once membership or service has been activated or used.
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                  However, refunds may be considered strictly under the following circumstances:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                  <li><strong>Duplicate payment:</strong> Where the member's account was charged more than once for the same transaction due to a gateway error.</li>
                  <li><strong>Payment deducted but membership not activated:</strong> Where funds were successfully debited from the member's account, but the corresponding subscription was not activated within 48 hours.</li>
                  <li><strong>Technical failure preventing delivery:</strong> Where an unresolvable technical failure on WonderfulJodi's systems prevented access to core paid membership benefits.</li>
                  <li><strong>Unauthorized transaction:</strong> Where an unauthorized fraudulent transaction is reasonably and conclusively established through official banking channels.</li>
                  <li><strong>Statutory requirement:</strong> Where a refund is explicitly required by applicable law.</li>
                </ul>
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                  <p>
                    <strong>Filing Timeline:</strong> Refund requests should normally be submitted within <strong>7 days</strong> of the transaction date.
                  </p>
                  <p>
                    All refund claims must be sent to <span className="font-mono text-slate-900 font-bold">support@wonderfuljodi.com</span> accompanied by the registered email, transaction reference ID, and bank payment receipt. Approved refunds will be credited back to the original payment source within 7 to 10 business days.
                  </p>
                </div>
              </div>
            </section>

            {/* 18. Membership Termination */}
            <section id="membership-termination" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">18.</span>
                <span>Membership Termination</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi reserves the right to suspend, restrict, or terminate any member's account or profile immediately, without prior notice and without refund, upon breach of these Terms, submission of fraudulent documents or fake medical degrees, engagement in prohibited conduct, harassment, commercial solicitation, or misuse of the platform. Members may delete or deactivate their profile at any time through their account settings.
              </p>
            </section>

            {/* 19. Blocking and Reporting */}
            <section id="blocking-reporting" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">19.</span>
                <span>Blocking and Reporting</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Members have access to self-serve blocking and confidential reporting features. If a member encounters offensive behavior, abusive messages, fraudulent requests for money, or suspicious profile credentials, they should immediately block the profile and submit a detailed report to our moderation team via the platform reporting tool or by emailing grievance@wonderfuljodi.com.
              </p>
            </section>

            {/* 20. No Guarantee of Marriage */}
            <section id="no-guarantee" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">20.</span>
                <span>No Guarantee of Marriage</span>
              </h2>
              <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-200 text-slate-800 text-xs sm:text-sm space-y-2">
                <p className="font-bold text-slate-900">WonderfulJodi does not guarantee:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>Any particular number of matches, views, or profile visits</li>
                  <li>Responses to interests, messages, or communication requests</li>
                  <li>Personal compatibility or emotional connection between members</li>
                  <li>Engagement, solemnization of marriage, or long-term matrimonial success</li>
                </ul>
                <p className="text-xs text-slate-600 pt-1">
                  WonderfulJodi provides an introductory platform to discover prospects. Final matrimonial decisions rest entirely with the prospective bride, groom, and their respective families.
                </p>
              </div>
            </section>

            {/* 21. Interactions Outside WonderfulJodi */}
            <section id="interactions-outside" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">21.</span>
                <span>Interactions Outside WonderfulJodi</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi exercises no control over, and accepts no liability or responsibility for, any interactions, telephone calls, virtual video meetings, in-person meetings, financial transactions, agreements, or disputes occurring outside the website platform. Members must take standard precautions and conduct personal family background checks before meeting offline.
              </p>
            </section>

            {/* 22. Intellectual Property */}
            <section id="intellectual-property" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">22.</span>
                <span>Intellectual Property</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                All platform trademarks, logos, brand assets, website graphics, designs, user interfaces, source code, database architecture, and proprietary algorithms are the exclusive intellectual property of WonderfulJodi. No content from WonderfulJodi may be copied, reproduced, modified, distributed, or republished without prior written authorization.
              </p>
            </section>

            {/* 23. Automated Access and Scraping */}
            <section id="automated-access" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">23.</span>
                <span>Automated Access and Scraping</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Any scraping, crawling, automated indexing, harvesting, framing, or programmatic extraction of doctor profiles, candidate data, or contact details is strictly prohibited. Engaging in automated access constitutes an actionable civil breach and a punishable computer security violation under Section 43 and Section 66 of the Information Technology Act, 2000.
              </p>
            </section>

            {/* 24. Website Availability */}
            <section id="website-availability" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">24.</span>
                <span>Website Availability</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi is provided on an "as is" and "as available" basis. While we strive to ensure optimal availability, we do not warrant that service will be uninterrupted, error-free, completely bug-free, or perpetually available. Scheduled maintenance, system upgrades, and telecommunication network disruptions may occur periodically.
              </p>
            </section>

            {/* 25. Privacy */}
            <section id="privacy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">25.</span>
                <span>Privacy</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Your privacy is paramount. Personal data collection, processing, and storage are governed by our comprehensive{' '}
                <Link href="/privacy" className="font-bold text-[#E51F3E] hover:underline">
                  Privacy Policy
                </Link>
                , which forms an integral part of these Terms. By using the platform, you consent to data processing consistent with India's Digital Personal Data Protection (DPDP) Act, 2023, and the Digital Personal Data Protection Rules, 2025.
              </p>
            </section>

            {/* 26. Child Safety */}
            <section id="child-safety" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">26.</span>
                <span>Child Safety</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi is strictly an adult matrimonial service intended solely for individuals aged 18 years and older. The platform strictly prohibits account registration by or for minors. We have zero tolerance for child sexual abuse material (CSAM), grooming, or exploitation of minors. Any account found violating child protection standards will be immediately terminated and reported to law enforcement authorities.
              </p>
            </section>

            {/* 27. Grievance / Complaints */}
            <section id="grievance" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">27.</span>
                <span>Grievance / Complaints</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                In accordance with the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Digital Personal Data Protection framework, the details of the designated Grievance Officer are provided below:
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1.5">
                <p><strong>Designation:</strong> Grievance Redressal Officer</p>
                <p><strong>Entity:</strong> WonderfulJodi.com (Matrimonial Services)</p>
                <p><strong>Address:</strong> A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034, India</p>
                <p><strong>Email:</strong> <span className="font-mono font-bold text-[#E51F3E]">grievance@wonderfuljodi.com</span></p>
                <p><strong>Acknowledgment:</strong> Within 24 hours of receipt of written complaint</p>
                <p><strong>Redressal:</strong> Within 15 days as prescribed under statutory intermediary guidelines</p>
              </div>
            </section>

            {/* 28. Limitation of Responsibility */}
            <section id="limitation-responsibility" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">28.</span>
                <span>Limitation of Responsibility</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                To the maximum extent permitted by applicable law, WonderfulJodi, its founders, directors, employees, affiliates, and representatives shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, emotional distress, or matrimonial disputes arising out of or related to your use of or inability to use the platform. In all circumstances, WonderfulJodi's maximum aggregate liability to any member under all causes of action shall be strictly limited to the actual amount paid by that member during the three (3) months preceding the claim or ₹1,000 (Indian Rupees One Thousand), whichever is lower.
              </p>
            </section>

            {/* 29. Indemnification */}
            <section id="indemnification" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">29.</span>
                <span>Indemnification</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                You agree to defend, indemnify, and hold harmless WonderfulJodi, its officers, directors, employees, and agents from and against any third-party claims, liabilities, losses, damages, legal actions, and expenses (including reasonable attorneys' fees) arising out of or resulting from your violation of these Terms, breach of any representation or warranty, infringement of third-party intellectual property or privacy rights, or unlawful conduct on the platform.
              </p>
            </section>

            {/* 30. Changes to These Terms */}
            <section id="changes-terms" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">30.</span>
                <span>Changes to These Terms</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi reserves the right to amend, update, or revise these Terms & Conditions at any time. When material modifications are made, the "Last Updated" date at the top will be updated. In cases of significant changes, notice may be provided via email or a platform announcement. Continued access or use of WonderfulJodi following notice of changes constitutes full acceptance of the updated Terms.
              </p>
            </section>

            {/* 31. Governing Law */}
            <section id="governing-law" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">31.</span>
                <span>Governing Law</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                These Terms & Conditions and any dispute or claim arising out of or in connection with them shall be governed by, construed, and enforced in accordance with the laws of the Republic of India, without giving effect to conflict of laws principles. Any legal suit, action, or proceeding arising out of or relating to these Terms shall be instituted exclusively in the competent civil courts located in Pune or Mumbai, Maharashtra, India.
              </p>
            </section>

            {/* 32. Contact Us */}
            <section id="contact-us" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">32.</span>
                <span>Contact Us</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                If you have any questions, clarifications, or feedback regarding these Terms & Conditions, please contact us through our official support channels:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Customer Support</span>
                  <p className="font-bold text-slate-900">WonderfulJodi Support Desk</p>
                  <p className="text-slate-600">Email: <a href="mailto:support@wonderfuljodi.com" className="text-[#E51F3E] hover:underline font-mono font-bold">support@wonderfuljodi.com</a></p>
                  <p className="text-slate-600">Phone: <a href="tel:+9109607559547" className="text-slate-800 hover:text-[#E51F3E] font-bold">+91 096075 59547</a></p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Grievance & Legal</span>
                  <p className="font-bold text-slate-900">Grievance Redressal Officer</p>
                  <p className="text-slate-600">Email: <a href="mailto:grievance@wonderfuljodi.com" className="text-[#E51F3E] hover:underline font-mono font-bold">grievance@wonderfuljodi.com</a></p>
                  <p className="text-slate-600">Hours: Mon – Sat, 9:30 AM – 6:30 PM IST</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Registered Office</span>
                  <p className="font-semibold text-slate-900">
                    A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034, India.
                  </p>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>

      {/* ── Back to Top Floating Button ── */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-[#E51F3E] text-white shadow-lg hover:bg-[#CC1432] transition cursor-pointer z-40"
          title="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </main>
  );
}
