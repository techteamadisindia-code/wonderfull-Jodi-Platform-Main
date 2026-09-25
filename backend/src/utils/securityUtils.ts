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
 * Safely extract candidate name parts:
 * - Sanitizes raw names (strips parentheses, specialty notes)
 * - Identifies doctor title
 * - Extracts clean firstName and lastName
 * - Derives safe member displayName: "Dr. <FirstName>" without duplicate prefixes (never "Dr. Dr.")
 */
export function extractCandidateNameParts(rawName?: string | null, isDoctor: boolean = true) {
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return {
      firstName: isDoctor ? 'Doctor' : 'Candidate',
      lastName: null,
      displayName: isDoctor ? 'Dr. Candidate' : 'Candidate',
      fullName: isDoctor ? 'Dr. Candidate' : 'Candidate',
    };
  }

  // Remove trailing parentheses like "(Cardiologist)" or "(MBBS)"
  let clean = rawName.replace(/\s*\([^)]*\)/g, '').trim();

  // Check and strip Dr / Doctor prefix
  const hasDoctorPrefix = /^(dr\.?|doctor)\s+/i.test(clean);
  clean = clean.replace(/^(dr\.?|doctor)\s+/i, '').trim();

  const tokens = clean.split(/\s+/).filter(Boolean);
  const firstName = tokens[0] || (isDoctor ? 'Doctor' : 'Candidate');
  const lastName = tokens.length > 1 ? tokens.slice(1).join(' ') : null;

  const shouldHaveDr = isDoctor || hasDoctorPrefix;
  const memberDisplayName = shouldHaveDr ? `Dr. ${firstName}` : firstName;
  const adminFullName = shouldHaveDr
    ? `Dr. ${firstName}${lastName ? ' ' + lastName : ''}`
    : `${firstName}${lastName ? ' ' + lastName : ''}`;

  return {
    firstName,
    lastName,
    displayName: memberDisplayName,
    fullName: adminFullName,
  };
}

/**
 * Safe public user serializer (excludes password, mobile, email, internal metadata, and masks surname unless authorized)
 */
export function serializeUserPublic(user: any, options?: { allowFullName?: boolean }) {
  if (!user) return null;
  return {
    _id: user._id?.toString?.() || user._id,
    id: user._id?.toString?.() || user.id,
    fullName: options?.allowFullName ? user.fullName : null,
    role: user.role,
    verified: user.verified ?? user.verificationStatus === 'VERIFIED',
  };
}

export const sanitizeUser = serializeUserPublic;

import { calculateProfileCompletion, calculateProfileCompletionDetails } from './doctorValidation';

export interface SerializeProfileOptions {
  isContactUnlocked?: boolean;
  isSelf?: boolean;
  isAdmin?: boolean;
  viewerUserId?: string;
  isAuthenticatedViewer?: boolean;
}

/**
 * Safe public profile serializer (strips contact details, private notes, raw credentials,
 * and masks candidate identity for unauthenticated visitors)
 */
