import { Request, Response, NextFunction } from 'express';
import { Profile } from '../models/Profile';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { ContactRequest } from '../models/ContactRequest';
import { z } from 'zod';
import {
  isValidObjectId,
  serializePublicProfile,
  serializePrivateProfile,
  recordSecurityEvent,
} from '../utils/securityUtils';
import { validateDateOfBirth, validateMedicalQualification } from '../utils/doctorValidation';
import { validateLocationHierarchy } from './locationController';
import { validateCommunityHierarchy } from './communityMasterController';
import { Language } from '../models/CommunityMaster';

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters').max(100),
  gender: z.enum(['Male', 'Female', 'Other']),
  dob: z
    .string()
    .or(z.date())
    .refine(
      (val) => {
        const result = validateDateOfBirth(val);
        return result.isValid;
      },
      (val) => {
        const result = validateDateOfBirth(val);
        return { message: result.error || 'Date of birth year must be exactly 4 digits.' };
      }
    ),
  height: z.string().trim().min(1).max(50),
  maritalStatus: z.string().trim().min(1).max(50),
  motherTongue: z.string().trim().min(1).max(50),
  religion: z.string().trim().min(1).max(50),
  caste: z.string().trim().min(1).max(50),
  subCaste: z.string().trim().max(50).optional(),
  education: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(
      (val) => validateMedicalQualification(val).isValid,
      { message: 'Please select a valid medical/doctor qualification.' }
    ),
  degree: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(
      (val) => validateMedicalQualification(val).isValid,
      { message: 'Please select a valid medical/doctor qualification.' }
    ),
  profession: z.string().trim().min(1).max(100),
  company: z.string().trim().max(100).optional(),
  workLocation: z.string().trim().max(100).optional(),
  annualIncome: z.string().trim().max(50).optional(),
  country: z.string().trim().min(1).max(50),
  state: z.string().trim().min(1).max(50),
  city: z.string().trim().min(1).max(50),
  fatherOccupation: z.string().trim().max(100).optional(),
  motherOccupation: z.string().trim().max(100).optional(),
  siblings: z.string().trim().max(100).optional(),
  familyType: z.string().trim().max(50).optional(),
  foodPreference: z.string().trim().max(50).optional(),
  smoking: z.string().trim().max(50).optional(),
  drinking: z.string().trim().max(50).optional(),
  hobbies: z.array(z.string().trim().max(50)).max(30).optional(),
  about: z.string().trim().max(2000).optional(),
  photos: z.array(z.string().trim().max(500)).max(10).optional(),
  primaryPhoto: z.string().trim().max(500).optional(),
  medicalRegistrationNumber: z.string().trim().max(100).optional(),
  medicalCouncil: z.string().trim().max(100).optional(),
  registrationState: z.string().trim().max(100).optional(),
  registrationYear: z.string().trim().max(20).optional(),
  medicalExperience: z.string().trim().max(100).optional(),
  currentHospital: z.string().trim().max(150).optional(),
  medicalCollege: z.string().trim().max(150).optional(),
  medicalUniversity: z.string().trim().max(150).optional(),
  graduationYear: z.string().trim().max(20).optional(),
  additionalQualification: z.string().trim().max(150).optional(),
  currentRole: z.string().trim().max(100).optional(),
  workType: z.string().trim().max(100).optional(),
  currentlyPracticing: z.boolean().optional(),
  familyStatus: z.string().trim().max(100).optional(),
  familyValues: z.string().trim().max(100).optional(),
  nativePlace: z.string().trim().max(100).optional(),
  familyLocation: z.string().trim().max(100).optional(),
  profileManagedBy: z.string().trim().max(50).optional(),
  currentLocation: z
    .object({
      countryId: z.string().optional(),
      stateId: z.string().optional(),
      districtId: z.string().optional(),
      subDistrictId: z.string().optional(),
      cityId: z.string().optional(),
      villageId: z.string().optional(),
      pincode: z.string().max(20).optional(),
      formattedAddress: z.string().max(300).optional(),
    })
    .optional(),
  nativePlaceDetails: z
    .object({
      countryId: z.string().optional(),
      stateId: z.string().optional(),
      districtId: z.string().optional(),
      subDistrictId: z.string().optional(),
      cityId: z.string().optional(),
      villageId: z.string().optional(),
      pincode: z.string().max(20).optional(),
      description: z.string().max(500).optional(),
      formattedAddress: z.string().max(300).optional(),
    })
    .optional(),
  communityDetails: z
    .object({
      religionId: z.string().optional(),
      casteId: z.string().optional(),
      subCasteId: z.string().optional(),
      casteCategory: z.string().max(50).optional(),
      subCasteText: z.string().max(100).optional(),
    })
    .optional(),
  languageDetails: z
    .object({
      motherTongueId: z.string().optional(),
      otherLanguagesIds: z.array(z.string()).optional(),
    })
    .optional(),
  horoscope: z
    .object({
      timeOfBirth: z.string().trim().max(50).optional(),
      placeOfBirth: z.string().trim().max(100).optional(),
      rashi: z.string().trim().max(50).optional(),
      nakshatra: z.string().trim().max(50).optional(),
      lagna: z.string().trim().max(50).optional(),
      manglik: z.string().trim().max(50).optional(),
      gotra: z.string().trim().max(50).optional(),
      horoscopeDocument: z.string().trim().max(500).optional(),
    })
    .optional(),
  lifestyleInterests: z
    .object({
      diet: z.string().trim().max(50).optional(),
      alcohol: z.string().trim().max(50).optional(),
      smoking: z.string().trim().max(50).optional(),
      exercise: z.string().trim().max(100).optional(),
      hobbies: z.array(z.string().trim().max(50)).max(30).optional(),
      travel: z.array(z.string().trim().max(50)).max(30).optional(),
      music: z.array(z.string().trim().max(50)).max(30).optional(),
      reading: z.array(z.string().trim().max(50)).max(30).optional(),
      sports: z.array(z.string().trim().max(50)).max(30).optional(),
      languages: z.array(z.string().trim().max(50)).max(30).optional(),
      pets: z.string().trim().max(100).optional(),
      otherInterests: z.string().trim().max(200).optional(),
    })
    .optional(),
  partnerPreferences: z
    .object({
      preferredAgeMin: z.number().min(18).max(80).optional(),
      preferredAgeMax: z.number().min(18).max(80).optional(),
      preferredLocation: z.string().trim().max(150).optional(),
      preferredQualification: z.string().trim().max(150).optional(),
      preferredSpecialization: z.string().trim().max(150).optional(),
      preferredMaritalStatus: z.string().trim().max(100).optional(),
      otherPreferences: z.string().trim().max(1000).optional(),
    })
    .optional(),
  privacySettings: z
    .object({
      profileVisibility: z.enum(['all', 'verified_only', 'members_only', 'hidden']).optional(),
      photoVisibility: z.enum(['all', 'members_only', 'on_request', 'hidden']).optional(),
      contactVisibility: z.enum(['accepted_interests_only', 'members_only', 'hidden']).optional(),
      whoCanSendInterest: z.enum(['all', 'verified_only', 'premium_only']).optional(),
      whoCanMessage: z.enum(['accepted_interests_only', 'all_members']).optional(),
    })
    .optional(),
});

