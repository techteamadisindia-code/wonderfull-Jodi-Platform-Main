'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Check,
  CheckCircle2,
  AlertCircle,
  User,
  Heart,
  Briefcase,
  Sparkles,
  Shield,
  IndianRupee,
  MapPin,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Home,
  Compass,
} from 'lucide-react';
import { DobInput } from '../DobInput';
import { updateAdminProfile } from '../../services/profileApi';
import {
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALIZATIONS,
} from '../../lib/doctorConstants';

interface AdminEditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onSuccess?: (updatedData: any) => void;
}

export function AdminEditProfileModal({
  isOpen,
  onClose,
  profile,
  onSuccess,
}: AdminEditProfileModalProps) {
  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isDobValid, setIsDobValid] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Initialize form state when modal opens or profile changes
  useEffect(() => {
    if (!profile) return;
    const user = profile.user || profile.profile?.user;

    setFormData({
      // Protected Identity (read-only)
      fullName: user?.fullName || profile.displayName || profile.fullName || '—',
      email: user?.email || profile.email || '—',
      mobile: user?.mobile || profile.mobile || '—',

      // Section 2: Personal Details
      gender: profile.gender || 'Male',
      dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
      maritalStatus: profile.maritalStatus || 'Never Married',
      height: profile.height || '',
      weight: profile.weight || '',
      religion: profile.religion || 'Hindu',
      caste: profile.caste || '',
      subCaste: profile.subCaste || '',
      motherTongue: profile.motherTongue || '',
      city: profile.city || '',
      state: profile.state || '',
      country: profile.country || 'India',

      // Section 3: Professional Details
      education: profile.education || profile.qualification || 'MBBS',
      profession: profile.profession || 'Doctor',
      specialization: profile.additionalQualification || profile.specialization || '',
      degree: profile.degree || '',
      medicalCollege: profile.medicalCollege || profile.institution || '',
      company: profile.company || profile.workplace || '',
      workLocation: profile.workLocation || '',
      workType: profile.workType || 'Hospital Practice',
      annualIncome: profile.annualIncome || '₹ 25 - 35 Lakhs',
      medicalRegistrationNumber: profile.medicalRegistrationNumber || '',
      medicalCouncil: profile.medicalCouncil || '',

      // Section 4: Profile Details & Bio
      about: profile.about || profile.bio || '',
      foodPreference: profile.foodPreference || profile.lifestyleInterests?.diet || 'Vegetarian',
      smoking: profile.smoking || profile.lifestyleInterests?.smoking || 'No',
      drinking: profile.drinking || profile.lifestyleInterests?.alcohol || 'No',
      preferredAgeMin: profile.partnerPreferences?.preferredAgeMin || '',
      preferredAgeMax: profile.partnerPreferences?.preferredAgeMax || '',
      preferredLocation: profile.partnerPreferences?.preferredLocation || '',

      // Section 5: Admin Controls
      status: profile.status || 'Active',
      verificationStatus: profile.verificationStatus || 'UNVERIFIED',
      accountStatus: user?.status || 'Active',
    });

    setIsDobValid(true);
    setFormError(null);
    setSuccessToast(null);
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const user = profile.user || profile.profile?.user;
  const profileId = profile._id || profile.id;

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleDobChange = (isoDate: string, isValid: boolean) => {
    setFormData((prev) => ({ ...prev, dob: isoDate }));
    setIsDobValid(isValid);
  };

  // Form Validation & Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    // 1. Validation checks
    if (!formData.gender) {
      setFormError('Please select a gender.');
      return;
    }

    if (formData.dob && !isDobValid) {
      setFormError('Please enter a valid date of birth before saving.');
      return;
    }

    if (!formData.city || !formData.city.trim()) {
      setFormError('City is required.');
      return;
    }

    setSaveLoading(true);
    setFormError(null);

    try {
      // 2. Build whitelist payload - explicitly EXCLUDE protected fields
      const payload: Record<string, any> = {
        gender: formData.gender,
        dob: formData.dob || undefined,
        maritalStatus: formData.maritalStatus,
        height: formData.height,
        weight: formData.weight,
        religion: formData.religion,
        caste: formData.caste,
        subCaste: formData.subCaste,
        motherTongue: formData.motherTongue,
        city: formData.city.trim(),
        state: formData.state ? formData.state.trim() : undefined,
        country: formData.country ? formData.country.trim() : 'India',

        education: formData.education,
        qualification: formData.education,
        degree: formData.degree,
        profession: formData.profession,
        specialization: formData.specialization,
        additionalQualification: formData.specialization,
        company: formData.company,
        workplace: formData.company,
        medicalCollege: formData.medicalCollege,
        institution: formData.medicalCollege,
        workLocation: formData.workLocation,
        workType: formData.workType,
        annualIncome: formData.annualIncome,
        medicalRegistrationNumber: formData.medicalRegistrationNumber,
        medicalCouncil: formData.medicalCouncil,

        about: formData.about,
        bio: formData.about,
        foodPreference: formData.foodPreference,
        smoking: formData.smoking,
        drinking: formData.drinking,
        lifestyleInterests: {
          diet: formData.foodPreference,
          smoking: formData.smoking,
          alcohol: formData.drinking,
        },
        partnerPreferences: {
          preferredAgeMin: formData.preferredAgeMin ? Number(formData.preferredAgeMin) : undefined,
          preferredAgeMax: formData.preferredAgeMax ? Number(formData.preferredAgeMax) : undefined,
          preferredLocation: formData.preferredLocation,
        },

        status: formData.status,
        profileStatus: formData.status,
        verificationStatus: formData.verificationStatus,
        kycStatus: formData.verificationStatus,
        accountStatus: formData.accountStatus,
      };

      // Security guarantee: completely remove any protected fields
      delete payload.name;
      delete payload.fullName;
      delete payload.displayName;
      delete payload.firstName;
      delete payload.lastName;
      delete payload.email;
      delete payload.phone;
      delete payload.mobile;
      delete payload.mobileNumber;

      const res = await updateAdminProfile(profileId, payload);

      setSuccessToast('Profile updated successfully.');
      if (onSuccess) {
        onSuccess(res.data || res);
      }

      // Close modal smoothly after brief feedback
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setFormError(
        err?.response?.data?.message || err?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl sm:max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── FIXED HEADER ── */}
        <div className="p-5 sm:px-8 sm:py-5 border-b border-slate-200/90 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-[#E51F3E] text-white flex items-center justify-center shadow-xs shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Edit Profile: {formData.fullName || profile.displayName || 'Candidate'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and modify candidate information. Core identity credentials remain locked.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Close Popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE FORM CONTENT ── */}
        <form
          id="admin-edit-profile-form"
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 text-xs custom-scrollbar"
        >
          {/* Notification Banners */}
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold text-xs">{formError}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-bold text-xs">{successToast}</span>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 1: PROTECTED ACCOUNT INFORMATION 🔒                   */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-2xl p-5 bg-gradient-to-br from-amber-50/50 via-slate-50 to-slate-50 border border-amber-200/80 shadow-2xs">
            <div className="flex items-start justify-between gap-3 border-b border-amber-200/60 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>SECTION 1: Protected Account Information 🔒</span>
                </h4>
                <p className="text-xs font-semibold text-amber-800 mt-1">
                  Name, Email Address and Mobile Number are protected and cannot be modified by administrators.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300/80 shrink-0 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Read-Only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    Full Name <Lock className="w-3 h-3 text-amber-600" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Locked</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formData.fullName}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed select-none shadow-2xs"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" title="Protected credential">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    Email Address <Lock className="w-3 h-3 text-amber-600" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Locked</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    readOnly
                    value={formData.email}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed select-none shadow-2xs"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" title="Protected credential">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    Mobile Number <Lock className="w-3 h-3 text-amber-600" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Locked</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formData.mobile}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed select-none shadow-2xs"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" title="Protected credential">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 2: PERSONAL INFORMATION                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-2xl p-5 bg-white border border-slate-200 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E51F3E]" />
                <span>SECTION 2: Personal Information</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Demographic and physical details for matrimonial matchmaking.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Gender */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Gender *</label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date of Birth with Automatic Age Calculation */}
              <div className="sm:col-span-2">
                <DobInput
                  label="Date of Birth"
                  value={formData.dob || ''}
                  required={false}
                  onChange={handleDobChange}
                  helperText="Date of Birth [ DD ] [ MM ] [ YYYY ]"
                />
              </div>

              {/* Marital Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Marital Status</label>
                <select
                  value={formData.maritalStatus || 'Never Married'}
                  onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="Never Married">Never Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Awaiting Divorce">Awaiting Divorce</option>
                </select>
              </div>

              {/* Height */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Height</label>
                <input
                  type="text"
                  placeholder="e.g. 5'7'' (170 cm)"
                  value={formData.height || ''}
                  onChange={(e) => handleFieldChange('height', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>

              {/* Religion */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Religion</label>
                <select
                  value={formData.religion || 'Hindu'}
                  onChange={(e) => handleFieldChange('religion', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="Hindu">Hindu</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Christian">Christian</option>
                  <option value="Sikh">Sikh</option>
                  <option value="Jain">Jain</option>
                  <option value="Buddhist">Buddhist</option>
                  <option value="Parsi">Parsi</option>
                  <option value="Jewish">Jewish</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Caste / Subcaste */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Caste / Subcaste</label>
                <input
                  type="text"
                  placeholder="e.g. Brahmin / Deshastha"
                  value={formData.caste ? `${formData.caste}${formData.subCaste ? ` / ${formData.subCaste}` : ''}` : ''}
                  onChange={(e) => {
                    const parts = e.target.value.split('/');
                    handleFieldChange('caste', parts[0]?.trim() || '');
                    if (parts[1]) handleFieldChange('subCaste', parts[1]?.trim() || '');
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>

              {/* City */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">City *</label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={formData.city || ''}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                  required
                />
              </div>

              {/* State / Province */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">State / Province</label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={formData.state || ''}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>

              {/* Country */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Country</label>
                <input
                  type="text"
                  placeholder="e.g. India"
                  value={formData.country || 'India'}
                  onChange={(e) => handleFieldChange('country', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 3: PROFESSIONAL INFORMATION                           */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-2xl p-5 bg-white border border-slate-200 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>SECTION 3: Professional Information</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Medical degrees, clinical specialization, workplace and compensation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Medical Qualification */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Medical Qualification *</label>
                <select
                  value={formData.education || ''}
                  onChange={(e) => handleFieldChange('education', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                  required
                >
                  <option value="" disabled>Select medical qualification</option>
                  {DOCTOR_QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medical Specialization */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Medical Specialization *</label>
                <select
                  value={formData.profession || ''}
                  onChange={(e) => handleFieldChange('profession', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                  required
                >
                  <option value="" disabled>Select medical specialization</option>
                  {DOCTOR_SPECIALIZATIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Degree Details / Speciality Sub-field */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Degree / Sub-Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. MD Pediatrics / DNB Cardiology"
                  value={formData.specialization || formData.degree || ''}
                  onChange={(e) => {
                    handleFieldChange('specialization', e.target.value);
                    handleFieldChange('degree', e.target.value);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>

              {/* College / Institution */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">College / Institution</label>
                <input
                  type="text"
                  placeholder="e.g. B.J. Medical College / AIIMS"
                  value={formData.medicalCollege || ''}
                  onChange={(e) => handleFieldChange('medicalCollege', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>

              {/* Company / Workplace */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Company / Workplace / Hospital</label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Hospital / Private Clinic"
                  value={formData.company || ''}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>

              {/* Annual Income */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Annual Income</label>
                <select
                  value={formData.annualIncome || '₹ 25 - 35 Lakhs'}
                  onChange={(e) => handleFieldChange('annualIncome', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="Under ₹ 10 Lakhs">Under ₹ 10 Lakhs</option>
                  <option value="₹ 10 - 15 Lakhs">₹ 10 - 15 Lakhs</option>
                  <option value="₹ 15 - 25 Lakhs">₹ 15 - 25 Lakhs</option>
                  <option value="₹ 25 - 35 Lakhs">₹ 25 - 35 Lakhs</option>
                  <option value="₹ 35 - 50 Lakhs">₹ 35 - 50 Lakhs</option>
                  <option value="₹ 50 - 75 Lakhs">₹ 50 - 75 Lakhs</option>
                  <option value="₹ 75 Lakhs - 1 Crore">₹ 75 Lakhs - 1 Crore</option>
                  <option value="Above ₹ 1 Crore">Above ₹ 1 Crore</option>
                </select>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 4: PROFILE INFORMATION                                */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-2xl p-5 bg-white border border-slate-200 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>SECTION 4: Profile Information</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                About bio statement, lifestyle preferences, and partner expectations.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">About / Bio Statement</label>
              <textarea
                rows={3}
                placeholder="Candidate's matrimonial bio and summary..."
                value={formData.about || ''}
                onChange={(e) => handleFieldChange('about', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Diet */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Diet Preference</label>
                <select
                  value={formData.foodPreference || 'Vegetarian'}
                  onChange={(e) => handleFieldChange('foodPreference', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Jain">Jain</option>
                </select>
              </div>

              {/* Smoking */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Smoking</label>
                <select
                  value={formData.smoking || 'No'}
                  onChange={(e) => handleFieldChange('smoking', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="Occasionally">Occasionally</option>
                </select>
              </div>

              {/* Drinking */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Drinking</label>
                <select
                  value={formData.drinking || 'No'}
                  onChange={(e) => handleFieldChange('drinking', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="Socially">Socially</option>
                </select>
              </div>
            </div>
          </section>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 5: ADMIN CONTROLS                                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-2xl p-5 bg-white border border-slate-200 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>SECTION 5: Admin Controls</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                KYC verification badge, directory visibility, and user account status.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* KYC Verification Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">KYC Verification Status</label>
                <select
                  value={formData.verificationStatus || 'UNVERIFIED'}
                  onChange={(e) => handleFieldChange('verificationStatus', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="UNVERIFIED">UNVERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              {/* Profile Directory Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Profile Directory Status</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="Active">Active (Public Live Site)</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Deleted">Deleted</option>
                </select>
              </div>

              {/* Account Status */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">User Account Status</label>
                <select
                  value={formData.accountStatus || 'Active'}
                  onChange={(e) => handleFieldChange('accountStatus', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="Active">Active</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Deleted">Deleted</option>
                </select>
              </div>
            </div>
          </section>
        </form>

        {/* ── FIXED FOOTER ── */}
        <div className="p-4 sm:px-8 sm:py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Edits are securely logged in the Administrative Audit Trail.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={saveLoading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="admin-edit-profile-form"
              disabled={saveLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-[#E51F3E] hover:from-red-700 hover:to-red-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {saveLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Profile Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminEditProfileModal;
