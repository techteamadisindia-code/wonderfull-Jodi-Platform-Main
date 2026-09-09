import crypto from 'crypto';
import mongoose from 'mongoose';
import { CookieOptions, Request } from 'express';
import { SecurityLog, ISecurityLog } from '../models/SecurityLog';

/**
 * Generate cryptographically secure random token in hex format
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * SHA-256 hash a raw string/token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Escape special characters in user input before passing to MongoDB RegExp
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Check if a string is a valid 24-character hex MongoDB ObjectId
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

/**
 * Inspect actual binary file headers (magic bytes) to verify genuine image content
 */
export function validateImageBuffer(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // WebP: RIFF .... WEBP
  // Bytes 0-3: 52 49 46 46 (RIFF), Bytes 8-11: 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  return { valid: false };
}

/**
 * Inspect actual binary headers to verify genuine PDF or Image document content
 */
export function validateDocumentBuffer(buffer: Buffer): { valid: boolean; detectedMime?: string; extension?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false };
  }

  // PDF: %PDF- (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { valid: true, detectedMime: 'application/pdf', extension: 'pdf' };
  }

  // Image validation
  const imageCheck = validateImageBuffer(buffer);
  if (imageCheck.valid && imageCheck.detectedMime) {
    let ext = 'jpg';
    if (imageCheck.detectedMime === 'image/png') ext = 'png';
    else if (imageCheck.detectedMime === 'image/webp') ext = 'webp';
    return { valid: true, detectedMime: imageCheck.detectedMime, extension: ext };
  }

  return { valid: false };
}

/**
 * Get environment-aware secure cookie options
 */
export function getAccessTokenCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  };
}

export function getRefreshTokenCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

/**
 * Safe public user serializer (excludes password, mobile, email, internal metadata)
 */
export function serializeUserPublic(user: any) {
  if (!user) return null;
  return {
    _id: user._id?.toString?.() || user._id,
    id: user._id?.toString?.() || user.id,
    fullName: user.fullName,
    role: user.role,
    verified: user.verified ?? user.verificationStatus === 'VERIFIED',
  };
}

export const sanitizeUser = serializeUserPublic;

import { calculateProfileCompletion } from './doctorValidation';

export interface SerializeProfileOptions {
  isContactUnlocked?: boolean;
  isSelf?: boolean;
  isAdmin?: boolean;
}

/**
 * Safe public profile serializer (strips contact details, private notes, raw credentials)
 */
