import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { KundaliReport } from '../models/KundaliReport';
import { isValidObjectId } from '../utils/securityUtils';
import { resolveBirthLocation, searchCities } from '../data/citiesCoordinates';
import {
  computePlanetaryBirthDetails,
  calculate36GunaMilan,
  RASHIS,
  NAKSHATRAS,
} from '../services/astrologyEngine';

/**
 * Helper to check if authenticated user has active Premium subscription
 */
async function checkIsPremiumUser(userId: string, role?: string): Promise<boolean> {
  if (role === 'admin') return true;
  const sub = await Subscription.findOne({
    user: userId,
    status: 'ACTIVE',
    $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
  });
  return Boolean(
    sub && ['PREMIUM', 'PREMIUM_VIP', 'GOLD', 'PLATINUM', 'DIAMOND', 'VVIP'].includes(sub.plan)
  );
}

/**
 * Generate a deterministic match key based on birth details
 */
function generateBirthDataVersion(
  u1: { dob: string | Date; time?: string; place?: string },
  u2: { dob: string | Date; time?: string; place?: string }
): string {
  const d1 = new Date(u1.dob).toISOString().split('T')[0];
  const t1 = (u1.time || '').trim().toLowerCase();
  const p1 = (u1.place || '').trim().toLowerCase();

  const d2 = new Date(u2.dob).toISOString().split('T')[0];
  const t2 = (u2.time || '').trim().toLowerCase();
  const p2 = (u2.place || '').trim().toLowerCase();

  const raw = `${d1}|${t1}|${p1}:::${d2}|${t2}|${p2}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24);
}

/**
 * GET /api/kundali/my-birth-details
 * Fetch current user's profile birth details and resolved coordinates
 */
export async function getMyBirthDetails(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Matrimonial profile not found' });
    }

    const placeString = profile.horoscope?.placeOfBirth || `${profile.city || 'Pune'}, ${profile.state || 'Maharashtra'}, India`;
    const resolvedPlace = profile.horoscope?.birthPlaceDetails?.latitude
      ? {
          city: profile.horoscope.birthPlaceDetails.city || profile.city || 'Pune',
          state: profile.horoscope.birthPlaceDetails.state || profile.state || 'Maharashtra',
          country: profile.horoscope.birthPlaceDetails.country || 'India',
          latitude: profile.horoscope.birthPlaceDetails.latitude,
          longitude: profile.horoscope.birthPlaceDetails.longitude,
          timezone: profile.horoscope.birthPlaceDetails.timezone || 5.5,
        }
      : resolveBirthLocation(placeString);

    let planetary: any = null;
    if (profile.dob) {
      try {
        planetary = computePlanetaryBirthDetails(
          profile.dob,
          profile.horoscope?.timeOfBirth,
          resolvedPlace.latitude,
          resolvedPlace.longitude,
          resolvedPlace.timezone
        );
      } catch {
        // Fallback gracefully
      }
    }

    res.json({
      success: true,
      data: {
        displayName: profile.displayName,
        gender: profile.gender,
        dob: profile.dob,
        timeOfBirth: profile.horoscope?.timeOfBirth || '',
        placeOfBirth: profile.horoscope?.placeOfBirth || `${resolvedPlace.city}, ${resolvedPlace.state}, ${resolvedPlace.country}`,
        resolvedLocation: resolvedPlace,
        rashi: profile.horoscope?.rashi || planetary?.rashiName || 'Mesh (Aries)',
        nakshatra: profile.horoscope?.nakshatra || planetary?.nakshatraName || 'Ashwini',
        pada: profile.horoscope?.pada || planetary?.pada || 1,
        manglik: profile.horoscope?.manglik || planetary?.manglikStatus || 'Non-Manglik',
        lagna: profile.horoscope?.lagna || planetary?.lagnaName || '',
        isComplete: Boolean(profile.dob && profile.horoscope?.timeOfBirth && profile.horoscope?.placeOfBirth),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/kundali/my-birth-details
 * Update user's birth details and resolved coordinates directly in database
 */
export async function updateMyBirthDetails(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { dob, timeOfBirth, placeOfBirth, rashi, nakshatra, manglik, gotra } = req.body;

    if (!dob) {
      return res.status(400).json({ success: false, message: 'Date of birth is required.' });
    }

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const resolvedLocation = resolveBirthLocation(placeOfBirth || profile.city || 'Pune, Maharashtra, India');

    // Calculate actual planetary details
    const parsedDob = new Date(dob);
    if (isNaN(parsedDob.getTime())) {
      return res.status(400).json({ success: false, message: 'Valid Date of birth is required.' });
    }

    const planetary = computePlanetaryBirthDetails(
      parsedDob,
      timeOfBirth,
      resolvedLocation.latitude,
      resolvedLocation.longitude,
      resolvedLocation.timezone
    );

    profile.dob = parsedDob;
    profile.horoscope = {
      ...(profile.horoscope || {}),
      timeOfBirth: timeOfBirth?.trim() || '',
      placeOfBirth: placeOfBirth?.trim() || `${resolvedLocation.city}, ${resolvedLocation.state}`,
      rashi: rashi || planetary.rashiName,
      nakshatra: nakshatra || planetary.nakshatraName,
      pada: planetary.pada,
      lagna: planetary.lagnaName || profile.horoscope?.lagna || '',
      manglik: manglik || planetary.manglikStatus,
      gotra: gotra || profile.horoscope?.gotra || '',
      birthPlaceDetails: {
        city: resolvedLocation.city,
        state: resolvedLocation.state,
        country: resolvedLocation.country,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        timezone: resolvedLocation.timezone,
      },
    };

    await profile.save();

    res.json({
      success: true,
      message: 'Birth and horoscope details saved successfully.',
      data: {
        dob: profile.dob,
        horoscope: profile.horoscope,
        planetary,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/kundali/locations?q=Pune
 * Autocomplete geographic locations
 */
export async function getLocations(req: AuthRequest, res: Response) {
  const query = (req.query.q as string) || '';
  const results = searchCities(query);
  res.json({ success: true, data: results });
}

/**
 * POST /api/kundali/calculate
 * Calculate 36 Guna Milan, Ashta-Koota breakdown, and Manglik compatibility
 */
export async function calculateKundali(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userProfile = await Profile.findOne({ user: userId });
    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'Your profile could not be found' });
    }

    const {
      partnerProfileId,
      partnerBirthDetails,
      partner2Data,
      user1BirthOverride,
      partner1Data,
    } = req.body;

    const effectiveP2 = partnerBirthDetails || partner2Data;
    const effectiveU1Override = user1BirthOverride || partner1Data;

    // 1. Resolve User 1 (Primary User) Birth Details
    const u1DobRaw = effectiveU1Override?.dob || effectiveU1Override?.dateOfBirth || userProfile.dob;
    const u1Dob = u1DobRaw ? new Date(u1DobRaw) : null;
    if (!u1Dob || isNaN(u1Dob.getTime())) {
      return res.status(400).json({ success: false, message: 'Date of birth is required.' });
    }

    const u1Time = effectiveU1Override?.timeOfBirth ?? effectiveU1Override?.birthTime ?? userProfile.horoscope?.timeOfBirth;
    const u1Place = effectiveU1Override?.placeOfBirth ?? effectiveU1Override?.birthPlace ?? userProfile.horoscope?.placeOfBirth ?? `${userProfile.city || 'Pune'}, ${userProfile.state || 'Maharashtra'}`;
    const u1ResolvedLoc = resolveBirthLocation(u1Place);

    const u1Planetary = computePlanetaryBirthDetails(
      u1Dob,
      u1Time,
      u1ResolvedLoc.latitude,
      u1ResolvedLoc.longitude,
      u1ResolvedLoc.timezone
    );

    // 2. Resolve Partner 2 Birth Details
    let partnerProfile: any = null;
    let u2Name = 'Partner';
    let u2Gender = userProfile.gender === 'Male' ? 'Female' : 'Male';
    let u2Dob: Date | null = null;
    let u2Time = '';
    let u2Place = '';
    let partnerUserId: any = null;

    if (partnerProfileId) {
      if (!isValidObjectId(partnerProfileId)) {
        return res.status(400).json({ success: false, message: 'Invalid partner profile ID' });
      }

      partnerProfile = await Profile.findById(partnerProfileId).populate('user', 'fullName verificationStatus');
      if (!partnerProfile) {
        return res.status(404).json({ success: false, message: 'Partner profile not found' });
      }

      partnerUserId = partnerProfile.user?._id || partnerProfile.user;
      u2Name = partnerProfile.displayName || partnerProfile.user?.fullName || 'Partner Doctor';
      u2Gender = partnerProfile.gender;
      u2Dob = partnerProfile.dob;
      u2Time = partnerProfile.horoscope?.timeOfBirth || '';
      u2Place = partnerProfile.horoscope?.placeOfBirth || `${partnerProfile.city || 'Mumbai'}, ${partnerProfile.state || 'Maharashtra'}`;
    } else if (effectiveP2) {
      u2Name = effectiveP2.name?.trim() || 'Prospective Partner';
      u2Gender = effectiveP2.gender || (userProfile.gender === 'Male' ? 'Female' : 'Male');
      const p2DobRaw = effectiveP2.dob || effectiveP2.dateOfBirth;
      u2Dob = p2DobRaw ? new Date(p2DobRaw) : null;
      u2Time = effectiveP2.timeOfBirth || effectiveP2.birthTime || '';
      u2Place = effectiveP2.placeOfBirth || effectiveP2.birthPlace || 'Mumbai, Maharashtra, India';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide partner profile ID or partner birth details.',
      });
    }

    if (!u2Dob || isNaN(u2Dob.getTime())) {
      return res.status(400).json({ success: false, message: 'Partner Date of birth is required.' });
    }

    const u2ResolvedLoc = resolveBirthLocation(u2Place);
    const u2Planetary = computePlanetaryBirthDetails(
      u2Dob,
      u2Time,
      u2ResolvedLoc.latitude,
      u2ResolvedLoc.longitude,
      u2ResolvedLoc.timezone
    );

    // 3. Map Groom and Bride based on Gender
    // In traditional Vedic matching, calculations count from Bride to Groom & Groom to Bride
    const isUser1Groom = userProfile.gender === 'Male';
    const groomRashiIndex = isUser1Groom ? u1Planetary.rashiIndex : u2Planetary.rashiIndex;
    const groomNakIndex = isUser1Groom ? u1Planetary.nakshatraIndex : u2Planetary.nakshatraIndex;
    const brideRashiIndex = isUser1Groom ? u2Planetary.rashiIndex : u1Planetary.rashiIndex;
    const brideNakIndex = isUser1Groom ? u2Planetary.nakshatraIndex : u1Planetary.nakshatraIndex;

    // 4. Deterministic Caching: Check if report was already computed
    const birthDataVersion = generateBirthDataVersion(
      { dob: u1Dob, time: u1Time, place: u1Place },
      { dob: u2Dob, time: u2Time, place: u2Place }
    );

    let existingReport = await KundaliReport.findOne({
      user1: userId,
      birthDataVersion,
    });

    const isPremium = await checkIsPremiumUser(userId, req.user?.role);

    let report: any;
    if (existingReport) {
      report = existingReport;
    } else {
      // 5. Execute 36 Guna Milan calculation
      const ashtaKoota = calculate36GunaMilan(
        groomRashiIndex,
        groomNakIndex,
        brideRashiIndex,
        brideNakIndex
      );

      // 6. Detailed Manglik Analysis
      let manglikAnalysis = '';
      if (u1Planetary.manglikStatus === 'Unable to determine' || u2Planetary.manglikStatus === 'Unable to determine') {
        manglikAnalysis = 'Accurate Manglik analysis requires a reliable birth time for both partners.';
      } else if (u1Planetary.manglikStatus === 'Non-Manglik' && u2Planetary.manglikStatus === 'Non-Manglik') {
        manglikAnalysis = 'Excellent: Both partners are Non-Manglik, ensuring natural astrological harmony.';
      } else if (u1Planetary.manglikStatus === 'Manglik' && u2Planetary.manglikStatus === 'Manglik') {
        manglikAnalysis = 'Auspicious: Both partners are Manglik, which naturally balances and cancels Mangal Dosha.';
      } else if (u1Planetary.manglikStatus === 'Partial / Mild' || u2Planetary.manglikStatus === 'Partial / Mild') {
        manglikAnalysis = 'Mild / Anshik Manglik influence noted. Standard traditional remedial practices foster complete peace.';
      } else {
        manglikAnalysis = 'One partner is Manglik while the other is Non-Manglik. Astrological consultation is recommended for remedial alignment.';
      }

      report = await KundaliReport.create({
        user1: userId,
        user2: partnerUserId || undefined,
        partner1ProfileId: userProfile._id,
        partner2ProfileId: partnerProfile?._id || undefined,
        user1BirthDetails: {
          name: userProfile.displayName,
          gender: userProfile.gender,
          dob: u1Dob,
          timeOfBirth: u1Time,
          placeOfBirth: u1Place,
          city: u1ResolvedLoc.city,
          state: u1ResolvedLoc.state,
          country: u1ResolvedLoc.country,
          latitude: u1ResolvedLoc.latitude,
          longitude: u1ResolvedLoc.longitude,
          timezone: u1ResolvedLoc.timezone,
          rashiIndex: u1Planetary.rashiIndex,
          rashiName: u1Planetary.rashiName,
          nakshatraIndex: u1Planetary.nakshatraIndex,
          nakshatraName: u1Planetary.nakshatraName,
          pada: u1Planetary.pada,
          lagnaName: u1Planetary.lagnaName,
          manglikStatus: u1Planetary.manglikStatus,
        },
        user2BirthDetails: {
          name: u2Name,
          gender: u2Gender,
          dob: u2Dob,
          timeOfBirth: u2Time,
          placeOfBirth: u2Place,
          city: u2ResolvedLoc.city,
          state: u2ResolvedLoc.state,
          country: u2ResolvedLoc.country,
          latitude: u2ResolvedLoc.latitude,
          longitude: u2ResolvedLoc.longitude,
          timezone: u2ResolvedLoc.timezone,
          rashiIndex: u2Planetary.rashiIndex,
          rashiName: u2Planetary.rashiName,
          nakshatraIndex: u2Planetary.nakshatraIndex,
          nakshatraName: u2Planetary.nakshatraName,
          pada: u2Planetary.pada,
          lagnaName: u2Planetary.lagnaName,
          manglikStatus: u2Planetary.manglikStatus,
        },
        birthDataVersion,
        gunaScore: ashtaKoota.totalScore,
        varnaScore: ashtaKoota.varna.obtained,
        vashyaScore: ashtaKoota.vashya.obtained,
        taraScore: ashtaKoota.tara.obtained,
        yoniScore: ashtaKoota.yoni.obtained,
        grahaMaitriScore: ashtaKoota.grahaMaitri.obtained,
        ganaScore: ashtaKoota.gana.obtained,
        bhakootScore: ashtaKoota.bhakoot.obtained,
        nadiScore: ashtaKoota.nadi.obtained,
        manglikStatusUser1: u1Planetary.manglikStatus,
        manglikStatusUser2: u2Planetary.manglikStatus,
        manglikAnalysis,
        compatibilityIndicator: ashtaKoota.compatibilityIndicator,
        summary: ashtaKoota.summary,
        doshas: ashtaKoota.doshas,
        ashtakootaDetails: ashtaKoota,
        isCached: false,
      });
    }

    // 7. Assemble Doctor Matrimony Compatibility Context
    const doctorCompatibility = {
      isDoctorMatch: Boolean(
        userProfile.education?.includes('MBBS') ||
        userProfile.degree?.includes('MD') ||
        userProfile.degree?.includes('MS') ||
        partnerProfile?.education?.includes('MBBS') ||
        partnerProfile?.degree?.includes('MD') ||
        partnerProfile?.degree?.includes('MS')
      ),
      user1Degree: userProfile.degree || userProfile.education,
      user1Specialization: userProfile.currentRole || userProfile.profession,
      user2Degree: partnerProfile?.degree || partnerProfile?.education || 'Medical Professional',
      user2Specialization: partnerProfile?.currentRole || partnerProfile?.profession || 'Specialist',
      locationDistanceNote: `${userProfile.city || 'Pune'} ↔ ${partnerProfile?.city || u2ResolvedLoc.city || 'Mumbai'}`,
      partnerVerificationStatus: partnerProfile?.verificationStatus || 'VERIFIED',
      partnerProfileId: partnerProfile?._id || null,
    };

    // 8. Enforce Free vs Premium Payload
    res.json({
      success: true,
      data: {
        reportId: report._id,
        isPremium,
        gunaScore: report.gunaScore,
        maxScore: 36,
        compatibilityIndicator: report.compatibilityIndicator,
        summary: report.summary,
        partner1: {
          name: report.user1BirthDetails.name,
          rashi: report.user1BirthDetails.rashiName,
          nakshatra: report.user1BirthDetails.nakshatraName,
          pada: report.user1BirthDetails.pada,
          manglikStatus: report.manglikStatusUser1,
        },
        partner2: {
          name: report.user2BirthDetails.name,
          rashi: report.user2BirthDetails.rashiName,
          nakshatra: report.user2BirthDetails.nakshatraName,
          pada: report.user2BirthDetails.pada,
          manglikStatus: report.manglikStatusUser2,
        },
        manglikAnalysis: report.manglikAnalysis,
        // Detailed Ashta-Koota points: Available for all preview, descriptions unlocked for premium
        ashtakootaScores: {
          varna: { obtained: report.varnaScore, max: 1 },
          vashya: { obtained: report.vashyaScore, max: 2 },
          tara: { obtained: report.taraScore, max: 3 },
          yoni: { obtained: report.yoniScore, max: 4 },
          grahaMaitri: { obtained: report.grahaMaitriScore, max: 5 },
          gana: { obtained: report.ganaScore, max: 6 },
          bhakoot: { obtained: report.bhakootScore, max: 7 },
          nadi: { obtained: report.nadiScore, max: 8 },
        },
        ashtakootaDetails: isPremium ? report.ashtakootaDetails : null,
        doshas: report.doshas,
        doctorCompatibility,
        culturalDisclaimer:
          'Kundali matching is a traditional astrological practice and is provided for informational and cultural purposes. It should not be treated as a guarantee or sole basis for marriage decisions.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/kundali/report/:id
 * Retrieve previously generated report by ID
 */
export async function getKundaliReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const report = await KundaliReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Security check: Only participants or admin can view the report
    const isAuthorized =
      report.user1.toString() === userId ||
      report.user2?.toString() === userId ||
      req.user?.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot view this report' });
    }

    const isPremium = await checkIsPremiumUser(userId!, req.user?.role);

    res.json({
      success: true,
      data: {
        report,
        isPremium,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/kundali/history
 * List user's calculated Kundali reports
 */
export async function getKundaliHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const reports = await KundaliReport.find({ user1: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('gunaScore compatibilityIndicator user1BirthDetails.name user2BirthDetails.name createdAt');

    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/kundali/match
 * 100% Free Public Kundali Match & 36 Guna Milan
 * Accessible to guests, non-registered users, and logged-in members without auth barrier
 */
export async function matchPublicKundali(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { person1, person2 } = req.body;

    if (!person1 || !person2) {
      return res.status(400).json({
        success: false,
        message: 'Both Person 1 and Person 2 birth details are required for Kundali match.',
      });
    }

    if (!person1.dateOfBirth && !person1.dob) {
      return res.status(400).json({ success: false, message: 'Person 1 Date of Birth is required.' });
    }

    if (!person2.dateOfBirth && !person2.dob) {
      return res.status(400).json({ success: false, message: 'Person 2 Date of Birth is required.' });
    }

    const { computeKundaliMatch } = await import('../services/kundaliService');

    // Normalization helper
    const normalizePerson = (p: any, defaultName: string, defaultGender: string) => ({
      name: (p.name || defaultName).trim(),
      gender: p.gender || defaultGender,
      dateOfBirth: p.dateOfBirth || p.dob,
      timeOfBirth: p.timeOfBirth || p.time || '12:00 PM',
      birthPlace: typeof p.birthPlace === 'object' && p.birthPlace !== null
        ? p.birthPlace
        : {
            name: typeof p.birthPlace === 'string' ? p.birthPlace : (p.placeOfBirth || 'Pune, Maharashtra, India'),
            latitude: 18.5204,
            longitude: 73.8567,
            timezone: 'Asia/Kolkata',
          },
    });

    const p1 = normalizePerson(person1, 'Person 1', 'Male');
    const p2 = normalizePerson(person2, 'Person 2', 'Female');

    const result = computeKundaliMatch(p1, p2);

    return res.json({
      success: true,
      message: 'Kundali compatibility calculation completed successfully.',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to calculate Kundali match. Please verify birth details.',
    });
  }
}

/**
 * POST /api/kundali/save
 * Explicitly save Kundali Match report for authenticated members
 */
export async function saveKundaliMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in to save this Kundali match.' });
    }

    const { reportData } = req.body;
    if (!reportData || !reportData.ashtakoota) {
      return res.status(400).json({ success: false, message: 'Valid Kundali report data is required.' });
    }

    const birthDataVersion = crypto
      .createHash('sha256')
      .update(`${reportData.person1?.name}|${reportData.person1?.dateOfBirth}:::${reportData.person2?.name}|${reportData.person2?.dateOfBirth}`)
      .digest('hex')
      .substring(0, 24);

    const newReport = await KundaliReport.create({
      user1: userId,
      user1BirthDetails: {
        name: reportData.person1?.name || 'Person 1',
        gender: reportData.person1?.gender,
        dob: new Date(reportData.person1?.dateOfBirth),
        timeOfBirth: reportData.person1?.timeOfBirth,
        placeOfBirth: reportData.person1?.birthPlace?.name,
        rashiName: reportData.person1?.rashi,
        nakshatraName: reportData.person1?.nakshatra,
        pada: reportData.person1?.pada,
        manglikStatus: reportData.person1?.manglikStatus,
      },
      user2BirthDetails: {
        name: reportData.person2?.name || 'Person 2',
        gender: reportData.person2?.gender,
        dob: new Date(reportData.person2?.dateOfBirth),
        timeOfBirth: reportData.person2?.timeOfBirth,
        placeOfBirth: reportData.person2?.birthPlace?.name,
        rashiName: reportData.person2?.rashi,
        nakshatraName: reportData.person2?.nakshatra,
        pada: reportData.person2?.pada,
        manglikStatus: reportData.person2?.manglikStatus,
      },
      birthDataVersion,
      gunaScore: reportData.gunaScore,
      varnaScore: reportData.ashtakoota?.varna?.obtained || 0,
      vashyaScore: reportData.ashtakoota?.vashya?.obtained || 0,
      taraScore: reportData.ashtakoota?.tara?.obtained || 0,
      yoniScore: reportData.ashtakoota?.yoni?.obtained || 0,
      grahaMaitriScore: reportData.ashtakoota?.grahaMaitri?.obtained || 0,
      ganaScore: reportData.ashtakoota?.gana?.obtained || 0,
      bhakootScore: reportData.ashtakoota?.bhakoot?.obtained || 0,
      nadiScore: reportData.ashtakoota?.nadi?.obtained || 0,
      manglikStatusUser1: reportData.person1?.manglikStatus,
      manglikStatusUser2: reportData.person2?.manglikStatus,
      manglikAnalysis: reportData.manglik?.compatibilityNote || '',
      compatibilityIndicator: reportData.compatibilityBand || 'Good Compatibility',
      summary: reportData.summary || '',
      ashtakootaDetails: reportData.ashtakoota,
      dimensions: reportData.dimensions,
    });

    return res.json({
      success: true,
      message: 'Kundali match saved successfully to your profile.',
      reportId: newReport._id,
    });
  } catch (error) {
    next(error);
  }
}

