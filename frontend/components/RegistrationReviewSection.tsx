'use client';

import React, { useState } from 'react';
import {
  User,
  GraduationCap,
  HeartHandshake,
  Camera,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Users,
  Briefcase,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { SiblingItem, UgQualItem, PgQualItem, DoctorateQualItem } from '../app/register/page';

export interface MissingFieldItem {
  step: number;
  field: string;
  label: string;
  message: string;
}

export interface RegistrationReviewProps {
  // Step 1: Account & Contact
  fullName: string;
  email: string;
  mobile: string;
  gender: string;
  dob: string;

  // Step 2: Personal & Family Details
  maritalStatus: string;
  motherTongue: string;
  religion: string;
  caste: string;
  height: string;
  city: string;
  state: string;
  locationData?: any;
  aboutMe: string;
  personalityValues: string;
  hobbiesInterests: string;
  careerGoals: string;
  familyType: string;
  familyStatus: string;
  fatherName: string;
  fatherProfession: string;
  motherName: string;
  motherProfession: string;
  familyLocation: string;
  familyValues: string;
  aboutFamily: string;
  brothersCount: number;
  sistersCount: number;
  brothers: SiblingItem[];
  sisters: SiblingItem[];

  // Step 3: Medical Education & Career
  ugQualifications: UgQualItem[];
  pgQualifications: PgQualItem[];
  doctorateQualifications: DoctorateQualItem[];
  profession: string;
  company: string;
  workLocation: string;
  annualIncome: string;
  medicalRegistrationNumber: string;
  medicalExperience: string;

  // Step 4: Photo & Partner Preferences
  photoPreview: string | null;
  uploadedPhotoUrl: string;
  lookingFor: string;
  prefAgeMin: string;
  prefAgeMax: string;
  prefHeightMin: string;
  prefHeightMax: string;
  prefEducation: string;
  prefProfession: string;
  prefCountry: string;
  prefState: string;
  prefCity: string;
  prefWillingToRelocate: string;
  prefMaritalStatus: string;
  prefDiet: string;
  prefSmoking: string;
  prefDrinking: string;
  familyExpectations: string;
  additionalExpectations: string;

  // Navigation & Submission
  onEditStep: (stepNumber: 1 | 2 | 3 | 4) => void;
  onGoBack: () => void;
  onSubmitRegistration: () => Promise<void>;
  loading: boolean;
  missingFields?: MissingFieldItem[];
}

export function RegistrationReviewSection({
  fullName,
  email,
  mobile,
  gender,
  dob,
  maritalStatus,
  motherTongue,
  religion,
  caste,
  height,
  city,
  state,
  locationData,
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
  brothersCount,
  sistersCount,
  brothers,
  sisters,
  ugQualifications,
  pgQualifications,
  doctorateQualifications,
  profession,
  company,
  workLocation,
  annualIncome,
  medicalRegistrationNumber,
  medicalExperience,
  photoPreview,
  uploadedPhotoUrl,
  lookingFor,
  prefAgeMin,
  prefAgeMax,
  prefHeightMin,
  prefHeightMax,
  prefEducation,
  prefProfession,
  prefCountry,
  prefState,
  prefCity,
  prefWillingToRelocate,
  prefMaritalStatus,
  prefDiet,
  prefSmoking,
  prefDrinking,
  familyExpectations,
  additionalExpectations,
  onEditStep,
  onGoBack,
  onSubmitRegistration,
  loading,
  missingFields = [],
}: RegistrationReviewProps) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const displayPhoto = uploadedPhotoUrl || photoPreview;

  const handleConfirmSubmit = async () => {
    setConfirmModalOpen(false);
    await onSubmitRegistration();
  };

  return (
    <div className="space-y-6">
      {/* Missing Fields Summary Banner */}
      {missingFields.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-300 p-5 shadow-xs animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#E51F3E] shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="text-sm font-bold text-rose-900">
                Action Required Before Final Submission ({missingFields.length} field{missingFields.length === 1 ? '' : 's'} missing)
              </h4>
              <p className="text-xs text-rose-700">
                Please review and complete the following required details. Click any item to jump directly to that step:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {missingFields.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onEditStep(item.step as 1 | 2 | 3 | 4)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-rose-200 text-left hover:border-[#E51F3E] hover:shadow-xs transition group cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-rose-900 group-hover:text-[#E51F3E]">
                      {item.label}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#E51F3E] bg-rose-50 px-2 py-0.5 rounded-full">
                      Step {item.step} →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          SECTION 1: Account & Contact
         ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Account & Contact Credentials</h3>
              <p className="text-[11px] text-slate-500">Candidate identification and login credentials.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#E51F3E] hover:bg-rose-50 text-slate-700 hover:text-[#E51F3E] text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Full Name</span>
            <span className="font-bold text-slate-800 text-sm">{fullName || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Email Address</span>
            <span className="font-semibold text-slate-800 break-all">{email || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Mobile Number</span>
            <span className="font-semibold text-slate-800">{mobile || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Gender</span>
            <span className="font-semibold text-slate-800">{gender || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Date of Birth</span>
            <span className="font-semibold text-slate-800">{dob || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Password</span>
            <span className="font-mono text-slate-600">•••••••• (Encrypted)</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 2: Personal & Family Background
         ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. Personal & Family Background</h3>
              <p className="text-[11px] text-slate-500">Cultural identity, location, siblings, and family values.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#E51F3E] hover:bg-rose-50 text-slate-700 hover:text-[#E51F3E] text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Marital Status</span>
            <span className="font-semibold text-slate-800">{maritalStatus || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Mother Tongue</span>
            <span className="font-semibold text-slate-800">{motherTongue || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Religion</span>
            <span className="font-semibold text-slate-800">{religion || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Caste / Community</span>
            <span className="font-semibold text-slate-800">{caste || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Height</span>
            <span className="font-semibold text-slate-800">{height || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">City of Residence</span>
            <span className="font-semibold text-slate-800">
              {city || '—'}
              {locationData?.districtName ? ` (${locationData.districtName})` : ''}
              {locationData?.pinCode ? ` - ${locationData.pinCode}` : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">State / Province</span>
            <span className="font-semibold text-slate-800">{state || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Family Type</span>
            <span className="font-semibold text-slate-800">{familyType || '—'}</span>
          </div>
        </div>

        {/* Parents & Family Details */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl">
          <div>
            <span className="text-slate-500 font-medium">Father Details:</span>
            <p className="font-bold text-slate-800">
              {fatherName ? `${fatherName} (${fatherProfession || 'Not specified'})` : (fatherProfession || 'Not specified')}
            </p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Mother Details:</span>
            <p className="font-bold text-slate-800">
              {motherName ? `${motherName} (${motherProfession || 'Not specified'})` : (motherProfession || 'Not specified')}
            </p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Siblings Summary:</span>
            <p className="font-bold text-slate-800">
              {brothersCount} Brother{brothersCount === 1 ? '' : 's'}, {sistersCount} Sister{sistersCount === 1 ? '' : 's'}
            </p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Family Values / Location:</span>
            <p className="font-bold text-slate-800">{familyValues || familyLocation || 'Traditional & Progressive'}</p>
          </div>
        </div>

        {/* About Me & Family Background Text */}
        {(aboutMe || aboutFamily) && (
          <div className="space-y-2 pt-1 text-xs">
            {aboutMe && (
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">About Candidate:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/70 italic leading-relaxed">
                  &ldquo;{aboutMe}&rdquo;
                </p>
              </div>
            )}
            {aboutFamily && (
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">About Family:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/70 italic leading-relaxed">
                  &ldquo;{aboutFamily}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 3: Medical Education & Career
         ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">3. Medical Education & Career Practice</h3>
              <p className="text-[11px] text-slate-500">Doctor qualifications, practice area, hospital, and credentials.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#E51F3E] hover:bg-rose-50 text-slate-700 hover:text-[#E51F3E] text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        {/* Qualifications Badges */}
        <div className="space-y-2.5 text-xs">
          <span className="text-slate-400 font-semibold block">Degrees & Institutions:</span>
          <div className="space-y-2">
            {ugQualifications.map((ug, idx) => (
              <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase mr-2">
                    UG
                  </span>
                  <span className="font-bold text-slate-800 text-sm">{ug.qualification}</span>
                  {ug.college && <span className="text-slate-600 ml-1.5">({ug.college})</span>}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {ug.passingYear && <span className="mr-2">Passed: {ug.passingYear}</span>}
                  <span className="font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {ug.status}
                  </span>
                </div>
              </div>
            ))}

            {pgQualifications.map((pg, idx) => (
              <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold uppercase mr-2">
                    PG
                  </span>
                  <span className="font-bold text-slate-800 text-sm">{pg.qualification}</span>
                  {pg.specialization && <span className="text-[#E51F3E] font-medium ml-1">({pg.specialization})</span>}
                  {pg.college && <span className="text-slate-600 ml-1.5">- {pg.college}</span>}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {pg.passingYear && <span className="mr-2">Passed: {pg.passingYear}</span>}
                  <span className="font-semibold text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-200">
                    {pg.status}
                  </span>
                </div>
              </div>
            ))}

            {doctorateQualifications.map((doc, idx) => (
              <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold uppercase mr-2">
                    Doctorate
                  </span>
                  <span className="font-bold text-slate-800 text-sm">{doc.qualification}</span>
                  {doc.specialization && <span className="text-purple-700 font-medium ml-1">({doc.specialization})</span>}
                  {doc.college && <span className="text-slate-600 ml-1.5">- {doc.college}</span>}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {doc.passingYear && <span className="mr-2">Passed: {doc.passingYear}</span>}
                  <span className="font-semibold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Practice Details Grid */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-400 font-medium block">Medical Specialization</span>
            <span className="font-bold text-[#E51F3E] text-sm">{profession || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Hospital / Clinic</span>
            <span className="font-semibold text-slate-800">{company || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Work Location</span>
            <span className="font-semibold text-slate-800">{workLocation || city || 'India'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Annual Income</span>
            <span className="font-semibold text-slate-800">{annualIncome || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Medical Reg. Number</span>
            <span className="font-semibold text-slate-800">{medicalRegistrationNumber || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Clinical Experience</span>
            <span className="font-semibold text-slate-800">{medicalExperience || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SECTION 4: Photo & Partner Preferences
         ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">4. Photo & Partner Preferences</h3>
              <p className="text-[11px] text-slate-500">Candidate photo and desired partner attributes.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#E51F3E] hover:bg-rose-50 text-slate-700 hover:text-[#E51F3E] text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        {/* Photo + Preferences Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
            {displayPhoto ? (
              <img src={displayPhoto} alt="Candidate Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-1 text-slate-400">
                <Camera className="w-6 h-6 mx-auto" />
                <span className="text-[9px] block">No Photo</span>
              </div>
            )}
          </div>
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">Looking for: {lookingFor === 'Male' ? 'Doctor Groom' : 'Doctor Bride'}</span>
              <span className="text-[10px] bg-rose-100 text-[#E51F3E] px-2 py-0.5 rounded-full font-bold">
                Ages {prefAgeMin} - {prefAgeMax}
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Preferred Height: {prefHeightMin} - {prefHeightMax} • Relocation: {prefWillingToRelocate}
            </p>
          </div>
        </div>

        {/* Partner Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Preferred Qualification</span>
            <span className="font-semibold text-slate-800">{prefEducation || 'Any Medical'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Preferred Specialization</span>
            <span className="font-semibold text-slate-800">{prefProfession || 'Any Specialization'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Preferred Location</span>
            <span className="font-semibold text-slate-800">{prefCity || prefState || prefCountry || 'All India'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Marital Status</span>
            <span className="font-semibold text-slate-800">{prefMaritalStatus || 'Never Married'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Diet Preference</span>
            <span className="font-semibold text-slate-800">{prefDiet || 'Any'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Smoking Preference</span>
            <span className="font-semibold text-slate-800">{prefSmoking || 'Does Not Matter'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Drinking Preference</span>
            <span className="font-semibold text-slate-800">{prefDrinking || 'Does Not Matter'}</span>
          </div>
        </div>

        {/* Family & Additional Expectations */}
        {(familyExpectations || additionalExpectations) && (
          <div className="space-y-2 pt-1 text-xs">
            {familyExpectations && (
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Family Expectations:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/70 italic leading-relaxed">
                  &ldquo;{familyExpectations}&rdquo;
                </p>
              </div>
            )}
            {additionalExpectations && (
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Additional Expectations:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/70 italic leading-relaxed">
                  &ldquo;{additionalExpectations}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────
          NAVIGATION BUTTONS (Back to Step 4 / Submit Registration)
         ─────────────────────────────────────────────────────────── */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onGoBack}
          className="w-full sm:w-auto px-6 h-[48px] rounded-[12px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Step 4</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (missingFields.length > 0) {
              onEditStep(missingFields[0].step as 1 | 2 | 3 | 4);
            } else {
              setConfirmModalOpen(true);
            }
          }}
          className="w-full sm:w-auto px-8 h-[50px] rounded-[14px] bg-[#E51F3E] hover:bg-[#d11735] text-white font-bold text-sm shadow-md shadow-red-500/20 hover:shadow-lg transition-all duration-200 inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Submitting Registration...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Submit Registration</span>
            </>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────
          SUBMISSION CONFIRMATION MODAL
         ─────────────────────────────────────────────────────────── */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Confirm Registration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Please confirm that the information provided is correct. You can edit any section before submitting.
            </p>

            <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800">
              <span className="font-bold">Notice:</span> After final submission, your verified doctor profile will be initialized and you will be logged into your account dashboard.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Review Again
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#E51F3E] hover:bg-[#d11735] text-white text-xs font-bold shadow-md inline-flex items-center gap-2 transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm & Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
