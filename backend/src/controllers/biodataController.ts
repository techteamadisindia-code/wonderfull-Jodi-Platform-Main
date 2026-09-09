import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Biodata, IBiodata } from '../models/Biodata';
import { Profile } from '../models/Profile';
import { generateBiodataPdfBuffer } from '../services/biodataPdfService';

// Ensure uploads/biodatas directory exists
const BIODATA_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'biodatas');
if (!fs.existsSync(BIODATA_UPLOADS_DIR)) {
  fs.mkdirSync(BIODATA_UPLOADS_DIR, { recursive: true });
}

function calculateAge(dob: Date | string): number {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 26;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(18, age);
}

function formatDate(dob: Date | string): string {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getAuthUserId(req: Request): string | undefined {
  const user = (req as any).user;
  return user?.userId || user?.id || user?._id;
}

/**
 * GET /api/biodata/profile
 * Pre-populates biodata fields from authenticated user's profile
 */
export async function getProfileForBiodata(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const profile: any = await Profile.findOne({ user: userId })
      .populate('currentLocation.countryId', 'name code')
      .populate('currentLocation.stateId', 'name code')
      .populate('currentLocation.districtId', 'name')
      .populate('currentLocation.subDistrictId', 'name type')
      .populate('currentLocation.cityId', 'name')
      .populate('currentLocation.villageId', 'name')
      .populate('nativePlaceDetails.stateId', 'name')
      .populate('nativePlaceDetails.districtId', 'name')
      .populate('communityDetails.religionId', 'name')
      .populate('communityDetails.casteId', 'name category')
      .populate('communityDetails.subCasteId', 'name')
      .populate('languageDetails.motherTongueId', 'name')
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please complete your basic profile first.',
      });
    }

    const currentCity = (profile.currentLocation?.cityId as any)?.name || profile.city || '';
    const currentState = (profile.currentLocation?.stateId as any)?.name || profile.state || '';
    const currentCountry = (profile.currentLocation?.countryId as any)?.name || profile.country || 'India';
    const religion = (profile.communityDetails?.religionId as any)?.name || profile.religion || 'Hindu';
    const caste = (profile.communityDetails?.casteId as any)?.name || profile.caste || '';
    const subCaste = (profile.communityDetails?.subCasteId as any)?.name || profile.subCaste || '';
    const motherTongue = (profile.languageDetails?.motherTongueId as any)?.name || profile.motherTongue || 'Marathi';

    const nativeState = (profile.nativePlaceDetails?.stateId as any)?.name || '';
    const nativeDistrict = (profile.nativePlaceDetails?.districtId as any)?.name || '';
    const nativePlaceStr = profile.nativePlaceDetails?.description || profile.nativePlace || [nativeDistrict, nativeState].filter(Boolean).join(', ');

    const formattedDob = profile.dob ? formatDate(profile.dob) : '';
    const age = profile.dob ? calculateAge(profile.dob) : 26;

    const populatedData = {
      profileId: profile._id,
      personalDetails: {
        fullName: profile.displayName || '',
        gender: profile.gender || 'Male',
        dob: formattedDob,
        age: age,
        height: profile.height || `5' 8"`,
        maritalStatus: profile.maritalStatus || 'Never Married',
        religion: religion,
        caste: caste,
        subCaste: subCaste,
        motherTongue: motherTongue,
      },
      location: {
        currentCity: currentCity,
        currentState: currentState,
        currentCountry: currentCountry,
        nativePlace: nativePlaceStr,
        formattedLocation: [currentCity, currentState].filter(Boolean).join(', '),
      },
      education: {
        primaryQualification: profile.education || 'MBBS',
        college: profile.medicalCollege || '',
        university: profile.medicalUniversity || '',
        graduationYear: profile.graduationYear || '',
        postgraduateQualification: profile.degree && profile.degree !== profile.education ? profile.degree : '',
        pgCollege: '',
        pgYear: '',
        additionalQualification: profile.additionalQualification || '',
      },
      medicalCareer: {
        occupation: 'Doctor',
        specialization: profile.profession || 'General Physician',
        designation: profile.currentRole || 'Consultant Specialist',
        currentHospital: profile.currentHospital || profile.company || '',
        workLocation: profile.workLocation || currentCity,
        experience: profile.medicalExperience || '',
        practiceType: profile.workType || 'Hospital Consultant',
        annualIncome: profile.annualIncome || '',
        medicalRegistrationNumber: profile.medicalRegistrationNumber || '',
        medicalCouncil: profile.medicalCouncil || '',
      },
      family: {
        fatherName: '',
        fatherOccupation: profile.fatherOccupation || '',
        motherName: '',
        motherOccupation: profile.motherOccupation || '',
        siblings: profile.siblings || '',
        familyType: profile.familyType || 'Nuclear Family',
        familyValues: profile.familyValues || 'Moderate',
        familyStatus: profile.familyStatus || 'Upper Middle Class',
        nativePlace: nativePlaceStr,
        familyLocation: profile.familyLocation || currentState,
      },
      lifestyle: {
        diet: profile.lifestyleInterests?.diet || profile.foodPreference || 'Vegetarian',
        smoking: profile.lifestyleInterests?.smoking || profile.smoking || 'Non-Smoker',
        drinking: profile.lifestyleInterests?.drinking || profile.drinking || 'Non-Drinker',
        hobbies: profile.lifestyleInterests?.hobbies || profile.hobbies || [],
        languagesKnown: profile.lifestyleInterests?.languages || [motherTongue, 'English'],
      },
      horoscope: {
        dob: formattedDob,
        timeOfBirth: profile.horoscope?.timeOfBirth || '',
        placeOfBirth: profile.horoscope?.placeOfBirth || '',
        rashi: profile.horoscope?.rashi || '',
        nakshatra: profile.horoscope?.nakshatra || '',
        lagna: profile.horoscope?.lagna || '',
        manglik: profile.horoscope?.manglik || 'Non-Manglik',
        gotra: profile.horoscope?.gotra || '',
        pada: profile.horoscope?.pada || '',
        gana: '',
        nadi: '',
      },
      partnerPreferences: {
        preferredAge:
          profile.partnerPreferences?.preferredAgeMin && profile.partnerPreferences?.preferredAgeMax
            ? `${profile.partnerPreferences.preferredAgeMin} - ${profile.partnerPreferences.preferredAgeMax} Years`
            : '24 - 32 Years',
        preferredHeight: `5' 2" - 5' 9"`,
        preferredLocation: profile.partnerPreferences?.preferredLocation || 'Anywhere in India',
        preferredEducation: profile.partnerPreferences?.preferredQualification || 'MBBS / MD / MS / Medical Specialist',
        preferredSpecialization: profile.partnerPreferences?.preferredSpecialization || 'Any Medical Specialization',
        preferredMaritalStatus: profile.partnerPreferences?.preferredMaritalStatus || 'Never Married',
        otherExpectations: profile.partnerPreferences?.otherPreferences || '',
      },
      contactDetails: {
        contactPerson: 'Parents / Candidate',
        phone: '',
        email: '',
        address: [currentCity, currentState].filter(Boolean).join(', '),
      },
      photoUrl: profile.primaryPhoto || (profile.photos && profile.photos[0]) || '',
      additionalPhotos: profile.photos || [],
      sectionVisibility: {
        personalDetails: true,
        education: true,
        medicalCareer: true,
        family: true,
        lifestyle: true,
        horoscope: Boolean(profile.horoscope?.rashi || profile.horoscope?.nakshatra),
        partnerPreferences: true,
        contactDetails: false,
        photo: true,
      },
    };

    return res.json({ success: true, data: populatedData });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/biodata
 * List authenticated user's saved biodatas
 */
