"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfile = getMyProfile;
exports.updateMyProfile = updateMyProfile;
exports.getProfile = getProfile;
exports.createProfile = createProfile;
exports.updateProfile = updateProfile;
exports.deleteProfile = deleteProfile;
const Profile_1 = require("../models/Profile");
const User_1 = require("../models/User");
const Subscription_1 = require("../models/Subscription");
const ContactRequest_1 = require("../models/ContactRequest");
const zod_1 = require("zod");
const securityUtils_1 = require("../utils/securityUtils");
const doctorValidation_1 = require("../utils/doctorValidation");
const locationController_1 = require("./locationController");
const communityMasterController_1 = require("./communityMasterController");
const CommunityMaster_1 = require("../models/CommunityMaster");
const profileSchema = zod_1.z.object({
    displayName: zod_1.z.string().trim().min(2, 'Display name must be at least 2 characters').max(100),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']),
    dob: zod_1.z
        .string()
        .or(zod_1.z.date())
        .refine((val) => {
        const result = (0, doctorValidation_1.validateDateOfBirth)(val);
        return result.isValid;
    }, (val) => {
        const result = (0, doctorValidation_1.validateDateOfBirth)(val);
        return { message: result.error || 'Date of birth year must be exactly 4 digits.' };
    }),
    height: zod_1.z.string().trim().min(1).max(50),
    maritalStatus: zod_1.z.string().trim().min(1).max(50),
    motherTongue: zod_1.z.string().trim().min(1).max(50),
    religion: zod_1.z.string().trim().min(1).max(50),
    caste: zod_1.z.string().trim().min(1).max(50),
    subCaste: zod_1.z.string().trim().max(50).optional(),
    education: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(100)
        .refine((val) => (0, doctorValidation_1.validateMedicalQualification)(val).isValid, { message: 'Please select a valid medical/doctor qualification.' }),
    degree: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(100)
        .refine((val) => (0, doctorValidation_1.validateMedicalQualification)(val).isValid, { message: 'Please select a valid medical/doctor qualification.' }),
    profession: zod_1.z.string().trim().min(1).max(100),
    company: zod_1.z.string().trim().max(100).optional(),
    workLocation: zod_1.z.string().trim().max(100).optional(),
    annualIncome: zod_1.z.string().trim().max(50).optional(),
    country: zod_1.z.string().trim().min(1).max(50),
    state: zod_1.z.string().trim().min(1).max(50),
    city: zod_1.z.string().trim().min(1).max(50),
    fatherOccupation: zod_1.z.string().trim().max(100).optional(),
    motherOccupation: zod_1.z.string().trim().max(100).optional(),
    siblings: zod_1.z.string().trim().max(100).optional(),
    familyType: zod_1.z.string().trim().max(50).optional(),
    foodPreference: zod_1.z.string().trim().max(50).optional(),
    smoking: zod_1.z.string().trim().max(50).optional(),
    drinking: zod_1.z.string().trim().max(50).optional(),
    hobbies: zod_1.z.array(zod_1.z.string().trim().max(50)).max(30).optional(),
    about: zod_1.z.string().trim().max(2000).optional(),
    photos: zod_1.z.array(zod_1.z.string().trim().max(500)).max(10).optional(),
    primaryPhoto: zod_1.z.string().trim().max(500).optional(),
    medicalRegistrationNumber: zod_1.z.string().trim().max(100).optional(),
    medicalCouncil: zod_1.z.string().trim().max(100).optional(),
    registrationState: zod_1.z.string().trim().max(100).optional(),
    registrationYear: zod_1.z.string().trim().max(20).optional(),
    medicalExperience: zod_1.z.string().trim().max(100).optional(),
    currentHospital: zod_1.z.string().trim().max(150).optional(),
    medicalCollege: zod_1.z.string().trim().max(150).optional(),
    medicalUniversity: zod_1.z.string().trim().max(150).optional(),
    graduationYear: zod_1.z.string().trim().max(20).optional(),
    additionalQualification: zod_1.z.string().trim().max(150).optional(),
    currentRole: zod_1.z.string().trim().max(100).optional(),
    workType: zod_1.z.string().trim().max(100).optional(),
    currentlyPracticing: zod_1.z.boolean().optional(),
    familyStatus: zod_1.z.string().trim().max(100).optional(),
    familyValues: zod_1.z.string().trim().max(100).optional(),
    nativePlace: zod_1.z.string().trim().max(100).optional(),
    familyLocation: zod_1.z.string().trim().max(100).optional(),
    profileManagedBy: zod_1.z.string().trim().max(50).optional(),
    currentLocation: zod_1.z
        .object({
        countryId: zod_1.z.string().optional(),
        stateId: zod_1.z.string().optional(),
        districtId: zod_1.z.string().optional(),
        subDistrictId: zod_1.z.string().optional(),
        cityId: zod_1.z.string().optional(),
        villageId: zod_1.z.string().optional(),
        pincode: zod_1.z.string().max(20).optional(),
        formattedAddress: zod_1.z.string().max(300).optional(),
    })
        .optional(),
    nativePlaceDetails: zod_1.z
        .object({
        countryId: zod_1.z.string().optional(),
        stateId: zod_1.z.string().optional(),
        districtId: zod_1.z.string().optional(),
        subDistrictId: zod_1.z.string().optional(),
        cityId: zod_1.z.string().optional(),
        villageId: zod_1.z.string().optional(),
        pincode: zod_1.z.string().max(20).optional(),
        description: zod_1.z.string().max(500).optional(),
        formattedAddress: zod_1.z.string().max(300).optional(),
    })
        .optional(),
    communityDetails: zod_1.z
        .object({
        religionId: zod_1.z.string().optional(),
        casteId: zod_1.z.string().optional(),
        subCasteId: zod_1.z.string().optional(),
        casteCategory: zod_1.z.string().max(50).optional(),
        subCasteText: zod_1.z.string().max(100).optional(),
    })
        .optional(),
    languageDetails: zod_1.z
        .object({
        motherTongueId: zod_1.z.string().optional(),
        otherLanguagesIds: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
    horoscope: zod_1.z
        .object({
        timeOfBirth: zod_1.z.string().trim().max(50).optional(),
        placeOfBirth: zod_1.z.string().trim().max(100).optional(),
        rashi: zod_1.z.string().trim().max(50).optional(),
        nakshatra: zod_1.z.string().trim().max(50).optional(),
        lagna: zod_1.z.string().trim().max(50).optional(),
        manglik: zod_1.z.string().trim().max(50).optional(),
        gotra: zod_1.z.string().trim().max(50).optional(),
        horoscopeDocument: zod_1.z.string().trim().max(500).optional(),
    })
        .optional(),
    lifestyleInterests: zod_1.z
        .object({
        diet: zod_1.z.string().trim().max(50).optional(),
        alcohol: zod_1.z.string().trim().max(50).optional(),
        smoking: zod_1.z.string().trim().max(50).optional(),
        exercise: zod_1.z.string().trim().max(100).optional(),
        hobbies: zod_1.z.array(zod_1.z.string().trim().max(50)).max(30).optional(),
        travel: zod_1.z.array(zod_1.z.string().trim().max(50)).max(30).optional(),
        music: zod_1.z.array(zod_1.z.string().trim().max(50)).max(30).optional(),
        reading: zod_1.z.array(zod_1.z.string().trim().max(50)).max(30).optional(),
        sports: zod_1.z.array(zod_1.z.string().trim().max(50)).max(30).optional(),
        languages: zod_1.z.array(zod_1.z.string().trim().max(50)).max(30).optional(),
        pets: zod_1.z.string().trim().max(100).optional(),
        otherInterests: zod_1.z.string().trim().max(200).optional(),
    })
        .optional(),
    partnerPreferences: zod_1.z
        .object({
        preferredAgeMin: zod_1.z.number().min(18).max(80).optional(),
        preferredAgeMax: zod_1.z.number().min(18).max(80).optional(),
        preferredLocation: zod_1.z.string().trim().max(150).optional(),
        preferredQualification: zod_1.z.string().trim().max(150).optional(),
        preferredSpecialization: zod_1.z.string().trim().max(150).optional(),
        preferredMaritalStatus: zod_1.z.string().trim().max(100).optional(),
        otherPreferences: zod_1.z.string().trim().max(1000).optional(),
    })
        .optional(),
    aboutMe: zod_1.z.string().trim().max(3000).optional(),
    personalityValues: zod_1.z.string().trim().max(2000).optional(),
    hobbiesInterests: zod_1.z.string().trim().max(2000).optional(),
    careerGoals: zod_1.z.string().trim().max(2000).optional(),
    familyBackground: zod_1.z
        .object({
        familyType: zod_1.z.string().trim().max(100).optional(),
        familyStatus: zod_1.z.string().trim().max(100).optional(),
        fatherName: zod_1.z.string().trim().max(150).optional(),
        fatherProfession: zod_1.z.string().trim().max(150).optional(),
        motherName: zod_1.z.string().trim().max(150).optional(),
        motherProfession: zod_1.z.string().trim().max(150).optional(),
        familyLocation: zod_1.z.string().trim().max(150).optional(),
        familyValues: zod_1.z.string().trim().max(200).optional(),
        aboutFamily: zod_1.z.string().trim().max(2000).optional(),
    })
        .optional(),
    siblingsDetails: zod_1.z
        .object({
        brothersCount: zod_1.z.number().min(0).max(20).optional(),
        sistersCount: zod_1.z.number().min(0).max(20).optional(),
        brothers: zod_1.z.array(zod_1.z.any()).optional(),
        sisters: zod_1.z.array(zod_1.z.any()).optional(),
    })
        .optional(),
    medicalQualifications: zod_1.z
        .object({
        undergraduate: zod_1.z.array(zod_1.z.any()).optional(),
        postgraduate: zod_1.z.array(zod_1.z.any()).optional(),
        doctorate: zod_1.z.array(zod_1.z.any()).optional(),
    })
        .optional(),
    partnerExpectations: zod_1.z
        .object({
        ageMin: zod_1.z.number().min(18).max(80).optional(),
        ageMax: zod_1.z.number().min(18).max(80).optional(),
        heightMin: zod_1.z.string().trim().max(50).optional(),
        heightMax: zod_1.z.string().trim().max(50).optional(),
        qualification: zod_1.z.string().trim().max(150).optional(),
        specialization: zod_1.z.string().trim().max(150).optional(),
        location: zod_1.z.any().optional(),
        willingToRelocate: zod_1.z.any().optional(),
        maritalStatus: zod_1.z.string().trim().max(100).optional(),
        lifestyle: zod_1.z.any().optional(),
        familyExpectations: zod_1.z.string().trim().max(2000).optional(),
        additionalExpectations: zod_1.z.string().trim().max(2000).optional(),
    })
        .optional(),
    privacySettings: zod_1.z
        .object({
        profileVisibility: zod_1.z.enum(['all', 'verified_only', 'members_only', 'hidden']).optional(),
        photoVisibility: zod_1.z.enum(['all', 'members_only', 'on_request', 'hidden']).optional(),
        contactVisibility: zod_1.z.enum(['accepted_interests_only', 'members_only', 'hidden']).optional(),
        whoCanSendInterest: zod_1.z.enum(['all', 'verified_only', 'premium_only']).optional(),
        whoCanMessage: zod_1.z.enum(['accepted_interests_only', 'all_members']).optional(),
    })
        .optional(),
});
/**
 * Get authenticated user's own profile (includes private user details)
 */
async function getMyProfile(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const [profile, user, subscription] = await Promise.all([
            Profile_1.Profile.findOne({ user: userId })
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
            User_1.User.findById(userId).select('-password'),
            Subscription_1.Subscription.findOne({ user: userId, status: 'ACTIVE' }),
        ]);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        res.json({
            success: true,
            data: (0, securityUtils_1.serializePrivateProfile)(profile, user, subscription),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update authenticated user's own profile
 */
async function updateMyProfile(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const data = profileSchema.partial().parse(req.body);
        // Validate Location Hierarchy if currentLocation provided
        if (data.currentLocation && (data.currentLocation.countryId || data.currentLocation.stateId || data.currentLocation.districtId || data.currentLocation.cityId)) {
            const locVal = await (0, locationController_1.validateLocationHierarchy)(data.currentLocation);
            if (!locVal.isValid) {
                return res.status(400).json({ success: false, message: locVal.error || 'Invalid current location hierarchy.' });
            }
            if (locVal.resolved) {
                if (locVal.resolved.city)
                    data.city = locVal.resolved.city;
                if (locVal.resolved.state)
                    data.state = locVal.resolved.state;
                if (locVal.resolved.country)
                    data.country = locVal.resolved.country;
                data.currentLocation.formattedAddress = [locVal.resolved.city, locVal.resolved.state, locVal.resolved.country].filter(Boolean).join(', ');
            }
        }
        // Validate Native Place Hierarchy if provided
        if (data.nativePlaceDetails && (data.nativePlaceDetails.countryId || data.nativePlaceDetails.stateId || data.nativePlaceDetails.districtId || data.nativePlaceDetails.cityId)) {
            const npVal = await (0, locationController_1.validateLocationHierarchy)(data.nativePlaceDetails);
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
            const commVal = await (0, communityMasterController_1.validateCommunityHierarchy)(data.communityDetails);
            if (!commVal.isValid) {
                return res.status(400).json({ success: false, message: commVal.error || 'Invalid community/caste hierarchy.' });
            }
            if (commVal.resolved) {
                if (commVal.resolved.religion)
                    data.religion = commVal.resolved.religion;
                if (commVal.resolved.caste)
                    data.caste = commVal.resolved.caste;
                if (commVal.resolved.category)
                    data.communityDetails.casteCategory = commVal.resolved.category;
                if (commVal.resolved.subCaste)
                    data.subCaste = commVal.resolved.subCaste;
            }
        }
        // Sync Mother Tongue if languageDetails provided
        if (data.languageDetails?.motherTongueId) {
            const langDoc = await CommunityMaster_1.Language.findById(data.languageDetails.motherTongueId);
            if (langDoc) {
                data.motherTongue = langDoc.name;
            }
        }
        let profile = await Profile_1.Profile.findOne({ user: userId });
        if (!profile) {
            const userDoc = await User_1.User.findById(userId);
            profile = new Profile_1.Profile({
                user: userId,
                displayName: userDoc?.fullName || 'Doctor Candidate',
                gender: 'Female',
                dob: new Date('1996-05-15'),
                height: `5' 6"`,
                maritalStatus: 'Never Married',
                motherTongue: data.motherTongue || '',
                religion: data.religion || '',
                caste: data.caste || '',
                education: data.education || 'MBBS',
                degree: data.degree || 'MBBS',
                profession: data.profession || 'General Physician',
                country: data.country || 'India',
                state: data.state || '',
                city: 'Mumbai',
                verificationStatus: 'UNVERIFIED',
                lastActiveAt: new Date(),
                ...data,
            });
        }
        else {
            // Deep merge partnerPreferences and privacySettings if provided
            if (data.partnerPreferences) {
                profile.partnerPreferences = {
                    ...(profile.partnerPreferences?.toObject?.() || profile.partnerPreferences || {}),
                    ...data.partnerPreferences,
                };
                delete data.partnerPreferences;
            }
            if (data.privacySettings) {
                profile.privacySettings = {
                    ...(profile.privacySettings?.toObject?.() || profile.privacySettings || {}),
                    ...data.privacySettings,
                };
                delete data.privacySettings;
            }
            if (data.horoscope) {
                profile.horoscope = {
                    ...(profile.horoscope?.toObject?.() || profile.horoscope || {}),
                    ...data.horoscope,
                };
                delete data.horoscope;
            }
            if (data.lifestyleInterests) {
                profile.lifestyleInterests = {
                    ...(profile.lifestyleInterests?.toObject?.() || profile.lifestyleInterests || {}),
                    ...data.lifestyleInterests,
                };
                delete data.lifestyleInterests;
            }
            Object.assign(profile, data);
        }
        if (data.dob) {
            const parsedDob = (0, doctorValidation_1.validateDateOfBirth)(data.dob, data.gender || profile.gender);
            if (!parsedDob.isValid) {
                return res.status(400).json({
                    success: false,
                    message: parsedDob.error || 'Date of birth year must be exactly 4 digits.',
                });
            }
            profile.dob = parsedDob.parsedDate || new Date(parsedDob.formattedDate || data.dob);
        }
        await profile.save();
        // Sync displayName with User fullName if changed
        if (data.displayName) {
            await User_1.User.findByIdAndUpdate(userId, { fullName: data.displayName });
        }
        await (0, securityUtils_1.recordSecurityEvent)('PROFILE_UPDATE', {
            user: userId,
            req,
            details: { profileId: profile._id },
        });
        const [user, subscription] = await Promise.all([
            User_1.User.findById(userId).select('-password'),
            Subscription_1.Subscription.findOne({ user: userId, status: 'ACTIVE' }),
        ]);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: (0, securityUtils_1.serializePrivateProfile)(profile, user, subscription),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get public profile by ID (strips sensitive contact details like email/phone unless mutual contact access granted)
 */
async function getProfile(req, res, next) {
    try {
        const { id } = req.params;
        let profileQuery = null;
        if ((0, securityUtils_1.isValidObjectId)(id)) {
            profileQuery = { _id: id };
        }
        else if (typeof id === 'string' && /^[A-Za-z0-9_-]{3,32}$/.test(id)) {
            profileQuery = { candidateId: id.toUpperCase() };
        }
        else {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const callerUserId = req.user?.userId;
        const isCallerAdmin = req.user?.role === 'admin';
        const profile = await Profile_1.Profile.findOne(profileQuery).populate('user', 'fullName verificationStatus verified role mobile email');
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const targetUserId = profile.user?._id?.toString() || profile.user?.toString();
        const isSelf = callerUserId && callerUserId.toString() === targetUserId;
        let isContactUnlocked = Boolean(isSelf || isCallerAdmin);
        if (!isContactUnlocked && callerUserId && targetUserId) {
            const acceptedReq = await ContactRequest_1.ContactRequest.findOne({
                $or: [
                    { requester: callerUserId, recipient: targetUserId, status: 'ACCEPTED' },
                    { requester: targetUserId, recipient: callerUserId, status: 'ACCEPTED' },
                ],
            });
            if (acceptedReq) {
                isContactUnlocked = true;
            }
        }
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.json({
            success: true,
            data: (0, securityUtils_1.serializePublicProfile)(profile, {
                viewerUserId: callerUserId,
                isContactUnlocked,
                isSelf,
                isAdmin: isCallerAdmin,
            }),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Create initial profile for authenticated user
 */
async function createProfile(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const data = profileSchema.parse(req.body);
        const existing = await Profile_1.Profile.findOne({ user: userId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Profile already exists' });
        }
        const profile = await Profile_1.Profile.create({
            ...data,
            dob: new Date(data.dob),
            user: userId,
            photos: data.photos ?? [],
            primaryPhoto: data.primaryPhoto,
        });
        const user = await User_1.User.findById(userId).select('-password');
        res.status(201).json({
            success: true,
            data: (0, securityUtils_1.serializePrivateProfile)(profile, user),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update profile by ID with strict ownership authorization
 */
async function updateProfile(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const profile = await Profile_1.Profile.findById(id);
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
        const user = await User_1.User.findById(profile.user).select('-password');
        res.json({
            success: true,
            data: isOwner || isAdmin ? (0, securityUtils_1.serializePrivateProfile)(profile, user) : (0, securityUtils_1.serializePublicProfile)(profile),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Delete profile by ID with strict ownership authorization
 */
async function deleteProfile(req, res, next) {
    try {
        const { id } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const profile = await Profile_1.Profile.findById(id);
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
        await User_1.User.findByIdAndUpdate(profile.user, { isActive: false });
        res.json({ success: true, message: 'Profile deleted successfully' });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=profileController.js.map