export function serializePublicProfile(
  profile: any,
  options?: SerializeProfileOptions | number
) {
  if (!profile) return null;
  const p = typeof profile.toObject === 'function' ? profile.toObject() : profile;

  const opts: SerializeProfileOptions =
    typeof options === 'object' && options !== null ? options : {};

  const canViewSensitive = Boolean(
    opts.isContactUnlocked || opts.isSelf || opts.isAdmin
  );

  // Enforce photo visibility privacy
  const photoVisibility = p.privacySettings?.photoVisibility || 'all';
  let safePhotos = p.photos || [];
  let safePrimaryPhoto = p.primaryPhoto;

  if (photoVisibility === 'hidden') {
    safePhotos = [];
    safePrimaryPhoto = null;
  }

  // Enforce horoscope & birth information privacy
  const horoscopeVisibility = p.privacySettings?.horoscopeVisibility || 'all';
  const birthTimeVisibility = p.privacySettings?.birthTimeVisibility || 'all';
  const birthPlaceVisibility = p.privacySettings?.birthPlaceVisibility || 'all';
  const birthDateVisibility = p.privacySettings?.birthDateVisibility || 'full';

  let safeHoroscope: any = null;
  if (p.horoscope) {
    if (horoscopeVisibility === 'hidden') {
      safeHoroscope = { isPrivate: true };
    } else {
      safeHoroscope = {
        isPrivate: false,
        rashi: p.horoscope.rashi || null,
        nakshatra: p.horoscope.nakshatra || null,
        pada: p.horoscope.pada || null,
        lagna: p.horoscope.lagna || null,
        manglik: p.horoscope.manglik || 'Non-Manglik',
        gotra: p.horoscope.gotra || null,
        timeOfBirth: birthTimeVisibility === 'hidden' ? null : p.horoscope.timeOfBirth || null,
        placeOfBirth: birthPlaceVisibility === 'hidden' ? null : p.horoscope.placeOfBirth || null,
      };
    }
  }

  // Enforce DOB visibility privacy
  let safeDob = p.dob;
  if (birthDateVisibility === 'hidden') {
    safeDob = null;
  } else if (birthDateVisibility === 'year_only' && p.dob) {
    const year = new Date(p.dob).getUTCFullYear();
    safeDob = new Date(`${year}-01-01T00:00:00.000Z`);
  }

  const completionPercentage = calculateProfileCompletion(p, p.user);

  return {
    _id: p._id,
    id: p._id,
    user: serializeUserPublic(p.user),
    displayName: p.displayName,
    gender: p.gender,
    dob: safeDob,
    height: p.height,
    maritalStatus: p.maritalStatus,
    motherTongue: p.motherTongue,
    religion: p.religion,
    caste: p.caste,
    subCaste: p.subCaste,
    education: p.education,
    degree: p.degree,
    profession: p.profession,
    company: p.company,
    workLocation: canViewSensitive ? p.workLocation : p.city ? `${p.city}, ${p.state || ''}` : undefined,
    annualIncome: canViewSensitive ? p.annualIncome : undefined,
    country: p.country,
    state: p.state,
    city: p.city,
    medicalRegistrationNumber: p.medicalRegistrationNumber,
    medicalCouncil: p.medicalCouncil,
    registrationState: p.registrationState,
    registrationYear: p.registrationYear,
    medicalExperience: p.medicalExperience,
    currentHospital: canViewSensitive ? p.currentHospital : undefined,
    isContactUnlocked: canViewSensitive,
    contactPrivacyMessage: canViewSensitive
      ? undefined
      : 'Contact details are protected for your privacy.',
    contactDetails: canViewSensitive && p.user
      ? {
          mobile: p.user.mobile,
          email: p.user.email,
        }
      : undefined,
    medicalCollege: p.medicalCollege,
    medicalUniversity: p.medicalUniversity,
    graduationYear: p.graduationYear,
    additionalQualification: p.additionalQualification,
    currentRole: p.currentRole,
    workType: p.workType,
    currentlyPracticing: p.currentlyPracticing ?? true,
    familyStatus: p.familyStatus,
    familyValues: p.familyValues,
    nativePlace: p.nativePlace,
    familyLocation: p.familyLocation,
    profileManagedBy: p.profileManagedBy || 'Self',
    currentLocation: p.currentLocation || null,
    nativePlaceDetails: p.nativePlaceDetails || null,
    communityDetails: p.communityDetails || null,
    languageDetails: p.languageDetails || null,
    horoscope: safeHoroscope,
    lifestyleInterests: p.lifestyleInterests || {
      diet: p.foodPreference || 'Vegetarian',
      smoking: p.smoking || 'Non-Smoker',
      alcohol: p.drinking || 'Non-Drinker',
      exercise: 'Regular',
      hobbies: p.hobbies || [],
      languages: [p.motherTongue || 'Hindi', 'English'],
    },
    partnerPreferences: p.partnerPreferences || {
      preferredAgeMin: 24,
      preferredAgeMax: 36,
      preferredLocation: 'Anywhere in India',
      preferredQualification: 'MBBS / MD / MS / Medical Specialist',
      preferredSpecialization: 'Any Medical Specialization',
      preferredMaritalStatus: 'Never Married',
      otherPreferences: '',
    },
    privacySettings: p.privacySettings || {
      profileVisibility: 'all',
      photoVisibility: 'all',
      contactVisibility: 'accepted_interests_only',
      whoCanSendInterest: 'all',
      whoCanMessage: 'accepted_interests_only',
    },
    fatherOccupation: p.fatherOccupation,
    motherOccupation: p.motherOccupation,
    siblings: p.siblings,
    familyType: p.familyType,
    foodPreference: p.foodPreference,
    smoking: p.smoking,
    drinking: p.drinking,
    hobbies: p.hobbies || [],
    about: p.about,
    photos: safePhotos,
    primaryPhoto: safePrimaryPhoto,
    verificationStatus: p.verificationStatus,
    completionPercentage,
    lastActiveAt: p.lastActiveAt,
    createdAt: p.createdAt,
  };
}

/**
 * Safe private profile serializer (for authenticated owner / admin)
 */
