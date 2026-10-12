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
import { getMyProfile, updateMyProfile, getAuthToken, uploadProfileImage } from '../../../lib/api';
import { isValidImageUrl } from '../../../lib/imageUtils';
import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
  HEIGHT_OPTIONS,
  ANNUAL_INCOME_OPTIONS,
  formatHeightDisplay,
  UG_MEDICAL_QUALIFICATIONS,
  PG_MEDICAL_QUALIFICATIONS,
  DOCTORATE_MEDICAL_QUALIFICATIONS,
  getSpecializationsForPgDegree,
  getSuggestedSuperSpecialties,
  getSuggestedCompletionYear,
  validateDegreeYearSequence,
  validateDateOfBirth,
  validateMedicalQualification,
} from '../../../lib/doctorConstants';
import {
  fetchStates,
  fetchDistricts,
  fetchCities,
  StateItem,
  DistrictItem,
  CityItem,
} from '../../../services/masterDataApi';
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
    height: '',
    maritalStatus: 'Never Married',
    motherTongue: '',
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
    annualIncome: '',
    country: 'India',
    state: '',
    city: '',
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

  // Cascading Location States
  const [statesList, setStatesList] = useState<StateItem[]>([]);
  const [districtsList, setDistrictsList] = useState<DistrictItem[]>([]);
  const [citiesList, setCitiesList] = useState<CityItem[]>([]);
  const [district, setDistrict] = useState('');
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locationData, setLocationData] = useState<{
    stateId?: any;
    stateName?: string;
    districtId?: any;
    districtName?: string;
    cityId?: any;
    cityName?: string;
    countryName?: string;
    [key: string]: any;
  } | null>(null);

  // Structured Doctor Education States
  const [ugQualification, setUgQualification] = useState('MBBS');
  const [ugSpecialization, setUgSpecialization] = useState('');
  const [ugCollege, setUgCollege] = useState('');
  const [ugYear, setUgYear] = useState('');

  const [pgDegree, setPgDegree] = useState('');
  const [pgSpecialization, setPgSpecialization] = useState('');
  const [pgCollege, setPgCollege] = useState('');
  const [pgYear, setPgYear] = useState('');

  const [docDegree, setDocDegree] = useState('');
  const [docSpecialization, setDocSpecialization] = useState('');
  const [docCollege, setDocCollege] = useState('');
  const [docYear, setDocYear] = useState('');

  const [yearSequenceError, setYearSequenceError] = useState<string | null>(null);

  const [photoPreview, setPhotoPreview] = useState('');

  // Initial load: Preload States list
  useEffect(() => {
    fetchStates()
      .then((states) => setStatesList(states || []))
      .catch((err) => console.warn('Failed to load states list:', err));
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/profile/edit');
      return;
    }

    getMyProfile()
      .then(async (profile) => {
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
            dob: formattedDob || '',
            height: profile.height || '',
            maritalStatus: profile.maritalStatus || 'Never Married',
            motherTongue: profile.motherTongue || '',
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
            state: profile.state || '',
            city: profile.city || '',
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

          // Preload cascading location
          const savedDistrict = profile.currentLocation?.districtName || (profile as any).district || '';
          if (savedDistrict) setDistrict(savedDistrict);
          if (profile.currentLocation) {
            setLocationData(profile.currentLocation);
          }

          if (profile.state) {
            try {
              const dists = await fetchDistricts(profile.currentLocation?.stateId || profile.state);
              setDistrictsList(dists || []);
              if (savedDistrict) {
                const matchedDist = dists?.find((d) => d.name === savedDistrict);
                const distIdToUse = matchedDist?._id || savedDistrict;
                const cRes = await fetchCities({
                  districtId: distIdToUse,
                  stateId: profile.currentLocation?.stateId || profile.state,
                  limit: 100,
                });
                const fetchedCities = cRes?.data || [];
                if (fetchedCities.length === 0) {
                  setCitiesList([
                    {
                      _id: distIdToUse,
                      name: matchedDist?.headquarters || savedDistrict,
                      districtId: distIdToUse,
                      stateId: profile.currentLocation?.stateId || profile.state,
                      type: 'District HQ',
                    },
                  ]);
                } else {
                  setCitiesList(fetchedCities);
                }
              }
            } catch (locErr) {
              console.warn('Error restoring location dropdowns in edit page:', locErr);
            }
          }

          // Preload structured doctor education
          const medQuals = profile.medicalQualifications;
          if (medQuals && typeof medQuals === 'object') {
            const ug = Array.isArray(medQuals.undergraduate) ? medQuals.undergraduate[0] : null;
            if (ug) {
              setUgQualification(ug.qualification || 'MBBS');
              setUgSpecialization(ug.specialization || '');
              setUgCollege(ug.college || ug.institution || '');
              setUgYear(ug.completionYear || '');
            } else {
              setUgQualification(profile.education || 'MBBS');
              setUgCollege(profile.medicalCollege || '');
              setUgYear(profile.graduationYear || '');
            }

            const pg = Array.isArray(medQuals.postgraduate) ? medQuals.postgraduate[0] : null;
            if (pg) {
              setPgDegree(pg.qualification || '');
              setPgSpecialization(pg.specialization || '');
              setPgCollege(pg.college || pg.institution || '');
              setPgYear(pg.completionYear || '');
            }

            const doc = Array.isArray(medQuals.doctorate) ? medQuals.doctorate[0] : null;
            if (doc) {
              setDocDegree(doc.qualification || '');
              setDocSpecialization(doc.specialization || '');
              setDocCollege(doc.college || doc.institution || '');
              setDocYear(doc.completionYear || '');
            }
          } else {
            setUgQualification(profile.education || 'MBBS');
            setUgCollege(profile.medicalCollege || '');
            setUgYear(profile.graduationYear || '');
          }

          if (profile.primaryPhoto && isValidImageUrl(profile.primaryPhoto)) {
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

  // Cascading Location Handlers
  const handleStateChange = async (selectedStateName: string) => {
    setFormData((prev) => ({ ...prev, state: selectedStateName, city: '' }));
    setDistrict('');
    setDistrictsList([]);
    setCitiesList([]);
    setLocationData(null);

    if (!selectedStateName) return;

    const stateObj = statesList.find((s) => s.name === selectedStateName);
    const stateIdToUse = stateObj?._id || selectedStateName;

    setLoadingDistricts(true);
    try {
      const districts = await fetchDistricts(stateIdToUse);
      setDistrictsList(districts || []);
    } catch (err) {
      console.warn('Failed to load districts:', err);
      setDistrictsList([]);
    } finally {
      setLoadingDistricts(false);
    }

    setLocationData({
      countryName: 'India',
      stateName: selectedStateName,
      stateId: stateObj?._id,
    });
  };

  const handleDistrictChange = async (selectedDistrictName: string) => {
    setDistrict(selectedDistrictName);
    setFormData((prev) => ({ ...prev, city: '' }));
    setCitiesList([]);

    if (!selectedDistrictName) return;

    const distObj = districtsList.find((d) => d.name === selectedDistrictName);
    const distIdToUse = distObj?._id || selectedDistrictName;
    const stateObj = statesList.find((s) => s.name === formData.state);

    setLoadingCities(true);
    try {
      const res = await fetchCities({
        districtId: distIdToUse,
        stateId: stateObj?._id || formData.state,
        limit: 100,
      });
      const fetchedCities = res?.data || [];
      if (fetchedCities.length === 0) {
        setCitiesList([
          {
            _id: distIdToUse,
            name: distObj?.headquarters || selectedDistrictName,
            districtId: distIdToUse,
            stateId: stateObj?._id || formData.state,
            type: 'District HQ',
          },
        ]);
      } else {
        setCitiesList(fetchedCities);
      }
    } catch (err) {
      console.warn('Failed to load cities:', err);
      setCitiesList([
        {
          _id: distIdToUse,
          name: selectedDistrictName,
          districtId: distIdToUse,
          stateId: stateObj?._id || formData.state,
          type: 'District HQ',
        },
      ]);
    } finally {
      setLoadingCities(false);
    }

    setLocationData((prev) => ({
      countryName: 'India',
      stateName: formData.state,
      stateId: stateObj?._id,
      ...prev,
      districtName: selectedDistrictName,
      districtId: distObj?._id,
      cityName: '',
      cityId: undefined,
    }));
  };

  const handleCityChange = (selectedCityName: string) => {
    setFormData((prev) => ({ ...prev, city: selectedCityName }));
    const cityObj = citiesList.find((c) => c.name === selectedCityName);
    setLocationData((prev) => ({
      countryName: 'India',
      stateName: formData.state,
      districtName: district,
      ...prev,
      cityName: selectedCityName,
      cityId: cityObj?._id,
    }));
  };

  // Structured Education Year Sequence Handlers
  const handleUgYearChange = (val: string) => {
    setUgYear(val);
    const check = validateDegreeYearSequence(val, pgYear, docYear);
    setYearSequenceError(check.isValid ? null : (check.error || null));
  };

  const handlePgYearChange = (val: string) => {
    setPgYear(val);
    const check = validateDegreeYearSequence(ugYear, val, docYear);
    setYearSequenceError(check.isValid ? null : (check.error || null));
  };

  const handleDocYearChange = (val: string) => {
    setDocYear(val);
    const check = validateDegreeYearSequence(ugYear, pgYear, val);
    setYearSequenceError(check.isValid ? null : (check.error || null));
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
        const res = await uploadProfileImage(base64, file.name);
        const uploadedUrl = res?.url || res?.data?.url;
        if (uploadedUrl) {
          setFormData((prev) => ({ ...prev, primaryPhoto: uploadedUrl }));
          setPhotoPreview(uploadedUrl);
        } else {
          setErrorMsg('Failed to upload photo. Please try again.');
        }
      } catch (uploadErr) {
        console.warn('Profile photo upload error:', uploadErr);
        setErrorMsg('Failed to upload image to server. Please try a different photo.');
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

    if (!ugQualification) {
      setErrorMsg('Please select your undergraduate medical qualification (UG).');
      setSaving(false);
      return;
    }

    const seqCheck = validateDegreeYearSequence(ugYear, pgYear, docYear);
    if (!seqCheck.isValid) {
      setErrorMsg(seqCheck.error || 'Please correct the chronological completion year sequence.');
      setSaving(false);
      return;
    }

    try {
      // Build structured medical qualifications
      const structuredMedQuals = {
        undergraduate: ugQualification
          ? [
              {
                qualification: ugQualification,
                specialization: ugSpecialization || undefined,
                college: ugCollege || undefined,
                institution: ugCollege || undefined,
                completionYear: ugYear || undefined,
                status: 'Completed',
              },
            ]
          : [],
        postgraduate: pgDegree
          ? [
              {
                qualification: pgDegree,
                specialization: pgSpecialization || undefined,
                college: pgCollege || undefined,
                institution: pgCollege || undefined,
                completionYear: pgYear || undefined,
                status: 'Completed',
              },
            ]
          : [],
        doctorate: docDegree
          ? [
              {
                qualification: docDegree,
                specialization: docSpecialization || undefined,
                college: docCollege || undefined,
                institution: docCollege || undefined,
                completionYear: docYear || undefined,
                status: 'Completed',
              },
            ]
          : [],
      };

      // Composite highest degree title
      const docTitle = docDegree ? (docSpecialization ? `${docDegree} (${docSpecialization})` : docDegree) : null;
      const pgTitle = pgDegree ? (pgSpecialization ? `${pgDegree} (${pgSpecialization})` : pgDegree) : null;
      const ugTitle = ugQualification ? (ugSpecialization ? `${ugQualification} (${ugSpecialization})` : ugQualification) : null;
      const compositeDegree = [docTitle, pgTitle, ugTitle].filter(Boolean).join(', ') || formData.degree || ugQualification;
      const primaryEducation = docDegree || pgDegree || ugQualification;

      const fullLocation = {
        stateId: locationData?.stateId,
        stateName: formData.state,
        districtId: locationData?.districtId,
        districtName: district,
        cityId: locationData?.cityId,
        cityName: formData.city,
        countryName: formData.country || 'India',
        formattedAddress: [formData.city, district, formData.state, formData.country || 'India']
          .filter(Boolean)
          .join(', '),
      };

      const payload = {
        ...formData,
        height: formData.height || '',
        annualIncome: formData.annualIncome || '',
        state: formData.state,
        district: district,
        city: formData.city,
        currentLocation: fullLocation,
        education: primaryEducation,
        degree: compositeDegree,
        medicalCollege: ugCollege || pgCollege || formData.degree,
        graduationYear: ugYear || pgYear || undefined,
        medicalQualifications: structuredMedQuals,
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
                  gender={formData.gender}
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
                  value={formatHeightDisplay(formData.height) || formData.height}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="">Select Height *</option>
                  {formData.height && !HEIGHT_OPTIONS.some((h) => h.value === (formatHeightDisplay(formData.height) || formData.height)) && (
                    <option value={formData.height}>{formatHeightDisplay(formData.height) || formData.height}</option>
                  )}
                  {HEIGHT_OPTIONS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 2. Education & Profession */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#E51F3E]" />
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#101828]">
                  Medical Education & Career Details
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Doctor Matrimony Hierarchy
              </span>
            </div>

            {yearSequenceError && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{yearSequenceError}</span>
              </div>
            )}

            {/* 3-Tier Doctor Education */}
            <div className="space-y-5">
              {/* Tier 1: Undergraduate (UG) - Required */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#E51F3E]" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      1. Undergraduate Degree (UG) *
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">UG Qualification *</label>
                    <select
                      value={ugQualification}
                      onChange={(e) => setUgQualification(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    >
                      {UG_MEDICAL_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">UG Specialization</label>
                    <input
                      type="text"
                      value={ugSpecialization}
                      onChange={(e) => setUgSpecialization(e.target.value)}
                      placeholder="e.g. General Practice / Surgery"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Medical College / Institute</label>
                    <input
                      type="text"
                      value={ugCollege}
                      onChange={(e) => setUgCollege(e.target.value)}
                      placeholder="e.g. AIIMS Delhi / CMC Vellore"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Completion Year</label>
                    <input
                      type="number"
                      min="1970"
                      max={new Date().getFullYear() + 5}
                      value={ugYear}
                      onChange={(e) => handleUgYearChange(e.target.value)}
                      placeholder="e.g. 2018"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    />
                  </div>
                </div>
              </div>

              {/* Tier 2: Postgraduate (PG) - Optional */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      2. Postgraduate Degree (PG)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    Optional (MD / MS / MDS / DNB)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">PG Degree</label>
                    <select
                      value={pgDegree}
                      onChange={(e) => setPgDegree(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="">No PG Degree</option>
                      {PG_MEDICAL_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">PG Specialization</label>
                    <input
                      type="text"
                      list="edit-pg-specialties"
                      value={pgSpecialization}
                      onChange={(e) => setPgSpecialization(e.target.value)}
                      disabled={!pgDegree}
                      placeholder={pgDegree ? 'e.g. General Medicine, Orthopaedics' : 'Select PG degree first'}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <datalist id="edit-pg-specialties">
                      {getSpecializationsForPgDegree(pgDegree).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">PG Medical College</label>
                    <input
                      type="text"
                      value={pgCollege}
                      onChange={(e) => setPgCollege(e.target.value)}
                      disabled={!pgDegree}
                      placeholder="e.g. KEM Hospital / PGI Chandigarh"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600">Completion Year</label>
                      {ugYear && !pgYear && pgDegree && (
                        <button
                          type="button"
                          onClick={() => handlePgYearChange(getSuggestedCompletionYear(ugYear, 3))}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          +3 yrs suggestion
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1970"
                      max={new Date().getFullYear() + 5}
                      value={pgYear}
                      onChange={(e) => handlePgYearChange(e.target.value)}
                      disabled={!pgDegree}
                      placeholder="e.g. 2021"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Tier 3: Doctorate / Super-Speciality (DM / MCh / DrNB) */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      3. Doctorate / Super-Speciality
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                    Optional (DM / MCh / DrNB)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Super-Speciality</label>
                    <select
                      value={docDegree}
                      onChange={(e) => setDocDegree(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                    >
                      <option value="">No Super-Speciality</option>
                      {DOCTORATE_MEDICAL_QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Sub-Speciality / Branch</label>
                    <input
                      type="text"
                      list="edit-doc-specialties"
                      value={docSpecialization}
                      onChange={(e) => setDocSpecialization(e.target.value)}
                      disabled={!docDegree}
                      placeholder={docDegree ? 'e.g. Cardiology, Neurosurgery' : 'Select degree first'}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <datalist id="edit-doc-specialties">
                      {getSuggestedSuperSpecialties(pgSpecialization).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Institute / Hospital</label>
                    <input
                      type="text"
                      value={docCollege}
                      onChange={(e) => setDocCollege(e.target.value)}
                      disabled={!docDegree}
                      placeholder="e.g. Tata Memorial / AIIMS"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600">Completion Year</label>
                      {pgYear && !docYear && docDegree && (
                        <button
                          type="button"
                          onClick={() => handleDocYearChange(getSuggestedCompletionYear(pgYear, 3))}
                          className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                        >
                          +3 yrs suggestion
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1970"
                      max={new Date().getFullYear() + 5}
                      value={docYear}
                      onChange={(e) => handleDocYearChange(e.target.value)}
                      disabled={!docDegree}
                      placeholder="e.g. 2024"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Career & Financial Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
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
                  placeholder="e.g. Apollo Hospitals / Private Clinic"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Annual Income Range
                </label>
                <select
                  name="annualIncome"
                  value={formData.annualIncome}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="">Select Annual Income Range</option>
                  {formData.annualIncome && formData.annualIncome !== 'null' && !(ANNUAL_INCOME_OPTIONS as readonly string[]).includes(formData.annualIncome) && (
                    <option value={formData.annualIncome}>
                      {formData.annualIncome}
                    </option>
                  )}
                  {ANNUAL_INCOME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
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
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#E51F3E]" />
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#101828]">
                  Location & Social Background
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                State → District → City Cascading
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cascading State Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  State *
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                >
                  <option value="">Select State *</option>
                  {statesList.map((s) => (
                    <option key={s._id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cascading District Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  District *
                </label>
                <select
                  value={district}
                  disabled={!formData.state || loadingDistricts}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingDistricts
                      ? 'Loading Districts...'
                      : !formData.state
                      ? 'Select State first'
                      : 'Select District *'}
                  </option>
                  {district && !districtsList.some((d) => d.name === district) && (
                    <option value={district}>{district}</option>
                  )}
                  {districtsList.map((d) => (
                    <option key={d._id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cascading City Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  City / Town *
                </label>
                <select
                  value={formData.city}
                  disabled={!district || loadingCities}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingCities
                      ? 'Loading Cities...'
                      : !district
                      ? 'Select District first'
                      : 'Select City *'}
                  </option>
                  {formData.city && !citiesList.some((c) => c.name === formData.city) && (
                    <option value={formData.city}>{formData.city}</option>
                  )}
                  {citiesList.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
