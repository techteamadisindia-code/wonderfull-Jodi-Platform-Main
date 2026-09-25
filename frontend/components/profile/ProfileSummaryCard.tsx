'use client';

import React from 'react';
import {
  MapPin,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Edit3,
  Camera,
  Check,
} from 'lucide-react';
import { DoctorAvatar } from '../DoctorAvatar';

interface ProfileSummaryCardProps {
  primaryPhoto?: string | null;
  candidateName: string;
  age: number | null;
  gender?: string;
  height: string;
  location: string;
  qualification: string;
  profession: string;
  isFullyVerified: boolean;
  isDoctorVerified: boolean;
  isPending: boolean;
  isRejected: boolean;
  hasPhotos: boolean;
  onEditProfile: () => void;
  onManagePhotos: () => void;
  onOpenPrivacy: () => void;
  className?: string;
}

export function ProfileSummaryCard({
  primaryPhoto,
  candidateName,
  age,
  gender = 'Not Specified',
  height,
  location,
  qualification,
  profession,
  isFullyVerified,
  isDoctorVerified,
  isPending,
  isRejected,
  hasPhotos,
  onEditProfile,
  onManagePhotos,
  onOpenPrivacy,
  className = '',
}: ProfileSummaryCardProps) {
  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 md:p-8 transition-all ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* ── Left Side: Profile Photo + Doctor Information ── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
          {/* Profile Photo with white protective ring and interactive overlay */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-[22px] overflow-hidden bg-white p-1 shadow-md border-2 border-white ring-2 ring-slate-100 shrink-0 group">
            <DoctorAvatar
              photoUrl={primaryPhoto}
              name={candidateName}
              gender={gender}
              size="xl"
              className="w-full h-full rounded-[18px] cursor-pointer"
            />
            <button
              type="button"
              onClick={onManagePhotos}
              className="absolute inset-1 rounded-[18px] bg-slate-950/65 backdrop-blur-2xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
              title="Manage Profile Photos"
            >
              <Camera className="w-5 h-5 mb-1 text-rose-300" />
              <span className="text-[10px] font-bold">Manage Photos</span>
            </button>
          </div>

          {/* Primary Doctor Metadata */}
          <div className="space-y-2">
            {/* Candidate Full Name */}
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                {candidateName}
              </h1>
            </div>

            {/* Vital Profile Attributes: Age | Gender | Height | Location */}
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs sm:text-sm font-semibold text-slate-600">
              <span>{age !== null ? `${age} Years` : 'Age Not Specified'}</span>
              <span className="text-slate-300">•</span>
              <span>{gender}</span>
              <span className="text-slate-300">•</span>
              <span>{height}</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#E51F3E] shrink-0" />
                <span className="truncate max-w-[220px] sm:max-w-xs">{location}</span>
              </span>
            </div>

            {/* Qualification and Profession */}
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm font-bold text-[#800020] pt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="w-4 h-4 text-[#E51F3E]" />
                <span>{qualification}</span>
              </span>
              <span className="text-slate-300 font-normal">•</span>
              <span className="text-slate-700 font-semibold">{profession}</span>
            </div>

            {/* Verification Status Pill */}
            <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              {isFullyVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✓ Fully Verified Doctor</span>
                </span>
              ) : isDoctorVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✓ Medical Registration Verified</span>
                </span>
              ) : isPending ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 shadow-2xs animate-pulse">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>⏳ Medical Verification Under Review</span>
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 shadow-2xs">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>⚠️ Verification Action Required</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>🔒 Medical Verification Pending</span>
                </span>
              )}

              {hasPhotos && isDoctorVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>✓ Photo Verified</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Side: Action Buttons ── */}
        <div className="flex items-center justify-center sm:justify-end gap-2.5 shrink-0 flex-wrap pt-2 lg:pt-0">
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#800020] via-[#A0153E] to-[#E51F3E] text-white text-xs font-bold shadow-xs hover:shadow-md hover:brightness-105 active:scale-95 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={onManagePhotos}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-95 transition cursor-pointer shadow-2xs"
          >
            <Camera className="w-3.5 h-3.5 text-[#E51F3E]" />
            <span>Add Photos</span>
          </button>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition cursor-pointer"
            title="Privacy & Safety Settings"
          >
            <Lock className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
