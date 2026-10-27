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
  HEIGHT_OPTIONS,
  ANNUAL_INCOME_OPTIONS,
  formatHeightDisplay,
} from '../../lib/doctorConstants';

interface AdminEditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  canEditPrivate?: boolean;
  onSuccess?: (updatedData: any) => void;
}

export function AdminEditProfileModal({
  isOpen,
  onClose,
  profile,
  canEditPrivate = false,
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
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isDobValid, setIsDobValid] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Initialize form state when modal opens or profile changes
  useEffect(() => {
    if (!profile) return;
    const user = profile.user || profile.profile?.user;

    const initial: Record<string, any> = {
      // Protected Identity & Contact Information
      fullName: user?.fullName || profile.displayName || profile.fullName || '',
      email: user?.email || profile.email || '',
      mobile: user?.mobile || profile.mobile || '',
      formattedAddress: profile.currentLocation?.formattedAddress || '',

      // Section 2: Personal Details - NEVER initialize with invented defaults
      gender: profile.gender || '',
      dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
      maritalStatus: profile.maritalStatus || '',
      height: profile.height || '',
      weight: profile.weight || '',
      religion: profile.religion || '',
      caste: profile.caste || '',
      subCaste: profile.subCaste || '',
      motherTongue: profile.motherTongue || '',
      city: profile.city || '',
      state: profile.state || '',
      country: profile.country || '',

      // Section 3: Professional Details
      education: profile.education || profile.qualification || '',
      profession: profile.profession || '',
      specialization: profile.additionalQualification || profile.specialization || '',
      degree: profile.degree || '',
      medicalCollege: profile.medicalCollege || profile.institution || '',
      company: profile.company || profile.workplace || '',
      workLocation: profile.workLocation || '',
      workType: profile.workType || '',
      annualIncome: profile.annualIncome || '',
      medicalRegistrationNumber: profile.medicalRegistrationNumber || '',
      medicalCouncil: profile.medicalCouncil || '',

      // Section 4: Profile Details & Bio
      about: profile.about || profile.bio || '',
      foodPreference: profile.foodPreference || profile.lifestyleInterests?.diet || '',
      smoking: profile.smoking || profile.lifestyleInterests?.smoking || '',
      drinking: profile.drinking || profile.lifestyleInterests?.alcohol || '',
      preferredAgeMin: profile.partnerPreferences?.preferredAgeMin !== undefined ? String(profile.partnerPreferences.preferredAgeMin) : '',
      preferredAgeMax: profile.partnerPreferences?.preferredAgeMax !== undefined ? String(profile.partnerPreferences.preferredAgeMax) : '',
      preferredLocation: profile.partnerPreferences?.preferredLocation || '',

      // Section 5: Admin Controls
      status: profile.status || 'Active',
      verificationStatus: profile.verificationStatus || 'UNVERIFIED',
      accountStatus: user?.status || 'Active',
    };

    setFormData(initial);
    setInitialValues(initial);
    setTouchedFields(new Set());
    setIsDobValid(true);
    setFormError(null);
    setSuccessToast(null);
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const user = profile.user || profile.profile?.user;
  const profileId = profile._id || profile.id;

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouchedFields((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    if (formError) setFormError(null);
  };

  const handleDobChange = (isoDate: string, isValid: boolean) => {
    setFormData((prev) => ({ ...prev, dob: isoDate }));
    setTouchedFields((prev) => {
      const next = new Set(prev);
      next.add('dob');
      return next;
    });
    setIsDobValid(isValid);
  };

  // Form Validation & Safe Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    // Validate only modified / touched fields
    if (touchedFields.has('dob') && formData.dob && !isDobValid) {
      setFormError('Please enter a valid date of birth before saving.');
      return;
    }

    if (touchedFields.has('city') && !formData.city?.trim()) {
      setFormError('City cannot be cleared to empty.');
      return;
    }

    // Determine which fields were actually changed from initial values
    const changedKeys = Array.from(touchedFields).filter(
      (k) => formData[k] !== initialValues[k]
    );

    if (changedKeys.length === 0) {
      setSuccessToast('No changes detected.');
      setTimeout(() => onClose(), 600);
      return;
    }

    setSaveLoading(true);
    setFormError(null);

    try {
      // Build safe update payload containing ONLY touched & modified fields
      const payload: Record<string, any> = {};

      const isChanged = (field: string) => touchedFields.has(field) && formData[field] !== initialValues[field];

      if (isChanged('gender')) payload.gender = formData.gender;
      if (isChanged('dob')) payload.dob = formData.dob || undefined;
      if (isChanged('maritalStatus')) payload.maritalStatus = formData.maritalStatus;
      if (isChanged('height')) payload.height = formData.height;
      if (isChanged('weight')) payload.weight = formData.weight;
      if (isChanged('religion')) payload.religion = formData.religion;
      if (isChanged('caste')) payload.caste = formData.caste;
      if (isChanged('subCaste')) payload.subCaste = formData.subCaste;
      if (isChanged('motherTongue')) payload.motherTongue = formData.motherTongue;
      if (isChanged('city')) payload.city = formData.city.trim();
      if (isChanged('state')) payload.state = formData.state ? formData.state.trim() : '';
      if (isChanged('country')) payload.country = formData.country ? formData.country.trim() : '';

      if (isChanged('education')) {
        payload.education = formData.education;
        payload.qualification = formData.education;
      }
      if (isChanged('degree')) payload.degree = formData.degree;
      if (isChanged('profession')) payload.profession = formData.profession;
      if (isChanged('specialization')) {
        payload.specialization = formData.specialization;
        payload.additionalQualification = formData.specialization;
      }
      if (isChanged('company')) {
        payload.company = formData.company;
        payload.workplace = formData.company;
      }
      if (isChanged('medicalCollege')) {
        payload.medicalCollege = formData.medicalCollege;
        payload.institution = formData.medicalCollege;
      }
      if (isChanged('workLocation')) payload.workLocation = formData.workLocation;
      if (isChanged('workType')) payload.workType = formData.workType;
      if (isChanged('annualIncome')) payload.annualIncome = formData.annualIncome;
      if (isChanged('medicalRegistrationNumber')) payload.medicalRegistrationNumber = formData.medicalRegistrationNumber;
      if (isChanged('medicalCouncil')) payload.medicalCouncil = formData.medicalCouncil;

      if (isChanged('about')) {
        payload.about = formData.about;
        payload.bio = formData.about;
      }
      if (isChanged('foodPreference')) payload.foodPreference = formData.foodPreference;
      if (isChanged('smoking')) payload.smoking = formData.smoking;
      if (isChanged('drinking')) payload.drinking = formData.drinking;

      // Safe deep merge for lifestyle: only touch specified fields, preserve existing hobbies/languages
      if (isChanged('foodPreference') || isChanged('smoking') || isChanged('drinking')) {
        payload.lifestyleInterests = {
          ...(profile.lifestyleInterests || {}),
          ...(isChanged('foodPreference') ? { diet: formData.foodPreference } : {}),
          ...(isChanged('smoking') ? { smoking: formData.smoking } : {}),
          ...(isChanged('drinking') ? { alcohol: formData.drinking } : {}),
        };
      }

      // Safe deep merge for partner preferences
      if (isChanged('preferredAgeMin') || isChanged('preferredAgeMax') || isChanged('preferredLocation')) {
        payload.partnerPreferences = {
          ...(profile.partnerPreferences || {}),
          ...(isChanged('preferredAgeMin') ? { preferredAgeMin: formData.preferredAgeMin ? Number(formData.preferredAgeMin) : undefined } : {}),
          ...(isChanged('preferredAgeMax') ? { preferredAgeMax: formData.preferredAgeMax ? Number(formData.preferredAgeMax) : undefined } : {}),
          ...(isChanged('preferredLocation') ? { preferredLocation: formData.preferredLocation } : {}),
        };
      }

      if (isChanged('status')) {
        payload.status = formData.status;
        payload.profileStatus = formData.status;
      }
      if (isChanged('verificationStatus')) {
        payload.verificationStatus = formData.verificationStatus;
        payload.kycStatus = formData.verificationStatus;
      }
      if (isChanged('accountStatus')) {
        payload.accountStatus = formData.accountStatus;
      }

      if (!canEditPrivate) {
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
      } else {
        // Authorized with privateInfo.edit: submit contact fields only if modified
        if (isChanged('email') && formData.email && formData.email.trim()) {
          payload.email = formData.email.trim();
        }
        if (isChanged('mobile') && formData.mobile && formData.mobile.trim()) {
          payload.mobile = formData.mobile.trim();
        }
        if (isChanged('formattedAddress') && formData.formattedAddress !== undefined) {
          payload.currentLocation = {
            ...(profile.currentLocation || {}),
            formattedAddress: formData.formattedAddress.trim(),
          };
        }
        delete payload.name;
        delete payload.fullName;
        delete payload.displayName;
        delete payload.firstName;
        delete payload.lastName;
      }

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
          {/* SECTION 1: ACCOUNT & CONTACT INFORMATION                      */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-2xl p-5 bg-gradient-to-br from-amber-50/50 via-slate-50 to-slate-50 border border-amber-200/80 shadow-2xs">
            <div className="flex items-start justify-between gap-3 border-b border-amber-200/60 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>SECTION 1: Account & Contact Information</span>
                </h4>
                <p className="text-xs font-semibold text-amber-800 mt-1">
                  {canEditPrivate
                    ? 'You have privateInfo.edit permission. Edits to email and mobile update the candidate primary contact record.'
                    : 'Name, Email Address and Mobile Number are protected. You need privateInfo.edit permission to modify contact details.'}
                </p>
              </div>
              {canEditPrivate ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300/80 shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Edit Permitted
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300/80 shrink-0 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-Only
                </span>
              )}
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
                    Email Address {canEditPrivate ? null : <Lock className="w-3 h-3 text-amber-600" />}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {canEditPrivate ? 'Editable' : 'Locked'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled={!canEditPrivate}
                    readOnly={!canEditPrivate}
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="doctor@example.com"
                    className={`w-full pl-3 pr-9 py-2.5 rounded-xl text-xs font-bold ${
                      canEditPrivate
                        ? 'bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                        : 'bg-slate-100/90 border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                    } shadow-2xs`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {canEditPrivate ? <Mail className="w-3.5 h-3.5 text-slate-400" /> : <Lock className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    Mobile Number {canEditPrivate ? null : <Lock className="w-3 h-3 text-amber-600" />}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {canEditPrivate ? 'Editable' : 'Locked'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!canEditPrivate}
                    readOnly={!canEditPrivate}
                    value={formData.mobile}
                    onChange={(e) => handleFieldChange('mobile', e.target.value)}
                    placeholder="+919876543210"
                    className={`w-full pl-3 pr-9 py-2.5 rounded-xl text-xs font-bold ${
                      canEditPrivate
                        ? 'bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                        : 'bg-slate-100/90 border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                    } shadow-2xs`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {canEditPrivate ? <Phone className="w-3.5 h-3.5 text-slate-400" /> : <Lock className="w-3.5 h-3.5" />}
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
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Gender</label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Gender (Not recorded)</option>
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
                  value={formData.maritalStatus || ''}
                  onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Marital Status (Not recorded)</option>
                  <option value="Never Married">Never Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Awaiting Divorce">Awaiting Divorce</option>
                </select>
              </div>

              {/* Height */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Height</label>
                <select
                  value={formatHeightDisplay(formData.height) || formData.height || ''}
                  onChange={(e) => handleFieldChange('height', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Height</option>
                  {formData.height && !HEIGHT_OPTIONS.some((h) => h.value === (formatHeightDisplay(formData.height) || formData.height)) && (
                    <option value={formData.height}>{formatHeightDisplay(formData.height) || formData.height}</option>
                  )}
                  {HEIGHT_OPTIONS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>

              {/* Religion */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Religion</label>
                <select
                  value={formData.religion || ''}
                  onChange={(e) => handleFieldChange('religion', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Religion (Not recorded)</option>
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
                  value={formData.country || ''}
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
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Medical Qualification</label>
                <select
                  value={formData.education || ''}
                  onChange={(e) => handleFieldChange('education', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select medical qualification (Not recorded)</option>
                  {DOCTOR_QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medical Specialization */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Medical Specialization</label>
                <select
                  value={formData.profession || ''}
                  onChange={(e) => handleFieldChange('profession', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select medical specialization (Not recorded)</option>
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
                  value={formData.annualIncome || ''}
                  onChange={(e) => handleFieldChange('annualIncome', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Annual Income Range</option>
                  {formData.annualIncome && formData.annualIncome !== 'null' && !(ANNUAL_INCOME_OPTIONS as readonly string[]).includes(formData.annualIncome) && (
                    <option value={formData.annualIncome}>{formData.annualIncome}</option>
                  )}
                  {ANNUAL_INCOME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
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
                  value={formData.foodPreference || ''}
                  onChange={(e) => handleFieldChange('foodPreference', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Diet (Not recorded)</option>
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
                  value={formData.smoking || ''}
                  onChange={(e) => handleFieldChange('smoking', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Smoking (Not recorded)</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="Occasionally">Occasionally</option>
                </select>
              </div>

              {/* Drinking */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Drinking</label>
                <select
                  value={formData.drinking || ''}
                  onChange={(e) => handleFieldChange('drinking', e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                >
                  <option value="">Select Drinking (Not recorded)</option>
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
