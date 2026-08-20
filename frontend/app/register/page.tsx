'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { setAuthToken } from '../../lib/api';
import {
  ShieldCheck,
  Heart,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  User,
  Briefcase,
  GraduationCap,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Building2,
  Stethoscope,
} from 'lucide-react';

const DOCTOR_SPECIALIZATIONS = [
  'General Physician / Internal Medicine',
  'Cardiologist',
  'Dermatologist',
  'General & Laparoscopic Surgeon',
  'Pediatrician',
  'Orthopedic Surgeon',
  'Gynecologist & Obstetrician',
  'Neurologist / Neurosurgeon',
  'Ophthalmologist (Eye Surgeon)',
  'Radiologist',
  'Anesthesiologist',
  'Dentist / Orthodontist (MDS)',
  'Psychiatrist',
  'ENT Specialist',
  'Pathologist',
  'Other Medical Specialization',
];

const QUALIFICATIONS = [
  'MBBS',
  'MBBS, MD',
  'MBBS, MS',
  'MBBS, DNB',
  'MBBS, MD, DM',
  'MBBS, MS, MCh',
  'BDS',
  'BDS, MDS',
  'PhD (Medical / Healthcare)',
  'Other Healthcare Degree',
];

const CITIES = [
  'Mumbai',
  'Delhi NCR',
  'New Delhi',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Jaipur',
  'Kolkata',
  'Ahmedabad',
  'Chandigarh',
  'Lucknow',
  'Other City',
];

