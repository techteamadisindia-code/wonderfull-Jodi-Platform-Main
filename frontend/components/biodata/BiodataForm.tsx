'use client';

import React, { useState, useRef } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  Users,
  Moon,
  Sparkles,
  Heart,
  Phone,
  Camera,
  ChevronDown,
  Upload,
  Check,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { BiodataRecord, BiodataSectionVisibility } from '../../services/biodataApi';
import { uploadProfileImage } from '../../lib/api';

interface BiodataFormProps {
  biodata: Partial<BiodataRecord>;
  onChange: (updated: Partial<BiodataRecord>) => void;
  availablePhotos?: string[];
}

export function BiodataForm({ biodata, onChange, availablePhotos = [] }: BiodataFormProps) {
  // Accordion active state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    photo: true,
    personal: true,
    education: true,
    career: true,
    family: false,
    horoscope: false,
    lifestyle: false,
    partner: false,
    contact: false,
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibility: BiodataSectionVisibility = biodata.sectionVisibility || {
    personalDetails: true,
    education: true,
    medicalCareer: true,
    family: true,
    lifestyle: true,
    horoscope: true,
    partnerPreferences: true,
    contactDetails: false,
    photo: true,
  };

  const toggleVisibility = (key: keyof BiodataSectionVisibility) => {
    const updatedVisibility = { ...visibility, [key]: !visibility[key] };
    onChange({ sectionVisibility: updatedVisibility });
  };

  const updateNestedField = (section: keyof BiodataRecord, field: string, value: any) => {
    const currentSection = (biodata[section] as any) || {};
    onChange({
      [section]: {
        ...currentSection,
        [field]: value,
      },
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB');
      return;
    }

    setUploadingPhoto(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const res = await uploadProfileImage(base64, file.name);
        const uploadedUrl = res.url || res.data?.url || base64;
        onChange({ photoUrl: uploadedUrl });
      } catch {
        // Fallback to base64
        onChange({ photoUrl: base64 });
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 text-left">
      {/* ── 1. Photo Selection & Visibility ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('photo')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <Camera className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Profile Photo for Biodata
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.photo}
                onChange={() => toggleVisibility('photo')}
                className="w-4 h-4 rounded text-[#E51F3E] focus:ring-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Photo</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.photo ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('photo')}
            />
          </div>
        </div>

        {openSections.photo && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-3">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                {biodata.photoUrl ? (
                  <img
                    src={biodata.photoUrl}
                    alt="Selected"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="space-y-1.5 flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-slate-800">
                  {biodata.photoUrl ? 'Active Biodata Photo' : 'No Photo Selected'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Select a photo from your Wonderful Jodi profile or upload a new high-resolution portrait.
                </p>

                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>
                  {biodata.photoUrl && (
                    <button
                      type="button"
                      onClick={() => onChange({ photoUrl: '' })}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
              </div>
            </div>

            {/* Profile Photos Quick Pick */}
            {availablePhotos.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-600 mb-2">
                  Pick from your existing profile photos:
                </p>
                <div className="flex flex-wrap gap-2">
                  {availablePhotos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onChange({ photoUrl: photo })}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition ${
                        biodata.photoUrl === photo
                          ? 'border-[#E51F3E] ring-2 ring-[#E51F3E]/20'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      {biodata.photoUrl === photo && (
                        <div className="absolute inset-0 bg-[#E51F3E]/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow-xs" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Personal Details ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('personal')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              1. Personal Details
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.personalDetails}
                onChange={() => toggleVisibility('personalDetails')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Section</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.personal ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('personal')}
            />
          </div>
        </div>

        {openSections.personal && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name *</label>
              <input
                type="text"
                value={biodata.personalDetails?.fullName || ''}
                onChange={(e) => updateNestedField('personalDetails', 'fullName', e.target.value)}
                placeholder="Dr. Priya Sharma"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Gender</label>
              <select
                value={biodata.personalDetails?.gender || 'Female'}
                onChange={(e) => updateNestedField('personalDetails', 'gender', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Date of Birth (DD/MM/YYYY) *
              </label>
              <input
                type="text"
                value={biodata.personalDetails?.dob || ''}
                onChange={(e) => updateNestedField('personalDetails', 'dob', e.target.value)}
                placeholder="15/05/1996"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Age (Years)</label>
              <input
                type="number"
                value={biodata.personalDetails?.age || ''}
                onChange={(e) => updateNestedField('personalDetails', 'age', Number(e.target.value))}
                placeholder="28"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Height</label>
              <input
                type="text"
                value={biodata.personalDetails?.height || ''}
                onChange={(e) => updateNestedField('personalDetails', 'height', e.target.value)}
                placeholder={`5' 6"`}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Marital Status</label>
              <select
                value={biodata.personalDetails?.maritalStatus || 'Never Married'}
                onChange={(e) => updateNestedField('personalDetails', 'maritalStatus', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="Never Married">Never Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Awaiting Divorce">Awaiting Divorce</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Religion</label>
              <input
                type="text"
                value={biodata.personalDetails?.religion || ''}
                onChange={(e) => updateNestedField('personalDetails', 'religion', e.target.value)}
                placeholder="Hindu"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Caste / Community</label>
              <input
                type="text"
                value={biodata.personalDetails?.caste || ''}
                onChange={(e) => updateNestedField('personalDetails', 'caste', e.target.value)}
                placeholder="Maratha / Brahmin / Jain"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Sub-Caste</label>
              <input
                type="text"
                value={biodata.personalDetails?.subCaste || ''}
                onChange={(e) => updateNestedField('personalDetails', 'subCaste', e.target.value)}
                placeholder="96 Kuli / Deshastha / Kokanastha"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Mother Tongue</label>
              <input
                type="text"
                value={biodata.personalDetails?.motherTongue || ''}
                onChange={(e) => updateNestedField('personalDetails', 'motherTongue', e.target.value)}
                placeholder="Marathi / Hindi / Gujarati"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Current City / State</label>
              <input
                type="text"
                value={biodata.location?.currentCity || ''}
                onChange={(e) => updateNestedField('location', 'currentCity', e.target.value)}
                placeholder="Pune, Maharashtra"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Native Place / Roots</label>
              <input
                type="text"
                value={biodata.location?.nativePlace || ''}
                onChange={(e) => updateNestedField('location', 'nativePlace', e.target.value)}
                placeholder="Satara / Pune, Maharashtra"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Medical Education ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('education')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              2. Medical Education & Honors
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.education}
                onChange={() => toggleVisibility('education')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Section</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.education ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('education')}
            />
          </div>
        </div>

        {openSections.education && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Primary Medical Qualification *
              </label>
              <input
                type="text"
                value={biodata.education?.primaryQualification || ''}
                onChange={(e) => updateNestedField('education', 'primaryQualification', e.target.value)}
                placeholder="MBBS"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Medical College</label>
              <input
                type="text"
                value={biodata.education?.college || ''}
                onChange={(e) => updateNestedField('education', 'college', e.target.value)}
                placeholder="BJ Government Medical College, Pune"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">University / Board</label>
              <input
                type="text"
                value={biodata.education?.university || ''}
                onChange={(e) => updateNestedField('education', 'university', e.target.value)}
                placeholder="MUHS Nashik / AIIMS"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Graduation Year</label>
              <input
                type="text"
                value={biodata.education?.graduationYear || ''}
                onChange={(e) => updateNestedField('education', 'graduationYear', e.target.value)}
                placeholder="2019"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Postgraduation (MD / MS / DNB)
              </label>
              <input
                type="text"
                value={biodata.education?.postgraduateQualification || ''}
                onChange={(e) => updateNestedField('education', 'postgraduateQualification', e.target.value)}
                placeholder="MD – General Medicine / MS – Orthopaedics"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">PG Institution</label>
              <input
                type="text"
                value={biodata.education?.pgCollege || ''}
                onChange={(e) => updateNestedField('education', 'pgCollege', e.target.value)}
                placeholder="AIIMS New Delhi / KEM Hospital Mumbai"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Super-Specialty / Fellowship / Additional Honors
              </label>
              <input
                type="text"
                value={biodata.education?.additionalQualification || ''}
                onChange={(e) => updateNestedField('education', 'additionalQualification', e.target.value)}
                placeholder="DM Cardiology, Fellowship in Interventional Cardiology (USA)"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Clinical Career & Practice ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('career')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              3. Clinical Career & Practice
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.medicalCareer}
                onChange={() => toggleVisibility('medicalCareer')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Section</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.career ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('career')}
            />
          </div>
        </div>

        {openSections.career && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Specialization</label>
              <input
                type="text"
                value={biodata.medicalCareer?.specialization || ''}
                onChange={(e) => updateNestedField('medicalCareer', 'specialization', e.target.value)}
                placeholder="Cardiology / Paediatrics / Dermatology"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Designation / Role</label>
              <input
                type="text"
                value={biodata.medicalCareer?.designation || ''}
                onChange={(e) => updateNestedField('medicalCareer', 'designation', e.target.value)}
                placeholder="Consultant Physician / Assistant Professor"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Hospital / Clinic</label>
              <input
                type="text"
                value={biodata.medicalCareer?.currentHospital || ''}
                onChange={(e) => updateNestedField('medicalCareer', 'currentHospital', e.target.value)}
                placeholder="Ruby Hall Clinic / Apollo Hospital"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Work Location</label>
              <input
                type="text"
                value={biodata.medicalCareer?.workLocation || ''}
                onChange={(e) => updateNestedField('medicalCareer', 'workLocation', e.target.value)}
                placeholder="Pune, Maharashtra"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Practice Type</label>
              <select
                value={biodata.medicalCareer?.practiceType || 'Hospital Consultant'}
                onChange={(e) => updateNestedField('medicalCareer', 'practiceType', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="Hospital Consultant">Hospital Consultant</option>
                <option value="Private Practice / Clinic">Private Practice / Clinic</option>
                <option value="Hospital & Private Clinic">Hospital & Private Clinic</option>
                <option value="Medical Academician / Professor">Medical Academician / Professor</option>
                <option value="Government Health Service">Government Health Service</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Years of Experience</label>
              <input
                type="text"
                value={biodata.medicalCareer?.experience || ''}
                onChange={(e) => updateNestedField('medicalCareer', 'experience', e.target.value)}
                placeholder="5+ Years"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Annual Income</label>
              <input
                type="text"
                value={biodata.medicalCareer?.annualIncome || ''}
                onChange={(e) => updateNestedField('medicalCareer', 'annualIncome', e.target.value)}
                placeholder="₹ 35 - 50 Lakhs"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Medical Registration No.</label>
              <input
                type="text"
                value={biodata.medicalCareer?.medicalRegistrationNumber || ''}
                onChange={(e) => updateNestedField('medicalCareer', 'medicalRegistrationNumber', e.target.value)}
                placeholder="MMC-2019-XXXX"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Family Details ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('family')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              4. Family Details
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.family}
                onChange={() => toggleVisibility('family')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Section</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.family ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('family')}
            />
          </div>
        </div>

        {openSections.family && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Father's Name</label>
              <input
                type="text"
                value={biodata.family?.fatherName || ''}
                onChange={(e) => updateNestedField('family', 'fatherName', e.target.value)}
                placeholder="Shri Prakash Sharma"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Father's Occupation</label>
              <input
                type="text"
                value={biodata.family?.fatherOccupation || ''}
                onChange={(e) => updateNestedField('family', 'fatherOccupation', e.target.value)}
                placeholder="Senior Civil Engineer / Businessman"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Mother's Name</label>
              <input
                type="text"
                value={biodata.family?.motherName || ''}
                onChange={(e) => updateNestedField('family', 'motherName', e.target.value)}
                placeholder="Smt. Sunita Sharma"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Mother's Occupation</label>
              <input
                type="text"
                value={biodata.family?.motherOccupation || ''}
                onChange={(e) => updateNestedField('family', 'motherOccupation', e.target.value)}
                placeholder="Homemaker / Professor"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Siblings</label>
              <input
                type="text"
                value={biodata.family?.siblings || ''}
                onChange={(e) => updateNestedField('family', 'siblings', e.target.value)}
                placeholder="1 Younger Brother (Software Engineer at Microsoft)"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Family Type</label>
              <select
                value={biodata.family?.familyType || 'Nuclear Family'}
                onChange={(e) => updateNestedField('family', 'familyType', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="Nuclear Family">Nuclear Family</option>
                <option value="Joint Family">Joint Family</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Family Values</label>
              <select
                value={biodata.family?.familyValues || 'Moderate'}
                onChange={(e) => updateNestedField('family', 'familyValues', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="Traditional">Traditional</option>
                <option value="Moderate">Moderate</option>
                <option value="Liberal">Liberal</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Family Base Location</label>
              <input
                type="text"
                value={biodata.family?.familyLocation || ''}
                onChange={(e) => updateNestedField('family', 'familyLocation', e.target.value)}
                placeholder="Pune, Maharashtra"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Horoscope & Astrological Details ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('horoscope')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <Moon className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              5. Horoscope & Kundali Coordinates
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.horoscope}
                onChange={() => toggleVisibility('horoscope')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Section</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.horoscope ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('horoscope')}
            />
          </div>
        </div>

        {openSections.horoscope && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Time of Birth</label>
              <input
                type="text"
                value={biodata.horoscope?.timeOfBirth || ''}
                onChange={(e) => updateNestedField('horoscope', 'timeOfBirth', e.target.value)}
                placeholder="09:45 AM"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Place of Birth</label>
              <input
                type="text"
                value={biodata.horoscope?.placeOfBirth || ''}
                onChange={(e) => updateNestedField('horoscope', 'placeOfBirth', e.target.value)}
                placeholder="Pune, Maharashtra"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Rashi (Moon Sign)</label>
              <input
                type="text"
                value={biodata.horoscope?.rashi || ''}
                onChange={(e) => updateNestedField('horoscope', 'rashi', e.target.value)}
                placeholder="Mesh / Vrishabh / Mithun / Karka"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Nakshatra</label>
              <input
                type="text"
                value={biodata.horoscope?.nakshatra || ''}
                onChange={(e) => updateNestedField('horoscope', 'nakshatra', e.target.value)}
                placeholder="Ashwini / Rohini / Pushya"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Charan / Pada</label>
              <input
                type="text"
                value={biodata.horoscope?.pada || ''}
                onChange={(e) => updateNestedField('horoscope', 'pada', e.target.value)}
                placeholder="1 / 2 / 3 / 4"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Manglik Status</label>
              <select
                value={biodata.horoscope?.manglik || 'Non-Manglik'}
                onChange={(e) => updateNestedField('horoscope', 'manglik', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="Non-Manglik">Non-Manglik</option>
                <option value="Anshik Manglik">Anshik Manglik (Partial)</option>
                <option value="Manglik">Manglik</option>
                <option value="Don't Know">Don't Know</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Gotra</label>
              <input
                type="text"
                value={biodata.horoscope?.gotra || ''}
                onChange={(e) => updateNestedField('horoscope', 'gotra', e.target.value)}
                placeholder="Kashyap / Bharadwaj / Vashistha"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Lifestyle & Habits ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('lifestyle')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              6. Lifestyle & Habits
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.lifestyle}
                onChange={() => toggleVisibility('lifestyle')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Section</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.lifestyle ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('lifestyle')}
            />
          </div>
        </div>

        {openSections.lifestyle && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Dietary Preference</label>
              <select
                value={biodata.lifestyle?.diet || 'Vegetarian'}
                onChange={(e) => updateNestedField('lifestyle', 'diet', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              >
                <option value="Vegetarian">Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Eggetarian">Eggetarian</option>
                <option value="Jain Vegetarian">Jain Vegetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Smoking / Drinking</label>
              <input
                type="text"
                value={biodata.lifestyle?.smoking || 'Non-Smoker'}
                onChange={(e) => updateNestedField('lifestyle', 'smoking', e.target.value)}
                placeholder="Non-Smoker / Non-Drinker"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Languages Known (Comma separated)
              </label>
              <input
                type="text"
                value={(biodata.lifestyle?.languagesKnown || []).join(', ')}
                onChange={(e) =>
                  updateNestedField(
                    'lifestyle',
                    'languagesKnown',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="English, Marathi, Hindi, German"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Hobbies & Interests (Comma separated)
              </label>
              <input
                type="text"
                value={(biodata.lifestyle?.hobbies || []).join(', ')}
                onChange={(e) =>
                  updateNestedField(
                    'lifestyle',
                    'hobbies',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="Reading medical journals, Classical music, Trekking, Yoga"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 8. Partner Preferences ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('partner')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-[#E51F3E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              7. Partner Expectations
            </h4>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.partnerPreferences}
                onChange={() => toggleVisibility('partnerPreferences')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Section</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.partner ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('partner')}
            />
          </div>
        </div>

        {openSections.partner && (
          <div className="p-4 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Preferred Age Range</label>
              <input
                type="text"
                value={biodata.partnerPreferences?.preferredAge || ''}
                onChange={(e) => updateNestedField('partnerPreferences', 'preferredAge', e.target.value)}
                placeholder="24 - 30 Years"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Preferred Height</label>
              <input
                type="text"
                value={biodata.partnerPreferences?.preferredHeight || ''}
                onChange={(e) => updateNestedField('partnerPreferences', 'preferredHeight', e.target.value)}
                placeholder={`5' 2" - 5' 9"`}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Preferred Location</label>
              <input
                type="text"
                value={biodata.partnerPreferences?.preferredLocation || ''}
                onChange={(e) => updateNestedField('partnerPreferences', 'preferredLocation', e.target.value)}
                placeholder="Maharashtra / Anywhere in India"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Preferred Education</label>
              <input
                type="text"
                value={biodata.partnerPreferences?.preferredEducation || ''}
                onChange={(e) => updateNestedField('partnerPreferences', 'preferredEducation', e.target.value)}
                placeholder="MBBS / MD / MS / Medical Specialist"
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Other Expectations</label>
              <input
                type="text"
                value={biodata.partnerPreferences?.otherExpectations || ''}
                onChange={(e) => updateNestedField('partnerPreferences', 'otherExpectations', e.target.value)}
                placeholder="Looking for an understanding doctor partner with mutual family values."
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 9. Contact Details (Privacy Safe) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div
          onClick={() => toggleSection('contact')}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
        >
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-[#E51F3E]" />
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                8. Contact & Communication
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Privacy Guarded
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.contactDetails}
                onChange={() => toggleVisibility('contactDetails')}
                className="w-4 h-4 rounded text-[#E51F3E]"
              />
              <span className="hidden sm:inline">Include Contact Info</span>
            </label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.contact ? 'rotate-180' : ''
              }`}
              onClick={() => toggleSection('contact')}
            />
          </div>
        </div>

        {openSections.contact && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-3 pt-3">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Notice:</strong> Contact details are hidden by default to prevent unwanted exposure when sharing broadly. Only enable if you are comfortable sharing phone/email directly.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={biodata.contactDetails?.contactPerson || ''}
                  onChange={(e) => updateNestedField('contactDetails', 'contactPerson', e.target.value)}
                  placeholder="Parents / Self"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={biodata.contactDetails?.phone || ''}
                  onChange={(e) => updateNestedField('contactDetails', 'phone', e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={biodata.contactDetails?.email || ''}
                  onChange={(e) => updateNestedField('contactDetails', 'email', e.target.value)}
                  placeholder="family@example.com"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Residential Address</label>
                <input
                  type="text"
                  value={biodata.contactDetails?.address || ''}
                  onChange={(e) => updateNestedField('contactDetails', 'address', e.target.value)}
                  placeholder="Kothrud, Pune, Maharashtra"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#E51F3E]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