export function serializePublicProfile(
  profile: any,
  options?: SerializeProfileOptions | number
) {
  if (!profile) return null;
  const p = typeof profile.toObject === 'function' ? profile.toObject() : profile;

  const opts: SerializeProfileOptions =
    typeof options === 'object' && options !== null ? options : {};

  const isAuthenticatedViewer = Boolean(
    opts.isAuthenticatedViewer || opts.viewerUserId || opts.isSelf || opts.isAdmin
  );

  const canViewSensitive = Boolean(
    opts.isContactUnlocked || opts.isSelf || opts.isAdmin
  );

  const candidateId =
    p.candidateId || (p._id ? `WJ-${p._id.toString().slice(-6).toUpperCase()}` : 'WJ-100000');

  // Enforce photo visibility privacy
  const photoVisibility = p.privacySettings?.photoVisibility || 'all';
  let safePhotos = p.photos || [];
  let safePrimaryPhoto = p.primaryPhoto || (p.photos && p.photos[0]) || null;

  if (photoVisibility === 'hidden') {
    safePhotos = [];
    safePrimaryPhoto = null;
  } else if (photoVisibility === 'members_only' && !isAuthenticatedViewer) {
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
    if (!isAuthenticatedViewer || horoscopeVisibility === 'hidden') {
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

  // Calculate age from dob
  let age = 28;
  if (p.dob) {
    const d = new Date(p.dob);
    if (!isNaN(d.getTime())) {
      const diff = Date.now() - d.getTime();
      age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }
  }

  // Enforce DOB visibility privacy
  let safeDob = p.dob;
  if (!isAuthenticatedViewer || birthDateVisibility === 'hidden') {
    safeDob = null;
  } else if (birthDateVisibility === 'year_only' && p.dob) {
    const year = new Date(p.dob).getUTCFullYear();
    safeDob = new Date(`${year}-01-01T00:00:00.000Z`);
  }

  // Determine Doctor designation
  const degreeLower = (p.degree || p.education || '').toLowerCase();
  const professionLower = (p.profession || '').toLowerCase();
  const nameLower = (p.displayName || '').toLowerCase();
  const isDoctor =
    nameLower.startsWith('dr.') ||
    nameLower.startsWith('dr ') ||
    degreeLower.includes('mbbs') ||
    degreeLower.includes('md ') ||
    degreeLower.includes('md') ||
    degreeLower.includes('ms ') ||
    degreeLower.includes('dnb') ||
    degreeLower.includes('bds') ||
    professionLower.includes('doctor') ||
    professionLower.includes('physician') ||
    professionLower.includes('surgeon') ||
    professionLower.includes('specialist');

  // Parse structured candidate name parts (firstName, lastName, member displayName, admin fullName)
  const rawCandidateName = p.displayName || p.user?.fullName || 'Doctor Candidate';
  const nameParts = extractCandidateNameParts(rawCandidateName, isDoctor);

  // Determine allowed displayName, firstName, lastName, fullName based on viewer authentication & privacySettings
  let safeDisplayName: string | null = null;
  let safeFirstName: string | null = null;
  let safeLastName: string | null = null;
  let safeFullName: string | null = null;

  if (isAuthenticatedViewer) {
    const nameVisibility = p.privacySettings?.nameVisibility || 'members_only';
    if (nameVisibility === 'hidden' && !opts.isSelf && !opts.isAdmin) {
      safeDisplayName = null;
      safeFirstName = null;
      safeLastName = null;
      safeFullName = null;
    } else if (opts.isAdmin || opts.isSelf) {
      // Admin or Candidate viewing self: Full access to complete name and surname
      safeDisplayName = p.displayName || nameParts.fullName;
      safeFirstName = nameParts.firstName;
      safeLastName = nameParts.lastName;
      safeFullName = nameParts.fullName;
    } else {
      // Authenticated normal member: First name only + Doctor prefix (SURNAME STRICTLY HIDDEN)
      safeDisplayName = nameParts.displayName;
      safeFirstName = nameParts.firstName;
      safeLastName = null;
      safeFullName = null;
    }
  } else {
    // Unauthenticated guest: Candidate ID only (ALL NAME FIELDS STRICTLY NULL)
    safeDisplayName = null;
    safeFirstName = null;
    safeLastName = null;
    safeFullName = null;
  }

  const completionPercentage = calculateProfileCompletion(p, p.user);

  // For unauthenticated viewers, strip exact locations and family details
  const safeCurrentLocation = isAuthenticatedViewer
    ? (p.currentLocation || null)
    : p.city || p.state || p.country
    ? {
        city: p.city,
        state: p.state,
        country: p.country,
        formattedAddress: [p.city, p.state, p.country].filter(Boolean).join(', '),
      }
    : null;

  return {
    _id: p._id,
    id: p._id,
    candidateId,
    profileId: candidateId,
    isAuthenticatedViewer,
    user: isAuthenticatedViewer
      ? {
          _id: p.user?._id?.toString?.() || p.user?._id || p.user,
          id: p.user?._id?.toString?.() || p.user?.id || p.user,
          role: p.user?.role,
          verified: p.user?.verified ?? p.user?.verificationStatus === 'VERIFIED',
          displayName: safeDisplayName,
          firstName: safeFirstName,
          fullName: safeFullName,
          lastName: safeLastName,
        }
      : p.user
      ? {
          _id: p.user._id?.toString?.() || p.user._id || p.user,
          id: p.user._id?.toString?.() || p.user.id || p.user,
          role: p.user.role,
          verified: p.user.verified ?? p.user.verificationStatus === 'VERIFIED',
          displayName: null,
          firstName: null,
          fullName: null,
          lastName: null,
        }
      : null,
    displayName: safeDisplayName,
    name: safeDisplayName,
    publicName: safeDisplayName,
    firstName: safeFirstName,
    lastName: safeLastName,
    fullName: safeFullName,
    age,
    gender: p.gender,
    dob: safeDob,
    height: p.height,
    maritalStatus: p.maritalStatus,
    motherTongue: p.motherTongue,
    religion: p.religion,
    caste: p.caste,
    subCaste: isAuthenticatedViewer ? p.subCaste : undefined,
    education: p.education,
    degree: p.degree,
    qualification: p.degree || p.education,
    profession: p.profession,
    specialization: p.specialization || p.currentRole || p.degree || p.profession,
    company: canViewSensitive ? p.company : undefined,
    workLocation: canViewSensitive ? p.workLocation : p.city ? `${p.city}, ${p.state || ''}` : undefined,
    annualIncome: canViewSensitive ? p.annualIncome : undefined,
    country: p.country,
    state: p.state,
    city: p.city,
    medicalRegistrationNumber: canViewSensitive ? p.medicalRegistrationNumber : undefined,
    medicalCouncil: canViewSensitive ? p.medicalCouncil : undefined,
    registrationState: canViewSensitive ? p.registrationState : undefined,
    registrationYear: canViewSensitive ? p.registrationYear : undefined,
    medicalExperience: p.medicalExperience,
    currentHospital: canViewSensitive ? p.currentHospital : undefined,
    isContactUnlocked: canViewSensitive,
    contactPrivacyMessage: canViewSensitive
      ? undefined
      : isAuthenticatedViewer
      ? 'Contact details are protected for your privacy. Connect or upgrade to view.'
      : 'Sign in or register to connect with this candidate.',
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
    familyStatus: isAuthenticatedViewer ? p.familyStatus : undefined,
    familyValues: isAuthenticatedViewer ? p.familyValues : undefined,
    nativePlace: isAuthenticatedViewer ? p.nativePlace : undefined,
    familyLocation: isAuthenticatedViewer ? p.familyLocation : undefined,
    profileManagedBy: p.profileManagedBy || 'Self',
    currentLocation: safeCurrentLocation,
    nativePlaceDetails: isAuthenticatedViewer ? (p.nativePlaceDetails || null) : null,
    communityDetails: p.communityDetails || null,
    languageDetails: p.languageDetails || null,
    horoscope: safeHoroscope,
    lifestyleInterests: p.lifestyleInterests || {
      diet: p.foodPreference || 'Vegetarian',
      smoking: p.smoking || 'Non-Smoker',
      alcohol: p.drinking || 'Non-Drinker',
      exercise: 'Regular',
      hobbies: p.hobbies || [],
      languages: [p.motherTongue, 'English'].filter(Boolean) as string[],
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
      nameVisibility: 'members_only',
    },
    fatherOccupation: isAuthenticatedViewer ? p.fatherOccupation : undefined,
    motherOccupation: isAuthenticatedViewer ? p.motherOccupation : undefined,
    siblings: isAuthenticatedViewer ? p.siblings : undefined,
    familyType: isAuthenticatedViewer ? p.familyType : undefined,
    foodPreference: p.foodPreference,
    smoking: p.smoking,
    drinking: p.drinking,
    hobbies: p.hobbies || [],
    about: p.about || p.aboutMe,
    aboutMe: p.aboutMe || p.about,
    personalityValues: p.personalityValues,
    hobbiesInterests: p.hobbiesInterests,
    careerGoals: p.careerGoals,
    familyBackground: isAuthenticatedViewer ? p.familyBackground : undefined,
    siblingsDetails: isAuthenticatedViewer ? p.siblingsDetails : undefined,
    medicalQualifications: p.medicalQualifications,
    partnerExpectations: p.partnerExpectations,
    photos: safePhotos,
    primaryPhoto: safePrimaryPhoto,
    photo: safePrimaryPhoto,
    verificationStatus: p.verificationStatus,
    completionPercentage,
    lastActiveAt: p.lastActiveAt,
    createdAt: p.createdAt,
  };
}

/**
 * Safe private profile serializer (for authenticated owner / admin)
 */
export function serializePrivateProfile(profile: any, user: any, subscription?: any) {
  if (!profile) return null;
  const p = typeof profile.toObject === 'function' ? profile.toObject() : profile;
  const completionResult = calculateProfileCompletionDetails(p, user);

  const candidateId =
    p.candidateId || (p._id ? `WJ-${p._id.toString().slice(-6).toUpperCase()}` : 'WJ-100000');

  return {
    _id: p._id,
    id: p._id,
    candidateId,
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
      languages: [p.motherTongue, 'English'].filter(Boolean) as string[],
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
    about: p.about || p.aboutMe,
    aboutMe: p.aboutMe || p.about,
    personalityValues: p.personalityValues,
    hobbiesInterests: p.hobbiesInterests,
    careerGoals: p.careerGoals,
    familyBackground: p.familyBackground,
    siblingsDetails: p.siblingsDetails,
    medicalQualifications: p.medicalQualifications,
    partnerExpectations: p.partnerExpectations,
    photos: p.photos || [],
    primaryPhoto: p.primaryPhoto,
    verificationStatus: p.verificationStatus,
    completionPercentage: completionResult.score,
    completionScore: completionResult.score,
    completionBreakdown: completionResult.categories,
    lastActiveAt: p.lastActiveAt,
    createdAt: p.createdAt,
    membership: subscription?.plan || (user as any)?.membership || 'FREE',
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          expiryDate: subscription.expiryDate,
          contactRequestsRemaining: subscription.contactRequestsRemaining,
        }
      : null,
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