export default function RegisterPage() {
  const router = useRouter();

  // Multi-step State (1: Account, 2: Professional, 3: Preferences, 4: Success)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Account
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Step 2: Professional
  const [isDoctor, setIsDoctor] = useState('Doctor');
  const [specialization, setSpecialization] = useState(DOCTOR_SPECIALIZATIONS[0]);
  const [qualification, setQualification] = useState(QUALIFICATIONS[1]);
  const [experience, setExperience] = useState('0–5 years');
  const [city, setCity] = useState(CITIES[0]);
  const [workLocation, setWorkLocation] = useState('');

  // Step 3: Preferences
  const [lookingFor, setLookingFor] = useState('Female');
  const [prefAgeMin, setPrefAgeMin] = useState('23');
  const [prefAgeMax, setPrefAgeMax] = useState('32');
  const [prefSpecialization, setPrefSpecialization] = useState('Any');
  const [prefCity, setPrefCity] = useState('All');
  const [prefDiet, setPrefDiet] = useState('Any');

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 3 || score === 4) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  }, [password]);

  // Realtime validation helpers
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validateMobile = (val: string) => /^[6-9]\d{9}$/.test(val.replace(/\D/g, ''));

  // Step 1 Validation & API Account Creation
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errors: Record<string, string> = {};

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      errors.fullName = 'Please enter your full name (minimum 2 characters).';
    } else if (/^\d+$/.test(cleanName)) {
      errors.fullName = 'Name cannot contain only numbers.';
    }

    if (!email) {
      errors.email = 'Email address is required.';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      errors.mobile = 'Mobile number is required.';
    } else if (!validateMobile(cleanMobile)) {
      errors.mobile = 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210).';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter and one number.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      errors.agreeTerms = 'Please agree to the Terms of Service & Privacy Policy to continue.';
    }

    setStep1Errors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    // Call registration API
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        fullName: cleanName,
        email: email.trim().toLowerCase(),
        mobile: cleanMobile,
        password,
      });

      if (response.data?.data?.token) {
        setAuthToken(response.data.data.token);
      }

      // Smoothly advance to Step 2
      setStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('already registered')) {
        setGlobalError('This email address or mobile number is already registered. Please sign in instead.');
      } else {
        setGlobalError('Registration could not be completed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Proceed
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  // Step 3 Finish & Transition to Success State
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create initial profile if API is available
      await api.post('/profiles', {
        displayName: fullName.trim(),
        gender: lookingFor === 'Female' ? 'Male' : 'Female',
        dob: '1995-01-01',
        height: `5' 8"`,
        maritalStatus: 'Never Married',
        motherTongue: 'Hindi',
        religion: 'Hindu',
        caste: 'General',
        education: 'Doctorate / Medical',
        degree: `${qualification} in ${specialization}`,
        profession: specialization,
        company: workLocation || 'Private Practice',
        workLocation: city,
        country: 'India',
        state: 'Maharashtra',
        city: city,
        about: `Dedicated ${specialization} with ${experience} of clinical experience.`,
      }).catch(() => {
        // Backend profile creation is optional at step 3 if full fields are completed later
      });
    } catch (err) {
      // Non-blocking
    } finally {
      setLoading(false);
      setStep(4);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 sm:py-14 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Terms & Privacy Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-rose-100 animate-fade-in">
            <h3 className="font-serif text-2xl font-bold text-[#101728]">
              Terms of Service & Privacy Policy
            </h3>
            <div className="text-xs text-slate-600 space-y-2.5 max-h-[320px] overflow-y-auto pr-2 leading-relaxed">
              <p>
                <strong>1. Confidentiality & Verification:</strong> Wonderful Jodi is an exclusive matrimonial platform designed for educated doctors and respected families. We uphold strict privacy controls.
              </p>
              <p>
                <strong>2. Protected Contact Data:</strong> Your phone number and email are never publicly exposed on profile cards without your explicit consent.
              </p>
              <p>
                <strong>3. Authentic Credentials:</strong> All registered members agree to provide accurate medical qualifications and genuine matrimonial intent.
              </p>
            </div>
            <button
              onClick={() => setTermsModalOpen(false)}
              className="w-full h-11 rounded-xl bg-[#E9232E] text-white font-bold text-sm hover:bg-[#d11735] transition"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* Main Split-Screen Container */}
      <div className="max-w-[1120px] w-full bg-white rounded-[28px] border border-[#F5D9DD] shadow-[0_20px_50px_rgba(16,23,40,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* ── LEFT PANEL (48% on Desktop) ── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#101728] via-[#161f36] to-[#0d1322] text-white p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle burgundy glow accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E9232E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E9232E]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand & Message */}
          <div className="relative z-10 space-y-6">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E9232E] to-[#EF1D4D] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-red-500/30 group-hover:scale-105 transition">
                ❤️
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-white">
                Wonderful Jodi
              </span>
            </Link>

            <div className="space-y-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold text-rose-200">
                <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
                Doctor Matrimonial Onboarding
              </span>

              <h2 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-bold text-white leading-tight">
                Create Your Free Doctor Matrimonial Profile
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Connect with verified doctors and medical professionals who are looking for a meaningful, compatible life partner.
              </p>
            </div>
          </div>

          {/* Bottom Trust Points */}
          <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/90 space-y-3 text-xs text-slate-200 font-medium">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E9232E] shrink-0" />
              <span>100% Free Initial Registration</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E9232E] shrink-0" />
              <span>Verified Doctor & Healthcare Profiles</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E9232E] shrink-0" />
              <span>Confidential & Privacy Protected</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (52% on Desktop) ── */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-11 flex flex-col justify-center bg-white">
          {/* Top Form Header */}
          <div className="mb-6 space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
              {step === 1 && 'Register Free'}
              {step === 2 && 'Professional Details'}
              {step === 3 && 'Match Preferences'}
              {step === 4 && 'Registration Complete!'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {step === 1 && 'Create your free profile to start your doctor matchmaking journey.'}
              {step === 2 && 'Help us match you with compatible doctors based on your career.'}
              {step === 3 && 'Specify who you are looking to connect with.'}
              {step === 4 && 'Your account is active and ready.'}
            </p>
          </div>

          {/* Progress Indicator (Steps 1 to 3) */}
          {step < 4 && (
            <div className="mb-7 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                <span className="text-[#E9232E]">Step {step} of 3</span>
                <span className="text-slate-400">
                  {step === 1 && 'Account'}
                  {step === 2 && 'Professional'}
                  {step === 3 && 'Preferences'}
                </span>
              </div>

              {/* Step Progress Bar */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step >= 1 ? 'bg-[#E9232E]' : 'bg-slate-100'
                  }`}
                />
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step >= 2 ? 'bg-[#E9232E]' : 'bg-slate-100'
                  }`}
                />
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step >= 3 ? 'bg-[#E9232E]' : 'bg-slate-100'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {globalError && (
            <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[#E9232E] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Registration Notice</p>
                <p className="mt-0.5">{globalError}</p>
                {globalError.includes('already registered') && (
                  <Link href="/login" className="font-bold underline text-[#E9232E] mt-1 inline-block">
                    Click here to Sign In →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 1: ACCOUNT FORM ── */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (step1Errors.fullName) setStep1Errors({ ...step1Errors, fullName: '' });
                    }}
                    placeholder="e.g. Dr. Ananya Sharma"
                    className={`w-full h-[54px] rounded-[14px] border ${
                      step1Errors.fullName ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                    } px-4 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/10 transition`}
                  />
                </div>
                {step1Errors.fullName && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.fullName}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (step1Errors.email) setStep1Errors({ ...step1Errors, email: '' });
                  }}
                  placeholder="you@example.com"
                  className={`w-full h-[54px] rounded-[14px] border ${
                    step1Errors.email ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                  } px-4 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/10 transition`}
                />
                {step1Errors.email && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.email}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Mobile Number *
                </label>
                <div className="flex items-center rounded-[14px] border border-[#DCE3EC] bg-white overflow-hidden focus-within:border-[#E9232E] focus-within:ring-2 focus-within:ring-[#E9232E]/10 transition">
                  <span className="px-3.5 py-3 text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      if (step1Errors.mobile) setStep1Errors({ ...step1Errors, mobile: '' });
                    }}
                    placeholder="9876543210"
                    className="w-full h-[52px] px-3.5 text-sm text-[#101728] placeholder-slate-400 focus:outline-none bg-transparent"
                  />
                </div>
                {step1Errors.mobile && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.mobile}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Password *</label>
                  {password && (
                    <span className="text-[11px] font-bold text-slate-500">
                      Strength: <span className="text-slate-800">{passwordStrength.label}</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (step1Errors.password) setStep1Errors({ ...step1Errors, password: '' });
                    }}
                    placeholder="Minimum 8 characters (e.g. Pass@123)"
                    className={`w-full h-[54px] rounded-[14px] border ${
                      step1Errors.password ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                    } pl-4 pr-11 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/10 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator Bar */}
                {password && (
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-100'
                      }`}
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-100'
                      }`}
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-100'
                      }`}
                    />
                  </div>
                )}
                {step1Errors.password && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (step1Errors.confirmPassword)
                        setStep1Errors({ ...step1Errors, confirmPassword: '' });
                    }}
                    placeholder="Re-enter your password"
                    className={`w-full h-[54px] rounded-[14px] border ${
                      step1Errors.confirmPassword
                        ? 'border-rose-500 bg-rose-50/20'
                        : confirmPassword && password === confirmPassword
                        ? 'border-emerald-400 bg-emerald-50/10'
                        : 'border-[#DCE3EC] bg-white'
                    } pl-4 pr-11 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/10 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Passwords match
                  </p>
                )}
                {step1Errors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms & Privacy Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      if (step1Errors.agreeTerms) setStep1Errors({ ...step1Errors, agreeTerms: '' });
                    }}
                    className="mt-0.5 rounded border-slate-300 text-[#E9232E] focus:ring-[#E9232E]"
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setTermsModalOpen(true)}
                      className="font-bold text-[#E9232E] hover:underline"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => setTermsModalOpen(true)}
                      className="font-bold text-[#E9232E] hover:underline"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
                {step1Errors.agreeTerms && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.agreeTerms}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[54px] rounded-[14px] bg-[#E9232E] hover:bg-[#d11735] text-white font-bold text-base shadow-md shadow-red-500/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue →</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: PROFESSIONAL PROFILE ── */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              {/* Profile Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Are you a Doctor / Healthcare Professional? *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Doctor', 'Medical Professional'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIsDoctor(type)}
                      className={`h-[48px] rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        isDoctor === type
                          ? 'border-[#E9232E] bg-rose-50/60 text-[#E9232E]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialization */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Medical Specialization *
                </label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full h-[54px] rounded-[14px] border border-[#DCE3EC] bg-white px-4 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                >
                  {DOCTOR_SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medical Degree / Qualification */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Medical Qualification / Degree *
                </label>
                <select
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full h-[54px] rounded-[14px] border border-[#DCE3EC] bg-white px-4 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                >
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Experience & Practice City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Experience Level
                  </label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full h-[54px] rounded-[14px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                  >
                    <option value="0–5 years">0–5 years</option>
                    <option value="5–10 years">5–10 years</option>
                    <option value="10–15 years">10–15 years</option>
                    <option value="15+ years">15+ years</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Practice City *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-[54px] rounded-[14px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hospital / Clinic */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Current Hospital / Clinic / Practice
                </label>
                <input
                  type="text"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="e.g. Apollo Hospitals / Private Clinic"
                  className="w-full h-[54px] rounded-[14px] border border-[#DCE3EC] bg-white px-4 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E9232E]"
                />
              </div>

              {/* Doctor Verification Notice */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#0BAA70] shrink-0 mt-0.5" />
                <p>
                  <strong>Doctor Verification:</strong> Your professional credentials will be verified by our team to maintain an authentic, premium medical matrimonial network.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 h-[54px] rounded-[14px] border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 h-[54px] rounded-[14px] bg-[#E9232E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition"
                >
                  Continue to Preferences →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: MATCH PREFERENCES ── */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-4">
              {/* Looking For */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Looking For Partner *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLookingFor('Female')}
                    className={`h-[48px] rounded-xl text-xs font-bold border transition ${
                      lookingFor === 'Female'
                        ? 'border-[#E9232E] bg-rose-50/60 text-[#E9232E]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Bride (Female Doctor)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookingFor('Male')}
                    className={`h-[48px] rounded-xl text-xs font-bold border transition ${
                      lookingFor === 'Male'
                        ? 'border-[#E9232E] bg-rose-50/60 text-[#E9232E]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Groom (Male Doctor)
                  </button>
                </div>
              </div>

              {/* Age Range */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Preferred Age Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={prefAgeMin}
                    onChange={(e) => setPrefAgeMin(e.target.value)}
                    className="h-[52px] rounded-[14px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                  >
                    {[21, 23, 25, 27, 29, 31, 33, 35].map((a) => (
                      <option key={a} value={a}>
                        Min {a} Yrs
                      </option>
                    ))}
                  </select>
                  <select
                    value={prefAgeMax}
                    onChange={(e) => setPrefAgeMax(e.target.value)}
                    className="h-[52px] rounded-[14px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                  >
                    {[26, 28, 30, 32, 35, 38, 42, 45, 50].map((a) => (
                      <option key={a} value={a}>
                        Max {a} Yrs
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Specialization */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Preferred Specialization
                </label>
                <select
                  value={prefSpecialization}
                  onChange={(e) => setPrefSpecialization(e.target.value)}
                  className="w-full h-[52px] rounded-[14px] border border-[#DCE3EC] bg-white px-4 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                >
                  <option value="Any">Any Specialization</option>
                  {DOCTOR_SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Diet Preference */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Diet Preference
                </label>
                <select
                  value={prefDiet}
                  onChange={(e) => setPrefDiet(e.target.value)}
                  className="w-full h-[52px] rounded-[14px] border border-[#DCE3EC] bg-white px-4 text-sm text-[#101728] focus:outline-none focus:border-[#E9232E]"
                >
                  <option value="Any">Any Diet Preference</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 h-[54px] rounded-[14px] border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 h-[54px] rounded-[14px] bg-[#E9232E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? 'Finalizing Profile...' : 'Complete Registration →'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 4: SUCCESS STATE ── */}
          {step === 4 && (
            <div className="text-center py-6 space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-[#E9232E] flex items-center justify-center text-3xl mx-auto shadow-sm">
                ❤️
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
                  Welcome to Wonderful Jodi ❤️
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your doctor matrimonial account has been created successfully! You can now browse verified candidates.
                </p>
              </div>

              {/* Profile Completion Indicator */}
              <div className="max-w-sm mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Profile Completion</span>
                  <span className="text-[#E9232E]">35%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="w-[35%] h-full bg-[#E9232E] rounded-full" />
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Add your photos and family background anytime to receive 5x more match responses.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/search"
                  className="w-full sm:w-auto h-[52px] px-8 rounded-full bg-[#E9232E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 transition"
                >
                  <span>Browse Doctor Matches →</span>
                </Link>
                <Link
                  href="/membership"
                  className="w-full sm:w-auto h-[52px] px-6 rounded-full border border-slate-300 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50 inline-flex items-center justify-center transition"
                >
                  <span>Explore Membership</span>
                </Link>
              </div>
            </div>
          )}

          {/* Already registered link (Only visible in Steps 1-3) */}
          {step < 4 && (
            <div className="mt-7 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-[#E9232E] hover:underline">
                Sign In Here
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
