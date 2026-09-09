'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Upload,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  Home,
  Utensils,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Camera,
} from 'lucide-react';
import { getMyProfile, updateMyProfile, getAuthToken } from '../../../lib/api';
import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  validateDateOfBirth,
  validateMedicalQualification,
} from '../../../lib/doctorConstants';
import { DobInput } from '../../../components/DobInput';

const PROFESSIONS = DOCTOR_SPECIALIZATIONS;
const QUALIFICATIONS = DOCTOR_QUALIFICATIONS;

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Parsi', 'Buddhist', 'Jewish', 'Other'];
const MARITAL_STATUSES = ['Never Married', 'Divorced', 'Widowed', 'Separated', 'Awaiting Divorce'];
const MOTHER_TONGUES = [
  'Hindi',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Bengali',
  'Punjabi',
  'Kannada',
  'Odia',
  'Marwari',
  'English',
  'Urdu',
];

const DIETS = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain Vegetarian'];
const FAMILY_TYPES = ['Nuclear', 'Joint'];

const CITIES = [
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Jaipur',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Chandigarh',
  'Lucknow',
  'Gurugram',
  'Noida',
  'Kochi',
  'Indore',
];

const HEIGHTS = [
  `5' 0"`,
  `5' 1"`,
  `5' 2"`,
  `5' 3"`,
  `5' 4"`,
  `5' 5"`,
  `5' 6"`,
  `5' 7"`,
  `5' 8"`,
  `5' 9"`,
  `5' 10"`,
  `5' 11"`,
  `6' 0"`,
  `6' 1"`,
  `6' 2"`,
  `6' 3"`,
  `6' 4"`,
];

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    gender: 'Female',
    dob: '',
    height: `5' 6"`,
    maritalStatus: 'Never Married',
    motherTongue: 'Hindi',
    religion: 'Hindu',
    caste: '',
    subCaste: '',
    education: 'MBBS',
    degree: '',
    profession: 'General Physician',
    medicalRegistrationNumber: '',
    medicalExperience: '',
    currentHospital: '',
    company: '',
    workLocation: '',
    annualIncome: '₹ 25 - 35 Lakhs',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    about: '',
    familyType: 'Nuclear',
    fatherOccupation: '',
    motherOccupation: '',
    siblings: '',
    foodPreference: 'Vegetarian',
    smoking: 'Non-Smoker',
    drinking: 'Non-Drinker',
    primaryPhoto: '',
    preferredAgeMin: 24,
    preferredAgeMax: 36,
    preferredLocation: 'Anywhere in India',
    preferredQualification: 'MBBS / MD / MS / Medical Specialist',
    preferredSpecialization: 'Any Medical Specialization',
    preferredMaritalStatus: 'Never Married',
    otherPreferences: '',
  });

  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/profile/edit');
      return;
    }

    getMyProfile()
      .then((profile) => {
        if (profile) {
          let formattedDob = '';
          if (profile.dob) {
            const d = new Date(profile.dob);
            if (!isNaN(d.getTime())) {
              formattedDob = d.toISOString().split('T')[0];
            }
          }

          setFormData({
            displayName: profile.displayName || '',
            gender: profile.gender || 'Female',
            dob: formattedDob || '1996-05-15',
            height: profile.height || `5' 6"`,
            maritalStatus: profile.maritalStatus || 'Never Married',
            motherTongue: profile.motherTongue || 'Hindi',
            religion: profile.religion || 'Hindu',
            caste: profile.caste || '',
            subCaste: profile.subCaste || '',
            education: profile.education || 'MBBS',
            degree: profile.degree || '',
            profession: profile.profession || 'General Physician',
            medicalRegistrationNumber: profile.medicalRegistrationNumber || '',
            medicalExperience: profile.medicalExperience || '',
            currentHospital: profile.currentHospital || '',
            company: profile.company || '',
            workLocation: profile.workLocation || profile.city || '',
            annualIncome: profile.annualIncome || '',
            country: profile.country || 'India',
            state: profile.state || 'Maharashtra',
            city: profile.city || 'Mumbai',
            about: profile.about || '',
            familyType: profile.familyType || 'Nuclear',
            fatherOccupation: profile.fatherOccupation || '',
            motherOccupation: profile.motherOccupation || '',
            siblings: profile.siblings || '',
            foodPreference: profile.foodPreference || 'Vegetarian',
            smoking: profile.smoking || 'Non-Smoker',
            drinking: profile.drinking || 'Non-Drinker',
            primaryPhoto: profile.primaryPhoto || '',
            preferredAgeMin: profile.partnerPreferences?.preferredAgeMin || 24,
            preferredAgeMax: profile.partnerPreferences?.preferredAgeMax || 36,
            preferredLocation: profile.partnerPreferences?.preferredLocation || 'Anywhere in India',
            preferredQualification: profile.partnerPreferences?.preferredQualification || 'MBBS / MD / MS / Medical Specialist',
            preferredSpecialization: profile.partnerPreferences?.preferredSpecialization || 'Any Medical Specialization',
            preferredMaritalStatus: profile.partnerPreferences?.preferredMaritalStatus || 'Never Married',
            otherPreferences: profile.partnerPreferences?.otherPreferences || '',
          });

          if (profile.primaryPhoto) {
            setPhotoPreview(profile.primaryPhoto);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load profile for edit:', err);
        setErrorMsg('Failed to load profile data. Please refresh or sign in again.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPhotoPreview(base64);

      try {
        const uploadRes = await fetch('/api/upload/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, filename: file.name }),
        });

        if (uploadRes.ok) {
          const resJson = await uploadRes.json();
          const uploadedUrl = resJson.url || resJson.data?.url;
          if (uploadedUrl) {
            setFormData((prev) => ({ ...prev, primaryPhoto: uploadedUrl }));
            setPhotoPreview(uploadedUrl);
          }
        } else {
          // Keep base64 as fallback
          setFormData((prev) => ({ ...prev, primaryPhoto: base64 }));
        }
      } catch (uploadErr) {
        console.warn('Direct upload failed, using image data:', uploadErr);
        setFormData((prev) => ({ ...prev, primaryPhoto: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.displayName.trim()) {
      setErrorMsg('Full Name is required.');
      setSaving(false);
      return;
    }

    if (!formData.dob) {
      setErrorMsg('Date of birth is required.');
      setSaving(false);
      return;
    }

    const dobValidation = validateDateOfBirth(formData.dob);
    if (!dobValidation.isValid) {
      setErrorMsg(dobValidation.error || 'Date of birth year must be exactly 4 digits.');
      setSaving(false);
      return;
    }

    const qualValidation = validateMedicalQualification(formData.education);
    if (!qualValidation.isValid) {
      setErrorMsg(qualValidation.error || 'Please select a valid medical/doctor qualification.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        partnerPreferences: {
          preferredAgeMin: Number(formData.preferredAgeMin) || 24,
          preferredAgeMax: Number(formData.preferredAgeMax) || 36,
          preferredLocation: formData.preferredLocation,
          preferredQualification: formData.preferredQualification,
          preferredSpecialization: formData.preferredSpecialization,
          preferredMaritalStatus: formData.preferredMaritalStatus,
          otherPreferences: formData.otherPreferences,
        },
      };
      const result = await updateMyProfile(payload);
      if (result && result.success !== false) {
        setSuccessMsg('Profile updated successfully! Redirecting...');
        setTimeout(() => {
          router.push('/profile');
        }, 1200);
      } else {
        setErrorMsg(result?.message || 'Failed to update profile. Please check all fields.');
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      setErrorMsg(err.response?.data?.message || 'An error occurred while saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF9] flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-[#E51F3E] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading editor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF9] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-[#101828]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#E51F3E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Profile</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Editing as:</span>
            <span className="text-xs font-bold text-slate-900 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
              {formData.displayName || 'Candidate'}
            </span>
          </div>
        </div>

        {/* Feedback Toasts / Alerts */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 animate-fade-in shadow-xs">
            <AlertCircle className="w-5 h-5 text-[#E51F3E] shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Photo & Basic Identity */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-[#E51F3E]" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#101828]">
                Basic Identity & Profile Photo
              </h2>
            </div>

            {/* Profile Photo Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-slate-200 shrink-0 border-2 border-rose-200 shadow-xs">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <User className="w-10 h-10" />
                    <span className="text-[10px] font-semibold mt-1">No Photo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Update Candidate Profile Photo
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a high-quality portrait photo (JPG, PNG, WEBP, max 5MB). Verified photos attract 3x higher responses.
                </p>
                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#d11735] shadow-xs transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Photo</span>
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview('');
                        setFormData((prev) => ({ ...prev, primaryPhoto: '' }));
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Full Name / Display Name *
                </label>
                <input
                  type="text"
                  name="displayName"
                  required
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. Ananya Verma"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="Female">Female (Bride)</option>
                  <option value="Male">Male (Groom)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <DobInput
                  label="Date of Birth"
                  value={formData.dob}
                  required={true}
                  onChange={(isoDate, isValid) => {
                    setFormData((prev) => ({ ...prev, dob: isoDate }));
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Height *
                </label>
                <select
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  {HEIGHTS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 2. Education & Profession */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#E51F3E]" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#101828]">
                Medical Education & Career Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Medical Qualification *
                </label>
                <select
                  name="education"
                  value={formData.education}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
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
                  Medical Degree / College / Institution *
                </label>
                <input
                  type="text"
                  name="degree"
                  required
                  value={formData.degree}
                  onChange={handleInputChange}
                  placeholder="e.g. MBBS, MD Cardiology (AIIMS)"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Medical Specialization / Practice *
                </label>
                <select
                  name="profession"
                  value={formData.profession}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="" disabled>Select your medical specialization</option>
                  {PROFESSIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Company / Organization
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="e.g. Apollo Hospitals / Google / KPMG"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Annual Income Range
                </label>
                <input
                  type="text"
                  name="annualIncome"
                  value={formData.annualIncome}
                  onChange={handleInputChange}
                  placeholder="e.g. ₹ 30 - 45 Lakhs"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Work Location
                </label>
                <input
                  type="text"
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleInputChange}
                  placeholder="e.g. Mumbai / Bangalore / Hybrid"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>
            </div>
          </section>

          {/* 3. Location & Social Background */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#E51F3E]" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#101828]">
                Location & Social Background
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  City *
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
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
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="e.g. Maharashtra"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Country *
                </label>
                <input
                  type="text"
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Religion *
                </label>
                <select
                  name="religion"
                  value={formData.religion}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
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
                  Caste / Community *
                </label>
                <input
                  type="text"
                  name="caste"
                  required
                  value={formData.caste}
                  onChange={handleInputChange}
                  placeholder="e.g. Brahmin / Iyer / Vaishya / Open"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Mother Tongue *
                </label>
                <select
                  name="motherTongue"
                  value={formData.motherTongue}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  {MOTHER_TONGUES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 4. About Me Description */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E51F3E]" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#101828]">
                About Candidate & Partner Expectations
              </h2>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                About Me / Bio
              </label>
              <textarea
                name="about"
                rows={4}
                value={formData.about}
                onChange={handleInputChange}
                placeholder="Share a brief overview of your background, values, interests, and what kind of life partner you are hoping to connect with..."
                className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] focus:ring-2 focus:ring-[#E51F3E]/20 leading-relaxed"
              />
            </div>
          </section>

          {/* 5. Family & Lifestyle */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Home className="w-5 h-5 text-[#E51F3E]" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#101828]">
                Family Information & Lifestyle
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Family Type
                </label>
                <select
                  name="familyType"
                  value={formData.familyType}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  {FAMILY_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Diet Preference
                </label>
                <select
                  name="foodPreference"
                  value={formData.foodPreference}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  {DIETS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Father's Occupation
                </label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleInputChange}
                  placeholder="e.g. Senior Executive / Retired Govt Officer / Business"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Mother's Occupation
                </label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleInputChange}
                  placeholder="e.g. Homemaker / School Principal / Doctor"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Siblings
                </label>
                <input
                  type="text"
                  name="siblings"
                  value={formData.siblings}
                  onChange={handleInputChange}
                  placeholder="e.g. 1 Elder Brother (Married)"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Smoking / Drinking Habits
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    name="smoking"
                    value={formData.smoking}
                    onChange={handleInputChange}
                    className="h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                  >
                    <option value="Non-Smoker">Non-Smoker</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="Regular">Regular</option>
                  </select>
                  <select
                    name="drinking"
                    value={formData.drinking}
                    onChange={handleInputChange}
                    className="h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                  >
                    <option value="Non-Drinker">Non-Drinker</option>
                    <option value="Social Drinker">Social Drinker</option>
                    <option value="Regular">Regular</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
            <Link
              href="/profile"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/25 hover:shadow-lg hover:from-[#d11735] hover:to-[#b91c1c] disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
