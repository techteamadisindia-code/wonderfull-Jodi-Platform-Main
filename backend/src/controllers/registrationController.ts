import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Registration, RegistrationStatus } from '../models/Registration';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { State, City } from '../models/Location';
import { AuthRequest } from '../middleware/authMiddleware';
import { escapeRegex, isValidObjectId } from '../utils/securityUtils';
import jwt from 'jsonwebtoken';
import { validateDateOfBirth, validateMedicalQualification, validatePassingYear } from '../utils/doctorValidation';
import { CURRENT_TERMS_VERSION } from '../config/termsConfig';

/**
 * Generate a unique, readable registration ID: REG-YYYYMMDD-XXXXXX
 */
async function generateUniqueRegistrationId(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let isUnique = false;
  let regId = '';

  while (!isUnique) {
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    regId = `REG-${dateStr}-${randomSuffix}`;
    const existing = await Registration.findOne({ registrationId: regId });
    if (!existing) {
      isUnique = true;
    }
  }

  return regId;
}

/**
 * Compute completion percentage based on filled sections & essential fields
 */
function calculateCompletionPercentage(stepData: any): number {
  if (!stepData) return 0;
  let score = 0;
  const maxScore = 100;

  // Step 1: Basic & Account (30%)
  const basic = stepData.basicInfo || {};
  if (basic.fullName && basic.fullName.trim().length >= 2) score += 8;
  if (basic.email && basic.email.includes('@')) score += 8;
  if (basic.mobile && basic.mobile.length >= 10) score += 8;
  if (basic.passwordHash || basic.password) score += 6;

  // Step 2: Personal & Cultural (25%)
  const personal = stepData.personalInfo || {};
  if (personal.gender || basic.gender) score += 5;
  if (personal.maritalStatus) score += 5;
  if (personal.religion) score += 5;
  if (personal.city || personal.workLocation) score += 5;
  if (personal.motherTongue || personal.height) score += 5;

  // Step 3: Education & Profession (25%)
  const edu = stepData.educationProfession || {};
  if (edu.profession) score += 10;
  if (edu.education || edu.degree) score += 10;
  if (edu.company || edu.workLocation || edu.annualIncome) score += 5;

  // Step 4: Preferences & Photos (20%)
  const pref = stepData.preferences || {};
  const photos = stepData.photos || {};
  if (pref.lookingFor || pref.prefAgeMin || pref.prefDiet) score += 10;
  if (photos.primaryPhoto || (photos.photos && photos.photos.length > 0)) score += 10;

  return Math.min(maxScore, Math.max(0, Math.round(score)));
}

/**
 * Sanitize registration object before returning to client/admin
 * Strip plain passwords and internal secrets
 */
