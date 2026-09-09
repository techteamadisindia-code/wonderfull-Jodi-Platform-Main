'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  Database,
  Eye,
  Users,
  Share2,
  Lock,
  KeyRound,
  Cookie,
  Clock,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Bell,
  UserCheck,
  HeartHandshake,
  BadgeCheck,
  HelpCircle,
  Undo2,
  ShieldAlert,
  RefreshCw,
  Mail,
  Phone,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  CheckCircle2,
  Info,
  Building2,
  CreditCard,
  Laptop,
} from 'lucide-react';

interface SectionItem {
  id: string;
  num: number;
  title: string;
}

const PRIVACY_LAST_UPDATED = '02 September 2026';

const SECTIONS: SectionItem[] = [
  { id: 'about-policy', num: 1, title: 'About This Privacy Policy' },
  { id: 'information-we-collect', num: 2, title: 'Information We Collect' },
  { id: 'how-we-use-information', num: 3, title: 'How We Use Your Information' },
  { id: 'profile-visibility', num: 4, title: 'Profile Visibility' },
  { id: 'shared-with-members', num: 5, title: 'Information Shared With Other Members' },
  { id: 'shared-with-third-parties', num: 6, title: 'Information We Share With Third Parties' },
  { id: 'data-security', num: 7, title: 'Data Security' },
  { id: 'account-security', num: 8, title: 'Account Security' },
  { id: 'cookies', num: 9, title: 'Cookies' },
  { id: 'data-retention', num: 10, title: 'Data Retention' },
  { id: 'account-deletion', num: 11, title: 'Account Deletion' },
  { id: 'children-privacy', num: 12, title: "Children's Privacy" },
  { id: 'third-party-services', num: 13, title: 'Third-Party Services' },
  { id: 'communication-from-us', num: 14, title: 'Communication From WonderfulJodi' },
  { id: 'info-about-others', num: 15, title: 'Information You Provide About Other People' },
  { id: 'matrimonial-information', num: 16, title: 'Matrimonial Information' },
  { id: 'verification-accuracy', num: 17, title: 'Verification and Accuracy' },
  { id: 'privacy-choices-rights', num: 18, title: 'Your Privacy Choices and Rights' },
  { id: 'withdrawal-of-consent', num: 19, title: 'Withdrawal of Consent' },
  { id: 'data-breaches', num: 20, title: 'Data Breaches and Security Incidents' },
  { id: 'changes-to-policy', num: 21, title: 'Changes to This Privacy Policy' },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('about-policy');
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-100 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-100">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
              <span>Official Privacy Policy • WonderfulJodi.com</span>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Privacy Policy
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-rose-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-300" />
            <span>Last Updated: {PRIVACY_LAST_UPDATED}</span>
          </p>

          <p className="text-sm sm:text-base text-rose-100/90 max-w-3xl leading-relaxed pt-1">
            WonderfulJodi.com (&quot;WonderfulJodi&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy and is committed to protecting the personal information you provide while using our website, mobile applications, services and related features.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {/* Mobile Table of Contents Selector */}
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

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Desktop Sticky Table of Contents (4 cols) ── */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 max-h-[82vh] flex flex-col">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="font-serif text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#E51F3E]" />
                  <span>Table of Contents</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">21 privacy provisions & rights</p>
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

              {/* Quick Privacy Contact Box in Sidebar */}
              <div className="pt-2 border-t border-slate-100">
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 space-y-1 text-[11px]">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#E51F3E]" />
                    <span>Privacy Officer</span>
                  </p>
                  <p className="text-slate-600">Email: wonderfuljodi@gmail.com</p>
                  <p className="text-slate-600">WhatsApp: +91 9730008748</p>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main Legal Article Content (8 cols) ── */}
          <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-10">
            {/* Preamble Callout Card */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-amber-950 space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Notice to Members & Visitors</span>
              </div>
              <p>
                This Privacy Policy explains what information we may collect, how we use it, when we may share it, how we protect it, and the choices available to you. By accessing or using WonderfulJodi.com, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>

            {/* 1. About This Privacy Policy */}
            <section id="about-policy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">1.</span>
                <span>About This Privacy Policy</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                This Privacy Policy applies to information collected through:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs sm:text-sm text-slate-700">
                {[
                  'WonderfulJodi.com',
                  'Our mobile applications, if applicable',
                  'Registration and profile forms',
                  'Membership and payment services',
                  'Customer-support communications',
                  'Chat and messaging features',
                  'Matchmaking services',
                  'Other services provided through WonderfulJodi',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs sm:text-sm text-slate-600 italic pt-2">
                This Policy does not apply to third-party websites, applications or services that may be accessed through links on our platform.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section id="information-we-collect" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">2.</span>
                <span>Information We Collect</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Depending on how you use WonderfulJodi, we may collect the following categories of information:
              </p>

              {/* Subsection A */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold flex items-center justify-center">A</span>
                  <span>Registration Information</span>
                </h3>
                <p className="text-xs text-slate-600">When you create an account, we may collect:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                  {['Name', 'Email address', 'Mobile number', 'Password / authentication info', 'Gender', 'Date of birth / age', 'City / location', 'Marital information', 'Other basic registration data'].map((sub, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E51F3E]" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subsection B */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold flex items-center justify-center">B</span>
                  <span>Matrimonial Profile Information</span>
                </h3>
                <p className="text-xs text-slate-600">You may voluntarily provide information such as:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                  {[
                    'Education & Degrees',
                    'Profession & Occupation',
                    'Medical qualification / specialization',
                    'Work & Employer information',
                    'Family details & Values',
                    'Lifestyle preferences',
                    'Matrimonial partner preferences',
                    'Mother tongue & Languages',
                    'Religion / community (voluntary)',
                    'Location preferences',
                    'About-me bio description',
                    'Photographs & Gallery',
                  ].map((sub, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  And other information you voluntarily choose to include in your matrimonial profile.
                </p>
              </div>

              {/* Subsection C */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold flex items-center justify-center">C</span>
                  <span>Verification Information</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Where verification services are offered, we may collect information or documents required to verify:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                  {['Government Identity', 'Mobile number (OTP)', 'Email address', 'Educational certificates', 'Professional / Medical credentials', 'Other relevant verification data'].map((sub, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200/80">
                  Important: You should provide only genuine, authentic, and accurate documents.
                </p>
              </div>

              {/* Subsection D */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold flex items-center justify-center">D</span>
                  <span>Communication Information</span>
                </h3>
                <p className="text-xs text-slate-600">If you contact us or use communication features, we may collect information relating to:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                  {['Customer-support requests', 'In-app messages & chats', 'Complaints', 'Reports submitted', 'Member feedback', 'Communications with our team'].map((sub, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subsection E */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold flex items-center justify-center">E</span>
                  <span>Payment Information</span>
                </h3>
                <p className="text-xs text-slate-600">
                  If you purchase a paid membership or service, payment information may be processed by our authorized payment service providers. WonderfulJodi may receive transaction metadata such as:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                  {['Transaction ID / Order ID', 'Payment status (Success/Failed)', 'Amount paid & Currency', 'Date/time of transaction', 'Payment method details', 'Gateway reference'].map((sub, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-medium">
                  We generally do not require or intend to store your complete debit/credit card number, CVV, or net banking credentials on our own systems. All sensitive payment transactions are encrypted and handled directly by PCI-DSS compliant payment gateways.
                </p>
              </div>

              {/* Subsection F */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-bold flex items-center justify-center">F</span>
                  <span>Technical Information</span>
                </h3>
                <p className="text-xs text-slate-600">When you use the website, certain technical information may be collected automatically, such as:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                  {['IP address', 'Browser type & version', 'Device model & manufacturer', 'Operating system', 'Login timestamps & activity', 'Pages visited & duration', 'Approximate technical location', 'Cookies & session identifiers'].map((sub, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 3. How We Use Your Information */}
            <section id="how-we-use-information" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">3.</span>
                <span>How We Use Your Information</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We may use your information to:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                {[
                  'Create and manage your account',
                  'Create and display your matrimonial profile',
                  'Provide matchmaking and discovery services',
                  'Suggest compatible potential matrimonial matches',
                  'Allow registered members to communicate',
                  'Provide dedicated customer support and grievance handling',
                  'Process memberships, subscriptions, and payments',
                  'Verify profiles, documents, and credentials where applicable',
                  'Prevent fraud, unauthorized logins, and misuse',
                  'Maintain rigorous website and platform security',
                  'Improve and optimize our website, algorithms, and services',
                  'Send important service-related communications & alerts',
                  'Respond to user complaints, inquiries, and requests',
                  'Comply with applicable legal and statutory requirements',
                  'Protect our users, community, and platform integrity',
                  'Perform other purposes reasonably necessary to provide services',
                ].map((purpose, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{purpose}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Profile Visibility */}
            <section id="profile-visibility" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">4.</span>
                <span>Profile Visibility</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi is a matrimonial platform, and some information you provide may be visible to other members depending on the features and privacy settings available on the platform.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                For example, information such as <strong>Name, Age, Photograph, Education, Profession, Location, Matrimonial preferences, and About-me bio</strong> may be displayed as part of your matrimonial profile.
              </p>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-[#E51F3E] shrink-0" />
                  <span>Important Privacy Advice Regarding Sensitive Data</span>
                </div>
                <p className="text-rose-950 leading-relaxed">
                  You should carefully consider the information you choose to publish. We strongly recommend that you <strong>do not publish or share sensitive information</strong> such as:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-medium text-rose-900 text-xs">
                  {['Passwords', 'One-Time Passwords (OTPs)', 'Bank account details', 'Credit / Debit card numbers', 'Government ID numbers (Aadhaar/PAN)', 'Complete residential address'].map((sens, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-lg border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      <span>{sens}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-rose-800 italic pt-1">
                  Unless specifically and securely required for an appropriate confidential verification process handled directly by our compliance team.
                </p>
              </div>
            </section>

            {/* 5. Information Shared With Other Members */}
            <section id="shared-with-members" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">5.</span>
                <span>Information Shared With Other Members</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi allows members to discover and communicate with potential matrimonial partners. When you use these features, information from your profile may become available to other members according to the functionality of the platform and your privacy settings.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                You understand that information voluntarily placed in your public or member-visible profile may be viewed by other registered users. <strong>Please do not upload or display information that you do not want other members to see.</strong>
              </p>
            </section>

            {/* 6. Information We Share With Third Parties */}
            <section id="shared-with-third-parties" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">6.</span>
                <span>Information We Share With Third Parties</span>
              </h2>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs sm:text-sm font-semibold text-emerald-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>We do not sell your personal information as a business practice.</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We may share information where reasonably necessary with:
              </p>

              {/* A. Service Providers */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900">A. Service Providers</h3>
                <p className="text-xs text-slate-600">We may use third-party providers for services such as:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 pt-1">
                  {[
                    'Website hosting',
                    'Cloud storage infrastructure',
                    'Payment processing gateways',
                    'Email delivery services',
                    'SMS / OTP delivery partners',
                    'WhatsApp / communication services',
                    'Customer support systems',
                    'Security & firewall defenses',
                    'Fraud prevention tools',
                    'Analytics & monitoring',
                    'Technical maintenance',
                  ].map((prov, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E51F3E]" />
                      <span>{prov}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  These providers may process information only as necessary to provide their services to us under confidentiality agreements.
                </p>
              </div>

              {/* B. Legal and Regulatory */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900">B. Legal and Regulatory Requirements</h3>
                <p className="text-xs text-slate-600">We may disclose information where reasonably necessary to:</p>
                <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                  <li>Comply with applicable statutory laws or judicial warrants</li>
                  <li>Respond to lawful government or law-enforcement requests</li>
                  <li>Participate in official legal proceedings or court orders</li>
                  <li>Prevent fraud, financial scams, or identity theft</li>
                  <li>Investigate misuse or breaches of our platform rules</li>
                  <li>Protect our rights, property, users, the general public, or platform safety</li>
                </ul>
              </div>

              {/* C. With Permission */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h3 className="font-bold text-sm text-slate-900">C. With Your Permission</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  We may share information for other purposes where you have specifically permitted, requested, or instructed us to do so.
                </p>
              </div>
            </section>

            {/* 7. Data Security */}
            <section id="data-security" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">7.</span>
                <span>Data Security</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We take reasonable technical and organizational measures to protect personal information against unauthorized access, misuse, loss, alteration or disclosure.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Depending on the nature of the information and our technical infrastructure, these measures may include:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700 pt-1">
                {[
                  'Access controls',
                  'Password hashing & protection',
                  'Secure authentication',
                  'Data encryption (in transit & at rest)',
                  'Server firewall security',
                  'Restricted administrative access',
                  'Continuous monitoring & audit logs',
                  'Backup & disaster recovery procedures',
                ].map((sec, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{sec}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 pt-1 leading-relaxed">
                However, no website, cloud server, or internet transmission can be guaranteed to be completely 100% secure. You are also responsible for protecting your account password and login credentials.
              </p>
            </section>

            {/* 8. Account Security */}
            <section id="account-security" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">8.</span>
                <span>Account Security</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                To keep your account and personal details secure, you should:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                {[
                  'Keep your password strictly confidential and complex',
                  'Avoid sharing OTPs with anyone, including individuals claiming to be staff',
                  'Never share your login credentials or email passcodes',
                  'Log out after every session on shared, public, or office devices',
                  'Immediately inform us if you suspect any unauthorized access or compromise',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <KeyRound className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 text-xs font-semibold text-rose-900">
                WonderfulJodi will not normally ask you to disclose your account password or OTP through unsolicited emails, phone calls, or chat messages.
              </div>
            </section>

            {/* 9. Cookies */}
            <section id="cookies" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">9.</span>
                <span>Cookies</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi may use cookies and similar browser storage technologies to:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                {[
                  'Keep users securely logged in',
                  'Remember user preferences & search filters',
                  'Improve overall website functionality',
                  'Understand website usage & traffic patterns',
                  'Improve platform speed and performance',
                  'Maintain session security & CSRF defense',
                  'Analyze site telemetry and errors',
                ].map((cook, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Cookie className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>{cook}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                You may be able to control or delete cookies through your browser settings. Please note that disabling certain essential cookies may affect some website features or authentication functionality.
              </p>
            </section>

            {/* 10. Data Retention */}
            <section id="data-retention" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">10.</span>
                <span>Data Retention</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including:
              </p>
              <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-700 space-y-1">
                <li>Providing matchmaking, profile display, and member communication services</li>
                <li>Maintaining member accounts and ongoing profiles</li>
                <li>Providing customer support and handling member queries</li>
                <li>Maintaining statutory transaction, billing, and GST compliance records</li>
                <li>Resolving disputes and enforcing platform terms</li>
                <li>Preventing recurring fraud, abuse, and safety violations</li>
                <li>Maintaining infrastructure security and audit integrity</li>
                <li>Complying with applicable legal and law enforcement obligations</li>
              </ul>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                When information is no longer reasonably required, we may delete, anonymize or securely dispose of it, subject to applicable law and legitimate retention requirements. Certain limited information may need to be retained after account closure for legal, security, fraud-prevention or dispute-resolution purposes.
              </p>
            </section>

            {/* 11. Account Deletion */}
            <section id="account-deletion" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">11.</span>
                <span>Account Deletion</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                You may request closure or deletion of your WonderfulJodi account through the available account settings in your profile dashboard or by contacting our support team directly.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Upon receiving a valid request, we will take reasonable steps to process the request in accordance with applicable law. Deletion may not immediately remove information that:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700 pt-1">
                {[
                  'Must be retained under applicable statutory laws or tax rules',
                  'Is required for pending or reasonably anticipated legal proceedings',
                  'Is necessary for fraud prevention, safety flags, or platform security',
                  'Is required to resolve an existing dispute or investigation',
                  'Has been legitimately aggregated or anonymized beyond personal identification',
                ].map((del, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Trash2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>{del}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 12. Children's Privacy */}
            <section id="children-privacy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">12.</span>
                <span>Children&apos;s Privacy</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi is intended exclusively for adults seeking lawful matrimonial relationships. We do not knowingly provide matrimonial services to or collect data from persons below the applicable legal age for marriage.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                If we become aware that an account has been created by a person who is not legally eligible to use the service, we may immediately suspend the account and take appropriate steps regarding the associated information.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                If you believe that a minor has provided information to WonderfulJodi, please contact us immediately at <strong>wonderfuljodi@gmail.com</strong> so we can take immediate corrective measures.
              </div>
            </section>

            {/* 13. Third-Party Services */}
            <section id="third-party-services" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">13.</span>
                <span>Third-Party Services</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi may use third-party services such as payment gateways, hosting providers, analytics services, email/SMS delivery providers, communication platforms, and authentication services.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                These third-party services may have their own independent privacy policies and terms. We encourage you to review the privacy policies of third-party services when applicable. WonderfulJodi is not responsible for the privacy practices or data handling of independent third-party websites or services that we do not own or control.
              </p>
            </section>

            {/* 14. Communication From WonderfulJodi */}
            <section id="communication-from-us" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">14.</span>
                <span>Communication From WonderfulJodi</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We may contact you via email, SMS, WhatsApp, or in-app notifications regarding:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                {[
                  'Account registration & welcome',
                  'OTP verification passcodes',
                  'Login & security alerts',
                  'Membership purchases & renewals',
                  'Payment invoices & confirmation',
                  'Account activity & match alerts',
                  'Important service updates',
                  'Customer-support matters',
                  'Policy & terms revisions',
                  'Security & safety notices',
                ].map((comm, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Bell className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                    <span>{comm}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                Where legally permitted and where you have provided appropriate consent, we may also send promotional or matchmaking recommendations. You may opt out of promotional communications at any time. However, essential transactional, service, and security notifications will continue to be sent as necessary to operate your account.
              </p>
            </section>

            {/* 15. Information You Provide About Other People */}
            <section id="info-about-others" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">15.</span>
                <span>Information You Provide About Other People</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                If you create, manage, or assist with a matrimonial profile on behalf of another person (such as your son, daughter, sibling, relative, or ward), you should do so <strong>only with their full knowledge, awareness, and lawful authorization</strong>.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                You should not provide another person&apos;s personal information, photographs, contact details, or identification documents without appropriate permission. WonderfulJodi may request confirmation of authorization where deemed necessary.
              </p>
            </section>

            {/* 16. Matrimonial Information */}
            <section id="matrimonial-information" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">16.</span>
                <span>Matrimonial Information</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Matrimonial profiles may contain personal information relating to family background, education, profession, lifestyle habits, partner preferences, location, and community attributes.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Members should understand that information provided voluntarily for matrimonial matchmaking purposes may be viewed by other registered members who meet search criteria. <strong>Please provide only information that you are comfortable sharing in a matrimonial context.</strong>
              </p>
            </section>

            {/* 17. Verification and Accuracy */}
            <section id="verification-accuracy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">17.</span>
                <span>Verification and Accuracy</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                WonderfulJodi offers profile and document verification features (such as ID checks, educational qualification review, and doctor credential badges).
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs sm:text-sm text-slate-700">
                <p className="font-bold text-slate-900">
                  However, verification is an administrative review process and should not be interpreted as an absolute guarantee that:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Every profile detail remains permanently accurate over time</li>
                  <li>The member is completely trustworthy or free of undisclosed history</li>
                  <li>The member will always behave honestly during offline interactions</li>
                  <li>A matrimonial alliance or marriage will be compatible or successful</li>
                </ul>
                <p className="text-xs font-semibold text-rose-900 pt-1">
                  Members and families must independently perform their own background verification, due diligence, and inquiries before making significant life decisions.
                </p>
              </div>
            </section>

            {/* 18. Your Privacy Choices and Rights */}
            <section id="privacy-choices-rights" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">18.</span>
                <span>Your Privacy Choices and Rights</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Subject to applicable personal data protection laws, you may have specific rights relating to your personal information, which may include:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700">
                {[
                  'Requesting access to personal information held about you',
                  'Requesting correction or updating of inaccurate details',
                  'Requesting erasure or deletion where legally applicable',
                  'Withdrawing consent where processing is based on consent',
                  'Requesting information about our data processing practices',
                  'Raising a formal grievance or complaint regarding privacy',
                ].map((right, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{right}</span>
                  </div>
                ))}
              </div>

              {/* Official Privacy Contact Card */}
              <div className="p-5 bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl border border-rose-200 space-y-3">
                <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E51F3E]" />
                  <span>How to Make a Privacy Request</span>
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  To exercise any of your privacy choices, submit a data access request, or report a concern, please contact our designated privacy team:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-900">
                  <a
                    href="mailto:wonderfuljodi@gmail.com"
                    className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-rose-200 hover:border-rose-400 hover:shadow-xs transition text-rose-900"
                  >
                    <Mail className="w-4 h-4 text-[#E51F3E]" />
                    <span>wonderfuljodi@gmail.com</span>
                  </a>
                  <a
                    href="https://wa.me/919730008748"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-rose-200 hover:border-rose-400 hover:shadow-xs transition text-rose-900"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>+91 9730008748 (Phone / WhatsApp)</span>
                  </a>
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  We may need to verify your identity before processing sensitive data requests to protect your account from unauthorized disclosure.
                </p>
              </div>
            </section>

            {/* 19. Withdrawal of Consent */}
            <section id="withdrawal-of-consent" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">19.</span>
                <span>Withdrawal of Consent</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Where processing of personal information is based on your consent, you may withdraw that consent at any time, subject to applicable legal and contractual restrictions.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Withdrawal of consent may affect our ability to continue providing certain services or matchmaking features. For example, if certain profile information is necessary to maintain an active matrimonial candidate profile, withdrawing permission to process that information may require us to restrict, deactivate, or close the relevant service.
              </p>
            </section>

            {/* 20. Data Breaches and Security Incidents */}
            <section id="data-breaches" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">20.</span>
                <span>Data Breaches and Security Incidents</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                If we become aware of a personal-data security incident that requires notification under applicable law, we will take timely and appropriate steps in accordance with statutory requirements.
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                This includes promptly investigating the incident, implementing comprehensive technical remedial measures, and providing required notifications to affected users and regulatory authorities.
              </p>
            </section>

            {/* 21. Changes to This Privacy Policy */}
            <section id="changes-to-policy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2.5">
                <span className="text-base text-[#E51F3E] font-sans font-bold">21.</span>
                <span>Changes to This Privacy Policy</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                {[
                  'Changes in our features or services',
                  'Technological advancements',
                  'Updates to data protection legislation',
                  'Enhancements to our privacy practices',
                ].map((chg, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <RefreshCw className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                    <span>{chg}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-2">
                The updated Policy will be published on WonderfulJodi.com with a revised &ldquo;Last Updated&rdquo; date. You are encouraged to review this Policy periodically to remain informed about how we protect your information.
              </p>
            </section>

            {/* Bottom Navigation Links */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <Link
                href="/terms-and-conditions"
                className="inline-flex items-center gap-1.5 font-bold text-[#E51F3E] hover:underline"
              >
                <span>View Terms & Conditions</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-slate-900 transition"
              >
                <span>Back to Top</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        </div>
      </div>

      {/* Floating Back-to-Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3.5 rounded-full bg-[#E51F3E] text-white shadow-xl hover:bg-[#c91834] transition-all transform hover:scale-110 z-40 cursor-pointer animate-fade-in"
          aria-label="Back to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </main>
  );
}
