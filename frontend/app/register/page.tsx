'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { setAuthToken } from '../../lib/api';
import {
  startRegistration,
  saveRegistrationStep,
  autoSaveRegistration,
  getRegistrationSession,
  completeRegistration,
  checkRegistrationAvailability,
  validateRegistrationSession,
  StepData,
} from '../../services/registrationApi';
import {
  RegistrationReviewSection,
  MissingFieldItem,
} from '../../components/RegistrationReviewSection';
import { fetchLanguages, fetchCastes, fetchStates, searchCitiesByState } from '../../services/masterDataApi';
import api from '../../lib/api';
import { Logo } from '../../components/Logo';
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
  Camera,
  Upload,
  X,
  RotateCcw,
  Loader2,
  Calendar,
  Phone,
  Mail,
  HelpCircle,
  Plus,
  Trash2,
  Users,
  BookOpen,
  Stethoscope,
  HeartHandshake,
} from 'lucide-react';

import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  UG_MEDICAL_QUALIFICATIONS,
  PG_MEDICAL_QUALIFICATIONS,
  DOCTORATE_MEDICAL_QUALIFICATIONS,
  DEGREE_COMPLETION_STATUSES,
  PARTNER_QUALIFICATIONS,
  PARTNER_SPECIALIZATIONS,
  PARTNER_MARITAL_STATUSES,
  PARTNER_DIET_PREFERENCES,
  PARTNER_SMOKING_PREFERENCES,
  PARTNER_DRINKING_PREFERENCES,
  validateDateOfBirth,
  validateMedicalQualification,
} from '../../lib/doctorConstants';
import { DobInput } from '../../components/DobInput';
import { InstitutionAutocomplete } from '../../components/InstitutionAutocomplete';

const PROFESSIONS = DOCTOR_SPECIALIZATIONS;
const QUALIFICATIONS = DOCTOR_QUALIFICATIONS;

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
  'Nagpur',
  'Indore',
  'Bhopal',
  'Other City',
];

const RELIGIONS = [
  'Hindu',
  'Muslim',
  'Sikh',
  'Christian',
  'Jain',
  'Buddhist',
  'Parsi',
  'Jewish',
  'Other',
];

const MARITAL_STATUSES = [
  'Never Married',
  'Divorced',
  'Awaiting Divorce',
  'Widowed',
  'Annulled',
];

const HEIGHT_OPTIONS = [
  `4' 10"`,
  `5' 0"`,
  `5' 2"`,
  `5' 4"`,
  `5' 6"`,
  `5' 8"`,
  `5' 10"`,
  `6' 0"`,
  `6' 2"`,
  `6' 4"`,
];

const DEFAULT_LANGUAGES = [
  'Marathi', 'Hindi', 'Gujarati', 'Kannada', 'Telugu', 'Tamil', 'Malayalam',
  'Bengali', 'Punjabi', 'Odia', 'Urdu', 'Assamese', 'Konkani', 'Sindhi',
  'Nepali', 'Sanskrit', 'Kashmiri', 'English', 'Marwari', 'Tulu', 'Bhojpuri', 'Rajasthani'
];

const DEFAULT_STATES = [
  'Maharashtra', 'Karnataka', 'Gujarat', 'Delhi', 'Telangana', 'Tamil Nadu',
  'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Andhra Pradesh', 'West Bengal',
  'Kerala', 'Punjab', 'Haryana', 'Bihar', 'Goa', 'Odisha', 'Assam', 'Jharkhand',
  'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Chandigarh', 'Jammu and Kashmir',
  'Ladakh', 'Puducherry', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Mizoram',
  'Sikkim', 'Arunachal Pradesh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Andaman and Nicobar Islands', 'Lakshadweep'
];

const STORAGE_KEY = 'wj_registration_id';
const BACKUP_KEY = 'wj_reg_form_backup';

export interface SiblingItem {
  name: string;
  age: string;
  profession: string;
  maritalStatus: string;
  location: string;
}

export interface UgQualItem {
  qualification: string;
  college: string;
  collegeId?: string;
  passingYear: string;
  status: 'Completed' | 'Pursuing';
}

export interface PgQualItem {
  qualification: string;
  specialization: string;
  college: string;
  collegeId?: string;
  passingYear: string;
  status: 'Completed' | 'Pursuing';
}

export interface DoctorateQualItem {
  qualification: string;
  specialization: string;
  college: string;
  collegeId?: string;
  passingYear: string;
  status: 'Completed' | 'Pursuing';
}