export function serializePrivateProfile(profile: any, user: any) {
  if (!profile) return null;
  const p = typeof profile.toObject === 'function' ? profile.toObject() : profile;
  const completionPercentage = calculateProfileCompletion(p, user);

  return {
    _id: p._id,
    id: p._id,
    displayName: p.displayName,
    gender: p.gender,
    dob: p.dob,
    height: p.height,
    maritalStatus: p.maritalStatus,
    motherTongue: p.motherTongue,
    religion: p.religion,
    caste: p.caste,
    subCaste: p.subCaste,
    education: p.education,
    degree: p.degree,
    profession: p.profession,
    company: p.company,
    workLocation: p.workLocation,
    annualIncome: p.annualIncome,
    country: p.country,
    state: p.state,
    city: p.city,
    medicalRegistrationNumber: p.medicalRegistrationNumber,
    medicalCouncil: p.medicalCouncil,
    registrationState: p.registrationState,
    registrationYear: p.registrationYear,
    medicalExperience: p.medicalExperience,
    currentHospital: p.currentHospital,
    medicalCollege: p.medicalCollege,
    medicalUniversity: p.medicalUniversity,
    graduationYear: p.graduationYear,
    additionalQualification: p.additionalQualification,
    currentRole: p.currentRole,
    workType: p.workType,
    currentlyPracticing: p.currentlyPracticing ?? true,
    familyStatus: p.familyStatus,
    familyValues: p.familyValues,
    nativePlace: p.nativePlace,
    familyLocation: p.familyLocation,
    profileManagedBy: p.profileManagedBy || 'Self',
    currentLocation: p.currentLocation || null,
    nativePlaceDetails: p.nativePlaceDetails || null,
    communityDetails: p.communityDetails || null,
    languageDetails: p.languageDetails || null,
    horoscope: p.horoscope || null,
    lifestyleInterests: p.lifestyleInterests || {
      diet: p.foodPreference || 'Vegetarian',
      smoking: p.smoking || 'Non-Smoker',
      alcohol: p.drinking || 'Non-Drinker',
      exercise: 'Regular',
      hobbies: p.hobbies || [],
      languages: [p.motherTongue || 'Hindi', 'English'],
    },
    partnerPreferences: p.partnerPreferences || {
      preferredAgeMin: 24,
      preferredAgeMax: 36,
      preferredLocation: 'Anywhere in India',
      preferredQualification: 'MBBS / MD / MS / Medical Specialist',
      preferredSpecialization: 'Any Medical Specialization',
      preferredMaritalStatus: 'Never Married',
      otherPreferences: '',
    },
    privacySettings: p.privacySettings || {
      profileVisibility: 'all',
      photoVisibility: 'all',
      contactVisibility: 'accepted_interests_only',
      whoCanSendInterest: 'all',
      whoCanMessage: 'accepted_interests_only',
    },
    fatherOccupation: p.fatherOccupation,
    motherOccupation: p.motherOccupation,
    siblings: p.siblings,
    familyType: p.familyType,
    foodPreference: p.foodPreference,
    smoking: p.smoking,
    drinking: p.drinking,
    hobbies: p.hobbies || [],
    about: p.about,
    photos: p.photos || [],
    primaryPhoto: p.primaryPhoto,
    verificationStatus: p.verificationStatus,
    completionPercentage,
    lastActiveAt: p.lastActiveAt,
    createdAt: p.createdAt,
    user: {
      _id: user?._id?.toString?.() || user?._id,
      id: user?._id?.toString?.() || user?.id,
      fullName: user?.fullName,
      email: user?.email,
      mobile: user?.mobile,
      role: user?.role,
      verified: user?.verified,
      verificationStatus: user?.verificationStatus,
    },
  };
}

/**
 * Record a security event in the database asynchronously without blocking response
 */
export async function recordSecurityEvent(
  eventType: ISecurityLog['eventType'],
  options: {
    user?: any;
    identifier?: string;
    status?: ISecurityLog['status'];
    req?: Request;
    details?: Record<string, any>;
  }
) {
  try {
    const ipAddress =
      (options.req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      options.req?.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = options.req?.headers['user-agent'] || 'Unknown';

    await SecurityLog.create({
      user: options.user?._id || options.user,
      identifier: options.identifier,
      eventType,
      status: options.status || 'SUCCESS',
      ipAddress,
      userAgent,
      details: options.details,
    });
  } catch (err) {
    // Non-blocking log catch
    console.error('Failed to write SecurityLog:', err);
  }
}