function sanitizeRegistration(regDoc: any) {
  const obj = regDoc.toObject ? regDoc.toObject() : { ...regDoc };
  if (obj.stepData?.basicInfo?.passwordHash) {
    delete obj.stepData.basicInfo.passwordHash;
  }
  if (obj.stepData?.basicInfo?.password) {
    delete obj.stepData.basicInfo.password;
  }
  if (obj.stepData?.rawFormData?.password) {
    delete obj.stepData.rawFormData.password;
  }
  if (obj.stepData?.rawFormData?.confirmPassword) {
    delete obj.stepData.rawFormData.confirmPassword;
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER REGISTRATION FLOW CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. START REGISTRATION (POST /api/registration/start or /api/registration/save-step)
 * Saves Page 1 immediately, generates unique registrationId, stores in database
 */
export async function startRegistration(req: Request, res: Response, next: NextFunction) {
  try {
    const s1 = req.body.step1Data || req.body.basicInfo || {};
    const fullName = req.body.fullName || s1.fullName;
    const email = req.body.email || s1.email;
    const mobile = req.body.mobile || req.body.phone || s1.mobile || s1.phone;
    const password = req.body.password || s1.password;
    const gender = req.body.gender || s1.gender;
    const dob = req.body.dob || req.body.dateOfBirth || s1.dob || s1.dateOfBirth;
    const lookingFor = req.body.lookingFor || s1.lookingFor;
    const agreeTerms = req.body.agreeTerms !== undefined ? req.body.agreeTerms : (s1.agreeTerms !== undefined ? s1.agreeTerms : true);
    const stepData = req.body.stepData || {};
    const rawFormData = req.body.rawFormData || s1;

    const normalizedEmail = (email || '').toLowerCase().trim();
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    const cleanName = (fullName || '').trim();

    // Validate DOB (Mandatory for registration start)
    if (!dob || (typeof dob === 'string' && !dob.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required.',
      });
    }

    const dobResult = validateDateOfBirth(dob, gender);
    if (!dobResult.isValid) {
      return res.status(400).json({
        success: false,
        message: dobResult.error || 'Date of birth year must be exactly 4 digits.',
      });
    }
    const normalizedDob = dobResult.formattedDate!;

    // Validate Medical Qualification if supplied
    const inputQual = stepData?.educationProfession?.education || stepData?.educationProfession?.degree || rawFormData?.qualification;
    if (inputQual) {
      const qualResult = validateMedicalQualification(inputQual);
      if (!qualResult.isValid) {
        return res.status(400).json({
          success: false,
          message: qualResult.error || 'Please select a valid medical/doctor qualification.',
        });
      }
    }

    // Check if user is already registered in fully active User accounts
    if (normalizedEmail || cleanMobile) {
      const existingUser = await User.findOne({
        $or: [
          normalizedEmail ? { email: normalizedEmail } : null,
          cleanMobile ? { mobile: cleanMobile } : null,
        ].filter(Boolean) as any[],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          code: 'USER_ALREADY_REGISTERED',
          message: 'An account with this email address or mobile number already exists. Please sign in.',
        });
      }
    }

    // Check if an IN_PROGRESS registration already exists for this email/mobile to prevent duplicate drafts
    let registration = null;
    if (normalizedEmail || cleanMobile) {
      registration = await Registration.findOne({
        status: { $in: ['STARTED', 'IN_PROGRESS'] },
        $or: [
          normalizedEmail ? { email: normalizedEmail } : null,
          cleanMobile ? { mobile: cleanMobile } : null,
        ].filter(Boolean) as any[],
      });
    }

    let passwordHash = '';
    if (password && typeof password === 'string' && password.length >= 6) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    const resumeToken = crypto.randomBytes(32).toString('hex');
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (registration) {
      // Update existing draft with latest data
      registration.candidateName = cleanName || registration.candidateName;
      registration.email = normalizedEmail || registration.email;
      registration.mobile = cleanMobile || registration.mobile;
      if (gender) registration.gender = gender;

      registration.stepData.basicInfo = {
        ...registration.stepData.basicInfo,
        fullName: cleanName || registration.stepData.basicInfo?.fullName,
        email: normalizedEmail || registration.stepData.basicInfo?.email,
        mobile: cleanMobile || registration.stepData.basicInfo?.mobile,
        passwordHash: passwordHash || registration.stepData.basicInfo?.passwordHash,
        gender: gender || registration.stepData.basicInfo?.gender,
        dob: normalizedDob || registration.stepData.basicInfo?.dob,
        lookingFor: lookingFor || registration.stepData.basicInfo?.lookingFor,
        agreeTerms: agreeTerms ?? registration.stepData.basicInfo?.agreeTerms,
      };

      registration.stepData.rawFormData = {
        ...registration.stepData.rawFormData,
        ...rawFormData,
      };

      registration.currentStep = Math.max(registration.currentStep, 2);
      registration.completionPercentage = calculateCompletionPercentage(registration.stepData);
      registration.lastActiveAt = new Date();
      registration.status = 'IN_PROGRESS';
      await registration.save();
    } else {
      // Create brand new registration draft
      const registrationId = await generateUniqueRegistrationId();

      const initialStepData: any = {
        basicInfo: {
          fullName: cleanName,
          email: normalizedEmail,
          mobile: cleanMobile,
          passwordHash,
          gender,
          dob: normalizedDob,
          lookingFor,
          agreeTerms: Boolean(agreeTerms),
        },
        personalInfo: stepData.personalInfo || {},
        educationProfession: stepData.educationProfession || {},
        familyDetails: stepData.familyDetails || {},
        preferences: stepData.preferences || {},
        photos: stepData.photos || {},
        rawFormData: { ...rawFormData, fullName: cleanName, email: normalizedEmail, mobile: cleanMobile },
      };

      const completionPercentage = calculateCompletionPercentage(initialStepData);

      registration = await Registration.create({
        registrationId,
        status: 'IN_PROGRESS',
        currentStep: 2,
        totalSteps: 4,
        completionPercentage,
        candidateName: cleanName,
        email: normalizedEmail || undefined,
        mobile: cleanMobile || undefined,
        gender: gender || '',
        stepData: initialStepData,
        resumeToken,
        startedAt: new Date(),
        lastActiveAt: new Date(),
        ipAddress,
        userAgent,
      });
    }

    const sanitized = sanitizeRegistration(registration);

    return res.status(201).json({
      success: true,
      message: 'Registration started and saved to database successfully',
      data: {
        registrationId: registration.registrationId,
        resumeToken: registration.resumeToken,
        currentStep: registration.currentStep,
        totalSteps: registration.totalSteps,
        completionPercentage: registration.completionPercentage,
        status: registration.status,
        stepData: sanitized.stepData,
        candidateName: registration.candidateName,
        email: registration.email,
        mobile: registration.mobile,
        lastActiveAt: registration.lastActiveAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. SAVE STEP (POST /api/registration/save-step)
 * Updates existing registration with Page 1, Page 2, Page 3, or Page 4 data
 */
export async function saveStep(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRegId = req.params.registrationId || req.body.registrationId;

    if (!rawRegId || typeof rawRegId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid registrationId is required to save progress',
      });
    }

    const registrationId = rawRegId.trim().toUpperCase();
    let stepNumber = req.body.stepNumber ?? req.body.currentStep;
    let section = req.body.section; // 'basicInfo' | 'personalInfo' | 'educationProfession' | 'familyDetails' | 'preferences' | 'photos'
    let data = req.body.data || {};
    const rawFormData = req.body.rawFormData || {};

    // Support step-specific payloads (step2Data, step3Data, step4Data, step1Data)
    if (req.body.step2Data) {
      stepNumber = stepNumber || 2;
      section = section || 'personalInfo';
      data = { ...req.body.step2Data, ...data };
    } else if (req.body.step3Data) {
      stepNumber = stepNumber || 3;
      section = section || 'educationProfession';
      data = { ...req.body.step3Data, ...data };
    } else if (req.body.step4Data) {
      stepNumber = stepNumber || 4;
      section = section || 'preferences';
      data = { ...req.body.step4Data, ...data };
    } else if (req.body.step1Data) {
      stepNumber = stepNumber || 1;
      section = section || 'basicInfo';
      data = { ...req.body.step1Data, ...data };
    }

    if (data.personalInfo && typeof data.personalInfo === 'object') {
      data = { ...data.personalInfo, ...data };
    }
    if (data.familyDetails && typeof data.familyDetails === 'object') {
      data = { familyBackground: data.familyDetails, ...data };
    }
    if (data.careerDetails && typeof data.careerDetails === 'object') {
      data = { ...data.careerDetails, ...data };
    }

    const registration = await Registration.findOne({
      registrationId: registrationId,
      isDeleted: false,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        code: 'REGISTRATION_NOT_FOUND',
        message: 'No registration session found for the provided Registration ID',
      });
    }

    if (registration.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_COMPLETED',
        message: 'This registration has already been completed.',
      });
    }

    // Check if new email or mobile conflicts with existing active User accounts
    if (data.email || data.mobile) {
      const newEmail = data.email ? String(data.email).toLowerCase().trim() : null;
      const newMobile = data.mobile ? String(data.mobile).replace(/\D/g, '') : null;
      if (newEmail || newMobile) {
        const existingUser = await User.findOne({
          $or: [
            newEmail ? { email: newEmail } : null,
            newMobile ? { mobile: newMobile } : null,
          ].filter(Boolean) as any[],
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            code: 'USER_ALREADY_REGISTERED',
            message: 'An account with this email address or mobile number already exists. Please sign in.',
          });
        }
      }
    }

    // Validate DOB if supplied in step data
    const checkDob = data.dob !== undefined ? data.dob : rawFormData.dob;
    if (checkDob !== undefined) {
      if (!checkDob || (typeof checkDob === 'string' && !checkDob.trim())) {
        if (section === 'basicInfo' || stepNumber === 2) {
          return res.status(400).json({
            success: false,
            message: 'Date of birth is required.',
          });
        }
      } else {
        const dobResult = validateDateOfBirth(checkDob, data.gender || registration.gender);
        if (!dobResult.isValid) {
          return res.status(400).json({
            success: false,
            message: dobResult.error || 'Date of birth year must be exactly 4 digits.',
          });
        }
        if (data.dob !== undefined) data.dob = dobResult.formattedDate;
        if (rawFormData.dob !== undefined) rawFormData.dob = dobResult.formattedDate;
      }
    }

    // Validate Step 2 Required Fields (Personal Info)
    if (section === 'personalInfo' || stepNumber === 3) {
      if (data.maritalStatus !== undefined && !String(data.maritalStatus).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Marital status is required.',
        });
      }
      if (data.religion !== undefined && !String(data.religion).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Religion is required.',
        });
      }
      if (data.city !== undefined && !String(data.city).trim()) {
        return res.status(400).json({
          success: false,
          message: 'City of residence is required.',
        });
      }

      // Validate that city belongs to the selected state if both are provided
      const checkState = data.state || (registration.stepData.personalInfo?.state);
      const checkCity = data.city || (registration.stepData.personalInfo?.city);
      if (checkState && checkCity) {
        const stateName = String(checkState).trim();
        const cityName = String(checkCity).trim();
        const stateDoc = await State.findOne({ name: { $regex: new RegExp(`^${escapeRegex(stateName)}$`, 'i') } });
        if (stateDoc) {
          const cityInState = await City.findOne({
            stateId: stateDoc._id,
            name: { $regex: new RegExp(`^${escapeRegex(cityName)}$`, 'i') },
          });
          const cityInOtherState = await City.findOne({
            name: { $regex: new RegExp(`^${escapeRegex(cityName)}$`, 'i') },
          });
          if (cityInOtherState && !cityInState) {
            return res.status(400).json({
              success: false,
              message: `Selected city "${cityName}" does not belong to the selected state "${stateName}".`,
            });
          }
        }
      }

      // Validate Sibling Details if provided
      const sibs = data.siblings || rawFormData.siblings;
      if (sibs && typeof sibs === 'object') {
        if (Array.isArray(sibs.brothers)) {
          for (const b of sibs.brothers) {
            if (b && b.age !== undefined && b.age !== null && b.age !== '') {
              const a = Number(b.age);
              if (isNaN(a) || a < 0 || a > 100) {
                return res.status(400).json({
                  success: false,
                  message: 'Brother age must be a valid number between 0 and 100.',
                });
              }
            }
          }
        }
        if (Array.isArray(sibs.sisters)) {
          for (const s of sibs.sisters) {
            if (s && s.age !== undefined && s.age !== null && s.age !== '') {
              const a = Number(s.age);
              if (isNaN(a) || a < 0 || a > 100) {
                return res.status(400).json({
                  success: false,
                  message: 'Sister age must be a valid number between 0 and 100.',
                });
              }
            }
          }
        }
        registration.stepData.siblings = sibs;
      }

      // Merge About Me fields
      if (data.aboutMe || data.personalityValues || data.hobbiesInterests || data.careerGoals) {
        registration.stepData.personalInfo = {
          ...(registration.stepData.personalInfo || {}),
          aboutMe: data.aboutMe ?? registration.stepData.personalInfo?.aboutMe,
          personalityValues: data.personalityValues ?? registration.stepData.personalInfo?.personalityValues,
          hobbiesInterests: data.hobbiesInterests ?? registration.stepData.personalInfo?.hobbiesInterests,
          careerGoals: data.careerGoals ?? registration.stepData.personalInfo?.careerGoals,
        };
      }

      // Merge family background details
      const fam = data.familyBackground || data.familyDetails || {};
        const fOcc = fam.fatherOccupation ?? data.fatherOccupation ?? fam.fatherProfession ?? data.fatherProfession ?? registration.stepData.familyDetails?.fatherOccupation;
        const mOcc = fam.motherOccupation ?? data.motherOccupation ?? fam.motherProfession ?? data.motherProfession ?? registration.stepData.familyDetails?.motherOccupation;
        const sibStr = typeof data.siblings === 'string' ? data.siblings : (typeof fam.siblings === 'string' ? fam.siblings : registration.stepData.familyDetails?.siblings);

        registration.stepData.familyDetails = {
          ...(registration.stepData.familyDetails || {}),
          ...fam,
          familyType: fam.familyType ?? data.familyType ?? registration.stepData.familyDetails?.familyType,
          familyStatus: fam.familyStatus ?? data.familyStatus ?? registration.stepData.familyDetails?.familyStatus,
          fatherName: fam.fatherName ?? data.fatherName ?? registration.stepData.familyDetails?.fatherName,
          fatherProfession: fam.fatherProfession ?? data.fatherProfession ?? fOcc ?? registration.stepData.familyDetails?.fatherProfession,
          fatherOccupation: fOcc,
          motherName: fam.motherName ?? data.motherName ?? registration.stepData.familyDetails?.motherName,
          motherProfession: fam.motherProfession ?? data.motherProfession ?? mOcc ?? registration.stepData.familyDetails?.motherProfession,
          motherOccupation: mOcc,
          siblings: sibStr,
          familyLocation: fam.familyLocation ?? data.familyLocation ?? registration.stepData.familyDetails?.familyLocation,
          familyValues: fam.familyValues ?? data.familyValues ?? registration.stepData.familyDetails?.familyValues,
          aboutFamily: fam.aboutFamily ?? data.aboutFamily ?? registration.stepData.familyDetails?.aboutFamily,
        };
    }

    // Validate Step 3 Required Fields (Education & Profession)
    if (section === 'educationProfession' || stepNumber === 4) {
      // Validate Structured Medical Qualifications if supplied
      const medQuals = data.medicalQualifications || rawFormData.medicalQualifications;
      if (medQuals && typeof medQuals === 'object') {
        for (const level of ['undergraduate', 'postgraduate', 'doctorate'] as const) {
          if (Array.isArray(medQuals[level])) {
            for (const entry of medQuals[level]) {
              if (entry && entry.qualification && String(entry.qualification).trim()) {
                const qualCheck = validateMedicalQualification(entry.qualification);
                if (!qualCheck.isValid) {
                  return res.status(400).json({
                    success: false,
                    message: qualCheck.error || `Please select a valid medical/doctor qualification for ${level}.`,
                  });
                }
                if (entry.passingYear) {
                  const yearCheck = validatePassingYear(entry.passingYear);
                  if (!yearCheck.isValid) {
                    return res.status(400).json({
                      success: false,
                      message: yearCheck.error || 'Passing year must be exactly 4 digits and cannot be in the future.',
                    });
                  }
                }
              }
            }
          }
        }
        registration.stepData.medicalQualifications = medQuals;

        // Populate primary degree into legacy educationProfession
        const primaryEntry = medQuals.undergraduate?.[0] || medQuals.postgraduate?.[0] || medQuals.doctorate?.[0];
        if (primaryEntry && primaryEntry.qualification) {
          registration.stepData.educationProfession = {
            ...(registration.stepData.educationProfession || {}),
            education: primaryEntry.qualification,
            degree: primaryEntry.qualification,
            medicalCollege: primaryEntry.college || registration.stepData.educationProfession?.medicalCollege,
          };
        }
      }

      const eduInput = data.education ?? data.degree ?? data.qualification ?? rawFormData.qualification;
      if (eduInput !== undefined) {
        if (!String(eduInput).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Medical qualification is required.',
          });
        }
        const qualResult = validateMedicalQualification(eduInput);
        if (!qualResult.isValid) {
          return res.status(400).json({
            success: false,
            message: qualResult.error || 'Please select a valid medical/doctor qualification.',
          });
        }
      }
      if (data.profession !== undefined && !String(data.profession).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Medical specialization / profession is required.',
        });
      }
    }

    // Validate Medical Qualification if supplied in any other step data
    const checkQual = data.education || data.degree || data.qualification || rawFormData.qualification;
    if (checkQual && section !== 'educationProfession' && stepNumber !== 4) {
      const qualResult = validateMedicalQualification(checkQual);
      if (!qualResult.isValid) {
        return res.status(400).json({
          success: false,
          message: qualResult.error || 'Please select a valid medical/doctor qualification.',
        });
      }
    }

    // Validate Partner Expectations if supplied
    const pExpectations = data.partnerExpectations || rawFormData.partnerExpectations;
    if (pExpectations && typeof pExpectations === 'object') {
      if (pExpectations.ageMin && pExpectations.ageMax && Number(pExpectations.ageMin) > Number(pExpectations.ageMax)) {
        return res.status(400).json({
          success: false,
          message: 'Preferred minimum age cannot exceed maximum age.',
        });
      }
      registration.stepData.partnerExpectations = pExpectations;
      registration.stepData.preferences = {
        ...(registration.stepData.preferences || {}),
        prefAgeMin: pExpectations.ageMin !== undefined ? String(pExpectations.ageMin) : registration.stepData.preferences?.prefAgeMin,
        prefAgeMax: pExpectations.ageMax !== undefined ? String(pExpectations.ageMax) : registration.stepData.preferences?.prefAgeMax,
        prefEducation: pExpectations.qualification || registration.stepData.preferences?.prefEducation,
        prefProfession: pExpectations.specialization || registration.stepData.preferences?.prefProfession,
        prefCity: pExpectations.location?.city || registration.stepData.preferences?.prefCity,
        prefDiet: pExpectations.lifestyle?.diet || registration.stepData.preferences?.prefDiet,
      };
    }

    // Handle photos explicitly in saveStep
    if (data.photos || data.primaryPhoto) {
      const existingPhotos = registration.stepData.photos || {};
      const newPrimary = data.primaryPhoto || (typeof data.photos === 'object' && !Array.isArray(data.photos) ? data.photos.primaryPhoto : undefined) || existingPhotos.primaryPhoto;
      const newPhotoList = Array.isArray(data.photos)
        ? data.photos
        : (data.photos && Array.isArray(data.photos.photos) ? data.photos.photos : (existingPhotos.photos || []));

      registration.stepData.photos = {
        ...existingPhotos,
        primaryPhoto: newPrimary || '',
        photos: newPhotoList,
      };
    }

    // Merge section data into stepData
    if (section && typeof section === 'string') {
      registration.stepData[section] = {
        ...(registration.stepData[section] || {}),
        ...data,
      };
    }

    // Handle individual top-level fields
    if (data.fullName || data.candidateName) {
      registration.candidateName = (data.fullName || data.candidateName).trim();
      registration.stepData.basicInfo = {
        ...registration.stepData.basicInfo,
        fullName: registration.candidateName,
      };
    }
    if (data.email) {
      registration.email = data.email.toLowerCase().trim();
      registration.stepData.basicInfo = {
        ...registration.stepData.basicInfo,
        email: registration.email,
      };
    }
    if (data.mobile) {
      registration.mobile = data.mobile.replace(/\D/g, '');
      registration.stepData.basicInfo = {
        ...registration.stepData.basicInfo,
        mobile: registration.mobile,
      };
    }
    if (data.gender) {
      registration.gender = data.gender;
      registration.stepData.basicInfo = {
        ...registration.stepData.basicInfo,
        gender: data.gender,
      };
    }

    // Handle password if submitted in step 1 update
    if (data.password && typeof data.password === 'string' && data.password.length >= 6) {
      registration.stepData.basicInfo = {
        ...registration.stepData.basicInfo,
        passwordHash: await bcrypt.hash(data.password, 12),
      };
    }

    // Merge raw form data
    registration.stepData.rawFormData = {
      ...(registration.stepData.rawFormData || {}),
      ...rawFormData,
      ...data,
    };

    // Update currentStep if proceeding forward
    if (stepNumber && typeof stepNumber === 'number') {
      registration.currentStep = Math.max(registration.currentStep, stepNumber);
    }

    registration.completionPercentage = calculateCompletionPercentage(registration.stepData);
    registration.lastActiveAt = new Date();
    registration.status = 'IN_PROGRESS';

    await registration.save();

    const sanitized = sanitizeRegistration(registration);

    return res.json({
      success: true,
      message: 'Registration step saved successfully',
      data: {
        registrationId: registration.registrationId,
        currentStep: registration.currentStep,
        totalSteps: registration.totalSteps,
        completionPercentage: registration.completionPercentage,
        status: registration.status,
        stepData: sanitized.stepData,
        candidateName: registration.candidateName,
        email: registration.email,
        mobile: registration.mobile,
        lastActiveAt: registration.lastActiveAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. AUTO SAVE (POST /api/registration/auto-save)
 * Debounced background save for field edits without changing active step number
 */
export async function autoSave(req: Request, res: Response, next: NextFunction) {
  try {
    const { registrationId, section, data = {}, rawFormData = {} } = req.body;

    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'registrationId is required' });
    }

    const registration = await Registration.findOne({
      registrationId: String(registrationId).trim().toUpperCase(),
      isDeleted: false,
    });

    if (!registration || registration.status === 'COMPLETED') {
      return res.status(200).json({ success: false, message: 'Draft not editable' });
    }

    if (data.dob) {
      const dobResult = validateDateOfBirth(data.dob, data.gender || registration.gender);
      if (dobResult.isValid && dobResult.formattedDate) {
        data.dob = dobResult.formattedDate;
      }
    }

    if (section && typeof section === 'string') {
      registration.stepData[section] = {
        ...(registration.stepData[section] || {}),
        ...data,
      };
    }

    if (data.siblings) {
      registration.stepData.siblings = data.siblings;
    }

    if (data.medicalQualifications) {
      registration.stepData.medicalQualifications = data.medicalQualifications;
      const primary = data.medicalQualifications.undergraduate?.[0] || data.medicalQualifications.postgraduate?.[0];
      if (primary && primary.qualification) {
        registration.stepData.educationProfession = {
          ...(registration.stepData.educationProfession || {}),
          education: primary.qualification,
          degree: primary.qualification,
          medicalCollege: primary.college || registration.stepData.educationProfession?.medicalCollege,
        };
      }
    }

    if (data.partnerExpectations) {
      registration.stepData.partnerExpectations = data.partnerExpectations;
    }

    if (data.aboutMe || data.personalityValues || data.hobbiesInterests || data.careerGoals) {
      registration.stepData.personalInfo = {
        ...(registration.stepData.personalInfo || {}),
        aboutMe: data.aboutMe ?? registration.stepData.personalInfo?.aboutMe,
        personalityValues: data.personalityValues ?? registration.stepData.personalInfo?.personalityValues,
        hobbiesInterests: data.hobbiesInterests ?? registration.stepData.personalInfo?.hobbiesInterests,
        careerGoals: data.careerGoals ?? registration.stepData.personalInfo?.careerGoals,
      };
    }

    const fam = data.familyBackground || data.familyDetails || {};
    if (data.familyType || data.fatherOccupation || data.motherOccupation || data.siblings || Object.keys(fam).length > 0) {
      registration.stepData.familyDetails = {
        ...(registration.stepData.familyDetails || {}),
        ...fam,
        familyType: fam.familyType ?? data.familyType ?? registration.stepData.familyDetails?.familyType,
        familyStatus: fam.familyStatus ?? data.familyStatus ?? registration.stepData.familyDetails?.familyStatus,
        fatherName: fam.fatherName ?? data.fatherName ?? registration.stepData.familyDetails?.fatherName,
        fatherProfession: fam.fatherProfession ?? data.fatherProfession ?? fam.fatherOccupation ?? data.fatherOccupation ?? registration.stepData.familyDetails?.fatherProfession,
        motherName: fam.motherName ?? data.motherName ?? registration.stepData.familyDetails?.motherName,
        motherProfession: fam.motherProfession ?? data.motherProfession ?? fam.motherOccupation ?? data.motherOccupation ?? registration.stepData.familyDetails?.motherProfession,
        familyLocation: fam.familyLocation ?? data.familyLocation ?? registration.stepData.familyDetails?.familyLocation,
        familyValues: fam.familyValues ?? data.familyValues ?? registration.stepData.familyDetails?.familyValues,
        aboutFamily: fam.aboutFamily ?? data.aboutFamily ?? registration.stepData.familyDetails?.aboutFamily,
      };
    }

    if (data.fullName) registration.candidateName = data.fullName.trim();
    if (data.email) registration.email = data.email.toLowerCase().trim();
    if (data.mobile) registration.mobile = data.mobile.replace(/\D/g, '');
    if (data.gender) registration.gender = data.gender;

    registration.stepData.rawFormData = {
      ...(registration.stepData.rawFormData || {}),
      ...rawFormData,
      ...data,
    };

    registration.completionPercentage = calculateCompletionPercentage(registration.stepData);
    registration.lastActiveAt = new Date();

    await registration.save();

    return res.json({
      success: true,
      savedAt: registration.lastActiveAt,
      completionPercentage: registration.completionPercentage,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. GET / RESUME REGISTRATION (GET /api/registration/:registrationId)
 * Returns saved draft data to allow resuming from the exact last completed step
 */
export async function getRegistrationById(req: Request, res: Response, next: NextFunction) {
  try {
    const { registrationId } = req.params;

    if (!registrationId || typeof registrationId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid Registration ID' });
    }

    const registration = await Registration.findOne({
      registrationId: registrationId.trim().toUpperCase(),
      isDeleted: false,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Registration record not found for the given ID',
      });
    }

    // Touch lastActiveAt when resuming
    registration.lastActiveAt = new Date();
    await registration.save();

    const sanitized = sanitizeRegistration(registration);

    return res.json({
      success: true,
      data: {
        registrationId: registration.registrationId,
        status: registration.status,
        currentStep: registration.currentStep,
        totalSteps: registration.totalSteps,
        completionPercentage: registration.completionPercentage,
        candidateName: registration.candidateName,
        email: registration.email,
        mobile: registration.mobile,
        gender: registration.gender,
        stepData: sanitized.stepData,
        startedAt: registration.startedAt,
        lastActiveAt: registration.lastActiveAt,
        completedAt: registration.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4.5 VALIDATE REGISTRATION DRAFT (GET /api/registration/:registrationId/validate or POST /api/registration/validate)
 * Runs complete server-side verification across Steps 1-4 and returns a list of missing fields.
 */
export async function validateRegistrationDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRegId = req.params.registrationId || req.body.registrationId;
    if (!rawRegId) {
      return res.status(400).json({ success: false, message: 'registrationId is required' });
    }

    const registration = await Registration.findOne({
      registrationId: String(rawRegId).trim().toUpperCase(),
      isDeleted: false,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Registration session not found',
      });
    }

    const basic = registration.stepData?.basicInfo || {};
    const personal = registration.stepData?.personalInfo || {};
    const edu = registration.stepData?.educationProfession || {};
    const medQuals = registration.stepData?.medicalQualifications || {};
    const raw = registration.stepData?.rawFormData || {};
    const partnerExp = registration.stepData?.partnerExpectations || {};

    const missingFields: Array<{ step: number; field: string; label: string; message: string }> = [];

    // ── Step 1 Validation ──
    const fullName = (basic.fullName || registration.candidateName || raw.fullName || '').trim();
    if (!fullName || fullName.length < 2) {
      missingFields.push({ step: 1, field: 'fullName', label: 'Candidate Full Name', message: 'Candidate Full Name is required (minimum 2 characters).' });
    }

    const email = (basic.email || registration.email || raw.email || '').toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      missingFields.push({ step: 1, field: 'email', label: 'Email Address', message: 'A valid email address is required.' });
    }

    const mobile = (basic.mobile || registration.mobile || raw.mobile || '').replace(/\D/g, '');
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      missingFields.push({ step: 1, field: 'mobile', label: 'Mobile Number', message: 'A valid 10-digit Indian mobile number is required.' });
    }

    const dob = basic.dob || raw.dob;
    if (!dob || (typeof dob === 'string' && !dob.trim())) {
      missingFields.push({ step: 1, field: 'dob', label: 'Date of Birth', message: 'Date of birth is required.' });
    } else {
      const dobResult = validateDateOfBirth(dob, basic.gender || registration.gender);
      if (!dobResult.isValid) {
        missingFields.push({ step: 1, field: 'dob', label: 'Date of Birth', message: dobResult.error || 'Date of birth year must be exactly 4 digits.' });
      }
    }

    const termsAccepted = Boolean(basic.agreeTerms || raw.agreeTerms);
    if (!termsAccepted) {
      missingFields.push({ step: 1, field: 'agreeTerms', label: 'Terms & Conditions', message: 'Agreement to Terms of Service & Privacy Policy is required.' });
    }

    // ── Step 2 Validation ──
    const maritalStatus = (personal.maritalStatus || raw.maritalStatus || '').trim();
    if (!maritalStatus) {
      missingFields.push({ step: 2, field: 'maritalStatus', label: 'Marital Status', message: 'Candidate marital status is required.' });
    }

    const religion = (personal.religion || raw.religion || '').trim();
    if (!religion) {
      missingFields.push({ step: 2, field: 'religion', label: 'Religion', message: 'Religion is required.' });
    }

    const city = (personal.city || raw.city || '').trim();
    if (!city) {
      missingFields.push({ step: 2, field: 'city', label: 'City of Residence', message: 'City of residence is required.' });
    }

    // ── Step 3 Validation ──
    const primaryQual = (
      medQuals.undergraduate?.[0]?.qualification ||
      edu.education ||
      edu.degree ||
      raw.qualification ||
      ''
    ).trim();
    if (!primaryQual) {
      missingFields.push({ step: 3, field: 'qualification', label: 'Medical Qualification', message: 'Undergraduate medical qualification (e.g. MBBS) is required.' });
    } else {
      const qualCheck = validateMedicalQualification(primaryQual);
      if (!qualCheck.isValid) {
        missingFields.push({ step: 3, field: 'qualification', label: 'Medical Qualification', message: qualCheck.error || 'Invalid medical qualification.' });
      }
    }

    const profession = (edu.profession || raw.profession || '').trim();
    if (!profession) {
      missingFields.push({ step: 3, field: 'profession', label: 'Medical Specialization', message: 'Medical specialization / practice is required.' });
    }

    // ── Step 4 Validation ──
    if (partnerExp.ageMin && partnerExp.ageMax && Number(partnerExp.ageMin) > Number(partnerExp.ageMax)) {
      missingFields.push({ step: 4, field: 'prefAge', label: 'Partner Age Range', message: 'Preferred minimum age cannot exceed maximum age.' });
    }

    return res.json({
      success: true,
      isValid: missingFields.length === 0,
      missingFields,
      completionPercentage: registration.completionPercentage,
      registrationId: registration.registrationId,
      status: registration.status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. COMPLETE REGISTRATION (POST /api/registration/complete)
 * Validates required information, creates permanent User and Profile records,
 * marks registration as COMPLETED, and logs the user in.
 */
export async function completeRegistration(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRegId = req.params.registrationId || req.body.registrationId;
    const { finalData = {} } = req.body;

    if (!rawRegId) {
      return res.status(400).json({ success: false, message: 'registrationId is required' });
    }

    const registrationId = String(rawRegId).trim().toUpperCase();

    const registration = await Registration.findOne({
      registrationId: String(registrationId).trim().toUpperCase(),
      isDeleted: false,
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Registration session not found',
      });
    }

    if (registration.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_COMPLETED',
        message: 'This registration has already been finalized.',
      });
    }

    // Merge any final payload
    if (finalData && typeof finalData === 'object') {
      registration.stepData.preferences = {
        ...(registration.stepData.preferences || {}),
        ...(finalData.preferences || {}),
      };
      registration.stepData.photos = {
        ...(registration.stepData.photos || {}),
        ...(finalData.photos || {}),
      };
      if (finalData.primaryPhoto) {
        registration.stepData.photos = {
          ...registration.stepData.photos,
          primaryPhoto: finalData.primaryPhoto,
        };
      }
    }

    const basic = registration.stepData.basicInfo || {};
    const personal = registration.stepData.personalInfo || {};
    const edu = registration.stepData.educationProfession || {};
    const pref = registration.stepData.preferences || {};
    const photos = registration.stepData.photos || {};

    const raw = registration.stepData.rawFormData || {};

    const candidateFullName = (
      basic.fullName ||
      registration.candidateName ||
      raw.fullName ||
      ''
    ).trim();
    const candidateEmail = (basic.email || registration.email || raw.email || '').toLowerCase().trim();
    const candidateMobile = (basic.mobile || registration.mobile || raw.mobile || '').replace(/\D/g, '');
    const candidateGender = basic.gender || personal.gender || registration.gender || raw.gender || 'Female';

    if (!candidateFullName || candidateFullName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full Name is required to complete registration',
      });
    }

    if (!candidateEmail || !candidateEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required to complete registration',
      });
    }

    if (!candidateMobile || candidateMobile.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit mobile number is required to complete registration',
      });
    }

    // Check duplicate user in User collection
    const existingUser = await User.findOne({
      $or: [{ email: candidateEmail }, { mobile: candidateMobile }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        code: 'USER_EXISTS',
        message: 'This email address or mobile number is already registered in active accounts. Please sign in.',
      });
    }

    // Determine password hash (from basicInfo or finalData or fallback default)
    let passwordHash = basic.passwordHash;
    if (!passwordHash && finalData.password) {
      passwordHash = await bcrypt.hash(finalData.password, 12);
    }
    if (!passwordHash && raw.password) {
      passwordHash = await bcrypt.hash(raw.password, 12);
    }
    if (!passwordHash) {
      // Fallback secure random password if not explicitly set
      passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex') + 'A1!', 12);
    }

    // Validate Final DOB
    const finalDob = basic.dob || raw.dob || finalData.dob;
    if (!finalDob || (typeof finalDob === 'string' && !finalDob.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required to complete registration.',
      });
    }

    const dobResult = validateDateOfBirth(finalDob, candidateGender);
    if (!dobResult.isValid) {
      return res.status(400).json({
        success: false,
        message: dobResult.error || 'Date of birth year must be exactly 4 digits.',
      });
    }
    const validDobDate = dobResult.parsedDate || new Date(dobResult.formattedDate!);

    // Validate Final Medical Qualification
    const finalQual = (edu.education || edu.degree || raw.qualification || finalData.qualification || '').trim();
    if (!finalQual) {
      return res.status(400).json({
        success: false,
        message: 'Medical qualification is required to complete registration.',
      });
    }
    const qualResult = validateMedicalQualification(finalQual);
    if (!qualResult.isValid) {
      return res.status(400).json({
        success: false,
        message: qualResult.error || 'Please select a valid medical/doctor qualification.',
      });
    }

    // Validate Step 2 Required Fields
    const finalMaritalStatus = (personal.maritalStatus || raw.maritalStatus || '').trim();
    if (!finalMaritalStatus) {
      return res.status(400).json({
        success: false,
        message: 'Marital status is required to complete registration.',
      });
    }

    const finalReligion = (personal.religion || raw.religion || '').trim();
    if (!finalReligion) {
      return res.status(400).json({
        success: false,
        message: 'Religion is required to complete registration.',
      });
    }

    const finalCity = (personal.city || raw.city || '').trim();
    if (!finalCity) {
      return res.status(400).json({
        success: false,
        message: 'City of residence is required to complete registration.',
      });
    }

    // Validate Step 3 Profession
    const finalProfession = (edu.profession || raw.profession || finalData.profession || '').trim();
    if (!finalProfession) {
      return res.status(400).json({
        success: false,
        message: 'Medical specialization / profession is required to complete registration.',
      });
    }

    // Validate Terms Acceptance
    const hasAgreedTerms = Boolean(
      basic.agreeTerms ||
      raw.agreeTerms ||
      finalData.agreeTerms ||
      finalData.termsAccepted
    );
    if (!hasAgreedTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the Terms of Service and Privacy Policy to complete registration.',
      });
    }

    // 1. Create User
    const newUser = await User.create({
      fullName: candidateFullName,
      email: candidateEmail,
      mobile: candidateMobile,
      password: passwordHash,
      role: 'user',
      isActive: true,
      verified: false,
      verificationStatus: 'UNVERIFIED',
      termsAccepted: true,
      termsVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: new Date(),
    });

    // 2. Create Profile
    const primaryPhotoUrl =
      photos.primaryPhoto ||
      finalData.primaryPhoto ||
      raw.primaryPhoto ||
      raw.photoUrl ||
      '';

    const photoList: string[] = [];
    if (primaryPhotoUrl) photoList.push(primaryPhotoUrl);
    if (Array.isArray(photos.photos)) {
      for (const p of photos.photos) {
        if (p && !photoList.includes(p)) photoList.push(p);
      }
    }

    const family = registration.stepData?.familyDetails || {};
    const siblingsData = registration.stepData?.siblings || {};
    const medQuals = registration.stepData?.medicalQualifications || {};
    const partnerExp = registration.stepData?.partnerExpectations || {};

    const newProfile = await Profile.create({
      user: newUser._id,
      displayName: candidateFullName,
      gender: candidateGender === 'Male' ? 'Male' : 'Female',
      dob: validDobDate,
      height: personal.height || `5' 7"`,
      maritalStatus: finalMaritalStatus,
      motherTongue: personal.motherTongue || '',
      religion: finalReligion,
      caste: personal.caste || '',
      subCaste: personal.subCaste || '',
      education: finalQual,
      degree: edu.degree || finalQual,
      profession: finalProfession,
      company: edu.company || raw.company || '',
      workLocation: edu.workLocation || finalCity || 'India',
      annualIncome: edu.annualIncome || '',
      medicalRegistrationNumber: edu.medicalRegistrationNumber || raw.medicalRegistrationNumber || '',
      medicalCollege: edu.medicalCollege || raw.medicalCollege || '',
      medicalExperience: edu.medicalExperience || raw.medicalExperience || raw.experience || '',
      familyType: family.familyType || personal.familyType || raw.familyType || '',
      fatherOccupation: family.fatherProfession || family.fatherOccupation || raw.fatherOccupation || '',
      motherOccupation: family.motherProfession || family.motherOccupation || raw.motherOccupation || '',
      siblings:
        typeof family.siblings === 'string'
          ? family.siblings
          : typeof raw.siblings === 'string'
          ? raw.siblings
          : `${siblingsData.brothers?.length || 0} Brother(s), ${siblingsData.sisters?.length || 0} Sister(s)`,
      foodPreference: personal.foodPreference || pref.prefDiet || raw.prefDiet || '',
      aboutMe:
        personal.aboutMe ||
        raw.aboutMe ||
        personal.about ||
        `Accomplished ${finalProfession}. Looking for a compatible and family-oriented life partner.`,
      personalityValues: personal.personalityValues || raw.personalityValues || '',
      hobbiesInterests: personal.hobbiesInterests || raw.hobbiesInterests || '',
      careerGoals: personal.careerGoals || raw.careerGoals || '',
      familyBackground: {
        familyType: family.familyType || personal.familyType || raw.familyType || '',
        familyStatus: family.familyStatus || raw.familyStatus || '',
        fatherName: family.fatherName || raw.fatherName || '',
        fatherProfession: family.fatherProfession || family.fatherOccupation || raw.fatherOccupation || '',
        motherName: family.motherName || raw.motherName || '',
        motherProfession: family.motherProfession || family.motherOccupation || raw.motherOccupation || '',
        familyLocation: family.familyLocation || raw.familyLocation || '',
        familyValues: family.familyValues || raw.familyValues || '',
        aboutFamily: family.aboutFamily || raw.aboutFamily || '',
      },
      siblingsDetails: {
        brothersCount: Number(siblingsData.brothersCount || (Array.isArray(siblingsData.brothers) ? siblingsData.brothers.length : 0)),
        sistersCount: Number(siblingsData.sistersCount || (Array.isArray(siblingsData.sisters) ? siblingsData.sisters.length : 0)),
        brothers: siblingsData.brothers || [],
        sisters: siblingsData.sisters || [],
      },
      medicalQualifications: {
        undergraduate: (medQuals.undergraduate && medQuals.undergraduate.length > 0)
          ? medQuals.undergraduate
          : [{ qualification: finalQual, college: edu.medicalCollege || raw.medicalCollege || 'Medical College', status: 'Completed' }],
        postgraduate: medQuals.postgraduate || [],
        doctorate: medQuals.doctorate || [],
      },
      partnerExpectations: {
        ageMin: Number(partnerExp.ageMin || pref.prefAgeMin || raw.prefAgeMin) || undefined,
        ageMax: Number(partnerExp.ageMax || pref.prefAgeMax || raw.prefAgeMax) || undefined,
        heightMin: partnerExp.heightMin || undefined,
        heightMax: partnerExp.heightMax || undefined,
        qualification: partnerExp.qualification || pref.prefEducation || raw.prefEducation || undefined,
        specialization: partnerExp.specialization || pref.prefProfession || raw.prefProfession || undefined,
        location: partnerExp.location || { city: pref.prefCity || raw.prefCity || undefined },
        willingToRelocate: partnerExp.willingToRelocate,
        maritalStatus: partnerExp.maritalStatus || undefined,
        lifestyle: partnerExp.lifestyle || { diet: pref.prefDiet || raw.prefDiet || undefined },
        familyExpectations: partnerExp.familyExpectations || undefined,
        additionalExpectations: partnerExp.additionalExpectations || undefined,
      },
      partnerPreferences: {
        preferredAgeMin: Number(partnerExp.ageMin || pref.prefAgeMin || raw.prefAgeMin) || undefined,
        preferredAgeMax: Number(partnerExp.ageMax || pref.prefAgeMax || raw.prefAgeMax) || undefined,
        preferredLocation: partnerExp.location?.city || pref.prefCity || raw.prefCity || undefined,
        preferredQualification: partnerExp.qualification || pref.prefEducation || raw.prefEducation || undefined,
        preferredSpecialization: partnerExp.specialization || pref.prefProfession || raw.prefProfession || undefined,
      },
      country: personal.country || 'India',
      state: personal.state || '',
      city: finalCity,
      currentLocation: personal.currentLocation || {
        countryId: personal.countryId,
        stateId: personal.stateId,
        districtId: personal.districtId,
        cityId: personal.cityId,
        pincode: personal.pinCode || personal.pincode,
        formattedAddress: [finalCity, personal.state, 'India'].filter(Boolean).join(', '),
      },
      primaryPhoto: primaryPhotoUrl,
      photos: photoList,
      about:
        personal.aboutMe ||
        personal.about ||
        `Accomplished ${finalProfession}. Looking for a compatible and family-oriented life partner.`,
      verificationStatus: 'UNVERIFIED',
      lastActiveAt: new Date(),
    });

    // 3. Mark Registration as COMPLETED
    registration.status = 'COMPLETED';
    registration.completedAt = new Date();
    registration.lastActiveAt = new Date();
    registration.currentStep = registration.totalSteps;
    registration.completionPercentage = 100;
    registration.user = newUser._id;
    registration.profile = newProfile._id;
    await registration.save();

    // Attribute referral attribution if referral code was provided
    const referralCode =
      req.body.referralCode ||
      raw.referralCode ||
      basic.referralCode ||
      (req.cookies && req.cookies.wj_referral_code);

    if (referralCode) {
      try {
        const { attributeReferralOnRegistration } = await import('../services/referralService');
        await attributeReferralOnRegistration({
          referredUserId: String(newUser._id),
          referralCode: String(referralCode).trim().toUpperCase(),
          req,
        });
      } catch (refErr) {
        console.warn('Referral attribution notice:', refErr);
      }
    }

    // 4. Generate Auth JWT Token for immediate login
    const secret = process.env.JWT_SECRET ?? 'supersecret_wonderfuljodi_dev_key_2026';
    const accessToken = jwt.sign(
      { userId: newUser._id.toString(), role: newUser.role },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration completed successfully! Welcome to Wonderful Jodi.',
      token: accessToken,
      data: {
        token: accessToken,
        user: {
          id: newUser._id,
          _id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          mobile: newUser.mobile,
          role: newUser.role,
        },
        profile: {
          id: newProfile._id,
          _id: newProfile._id,
          displayName: newProfile.displayName,
          gender: newProfile.gender,
          education: newProfile.education,
          profession: newProfile.profession,
          city: newProfile.city,
          primaryPhoto: newProfile.primaryPhoto,
          medicalRegistrationNumber: newProfile.medicalRegistrationNumber,
          medicalCollege: newProfile.medicalCollege,
          medicalExperience: newProfile.medicalExperience,
          familyType: newProfile.familyType,
          fatherOccupation: newProfile.fatherOccupation,
          motherOccupation: newProfile.motherOccupation,
          siblings: newProfile.siblings,
          aboutMe: newProfile.aboutMe,
          personalityValues: newProfile.personalityValues,
          hobbiesInterests: newProfile.hobbiesInterests,
          careerGoals: newProfile.careerGoals,
          familyBackground: newProfile.familyBackground,
          siblingsDetails: newProfile.siblingsDetails,
          medicalQualifications: newProfile.medicalQualifications,
          partnerExpectations: newProfile.partnerExpectations,
          partnerPreferences: newProfile.partnerPreferences,
        },
        registrationId: registration.registrationId,
        status: 'COMPLETED',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. CHECK AVAILABILITY (GET /api/registration/check-availability)
 * Allows real-time checking if email or mobile is already taken
 */
export async function checkAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, mobile } = req.query;
    const normalizedEmail = email ? String(email).toLowerCase().trim() : '';
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : '';

    if (!normalizedEmail && !cleanMobile) {
      return res.json({ available: true });
    }

    const existing = await User.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        cleanMobile ? { mobile: cleanMobile } : null,
      ].filter(Boolean) as any[],
    });

    return res.json({
      success: true,
      available: !existing,
      message: existing
        ? 'This email or mobile number is already registered in active accounts.'
        : 'Available for registration',
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN MONITORING & INCOMPLETE REGISTRATION CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 7. GET INCOMPLETE COUNT (GET /api/admin/registrations/incomplete/count)
 * Fast count of candidates who started registration but have not completed it
 */
export async function getIncompleteRegistrationsCount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const count = await Registration.countDocuments({
      status: { $in: ['STARTED', 'IN_PROGRESS'] },
      isDeleted: false,
    });

    return res.json({
      success: true,
      count,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. GET ADMIN REGISTRATION STATS (GET /api/admin/registrations/stats)
 * Detailed breakdown for admin dashboard widgets
 */
export async function getAdminRegistrationStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const [
      totalRegistrations,
      incompleteCount,
      startedCount,
      inProgressCount,
      completedCount,
      abandonedCount,
      step1Count,
      step2Count,
      step3Count,
      step4Count,
      recentRegistrations,
    ] = await Promise.all([
      Registration.countDocuments({ isDeleted: false }),
      Registration.countDocuments({ status: { $in: ['STARTED', 'IN_PROGRESS'] }, isDeleted: false }),
      Registration.countDocuments({ status: 'STARTED', isDeleted: false }),
      Registration.countDocuments({ status: 'IN_PROGRESS', isDeleted: false }),
      Registration.countDocuments({ status: 'COMPLETED', isDeleted: false }),
      Registration.countDocuments({ status: 'ABANDONED', isDeleted: false }),
      Registration.countDocuments({
        currentStep: 1,
        status: { $in: ['STARTED', 'IN_PROGRESS'] },
        isDeleted: false,
      }),
      Registration.countDocuments({
        currentStep: 2,
        status: { $in: ['STARTED', 'IN_PROGRESS'] },
        isDeleted: false,
      }),
      Registration.countDocuments({
        currentStep: 3,
        status: { $in: ['STARTED', 'IN_PROGRESS'] },
        isDeleted: false,
      }),
      Registration.countDocuments({
        currentStep: { $gte: 4 },
        status: { $in: ['STARTED', 'IN_PROGRESS'] },
        isDeleted: false,
      }),
      Registration.find({ isDeleted: false })
        .sort({ lastActiveAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const completionRate =
      totalRegistrations > 0
        ? Math.round((completedCount / totalRegistrations) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        totalRegistrations,
        incompleteCount,
        startedCount,
        inProgressCount,
        completedCount,
        abandonedCount,
        completionRate,
        stepBreakdown: {
          step1: step1Count,
          step2: step2Count,
          step3: step3Count,
          step4: step4Count,
        },
        recentRegistrations: recentRegistrations.map((r) => sanitizeRegistration(r)),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 9. GET ADMIN REGISTRATIONS TABLE (GET /api/admin/registrations)
 * Paginated, filtered, searchable list of registration candidates
 */
export async function getAdminRegistrations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      search,
      status = 'IN_PROGRESS', // Default to incomplete candidates unless explicitly asked for ALL
      step,
      minCompletion,
      maxCompletion,
      sortBy = 'lastActiveAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const query: any = { isDeleted: false };

    // Status filter
    if (status && status !== 'ALL') {
      if (status === 'INCOMPLETE' || status === 'IN_PROGRESS') {
        query.status = { $in: ['STARTED', 'IN_PROGRESS'] };
      } else {
        query.status = String(status).toUpperCase();
      }
    }

    // Step filter
    if (step && step !== 'ALL') {
      query.currentStep = Number(step);
    }

    // Completion percentage range filter
    if (minCompletion !== undefined || maxCompletion !== undefined) {
      query.completionPercentage = {};
      if (minCompletion !== undefined) {
        query.completionPercentage.$gte = Number(minCompletion);
      }
      if (maxCompletion !== undefined) {
        query.completionPercentage.$lte = Number(maxCompletion);
      }
    }

    // Search filter (Registration ID, Candidate Name, Email, Mobile)
    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = search.trim();
      const safeSearch = escapeRegex(searchStr);
      const searchRegex = new RegExp(safeSearch, 'i');

      query.$or = [
        { registrationId: searchRegex },
        { candidateName: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
      ];
    }

    // Pagination
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const pageNumber = Math.max(1, Number(page) || 1);
    const skip = (pageNumber - 1) * pageSize;

    // Sorting
    const sortField = ['lastActiveAt', 'startedAt', 'createdAt', 'completionPercentage', 'currentStep', 'candidateName'].includes(
      String(sortBy)
    )
      ? String(sortBy)
      : 'lastActiveAt';
    const sortDir = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sortOptions: any = { [sortField]: sortDir };

    const [total, registrations, incompleteTotal] = await Promise.all([
      Registration.countDocuments(query),
      Registration.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .populate('user', 'fullName email mobile role isActive')
        .populate('profile', 'displayName primaryPhoto')
        .lean(),
      Registration.countDocuments({ status: { $in: ['STARTED', 'IN_PROGRESS'] }, isDeleted: false }),
    ]);

    const sanitizedList = registrations.map((r) => sanitizeRegistration(r));

    return res.json({
      success: true,
      data: {
        registrations: sanitizedList,
        total,
        incompleteTotal,
        page: pageNumber,
        pages: Math.ceil(total / pageSize) || 1,
        limit: pageSize,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 10. GET ADMIN REGISTRATION BY ID (GET /api/admin/registrations/:id)
 * Detailed candidate view with section completion status
 */
export async function getAdminRegistrationById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const isMongoId = isValidObjectId(id);
    const registration = await Registration.findOne({
      $or: [
        isMongoId ? { _id: id } : null,
        { registrationId: id.trim().toUpperCase() },
      ].filter(Boolean) as any[],
      isDeleted: false,
    })
      .populate('user', 'fullName email mobile role isActive verificationStatus')
      .populate('profile', 'displayName primaryPhoto photos city profession');

    if (!registration) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Registration record not found',
      });
    }

    const sanitized = sanitizeRegistration(registration);

    // Compute field section statuses (Completed vs Not Started)
    const basic = sanitized.stepData?.basicInfo || {};
    const personal = sanitized.stepData?.personalInfo || {};
    const edu = sanitized.stepData?.educationProfession || {};
    const family = sanitized.stepData?.familyDetails || {};
    const pref = sanitized.stepData?.preferences || {};
    const photos = sanitized.stepData?.photos || {};

    const sectionStatus = {
      basicInfo: {
        title: 'Basic Information & Account',
        completed: Boolean(basic.fullName && (basic.email || basic.mobile)),
        step: 1,
        fields: {
          fullName: basic.fullName || sanitized.candidateName || null,
          email: basic.email || sanitized.email || null,
          mobile: basic.mobile || sanitized.mobile || null,
          gender: basic.gender || sanitized.gender || null,
          dob: basic.dob || null,
          termsAccepted: Boolean(basic.agreeTerms),
        },
      },
      personalInfo: {
        title: 'Personal & Cultural Details',
        completed: Boolean(personal.maritalStatus || personal.religion || personal.city),
        step: 2,
        fields: {
          maritalStatus: personal.maritalStatus || null,
          motherTongue: personal.motherTongue || null,
          religion: personal.religion || null,
          caste: personal.caste || null,
          subCaste: personal.subCaste || null,
          height: personal.height || null,
          city: personal.city || null,
          state: personal.state || null,
          country: personal.country || null,
          foodPreference: personal.foodPreference || null,
          about: personal.about || null,
        },
      },
      educationProfession: {
        title: 'Education & Career',
        completed: Boolean(edu.profession || edu.education || edu.degree),
        step: 3,
        fields: {
          education: edu.education || null,
          degree: edu.degree || null,
          profession: edu.profession || null,
          company: edu.company || null,
          workLocation: edu.workLocation || null,
          annualIncome: edu.annualIncome || null,
        },
      },
      familyDetails: {
        title: 'Family Details',
        completed: Boolean(family.fatherOccupation || family.familyType || family.siblings),
        step: 3,
        fields: {
          fatherOccupation: family.fatherOccupation || null,
          motherOccupation: family.motherOccupation || null,
          siblings: family.siblings || null,
          familyType: family.familyType || null,
        },
      },
      preferences: {
        title: 'Partner Preferences',
        completed: Boolean(pref.lookingFor || pref.prefAgeMin || pref.prefDiet),
        step: 4,
        fields: {
          lookingFor: pref.lookingFor || null,
          prefAgeMin: pref.prefAgeMin || null,
          prefAgeMax: pref.prefAgeMax || null,
          prefCity: pref.prefCity || null,
          prefDiet: pref.prefDiet || null,
        },
      },
      photos: {
        title: 'Profile Photos & Verification',
        completed: Boolean(photos.primaryPhoto || (photos.photos && photos.photos.length > 0)),
        step: 4,
        fields: {
          primaryPhoto: photos.primaryPhoto || null,
          photos: photos.photos || [],
          idProofUrl: photos.idProofUrl || null,
        },
      },
    };

    return res.json({
      success: true,
      data: {
        registration: sanitized,
        sectionStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}
