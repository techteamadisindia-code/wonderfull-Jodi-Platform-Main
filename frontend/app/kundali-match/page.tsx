'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  ShieldCheck,
  RotateCcw,
  Printer,
  ChevronDown,
  User,
  Users,
  Lock,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  calculatePublicKundaliMatch,
  saveKundaliMatch,
  getMyBirthDetails,
  StructuredBirthPlace,
  PublicKundaliMatchResult,
} from '../../services/kundaliApi';
import { fetchCountries, CountryItem } from '../../services/masterDataApi';

// Top common cities for instant suggestion
const COMMON_CITIES = [
  'Pune',
  'Mumbai',
  'Nagpur',
  'Nashik',
  'Chhatrapati Sambhajinagar',
  'Thane',
  'Pimpri-Chinchwad',
  'Kolhapur',
  'Solapur',
  'Navi Mumbai',
  'Amravati',
  'New Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Indore',
  'Lucknow',
  'Surat',
  'Vadodara',
  'Chandigarh',
  'Goa (Panaji)',
];

const DEFAULT_COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Saudi Arabia',
  'Singapore',
  'Germany',
  'New Zealand',
  'Oman',
  'Qatar',
  'Kuwait',
  'Malaysia',
  'Bahrain',
];

export default function FreeKundaliMatchPage() {
  // Page view: 'form' or 'report'
  const [viewState, setViewState] = useState<'form' | 'report'>('form');

  // Girl Details State (Left Card - Pink)
  const [girlDetails, setGirlDetails] = useState({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    country: 'India',
    city: '',
  });

  // Boy Details State (Right Card - Blue)
  const [boyDetails, setBoyDetails] = useState({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    country: 'India',
    city: '',
  });

  // Location suggestions state
  const [countriesList, setCountriesList] = useState<string[]>(DEFAULT_COUNTRIES);
  const [girlCitySuggestions, setGirlCitySuggestions] = useState<string[]>([]);
  const [boyCitySuggestions, setBoyCitySuggestions] = useState<string[]>([]);
  const [showGirlSuggestions, setShowGirlSuggestions] = useState(false);
  const [showBoySuggestions, setShowBoySuggestions] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculation & Save state
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<PublicKundaliMatchResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Authentication check (optional - for prefill)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedUserBirthDetails, setSavedUserBirthDetails] = useState<any>(null);

  const girlCityRef = useRef<HTMLDivElement>(null);
  const boyCityRef = useRef<HTMLDivElement>(null);

  // Fetch countries and auth details on mount
  useEffect(() => {
    async function initData() {
      try {
        const countriesData = await fetchCountries();
        if (countriesData && countriesData.length > 0) {
          const names = Array.from(new Set(['India', ...countriesData.map((c: CountryItem) => c.name)]));
          setCountriesList(names);
        }
      } catch {
        // Fallback to DEFAULT_COUNTRIES
      }

      try {
        const u = await getMyBirthDetails();
        if (u) {
          setIsLoggedIn(true);
          setSavedUserBirthDetails(u);
        }
      } catch {
        setIsLoggedIn(false);
      }

      // Check URL search parameters for demo / test verification
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === '1' || params.get('test') === 'true') {
          const gName = params.get('girl_name') || 'Dr. Ananya Joshi';
          const bName = params.get('boy_name') || 'Dr. Rohan Kulkarni';
          const gDob = params.get('girl_dob') || '1996-05-18';
          const bDob = params.get('boy_dob') || '1994-08-22';

          setGirlDetails({
            name: gName,
            dateOfBirth: gDob,
            timeOfBirth: params.get('girl_time') || '08:30',
            country: 'India',
            city: params.get('girl_city') || 'Pune',
          });
          setBoyDetails({
            name: bName,
            dateOfBirth: bDob,
            timeOfBirth: params.get('boy_time') || '14:15',
            country: 'India',
            city: params.get('boy_city') || 'Mumbai',
          });

          if (params.get('autocalc') === '1') {
            setTimeout(async () => {
              try {
                setIsCalculating(true);
                const res = await calculatePublicKundaliMatch({
                  person1: {
                    name: gName,
                    gender: 'Female',
                    dateOfBirth: gDob,
                    timeOfBirth: '08:30',
                    birthPlace: {
                      name: 'Pune, Maharashtra, India',
                      city: 'Pune',
                      country: 'India',
                      latitude: 18.5204,
                      longitude: 73.8567,
                      timezone: 'Asia/Kolkata',
                    },
                  },
                  person2: {
                    name: bName,
                    gender: 'Male',
                    dateOfBirth: bDob,
                    timeOfBirth: '14:15',
                    birthPlace: {
                      name: 'Mumbai, Maharashtra, India',
                      city: 'Mumbai',
                      country: 'India',
                      latitude: 19.076,
                      longitude: 72.8777,
                      timezone: 'Asia/Kolkata',
                    },
                  },
                });
                setReportResult(res);
                setViewState('report');
              } catch (err: any) {
                setCalculationError(err.message || 'Auto-calc failed');
              } finally {
                setIsCalculating(false);
              }
            }, 600);
          }
        }

        if (params.get('validate') === '1') {
          setErrors({
            girl_dob: 'Date of birth is required.',
            girl_time: 'Time of birth is required.',
            girl_city: 'City of birth is required.',
            boy_dob: 'Date of birth is required.',
            boy_time: 'Time of birth is required.',
            boy_city: 'City of birth is required.',
          });
        }
      }
    }
    initData();
  }, []);

  // Handle outside click for city suggestion dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (girlCityRef.current && !girlCityRef.current.contains(event.target as Node)) {
        setShowGirlSuggestions(false);
      }
      if (boyCityRef.current && !boyCityRef.current.contains(event.target as Node)) {
        setShowBoySuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // City filter helpers
  const handleGirlCityChange = (val: string) => {
    setGirlDetails((prev) => ({ ...prev, city: val }));
    if (errors.girl_city) setErrors((prev) => ({ ...prev, girl_city: '' }));
    if (val.trim().length > 0) {
      const filtered = COMMON_CITIES.filter((c) =>
        c.toLowerCase().includes(val.toLowerCase())
      );
      setGirlCitySuggestions(filtered);
      setShowGirlSuggestions(filtered.length > 0);
    } else {
      setGirlCitySuggestions([]);
      setShowGirlSuggestions(false);
    }
  };

  const handleBoyCityChange = (val: string) => {
    setBoyDetails((prev) => ({ ...prev, city: val }));
    if (errors.boy_city) setErrors((prev) => ({ ...prev, boy_city: '' }));
    if (val.trim().length > 0) {
      const filtered = COMMON_CITIES.filter((c) =>
        c.toLowerCase().includes(val.toLowerCase())
      );
      setBoyCitySuggestions(filtered);
      setShowBoySuggestions(filtered.length > 0);
    } else {
      setBoyCitySuggestions([]);
      setShowBoySuggestions(false);
    }
  };

  // Optional prefill handler for logged-in users
  const handlePrefillMyDetails = () => {
    if (!savedUserBirthDetails) return;
    const isFemale = savedUserBirthDetails.gender === 'Female';
    const dobStr = savedUserBirthDetails.dob
      ? new Date(savedUserBirthDetails.dob).toISOString().split('T')[0]
      : '';
    const cityStr = savedUserBirthDetails.resolvedLocation?.city || 'Pune';
    const countryStr = savedUserBirthDetails.resolvedLocation?.country || 'India';

    if (isFemale) {
      setGirlDetails((prev) => ({
        ...prev,
        name: savedUserBirthDetails.displayName || '',
        dateOfBirth: dobStr,
        timeOfBirth: savedUserBirthDetails.timeOfBirth || '06:00',
        city: cityStr,
        country: countryStr,
      }));
    } else {
      setBoyDetails((prev) => ({
        ...prev,
        name: savedUserBirthDetails.displayName || '',
        dateOfBirth: dobStr,
        timeOfBirth: savedUserBirthDetails.timeOfBirth || '06:00',
        city: cityStr,
        country: countryStr,
      }));
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

    // Girl validation
    if (!girlDetails.dateOfBirth) {
      newErrors.girl_dob = 'Date of birth is required.';
    } else if (girlDetails.dateOfBirth > today) {
      newErrors.girl_dob = 'Date of birth cannot be in the future.';
    }

    if (!girlDetails.timeOfBirth) {
      newErrors.girl_time = 'Time of birth is required.';
    }

    if (!girlDetails.country.trim()) {
      newErrors.girl_country = 'Country is required.';
    }

    if (!girlDetails.city.trim()) {
      newErrors.girl_city = 'City of birth is required.';
    }

    // Boy validation
    if (!boyDetails.dateOfBirth) {
      newErrors.boy_dob = 'Date of birth is required.';
    } else if (boyDetails.dateOfBirth > today) {
      newErrors.boy_dob = 'Date of birth cannot be in the future.';
    }

    if (!boyDetails.timeOfBirth) {
      newErrors.boy_time = 'Time of birth is required.';
    }

    if (!boyDetails.country.trim()) {
      newErrors.boy_country = 'Country is required.';
    }

    if (!boyDetails.city.trim()) {
      newErrors.boy_city = 'City of birth is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Compatibility Calculation
  const handleCalculateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setCalculationError(null);
    setIsCalculating(true);

    try {
      const payload = {
        person1: {
          name: girlDetails.name.trim() || 'Bride',
          gender: 'Female',
          dateOfBirth: girlDetails.dateOfBirth,
          timeOfBirth: girlDetails.timeOfBirth,
          birthPlace: {
            name: `${girlDetails.city.trim()}, ${girlDetails.country.trim()}`,
            city: girlDetails.city.trim(),
            country: girlDetails.country.trim(),
            latitude: 18.5204,
            longitude: 73.8567,
            timezone: 'Asia/Kolkata',
          },
        },
        person2: {
          name: boyDetails.name.trim() || 'Groom',
          gender: 'Male',
          dateOfBirth: boyDetails.dateOfBirth,
          timeOfBirth: boyDetails.timeOfBirth,
          birthPlace: {
            name: `${boyDetails.city.trim()}, ${boyDetails.country.trim()}`,
            city: boyDetails.city.trim(),
            country: boyDetails.country.trim(),
            latitude: 19.076,
            longitude: 72.8777,
            timezone: 'Asia/Kolkata',
          },
        },
      };

      const result = await calculatePublicKundaliMatch(payload);
      setReportResult(result);
      setViewState('report');
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
      setSaveSuccessMessage('Kundali Match report saved successfully to your profile!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to save Kundali match. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 28) return '#10B981'; // Emerald
    if (score >= 24) return '#D97706'; // Amber
    if (score >= 18) return '#2563EB'; // Blue
    return '#E11D48'; // Rose
  };

  return (
    <main className="min-h-screen bg-[#FDFBF9] text-[#0F172A] relative overflow-hidden text-left pb-16 sm:pb-24">
      {/* ── Subtle Background Astrology Decorations ── */}
      {/* 1. Left Zodiac Circle Wheel Motif */}
      <div
        className="absolute -left-28 sm:-left-16 top-6 sm:top-12 w-[340px] sm:w-[460px] lg:w-[540px] h-[340px] sm:h-[460px] lg:h-[540px] pointer-events-none select-none opacity-20 text-[#D4AF37]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 500 500" className="w-full h-full fill-none stroke-current" strokeWidth="1.2">
          {/* Concentric Circles */}
          <circle cx="250" cy="250" r="230" strokeDasharray="3,3" />
          <circle cx="250" cy="250" r="210" />
          <circle cx="250" cy="250" r="160" />
          <circle cx="250" cy="250" r="110" strokeDasharray="4,4" />
          <circle cx="250" cy="250" r="60" />
          <circle cx="250" cy="250" r="15" fill="currentColor" fillOpacity="0.3" />

          {/* 12 Radial Rays for Zodiac Houses */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 250 + 60 * Math.cos(rad);
            const y1 = 250 + 60 * Math.sin(rad);
            const x2 = 250 + 210 * Math.cos(rad);
            const y2 = 250 + 210 * Math.sin(rad);
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.9" />;
          })}

          {/* Decorative Inner Star Points */}
          <polygon
            points="250,90 285,215 410,250 285,285 250,410 215,285 90,250 215,215"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
        </svg>
      </div>

      {/* 2. Right Ganesha Vedic Motif */}
      <div
        className="absolute right-4 sm:right-10 lg:right-16 top-10 sm:top-14 w-24 sm:w-36 h-28 sm:h-44 pointer-events-none select-none opacity-25 text-[#D4AF37]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 120 150" className="w-full h-full fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round">
          {/* Traditional Ganesha Line Art Motif */}
          <path d="M60 20 C45 20, 35 30, 35 48 C35 65, 45 78, 60 85 C75 92, 85 105, 85 120 C85 132, 72 138, 60 138 C48 138, 40 132, 38 120" />
          <path d="M60 30 C72 30, 80 40, 80 50 C80 62, 70 70, 60 70" />
          <circle cx="68" cy="42" r="3" fill="currentColor" />
          <path d="M45 15 Q60 5 75 15" strokeWidth="2" />
          <path d="M52 10 Q60 2 68 10" strokeWidth="2" />
          {/* Modak / blessing curve */}
          <path d="M85 85 Q100 80 105 95 Q100 110 88 105" strokeWidth="1.8" />
        </svg>
      </div>

      {/* 3. Right Cursive "Better Stars Brighter Together" Calligraphy with Red Heart */}
      <div
        className="absolute right-4 sm:right-8 lg:right-14 top-64 sm:top-72 pointer-events-none select-none hidden md:flex items-end gap-1.5 transform -rotate-6 z-0"
        aria-hidden="true"
      >
        <div className="text-right tracking-wide select-none">
          <span
            className="block text-xl sm:text-2xl lg:text-[28px] text-[#2C3A4E] italic font-normal"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Better
          </span>
          <span
            className="block text-xl sm:text-2xl lg:text-[28px] text-[#2C3A4E] italic font-normal ml-3"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Stars
          </span>
          <span
            className="block text-xl sm:text-2xl lg:text-[28px] text-[#2C3A4E] italic font-normal"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Brighter
          </span>
          <span
            className="block text-xl sm:text-2xl lg:text-[28px] text-[#2C3A4E] italic font-normal ml-4"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Together
          </span>
        </div>
        {/* Hand-drawn Red Heart Outline */}
        <svg className="w-8 h-8 text-[#E9232E] fill-none stroke-current stroke-[2] mb-1 -ml-1" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      {/* 4. Subtle 4-point Star Sparkles */}
      <div className="absolute left-1/4 top-40 text-[#D4AF37]/35 pointer-events-none text-base">✦</div>
      <div className="absolute right-1/4 top-32 text-[#D4AF37]/30 pointer-events-none text-sm">✦</div>
      <div className="absolute left-16 bottom-32 text-[#D4AF37]/25 pointer-events-none text-lg">✦</div>
      <div className="absolute right-20 bottom-44 text-[#D4AF37]/35 pointer-events-none text-xl">✦</div>

      {/* ============================================================ */}
      {/* MAIN CONTAINER CONTENT                                       */}
      {/* ============================================================ */}
      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* ── Centered Hero Header ── */}
        <div className="text-center space-y-2 sm:space-y-3">
          {/* Vedic Lotus Ornament with horizontal dash lines */}
          <div className="flex items-center justify-center gap-2 text-[#E9232E] mb-2 sm:mb-2.5">
            <span className="w-6 sm:w-10 h-[1px] bg-[#E9232E]/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#E9232E]/60" />
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E9232E]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.5C11.5 5.5 9 8.5 5 9.5c2.5 1.5 4 4 4.5 7 .5-3 2-5.5 4.5-7 2.5 1.5 4 4 4.5 7 .5-3 2-5.5 4.5-7-4-1-6.5-4-7-7z" />
            </svg>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E9232E]/60" />
            <span className="w-6 sm:w-10 h-[1px] bg-[#E9232E]/40" />
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight text-[#0B1B3D]">
            Kundali <span className="text-[#E9232E]">Matching</span>
          </h1>

          <p className="text-base sm:text-lg font-semibold text-[#1E293B]">
            Discover your compatibility with the power of Vedic astrology
          </p>

          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Enter the birth details of both individuals to check your 36 Guna Milan score.
          </p>

          {isLoggedIn && savedUserBirthDetails && viewState === 'form' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePrefillMyDetails}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E9232E] text-xs font-bold border border-rose-200/80 transition shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Use My Saved Birth Details</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {calculationError && (
          <div className="max-w-[1140px] mx-auto mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Calculation Failed</p>
              <p className="text-rose-700 mt-0.5">{calculationError}</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: TWO-CARD FORM LAYOUT                                 */}
        {/* ============================================================ */}
        {viewState === 'form' && (
          <form onSubmit={handleCalculateMatch} className="mt-8 sm:mt-10">
            {/* ── Two Symmetrical Cards Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[1140px] mx-auto items-stretch">
              {/* ──────────────────────────────────────────────────────── */}
              {/* LEFT CARD: GIRL'S DETAILS (SOFT PASTEL PINK)             */}
              {/* ──────────────────────────────────────────────────────── */}
              <div className="bg-[#FFF0F4] border border-[#FED7E2] rounded-[26px] p-6 sm:p-7 lg:p-8 shadow-sm shadow-pink-900/5 relative flex flex-col justify-between transition-all">
                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3.5">
                      {/* Pink Avatar Badge */}
                      <div className="w-12 h-12 rounded-full bg-[#FCE7F0] border border-pink-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                        <svg className="w-7 h-7 text-[#E51F3E]" viewBox="0 0 24 24" fill="currentColor">
                          {/* Female Silhouette with Bob / Ponytail */}
                          <circle cx="12" cy="7" r="4" />
                          <path d="M12 12c-4 0-7 2.5-7 6v2h14v-2c0-3.5-3-6-7-6z" />
                          <path d="M8 6c0-2.2 1.8-4 4-4s4 1.8 4 4c0 1.2-.5 2.2-1.3 3-.3-1.5-1.5-2.7-3-2.7s-2.7 1.2-3 2.7C8.4 8.2 8 7.2 8 6z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-[#1E293B] font-bold text-lg sm:text-xl leading-tight">
                          Enter Girl's Details
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
                          Bride's Birth Information
                        </p>
                      </div>
                    </div>

                    {/* Top-Right Red Heart Icon */}
                    <div className="text-[#E9232E] shrink-0">
                      <Heart className="w-5 h-5 text-[#E9232E]" strokeWidth={1.8} />
                    </div>
                  </div>

                  {/* 5 Girl Input Fields */}
                  <div className="space-y-4">
                    {/* Field 1: Name (Optional) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Name <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={girlDetails.name}
                          onChange={(e) => setGirlDetails({ ...girlDetails, name: e.target.value })}
                          placeholder="Full Name"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/15 focus:outline-none transition shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Field 2: Date of Birth (Required) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Date of Birth <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="date"
                          value={girlDetails.dateOfBirth}
                          onChange={(e) => {
                            setGirlDetails({ ...girlDetails, dateOfBirth: e.target.value });
                            if (errors.girl_dob) setErrors({ ...errors, girl_dob: '' });
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm text-[#0F172A] focus:outline-none transition shadow-2xs ${
                            errors.girl_dob
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200/90 focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/15'
                          }`}
                        />
                      </div>
                      {errors.girl_dob && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.girl_dob}</p>
                      )}
                    </div>

                    {/* Field 3: Time of Birth (Required) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Time of Birth <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="time"
                          value={girlDetails.timeOfBirth}
                          onChange={(e) => {
                            setGirlDetails({ ...girlDetails, timeOfBirth: e.target.value });
                            if (errors.girl_time) setErrors({ ...errors, girl_time: '' });
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm text-[#0F172A] focus:outline-none transition shadow-2xs ${
                            errors.girl_time
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200/90 focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/15'
                          }`}
                        />
                      </div>
                      {errors.girl_time && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.girl_time}</p>
                      )}
                    </div>

                    {/* Field 4: Place of Birth (Country) (Required) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Place of Birth (Country) <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <select
                          value={girlDetails.country}
                          onChange={(e) => {
                            setGirlDetails({ ...girlDetails, country: e.target.value });
                            if (errors.girl_country) setErrors({ ...errors, girl_country: '' });
                          }}
                          className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] appearance-none focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/15 focus:outline-none transition shadow-2xs cursor-pointer"
                        >
                          <option value="">Select Country of Birth</option>
                          {countriesList.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                      </div>
                      {errors.girl_country && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.girl_country}</p>
                      )}
                    </div>

                    {/* Field 5: City of Birth (Required) */}
                    <div ref={girlCityRef} className="relative">
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        City of Birth <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={girlDetails.city}
                          onChange={(e) => handleGirlCityChange(e.target.value)}
                          onFocus={() => {
                            if (girlDetails.city.trim().length > 0) setShowGirlSuggestions(true);
                          }}
                          placeholder="Enter City of Birth"
                          className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none transition shadow-2xs ${
                            errors.girl_city
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200/90 focus:border-[#E9232E] focus:ring-2 focus:ring-[#E9232E]/15'
                          }`}
                        />
                      </div>
                      {errors.girl_city && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.girl_city}</p>
                      )}

                      {/* Autocomplete Suggestions Dropdown */}
                      {showGirlSuggestions && girlCitySuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto py-1">
                          {girlCitySuggestions.map((cityName) => (
                            <button
                              key={cityName}
                              type="button"
                              onClick={() => {
                                setGirlDetails((prev) => ({ ...prev, city: cityName }));
                                setShowGirlSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-rose-50 hover:text-[#E9232E] transition flex items-center gap-2 cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{cityName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────── */}
              {/* RIGHT CARD: BOY'S DETAILS (SOFT PASTEL BLUE)             */}
              {/* ──────────────────────────────────────────────────────── */}
              <div className="bg-[#EFF8FF] border border-[#BAE6FD] rounded-[26px] p-6 sm:p-7 lg:p-8 shadow-sm shadow-blue-900/5 relative flex flex-col justify-between transition-all">
                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3.5">
                      {/* Blue Avatar Badge */}
                      <div className="w-12 h-12 rounded-full bg-[#DBEAFE] border border-blue-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                        <svg className="w-7 h-7 text-[#2563EB]" viewBox="0 0 24 24" fill="currentColor">
                          {/* Male Silhouette */}
                          <circle cx="12" cy="7" r="4" />
                          <path d="M12 12c-4 0-7 2.5-7 6v2h14v-2c0-3.5-3-6-7-6z" />
                          <path d="M7 6c0-2.2 2-4 5-4s5 1.8 5 4c0 .8-.2 1.5-.6 2.2-.8-1.3-2.3-2.2-4.4-2.2s-3.6.9-4.4 2.2C7.2 7.5 7 6.8 7 6z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-[#1E293B] font-bold text-lg sm:text-xl leading-tight">
                          Enter Boy's Details
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm font-normal mt-0.5">
                          Groom's Birth Information
                        </p>
                      </div>
                    </div>

                    {/* Top-Right Red Heart Icon */}
                    <div className="text-[#E9232E] shrink-0">
                      <Heart className="w-5 h-5 text-[#E9232E]" strokeWidth={1.8} />
                    </div>
                  </div>

                  {/* 5 Boy Input Fields */}
                  <div className="space-y-4">
                    {/* Field 1: Name (Optional) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Name <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={boyDetails.name}
                          onChange={(e) => setBoyDetails({ ...boyDetails, name: e.target.value })}
                          placeholder="Full Name"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 focus:outline-none transition shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Field 2: Date of Birth (Required) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Date of Birth <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="date"
                          value={boyDetails.dateOfBirth}
                          onChange={(e) => {
                            setBoyDetails({ ...boyDetails, dateOfBirth: e.target.value });
                            if (errors.boy_dob) setErrors({ ...errors, boy_dob: '' });
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm text-[#0F172A] focus:outline-none transition shadow-2xs ${
                            errors.boy_dob
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200/90 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                          }`}
                        />
                      </div>
                      {errors.boy_dob && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.boy_dob}</p>
                      )}
                    </div>

                    {/* Field 3: Time of Birth (Required) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Time of Birth <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="time"
                          value={boyDetails.timeOfBirth}
                          onChange={(e) => {
                            setBoyDetails({ ...boyDetails, timeOfBirth: e.target.value });
                            if (errors.boy_time) setErrors({ ...errors, boy_time: '' });
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm text-[#0F172A] focus:outline-none transition shadow-2xs ${
                            errors.boy_time
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200/90 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                          }`}
                        />
                      </div>
                      {errors.boy_time && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.boy_time}</p>
                      )}
                    </div>

                    {/* Field 4: Place of Birth (Country) (Required) */}
                    <div>
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        Place of Birth (Country) <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <select
                          value={boyDetails.country}
                          onChange={(e) => {
                            setBoyDetails({ ...boyDetails, country: e.target.value });
                            if (errors.boy_country) setErrors({ ...errors, boy_country: '' });
                          }}
                          className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200/90 rounded-xl text-sm text-[#0F172A] appearance-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 focus:outline-none transition shadow-2xs cursor-pointer"
                        >
                          <option value="">Select Country of Birth</option>
                          {countriesList.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                      </div>
                      {errors.boy_country && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.boy_country}</p>
                      )}
                    </div>

                    {/* Field 5: City of Birth (Required) */}
                    <div ref={boyCityRef} className="relative">
                      <label className="block text-xs sm:text-[13px] font-bold text-[#1E293B] mb-1.5">
                        City of Birth <span className="text-[#E9232E]">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          value={boyDetails.city}
                          onChange={(e) => handleBoyCityChange(e.target.value)}
                          onFocus={() => {
                            if (boyDetails.city.trim().length > 0) setShowBoySuggestions(true);
                          }}
                          placeholder="Enter City of Birth"
                          className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none transition shadow-2xs ${
                            errors.boy_city
                              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200/90 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
                          }`}
                        />
                      </div>
                      {errors.boy_city && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.boy_city}</p>
                      )}

                      {/* Autocomplete Suggestions Dropdown */}
                      {showBoySuggestions && boyCitySuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto py-1">
                          {boyCitySuggestions.map((cityName) => (
                            <button
                              key={cityName}
                              type="button"
                              onClick={() => {
                                setBoyDetails((prev) => ({ ...prev, city: cityName }));
                                setShowBoySuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2 cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{cityName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Centered Compatibility Button (Below Both Cards) ── */}
            <div className="flex flex-col items-center justify-center pt-8 sm:pt-10">
              <button
                type="submit"
                disabled={isCalculating}
                className="w-full max-w-[390px] h-[52px] sm:h-[56px] rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E9232E] to-[#D81B38] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="tracking-wide">Calculating Compatibility...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4.5 h-4.5 fill-white text-white" />
                    <span className="tracking-wide">Check Your Compatibility</span>
                  </>
                )}
              </button>

              {/* Privacy Message */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mt-3.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Your information is private and secure.</span>
              </div>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: DETAILED COMPATIBILITY REPORT                        */}
        {/* ============================================================ */}
        {viewState === 'report' && reportResult && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-[1140px] mx-auto mt-6">
            {/* Top Overview Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#E9232E] text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Vedic Ashtakoota Analysis
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F172A]">
                    Kundali Compatibility Report
                  </h2>
                  <p className="text-sm font-semibold text-slate-600 mt-1">
                    {reportResult.person1.name} (Bride) ↔ {reportResult.person2.name} (Groom)
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewState('form');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Modify Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>

                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={handleSaveMatch}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E51F3E] to-[#E9232E] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Match'}</span>
                    </button>
                  )}
                </div>
              </div>

              {saveSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Circular Score Indicator & Summary Hero */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                {/* Score Dial */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="68" stroke="#F1F5F9" strokeWidth="14" fill="transparent" />
                      <circle
                        cx="80"
                        cy="80"
                        r="68"
                        stroke={getScoreColor(reportResult.gunaScore)}
                        strokeWidth="14"
                        strokeDasharray={2 * Math.PI * 68}
                        strokeDashoffset={2 * Math.PI * 68 * (1 - reportResult.gunaScore / 36.0)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-serif text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
                        {reportResult.gunaScore}
                        <span className="text-xl text-slate-400 font-normal"> / 36</span>
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                        Gunas Matched
                      </span>
                      <span
                        className="text-xs font-extrabold px-2.5 py-0.5 rounded-full mt-1.5"
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
                      className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-2xs"
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
                    {/* Girl / Bride */}
                    <div className="p-3.5 rounded-2xl bg-[#FFF0F4] border border-pink-200/80 space-y-1">
                      <div className="font-bold text-[#E9232E] flex items-center justify-between">
                        <span>{reportResult.person1.name}</span>
                        <span className="text-[10px] uppercase font-bold text-pink-700 px-2 py-0.5 bg-pink-100 rounded-full">
                          Bride
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

                    {/* Boy / Groom */}
                    <div className="p-3.5 rounded-2xl bg-[#EFF8FF] border border-blue-200/80 space-y-1">
                      <div className="font-bold text-[#2563EB] flex items-center justify-between">
                        <span>{reportResult.person2.name}</span>
                        <span className="text-[10px] uppercase font-bold text-blue-700 px-2 py-0.5 bg-blue-100 rounded-full">
                          Groom
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

            {/* Ashtakoota 8-Koota Breakdown */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-serif text-xl font-bold text-[#0F172A] flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#E9232E]" />
                  <span>Ashtakoota 8-Koota Breakdown</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Detailed distribution of obtained points across each of the traditional 8 astrological kootas.
                </p>
              </div>

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
                      <td className="py-3.5 px-3 text-center text-base text-[#E9232E] font-extrabold">
                        {reportResult.gunaScore}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className="inline-block px-3 py-0.5 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: `${getScoreColor(reportResult.gunaScore)}20`,
                            color: getScoreColor(reportResult.gunaScore),
                          }}
                        >
                          {reportResult.compatibilityBand}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 hidden sm:table-cell text-xs text-slate-500">
                        Traditional Vedic Ashtakoota calculation
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Manglik Analysis Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                    Mangal Dosha (Kuja Dosha) Compatibility
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Planetary analysis of Mars placement from Ascendant (Lagna) and Moon.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    reportResult.manglik.isCompatible
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {reportResult.manglik.compatibilityBadge}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {reportResult.manglik.compatibilityNote}
              </p>
            </div>

            {/* Compatibility Dimensions */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-serif text-xl font-bold text-[#0F172A]">
                  Modern Compatibility Dimensions
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Actionable life and relationship dimensions mapped from Vedic planetary coordinates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(reportResult.dimensions).map(([key, dim]) => (
                  <div key={key} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">{dim.title}</span>
                      <span className="text-xs font-bold text-[#E9232E]">{dim.score}% ({dim.rating})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-[#E9232E] rounded-full"
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">{dim.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recalculate CTA at bottom of report */}
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setViewState('form');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full max-w-[360px] h-[52px] rounded-full bg-gradient-to-r from-[#E51F3E] to-[#E9232E] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 hover:shadow-xl transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Check Another Kundali Match</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* BENEFITS & TRUST SECTION (BELOW BOTH CARDS & BUTTON)          */}
        {/* ============================================================ */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200/70 max-w-[1040px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Benefit 1: 100% Private */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/60 transition">
              <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0 text-emerald-600 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">100% Private</h4>
                <p className="text-xs text-slate-500 mt-0.5">Your details are secure</p>
              </div>
            </div>

            {/* Benefit 2: Traditional Vedic Astrology */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/60 transition">
              <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-200/70 flex items-center justify-center shrink-0 text-[#E9232E] shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">Traditional Vedic Astrology</h4>
                <p className="text-xs text-slate-500 mt-0.5">Based on 36 Guna Milan</p>
              </div>
            </div>

            {/* Benefit 3: Find Better Compatibility */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/60 transition">
              <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-200/70 flex items-center justify-center shrink-0 text-[#E9232E] shadow-2xs">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">Find Better Compatibility</h4>
                <p className="text-xs text-slate-500 mt-0.5">For a brighter future together</p>
              </div>
            </div>
          </div>

          {/* Cultural Disclaimer */}
          <p className="text-[11px] text-slate-400 text-center max-w-2xl mx-auto mt-8 leading-relaxed">
            Kundali matching is a traditional astrological practice provided for informational and cultural purposes. It should not be treated as a guarantee or the sole basis for marriage decisions.
          </p>
        </div>
      </div>
    </main>
  );
}
