'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Heart,
  Scale,
  ShieldCheck,
  RotateCcw,
  Bookmark,
  Share2,
  Printer,
  ChevronRight,
  User,
  Info,
  Check,
  Star,
  Activity,
  MessageCircle,
  Users,
} from 'lucide-react';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import {
  calculatePublicKundaliMatch,
  saveKundaliMatch,
  getMyBirthDetails,
  StructuredBirthPlace,
  PublicKundaliMatchResult,
} from '../../services/kundaliApi';

export default function FreeKundaliMatchPage() {
  // Step state: 1 = Person 1, 2 = Person 2, 3 = Compatibility Report
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Authentication check (optional - only used for "Prefill My Profile" and "Save Match")
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedUserBirthDetails, setSavedUserBirthDetails] = useState<any>(null);

  // Person 1 State
  const [person1, setPerson1] = useState<{
    name: string;
    gender: 'Male' | 'Female';
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace | null;
  }>({
    name: '',
    gender: 'Male',
    dateOfBirth: '',
    timeOfBirth: '06:00',
    birthPlace: {
      name: 'Pune, Maharashtra, India',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      latitude: 18.5204,
      longitude: 73.8567,
      timezone: 'Asia/Kolkata',
    },
  });

  // Person 2 State
  const [person2, setPerson2] = useState<{
    name: string;
    gender: 'Male' | 'Female';
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace | null;
  }>({
    name: '',
    gender: 'Female',
    dateOfBirth: '',
    timeOfBirth: '12:00',
    birthPlace: {
      name: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      district: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
    },
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculation & Save state
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<PublicKundaliMatchResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Check login status on mount (silent, optional)
  useEffect(() => {
    async function checkAuth() {
      try {
        const u = await getMyBirthDetails();
        if (u) {
          setIsLoggedIn(true);
          setSavedUserBirthDetails(u);
        }
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  // Handler to prefill Person 1 from authenticated user's profile
  const handlePrefillMyDetails = () => {
    if (!savedUserBirthDetails) return;
    setPerson1({
      name: savedUserBirthDetails.displayName || '',
      gender: savedUserBirthDetails.gender === 'Female' ? 'Female' : 'Male',
      dateOfBirth: savedUserBirthDetails.dob
        ? new Date(savedUserBirthDetails.dob).toISOString().split('T')[0]
        : '',
      timeOfBirth: savedUserBirthDetails.timeOfBirth || '06:00',
      birthPlace: {
        name: savedUserBirthDetails.placeOfBirth || 'Pune, Maharashtra, India',
        city: savedUserBirthDetails.resolvedLocation?.city || 'Pune',
        state: savedUserBirthDetails.resolvedLocation?.state || 'Maharashtra',
        country: savedUserBirthDetails.resolvedLocation?.country || 'India',
        latitude: savedUserBirthDetails.resolvedLocation?.latitude || 18.5204,
        longitude: savedUserBirthDetails.resolvedLocation?.longitude || 73.8567,
        timezone: 'Asia/Kolkata',
      },
    });

    // Automatically set Person 2 gender opposite
    setPerson2((prev) => ({
      ...prev,
      gender: savedUserBirthDetails.gender === 'Female' ? 'Male' : 'Female',
    }));
  };

  // Validate Step 1
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!person1.dateOfBirth) {
      newErrors.p1_dob = 'Date of birth is required.';
    }
    if (!person1.timeOfBirth) {
      newErrors.p1_time = 'Time of birth is required.';
    }
    if (!person1.birthPlace || !person1.birthPlace.name.trim()) {
      newErrors.p1_place = 'Birth place location is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate Step 2
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!person2.dateOfBirth) {
      newErrors.p2_dob = 'Date of birth is required.';
    }
    if (!person2.timeOfBirth) {
      newErrors.p2_time = 'Time of birth is required.';
    }
    if (!person2.birthPlace || !person2.birthPlace.name.trim()) {
      newErrors.p2_place = 'Birth place location is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      // Set Person 2 gender opposite of Person 1 by default
      setPerson2((prev) => ({
        ...prev,
        gender: person1.gender === 'Male' ? 'Female' : 'Male',
      }));
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCalculateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setCalculationError(null);
    setIsCalculating(true);

    try {
      const payload = {
        person1: {
          name: person1.name.trim() || 'Person 1',
          gender: person1.gender,
          dateOfBirth: person1.dateOfBirth,
          timeOfBirth: person1.timeOfBirth,
          birthPlace: person1.birthPlace!,
        },
        person2: {
          name: person2.name.trim() || 'Person 2',
          gender: person2.gender,
          dateOfBirth: person2.dateOfBirth,
          timeOfBirth: person2.timeOfBirth,
          birthPlace: person2.birthPlace!,
        },
      };

      const result = await calculatePublicKundaliMatch(payload);
      setReportResult(result);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error calculating Kundali match:', err);
      setCalculationError(
        err.response?.data?.message ||
          'Unable to calculate Kundali match at this moment. Please verify birth details and try again.'
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveMatch = async () => {
    if (!reportResult) return;
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      await saveKundaliMatch(reportResult);
      setSaveSuccessMessage('Kundali Match saved successfully to your profile!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to save Kundali match. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for Circular Score SVG
  const getScoreColor = (score: number) => {
    if (score >= 28) return '#10B981'; // Emerald
    if (score >= 24) return '#D97706'; // Amber
    if (score >= 18) return '#2563EB'; // Blue
    return '#E11D48'; // Rose
  };

  return (
    <main className="min-h-screen bg-[#FAF7F4] text-[#0F172A] pb-16 text-left">
      {/* ── Page Header / Hero Banner ── */}
      <header className="bg-gradient-to-b from-[#6B0D1E] via-[#85132A] to-[#9C1830] text-white py-6 sm:py-8 px-4 sm:px-6 lg:px-8 border-b border-rose-900/40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-3 sm:space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Link
              href="/astrology"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-100 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Astrology Hub</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-xs font-bold text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>100% Free • No Registration Required</span>
            </div>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
            Free Kundali Match
          </h1>

          <p className="text-xs sm:text-sm text-rose-100/90 max-w-2xl mx-auto leading-relaxed">
            Compare two birth charts using the traditional Vedic Ashtakoota 36 Guna Milan compatibility system.
          </p>

          {/* ── Multi-Step Indicator ── */}
          <div className="pt-3 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-200">
              <div
                className={`flex items-center gap-2 cursor-pointer transition ${
                  currentStep >= 1 ? 'text-white font-bold' : 'opacity-60'
                }`}
                onClick={() => currentStep > 1 && setCurrentStep(1)}
              >
                <span
                  className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-xs ${
                    currentStep > 1
                      ? 'bg-emerald-500 text-white'
                      : currentStep === 1
                      ? 'bg-white text-[#85132A]'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3 h-3" /> : '1'}
                </span>
                <span>Person 1</span>
              </div>

              <div className="flex-1 h-0.5 mx-3 bg-white/20">
                <div
                  className={`h-full bg-white transition-all duration-300 ${
                    currentStep === 1 ? 'w-0' : currentStep === 2 ? 'w-1/2' : 'w-full'
                  }`}
                />
              </div>

              <div
                className={`flex items-center gap-2 cursor-pointer transition ${
                  currentStep >= 2 ? 'text-white font-bold' : 'opacity-60'
                }`}
                onClick={() => {
                  if (currentStep === 3) setCurrentStep(2);
                }}
              >
                <span
                  className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-xs ${
                    currentStep > 2
                      ? 'bg-emerald-500 text-white'
                      : currentStep === 2
                      ? 'bg-white text-[#85132A]'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3 h-3" /> : '2'}
                </span>
                <span>Person 2</span>
              </div>

              <div className="flex-1 h-0.5 mx-3 bg-white/20">
                <div
                  className={`h-full bg-white transition-all duration-300 ${
                    currentStep === 3 ? 'w-full' : 'w-0'
                  }`}
                />
              </div>

              <div
                className={`flex items-center gap-2 transition ${
                  currentStep === 3 ? 'text-white font-bold' : 'opacity-60'
                }`}
              >
                <span
                  className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 3 ? 'bg-white text-[#85132A]' : 'bg-white/20 text-white'
                  }`}
                >
                  3
                </span>
                <span>Report</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {calculationError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Calculation Failed</p>
              <p className="text-rose-700 mt-0.5">{calculationError}</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: PERSON ONE DETAILS                                   */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-5 sm:p-8 border border-[#E8E1DB] shadow-2xs space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
                  <User className="w-6 h-6 text-[#85132A]" />
                  <span>Person 1 Birth Details</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter primary birth details to calculate accurate Vedic planetary and lunar alignments.
                </p>
              </div>

              {isLoggedIn && savedUserBirthDetails && (
                <button
                  type="button"
                  onClick={handlePrefillMyDetails}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#85132A] text-xs font-bold border border-rose-200 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use My Saved Details</span>
                </button>
              )}
            </div>

            <form onSubmit={handleStep1Continue} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="p1_name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    id="p1_name"
                    type="text"
                    value={person1.name}
                    onChange={(e) => setPerson1({ ...person1, name: e.target.value })}
                    placeholder="e.g. Dr. Priya Sharma"
                    className="w-full px-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#85132A] focus:outline-none focus:ring-2 focus:ring-[#85132A]/20 transition shadow-xs text-[#0F172A]"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Gender <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPerson1({ ...person1, gender: 'Male' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        person1.gender === 'Male'
                          ? 'bg-[#85132A] text-white border-[#85132A] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerson1({ ...person1, gender: 'Female' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        person1.gender === 'Female'
                          ? 'bg-[#85132A] text-white border-[#85132A] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Female</span>
                    </button>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label htmlFor="p1_dob" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Date of Birth <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="p1_dob"
                      type="date"
                      value={person1.dateOfBirth}
                      onChange={(e) => {
                        setPerson1({ ...person1, dateOfBirth: e.target.value });
                        if (errors.p1_dob) setErrors({ ...errors, p1_dob: '' });
                      }}
                      className={`w-full px-4 py-2.5 text-sm bg-white rounded-xl border transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#85132A]/20 ${
                        errors.p1_dob ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#85132A]'
                      } text-[#0F172A]`}
                      required
                    />
                  </div>
                  {errors.p1_dob && <p className="text-xs text-rose-600 font-medium">{errors.p1_dob}</p>}
                </div>

                {/* Time of Birth */}
                <div className="space-y-1.5">
                  <label htmlFor="p1_time" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Time of Birth <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="p1_time"
                      type="time"
                      value={person1.timeOfBirth}
                      onChange={(e) => {
                        setPerson1({ ...person1, timeOfBirth: e.target.value });
                        if (errors.p1_time) setErrors({ ...errors, p1_time: '' });
                      }}
                      className={`w-full px-4 py-2.5 text-sm bg-white rounded-xl border transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#85132A]/20 ${
                        errors.p1_time ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#85132A]'
                      } text-[#0F172A]`}
                      required
                    />
                  </div>
                  {errors.p1_time && <p className="text-xs text-rose-600 font-medium">{errors.p1_time}</p>}
                </div>
              </div>

              {/* Birth Place Searchable Autocomplete */}
              <div className="pt-2">
                <LocationAutocomplete
                  id="p1_location"
                  label="Birth Place (Village, Taluka, City, or District)"
                  placeholder="Type to search village, taluka, city or district..."
                  value={person1.birthPlace}
                  onChange={(loc) => {
                    setPerson1({ ...person1, birthPlace: loc });
                    if (errors.p1_place) setErrors({ ...errors, p1_place: '' });
                  }}
                  required
                  error={errors.p1_place}
                />
                {person1.birthPlace?.name && (
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Selected Location:</span>
                    <span>{person1.birthPlace.name}</span>
                    <span className="text-slate-400">
                      ({person1.birthPlace.latitude?.toFixed(2)}° N, {person1.birthPlace.longitude?.toFixed(2)}° E)
                    </span>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#E51F3E] hover:bg-[#c91834] text-white text-sm font-bold transition shadow-md shadow-red-950/20"
                >
                  <span>Continue to Person 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: PERSON TWO DETAILS                                   */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-5 sm:p-8 border border-[#E8E1DB] shadow-2xs space-y-6 animate-fadeIn">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="font-serif text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
                <User className="w-6 h-6 text-[#85132A]" />
                <span>Person 2 Birth Details</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter the prospective partner birth details for accurate 36 Guna Ashtakoota compatibility analysis.
              </p>
            </div>

            <form onSubmit={handleCalculateMatch} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="p2_name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    id="p2_name"
                    type="text"
                    value={person2.name}
                    onChange={(e) => setPerson2({ ...person2, name: e.target.value })}
                    placeholder="e.g. Dr. Rohan Mehta"
                    className="w-full px-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#85132A] focus:outline-none focus:ring-2 focus:ring-[#85132A]/20 transition shadow-xs text-[#0F172A]"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Gender <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPerson2({ ...person2, gender: 'Male' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        person2.gender === 'Male'
                          ? 'bg-[#85132A] text-white border-[#85132A] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPerson2({ ...person2, gender: 'Female' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                        person2.gender === 'Female'
                          ? 'bg-[#85132A] text-white border-[#85132A] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Female</span>
                    </button>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label htmlFor="p2_dob" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Date of Birth <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="p2_dob"
                      type="date"
                      value={person2.dateOfBirth}
                      onChange={(e) => {
                        setPerson2({ ...person2, dateOfBirth: e.target.value });
                        if (errors.p2_dob) setErrors({ ...errors, p2_dob: '' });
                      }}
                      className={`w-full px-4 py-2.5 text-sm bg-white rounded-xl border transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#85132A]/20 ${
                        errors.p2_dob ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#85132A]'
                      } text-[#0F172A]`}
                      required
                    />
                  </div>
                  {errors.p2_dob && <p className="text-xs text-rose-600 font-medium">{errors.p2_dob}</p>}
                </div>

                {/* Time of Birth */}
                <div className="space-y-1.5">
                  <label htmlFor="p2_time" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Time of Birth <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="p2_time"
                      type="time"
                      value={person2.timeOfBirth}
                      onChange={(e) => {
                        setPerson2({ ...person2, timeOfBirth: e.target.value });
                        if (errors.p2_time) setErrors({ ...errors, p2_time: '' });
                      }}
                      className={`w-full px-4 py-2.5 text-sm bg-white rounded-xl border transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#85132A]/20 ${
                        errors.p2_time ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#85132A]'
                      } text-[#0F172A]`}
                      required
                    />
                  </div>
                  {errors.p2_time && <p className="text-xs text-rose-600 font-medium">{errors.p2_time}</p>}
                </div>
              </div>

              {/* Birth Place Searchable Autocomplete */}
              <div className="pt-2">
                <LocationAutocomplete
                  id="p2_location"
                  label="Birth Place (Village, Taluka, City, or District)"
                  placeholder="Type to search village, taluka, city or district..."
                  value={person2.birthPlace}
                  onChange={(loc) => {
                    setPerson2({ ...person2, birthPlace: loc });
                    if (errors.p2_place) setErrors({ ...errors, p2_place: '' });
                  }}
                  required
                  error={errors.p2_place}
                />
                {person2.birthPlace?.name && (
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Selected Location:</span>
                    <span>{person2.birthPlace.name}</span>
                    <span className="text-slate-400">
                      ({person2.birthPlace.latitude?.toFixed(2)}° N, {person2.birthPlace.longitude?.toFixed(2)}° E)
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="submit"
                  disabled={isCalculating}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#E51F3E] hover:bg-[#c91834] text-white text-sm font-bold transition shadow-md shadow-red-950/20 disabled:opacity-50"
                >
                  {isCalculating ? (
                    <>
                      <Compass className="w-4 h-4 animate-spin" />
                      <span>Calculating Compatibility...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Check Free Kundali Match</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: RESULT REPORT                                        */}
        {/* ============================================================ */}
        {currentStep === 3 && reportResult && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Top Overview Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-8 border border-[#E8E1DB] shadow-2xs space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#85132A] text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Vedic Ashtakoota Analysis
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F172A]">
                    Kundali Compatibility Report
                  </h2>
                  <p className="text-sm font-semibold text-slate-600 mt-1">
                    {reportResult.person1.name} ↔ {reportResult.person2.name}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recalculate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Circular Score Indicator & Summary Hero */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                {/* Score Dial */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                      {/* Background circle */}
                      <circle
                        cx="80"
                        cy="80"
                        r="68"
                        stroke="#F1F5F9"
                        strokeWidth="14"
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="80"
                        cy="80"
                        r="68"
                        stroke={getScoreColor(reportResult.gunaScore)}
                        strokeWidth="14"
                        strokeDasharray={2 * Math.PI * 68}
                        strokeDashoffset={
                          2 * Math.PI * 68 * (1 - reportResult.gunaScore / 36.0)
                        }
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>

                    {/* Centered Score Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-serif text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
                        {reportResult.gunaScore}
                        <span className="text-xl text-slate-400 font-normal"> / 36</span>
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                        Gunas Matched
                      </span>
                      <span
                        className="text-xs font-extrabold px-2 py-0.5 rounded-full mt-1.5"
                        style={{
                          backgroundColor: `${getScoreColor(reportResult.gunaScore)}15`,
                          color: getScoreColor(reportResult.gunaScore),
                        }}
                      >
                        {reportResult.percentage}% Compatibility
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <span
                      className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-xs"
                      style={{
                        backgroundColor: `${getScoreColor(reportResult.gunaScore)}20`,
                        color: getScoreColor(reportResult.gunaScore),
                      }}
                    >
                      {reportResult.compatibilityBand}
                    </span>
                  </div>
                </div>

                {/* Summary & Person Details Snapshot */}
                <div className="md:col-span-7 space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-amber-200/80">
                    <h3 className="font-bold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D99A28]" />
                      <span>Vedic Astro Compatibility Summary</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                      {reportResult.summary}
                    </p>
                  </div>

                  {/* Profile Planetary Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Person 1 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <div className="font-bold text-[#85132A] flex items-center justify-between">
                        <span>{reportResult.person1.name}</span>
                        <span className="text-[10px] uppercase font-semibold text-slate-500">
                          {reportResult.person1.gender}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Rashi:</span>{' '}
                        <span className="font-semibold text-slate-800">{reportResult.person1.rashi}</span>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Nakshatra:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {reportResult.person1.nakshatra} (Pada {reportResult.person1.pada})
                        </span>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Manglik:</span>{' '}
                        <span className="font-semibold text-slate-800">{reportResult.person1.manglikStatus}</span>
                      </div>
                    </div>

                    {/* Person 2 */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                      <div className="font-bold text-[#85132A] flex items-center justify-between">
                        <span>{reportResult.person2.name}</span>
                        <span className="text-[10px] uppercase font-semibold text-slate-500">
                          {reportResult.person2.gender}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Rashi:</span>{' '}
                        <span className="font-semibold text-slate-800">{reportResult.person2.rashi}</span>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Nakshatra:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {reportResult.person2.nakshatra} (Pada {reportResult.person2.pada})
                        </span>
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Manglik:</span>{' '}
                        <span className="font-semibold text-slate-800">{reportResult.person2.manglikStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* ASHTAKOOTA BREAKDOWN (8 KOOTAS)                              */}
            {/* ============================================================ */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-serif text-xl font-bold text-[#0F172A] flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#85132A]" />
                  <span>Ashtakoota 8-Koota Breakdown</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Detailed distribution of obtained points across each of the traditional 8 astrological kootas.
                </p>
              </div>

              {/* Table of 8 Kootas */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] sm:text-xs">
                      <th className="py-3 px-3">Koota</th>
                      <th className="py-3 px-3 text-center">Max Points</th>
                      <th className="py-3 px-3 text-center">Obtained Points</th>
                      <th className="py-3 px-3 text-center">Compatibility Status</th>
                      <th className="py-3 px-3 hidden sm:table-cell">Significance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[
                      { key: 'varna', item: reportResult.ashtakoota.varna },
                      { key: 'vashya', item: reportResult.ashtakoota.vashya },
                      { key: 'tara', item: reportResult.ashtakoota.tara },
                      { key: 'yoni', item: reportResult.ashtakoota.yoni },
                      { key: 'grahaMaitri', item: reportResult.ashtakoota.grahaMaitri },
                      { key: 'gana', item: reportResult.ashtakoota.gana },
                      { key: 'bhakoot', item: reportResult.ashtakoota.bhakoot },
                      { key: 'nadi', item: reportResult.ashtakoota.nadi },
                    ].map(({ key, item }) => (
                      <tr key={key} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-3 font-bold text-slate-900">{item.name}</td>
                        <td className="py-3.5 px-3 text-center font-semibold text-slate-500">{item.max}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-900">{item.obtained}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              item.status === 'Excellent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'Good'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : item.status === 'Average'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.status || 'Good'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 text-xs hidden sm:table-cell leading-relaxed">
                          {item.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                      <td className="py-3.5 px-3 font-serif text-sm">Total Guna Score</td>
                      <td className="py-3.5 px-3 text-center">36</td>
                      <td className="py-3.5 px-3 text-center text-base text-[#85132A] font-extrabold">
                        {reportResult.gunaScore}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="text-xs text-slate-700 font-bold">
                          {reportResult.percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 hidden sm:table-cell font-normal text-xs text-slate-500">
                        {reportResult.compatibilityBand}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ============================================================ */}
            {/* 4 COMPATIBILITY DIMENSION CARDS                              */}
            {/* ============================================================ */}
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#0F172A] flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#85132A]" />
                <span>Relationship Dimension Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Emotional Compatibility */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-[#85132A] flex items-center justify-center">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {reportResult.dimensions.emotional.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">Bhakoot & Graha Maitri</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                      {reportResult.dimensions.emotional.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {reportResult.dimensions.emotional.highlight}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {reportResult.dimensions.emotional.description}
                  </p>
                </div>

                {/* 2. Communication Compatibility */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {reportResult.dimensions.communication.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">Gana & Intellectual Rhythm</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                      {reportResult.dimensions.communication.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {reportResult.dimensions.communication.highlight}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {reportResult.dimensions.communication.description}
                  </p>
                </div>

                {/* 3. Family Compatibility */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {reportResult.dimensions.family.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">Nadi, Varna & Lineage</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                      {reportResult.dimensions.family.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {reportResult.dimensions.family.highlight}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {reportResult.dimensions.family.description}
                  </p>
                </div>

                {/* 4. Overall Match */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-[#D99A28] flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {reportResult.dimensions.overall.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">Combined Ashtakoota</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 text-[#85132A] text-xs font-bold">
                      {reportResult.dimensions.overall.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    {reportResult.dimensions.overall.highlight}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {reportResult.dimensions.overall.description}
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* MANGLIK ANALYSIS CARD                                        */}
            {/* ============================================================ */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-serif text-xl font-bold text-[#0F172A] flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#85132A]" />
                  <span>Manglik (Mangal Dosha) Analysis</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Assessment of planetary Mars placement and mutual dosha cancellation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Person 1 Status */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {reportResult.person1.name}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-slate-900">
                      Manglik Status
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        reportResult.manglik.person1Status === 'Non-Manglik'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : reportResult.manglik.person1Status === 'Manglik'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {reportResult.manglik.person1Status}
                    </span>
                  </div>
                </div>

                {/* Person 2 Status */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {reportResult.person2.name}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-slate-900">
                      Manglik Status
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        reportResult.manglik.person2Status === 'Non-Manglik'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : reportResult.manglik.person2Status === 'Manglik'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {reportResult.manglik.person2Status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manglik Compatibility Verdict */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50/60 to-amber-50/60 border border-rose-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#85132A]" />
                  <span className="text-xs font-bold text-[#85132A]">
                    Manglik Compatibility: {reportResult.manglik.compatibilityBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {reportResult.manglik.compatibilityNote}
                </p>
              </div>

              <div className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                {reportResult.manglik.disclaimer}
              </div>
            </div>

            {/* Save & Action Options */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-serif text-lg font-bold text-slate-900">
                  Save this Kundali Match?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isLoggedIn
                    ? 'Save this report to your Wonderful Jodi account for future reference.'
                    : 'Create a free account or log in anytime to save and manage your reports.'}
                </p>
                {saveSuccessMessage && (
                  <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{saveSuccessMessage}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleSaveMatch}
                    disabled={isSaving || Boolean(saveSuccessMessage)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#85132A] hover:bg-[#6B0D1E] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : saveSuccessMessage ? 'Saved' : 'Save This Kundali Match'}</span>
                  </button>
                ) : (
                  <Link
                    href="/login?redirect=/kundali-match"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 hover:border-[#85132A] hover:text-[#85132A] text-xs font-bold transition shadow-xs"
                  >
                    <span>Sign In to Save Report</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#E51F3E] hover:bg-[#c91834] text-white text-xs font-bold transition shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Match Another Pair</span>
                </button>
              </div>
            </div>

            {/* Cultural Disclaimer */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs leading-relaxed text-center">
              {reportResult.culturalDisclaimer}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
