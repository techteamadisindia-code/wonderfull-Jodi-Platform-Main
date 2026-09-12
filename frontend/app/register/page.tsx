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
  StepData,
} from '../../services/registrationApi';
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
} from 'lucide-react';

import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  validateDateOfBirth,
  validateMedicalQualification,
} from '../../lib/doctorConstants';
import { DobInput } from '../../components/DobInput';

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

const STORAGE_KEY = 'wj_registration_id';
const BACKUP_KEY = 'wj_reg_form_backup';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Multi-step State (1: Account, 2: Personal, 3: Career & Education, 4: Photo & Preferences, 5: Complete)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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
  const [dob, setDob] = useState('1997-06-15');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [mobileAvailable, setMobileAvailable] = useState<boolean | null>(null);

  // ─── STEP 2: Personal & Cultural ───
  const [maritalStatus, setMaritalStatus] = useState(MARITAL_STATUSES[0]);
  const [motherTongue, setMotherTongue] = useState('Hindi');
  const [religion, setReligion] = useState(RELIGIONS[0]);
  const [caste, setCaste] = useState('General');
  const [height, setHeight] = useState(`5' 6"`);
  const [city, setCity] = useState(CITIES[0]);
  const [state, setState] = useState('Maharashtra');
  const [about, setAbout] = useState('');

  // ─── STEP 3: Education & Career ───
  const [qualification, setQualification] = useState<string>(QUALIFICATIONS[0]);
  const [profession, setProfession] = useState<string>(PROFESSIONS[0]);
  const [company, setCompany] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [annualIncome, setAnnualIncome] = useState('₹ 15 - 25 Lakhs');

  // ─── STEP 4: Photo & Match Preferences ───
  const [lookingFor, setLookingFor] = useState<'Male' | 'Female'>('Male');
  const [prefAgeMin, setPrefAgeMin] = useState('23');
  const [prefAgeMax, setPrefAgeMax] = useState('34');
  const [prefCity, setPrefCity] = useState('All');
  const [prefDiet, setPrefDiet] = useState('Any');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Global & Field Errors ───
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

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validateMobile = (val: string) => /^[6-9]\d{9}$/.test(val.replace(/\D/g, ''));

  // ─── 1. Check for Existing Registration to Resume on Mount ───
  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setInitialLoading(false);
    }, 2000);

    const resumeExisting = async () => {
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
            if (p.maritalStatus) setMaritalStatus(p.maritalStatus);
            if (p.motherTongue) setMotherTongue(p.motherTongue);
            if (p.religion) setReligion(p.religion);
            if (p.caste) setCaste(p.caste);
            if (p.height) setHeight(p.height);
            if (p.city) setCity(p.city);
            if (p.state) setState(p.state);
            if (p.about) setAbout(p.about);

            // Populate Step 3
            const e = session.stepData?.educationProfession || {};
            if (e.education) setQualification(e.education);
            if (e.profession) setProfession(e.profession);
            if (e.company) setCompany(e.company);
            if (e.workLocation) setWorkLocation(e.workLocation);
            if (e.annualIncome) setAnnualIncome(e.annualIncome);

            // Populate Step 4
            const pref = session.stepData?.preferences || {};
            if (pref.lookingFor === 'Male' || pref.lookingFor === 'Female') setLookingFor(pref.lookingFor);
            if (pref.prefAgeMin) setPrefAgeMin(pref.prefAgeMin);
            if (pref.prefAgeMax) setPrefAgeMax(pref.prefAgeMax);
            if (pref.prefCity) setPrefCity(pref.prefCity);
            if (pref.prefDiet) setPrefDiet(pref.prefDiet);

            const ph = session.stepData?.photos || {};
            if (ph.primaryPhoto) {
              setUploadedPhotoUrl(ph.primaryPhoto);
              setPhotoPreview(ph.primaryPhoto);
            }

            // Restore active step
            const targetStep = Math.min(4, Math.max(1, session.currentStep)) as 1 | 2 | 3 | 4;
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
              qualification,
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
    [registrationId, fullName, email, mobile, gender, city, profession, qualification]
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
        profession,
        qualification,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
      }
    } catch {
      // safe ignore
    }
  }, [fullName, email, mobile, gender, dob, city, profession, qualification]);

  // Reset form / Start Fresh
  const handleStartFresh = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
    }
    setRegistrationId('');
    setIsResumed(false);
    setStep(1);
    setFullName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setConfirmPassword('');
    setPhotoPreview(null);
    setUploadedPhotoUrl('');
    setGlobalError('');
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

        // Auto save photo to registration
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

  // ─── STEP 1 SUBMIT: SAVE IMMEDIATELY TO DATABASE ───
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

    const dobValidation = validateDateOfBirth(dob);
    if (!dobValidation.isValid) {
      errors.dob = dobValidation.error || 'Date of birth year must be exactly 4 digits.';
    }

    setStep1Errors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      let session: any = null;

      if (!registrationId) {
        // First time starting registration -> Call startRegistration API
        session = await startRegistration({
          fullName: cleanName,
          email: email.trim().toLowerCase(),
          mobile: cleanMobile,
          password,
          gender,
          dob,
          lookingFor: gender === 'Female' ? 'Male' : 'Female',
          agreeTerms,
          rawFormData: {
            fullName: cleanName,
            email: email.trim().toLowerCase(),
            mobile: cleanMobile,
            gender,
            dob,
          },
        });
      } else {
        // Updating existing registration Page 1
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

      setStep(2);
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

  // ─── STEP 2 SUBMIT: SAVE PERSONAL DETAILS TO DATABASE ───
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGlobalError('');

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
            about,
          },
          rawFormData: {
            city,
            maritalStatus,
            religion,
            caste,
          },
        });
      }
      setStep(3);
    } catch (err: any) {
      console.warn('Step 2 save warning:', err);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 3 SUBMIT: SAVE CAREER DETAILS TO DATABASE ───
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGlobalError('');

    try {
      if (registrationId) {
        await saveRegistrationStep({
          registrationId,
          stepNumber: 4,
          section: 'educationProfession',
          data: {
            education: qualification,
            degree: qualification,
            profession,
            company: company || workLocation || '',
            workLocation: workLocation || city,
            annualIncome,
          },
          rawFormData: {
            qualification,
            profession,
            company,
            workLocation,
          },
        });
      }
      setStep(4);
    } catch (err: any) {
      console.warn('Step 3 save warning:', err);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 4 SUBMIT: FINALIZE REGISTRATION IN DATABASE ───
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGlobalError('');

    try {
      const finalPhoto = uploadedPhotoUrl || photoPreview || '';

      const finalResult = await completeRegistration({
        registrationId,
        finalData: {
          agreeTerms: true,
          termsAccepted: true,
          preferences: {
            lookingFor,
            prefAgeMin,
            prefAgeMax,
            prefCity,
            prefDiet,
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

      setStep(5);
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        setGlobalError('An account with these details has already been created. Please proceed to Login.');
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
    <main className="min-h-screen min-h-[100dvh] w-full bg-[#FAF7F4] py-6 sm:py-10 md:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Terms & Privacy Modal */}
      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-rose-100 animate-fade-in">
            <h3 className="font-serif text-2xl font-bold text-[#101728]">
              Terms of Service & Privacy Policy
            </h3>
            <div className="text-xs text-slate-600 space-y-2.5 max-h-[320px] overflow-y-auto pr-2 leading-relaxed">
              <p>
                <strong>1. Confidentiality & Verification:</strong> Wonderful Jodi is an exclusive matrimonial platform designed for educated professionals and respected families.
              </p>
              <p>
                <strong>2. Protected Contact Data:</strong> Your phone number and email are never publicly exposed on profile cards without your explicit consent.
              </p>
              <p>
                <strong>3. Authentic Credentials:</strong> All registered members agree to provide accurate qualifications and genuine matrimonial intent.
              </p>
            </div>
            <button
              onClick={() => setTermsModalOpen(false)}
              className="w-full h-11 rounded-xl bg-[#E51F3E] text-white font-bold text-sm hover:bg-[#d11735] transition"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* Main Split-Screen Container */}
      <div className="max-w-[1160px] w-full bg-white rounded-2xl sm:rounded-3xl border border-[#E8E1DB] shadow-[0_12px_40px_rgba(16,23,40,0.06)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
        {/* ── LEFT PANEL (42% on Desktop) ── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#101728] via-[#161f36] to-[#0d1322] text-white p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E51F3E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E51F3E]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand & Message */}
          <div className="relative z-10 space-y-6">
            <Logo size="lg" variant="dark" subtitle="Doctor Matrimony" />

            <div className="space-y-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold text-rose-200">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                Doctor Matrimonial Network
              </span>

              <h2 className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-bold text-white leading-tight">
                Create Your Free Doctor Matrimonial Profile
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Connect with verified candidates, doctors, and educated professionals looking for a meaningful, compatible life partner.
              </p>
            </div>

            {/* Registration ID Tracker Badge */}
            {registrationId && step < 5 && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-bold text-rose-300">Database Registration ID</span>
                  <span className="font-mono text-white font-bold">{registrationId}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Your progress is saved securely in our database. You can return anytime to resume.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Trust Points */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/90 space-y-3 text-xs text-slate-200 font-medium">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E51F3E] shrink-0" />
              <span>100% Free Initial Registration</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E51F3E] shrink-0" />
              <span>Screened & Verified Candidate Profiles</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E51F3E] shrink-0" />
              <span>Confidential & Privacy Protected</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (58% on Desktop) ── */}
        <div className="lg:col-span-7 p-6 sm:p-9 lg:p-10 flex flex-col justify-center bg-white">
          {/* Top Form Header & Resume Banner */}
          <div className="mb-5 space-y-2">
            {isResumed && step < 5 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>
                    Resumed from saved progress (<strong>{registrationId}</strong>)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStartFresh}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline shrink-0"
                >
                  Start Fresh
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
                {step === 1 && 'Step 1: Account & Contact'}
                {step === 2 && 'Step 2: Personal & Cultural'}
                {step === 3 && 'Step 3: Education & Career'}
                {step === 4 && 'Step 4: Photo & Preferences'}
                {step === 5 && 'Registration Complete!'}
              </h1>

              {/* Auto Save Pill */}
              {step < 5 && registrationId && (
                <div className="shrink-0">
                  {saveStatus === 'saving' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                      <Loader2 className="w-3 h-3 animate-spin text-[#E51F3E]" />
                      <span>Saving...</span>
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-fade-in">
                      <Check className="w-3 h-3" />
                      <span>Saved in DB</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500">
              {step === 1 && 'Basic account credentials to secure your profile and register.'}
              {step === 2 && 'Marital, cultural, and location details.'}
              {step === 3 && 'Educational background and professional occupation.'}
              {step === 4 && 'Candidate photo and matchmaking partner preferences.'}
              {step === 5 && 'Your account and profile are ready.'}
            </p>
          </div>

          {/* Progress Indicator (Steps 1 to 4) */}
          {step < 5 && (
            <div className="mb-6 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                <span className="text-[#E51F3E]">Step {step} of 4</span>
                <span className="text-slate-400 text-[11px]">
                  {step === 1 && 'Account & Contact'}
                  {step === 2 && 'Personal Details'}
                  {step === 3 && 'Education & Career'}
                  {step === 4 && 'Photo & Preferences'}
                </span>
              </div>

              {/* 4-Step Progress Bar */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      step >= s ? 'bg-[#E51F3E]' : 'bg-slate-100'
                    }`}
                  />
                ))}
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

          {/* ── STEP 1: ACCOUNT & CONTACT FORM ── */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
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
                  placeholder="e.g. Rahul Sharma"
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
                    <Link
                      href="/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#E51F3E] hover:underline"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#E51F3E] hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {step1Errors.agreeTerms && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{step1Errors.agreeTerms}</p>
                )}
              </div>

              {/* Submit Next Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[50px] rounded-[14px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md shadow-red-500/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>Next: Personal Details →</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: PERSONAL & CULTURAL FORM ── */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Marital Status *
                  </label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => {
                      setMaritalStatus(e.target.value);
                      triggerAutoSave('personalInfo', { maritalStatus: e.target.value });
                    }}
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  >
                    {MARITAL_STATUSES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Mother Tongue
                  </label>
                  <input
                    type="text"
                    value={motherTongue}
                    onChange={(e) => {
                      setMotherTongue(e.target.value);
                      triggerAutoSave('personalInfo', { motherTongue: e.target.value });
                    }}
                    placeholder="e.g. Hindi, Marathi, Gujarati"
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  />
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
                      triggerAutoSave('personalInfo', { religion: e.target.value });
                    }}
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  >
                    {RELIGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Caste / Community
                  </label>
                  <input
                    type="text"
                    value={caste}
                    onChange={(e) => {
                      setCaste(e.target.value);
                      triggerAutoSave('personalInfo', { caste: e.target.value });
                    }}
                    placeholder="e.g. Brahmin, Maratha"
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  />
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
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  >
                    {[`5' 0"`, `5' 2"`, `5' 4"`, `5' 6"`, `5' 8"`, `5' 10"`, `6' 0"`, `6' 2"`].map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    City of Residence *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      triggerAutoSave('personalInfo', { city: e.target.value });
                    }}
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      triggerAutoSave('personalInfo', { state: e.target.value });
                    }}
                    placeholder="e.g. Maharashtra, Karnataka"
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>
              </div>

              {/* About Candidate */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  About Candidate / Family Background
                </label>
                <textarea
                  rows={2}
                  value={about}
                  onChange={(e) => {
                    setAbout(e.target.value);
                    triggerAutoSave('personalInfo', { about: e.target.value });
                  }}
                  placeholder="Brief summary of personality, values, or family roots..."
                  className="w-full rounded-[12px] border border-[#DCE3EC] bg-white p-3 text-sm text-[#101728] placeholder-slate-400 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              {/* Navigation Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 h-[48px] rounded-[12px] border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 h-[48px] rounded-[12px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Saving...' : 'Next: Education & Career →'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: EDUCATION & CAREER FORM ── */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Medical Qualification *
                </label>
                <select
                  value={qualification}
                  onChange={(e) => {
                    setQualification(e.target.value);
                    triggerAutoSave('educationProfession', { education: e.target.value, degree: e.target.value });
                  }}
                  className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="" disabled>Select your medical qualification</option>
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Medical Specialization / Practice *
                </label>
                <select
                  value={profession}
                  onChange={(e) => {
                    setProfession(e.target.value);
                    triggerAutoSave('educationProfession', { profession: e.target.value });
                  }}
                  className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="" disabled>Select your medical specialization</option>
                  {PROFESSIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value);
                      triggerAutoSave('educationProfession', { company: e.target.value });
                    }}
                    placeholder="e.g. MNC, Hospital, Govt"
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  />
                </div>

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
                    className="w-full h-[48px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
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
                      <option key={inc} value={inc}>
                        {inc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 h-[48px] rounded-[12px] border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 h-[48px] rounded-[12px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Saving...' : 'Next: Photo & Preferences →'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 4: PHOTO & PARTNER PREFERENCES ── */}
          {step === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-4">
              {/* Profile Photo Upload Field */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Profile Photo (Optional but Recommended)
                </label>
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
                    <p className="text-[11px] text-slate-500">
                      Supports JPG, PNG or WebP (max 5MB).
                    </p>
                    {photoUploading && (
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Uploading photo to cloud...
                      </p>
                    )}
                    {photoError && (
                      <p className="text-[11px] text-rose-600 font-medium">{photoError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Partner Age Range */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Preferred Partner Age Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={prefAgeMin}
                    onChange={(e) => {
                      setPrefAgeMin(e.target.value);
                      triggerAutoSave('preferences', { prefAgeMin: e.target.value });
                    }}
                    className="h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  >
                    {[21, 23, 25, 27, 29, 31, 33, 35].map((a) => (
                      <option key={a} value={a}>
                        Min {a} Yrs
                      </option>
                    ))}
                  </select>
                  <select
                    value={prefAgeMax}
                    onChange={(e) => {
                      setPrefAgeMax(e.target.value);
                      triggerAutoSave('preferences', { prefAgeMax: e.target.value });
                    }}
                    className="h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                  >
                    {[26, 28, 30, 32, 35, 38, 42, 45, 50].map((a) => (
                      <option key={a} value={a}>
                        Max {a} Yrs
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Diet Preference */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Diet Preference
                </label>
                <select
                  value={prefDiet}
                  onChange={(e) => {
                    setPrefDiet(e.target.value);
                    triggerAutoSave('preferences', { prefDiet: e.target.value });
                  }}
                  className="w-full h-[46px] rounded-[12px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#101728] focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="Any">Any Diet Preference</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-1/3 h-[50px] rounded-[14px] border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 h-[50px] rounded-[14px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Finalizing Registration...</span>
                    </>
                  ) : (
                    <span>Complete Registration →</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 5: SUCCESS STATE ── */}
          {step === 5 && (
            <div className="text-center py-6 space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center text-3xl mx-auto shadow-sm">
                ❤️
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#101728]">
                  Welcome to Wonderful Jodi ❤️
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your matrimonial account and profile have been created successfully! You can now browse verified candidates.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/search"
                  className="w-full sm:w-auto h-[48px] px-8 rounded-full bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md inline-flex items-center justify-center gap-2 transition"
                >
                  <span>Browse Matches →</span>
                </Link>
                <Link
                  href="/membership"
                  className="w-full sm:w-auto h-[48px] px-6 rounded-full border border-slate-300 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50 inline-flex items-center justify-center transition"
                >
                  <span>Explore Membership</span>
                </Link>
              </div>
            </div>
          )}

          {/* Sign In link (Only visible in Steps 1-4) */}
          {step < 5 && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
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
    <React.Suspense fallback={<div className="min-h-screen bg-[#FFF9F5] flex items-center justify-center text-sm font-semibold text-slate-500">Loading...</div>}>
      <RegisterForm />
    </React.Suspense>
  );
}