export async function listBiodatas(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    const biodatas = await Biodata.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ success: true, data: biodatas });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/biodata
 * Create a new biodata for the user
 */
export async function createBiodata(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile required to create biodata' });
    }

    const payload = req.body;
    const publicId = 'WJBIO' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const biodata = new Biodata({
      ...payload,
      userId,
      profileId: profile._id,
      publicId,
    });

    await biodata.save();

    return res.status(201).json({
      success: true,
      message: 'Biodata created successfully',
      data: biodata,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/biodata/:id
 * Retrieve a specific biodata with strict ownership security
 */
export async function getBiodataById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid biodata ID format' });
    }

    const biodata = await Biodata.findById(id);
    if (!biodata) {
      return res.status(404).json({ success: false, message: 'Biodata not found' });
    }

    // Ownership Verification
    if (biodata.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this biodata' });
    }

    return res.json({ success: true, data: biodata });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/biodata/:id or PUT /api/biodata/:id
 * Update biodata with strict ownership check & auto-save support
 */
export async function updateBiodata(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid biodata ID format' });
    }

    const biodata = await Biodata.findById(id);
    if (!biodata) {
      return res.status(404).json({ success: false, message: 'Biodata not found' });
    }

    // Ownership Verification
    if (biodata.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this biodata' });
    }

    const updates = req.body;
    delete updates.userId;
    delete updates.profileId;
    delete updates.publicId;

    // Invalidate cached PDF on edits
    updates.generatedPdfUrl = null;
    updates.pdfGeneratedAt = null;

    Object.assign(biodata, updates);
    await biodata.save();

    return res.json({
      success: true,
      message: 'Biodata saved successfully',
      data: biodata,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/biodata/:id
 * Remove biodata and local file if exists
 */
export async function deleteBiodata(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid biodata ID format' });
    }

    const biodata = await Biodata.findById(id);
    if (!biodata) {
      return res.status(404).json({ success: false, message: 'Biodata not found' });
    }

    // Ownership Verification
    if (biodata.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this biodata' });
    }

    // Remove local file if present
    const filePath = path.join(BIODATA_UPLOADS_DIR, `${biodata.publicId}.pdf`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Failed to delete biodata PDF file:', e);
      }
    }

    await Biodata.findByIdAndDelete(id);

    return res.json({ success: true, message: 'Biodata deleted successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/biodata/:id/generate-pdf
 * Generate professional PDF server-side using PDFKit
 */
export async function generateBiodataPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid biodata ID format' });
    }

    const biodata = await Biodata.findById(id);
    if (!biodata) {
      return res.status(404).json({ success: false, message: 'Biodata not found' });
    }

    // Ownership Verification
    if (biodata.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this biodata' });
    }

    // Allow user to switch template or visibility dynamically in generate request
    if (req.body.templateId) {
      biodata.templateId = req.body.templateId;
    }
    if (req.body.sectionVisibility) {
      biodata.sectionVisibility = { ...biodata.sectionVisibility, ...req.body.sectionVisibility };
    }

    const pdfBuffer = await generateBiodataPdfBuffer(biodata);

    const filename = `${biodata.publicId}.pdf`;
    const filePath = path.join(BIODATA_UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    biodata.generatedPdfUrl = `/api/biodata/${biodata._id}/pdf`;
    biodata.pdfGeneratedAt = new Date();
    await biodata.save();

    return res.json({
      success: true,
      message: 'PDF generated successfully',
      data: {
        downloadUrl: biodata.generatedPdfUrl,
        publicId: biodata.publicId,
        generatedAt: biodata.pdfGeneratedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/biodata/:id/pdf
 * Download or stream the generated PDF
 */
export async function downloadBiodataPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid biodata ID format' });
    }

    const biodata = await Biodata.findById(id);
    if (!biodata) {
      return res.status(404).json({ success: false, message: 'Biodata not found' });
    }

    // Ownership Verification
    if (biodata.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this biodata' });
    }

    const filename = `${biodata.publicId}.pdf`;
    const filePath = path.join(BIODATA_UPLOADS_DIR, filename);

    // If PDF doesn't exist on disk, generate it on demand
    if (!fs.existsSync(filePath)) {
      const pdfBuffer = await generateBiodataPdfBuffer(biodata);
      fs.writeFileSync(filePath, pdfBuffer);
      biodata.generatedPdfUrl = `/api/biodata/${biodata._id}/pdf`;
      biodata.pdfGeneratedAt = new Date();
      await biodata.save();
    }

    const cleanName = (biodata.personalDetails.fullName || 'Doctor').replace(/[^a-zA-Z0-9_-]/g, '_');
    const downloadFilename = `Marriage_Biodata_${cleanName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/biodata/public/:publicId
 * Public viewer endpoint (Strictly sanitizes private contact/account details)
 */
export async function getPublicBiodata(req: Request, res: Response, next: NextFunction) {
  try {
    const { publicId } = req.params;
    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid public ID' });
    }

    const biodata: any = await Biodata.findOne({ publicId }).lean();
    if (!biodata) {
      return res.status(404).json({
        success: false,
        message: 'This matrimonial biodata is no longer available or has been removed.',
      });
    }

    // Sanitize: strip internal IDs and sensitive data
    const sanitized: any = {
      publicId: biodata.publicId,
      title: biodata.title,
      templateId: biodata.templateId,
      personalDetails: biodata.sectionVisibility?.personalDetails ? biodata.personalDetails : null,
      location: biodata.location,
      education: biodata.sectionVisibility?.education ? biodata.education : null,
      medicalCareer: biodata.sectionVisibility?.medicalCareer ? biodata.medicalCareer : null,
      family: biodata.sectionVisibility?.family ? biodata.family : null,
      lifestyle: biodata.sectionVisibility?.lifestyle ? biodata.lifestyle : null,
      horoscope: biodata.sectionVisibility?.horoscope ? biodata.horoscope : null,
      partnerPreferences: biodata.sectionVisibility?.partnerPreferences ? biodata.partnerPreferences : null,
      contactDetails: biodata.sectionVisibility?.contactDetails ? biodata.contactDetails : null,
      photoUrl: biodata.sectionVisibility?.photo ? biodata.photoUrl : null,
      sectionVisibility: biodata.sectionVisibility,
      updatedAt: biodata.updatedAt,
    };

    return res.json({ success: true, data: sanitized });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/biodata/admin/stats
 * Optional admin dashboard metrics
 */
export async function getAdminBiodataStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, createdToday, withPdfs, byTemplate] = await Promise.all([
      Biodata.countDocuments(),
      Biodata.countDocuments({ createdAt: { $gte: startOfToday } }),
      Biodata.countDocuments({ generatedPdfUrl: { $ne: null } }),
      Biodata.aggregate([
        { $group: { _id: '$templateId', count: { $sum: 1 } } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        createdToday,
        withPdfs,
        byTemplate: byTemplate.reduce((acc: any, curr: any) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
}