/**
 * Get authenticated user's own profile (includes private user details)
 */
export async function getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [profile, user] = await Promise.all([
      Profile.findOne({ user: userId })
        .populate('currentLocation.countryId', 'name code')
        .populate('currentLocation.stateId', 'name code')
        .populate('currentLocation.districtId', 'name')
        .populate('currentLocation.subDistrictId', 'name type')
        .populate('currentLocation.cityId', 'name type pincode')
        .populate('currentLocation.villageId', 'name')
        .populate('nativePlaceDetails.countryId', 'name code')
        .populate('nativePlaceDetails.stateId', 'name code')
        .populate('nativePlaceDetails.districtId', 'name')
        .populate('nativePlaceDetails.subDistrictId', 'name type')
        .populate('nativePlaceDetails.cityId', 'name type pincode')
        .populate('nativePlaceDetails.villageId', 'name')
        .populate('communityDetails.religionId', 'name')
        .populate('communityDetails.casteId', 'name category')
        .populate('communityDetails.subCasteId', 'name')
        .populate('languageDetails.motherTongueId', 'name nativeNames'),
      User.findById(userId).select('-password'),
    ]);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({
      success: true,
      data: serializePrivateProfile(profile, user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update authenticated user's own profile
 */
export async function updateMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const data = profileSchema.partial().parse(req.body);

    // Validate Location Hierarchy if currentLocation provided
    if (data.currentLocation && (data.currentLocation.countryId || data.currentLocation.stateId || data.currentLocation.districtId || data.currentLocation.cityId)) {
      const locVal = await validateLocationHierarchy(data.currentLocation);
      if (!locVal.isValid) {
        return res.status(400).json({ success: false, message: locVal.error || 'Invalid current location hierarchy.' });
      }
      if (locVal.resolved) {
        if (locVal.resolved.city) data.city = locVal.resolved.city;
        if (locVal.resolved.state) data.state = locVal.resolved.state;
        if (locVal.resolved.country) data.country = locVal.resolved.country;
        data.currentLocation.formattedAddress = [locVal.resolved.city, locVal.resolved.state, locVal.resolved.country].filter(Boolean).join(', ');
      }
    }

    // Validate Native Place Hierarchy if provided
    if (data.nativePlaceDetails && (data.nativePlaceDetails.countryId || data.nativePlaceDetails.stateId || data.nativePlaceDetails.districtId || data.nativePlaceDetails.cityId)) {
      const npVal = await validateLocationHierarchy(data.nativePlaceDetails);
      if (!npVal.isValid) {
        return res.status(400).json({ success: false, message: npVal.error || 'Invalid native place hierarchy.' });
      }
      if (npVal.resolved) {
        const parts = [npVal.resolved.village, npVal.resolved.city, npVal.resolved.district, npVal.resolved.state, npVal.resolved.country].filter(Boolean);
        data.nativePlace = parts.join(', ') || data.nativePlaceDetails.description || data.nativePlace;
        data.nativePlaceDetails.formattedAddress = data.nativePlace;
      }
    }

    // Validate Community Hierarchy if provided
    if (data.communityDetails && (data.communityDetails.religionId || data.communityDetails.casteId || data.communityDetails.subCasteId)) {
      const commVal = await validateCommunityHierarchy(data.communityDetails);
      if (!commVal.isValid) {
        return res.status(400).json({ success: false, message: commVal.error || 'Invalid community/caste hierarchy.' });
      }
      if (commVal.resolved) {
        if (commVal.resolved.religion) data.religion = commVal.resolved.religion;
        if (commVal.resolved.caste) data.caste = commVal.resolved.caste;
        if (commVal.resolved.category) data.communityDetails.casteCategory = commVal.resolved.category;
        if (commVal.resolved.subCaste) data.subCaste = commVal.resolved.subCaste;
      }
    }

    // Sync Mother Tongue if languageDetails provided
    if (data.languageDetails?.motherTongueId) {
      const langDoc = await Language.findById(data.languageDetails.motherTongueId);
      if (langDoc) {
        data.motherTongue = langDoc.name;
      }
    }

    let profile = await Profile.findOne({ user: userId });

    if (!profile) {
      const userDoc = await User.findById(userId);
      profile = new Profile({
        user: userId,
        displayName: userDoc?.fullName || 'Doctor Candidate',
        gender: 'Female',
        dob: new Date('1996-05-15'),
        height: `5' 6"`,
        maritalStatus: 'Never Married',
        motherTongue: 'Hindi',
        religion: 'Hindu',
        caste: 'General',
        education: 'MBBS',
        degree: 'MBBS',
        profession: 'General Physician',
        country: 'India',
        state: 'Maharashtra',
        city: 'Mumbai',
        verificationStatus: 'UNVERIFIED',
        lastActiveAt: new Date(),
        ...data,
      });
    } else {
      // Deep merge partnerPreferences and privacySettings if provided
      if (data.partnerPreferences) {
        profile.partnerPreferences = {
          ...((profile.partnerPreferences as any)?.toObject?.() || profile.partnerPreferences || {}),
          ...data.partnerPreferences,
        };
        delete (data as any).partnerPreferences;
      }

      if (data.privacySettings) {
        profile.privacySettings = {
          ...((profile.privacySettings as any)?.toObject?.() || profile.privacySettings || {}),
          ...data.privacySettings,
        };
        delete (data as any).privacySettings;
      }

      if (data.horoscope) {
        profile.horoscope = {
          ...((profile.horoscope as any)?.toObject?.() || profile.horoscope || {}),
          ...data.horoscope,
        };
        delete (data as any).horoscope;
      }

      if (data.lifestyleInterests) {
        profile.lifestyleInterests = {
          ...((profile.lifestyleInterests as any)?.toObject?.() || profile.lifestyleInterests || {}),
          ...data.lifestyleInterests,
        };
        delete (data as any).lifestyleInterests;
      }

      Object.assign(profile, data);
    }

    if (data.dob) {
      const parsedDob = validateDateOfBirth(data.dob);
      profile.dob = parsedDob.parsedDate || new Date(parsedDob.formattedDate || data.dob);
    }

    await profile.save();

    // Sync displayName with User fullName if changed
    if (data.displayName) {
      await User.findByIdAndUpdate(userId, { fullName: data.displayName });
    }

    await recordSecurityEvent('PROFILE_UPDATE', {
      user: userId,
      req,
      details: { profileId: profile._id },
    });

    const user = await User.findById(userId).select('-password');
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: serializePrivateProfile(profile, user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get public profile by ID (strips sensitive contact details like email/phone unless mutual contact access granted)
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const callerUserId = (req as any).user?.userId;
    const isCallerAdmin = (req as any).user?.role === 'admin';

    const profile = await Profile.findById(id).populate(
      'user',
      'fullName verificationStatus verified role mobile email'
    );
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const targetUserId = profile.user?._id?.toString() || profile.user?.toString();
    const isSelf = callerUserId && callerUserId.toString() === targetUserId;

    let isContactUnlocked = Boolean(isSelf || isCallerAdmin);

    if (!isContactUnlocked && callerUserId && targetUserId) {
      const acceptedReq = await ContactRequest.findOne({
        $or: [
          { requester: callerUserId, recipient: targetUserId, status: 'ACCEPTED' },
          { requester: targetUserId, recipient: callerUserId, status: 'ACCEPTED' },
        ],
      });
      if (acceptedReq) {
        isContactUnlocked = true;
      }
    }

    res.json({
      success: true,
      data: serializePublicProfile(profile, {
        isContactUnlocked,
        isSelf,
        isAdmin: isCallerAdmin,
      }),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create initial profile for authenticated user
 */
export async function createProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const data = profileSchema.parse(req.body);
    const existing = await Profile.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Profile already exists' });
    }

    const profile = await Profile.create({
      ...data,
      dob: new Date(data.dob),
      user: userId,
      photos: data.photos ?? [],
      primaryPhoto: data.primaryPhoto,
    });

    const user = await User.findById(userId).select('-password');

    res.status(201).json({
      success: true,
      data: serializePrivateProfile(profile, user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update profile by ID with strict ownership authorization
 */
export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    // Ownership & authorization check
    const isOwner = profile.user.toString() === req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: you cannot edit another user\'s profile' });
    }

    const data = profileSchema.partial().parse(req.body);
    Object.assign(profile, data);
    if (data.dob) {
      profile.dob = new Date(data.dob);
    }
    await profile.save();

    const user = await User.findById(profile.user).select('-password');
    res.json({
      success: true,
      data: isOwner || isAdmin ? serializePrivateProfile(profile, user) : serializePublicProfile(profile),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete profile by ID with strict ownership authorization
 */
export async function deleteProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    const profile = await Profile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    // Ownership & authorization check
    const isOwner = profile.user.toString() === req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: you cannot delete another user\'s profile' });
    }

    await profile.deleteOne();
    await User.findByIdAndUpdate(profile.user, { isActive: false });

    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    next(error);
  }
}
