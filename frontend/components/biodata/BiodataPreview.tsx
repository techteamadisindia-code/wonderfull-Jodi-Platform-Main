'use client';

import React from 'react';
import {
  Stethoscope,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  Users,
  Moon,
  Phone,
  Mail,
  User,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { BiodataRecord } from '../../services/biodataApi';

interface BiodataPreviewProps {
  biodata: Partial<BiodataRecord>;
  className?: string;
  printable?: boolean;
}

export function BiodataPreview({ biodata, className = '', printable = false }: BiodataPreviewProps) {
  const templateId = biodata.templateId || 'doctor_professional';
  const visibility = biodata.sectionVisibility || {
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

  const personal = biodata.personalDetails || ({} as any);
  const location = biodata.location || ({} as any);
  const education = biodata.education || ({} as any);
  const medical = biodata.medicalCareer || ({} as any);
  const family = biodata.family || ({} as any);
  const horoscope = biodata.horoscope || ({} as any);
  const lifestyle = biodata.lifestyle || ({} as any);
  const partner = biodata.partnerPreferences || ({} as any);
  const contact = biodata.contactDetails || ({} as any);

  // Template-specific styles
  const isTraditional = templateId === 'traditional';
  const isModern = templateId === 'modern';
  const isElegant = templateId === 'elegant';
  const isDoctor = templateId === 'doctor_professional';

  // Theme tokens
  let themeClasses = {
    container: 'bg-white border-slate-200 text-slate-900',
    banner: 'bg-rose-50/70 border-rose-100',
    titleColor: 'text-[#991B1B]',
    subtitleColor: 'text-slate-700',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    sectionHeaderBg: 'bg-rose-50/80 border-rose-200 text-[#991B1B]',
    labelColor: 'text-slate-500',
    valueColor: 'text-slate-900',
    divider: 'border-rose-100',
    fontSerif: false,
  };

  if (isTraditional) {
    themeClasses = {
      container: 'bg-[#FFFDF9] border-[#E5D5BC] text-stone-900',
      banner: 'bg-[#FFF6EB] border-[#F0DFCA]',
      titleColor: 'text-[#7B1113]',
      subtitleColor: 'text-[#B45309]',
      badge: 'bg-[#FDF2E9] text-[#9A3412] border-[#FDBA74]',
      sectionHeaderBg: 'bg-[#FFF1E0] border-[#F4D7B5] text-[#7B1113]',
      labelColor: 'text-stone-500',
      valueColor: 'text-stone-900',
      divider: 'border-[#F2DEC4]',
      fontSerif: true,
    };
  } else if (isModern) {
    themeClasses = {
      container: 'bg-white border-slate-200 text-slate-900',
      banner: 'bg-teal-50/70 border-teal-100',
      titleColor: 'text-[#0F766E]',
      subtitleColor: 'text-teal-700',
      badge: 'bg-teal-100 text-teal-800 border-teal-200',
      sectionHeaderBg: 'bg-teal-50 border-teal-100 text-[#0F766E]',
      labelColor: 'text-slate-500',
      valueColor: 'text-slate-900',
      divider: 'border-teal-100',
      fontSerif: false,
    };
  } else if (isElegant) {
    themeClasses = {
      container: 'bg-[#FDFCF9] border-[#D1C7B7] text-slate-900',
      banner: 'bg-[#F4F1EA] border-[#E2D9C8]',
      titleColor: 'text-[#0A192F]',
      subtitleColor: 'text-[#B8860B]',
      badge: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
      sectionHeaderBg: 'bg-[#EFECE3] border-[#DFD8C6] text-[#0A192F]',
      labelColor: 'text-slate-500',
      valueColor: 'text-slate-900',
      divider: 'border-[#E5DEC9]',
      fontSerif: true,
    };
  }

  // Quick facts calculation
  const quickPills: string[] = [];
  if (personal.age) quickPills.push(`${personal.age} Yrs`);
  if (personal.height) quickPills.push(personal.height);
  if (personal.maritalStatus) quickPills.push(personal.maritalStatus);
  if (location.currentCity) {
    quickPills.push([location.currentCity, location.currentState].filter(Boolean).join(', '));
  }

  const qualText = [education.primaryQualification, education.postgraduateQualification]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      className={`relative w-full rounded-2xl sm:rounded-3xl border shadow-lg overflow-hidden transition-all text-left ${
        themeClasses.container
      } ${themeClasses.fontSerif ? 'font-serif' : 'font-sans'} ${className}`}
    >
      {/* Outer framing decorative double border for Traditional & Elegant */}
      {(isTraditional || isElegant) && (
        <div className="absolute inset-1.5 sm:inset-2.5 rounded-xl sm:rounded-2xl border border-dashed border-amber-900/20 pointer-events-none" />
      )}

      {/* ── Header Invocation / Branding ── */}
      <div className="pt-6 sm:pt-8 pb-3 px-6 sm:px-10 text-center border-b border-slate-100">
        {isTraditional && (
          <div className="text-xs sm:text-sm font-bold text-[#B45309] tracking-wider mb-1">
            ॥ श्री गणेशाय नमः ॥
          </div>
        )}
        <div className="flex items-center justify-center gap-1.5 text-[11px] tracking-widest font-bold uppercase text-slate-400">
          <span>Wonderful Jodi</span>
          <span>•</span>
          <span>Doctor Matrimony</span>
        </div>
        <div className={`text-xs font-bold tracking-wider uppercase mt-0.5 ${themeClasses.subtitleColor}`}>
          {isDoctor
            ? 'Medical Professional Matrimonial Biodata'
            : isTraditional
            ? 'Auspicious Matrimonial Biodata'
            : isModern
            ? 'Contemporary Matrimonial Biodata'
            : 'Executive Doctor Biodata'}
        </div>
      </div>

      {/* ── Profile Banner: Photo + Key Identity ── */}
      <div className={`p-6 sm:p-8 ${themeClasses.banner} border-b ${themeClasses.divider}`}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Photo */}
          {visibility.photo && (
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md shrink-0 flex items-center justify-center">
              {biodata.photoUrl ? (
                <img
                  src={biodata.photoUrl}
                  alt={personal.fullName || 'Candidate'}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <User className="w-12 h-12" />
                  <span className="text-[10px] font-semibold text-slate-400 mt-1">No Photo</span>
                </div>
              )}
              {isDoctor && (
                <div
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#E51F3E] text-white flex items-center justify-center shadow-xs"
                  title="Verified Doctor Profile"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          )}

          {/* Core Identity Info */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${themeClasses.titleColor}`}>
                {personal.fullName || 'Candidate Name'}
              </h1>
              {qualText && (
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/80 border border-slate-200/80 shadow-2xs text-slate-800">
                  {qualText}
                </div>
              )}
            </div>

            {medical.specialization && (
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                {medical.specialization} Specialist
                {medical.designation ? ` (${medical.designation})` : ''}
              </p>
            )}

            {medical.currentHospital && (
              <p className="text-xs text-slate-500 font-medium">
                Practicing at {medical.currentHospital}
                {medical.workLocation ? `, ${medical.workLocation}` : ''}
              </p>
            )}

            {/* Quick Fact Badges */}
            {quickPills.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[11px] font-medium text-slate-600">
                {quickPills.map((pill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200/90 shadow-2xs"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Biodata Sections ── */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Section 1: Personal Details */}
        {visibility.personalDetails && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Full Name</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{personal.fullName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Gender</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{personal.gender || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Date of Birth</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{personal.dob || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Age / Height</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>
                  {personal.age ? `${personal.age} Yrs` : '—'} / {personal.height || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Marital Status</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{personal.maritalStatus || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Mother Tongue</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{personal.motherTongue || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Religion</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{personal.religion || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Caste / Sub-Caste</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>
                  {[personal.caste, personal.subCaste].filter(Boolean).join(' • ') || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Current City</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>
                  {[location.currentCity, location.currentState].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Native Place</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{location.nativePlace || '—'}</span>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Medical Education */}
        {visibility.education && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Medical Education & Qualifications</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Primary Qualification</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>
                  {education.primaryQualification || 'MBBS'}
                </span>
              </div>
              {education.college && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Medical College</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{education.college}</span>
                </div>
              )}
              {education.university && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>University</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{education.university}</span>
                </div>
              )}
              {education.graduationYear && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Graduation Year</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{education.graduationYear}</span>
                </div>
              )}
              {education.postgraduateQualification && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Postgraduation (MD/MS)</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>
                    {education.postgraduateQualification}
                  </span>
                </div>
              )}
              {education.pgCollege && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>PG Institution</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{education.pgCollege}</span>
                </div>
              )}
              {education.additionalQualification && (
                <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                  <span className={themeClasses.labelColor}>Fellowship / Additional</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>
                    {education.additionalQualification}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 3: Medical Career & Practice */}
        {visibility.medicalCareer && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Medical Career & Clinical Practice</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Occupation</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>Doctor / Physician</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Specialization</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.specialization || 'General'}</span>
              </div>
              {medical.designation && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Designation</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.designation}</span>
                </div>
              )}
              {medical.currentHospital && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Hospital / Clinic</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.currentHospital}</span>
                </div>
              )}
              {medical.workLocation && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Work Location</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.workLocation}</span>
                </div>
              )}
              {medical.experience && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Experience</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.experience}</span>
                </div>
              )}
              {medical.practiceType && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Practice Type</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.practiceType}</span>
                </div>
              )}
              {medical.annualIncome && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Annual Income</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.annualIncome}</span>
                </div>
              )}
              {medical.medicalRegistrationNumber && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Registration No.</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>
                    {medical.medicalRegistrationNumber}
                  </span>
                </div>
              )}
              {medical.medicalCouncil && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Medical Council</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{medical.medicalCouncil}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 4: Family Details */}
        {visibility.family && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Family Background</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              {family.fatherName && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Father's Name</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.fatherName}</span>
                </div>
              )}
              {family.fatherOccupation && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Father's Occupation</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.fatherOccupation}</span>
                </div>
              )}
              {family.motherName && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Mother's Name</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.motherName}</span>
                </div>
              )}
              {family.motherOccupation && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Mother's Occupation</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.motherOccupation}</span>
                </div>
              )}
              {family.siblings && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Siblings</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.siblings}</span>
                </div>
              )}
              {family.familyType && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Family Type</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.familyType}</span>
                </div>
              )}
              {family.familyValues && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Family Values</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.familyValues}</span>
                </div>
              )}
              {family.familyLocation && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Family Location</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{family.familyLocation}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 5: Horoscope Details */}
        {visibility.horoscope && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Horoscope & Astrological Coordinates</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Date of Birth</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>
                  {horoscope.dob || personal.dob || '—'}
                </span>
              </div>
              {horoscope.timeOfBirth && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Time of Birth</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{horoscope.timeOfBirth}</span>
                </div>
              )}
              {horoscope.placeOfBirth && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Place of Birth</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{horoscope.placeOfBirth}</span>
                </div>
              )}
              {horoscope.rashi && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Rashi (Moon Sign)</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{horoscope.rashi}</span>
                </div>
              )}
              {horoscope.nakshatra && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Nakshatra</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{horoscope.nakshatra}</span>
                </div>
              )}
              {horoscope.pada && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Charan / Pada</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{horoscope.pada}</span>
                </div>
              )}
              {horoscope.manglik && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Manglik Status</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{horoscope.manglik}</span>
                </div>
              )}
              {horoscope.gotra && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Gotra</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{horoscope.gotra}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 6: Lifestyle & Interests */}
        {visibility.lifestyle && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lifestyle & Habits</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Dietary Preference</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>{lifestyle.diet || 'Vegetarian'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className={themeClasses.labelColor}>Smoking / Drinking</span>
                <span className={`font-semibold ${themeClasses.valueColor}`}>
                  {[lifestyle.smoking || 'Non-Smoker', lifestyle.drinking || 'Non-Drinker'].join(' / ')}
                </span>
              </div>
              {lifestyle.languagesKnown && lifestyle.languagesKnown.length > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                  <span className={themeClasses.labelColor}>Languages Known</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>
                    {lifestyle.languagesKnown.join(', ')}
                  </span>
                </div>
              )}
              {lifestyle.hobbies && lifestyle.hobbies.length > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                  <span className={themeClasses.labelColor}>Hobbies & Interests</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>
                    {lifestyle.hobbies.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 7: Partner Preferences */}
        {visibility.partnerPreferences && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Partner Expectations</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              {partner.preferredAge && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Age Range</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{partner.preferredAge}</span>
                </div>
              )}
              {partner.preferredHeight && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Height Range</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{partner.preferredHeight}</span>
                </div>
              )}
              {partner.preferredLocation && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Preferred Location</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{partner.preferredLocation}</span>
                </div>
              )}
              {partner.preferredEducation && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Education</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{partner.preferredEducation}</span>
                </div>
              )}
              {partner.preferredSpecialization && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Specialization</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>
                    {partner.preferredSpecialization}
                  </span>
                </div>
              )}
              {partner.otherExpectations && (
                <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                  <span className={themeClasses.labelColor}>Other Expectations</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{partner.otherExpectations}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 8: Contact Details (If explicitly allowed) */}
        {visibility.contactDetails && (
          <section className="space-y-2.5">
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${themeClasses.sectionHeaderBg}`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Contact & Communication</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-2">
              {contact.contactPerson && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Contact Person</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{contact.contactPerson}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Phone</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className={themeClasses.labelColor}>Email</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{contact.email}</span>
                </div>
              )}
              {contact.address && (
                <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                  <span className={themeClasses.labelColor}>Address</span>
                  <span className={`font-semibold ${themeClasses.valueColor}`}>{contact.address}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer Branding Note ── */}
      <div className="py-4 px-6 sm:px-8 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Matrimonial Biodata from Wonderful Jodi</span>
        </div>
        <span className="font-semibold text-slate-500">https://wonderfuljodi.com</span>
      </div>
    </div>
  );
}