export type RegistrationStep = 1 | 2 | 3 | 4 | 5 | 'review' | 'complete';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Multi-step State (1: Account, 2: Personal & Family, 3: Education & Career, 4: Photo & Preferences, 'review': Review, 'complete': Complete)
  const [step, setStep] = useState<RegistrationStep>(1);
  const [returnToReview, setReturnToReview] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [reviewMissingFields, setReviewMissingFields] = useState<MissingFieldItem[]>([]);
  const [registrationId, setRegistrationId] = useState<string>('');
  const [isResumed, setIsResumed] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);

  // Auto-save State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── STEP 1: Basic & Account ───
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [dob, setDob] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // ─── STEP 2: Personal & Cultural ───
  const [maritalStatus, setMaritalStatus] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [religion, setReligion] = useState('');
  const [caste, setCaste] = useState('');
  const [height, setHeight] = useState(`5' 6"`);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Structured Location Hierarchy State
  const [locationData, setLocationData] = useState<{
    countryId?: string;
    stateId?: string;
    districtId?: string;
    talukaId?: string;
    cityId?: string;
    countryName?: string;
    stateName?: string;
    districtName?: string;
    talukaName?: string;
    cityName?: string;
    pinCode?: string;
    officialCode?: string;
  } | null>(null);

  const [citySearchInput, setCitySearchInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [loadingCitySuggestions, setLoadingCitySuggestions] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const cityDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close city autocomplete dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler for state selection change
  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    // When candidate changes state, clear any previous city and suggestions
    setCity('');
    setCitySearchInput('');
    setLocationData(null);
    setCitySuggestions([]);
    setShowCityDropdown(false);
    if (step2Errors.city) {
      setStep2Errors((prev) => ({ ...prev, city: '' }));
    }
    if (step2Errors.state) {
      setStep2Errors((prev) => ({ ...prev, state: '' }));
    }
    triggerAutoSave('personalInfo', { state: selectedState, city: '', location: null });
  };

  // Handler for debounced city autocomplete search
  const handleCitySearchChange = (val: string) => {
    setCitySearchInput(val);
    setCity(val);
    setShowCityDropdown(true);

    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
    }

    if (!state || !state.trim()) {
      setCitySuggestions([]);
      return;
    }

    setLoadingCitySuggestions(true);
    cityDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCitiesByState(state, val);
        setCitySuggestions(results || []);
      } catch (err) {
        console.warn('Failed to load city suggestions:', err);
        setCitySuggestions([]);
      } finally {
        setLoadingCitySuggestions(false);
      }
    }, 300);
  };

  // Handler for selecting an authoritative city from suggestions
  const handleSelectCity = (sugg: any) => {
    setCity(sugg.name);
    setCitySearchInput(sugg.name);
    setShowCityDropdown(false);
    const loc = {
      countryId: sugg.countryId || undefined,
      stateId: typeof sugg.stateId === 'object' ? sugg.stateId?._id : sugg.stateId,
      districtId: typeof sugg.districtId === 'object' ? sugg.districtId?._id : sugg.districtId,
      talukaId: sugg.subDistrictId || undefined,
      cityId: sugg._id,
      countryName: 'India',
      stateName: (typeof sugg.stateId === 'object' ? sugg.stateId?.name : state) || state,
      districtName: typeof sugg.districtId === 'object' ? sugg.districtId?.name : undefined,
      cityName: sugg.name,
      pinCode: sugg.pincode ? String(sugg.pincode) : undefined,
      officialCode: sugg.lgdCode ? String(sugg.lgdCode) : undefined,
    };
    setLocationData(loc);
    if (step2Errors.city) {
      setStep2Errors((prev) => ({ ...prev, city: '' }));
    }
    triggerAutoSave('personalInfo', {
      city: sugg.name,
      state: loc.stateName,
      location: loc,
    });
  };

  // Master Data Lists for Dynamic Selection
  const [languagesList, setLanguagesList] = useState<string[]>(DEFAULT_LANGUAGES);
  const [castesList, setCastesList] = useState<string[]>([]);
  const [statesList, setStatesList] = useState<string[]>(DEFAULT_STATES);

  // Subsection A: About Me
  const [aboutMe, setAboutMe] = useState('');
  const [personalityValues, setPersonalityValues] = useState('');
  const [hobbiesInterests, setHobbiesInterests] = useState('');
  const [careerGoals, setCareerGoals] = useState('');

  // Subsection B: Family Background
  const [familyType, setFamilyType] = useState('');
  const [familyStatus, setFamilyStatus] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherProfession, setFatherProfession] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherProfession, setMotherProfession] = useState('');
  const [familyLocation, setFamilyLocation] = useState('');
  const [familyValues, setFamilyValues] = useState('');
  const [aboutFamily, setAboutFamily] = useState('');

  // Sibling Details
  const [brothersCount, setBrothersCount] = useState<number>(0);
  const [sistersCount, setSistersCount] = useState<number>(0);
  const [brothers, setBrothers] = useState<SiblingItem[]>([]);
  const [sisters, setSisters] = useState<SiblingItem[]>([]);

  // ─── STEP 3: Education & Career ───
  const [ugQualifications, setUgQualifications] = useState<UgQualItem[]>([
    { qualification: 'MBBS', college: '', passingYear: '', status: 'Completed' },
  ]);
  const [pgQualifications, setPgQualifications] = useState<PgQualItem[]>([]);
  const [doctorateQualifications, setDoctorateQualifications] = useState<DoctorateQualItem[]>([]);

  const [profession, setProfession] = useState<string>('');
  const [company, setCompany] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [annualIncome, setAnnualIncome] = useState('₹ 15 - 25 Lakhs');
  const [medicalRegistrationNumber, setMedicalRegistrationNumber] = useState('');
  const [medicalExperience, setMedicalExperience] = useState('');

  // ─── STEP 4: Photo & Partner Expectations ───
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Partner Expectations
  const [lookingFor, setLookingFor] = useState<'Male' | 'Female'>('Male');
  const [prefAgeMin, setPrefAgeMin] = useState('23');
  const [prefAgeMax, setPrefAgeMax] = useState('34');
  const [prefHeightMin, setPrefHeightMin] = useState(`5' 2"`);
  const [prefHeightMax, setPrefHeightMax] = useState(`6' 0"`);
  const [prefEducation, setPrefEducation] = useState('Any Medical Qualification');
  const [prefProfession, setPrefProfession] = useState('Any Specialization');
  const [prefCountry, setPrefCountry] = useState('India');
  const [prefState, setPrefState] = useState('');
  const [prefCity, setPrefCity] = useState('');
  const [prefWillingToRelocate, setPrefWillingToRelocate] = useState('Yes');
  const [prefMaritalStatus, setPrefMaritalStatus] = useState('Never Married');
  const [prefDiet, setPrefDiet] = useState('Any Diet Preference');
  const [prefSmoking, setPrefSmoking] = useState('Does Not Matter');
  const [prefDrinking, setPrefDrinking] = useState('Does Not Matter');
  const [familyExpectations, setFamilyExpectations] = useState('');
  const [additionalExpectations, setAdditionalExpectations] = useState('');

  // ─── Global & Field Errors ───
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step4Errors, setStep4Errors] = useState<Record<string, string>>({});
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string>('');

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

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validateMobile = (val: string) => /^[6-9]\d{9}$/.test(val.replace(/\D/g, ''));

  // ─── 0. Capture Referral Code ───
  useEffect(() => {
    const refParam = searchParams.get('ref') || searchParams.get('referralCode');
    const storedRef = typeof window !== 'undefined' ? localStorage.getItem('wj_referral_code') : null;
    const activeRef = (refParam || storedRef || '').trim().toUpperCase();
    if (activeRef) {
      setReferralCode(activeRef);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wj_referral_code', activeRef);
      }
      api.post('/referrals/track-click', { referralCode: activeRef }).catch(() => {});
    }
  }, [searchParams]);

  // Preload Languages and States from Master Data API
  useEffect(() => {
    fetchLanguages()
      .then((items) => {
        if (items && items.length > 0) {
          setLanguagesList(items.map((i) => i.name));
        }
      })
      .catch(() => {});

    fetchStates()
      .then((items) => {
        if (items && items.length > 0) {
          setStatesList(items.map((s) => s.name));
        }
      })
      .catch(() => {});
  }, []);

  // Dynamically load Castes whenever Religion changes
  useEffect(() => {
    if (!religion || !religion.trim()) {
      setCastesList([]);
      return;
    }
    fetchCastes({ religionName: religion.trim() })
      .then((items) => {
        if (items && items.length > 0) {
          setCastesList(items.map((c) => c.name));
        } else {
          setCastesList([]);
        }
      })
      .catch(() => setCastesList([]));
  }, [religion]);

  // ─── 1. Check for Existing Registration to Resume on Mount ───
  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setInitialLoading(false);
    }, 2000);

    const resumeExisting = async () => {
      const isFreshParam = searchParams.get('fresh') === 'true' || searchParams.get('new') === 'true';
      if (isFreshParam) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(BACKUP_KEY);
        }
        handleStartFresh();
        setInitialLoading(false);
        return;
      }

      const regIdParam = searchParams.get('regId') || searchParams.get('registrationId');
      const savedRegId = regIdParam || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);

      if (savedRegId) {
        try {
          const session = await getRegistrationSession(savedRegId);
          if (session && (session.status === 'IN_PROGRESS' || session.status === 'STARTED')) {
            setRegistrationId(session.registrationId);
            setIsResumed(true);

            // Populate Step 1
            const b = session.stepData?.basicInfo || {};
            if (b.fullName || session.candidateName) setFullName(b.fullName || session.candidateName || '');
            if (b.email || session.email) setEmail(b.email || session.email || '');
            if (b.mobile || session.mobile) setMobile(b.mobile || session.mobile || '');
            if (b.gender || session.gender) {
              const g = b.gender || session.gender;
              if (g === 'Male' || g === 'Female') setGender(g);
            }
            if (b.dob) setDob(b.dob);
            if (b.agreeTerms !== undefined) setAgreeTerms(Boolean(b.agreeTerms));

            // Populate Step 2
            const p = session.stepData?.personalInfo || {};
            const fam = session.stepData?.familyDetails || {};
            const sibs = session.stepData?.siblings || {};

            if (p.maritalStatus) setMaritalStatus(p.maritalStatus);
            if (p.motherTongue) setMotherTongue(p.motherTongue);
            if (p.religion) setReligion(p.religion);
            if (p.caste) setCaste(p.caste);
            if (p.height) setHeight(p.height);
            if (p.state) setState(p.state);
            if (p.city) {
              setCity(p.city);
              setCitySearchInput(p.city);
            }
            if ((p as any).location || (session as any).currentLocation) {
              setLocationData((p as any).location || (session as any).currentLocation);
            }

            // Subsection A: About Me
            if (p.aboutMe || p.about) setAboutMe(p.aboutMe || p.about || '');
            if (p.personalityValues) setPersonalityValues(p.personalityValues);
            if (p.hobbiesInterests) setHobbiesInterests(p.hobbiesInterests);
            if (p.careerGoals) setCareerGoals(p.careerGoals);

            // Subsection B: Family Background
            if (fam.familyType) setFamilyType(fam.familyType);
            if (fam.familyStatus) setFamilyStatus(fam.familyStatus);
            if (fam.fatherName) setFatherName(fam.fatherName);
            if (fam.fatherProfession || fam.fatherOccupation) {
              setFatherProfession(fam.fatherProfession || fam.fatherOccupation || '');
            }
            if (fam.motherName) setMotherName(fam.motherName);
            if (fam.motherProfession || fam.motherOccupation) {
              setMotherProfession(fam.motherProfession || fam.motherOccupation || '');
            }
            if (fam.familyLocation) setFamilyLocation(fam.familyLocation);
            if (fam.familyValues) setFamilyValues(fam.familyValues);
            if (fam.aboutFamily) setAboutFamily(fam.aboutFamily);

            // Brother & Sister Details
            if (sibs.brothersCount !== undefined) setBrothersCount(sibs.brothersCount);
            if (sibs.sistersCount !== undefined) setSistersCount(sibs.sistersCount);
            if (Array.isArray(sibs.brothers)) {
              setBrothers(
                sibs.brothers.map((b) => ({
                  name: b.name || '',
                  age: b.age !== undefined && b.age !== null ? String(b.age) : '',
                  profession: b.profession || '',
                  maritalStatus: b.maritalStatus || 'Unmarried',
                  location: b.location || '',
                }))
              );
            }
            if (Array.isArray(sibs.sisters)) {
              setSisters(
                sibs.sisters.map((s) => ({
                  name: s.name || '',
                  age: s.age !== undefined && s.age !== null ? String(s.age) : '',
                  profession: s.profession || '',
                  maritalStatus: s.maritalStatus || 'Unmarried',
                  location: s.location || '',
                }))
              );
            }

            // Populate Step 3
            const e = session.stepData?.educationProfession || {};
            const med = session.stepData?.medicalQualifications || {};

            if (Array.isArray(med.undergraduate) && med.undergraduate.length > 0) {
              setUgQualifications(
                med.undergraduate.map((u) => ({
                  qualification: u.qualification || 'MBBS',
                  college: u.college || '',
                  collegeId: u.collegeId ? String(u.collegeId) : undefined,
                  passingYear: u.passingYear || '',
                  status: (u.status as 'Completed' | 'Pursuing') || 'Completed',
                }))
              );
            } else if (e.education) {
              setUgQualifications([
                {
                  qualification: e.education,
                  college: e.medicalCollege || '',
                  passingYear: '',
                  status: 'Completed',
                },
              ]);
            }

            if (Array.isArray(med.postgraduate) && med.postgraduate.length > 0) {
              setPgQualifications(
                med.postgraduate.map((pg) => ({
                  qualification: pg.qualification || 'MD',
                  specialization: pg.specialization || '',
                  college: pg.college || '',
                  collegeId: pg.collegeId ? String(pg.collegeId) : undefined,
                  passingYear: pg.passingYear || '',
                  status: (pg.status as 'Completed' | 'Pursuing') || 'Completed',
                }))
              );
            }

            if (Array.isArray(med.doctorate) && med.doctorate.length > 0) {
              setDoctorateQualifications(
                med.doctorate.map((d) => ({
                  qualification: d.qualification || 'DM',
                  specialization: d.specialization || '',
                  college: d.college || '',
                  collegeId: d.collegeId ? String(d.collegeId) : undefined,
                  passingYear: d.passingYear || '',
                  status: (d.status as 'Completed' | 'Pursuing') || 'Completed',
                }))
              );
            }

            if (e.profession) setProfession(e.profession);
            if (e.company) setCompany(e.company);
            if (e.workLocation) setWorkLocation(e.workLocation);
            if (e.annualIncome) setAnnualIncome(e.annualIncome);
            if (e.medicalRegistrationNumber) setMedicalRegistrationNumber(e.medicalRegistrationNumber);
            if (e.medicalExperience) setMedicalExperience(e.medicalExperience);

            // Populate Step 4
            const pref = session.stepData?.preferences || {};
            const pExp = session.stepData?.partnerExpectations || {};

            if (pref.lookingFor === 'Male' || pref.lookingFor === 'Female') setLookingFor(pref.lookingFor);
            if (pExp.ageMin || pref.prefAgeMin) setPrefAgeMin(String(pExp.ageMin || pref.prefAgeMin));
            if (pExp.ageMax || pref.prefAgeMax) setPrefAgeMax(String(pExp.ageMax || pref.prefAgeMax));
            if (pExp.heightMin) setPrefHeightMin(pExp.heightMin);
            if (pExp.heightMax) setPrefHeightMax(pExp.heightMax);
            if (pExp.qualification || pref.prefEducation) {
              setPrefEducation(pExp.qualification || pref.prefEducation || 'Any Medical Qualification');
            }
            if (pExp.specialization || pref.prefProfession) {
              setPrefProfession(pExp.specialization || pref.prefProfession || 'Any Specialization');
            }
            if (pExp.location?.city || pref.prefCity) setPrefCity(pExp.location?.city || pref.prefCity || '');
            if (pExp.location?.state) setPrefState(pExp.location.state);
            if (pExp.location?.country) setPrefCountry(pExp.location.country);
            if (pExp.willingToRelocate) setPrefWillingToRelocate(String(pExp.willingToRelocate));
            if (pExp.maritalStatus) setPrefMaritalStatus(pExp.maritalStatus);
            if (pExp.lifestyle?.diet || pref.prefDiet) setPrefDiet(pExp.lifestyle?.diet || pref.prefDiet || 'Any Diet Preference');
            if (pExp.lifestyle?.smoking) setPrefSmoking(pExp.lifestyle.smoking);
            if (pExp.lifestyle?.drinking) setPrefDrinking(pExp.lifestyle.drinking);
            if (pExp.familyExpectations) setFamilyExpectations(pExp.familyExpectations);
            if (pExp.additionalExpectations) setAdditionalExpectations(pExp.additionalExpectations);

            const ph = session.stepData?.photos || {};
            if (ph.primaryPhoto) {
              setUploadedPhotoUrl(ph.primaryPhoto);
              setPhotoPreview(ph.primaryPhoto);
            }

            // Compute completed steps from loaded session data
            const doneSteps: number[] = [];
            if (session.stepData?.basicInfo?.fullName && session.stepData?.basicInfo?.email) doneSteps.push(1);
            if (session.stepData?.personalInfo?.maritalStatus && session.stepData?.personalInfo?.religion) doneSteps.push(2);
            if (session.stepData?.educationProfession?.profession || (session.stepData?.medicalQualifications?.undergraduate?.length ?? 0) > 0) doneSteps.push(3);
            if (session.currentStep >= 4 || session.stepData?.preferences?.lookingFor) doneSteps.push(4);
            setCompletedSteps(doneSteps);

            // Restore active step
            const targetStep = Math.min(4, Math.max(1, session.currentStep)) as RegistrationStep;
            setStep(targetStep);
          } else if (session?.status === 'COMPLETED') {
            if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
          }
        } catch (err) {
          console.warn('Failed to restore previous registration session:', err);
          if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
        } finally {
          if (isMounted) setInitialLoading(false);
        }
      } else {
        if (isMounted) setInitialLoading(false);
      }
    };

    resumeExisting();

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [searchParams]);

  // ─── 2. Safe Debounced Auto-Save Trigger ───
  const triggerAutoSave = useCallback(
    (section: string, data: Record<string, any>) => {
      if (!registrationId) return;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      setSaveStatus('saving');
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          const res = await autoSaveRegistration({
            registrationId,
            section,
            data,
            rawFormData: {
              fullName,
              email,
              mobile,
              gender,
              city,
              profession,
              qualification: ugQualifications[0]?.qualification,
            },
          });

          if (res.success) {
            setSaveStatus('saved');
            setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setTimeout(() => setSaveStatus('idle'), 3000);
          } else {
            setSaveStatus('error');
          }
        } catch (err) {
          console.warn('Auto-save network notice:', err);
          setSaveStatus('error');
        }
      }, 900);
    },
    [registrationId, fullName, email, mobile, gender, city, profession, ugQualifications]
  );

  // Backup Form locally for resilience
  useEffect(() => {
    try {
      const backup = {
        fullName,
        email,
        mobile,
        gender,
        dob,
        city,
        motherTongue,
        caste,
        state,
        profession,
        qualification: ugQualifications[0]?.qualification,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      }
    } catch {
      // safe ignore
    }
  }, [fullName, email, mobile, gender, dob, city, motherTongue, caste, state, profession, ugQualifications]);

  // Reset form / Start Fresh
  const handleStartFresh = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
    }
    setRegistrationId('');
    setIsResumed(false);
    setCompletedSteps([]);
    setReturnToReview(false);
    setReviewMissingFields([]);
    setStep(1);
    setFullName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setConfirmPassword('');
    setDob('');
    setMaritalStatus('');
    setMotherTongue('');
    setReligion('');
    setCaste('');
    setState('');
    setCity('');
    setCitySearchInput('');
    setLocationData(null);
    setCitySuggestions([]);
    setShowCityDropdown(false);
    setAboutMe('');
    setFamilyType('');
    setFamilyStatus('');
    setFatherName('');
    setFatherProfession('');
    setMotherName('');
    setMotherProfession('');
    setBrothersCount(0);
    setSistersCount(0);
    setBrothers([]);
    setSisters([]);
    setUgQualifications([{ qualification: 'MBBS', college: '', passingYear: '', status: 'Completed' }]);
    setPgQualifications([]);
    setDoctorateQualifications([]);
    setProfession('');
    setCompany('');
    setWorkLocation('');
    setMedicalRegistrationNumber('');
    setMedicalExperience('');
    setPrefEducation('Any Medical Qualification');
    setPrefProfession('Any Specialization');
    setPhotoPreview(null);
    setUploadedPhotoUrl('');
    setGlobalError('');
    setStep1Errors({});
    setStep2Errors({});
    setStep3Errors({});
    setStep4Errors({});
  };

  // ─── Photo Upload Handler ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPhotoPreview(base64);

      setPhotoUploading(true);
      try {
        const res = await api.post('/upload/upload', {
          image: base64,
          filename: file.name,
        });

        const url = res.data?.data?.url || res.data?.url || base64;
        setUploadedPhotoUrl(url);

        if (registrationId) {
          triggerAutoSave('photos', { primaryPhoto: url, photos: [url] });
        }
      } catch (err: any) {
        console.warn('Upload API notice (fallback to preview base64):', err);
        setUploadedPhotoUrl(base64);
        if (registrationId) {
          triggerAutoSave('photos', { primaryPhoto: base64, photos: [base64] });
        }
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setUploadedPhotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (registrationId) {
      triggerAutoSave('photos', { primaryPhoto: '', photos: [] });
    }
  };

  // ─── STEP 1 SUBMIT: SAVE TO DATABASE ───
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errors: Record<string, string> = {};

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      errors.fullName = 'Please enter candidate full name (minimum 2 characters).';
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

    if (!isResumed || password) {
      if (!password) {
        errors.password = 'Password is required to secure your account.';
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        errors.password = 'Password must contain at least one uppercase letter and one number.';
      }

      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    if (!agreeTerms) {
      errors.agreeTerms = 'Please agree to the Terms of Service & Privacy Policy to continue.';
    }

    if (!dob || !dob.trim()) {
      errors.dob = 'Date of birth is required.';
    } else {
      const dobValidation = validateDateOfBirth(dob, gender);
      if (!dobValidation.isValid) {
        errors.dob = dobValidation.error || 'Date of birth year must be exactly 4 digits.';
      }
    }

    setStep1Errors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      let session: any = null;

      if (!registrationId) {
        session = await startRegistration({
          fullName: cleanName,
          email: email.trim().toLowerCase(),
          mobile: cleanMobile,
          password,
          gender,
          dob,
          lookingFor: gender === 'Female' ? 'Male' : 'Female',
          agreeTerms,
          referralCode: referralCode || undefined,
          rawFormData: {
            fullName: cleanName,
            email: email.trim().toLowerCase(),
            mobile: cleanMobile,
            gender,
            dob,
            referralCode: referralCode || undefined,
          },
        });
      } else {
        session = await saveRegistrationStep({
          registrationId,
          stepNumber: 2,
          section: 'basicInfo',
          data: {
            fullName: cleanName,
            email: email.trim().toLowerCase(),
            mobile: cleanMobile,
            password: password || undefined,
            gender,
            dob,
            lookingFor: gender === 'Female' ? 'Male' : 'Female',
            agreeTerms,
          },
          rawFormData: {
            fullName: cleanName,
            email: email.trim().toLowerCase(),
            mobile: cleanMobile,
            gender,
          },
        });
      }

      if (session?.registrationId) {
        setRegistrationId(session.registrationId);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, session.registrationId);
        }
      }

      setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));

      if (returnToReview) {
        setStep('review');
        setReturnToReview(false);
      } else {
        setStep(2);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        setGlobalError('This email or mobile is already registered with an active account. Please sign in instead.');
      } else {
        setGlobalError(msg || 'Could not save registration progress. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 2 SUBMIT: SAVE PERSONAL & FAMILY TO DATABASE ───
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errors: Record<string, string> = {};

    if (!maritalStatus) {
      errors.maritalStatus = 'Please select candidate marital status.';
    }
    if (!religion) {
      errors.religion = 'Please select religion.';
    }
    if (!state) {
      errors.state = 'Please select state / province of residence.';
    }
    if (!city) {
      errors.city = 'Please select city of residence.';
    }

    // Validate sibling ages
    brothers.forEach((b, idx) => {
      if (b.age && (isNaN(Number(b.age)) || Number(b.age) < 0 || Number(b.age) > 100)) {
        errors[`brother_age_${idx}`] = 'Enter a valid age (0-100).';
      }
    });
    sisters.forEach((s, idx) => {
      if (s.age && (isNaN(Number(s.age)) || Number(s.age) < 0 || Number(s.age) > 100)) {
        errors[`sister_age_${idx}`] = 'Enter a valid age (0-100).';
      }
    });

    setStep2Errors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      if (registrationId) {
        await saveRegistrationStep({
          registrationId,
          stepNumber: 3,
          section: 'personalInfo',
          data: {
            maritalStatus,
            motherTongue,
            religion,
            caste,
            height,
            city,
            state,
            country: 'India',
            location: locationData || {
              cityName: city,
              stateName: state,
              countryName: 'India',
            },
            about: aboutMe,
            aboutMe,
            personalityValues,
            hobbiesInterests,
            careerGoals,
            familyBackground: {
              familyType,
              familyStatus,
              fatherName,
              fatherProfession,
              motherName,
              motherProfession,
              familyLocation,
              familyValues,
              aboutFamily,
            },
            siblings: {
              brothersCount: Number(brothersCount) || brothers.length,
              sistersCount: Number(sistersCount) || sisters.length,
              brothers: brothers.map((b) => ({
                name: b.name.trim(),
                age: b.age ? Number(b.age) : undefined,
                profession: b.profession.trim(),
                maritalStatus: b.maritalStatus,
                location: b.location.trim(),
              })),
              sisters: sisters.map((s) => ({
                name: s.name.trim(),
                age: s.age ? Number(s.age) : undefined,
                profession: s.profession.trim(),
                maritalStatus: s.maritalStatus,
                location: s.location.trim(),
              })),
            },
          },
          rawFormData: {
            city,
            maritalStatus,
            religion,
            caste,
            aboutMe,
            personalityValues,
            hobbiesInterests,
            careerGoals,
            familyType,
            familyStatus,
            fatherName,
            fatherProfession,
            motherName,
            motherProfession,
            familyLocation,
            familyValues,
            aboutFamily,
          },
        });
      }
      setCompletedSteps((prev) => Array.from(new Set([...prev, 2])));

      if (returnToReview) {
        setStep('review');
        setReturnToReview(false);
      } else {
        setStep(3);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      setGlobalError(msg || 'Could not save personal details. Please check your selections.');
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 3 SUBMIT: SAVE MEDICAL EDUCATION & CAREER ───
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errors: Record<string, string> = {};

    // Validate UG qualifications
    if (!ugQualifications.length || !ugQualifications[0]?.qualification) {
      errors.ug_qual_0 = 'Undergraduate medical qualification is required.';
    }

    const currentYear = new Date().getFullYear();
    ugQualifications.forEach((q, idx) => {
      if (q.passingYear) {
        if (!/^\d{4}$/.test(q.passingYear) || Number(q.passingYear) > currentYear || Number(q.passingYear) < 1950) {
          errors[`ug_year_${idx}`] = `Year must be 4 digits between 1950 and ${currentYear}.`;
        }
      }
    });

    pgQualifications.forEach((q, idx) => {
      if (q.passingYear) {
        if (!/^\d{4}$/.test(q.passingYear) || Number(q.passingYear) > currentYear || Number(q.passingYear) < 1950) {
          errors[`pg_year_${idx}`] = `Year must be 4 digits between 1950 and ${currentYear}.`;
        }
      }
    });

    doctorateQualifications.forEach((q, idx) => {
      if (q.passingYear) {
        if (!/^\d{4}$/.test(q.passingYear) || Number(q.passingYear) > currentYear || Number(q.passingYear) < 1950) {
          errors[`doc_year_${idx}`] = `Year must be 4 digits between 1950 and ${currentYear}.`;
        }
      }
    });

    if (!profession) {
      errors.profession = 'Please select your medical specialization / practice.';
    }

    setStep3Errors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      if (registrationId) {
        const primaryUg = ugQualifications[0];
        await saveRegistrationStep({
          registrationId,
          stepNumber: 4,
          section: 'educationProfession',
          data: {
            education: primaryUg?.qualification || 'MBBS',
            degree: primaryUg?.qualification || 'MBBS',
            profession,
            company: company || workLocation || '',
            workLocation: workLocation || city,
            annualIncome,
            medicalRegistrationNumber,
            medicalCollege: primaryUg?.college || '',
            medicalExperience,
            medicalQualifications: {
              undergraduate: ugQualifications.map((u) => ({
                qualification: u.qualification,
                college: u.college.trim(),
                collegeId: u.collegeId,
                passingYear: u.passingYear.trim(),
                status: u.status,
              })),
              postgraduate: pgQualifications.filter((p) => p.qualification).map((p) => ({
                qualification: p.qualification,
                specialization: p.specialization.trim(),
                college: p.college.trim(),
                collegeId: p.collegeId,
                passingYear: p.passingYear.trim(),
                status: p.status,
              })),
              doctorate: doctorateQualifications.filter((d) => d.qualification).map((d) => ({
                qualification: d.qualification,
                specialization: d.specialization.trim(),
                college: d.college.trim(),
                collegeId: d.collegeId,
                passingYear: d.passingYear.trim(),
                status: d.status,
              })),
            },
          },
          rawFormData: {
            qualification: primaryUg?.qualification,
            profession,
            company,
            workLocation,
            medicalRegistrationNumber,
            medicalCollege: primaryUg?.college,
            medicalExperience,
          },
        });
      }
      setCompletedSteps((prev) => Array.from(new Set([...prev, 3])));

      if (returnToReview) {
        setStep('review');
        setReturnToReview(false);
      } else {
        setStep(4);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      setGlobalError(msg || 'Could not save medical qualification details. Please check your selections.');
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 4 SUBMIT: SAVE PREFERENCES & PROCEED TO REVIEW ───
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errors: Record<string, string> = {};

    if (prefAgeMin && prefAgeMax && Number(prefAgeMin) > Number(prefAgeMax)) {
      errors.prefAge = 'Minimum partner age cannot exceed maximum partner age.';
    }

    setStep4Errors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const finalPhoto = uploadedPhotoUrl || photoPreview || '';

      if (registrationId) {
        await saveRegistrationStep({
          registrationId,
          stepNumber: 4,
          section: 'preferences',
          data: {
            photos: {
              primaryPhoto: finalPhoto,
              photos: finalPhoto ? [finalPhoto] : [],
            },
            primaryPhoto: finalPhoto,
            partnerExpectations: {
              ageMin: Number(prefAgeMin) || 24,
              ageMax: Number(prefAgeMax) || 36,
              heightMin: prefHeightMin,
              heightMax: prefHeightMax,
              qualification: prefEducation,
              specialization: prefProfession,
              location: {
                country: prefCountry,
                state: prefState,
                city: prefCity,
              },
              willingToRelocate: prefWillingToRelocate,
              maritalStatus: prefMaritalStatus,
              lifestyle: {
                diet: prefDiet,
                smoking: prefSmoking,
                drinking: prefDrinking,
              },
              familyExpectations,
              additionalExpectations,
            },
            preferences: {
              lookingFor,
              prefAgeMin,
              prefAgeMax,
              prefCity: prefCity || 'All',
              prefDiet,
              prefEducation,
              prefProfession,
            },
          },
          rawFormData: {
            lookingFor,
            prefAgeMin,
            prefAgeMax,
            prefCity,
            prefDiet,
            prefEducation,
            prefProfession,
            primaryPhoto: finalPhoto,
          },
        });

        // Run server-side validation to prepare missing fields for review
        try {
          const valRes = await validateRegistrationSession(registrationId);
          if (valRes && valRes.missingFields) {
            setReviewMissingFields(valRes.missingFields);
          }
        } catch (valErr) {
          console.warn('Pre-review validation notice:', valErr);
        }
      }

      setCompletedSteps((prev) => Array.from(new Set([...prev, 4])));
      setReturnToReview(false);
      setStep('review');
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      setGlobalError(msg || 'Could not save partner preferences. Please check your selections.');
    } finally {
      setLoading(false);
    }
  };

  // ─── FINAL SUBMIT: COMPLETE REGISTRATION FROM REVIEW PAGE ───
  const handleFinalSubmission = async () => {
    setGlobalError('');
    setLoading(true);
    try {
      if (!registrationId) {
        setGlobalError('Registration session ID is missing. Please restart registration.');
        setLoading(false);
        return;
      }

      // Check backend validation first
      try {
        const valRes = await validateRegistrationSession(registrationId);
        if (!valRes.isValid && valRes.missingFields && valRes.missingFields.length > 0) {
          setReviewMissingFields(valRes.missingFields);
          setGlobalError('Please complete all required fields before final submission.');
          setLoading(false);
          return;
        }
      } catch (valErr) {
        console.warn('Server validation check notice:', valErr);
      }

      const finalPhoto = uploadedPhotoUrl || photoPreview || '';

      const finalResult = await completeRegistration({
        registrationId,
        referralCode: referralCode || undefined,
        finalData: {
          agreeTerms: true,
          termsAccepted: true,
          referralCode: referralCode || undefined,
          partnerExpectations: {
            ageMin: Number(prefAgeMin) || 24,
            ageMax: Number(prefAgeMax) || 36,
            heightMin: prefHeightMin,
            heightMax: prefHeightMax,
            qualification: prefEducation,
            specialization: prefProfession,
            location: {
              country: prefCountry,
              state: prefState,
              city: prefCity,
            },
            willingToRelocate: prefWillingToRelocate,
            maritalStatus: prefMaritalStatus,
            lifestyle: {
              diet: prefDiet,
              smoking: prefSmoking,
              drinking: prefDrinking,
            },
            familyExpectations,
            additionalExpectations,
          },
          preferences: {
            lookingFor,
            prefAgeMin,
            prefAgeMax,
            prefCity: prefCity || 'All',
            prefDiet,
            prefEducation,
            prefProfession,
          },
          photos: {
            primaryPhoto: finalPhoto,
            photos: finalPhoto ? [finalPhoto] : [],
          },
          primaryPhoto: finalPhoto,
        },
      });

      if (finalResult.token) {
        setAuthToken(finalResult.token);
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(BACKUP_KEY);
      }

      setStep('complete');
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered') || msg.toLowerCase().includes('finalized')) {
        setGlobalError('This registration has already been finalized. Please sign in to your account.');
      } else {
        setGlobalError(msg || 'Failed to finalize registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <main className="min-h-screen w-full bg-[#FAF7F4] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#E51F3E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading registration portal...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-h-[100dvh] w-full bg-[#FAF7F4] py-6 sm:py-10 md:py-12 px-3.5 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Terms & Privacy Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-rose-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-serif text-lg font-bold text-slate-900">Terms of Service & Privacy</h3>
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2.5 max-h-80 overflow-y-auto pr-1 leading-relaxed">
              <p>
                <strong>1. Verified Doctor Platform:</strong> Wonderful Jodi is an exclusive matrimonial portal
                tailored specifically for verified medical doctors, clinicians, surgeons, and healthcare specialists.
              </p>
              <p>
                <strong>2. Accurate Medical Credentials:</strong> By registering, you confirm that the educational
                degrees, registration numbers, and medical credentials you submit are genuine and belong to you.
              </p>
              <p>
                <strong>3. Privacy Protection:</strong> We employ strict data encryption and access controls. Your
                contact numbers and government IDs are never revealed without your explicit mutual consent.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#E51F3E] text-white font-bold text-xs shadow-md"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative Outer Background Motifs (Lower Layer, z-0) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(229, 31, 62, 0.18) 0%, rgba(201, 162, 39, 0.12) 50%, transparent 75%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(16, 24, 40, 0.12) 0%, rgba(229, 31, 62, 0.12) 60%, transparent 75%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden">
        {/* Top Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#3B0728] text-white px-6 sm:px-8 py-6 sm:py-7 border-b border-white/10">
          {/* Decorative Medical & Stethoscope Background Artwork (Lower layer, z-0) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Subtle Ambient Radial Glow */}
            <div
              className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(229, 31, 62, 0.35) 0%, rgba(197, 160, 89, 0.15) 50%, transparent 75%)',
                filter: 'blur(32px)',
              }}
            />
            {/* Subtle ECG Heartbeat Pulse Line */}
            <svg
              className="absolute bottom-0 left-0 right-0 w-full h-12 text-rose-400/15 pointer-events-none"
              viewBox="0 0 1200 120"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              preserveAspectRatio="none"
            >
              <path d="M0,60 L280,60 L300,60 L310,25 L320,100 L330,10 L340,85 L350,60 L370,60 L600,60 L620,60 L630,25 L640,100 L650,10 L660,85 L670,60 L690,60 L920,60 L940,60 L950,25 L960,100 L970,10 L980,85 L990,60 L1010,60 L1200,60" />
            </svg>
            {/* Large Decorative Stethoscope Artwork (visible, ~0.16 opacity, responsive) */}
            <div className="absolute -right-4 -bottom-4 opacity-16 sm:opacity-20 text-rose-200 pointer-events-none flex items-center justify-end">
              <Stethoscope className="w-52 h-52 sm:w-64 sm:h-64 transform rotate-12" strokeWidth={1.5} />
            </div>
          </div>

          {/* Banner Upper Content Layer (z-10) */}
          <div className="relative z-10 flex flex-col gap-4">
            {/* Top Brand Bar: Logo & Trust Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
              <Logo size="md" variant="dark" subtitle="Doctor Matrimony" />

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-200 text-[11px] font-semibold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Verified Doctors Only</span>
                </div>
                {registrationId && Number(step) < 5 && (
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-right shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-semibold text-rose-200 tracking-wider">ID:</span>
                    <span className="text-xs font-mono font-bold text-amber-300">{registrationId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="pt-0.5">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Candidate Registration
              </h1>
              <p className="text-xs sm:text-sm text-slate-200/90 mt-1 max-w-xl leading-relaxed">
                Where Compassion Meets Compatibility. Join India&apos;s most trusted matrimonial platform designed exclusively for doctors and medical specialists.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body Container */}
        <div className="p-5 sm:p-8 bg-[#FAF7F4]">
          {/* Status / Resume Bar */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                {step === 1 && '1. Account & Contact Credentials'}
                {step === 2 && '2. Personal & Family Background'}
                {step === 3 && '3. Medical Education & Career Practice'}
                {step === 4 && '4. Photo & Partner Expectations'}
                {step === 'review' && 'Review & Confirm Registration'}
                {(step === 'complete' || step === 5) && 'Registration Complete!'}
              </h2>
              {step === 'review' && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify all information across all 4 steps before final doctor registration.
                </p>
              )}
            </div>

            {step !== 'complete' && step !== 5 && (
              <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Auto-saving...</span>
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-fade-in">
                    <Check className="w-3 h-3" />
                    <span>Saved in DB</span>
                  </span>
                )}
                {isResumed && (
                  <button
                    type="button"
                    onClick={handleStartFresh}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Start Fresh</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Interactive 4-Step Progress Indicator */}
          {step !== 'complete' && step !== 5 && (
            <div className="mb-6 pb-4 border-b border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { num: 1, label: 'Account & Contact' },
                  { num: 2, label: 'Personal & Family' },
                  { num: 3, label: 'Education & Career' },
                  { num: 4, label: 'Photo & Preferences' },
                ].map((s) => {
                  const isCurrent = step === s.num;
                  const isCompleted = completedSteps.includes(s.num) || (typeof step === 'number' && step > s.num) || step === 'review';
                  const isClickable = isCompleted;

                  return (
                    <button
                      key={s.num}
                      type="button"
                      disabled={!isClickable}
                      onClick={() => {
                        if (isClickable) {
                          if (step === 'review') setReturnToReview(true);
                          setStep(s.num as RegistrationStep);
                        }
                      }}
                      className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? 'border-[#E51F3E] bg-rose-50/70 text-[#E51F3E] shadow-2xs'
                          : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer'
                          : 'border-slate-200 bg-slate-50/60 text-slate-400 cursor-not-allowed opacity-75'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isCurrent
                            ? 'bg-[#E51F3E] text-white shadow-2xs'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          s.num
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold block uppercase tracking-wider opacity-75">
                          Step {s.num}
                        </span>
                        <span className="text-xs font-bold truncate block leading-tight">
                          {s.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {globalError && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-[#E51F3E] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice</p>
                <p className="mt-0.5">{globalError}</p>
                {globalError.includes('already') && (
                  <Link href="/login" className="font-bold underline text-[#E51F3E] mt-1 inline-block">
                    Click here to Sign In →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              ── STEP 1: ACCOUNT & CONTACT FORM ──
             ══════════════════════════════════════════════════════ */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (step1Errors.fullName) setStep1Errors({ ...step1Errors, fullName: '' });
                      triggerAutoSave('basicInfo', { fullName: e.target.value });
                    }}
                    placeholder="e.g. Dr. Rahul Sharma"
                    className={`w-full h-[48px] rounded-[12px] border ${
                      step1Errors.fullName ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                    } px-4 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/10 transition`}
                  />
                  {step1Errors.fullName && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.fullName}</p>
                  )}
                </div>

                {/* Email Address & Mobile Number in 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        triggerAutoSave('basicInfo', { email: e.target.value });
                      }}
                      placeholder="you@example.com"
                      className={`w-full h-[48px] rounded-[12px] border ${
                        step1Errors.email ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                      } px-3.5 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/10 transition`}
                    />
                    {step1Errors.email && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Mobile Number *
                    </label>
                    <div className="flex items-center rounded-[12px] border border-[#DCE3EC] bg-white overflow-hidden focus-within:border-[#E51F3E] focus-within:ring-2 focus-within:ring-[#E51F3E]/10 transition">
                      <span className="px-3 py-2.5 text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => {
                          setMobile(e.target.value);
                          if (step1Errors.mobile) setStep1Errors({ ...step1Errors, mobile: '' });
                          triggerAutoSave('basicInfo', { mobile: e.target.value });
                        }}
                        placeholder="9876543210"
                        className="w-full h-[46px] px-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none bg-transparent"
                      />
                    </div>
                    {step1Errors.mobile && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.mobile}</p>
                    )}
                  </div>
                </div>

                {/* Gender & DOB in 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Candidate Gender *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGender('Female');
                          setLookingFor('Male');
                          triggerAutoSave('basicInfo', { gender: 'Female', lookingFor: 'Male' });
                        }}
                        className={`h-[46px] rounded-xl text-xs font-bold border transition ${
                          gender === 'Female'
                            ? 'border-[#E51F3E] bg-rose-50/60 text-[#E51F3E]'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        Bride (Female)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGender('Male');
                          setLookingFor('Female');
                          triggerAutoSave('basicInfo', { gender: 'Male', lookingFor: 'Female' });
                        }}
                        className={`h-[46px] rounded-xl text-xs font-bold border transition ${
                          gender === 'Male'
                            ? 'border-[#E51F3E] bg-rose-50/60 text-[#E51F3E]'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        Groom (Male)
                      </button>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <DobInput
                      label="Date of Birth"
                      value={dob}
                      gender={gender}
                      required={true}
                      error={step1Errors.dob}
                      onChange={(newDob, isValid) => {
                        setDob(newDob);
                        if (step1Errors.dob) {
                          setStep1Errors((prev) => ({ ...prev, dob: '' }));
                        }
                        if (isValid && newDob) {
                          triggerAutoSave('basicInfo', { dob: newDob });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">Password *</label>
                      {password && (
                        <span className="text-[10px] font-bold text-slate-500">
                          {passwordStrength.label}
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
                        placeholder="Min 8 chars, 1 uppercase & 1 number"
                        className={`w-full h-[48px] rounded-[12px] border ${
                          step1Errors.password ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                        } pl-3.5 pr-10 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/10 transition`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {step1Errors.password && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.password}</p>
                    )}
                  </div>

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
                        placeholder="Re-enter password"
                        className={`w-full h-[48px] rounded-[12px] border ${
                          step1Errors.confirmPassword
                            ? 'border-rose-500 bg-rose-50/20'
                            : confirmPassword && password === confirmPassword
                            ? 'border-emerald-400 bg-emerald-50/10'
                            : 'border-[#DCE3EC] bg-white'
                        } pl-3.5 pr-10 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/10 transition`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {step1Errors.confirmPassword && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div>
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="agree-terms-checkbox"
                      checked={agreeTerms}
                      onChange={(e) => {
                        setAgreeTerms(e.target.checked);
                        if (step1Errors.agreeTerms) setStep1Errors({ ...step1Errors, agreeTerms: '' });
                        triggerAutoSave('basicInfo', { agreeTerms: e.target.checked });
                      }}
                      className="mt-0.5 rounded border-slate-300 text-[#E51F3E] focus:ring-[#E51F3E]"
                    />
                    <span>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setTermsModalOpen(true)}
                        className="font-bold text-[#E51F3E] hover:underline"
                      >
                        Terms of Service & Privacy Policy
                      </button>{' '}
                      for doctor matchmaking.
                    </span>
                  </label>
                  {step1Errors.agreeTerms && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.agreeTerms}</p>
                  )}
                </div>
              </div>

              {/* Submit / Navigation Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/"
                  className="w-full sm:w-auto px-5 h-[48px] rounded-[12px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Back to Home</span>
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 h-[50px] rounded-[14px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md shadow-red-500/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving to Database...</span>
                    </>
                  ) : returnToReview ? (
                    <span>Save & Return to Review →</span>
                  ) : (
                    <span>Save & Continue →</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════
              ── STEP 2: PERSONAL, ABOUT ME & FAMILY BACKGROUND ──
             ══════════════════════════════════════════════════════ */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-5">
              {/* CARD 1: Personal & Cultural Details */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Personal & Cultural Details</h3>
                    <p className="text-[11px] text-slate-500">Marital status, community roots, and location.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Marital Status *
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => {
                        setMaritalStatus(e.target.value);
                        if (step2Errors.maritalStatus) setStep2Errors((prev) => ({ ...prev, maritalStatus: '' }));
                        triggerAutoSave('personalInfo', { maritalStatus: e.target.value });
                      }}
                      className={`w-full h-[46px] rounded-[12px] border ${
                        step2Errors.maritalStatus ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                      } px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]`}
                    >
                      <option value="" disabled>Select Marital Status *</option>
                      {MARITAL_STATUSES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    {step2Errors.maritalStatus && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step2Errors.maritalStatus}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Mother Tongue
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="mother-tongue-list"
                        value={motherTongue}
                        onChange={(e) => {
                          setMotherTongue(e.target.value);
                          triggerAutoSave('personalInfo', { motherTongue: e.target.value });
                        }}
                        placeholder="Select Mother Tongue"
                        className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                      />
                      <datalist id="mother-tongue-list">
                        {languagesList.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Religion *
                    </label>
                    <select
                      value={religion}
                      onChange={(e) => {
                        setReligion(e.target.value);
                        if (step2Errors.religion) setStep2Errors((prev) => ({ ...prev, religion: '' }));
                        triggerAutoSave('personalInfo', { religion: e.target.value });
                      }}
                      className={`w-full h-[46px] rounded-[12px] border ${
                        step2Errors.religion ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                      } px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]`}
                    >
                      <option value="" disabled>Select Religion *</option>
                      {RELIGIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {step2Errors.religion && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step2Errors.religion}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Caste / Community
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="caste-community-list"
                        value={caste}
                        onChange={(e) => {
                          setCaste(e.target.value);
                          triggerAutoSave('personalInfo', { caste: e.target.value });
                        }}
                        placeholder="Select Caste / Community"
                        className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                      />
                      <datalist id="caste-community-list">
                        {castesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Height
                    </label>
                    <select
                      value={height}
                      onChange={(e) => {
                        setHeight(e.target.value);
                        triggerAutoSave('personalInfo', { height: e.target.value });
                      }}
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    >
                      {HEIGHT_OPTIONS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. STATE / PROVINCE (Hierarchy Apex) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      State / Province *
                    </label>
                    <select
                      value={state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className={`w-full h-[46px] rounded-[12px] border ${
                        step2Errors.state ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                      } px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]`}
                    >
                      <option value="">Select State / Province *</option>
                      {statesList.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    {step2Errors.state && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step2Errors.state}</p>
                    )}
                  </div>

                  {/* 2. CITY OF RESIDENCE (Backend-driven Suggestions filtered by State) */}
                  <div className="relative" ref={cityDropdownRef}>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      City of Residence *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={!state}
                        value={citySearchInput}
                        onChange={(e) => handleCitySearchChange(e.target.value)}
                        onFocus={() => {
                          if (state) {
                            setShowCityDropdown(true);
                            if (citySuggestions.length === 0 && !loadingCitySuggestions) {
                              handleCitySearchChange(citySearchInput);
                            }
                          }
                        }}
                        placeholder={state ? "Enter or search city name..." : "Select State first..."}
                        className={`w-full h-[46px] rounded-[12px] border ${
                          step2Errors.city ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                        } pl-3.5 pr-9 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed`}
                      />
                      {loadingCitySuggestions ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        </div>
                      ) : citySearchInput ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCity('');
                            setCitySearchInput('');
                            setLocationData(null);
                            setCitySuggestions([]);
                            triggerAutoSave('personalInfo', { city: '', location: null });
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {step2Errors.city && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step2Errors.city}</p>
                    )}

                    {/* Verified Location Hierarchy Snapshot Pill */}
                    {locationData?.cityName && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>
                          <strong>{locationData.cityName}</strong>
                          {locationData.districtName ? `, ${locationData.districtName}` : ''}
                          {locationData.pinCode ? ` (PIN: ${locationData.pinCode})` : ''}
                          {locationData.officialCode ? ` • LGD: ${locationData.officialCode}` : ''}
                        </span>
                      </div>
                    )}

                    {/* Backend-driven Suggestions Dropdown */}
                    {showCityDropdown && state && (
                      <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl divide-y divide-slate-100">
                        {loadingCitySuggestions && citySuggestions.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E51F3E]" />
                            <span>Searching locations in {state}...</span>
                          </div>
                        ) : citySuggestions.length > 0 ? (
                          citySuggestions.map((sugg) => {
                            const districtName = typeof sugg.districtId === 'object' ? sugg.districtId?.name : '';
                            return (
                              <button
                                key={sugg._id}
                                type="button"
                                onClick={() => handleSelectCity(sugg)}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50/60 transition flex items-center justify-between group cursor-pointer"
                              >
                                <div>
                                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#E51F3E] block">
                                    {sugg.name}
                                  </span>
                                  {districtName && (
                                    <span className="text-[10px] text-slate-400 block">
                                      District: {districtName}
                                    </span>
                                  )}
                                </div>
                                {sugg.pincode && (
                                  <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                                    PIN: {sugg.pincode}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">
                            {citySearchInput.trim() ? (
                              <div>
                                <p>No master locations found matching &quot;{citySearchInput}&quot; in {state}.</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCity(citySearchInput.trim());
                                    setShowCityDropdown(false);
                                    triggerAutoSave('personalInfo', { city: citySearchInput.trim() });
                                  }}
                                  className="mt-1 text-[#E51F3E] font-bold text-[11px] underline cursor-pointer"
                                >
                                  Use &quot;{citySearchInput.trim()}&quot; as custom city
                                </button>
                              </div>
                            ) : (
                              <span>No locations found in {state}.</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: About Me (Subsection A) */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">About Me</h3>
                    <p className="text-[11px] text-slate-500">Personality, values, hobbies, and personal aspirations.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    About Me
                  </label>
                  <textarea
                    rows={3}
                    value={aboutMe}
                    onChange={(e) => {
                      setAboutMe(e.target.value);
                      triggerAutoSave('personalInfo', { aboutMe: e.target.value, about: e.target.value });
                    }}
                    placeholder="Describe yourself, your passion for medicine, your life philosophy..."
                    className="w-full rounded-[12px] border border-[#DCE3EC] bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Personality and Values
                    </label>
                    <textarea
                      rows={2}
                      value={personalityValues}
                      onChange={(e) => {
                        setPersonalityValues(e.target.value);
                        triggerAutoSave('personalInfo', { personalityValues: e.target.value });
                      }}
                      placeholder="e.g. Grounded, empathetic, family-oriented, culturally rooted..."
                      className="w-full rounded-[12px] border border-[#DCE3EC] bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Hobbies and Interests
                    </label>
                    <textarea
                      rows={2}
                      value={hobbiesInterests}
                      onChange={(e) => {
                        setHobbiesInterests(e.target.value);
                        triggerAutoSave('personalInfo', { hobbiesInterests: e.target.value });
                      }}
                      placeholder="e.g. Classical music, marathon running, travel, reading medical journals..."
                      className="w-full rounded-[12px] border border-[#DCE3EC] bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Career and Life Goals
                  </label>
                  <textarea
                    rows={2}
                    value={careerGoals}
                    onChange={(e) => {
                      setCareerGoals(e.target.value);
                      triggerAutoSave('personalInfo', { careerGoals: e.target.value });
                    }}
                    placeholder="e.g. Super-specializing in Interventional Cardiology, establishing a clinic..."
                    className="w-full rounded-[12px] border border-[#DCE3EC] bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              {/* CARD 3: Family Background (Subsection B) */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Family Background</h3>
                    <p className="text-[11px] text-slate-500">Parents, family status, values, and origin.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Family Type
                    </label>
                    <select
                      value={familyType}
                      onChange={(e) => {
                        setFamilyType(e.target.value);
                        triggerAutoSave('familyDetails', { familyType: e.target.value });
                      }}
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="">Select Family Type (Optional)</option>
                      <option value="Nuclear Family">Nuclear Family</option>
                      <option value="Joint Family">Joint Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Family Status
                    </label>
                    <select
                      value={familyStatus}
                      onChange={(e) => {
                        setFamilyStatus(e.target.value);
                        triggerAutoSave('familyDetails', { familyStatus: e.target.value });
                      }}
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="">Select Family Status (Optional)</option>
                      <option value="Middle Class">Middle Class</option>
                      <option value="Upper Middle Class">Upper Middle Class</option>
                      <option value="Affluent">Affluent</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => {
                        setFatherName(e.target.value);
                        triggerAutoSave('familyDetails', { fatherName: e.target.value });
                      }}
                      placeholder="e.g. Dr. Ramesh Sharma"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Father's Profession
                    </label>
                    <input
                      type="text"
                      value={fatherProfession}
                      onChange={(e) => {
                        setFatherProfession(e.target.value);
                        triggerAutoSave('familyDetails', { fatherProfession: e.target.value });
                      }}
                      placeholder="e.g. Senior Surgeon, Civil Engineer, Retired"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => {
                        setMotherName(e.target.value);
                        triggerAutoSave('familyDetails', { motherName: e.target.value });
                      }}
                      placeholder="e.g. Sunita Sharma"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Mother's Profession
                    </label>
                    <input
                      type="text"
                      value={motherProfession}
                      onChange={(e) => {
                        setMotherProfession(e.target.value);
                        triggerAutoSave('familyDetails', { motherProfession: e.target.value });
                      }}
                      placeholder="e.g. Doctor, Professor, Homemaker"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Family Location / Native Place
                    </label>
                    <input
                      type="text"
                      value={familyLocation}
                      onChange={(e) => {
                        setFamilyLocation(e.target.value);
                        triggerAutoSave('familyDetails', { familyLocation: e.target.value });
                      }}
                      placeholder="e.g. Pune, Maharashtra"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Family Values
                    </label>
                    <input
                      type="text"
                      value={familyValues}
                      onChange={(e) => {
                        setFamilyValues(e.target.value);
                        triggerAutoSave('familyDetails', { familyValues: e.target.value });
                      }}
                      placeholder="e.g. Moderate, Traditional, Liberal"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    About Family
                  </label>
                  <textarea
                    rows={2}
                    value={aboutFamily}
                    onChange={(e) => {
                      setAboutFamily(e.target.value);
                      triggerAutoSave('familyDetails', { aboutFamily: e.target.value });
                    }}
                    placeholder="Brief background about your family members, ancestral roots, or values..."
                    className="w-full rounded-[12px] border border-[#DCE3EC] bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              {/* CARD 4: Brother & Sister Details */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Brother & Sister Details</h3>
                    <p className="text-[11px] text-slate-500">Provide sibling counts and optional detailed profiles.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Brothers Count & Dynamic List */}
                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Number of Brothers
                      </label>
                      <select
                        value={brothersCount}
                        onChange={(e) => {
                          const count = parseInt(e.target.value, 10);
                          setBrothersCount(count);
                          setBrothers((prev) => {
                            if (count === 0) return [];
                            if (count > prev.length) {
                              const added = Array.from({ length: count - prev.length }, () => ({
                                name: '',
                                age: '',
                                profession: '',
                                maritalStatus: 'Unmarried',
                                location: '',
                              }));
                              return [...prev, ...added];
                            }
                            return prev.slice(0, count);
                          });
                        }}
                        className="h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800"
                      >
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n} Brother{n === 1 ? '' : 's'}</option>
                        ))}
                      </select>
                    </div>

                    {brothers.map((brother, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span>Brother #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBrothers((prev) => prev.filter((_, i) => i !== idx));
                              setBrothersCount((prev) => Math.max(0, prev - 1));
                            }}
                            className="text-rose-500 hover:text-rose-700 flex items-center gap-0.5 text-[10px]"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Brother's Name"
                            value={brother.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBrothers((prev) => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Age"
                            value={brother.age}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBrothers((prev) => prev.map((item, i) => i === idx ? { ...item, age: val } : item));
                            }}
                            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Profession (e.g. Doctor, SDE)"
                            value={brother.profession}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBrothers((prev) => prev.map((item, i) => i === idx ? { ...item, profession: val } : item));
                            }}
                            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                          />
                          <select
                            value={brother.maritalStatus}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBrothers((prev) => prev.map((item, i) => i === idx ? { ...item, maritalStatus: val } : item));
                            }}
                            className="h-9 px-2 rounded-lg border border-slate-200 text-xs"
                          >
                            <option value="Unmarried">Unmarried</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Living Location (e.g. Pune, USA)"
                          value={brother.location}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBrothers((prev) => prev.map((item, i) => i === idx ? { ...item, location: val } : item));
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                        />
                        {step2Errors[`brother_age_${idx}`] && (
                          <p className="text-[10px] text-rose-600 font-medium">{step2Errors[`brother_age_${idx}`]}</p>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setBrothers((prev) => [
                          ...prev,
                          { name: '', age: '', profession: '', maritalStatus: 'Unmarried', location: '' },
                        ]);
                        setBrothersCount((prev) => Math.max(prev, brothers.length + 1));
                      }}
                      className="w-full py-2 rounded-lg border border-dashed border-rose-300 text-[#E51F3E] bg-white hover:bg-rose-50/50 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Brother</span>
                    </button>
                  </div>

                  {/* Sisters Count & Dynamic List */}
                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Number of Sisters
                      </label>
                      <select
                        value={sistersCount}
                        onChange={(e) => {
                          const count = parseInt(e.target.value, 10);
                          setSistersCount(count);
                          setSisters((prev) => {
                            if (count === 0) return [];
                            if (count > prev.length) {
                              const added = Array.from({ length: count - prev.length }, () => ({
                                name: '',
                                age: '',
                                profession: '',
                                maritalStatus: 'Unmarried',
                                location: '',
                              }));
                              return [...prev, ...added];
                            }
                            return prev.slice(0, count);
                          });
                        }}
                        className="h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800"
                      >
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n} Sister{n === 1 ? '' : 's'}</option>
                        ))}
                      </select>
                    </div>

                    {sisters.map((sister, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span>Sister #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSisters((prev) => prev.filter((_, i) => i !== idx));
                              setSistersCount((prev) => Math.max(0, prev - 1));
                            }}
                            className="text-rose-500 hover:text-rose-700 flex items-center gap-0.5 text-[10px]"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Sister's Name"
                            value={sister.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSisters((prev) => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Age"
                            value={sister.age}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSisters((prev) => prev.map((item, i) => i === idx ? { ...item, age: val } : item));
                            }}
                            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Profession (e.g. Doctor, Architect)"
                            value={sister.profession}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSisters((prev) => prev.map((item, i) => i === idx ? { ...item, profession: val } : item));
                            }}
                            className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                          />
                          <select
                            value={sister.maritalStatus}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSisters((prev) => prev.map((item, i) => i === idx ? { ...item, maritalStatus: val } : item));
                            }}
                            className="h-9 px-2 rounded-lg border border-slate-200 text-xs"
                          >
                            <option value="Unmarried">Unmarried</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Living Location (e.g. Mumbai, UK)"
                          value={sister.location}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSisters((prev) => prev.map((item, i) => i === idx ? { ...item, location: val } : item));
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs"
                        />
                        {step2Errors[`sister_age_${idx}`] && (
                          <p className="text-[10px] text-rose-600 font-medium">{step2Errors[`sister_age_${idx}`]}</p>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setSisters((prev) => [
                          ...prev,
                          { name: '', age: '', profession: '', maritalStatus: 'Unmarried', location: '' },
                        ]);
                        setSistersCount((prev) => Math.max(prev, sisters.length + 1));
                      }}
                      className="w-full py-2 rounded-lg border border-dashed border-rose-300 text-[#E51F3E] bg-white hover:bg-rose-50/50 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Sister</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-6 h-[48px] rounded-[12px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 h-[48px] rounded-[12px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : returnToReview ? (
                    <span>Save & Return to Review →</span>
                  ) : (
                    <span>Save & Continue →</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════
              ── STEP 3: MEDICAL EDUCATION & CAREER PRACTICE ──
             ══════════════════════════════════════════════════════ */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-5">
              {/* CARD 1: Medical Education & Qualifications */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Medical Education & Qualifications</h3>
                    <p className="text-[11px] text-slate-500">
                      Undergraduate, postgraduate, and super-specialization credentials.
                    </p>
                  </div>
                </div>

                {/* Section A: Undergraduate (UG) Qualifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      A. Undergraduate Medical Qualification (UG) *
                    </span>
                    <span className="text-[11px] text-slate-400">MBBS, BDS, BAMS, etc.</span>
                  </div>

                  {ugQualifications.map((ug, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">UG Degree #{idx + 1}</span>
                        {ugQualifications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setUgQualifications((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            UG Qualification *
                          </label>
                          <select
                            value={ug.qualification}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, qualification: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          >
                            {UG_MEDICAL_QUALIFICATIONS.map((q) => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Completion Status
                          </label>
                          <select
                            value={ug.status}
                            onChange={(e) => {
                              const val = e.target.value as 'Completed' | 'Pursuing';
                              setUgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, status: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          >
                            {DEGREE_COMPLETION_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <InstitutionAutocomplete
                            label="College / University Name"
                            value={ug.college}
                            institutionId={ug.collegeId}
                            onChange={(collegeName, collegeId) => {
                              setUgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, college: collegeName, collegeId } : item)
                              );
                            }}
                            placeholder="Type to search college (e.g. Grant Medical, AIIMS)"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Passing Year
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="YYYY"
                            value={ug.passingYear}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setUgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, passingYear: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder-slate-400"
                          />
                          {step3Errors[`ug_year_${idx}`] && (
                            <p className="text-[10px] text-rose-600 font-medium mt-1">{step3Errors[`ug_year_${idx}`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setUgQualifications((prev) => [
                        ...prev,
                        { qualification: 'MBBS', college: '', passingYear: '', status: 'Completed' },
                      ]);
                    }}
                    className="py-2 px-3 rounded-xl border border-dashed border-rose-300 text-[#E51F3E] bg-white hover:bg-rose-50/50 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add another UG qualification</span>
                  </button>
                </div>

                {/* Section B: Postgraduate (PG) Qualifications */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      B. Postgraduate Medical Qualification (PG)
                    </span>
                    <span className="text-[11px] text-slate-400">MD, MS, DNB, MDS (Optional)</span>
                  </div>

                  {pgQualifications.map((pg, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">PG Degree #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setPgQualifications((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            PG Qualification
                          </label>
                          <select
                            value={pg.qualification}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, qualification: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          >
                            <option value="">Select PG Qualification</option>
                            {PG_MEDICAL_QUALIFICATIONS.map((q) => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Specialization
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. General Medicine, Orthopedics"
                            value={pg.specialization}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, specialization: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Completion Status
                          </label>
                          <select
                            value={pg.status}
                            onChange={(e) => {
                              const val = e.target.value as 'Completed' | 'Pursuing';
                              setPgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, status: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          >
                            {DEGREE_COMPLETION_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <InstitutionAutocomplete
                            label="College / University Name"
                            value={pg.college}
                            institutionId={pg.collegeId}
                            onChange={(collegeName, collegeId) => {
                              setPgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, college: collegeName, collegeId } : item)
                              );
                            }}
                            placeholder="Search medical college / institute"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Passing Year
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="YYYY"
                            value={pg.passingYear}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setPgQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, passingYear: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          />
                          {step3Errors[`pg_year_${idx}`] && (
                            <p className="text-[10px] text-rose-600 font-medium mt-1">{step3Errors[`pg_year_${idx}`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setPgQualifications((prev) => [
                        ...prev,
                        { qualification: 'MD', specialization: '', college: '', passingYear: '', status: 'Completed' },
                      ]);
                    }}
                    className="py-2 px-3 rounded-xl border border-dashed border-rose-300 text-[#E51F3E] bg-white hover:bg-rose-50/50 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Postgraduate (PG) Qualification</span>
                  </button>
                </div>

                {/* Section C: Doctorate / Super-Specialization */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      C. Doctorate / Super-Specialization
                    </span>
                    <span className="text-[11px] text-slate-400">DM, MCh, Fellowship, PhD (Optional)</span>
                  </div>

                  {doctorateQualifications.map((doc, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Doctorate Degree #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setDoctorateQualifications((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Doctorate Qualification
                          </label>
                          <select
                            value={doc.qualification}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDoctorateQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, qualification: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          >
                            <option value="">Select Doctorate</option>
                            {DOCTORATE_MEDICAL_QUALIFICATIONS.map((q) => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Super-Specialization
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Cardiology, Neurosurgery"
                            value={doc.specialization}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDoctorateQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, specialization: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Completion Status
                          </label>
                          <select
                            value={doc.status}
                            onChange={(e) => {
                              const val = e.target.value as 'Completed' | 'Pursuing';
                              setDoctorateQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, status: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          >
                            {DEGREE_COMPLETION_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <InstitutionAutocomplete
                            label="College / University Name"
                            value={doc.college}
                            institutionId={doc.collegeId}
                            onChange={(collegeName, collegeId) => {
                              setDoctorateQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, college: collegeName, collegeId } : item)
                              );
                            }}
                            placeholder="Search super-specialty institute / hospital"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Passing Year
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="YYYY"
                            value={doc.passingYear}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setDoctorateQualifications((prev) =>
                                prev.map((item, i) => i === idx ? { ...item, passingYear: val } : item)
                              );
                            }}
                            className="w-full h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                          />
                          {step3Errors[`doc_year_${idx}`] && (
                            <p className="text-[10px] text-rose-600 font-medium mt-1">{step3Errors[`doc_year_${idx}`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setDoctorateQualifications((prev) => [
                        ...prev,
                        { qualification: 'DM', specialization: '', college: '', passingYear: '', status: 'Completed' },
                      ]);
                    }}
                    className="py-2 px-3 rounded-xl border border-dashed border-rose-300 text-[#E51F3E] bg-white hover:bg-rose-50/50 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Doctorate / Super-Specialization</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: Career & Medical Practice */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Career & Medical Practice</h3>
                    <p className="text-[11px] text-slate-500">Current hospital, practice type, experience, and registration.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Medical Specialization / Practice *
                  </label>
                  <select
                    value={profession}
                    onChange={(e) => {
                      setProfession(e.target.value);
                      if (step3Errors.profession) setStep3Errors((prev) => ({ ...prev, profession: '' }));
                      triggerAutoSave('educationProfession', { profession: e.target.value });
                    }}
                    className={`w-full h-[46px] rounded-[12px] border ${
                      step3Errors.profession ? 'border-rose-500 bg-rose-50/20' : 'border-[#DCE3EC] bg-white'
                    } px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]`}
                  >
                    <option value="" disabled>Select Medical Specialization / Practice *</option>
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {step3Errors.profession && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1">{step3Errors.profession}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Current Hospital / Organization / Clinic
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        triggerAutoSave('educationProfession', { company: e.target.value });
                      }}
                      placeholder="e.g. Apollo Hospital, Private Clinic"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Work Location (City)
                    </label>
                    <input
                      type="text"
                      value={workLocation}
                      onChange={(e) => {
                        setWorkLocation(e.target.value);
                        triggerAutoSave('educationProfession', { workLocation: e.target.value });
                      }}
                      placeholder="e.g. Pune, Mumbai"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Annual Income Range
                    </label>
                    <select
                      value={annualIncome}
                      onChange={(e) => {
                        setAnnualIncome(e.target.value);
                        triggerAutoSave('educationProfession', { annualIncome: e.target.value });
                      }}
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    >
                      {[
                        '₹ 5 - 10 Lakhs',
                        '₹ 10 - 15 Lakhs',
                        '₹ 15 - 25 Lakhs',
                        '₹ 25 - 35 Lakhs',
                        '₹ 35 - 50 Lakhs',
                        '₹ 50 Lakhs - 1 Crore',
                        '₹ 1 Crore+',
                      ].map((inc) => (
                        <option key={inc} value={inc}>{inc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Medical Registration No.
                    </label>
                    <input
                      type="text"
                      value={medicalRegistrationNumber}
                      onChange={(e) => {
                        setMedicalRegistrationNumber(e.target.value);
                        triggerAutoSave('educationProfession', { medicalRegistrationNumber: e.target.value });
                      }}
                      placeholder="e.g. MMC-12345 / MCI"
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Years of Experience
                    </label>
                    <select
                      value={medicalExperience}
                      onChange={(e) => {
                        setMedicalExperience(e.target.value);
                        triggerAutoSave('educationProfession', { medicalExperience: e.target.value });
                      }}
                      className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="">Select Experience (Optional)</option>
                      <option value="0-2 Years (Resident / Intern)">0-2 Years (Resident / Intern)</option>
                      <option value="3-5 Years">3-5 Years</option>
                      <option value="6-10 Years">6-10 Years</option>
                      <option value="11-15 Years">11-15 Years</option>
                      <option value="15+ Years">15+ Years</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-6 h-[48px] rounded-[12px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 h-[48px] rounded-[12px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : returnToReview ? (
                    <span>Save & Return to Review →</span>
                  ) : (
                    <span>Save & Continue →</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════
              ── STEP 4: PHOTO & PARTNER EXPECTATIONS ──
             ══════════════════════════════════════════════════════ */}
          {step === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-5">
              {/* CARD 1: Profile Photo */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Profile Photo</h3>
                    <p className="text-[11px] text-slate-500">Optional for registration; increases mutual match interest by 70%.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {photoPreview ? (
                      <>
                        <img
                          src={photoPreview}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <Camera className="w-7 h-7 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <label
                      htmlFor="profile-image-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition border border-slate-200"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#E51F3E]" />
                      <span>{photoPreview ? 'Change Photo' : 'Upload Candidate Photo'}</span>
                    </label>
                    <p className="text-[11px] text-slate-500">Supports JPG, PNG or WebP (max 5MB).</p>
                    {photoUploading && (
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Uploading photo...
                      </p>
                    )}
                    {photoError && <p className="text-[11px] text-rose-600 font-medium">{photoError}</p>}
                  </div>
                </div>
              </div>

              {/* CARD 2: Partner Expectations */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Partner Expectations</h3>
                    <p className="text-[11px] text-slate-500">
                      Tailored specifically for doctor matrimonial matchmaking. All fields optional.
                    </p>
                  </div>
                </div>

                {/* Age & Height Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Preferred Age Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={prefAgeMin}
                        onChange={(e) => setPrefAgeMin(e.target.value)}
                        className="h-[44px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                      >
                        {[21, 23, 24, 25, 26, 27, 28, 29, 30, 32, 35].map((a) => (
                          <option key={a} value={a}>Min {a} Yrs</option>
                        ))}
                      </select>
                      <select
                        value={prefAgeMax}
                        onChange={(e) => setPrefAgeMax(e.target.value)}
                        className="h-[44px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                      >
                        {[26, 28, 30, 32, 34, 36, 38, 40, 45, 50].map((a) => (
                          <option key={a} value={a}>Max {a} Yrs</option>
                        ))}
                      </select>
                    </div>
                    {step4Errors.prefAge && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">{step4Errors.prefAge}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Preferred Height Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={prefHeightMin}
                        onChange={(e) => setPrefHeightMin(e.target.value)}
                        className="h-[44px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                      >
                        {HEIGHT_OPTIONS.map((h) => (
                          <option key={h} value={h}>Min {h}</option>
                        ))}
                      </select>
                      <select
                        value={prefHeightMax}
                        onChange={(e) => setPrefHeightMax(e.target.value)}
                        className="h-[44px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                      >
                        {HEIGHT_OPTIONS.map((h) => (
                          <option key={h} value={h}>Max {h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Qualification & Specialization Preference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Preferred Medical Qualification
                    </label>
                    <select
                      value={prefEducation}
                      onChange={(e) => setPrefEducation(e.target.value)}
                      className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                    >
                      {PARTNER_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Preferred Medical Specialization
                    </label>
                    <select
                      value={prefProfession}
                      onChange={(e) => setPrefProfession(e.target.value)}
                      className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                    >
                      {PARTNER_SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location & Relocation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Preferred State / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra, Karnataka, All"
                      value={prefState}
                      onChange={(e) => setPrefState(e.target.value)}
                      className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Preferred District / City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Mumbai, Anywhere"
                      value={prefCity}
                      onChange={(e) => setPrefCity(e.target.value)}
                      className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Willing to Relocate
                    </label>
                    <select
                      value={prefWillingToRelocate}
                      onChange={(e) => setPrefWillingToRelocate(e.target.value)}
                      className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Flexible">Flexible / Open to discussion</option>
                    </select>
                  </div>
                </div>

                {/* Marital Status & Lifestyle */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Preferred Marital Status
                    </label>
                    <select
                      value={prefMaritalStatus}
                      onChange={(e) => setPrefMaritalStatus(e.target.value)}
                      className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                    >
                      {PARTNER_MARITAL_STATUSES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Diet Preference
                    </label>
                    <select
                      value={prefDiet}
                      onChange={(e) => setPrefDiet(e.target.value)}
                      className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                    >
                      {PARTNER_DIET_PREFERENCES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Smoking / Drinking Preference
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={prefSmoking}
                        onChange={(e) => setPrefSmoking(e.target.value)}
                        className="h-[44px] rounded-[12px] border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-800"
                      >
                        {PARTNER_SMOKING_PREFERENCES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        value={prefDrinking}
                        onChange={(e) => setPrefDrinking(e.target.value)}
                        className="h-[44px] rounded-[12px] border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-800"
                      >
                        {PARTNER_DRINKING_PREFERENCES.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Family & Additional Partner Expectations */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Family Expectations
                    </label>
                    <textarea
                      rows={2}
                      value={familyExpectations}
                      onChange={(e) => setFamilyExpectations(e.target.value)}
                      placeholder="e.g. Supportive in-laws, medical family background preferred, progressive values..."
                      className="w-full rounded-[12px] border border-slate-200 bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Additional Partner Expectations
                    </label>
                    <textarea
                      rows={2}
                      value={additionalExpectations}
                      onChange={(e) => setAdditionalExpectations(e.target.value)}
                      placeholder="Any specific qualities, shared professional understanding, hobbies, or life goals..."
                      className="w-full rounded-[12px] border border-slate-200 bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto px-6 h-[50px] rounded-[14px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 h-[50px] rounded-[14px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving Preferences...</span>
                    </>
                  ) : (
                    <span>Review Registration →</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════
              ── REVIEW REGISTRATION: 4-SECTION SUMMARY ──
             ══════════════════════════════════════════════════════ */}
          {step === 'review' && (
            <RegistrationReviewSection
              fullName={fullName}
              email={email}
              mobile={mobile}
              gender={gender}
              dob={dob}
              maritalStatus={maritalStatus}
              motherTongue={motherTongue}
              religion={religion}
              caste={caste}
              height={height}
              city={city}
              state={state}
              locationData={locationData}
              aboutMe={aboutMe}
              personalityValues={personalityValues}
              hobbiesInterests={hobbiesInterests}
              careerGoals={careerGoals}
              familyType={familyType}
              familyStatus={familyStatus}
              fatherName={fatherName}
              fatherProfession={fatherProfession}
              motherName={motherName}
              motherProfession={motherProfession}
              familyLocation={familyLocation}
              familyValues={familyValues}
              aboutFamily={aboutFamily}
              brothersCount={brothersCount}
              sistersCount={sistersCount}
              brothers={brothers}
              sisters={sisters}
              ugQualifications={ugQualifications}
              pgQualifications={pgQualifications}
              doctorateQualifications={doctorateQualifications}
              profession={profession}
              company={company}
              workLocation={workLocation}
              annualIncome={annualIncome}
              medicalRegistrationNumber={medicalRegistrationNumber}
              medicalExperience={medicalExperience}
              photoPreview={photoPreview}
              uploadedPhotoUrl={uploadedPhotoUrl}
              lookingFor={lookingFor}
              prefAgeMin={prefAgeMin}
              prefAgeMax={prefAgeMax}
              prefHeightMin={prefHeightMin}
              prefHeightMax={prefHeightMax}
              prefEducation={prefEducation}
              prefProfession={prefProfession}
              prefCountry={prefCountry}
              prefState={prefState}
              prefCity={prefCity}
              prefWillingToRelocate={prefWillingToRelocate}
              prefMaritalStatus={prefMaritalStatus}
              prefDiet={prefDiet}
              prefSmoking={prefSmoking}
              prefDrinking={prefDrinking}
              familyExpectations={familyExpectations}
              additionalExpectations={additionalExpectations}
              onEditStep={(stepNum) => {
                setReturnToReview(true);
                setStep(stepNum);
              }}
              onGoBack={() => {
                setStep(4);
              }}
              onSubmitRegistration={handleFinalSubmission}
              loading={loading}
              missingFields={reviewMissingFields}
            />
          )}

          {/* ══════════════════════════════════════════════════════
              ── STEP 5: SUCCESS STATE ──
             ══════════════════════════════════════════════════════ */}
          {(step === 'complete' || step === 5) && (
            <div className="text-center py-8 space-y-6 animate-fade-in bg-white rounded-3xl p-8 border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center text-3xl mx-auto shadow-sm">
                ❤️
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
                  Welcome to Wonderful Jodi ❤️
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your doctor matrimonial profile has been created successfully! You can now browse verified candidates and complete your medical verification.
                </p>
                {registrationId && (
                  <div className="pt-2">
                    <span className="inline-block bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-xs font-mono font-bold border border-slate-200">
                      Registration ID: {registrationId}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/search"
                  className="w-full sm:w-auto h-[48px] px-8 rounded-full bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 transition"
                >
                  <span>Browse Doctor Matches →</span>
                </Link>
                <Link
                  href="/profile"
                  className="w-full sm:w-auto h-[48px] px-6 rounded-full border border-slate-300 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50 inline-flex items-center justify-center transition"
                >
                  <span>View My Profile</span>
                </Link>
              </div>
            </div>
          )}

          {/* Sign In link (Only visible when not complete) */}
          {step !== 'complete' && step !== 5 && (
            <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-[#E51F3E] hover:underline">
                Sign In Here
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#FFF9F5] flex items-center justify-center text-sm font-semibold text-slate-500">Loading registration portal...</div>}>
      <RegisterForm />
    </React.Suspense>
  );
}
