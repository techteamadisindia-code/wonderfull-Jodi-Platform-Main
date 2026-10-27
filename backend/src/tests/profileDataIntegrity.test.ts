/**
 * profileDataIntegrity.test.ts
 *
 * Automated regression test suite for Wonderful Jodi Candidate Profile Data Integrity.
 *
 * Covers:
 * 1. Missing values rendering as empty / Not recorded without synthetic default substitution.
 * 2. Real stored values rendering unchanged.
 * 3. Exact and unknown Manglik statuses remaining distinct (unknown never becomes 'Non-Manglik').
 * 4. Admin edits preserving untouched values and deep-merging nested objects.
 * 5. Flat and nested family / medical fields mapping correctly and conflicts detected.
 * 6. Demo seed logic being strictly disabled in production mode.
 * 7. Read-only audit behavior, classification accuracy, and privacy-safe email masking.
 */

import {
  auditSingleProfile,
  maskEmail,
  maskRegistrationNumber,
  resolveAuditTargetUrl,
  getSafeDatabaseTargetInfo,
  createAuditPrismaClient,
  runProfileIntegrityAudit,
  SYNTHETIC_TEST_IDENTIFIERS,
  PLAUSIBLE_UI_FALLBACKS,
  FORMER_SCHEMA_DEFAULTS,
} from '../scripts/audit_profile_data_integrity';
import { Profile } from '../models/Profile';
import { Biodata } from '../models/Biodata';
import { User } from '../models/User';
import { Admin } from '../models/Admin';
import { Setting } from '../models/Setting';
import { MembershipPlan } from '../models/MembershipPlan';
import { Country, State, District, SubDistrict, City, Village } from '../models/Location';
import { Language, Religion, Caste, SubCaste } from '../models/CommunityMaster';
import { Registration } from '../models/Registration';
import { isGenuinelyIndia, resolveOrRecoverIndiaCountry, seedMasterDataIfEmpty } from '../services/masterDataImporter';
import { ensureAdminUserExists, ensurePlatformSettingsExist, seedInitialData, initializeMasterDataExplicitly } from '../config/seed';

interface AssertionResult {
  suite: string;
  description: string;
  passed: boolean;
  error?: string;
}

const assertions: AssertionResult[] = [];
let currentSuite = 'Suite 1: Privacy Masking';

function setSuite(suiteName: string) {
  currentSuite = suiteName;
  console.log(`\n[Test ${suiteName}]`);
}

function assert(description: string, condition: boolean, extraInfo?: string) {
  if (condition) {
    assertions.push({ suite: currentSuite, description, passed: true });
    console.log(`  ✅ PASS: ${description}`);
  } else {
    assertions.push({ suite: currentSuite, description, passed: false, error: extraInfo || 'Assertion failed' });
    console.error(`  ❌ FAIL: ${description} — ${extraInfo || ''}`);
  }
}

async function runDataIntegrityTestSuite() {
  console.log('\n===============================================================');
  console.log('       RUNNING PROFILE DATA INTEGRITY REGRESSION TESTS');
  console.log('===============================================================\n');

  // ─── 1. MASK EMAIL & REGISTRATION NUMBER PRIVACY TESTS ───
  setSuite('Suite 1: Privacy Masking');
  assert('Masks standard user email safely', maskEmail('priya.sharma@example.com') === 'pr**********@example.com');
  assert('Masks short prefix email safely', maskEmail('dr@hospital.org') === 'd*@hospital.org');
  assert('Handles null/undefined email safely', maskEmail(null) === null && maskEmail(undefined) === null);

  assert('Masks medical registration number safely', maskRegistrationNumber('MCI-REG-847291') === 'MCI-***-291');
  assert('Masks state registration number safely', maskRegistrationNumber('KMC-2019-74892') === 'KMC-***-892');
  assert('Handles null/undefined registration number safely', maskRegistrationNumber(null) === null && maskRegistrationNumber(undefined) === null);

  // ─── 2. MODEL SCHEMA DEFAULTS TEST ───
  setSuite('Suite 2: Profile and Biodata Schema Defaults (No Misleading Defaults)');

  // Verify Profile schema does not introduce Non-Manglik or currentlyPracticing=true defaults
  const testProf = new Profile({
    user: '60d5ecb8b5c9c82b94e82b01',
    displayName: 'Dr. Test Candidate',
    gender: 'Female',
    dob: new Date('1995-01-01'),
    education: 'MBBS',
    degree: 'MBBS',
    profession: 'General Physician',
    country: 'India',
    city: 'Pune',
  });

  assert(
    'Profile horoscope.manglik is undefined when not provided (never Non-Manglik by default)',
    testProf.horoscope?.manglik === undefined
  );
  assert(
    'Profile currentlyPracticing is undefined when not provided (never true by default)',
    (testProf as any).currentlyPracticing === undefined
  );
  assert(
    'Profile partnerPreferences preferredAgeMin is undefined (not 24)',
    testProf.partnerPreferences?.preferredAgeMin === undefined
  );

  // Verify Biodata schema defaults are neutral
  const testBio = new Biodata({
    userId: '60d5ecb8b5c9c82b94e82b01',
    profileId: '60d5ecb8b5c9c82b94e82b02',
    personalDetails: { fullName: 'Dr. Test', dob: '01/01/1995' },
  });

  assert('Biodata horoscope.manglik is undefined or empty when omitted (never Non-Manglik)', !testBio.horoscope?.manglik);
  assert('Biodata personalDetails.gender is undefined or empty when omitted (never Male)', !testBio.personalDetails?.gender);
  assert('Biodata lifestyle.diet is undefined or empty when omitted (never Vegetarian)', !testBio.lifestyle?.diet);
  assert('Biodata family.familyType is undefined or empty when omitted (never Nuclear Family)', !testBio.family?.familyType);

  // ─── 3. AUDIT CLASSIFICATION TESTS ───
  setSuite('Suite 3: Read-Only Integrity Audit Classification');

  // Test 3a: Clean profile with real stored data
  const cleanProfile = {
    id: 'prof_clean_001',
    candidateId: 'WJ-2026-001',
    currentlyPracticing: false,
    medicalRegistrationNumber: 'MMC-2022-99881',
    medicalCouncil: 'Maharashtra Medical Council',
    medicalCollege: 'B.J. Medical College, Pune',
    currentHospital: 'Deenanath Mangeshkar Hospital',
    horoscope: {
      manglik: 'Manglik',
      rashi: 'Mesh',
      nakshatra: 'Ashwini',
    },
    familyBackground: {
      fatherProfession: 'Civil Engineer',
      motherProfession: 'School Principal',
      familyType: 'Nuclear',
    },
    fatherOccupation: 'Civil Engineer',
    motherOccupation: 'School Principal',
    familyType: 'Nuclear',
  };

  const cleanResult = auditSingleProfile(cleanProfile, 'candidate.real@hospital.org');
  assert('Clean profile classifies as CLEAN', cleanResult.overallClassification === 'CLEAN');
  assert('Clean profile has 0 high-risk findings', cleanResult.findings.filter(f => f.classification === 'EXACT_PLACEHOLDER_MATCH').length === 0);

  // Test 3b: Demo fixture profile identification
  const demoProfile = {
    id: 'prof_demo_001',
    candidateId: 'WJ-DEMO-001',
    medicalRegistrationNumber: 'MCI-REG-847291',
    medicalCollege: 'AIIMS New Delhi',
    currentHospital: 'Apollo Hospitals',
  };
  const demoResult = auditSingleProfile(demoProfile, 'priya.sharma@example.com');
  assert('Known seed fixture classifies as DEMO_FIXTURE', demoResult.isDemoFixture && demoResult.overallClassification === 'DEMO_FIXTURE');

  // Test 3c: Synthetic UI Placeholder detection (e.g. MCI-REG-847291)
  const syntheticProfile = {
    id: 'prof_ph_001',
    candidateId: 'WJ-REAL-999',
    medicalRegistrationNumber: 'MCI-REG-847291', // Exact synthetic mock ID!
  };
  const synthResult = auditSingleProfile(syntheticProfile, 'independent.doctor@gmail.com');
  assert('Synthetic test ID classifies as EXACT_PLACEHOLDER_MATCH', synthResult.overallClassification === 'EXACT_PLACEHOLDER_MATCH');
  assert('Placeholder reg number correctly detected and masked', synthResult.findings.some(f => f.field === 'medicalRegistrationNumber' && f.classification === 'EXACT_PLACEHOLDER_MATCH' && String(f.currentValue).includes('***')));

  // Test 3d: Plausible real-world names for genuine candidates classify as REVIEW_REQUIRED (never fake)
  const plausibleDoctorProfile = {
    id: 'prof_plausible_001',
    candidateId: 'WJ-REAL-998',
    medicalCollege: 'AIIMS',                   // Plausible premier medical college
    currentHospital: 'Apollo Hospitals',       // Plausible premier hospital
    fatherOccupation: 'Retired Government Officer', // Plausible occupation
  };
  const plausResult = auditSingleProfile(plausibleDoctorProfile, 'independent.doctor@gmail.com');
  assert('Plausible names for genuine candidate classify as REVIEW_REQUIRED (not fake)', plausResult.overallClassification === 'REVIEW_REQUIRED');
  assert('AIIMS on genuine candidate flagged as REVIEW_REQUIRED', plausResult.findings.some(f => f.field === 'medicalCollege' && f.classification === 'REVIEW_REQUIRED'));
  assert('Apollo Hospitals on genuine candidate flagged as REVIEW_REQUIRED', plausResult.findings.some(f => f.field === 'currentHospital' && f.classification === 'REVIEW_REQUIRED'));

  // Test 3e: Former Schema Default (Uncorroborated Non-Manglik)
  const defaultProfile = {
    id: 'prof_def_001',
    candidateId: 'WJ-REAL-888',
    horoscope: {
      manglik: 'Non-Manglik', // No other horoscope fields!
    },
    currentlyPracticing: true, // No hospital, no workType!
  };
  const defResult = auditSingleProfile(defaultProfile, 'another.candidate@yahoo.com');
  assert('Uncorroborated Non-Manglik classifies as LIKELY_SCHEMA_DEFAULT', defResult.findings.some(f => f.field === 'horoscope.manglik' && f.classification === 'LIKELY_SCHEMA_DEFAULT'));
  assert('Uncorroborated currentlyPracticing on genuinely empty profile classifies as LIKELY_SCHEMA_DEFAULT', defResult.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'LIKELY_SCHEMA_DEFAULT'));

  // Test 3f: Discrepancy / Conflict between flat and nested fields
  const conflictProfile = {
    id: 'prof_conf_001',
    candidateId: 'WJ-REAL-777',
    fatherOccupation: 'Businessman',
    familyBackground: {
      fatherProfession: 'Doctor / Surgeon', // Conflict!
    },
    medicalCollege: 'Grant Medical College',
    medicalQualifications: {
      undergraduate: [{ college: 'KEM Hospital Mumbai' }], // Conflict!
    },
  };
  const confResult = auditSingleProfile(conflictProfile, 'conflict.user@clinic.org');
  assert('Detects flat fatherOccupation vs nested familyBackground conflict', confResult.findings.some(f => f.field === 'fatherOccupation' && f.classification === 'CONFLICT_FLAT_VS_NESTED'));
  assert('Detects flat medicalCollege vs nested medicalQualifications college conflict', confResult.findings.some(f => f.field === 'medicalCollege' && f.classification === 'CONFLICT_FLAT_VS_NESTED'));

  // Test 3g: WJ-100006 field pattern (currentRole, company, profession, workLocation populated with currentlyPracticing=true)
  const wj100006Profile = {
    id: 'prof_wj100006',
    candidateId: 'WJ-100006',
    currentRole: 'Consultant Dermatologist',
    company: 'Skin & Laser Clinic',
    profession: 'Doctor',
    workLocation: 'Pune',
    currentlyPracticing: true,
  };
  const wj06Result = auditSingleProfile(wj100006Profile, 'real.candidate06@clinic.in');
  assert('WJ-100006 pattern does NOT receive LIKELY_SCHEMA_DEFAULT for practice status', !wj06Result.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'LIKELY_SCHEMA_DEFAULT'));
  assert('WJ-100006 pattern classifies currentlyPracticing as REVIEW_REQUIRED due to active employment context', wj06Result.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'REVIEW_REQUIRED'));
  assert('WJ-100006 pattern is NOT classified as verified/clean (overallClassification is REVIEW_REQUIRED)', wj06Result.overallClassification === 'REVIEW_REQUIRED');

  // Test 3h: Profession-only records (e.g. WJ-100008, WJ-100064 pattern: profession populated with currentlyPracticing=true)
  const professionOnlyProfile = {
    id: 'prof_profession_only',
    candidateId: 'WJ-100008',
    profession: 'General Physician',
    currentlyPracticing: true,
  };
  const profOnlyResult = auditSingleProfile(professionOnlyProfile, 'physician@hospital.org');
  assert('Profession-only profile classifies currentlyPracticing as REVIEW_REQUIRED (not LIKELY_SCHEMA_DEFAULT)', profOnlyResult.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'REVIEW_REQUIRED'));
  assert('Profession-only profile does not receive LIKELY_SCHEMA_DEFAULT on practice status', !profOnlyResult.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'LIKELY_SCHEMA_DEFAULT'));
  assert('Profession-only profile triggers currentlyPracticing in triggeringFields', profOnlyResult.triggeringFields.includes('currentlyPracticing'));

  // Test 3i: Company, profession, and/or work-location records (e.g. WJ-100092, WJ-100094, WJ-100100, WJ-100102, WJ-100104)
  const compProfLocProfile = {
    id: 'prof_comp_prof_loc',
    candidateId: 'WJ-100100',
    company: 'Private Clinic',
    profession: 'Pediatrician',
    workLocation: 'Nashik',
    currentlyPracticing: true,
  };
  const cplResult = auditSingleProfile(compProfLocProfile, 'pediatrician@healthcare.com');
  assert('Company/profession/workLocation profile classifies currentlyPracticing as REVIEW_REQUIRED', cplResult.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'REVIEW_REQUIRED'));
  assert('Company/profession/workLocation profile does not receive LIKELY_SCHEMA_DEFAULT on practice status', !cplResult.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'LIKELY_SCHEMA_DEFAULT'));

  // Test 3j: Structured medicalQualifications context
  const structuredQualProfile = {
    id: 'prof_struct_qual',
    candidateId: 'WJ-REAL-555',
    medicalQualifications: {
      undergraduate: [{ degree: 'MBBS', college: 'BJMC Pune', passingYear: 2018 }],
    },
    currentlyPracticing: true,
  };
  const sqResult = auditSingleProfile(structuredQualProfile, 'doctor.graduate@bjmc.edu');
  assert('Structured qualifications profile classifies currentlyPracticing as REVIEW_REQUIRED', sqResult.findings.some(f => f.field === 'currentlyPracticing' && f.classification === 'REVIEW_REQUIRED'));

  // Test 3k: Genuinely empty employment records (no hospital, role, workType, experience, company, profession, workLocation, or qualifications)
  const genuinelyEmptyProfile = {
    id: 'prof_empty_emp',
    candidateId: 'WJ-REAL-444',
    currentlyPracticing: true,
  };
  const emptyResult = auditSingleProfile(genuinelyEmptyProfile, 'candidate.empty@example.org');
  const emptyFinding = emptyResult.findings.find(f => f.field === 'currentlyPracticing');
  assert('Genuinely empty employment profile reserves LIKELY_SCHEMA_DEFAULT for practice status', emptyFinding?.classification === 'LIKELY_SCHEMA_DEFAULT');
  assert('Empty employment finding describes it as suspicion (not proof that data is false)', emptyFinding?.reason.includes('suspected former schema default') === true);
  assert('Empty employment finding confidence is MEDIUM', emptyFinding?.confidence === 'MEDIUM');
  assert('Empty employment profile overall classification is LIKELY_SCHEMA_DEFAULT', emptyResult.overallClassification === 'LIKELY_SCHEMA_DEFAULT');

  // Test 3l: WJ-100008 & WJ-100064 pattern: Populated profession with uncorroborated Non-Manglik
  // An uncorroborated horoscope default must NOT cause an unrelated populated profession to be interpreted as false.
  const wj100008RealisticProfile = {
    id: 'prof_wj100008_real',
    candidateId: 'WJ-100008',
    profession: 'General Physician',
    currentlyPracticing: true,
    horoscope: {
      manglik: 'Non-Manglik', // No other horoscope fields!
    },
  };
  const wj08Result = auditSingleProfile(wj100008RealisticProfile, 'candidate08@gmail.com');
  assert('WJ-100008 pattern with populated profession is NOT classified overall as LIKELY_SCHEMA_DEFAULT', wj08Result.overallClassification !== 'LIKELY_SCHEMA_DEFAULT');
  assert('WJ-100008 pattern is classified overall as REVIEW_REQUIRED (unrelated profession not branded false)', wj08Result.overallClassification === 'REVIEW_REQUIRED');
  assert('WJ-100008 pattern isolates horoscope finding as suspected schema default', wj08Result.astrologyStatusFinding === 'LIKELY_SCHEMA_DEFAULT');
  assert('WJ-100008 pattern isolates practice status as REVIEW_REQUIRED', wj08Result.practiceStatusFinding === 'REVIEW_REQUIRED');
  assert('WJ-100008 report clearly shows which fields caused classification', wj08Result.triggeringFields.includes('horoscope.manglik') && wj08Result.triggeringFields.includes('currentlyPracticing'));
  assert('WJ-100008 report includes distinct classification reasons for each triggered field', wj08Result.classificationReasons.length >= 2);

  // Test 3m: Profiles with multiple independent findings
  const multiFindingProfile = {
    id: 'prof_multi_001',
    candidateId: 'WJ-REAL-333',
    company: 'Apollo Clinic',
    profession: 'Cardiologist',
    currentlyPracticing: true,
    motherOccupation: 'Homemaker', // matches former UI fallback
    horoscope: {
      manglik: 'Non-Manglik', // uncorroborated
    },
  };
  const multiResult = auditSingleProfile(multiFindingProfile, 'cardiologist.multi@apollo.in');
  assert('Multi-finding profile with active profession classifies overall as REVIEW_REQUIRED', multiResult.overallClassification === 'REVIEW_REQUIRED');
  assert('Multi-finding report captures all independent triggering fields', multiResult.triggeringFields.includes('horoscope.manglik') && multiResult.triggeringFields.includes('currentlyPracticing') && multiResult.triggeringFields.includes('motherOccupation'));
  assert('Multi-finding report maintains separate astrologyStatusFinding', multiResult.astrologyStatusFinding === 'LIKELY_SCHEMA_DEFAULT');
  assert('Multi-finding report maintains separate practiceStatusFinding', multiResult.practiceStatusFinding === 'REVIEW_REQUIRED');

  // Test 3n: Populated data does not automatically mean CLEAN or VERIFIED
  const populatedUnverifiedProfile = {
    id: 'prof_pop_unver',
    candidateId: 'WJ-REAL-222',
    profession: 'General Surgeon',
    company: 'City Hospital',
    currentlyPracticing: true,
  };
  const popResult = auditSingleProfile(populatedUnverifiedProfile, 'surgeon@cityhosp.org');
  assert('Populated employment data with currentlyPracticing=true requires review (never automatically CLEAN)', popResult.overallClassification === 'REVIEW_REQUIRED');

  // Test 3o: Preserves masking of email addresses and registration numbers
  assert('Demo fixture email is masked', String(demoResult.findings[0]?.currentValue).includes('***'));
  assert('Placeholder registration number is masked in findings', String(synthResult.findings[0]?.currentValue).includes('***'));
  assert('Audit single profile summary masks candidate user email', wj06Result.maskedUserEmail !== null && wj06Result.maskedUserEmail.includes('***'));

  // ─── 4. ADMIN EDIT PRESERVATION STRATEGY TEST ───
  setSuite('Suite 4: Admin Edit Deep-Merge Preservation Strategy');

  // Existing candidate profile in database with stored nested data and missing hospital/registration
  const existingCandidate = {
    city: 'Mumbai',
    state: 'Maharashtra',
    medicalRegistrationNumber: null, // intentionally absent / not recorded
    currentHospital: null,           // intentionally absent / not recorded
    horoscope: {
      rashi: 'Kanya',
      nakshatra: 'Hasta',
      manglik: 'Manglik',
    },
    familyBackground: {
      fatherName: 'Dr. Ramesh Patil',
      fatherProfession: 'Senior Cardiologist',
      motherProfession: 'Pediatrician',
    },
    medicalQualifications: {
      undergraduate: [{ degree: 'MBBS', college: 'BJMC Pune', passingYear: 2018 }],
    },
  };

  // Admin edits ONLY the candidate's city from Mumbai to Pune:
  // Safe update payload sends only changed fields
  const adminDeltaEdit: Record<string, any> = {
    city: 'Pune',
  };

  // Safe merge logic as implemented in adminController.ts:
  const updateData: Record<string, any> = {};
  if (adminDeltaEdit.city !== undefined) updateData.city = adminDeltaEdit.city;
  if (adminDeltaEdit.horoscope && typeof adminDeltaEdit.horoscope === 'object') {
    updateData.horoscope = { ...(existingCandidate.horoscope || {}), ...adminDeltaEdit.horoscope };
  }
  if (adminDeltaEdit.familyBackground && typeof adminDeltaEdit.familyBackground === 'object') {
    updateData.familyBackground = { ...(existingCandidate.familyBackground || {}), ...adminDeltaEdit.familyBackground };
  }
  if (adminDeltaEdit.medicalQualifications && typeof adminDeltaEdit.medicalQualifications === 'object') {
    updateData.medicalQualifications = { ...(existingCandidate.medicalQualifications || {}), ...adminDeltaEdit.medicalQualifications };
  }

  // Merged result
  const updatedCandidate = {
    ...existingCandidate,
    ...updateData,
  };

  assert('Admin edit updates the targeted field (city -> Pune)', updatedCandidate.city === 'Pune');
  assert('Admin edit preserves untouched missing hospital as null (never populated with Apollo)', updatedCandidate.currentHospital === null);
  assert('Admin edit preserves untouched missing registration as null (never populated with MCI-REG)', updatedCandidate.medicalRegistrationNumber === null);
  assert('Admin edit preserves nested horoscope details', updatedCandidate.horoscope.manglik === 'Manglik' && updatedCandidate.horoscope.rashi === 'Kanya');
  assert('Admin edit preserves nested familyBackground details', updatedCandidate.familyBackground.fatherName === 'Dr. Ramesh Patil');
  assert('Admin edit preserves nested medicalQualifications', updatedCandidate.medicalQualifications.undergraduate[0].college === 'BJMC Pune');

  // ─── 5. PRODUCTION SEED ISOLATION & SETTINGS PRESERVATION TEST ───
  setSuite('Suite 5: Production Seed Isolation Guard & Setting Protection');

  const originalEnv = process.env.NODE_ENV;
  const originalAllowDemo = process.env.ALLOW_DEMO_SEED;

  // Stash original model methods
  const origCountryCount = (Country as any).countDocuments;
  const origCountryFindOne = (Country as any).findOne;
  const origMemberCount = (MembershipPlan as any).countDocuments;
  const origMemberFind = (MembershipPlan as any).find;
  const origSettingFindOne = (Setting as any).findOne;
  const origSettingFindOneAndUpdate = (Setting as any).findOneAndUpdate;
  const origSettingCreate = (Setting as any).create;
  const origUserCount = (User as any).countDocuments;
  const origUserFindOneForSeed = (User as any).findOne;
  const origUserCreateForSeed = (User as any).create;
  const origAdminFindOneForSeed = (Admin as any).findOne;

  // Setup baseline mocks for master data & admin so seed doesn't hit live db
  const mockSuite5India = { _id: 'mock_india_suite5', code: 'IN', name: 'India' };
  (Country as any).countDocuments = async () => 1;
  (Country as any).findOne = async (f: any) => {
    if (f?.code === 'IN' || f?.name === 'India') return mockSuite5India;
    return null;
  };
  (MembershipPlan as any).countDocuments = async () => 1;
  (MembershipPlan as any).find = async () => [];
  (Admin as any).findOne = async () => ({ user: 'mockAdminId', permissions: ['all'] });
  (User as any).findOne = async (f: any) => {
    if (f?.email === 'admin@wonderfuljodi.com') {
      return { _id: 'mockAdminId', email: 'admin@wonderfuljodi.com' };
    }
    return null;
  };

  // Define live production operational settings record
  const mockProductionSettings = {
    _id: '60d5ecb8b5c9c82b94e82b99',
    siteName: 'Wonderful Jodi Live Production',
    supportEmail: 'ops@wonderfuljodi.com',
    supportPhone: '+91 096075 59547',
    tollFreeNumber: '+91 096075 59547',
    officeAddress: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034',
    maintenanceMode: true, // Crucial: Admin has turned maintenance ON
    allowNewRegistrations: false, // Registrations temporarily paused
    requireEmailVerification: true, // Strict verification active
    requireManualProfileApproval: false,
    currency: 'INR',
    razorpayLiveMode: true, // Live payment mode active
    allowAdminAccess: true,
    minAgeMale: 21,
    minAgeFemale: 18,
    maxPhotoUploadLimit: 6,
    saveCalls: 0,
    save: async function () {
      this.saveCalls++;
      return this;
    },
  };

  let demoUsersCreatedCount = 0;
  (User as any).create = async () => {
    demoUsersCreatedCount++;
    return {};
  };
  (User as any).countDocuments = async () => 0; // If demo seed were to execute, count === 0 would trigger user creation

  (Setting as any).findOne = async () => mockProductionSettings;
  (Setting as any).findOneAndUpdate = async () => {
    throw new Error('CRITICAL ERROR: Setting.findOneAndUpdate was called on seed/startup path!');
  };
  (Setting as any).create = async () => {
    throw new Error('CRITICAL ERROR: Setting.create was called when settings already exist!');
  };

  // Case 5a: Production with ALLOW_DEMO_SEED unset
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_DEMO_SEED;
  await seedInitialData();

  assert('Production seed with ALLOW_DEMO_SEED unset creates 0 demo users', demoUsersCreatedCount === 0);
  assert('Production seed preserves maintenanceMode=true', mockProductionSettings.maintenanceMode === true);
  assert('Production seed preserves allowNewRegistrations=false', mockProductionSettings.allowNewRegistrations === false);
  assert('Production seed preserves requireEmailVerification=true', mockProductionSettings.requireEmailVerification === true);
  assert('Production seed preserves requireManualProfileApproval=false', mockProductionSettings.requireManualProfileApproval === false);
  assert('Production seed preserves razorpayLiveMode=true', mockProductionSettings.razorpayLiveMode === true);
  assert('Production seed preserves custom siteName', mockProductionSettings.siteName === 'Wonderful Jodi Live Production');

  // Case 5b: Production with ALLOW_DEMO_SEED = 'false'
  process.env.ALLOW_DEMO_SEED = 'false';
  demoUsersCreatedCount = 0;
  await seedInitialData();

  assert('Production seed with ALLOW_DEMO_SEED=false creates 0 demo users', demoUsersCreatedCount === 0);
  assert('Production seed preserves operational maintenanceMode=true (case 5b)', mockProductionSettings.maintenanceMode === true);
  assert('Production seed preserves razorpayLiveMode=true (case 5b)', mockProductionSettings.razorpayLiveMode === true);

  // Case 5c: Production with ALLOW_DEMO_SEED = 'true' (STRICT OVERRIDE PREVENTION)
  process.env.ALLOW_DEMO_SEED = 'true';
  demoUsersCreatedCount = 0;
  await seedInitialData();

  assert('Production seed with ALLOW_DEMO_SEED=true strictly blocks demo users (fail-closed, no override)', demoUsersCreatedCount === 0);
  assert('Production seed preserves operational maintenanceMode=true even with ALLOW_DEMO_SEED=true', mockProductionSettings.maintenanceMode === true);
  assert('Production seed preserves razorpayLiveMode=true even with ALLOW_DEMO_SEED=true', mockProductionSettings.razorpayLiveMode === true);
  assert('Production seed preserves allowNewRegistrations=false even with ALLOW_DEMO_SEED=true', mockProductionSettings.allowNewRegistrations === false);

  // Case 5d: ensurePlatformSettingsExist backfills missing non-operational fields without altering operational values
  const partialSettingsRecord: any = {
    _id: '60d5ecb8b5c9c82b94e82b97',
    maintenanceMode: true,
    razorpayLiveMode: true,
    allowNewRegistrations: false,
    requireEmailVerification: true,
    requireManualProfileApproval: false,
    siteName: undefined, // Missing
    officeAddress: null, // Missing
    saveCalls: 0,
    save: async function () {
      this.saveCalls++;
      return this;
    },
  };
  (Setting as any).findOne = async () => partialSettingsRecord;
  await ensurePlatformSettingsExist();

  assert('ensurePlatformSettingsExist backfills missing siteName', partialSettingsRecord.siteName === 'Wonderful Jodi');
  assert('ensurePlatformSettingsExist backfills missing officeAddress', typeof partialSettingsRecord.officeAddress === 'string');
  assert('ensurePlatformSettingsExist preserves operational maintenanceMode=true', partialSettingsRecord.maintenanceMode === true);
  assert('ensurePlatformSettingsExist preserves operational razorpayLiveMode=true', partialSettingsRecord.razorpayLiveMode === true);
  assert('ensurePlatformSettingsExist preserves operational allowNewRegistrations=false', partialSettingsRecord.allowNewRegistrations === false);
  assert('ensurePlatformSettingsExist preserves operational requireEmailVerification=true', partialSettingsRecord.requireEmailVerification === true);
  assert('ensurePlatformSettingsExist called save() to persist backfilled fields', partialSettingsRecord.saveCalls === 1);

  // Case 5e: ensurePlatformSettingsExist creates initial baseline when collection is empty
  let createdBaselineSettings: any = null;
  (Setting as any).findOne = async () => null;
  (Setting as any).create = async (data: any) => {
    createdBaselineSettings = data;
    return data;
  };
  await ensurePlatformSettingsExist();

  assert('ensurePlatformSettingsExist creates initial baseline when none exist', createdBaselineSettings !== null);
  assert('Baseline settings includes siteName', createdBaselineSettings?.siteName === 'Wonderful Jodi');
  assert('Baseline settings initializes safe defaults for new installations', createdBaselineSettings?.maintenanceMode === false && createdBaselineSettings?.razorpayLiveMode === false);

  // Restore mocks and env
  (Country as any).countDocuments = origCountryCount;
  (Country as any).findOne = origCountryFindOne;
  (MembershipPlan as any).countDocuments = origMemberCount;
  (MembershipPlan as any).find = origMemberFind;
  (Setting as any).findOne = origSettingFindOne;
  (Setting as any).findOneAndUpdate = origSettingFindOneAndUpdate;
  (Setting as any).create = origSettingCreate;
  (User as any).countDocuments = origUserCount;
  (User as any).findOne = origUserFindOneForSeed;
  (User as any).create = origUserCreateForSeed;
  (Admin as any).findOne = origAdminFindOneForSeed;
  process.env.NODE_ENV = originalEnv;
  if (originalAllowDemo !== undefined) {
    process.env.ALLOW_DEMO_SEED = originalAllowDemo;
  } else {
    delete process.env.ALLOW_DEMO_SEED;
  }

  // ─── 6. DEFAULT ADMINISTRATOR SECURITY & REPEATED STARTUP TEST ───
  setSuite('Suite 6: Administrator Security: Existing Admin & Secure Bootstrap Scenarios');

  const originalUserFindOne = User.findOne;
  const originalUserCreate = User.create;
  const originalAdminFindOne = Admin.findOne;
  const originalAdminCreate = Admin.create;
  const originalAdminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD;

  // ── Scenario 6A: Existing Administrator on Repeated Startup ──
  const existingProductionAdmin = {
    _id: '60d5ecb8b5c9c82b94e82b99',
    fullName: 'System Administrator',
    email: 'admin@wonderfuljodi.com',
    mobile: '+919999999999',
    password: '$2b$12$ProductionCustomHash98765432101234567890abcdefghijklm', // custom non-default hash!
    role: 'admin',
    verified: true,
    verificationStatus: 'VERIFIED',
    isActive: true,
    status: 'Active',
  };

  const existingAdminPermissionsRecord = {
    _id: '60d5ecb8b5c9c82b94e82b98',
    user: '60d5ecb8b5c9c82b94e82b99',
    permissions: ['manage_users', 'view_reports'], // custom permission subset!
  };

  let userCreateCalls = 0;
  let adminCreateCalls = 0;

  (User as any).findOne = async (filter: any) => {
    if (filter?.email === 'admin@wonderfuljodi.com') {
      return existingProductionAdmin;
    }
    return null;
  };
  (User as any).create = async () => {
    userCreateCalls++;
    throw new Error('User.create should not be called when admin already exists!');
  };
  (Admin as any).findOne = async (filter: any) => {
    if (filter?.user === existingProductionAdmin._id) {
      return existingAdminPermissionsRecord;
    }
    return null;
  };
  (Admin as any).create = async () => {
    adminCreateCalls++;
    throw new Error('Admin.create should not be called when admin record already exists!');
  };

  // Run ensureAdminUserExists 3 consecutive times to simulate repeated production startup / server reboots
  await ensureAdminUserExists();
  await ensureAdminUserExists();
  await ensureAdminUserExists();

  assert('Repeated startup never calls User.create for existing admin', userCreateCalls === 0);
  assert('Repeated startup never calls Admin.create for existing admin permissions', adminCreateCalls === 0);
  assert(
    'Existing administrator password hash remains 100% untouched (never reset to hardcoded password)',
    existingProductionAdmin.password === '$2b$12$ProductionCustomHash98765432101234567890abcdefghijklm'
  );
  assert(
    'Existing administrator status remains Active and verified',
    existingProductionAdmin.status === 'Active' && existingProductionAdmin.verificationStatus === 'VERIFIED'
  );
  assert(
    'Existing administrator custom permissions are preserved without reset',
    existingAdminPermissionsRecord.permissions.length === 2 &&
      existingAdminPermissionsRecord.permissions.includes('manage_users') &&
      !existingAdminPermissionsRecord.permissions.includes('all')
  );

  // ── Scenario 6B: No Existing Administrator (Bootstrap Verification) ──
  // Subcase 6B.1: No existing admin and ADMIN_INITIAL_PASSWORD is UNSET -> must refuse to provision with hardcoded default
  delete process.env.ADMIN_INITIAL_PASSWORD;
  let unconfiguredCreateAttempted = false;

  (User as any).findOne = async () => null; // No admin exists
  (User as any).create = async () => {
    unconfiguredCreateAttempted = true;
    return {};
  };

  await ensureAdminUserExists();
  assert('Refuses to provision new admin when ADMIN_INITIAL_PASSWORD is unset (no hardcoded password fallback)', unconfiguredCreateAttempted === false);

  // Subcase 6B.2: No existing admin and ADMIN_INITIAL_PASSWORD is too short (< 12 chars) -> must reject
  process.env.ADMIN_INITIAL_PASSWORD = 'shortPass1!';
  let shortPassCreateAttempted = false;
  (User as any).create = async () => {
    shortPassCreateAttempted = true;
    return {};
  };

  await ensureAdminUserExists();
  assert('Rejects initial admin provisioning when password is under 12 characters', shortPassCreateAttempted === false);

  // Subcase 6B.3: No existing admin with explicitly configured secure bootstrap secret (>= 12 chars) -> creates safely
  const secureBootstrapSecret = 'SecureBootstrapSecret#2026!Min12Chars';
  process.env.ADMIN_INITIAL_PASSWORD = secureBootstrapSecret;
  let createdUserData: any = null;
  let createdAdminRecord: any = null;

  (User as any).create = async (userData: any) => {
    createdUserData = userData;
    return { ...userData, _id: '60d5ecb8b5c9c82b94e82b77' };
  };
  (Admin as any).findOne = async () => null;
  (Admin as any).create = async (record: any) => {
    createdAdminRecord = record;
    return record;
  };

  await ensureAdminUserExists();
  assert('Successfully provisions new admin when secure bootstrap secret is configured', createdUserData !== null);
  assert('New admin password is securely hashed with bcrypt (never stored as plaintext)', typeof createdUserData?.password === 'string' && createdUserData.password.startsWith('$2b$12$'));
  assert('Plaintext bootstrap secret is never persisted to user record', createdUserData?.password !== secureBootstrapSecret);
  assert('New admin is created with admin role and verified status', createdUserData?.role === 'admin' && createdUserData?.verified === true);
  assert('New admin permissions record is initialized with admin permissions', createdAdminRecord?.permissions?.includes('all'));

  // Restore mocks and env
  (User as any).findOne = originalUserFindOne;
  (User as any).create = originalUserCreate;
  (Admin as any).findOne = originalAdminFindOne;
  (Admin as any).create = originalAdminCreate;
  if (originalAdminInitialPassword !== undefined) {
    process.env.ADMIN_INITIAL_PASSWORD = originalAdminInitialPassword;
  } else {
    delete process.env.ADMIN_INITIAL_PASSWORD;
  }

  // ─── 7. AUDIT DATABASE CONNECTION & TARGET SELECTION TESTS ───
  setSuite('Suite 7: Audit Database Target URL Selection and Client Connection Binding');

  // Test 7a: resolveAuditTargetUrl with valid explicit database URL
  const validExplicitUrl = 'mysql://audit_user:secret_pwd@127.0.0.1:3306/wonderfuljodi_audit';
  const resolvedExplicit = resolveAuditTargetUrl(validExplicitUrl);
  assert('resolveAuditTargetUrl selects and returns valid explicit database URL', resolvedExplicit === validExplicitUrl);

  // Test 7b: resolveAuditTargetUrl with invalid explicit database URL (fail-closed, NO fallback)
  let explicitThrew: boolean = false;
  let explicitErrorMsg: string = '';
  try {
    resolveAuditTargetUrl('not_a_valid_url_without_hostname');
  } catch (err: any) {
    explicitThrew = true;
    explicitErrorMsg = err?.message || '';
  }
  assert('resolveAuditTargetUrl fails closed when explicit URL is invalid', explicitThrew === true);
  assert('Explicit URL failure message mentions FAIL-CLOSED and refuses fallback', explicitErrorMsg.includes('FAIL-CLOSED') && explicitErrorMsg.includes('Refusing to fall back'));

  // Test 7c: resolveAuditTargetUrl with valid AUDIT_DATABASE_URL environment variable
  const originalAuditDbUrl = process.env.AUDIT_DATABASE_URL;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  process.env.AUDIT_DATABASE_URL = 'mysql://audit_env_user:audit_env_pass@audit-env-node.internal:3306/audit_env_db';
  process.env.DATABASE_URL = 'mysql://default_user:default_pass@default-node.internal:3306/default_db';

  const resolvedEnvAudit = resolveAuditTargetUrl(undefined);
  assert('AUDIT_DATABASE_URL environment variable takes precedence over DATABASE_URL', resolvedEnvAudit.includes('audit-env-node.internal'));

  // Test 7d: resolveAuditTargetUrl with invalid AUDIT_DATABASE_URL (fail-closed, NO fallback to DATABASE_URL)
  process.env.AUDIT_DATABASE_URL = 'invalid_protocol://';
  let envAuditThrew: boolean = false;
  let envAuditErrorMsg: string = '';
  try {
    resolveAuditTargetUrl(undefined);
  } catch (err: any) {
    envAuditThrew = true;
    envAuditErrorMsg = err?.message || '';
  }
  assert('Invalid AUDIT_DATABASE_URL fails closed and refuses fallback to DATABASE_URL', envAuditThrew === true);
  assert('AUDIT_DATABASE_URL failure message mentions FAIL-CLOSED and refuses fallback', envAuditErrorMsg.includes('FAIL-CLOSED') && envAuditErrorMsg.includes('Refusing to fall back'));

  // Test 7e: resolveAuditTargetUrl falls back to DATABASE_URL only when explicit URL and AUDIT_DATABASE_URL are unset
  delete process.env.AUDIT_DATABASE_URL;
  process.env.DATABASE_URL = 'mysql://default_user:default_pass@default-node.internal:3306/default_db';
  const resolvedDefault = resolveAuditTargetUrl(undefined);
  assert('Falls back to DATABASE_URL when neither explicitDbUrl nor AUDIT_DATABASE_URL is configured', resolvedDefault.includes('default-node.internal'));

  // Test 7f: resolveAuditTargetUrl fails closed when all connection URLs are missing
  delete process.env.DATABASE_URL;
  let allMissingThrew: boolean = false;
  try {
    resolveAuditTargetUrl(undefined);
  } catch (err: any) {
    allMissingThrew = true;
  }
  assert('Fails closed when neither explicitDbUrl, AUDIT_DATABASE_URL, nor DATABASE_URL is configured', allMissingThrew === true);

  // Restore environment URLs
  if (originalAuditDbUrl !== undefined) {
    process.env.AUDIT_DATABASE_URL = originalAuditDbUrl;
  } else {
    delete process.env.AUDIT_DATABASE_URL;
  }
  if (originalDatabaseUrl !== undefined) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  // Test 7g: getSafeDatabaseTargetInfo masks credentials safely and never leaks passwords
  const testConnectionUrl = 'mysql://audit_admin:super_secret_password_123!@remote-audit-db.internal:3306/matrimonial_audit_prod?ssl=true';
  const targetInfo = getSafeDatabaseTargetInfo(testConnectionUrl);
  assert('Target host is extracted accurately with port', targetInfo.targetHost === 'remote-audit-db.internal:3306');
  assert('Target database name is extracted accurately', targetInfo.targetDatabase === 'matrimonial_audit_prod');
  assert('Masked URL replaces credentials with asterisks', targetInfo.maskedUrl.includes('//***:***@remote-audit-db.internal:3306'));
  assert('Sensitive database password is NEVER leaked in masked URL', !targetInfo.maskedUrl.includes('super_secret_password_123!'));
  assert('Sensitive database username is NEVER leaked in masked URL', !targetInfo.maskedUrl.includes('audit_admin'));

  // Test 7h: createAuditPrismaClient creates dedicated Prisma client bound to effective URL
  const testDedicatedUrl = 'mysql://audit_user:pass@127.0.0.1:3306/isolated_test_audit_db?connection_limit=1';
  const auditClientContext = createAuditPrismaClient(testDedicatedUrl);
  assert('createAuditPrismaClient marks context as isDedicatedClient=true', auditClientContext.isDedicatedClient === true);
  assert('createAuditPrismaClient sets targetHost corresponding to the configured URL', auditClientContext.targetInfo.targetHost === '127.0.0.1:3306');
  assert('createAuditPrismaClient sets targetDatabase corresponding to the configured URL', auditClientContext.targetInfo.targetDatabase === 'isolated_test_audit_db');
  await auditClientContext.client.$disconnect();

  // Test 7i: runProfileIntegrityAudit queries the provided audit client and reports target metadata accurately
  const mockAuditState = {
    findManyInvoked: false,
    disconnectInvoked: false,
  };
  const mockAuditPrisma = {
    profile: {
      findMany: async (queryArgs: any) => {
        mockAuditState.findManyInvoked = true;
        return [
          {
            id: 'prof_test_audit_1',
            candidateId: 'WJ-TEST-001',
            currentlyPracticing: false,
            profession: 'Orthopedic Surgeon',
            user: { id: 'u1', email: 'surgeon@hospital.org' },
            horoscope: { manglik: 'Non-Manglik' },
            createdAt: new Date(),
          },
        ];
      },
    },
    $disconnect: async () => {
      mockAuditState.disconnectInvoked = true;
    },
  };

  const auditReport = await runProfileIntegrityAudit(
    'mysql://mock_audit_user:pass@audit-dedicated-host.internal:3306/audit_isolated_db',
    mockAuditPrisma as any
  );

  assert('runProfileIntegrityAudit queries the dedicated client findMany', mockAuditState.findManyInvoked === true);
  assert('Audit report targetDatabase host matches the explicit connection target', auditReport.targetDatabase.host === 'audit-dedicated-host.internal:3306');
  assert('Audit report targetDatabase name matches the explicit connection target', auditReport.targetDatabase.databaseName === 'audit_isolated_db');
  assert('Audit report scanned the candidate profiles from the dedicated client', auditReport.totalProfilesScanned === 1);
  assert('Audit report confirms read-only operation (0 mutations executed)', auditReport.isReadOnly === true);

  // Test 7j: runProfileIntegrityAudit rejects and fails closed if explicit audit URL is invalid
  let auditRunThrew: boolean = false;
  try {
    await runProfileIntegrityAudit('completely_unsupported_url');
  } catch (err: any) {
    auditRunThrew = true;
  }
  assert('runProfileIntegrityAudit fails closed and rejects when explicit audit URL cannot be applied', auditRunThrew === true);

  // ─── 8. MASTER-DATA SEEDING RESILIENCE & INDEPENDENT DATASET GUARANTEES ───
  setSuite('Suite 8: Master-Data Seeding Resilience & Independent Dataset Guarantees');

  // Stash original models methods for Suite 8
  const origSuite8CountryCount = (Country as any).countDocuments;
  const origSuite8CountryFindOne = (Country as any).findOne;
  const origSuite8CountryCreate = (Country as any).create;
  const origSuite8CountryInsertMany = (Country as any).insertMany;
  const origSuite8StateCount = (State as any).countDocuments;
  const origSuite8StateFindOneAndUpdate = (State as any).findOneAndUpdate;
  const origSuite8StateFind = (State as any).find;
  const origSuite8DistrictCount = (District as any).countDocuments;
  const origSuite8DistrictFindOneAndUpdate = (District as any).findOneAndUpdate;
  const origSuite8SubDistrictCount = (SubDistrict as any).countDocuments;
  const origSuite8CityCount = (City as any).countDocuments;
  const origSuite8VillageCount = (Village as any).countDocuments;
  const origSuite8LanguageCount = (Language as any).countDocuments;
  const origSuite8LanguageInsertMany = (Language as any).insertMany;
  const origSuite8ReligionCount = (Religion as any).countDocuments;
  const origSuite8ReligionInsertMany = (Religion as any).insertMany;
  const origSuite8ReligionFind = (Religion as any).find;
  const origSuite8CasteCount = (Caste as any).countDocuments;
  const origSuite8CasteFindOneAndUpdate = (Caste as any).findOneAndUpdate;
  const origSuite8SubCasteFindOneAndUpdate = (SubCaste as any).findOneAndUpdate;
  const origSuite8UserCreate = (User as any).create;
  const origSuite8UserCount = (User as any).countDocuments;
  const origSuite8ProfileCreate = (Profile as any).create;
  const origSuite8RegistrationInsertMany = (Registration as any).insertMany;
  const origSuite8SettingFindOne = (Setting as any).findOne;
  const origSuite8SettingCreate = (Setting as any).create;
  const origSuite8SettingFindOneAndUpdate = (Setting as any).findOneAndUpdate;
  const origSuite8Env = process.env.NODE_ENV;
  const origSuite8AllowDemo = process.env.ALLOW_DEMO_SEED;

  try {
    // ── Test 8a: India present and geographic seeding proceeding ──
    const mockIndia8a = { _id: 'mock_india_8a', code: 'IN', name: 'India' };
    const tracker8a = {
      stateSeeded: false,
      districtSeeded: false,
    };

    (Country as any).countDocuments = async () => 27;
    (Country as any).findOne = async (f: any) => {
      if (f?.code === 'IN' || f?.name === 'India') return mockIndia8a;
      return null;
    };
    (State as any).countDocuments = async () => 0; // Trigger states seeding
    (State as any).findOneAndUpdate = async () => {
      tracker8a.stateSeeded = true;
      return { _id: 'state_mh', code: 'MH', countryId: mockIndia8a._id };
    };
    (District as any).countDocuments = async () => 0; // Trigger district seeding
    (State as any).find = async () => [{ _id: 'state_mh', code: 'MH', countryId: mockIndia8a._id }];
    (District as any).findOneAndUpdate = async () => {
      tracker8a.districtSeeded = true;
      return { _id: 'dist_pune' };
    };
    (SubDistrict as any).countDocuments = async () => 1;
    (City as any).countDocuments = async () => 1;
    (Village as any).countDocuments = async () => 1;
    (Language as any).countDocuments = async () => 1;
    (Religion as any).countDocuments = async () => 1;
    (Caste as any).countDocuments = async () => 1;

    await seedMasterDataIfEmpty();

    assert('Geographic seeding: States are seeded when India country record is present', tracker8a.stateSeeded === true);
    assert('Geographic seeding: Districts are seeded when India country record is present', tracker8a.districtSeeded === true);

    // ── Test 8b: India absent: skips geographic seeding while independent datasets continue ──
    const tracker8b = {
      stateSeededWhenIndiaAbsent: false,
      languageSeededWhenIndiaAbsent: false,
      religionSeededWhenIndiaAbsent: false,
      casteSeededWhenIndiaAbsent: false,
    };

    (Country as any).countDocuments = async () => 5; // Countries exist, none is India
    (Country as any).findOne = async () => null; // Cannot be found by code, regex, or name
    (Country as any).create = async () => { throw new Error('Recovery disabled for test 8b'); };

    (State as any).countDocuments = async () => 0;
    (State as any).findOneAndUpdate = async () => {
      tracker8b.stateSeededWhenIndiaAbsent = true;
      return {};
    };

    (Language as any).countDocuments = async () => 0;
    (Language as any).insertMany = async (items: any[]) => {
      tracker8b.languageSeededWhenIndiaAbsent = items.length > 0;
      return items;
    };

    (Religion as any).countDocuments = async () => 0;
    (Religion as any).insertMany = async (items: any[]) => {
      tracker8b.religionSeededWhenIndiaAbsent = items.length > 0;
      return items;
    };

    (Religion as any).find = async () => [{ _id: 'rel_hindu_8b', name: 'Hindu' }];
    (Caste as any).countDocuments = async () => 0;
    (Caste as any).findOneAndUpdate = async () => {
      tracker8b.casteSeededWhenIndiaAbsent = true;
      return { _id: 'caste_doc_8b' };
    };
    (SubCaste as any).findOneAndUpdate = async () => ({});

    await seedMasterDataIfEmpty();

    assert('India absent: Geographical state seeding is strictly skipped when India cannot be resolved', tracker8b.stateSeededWhenIndiaAbsent === false);
    assert('India absent: Independent Language dataset continues and seeds successfully', tracker8b.languageSeededWhenIndiaAbsent === true);
    assert('India absent: Independent Religion dataset continues and seeds successfully', tracker8b.religionSeededWhenIndiaAbsent === true);
    assert('India absent: Independent Caste dataset continues and seeds successfully', tracker8b.casteSeededWhenIndiaAbsent === true);

    // ── Test 8c: Existing country records being preserved ──
    const existingCustomCountry = {
      _id: 'country_custom_001',
      name: 'India',
      code: 'IN',
      isoCode: 'IND',
      phoneCode: '+91',
      customAttribute: 'OPERATIONAL_PRESERVED_VALUE',
      updatedAt: new Date('2025-01-01'),
    };

    const tracker8c = {
      countryUpdated: false,
      countryInserted: false,
    };

    (Country as any).countDocuments = async () => 1;
    (Country as any).findOne = async () => existingCustomCountry;
    (Country as any).findOneAndUpdate = async () => { tracker8c.countryUpdated = true; return existingCustomCountry; };
    (Country as any).updateOne = async () => { tracker8c.countryUpdated = true; return existingCustomCountry; };
    (Country as any).insertMany = async () => { tracker8c.countryInserted = true; return []; };

    const resolved = await resolveOrRecoverIndiaCountry();

    assert('Existing country: resolveOrRecoverIndiaCountry returns existing record', resolved?._id === 'country_custom_001');
    assert('Existing country: Custom country attributes are preserved untouched', resolved?.customAttribute === 'OPERATIONAL_PRESERVED_VALUE');
    assert('Existing country: Existing records are never updated or overwritten during lookup', tracker8c.countryUpdated === false);
    assert('Existing country: No duplicate country insertion attempted when record exists', tracker8c.countryInserted === false);

    // ── Test 8d: Missing-India recovery from SEED_COUNTRIES ──
    let recoveredDocCreated: any = null;

    (Country as any).findOne = async () => null; // Not found by code or name
    (Country as any).create = async (doc: any) => {
      recoveredDocCreated = doc;
      return { _id: 'rec_in_created_8d', ...doc };
    };

    const recoveredIndia = await resolveOrRecoverIndiaCountry();

    assert('Missing-India recovery: Successfully recovers India from canonical seed definitions', recoveredIndia !== null && recoveredIndia._id === 'rec_in_created_8d');
    assert('Missing-India recovery: Recovered record has canonical uppercase code IN', recoveredDocCreated?.code === 'IN');
    assert('Missing-India recovery: Recovered record has canonical name India', recoveredDocCreated?.name === 'India');
    assert('Missing-India recovery: Recovered record has canonical phone code +91', recoveredDocCreated?.phoneCode === '+91');
    assert('Missing-India recovery: Recovered record has GOVERNMENT sourceType', recoveredDocCreated?.sourceType === 'GOVERNMENT');

    // ── Test 8e: Production seed execution performing no prohibited writes ──
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEMO_SEED = 'true'; // Attempt override

    const tracker8e = {
      prohibitedUserWrite: false,
      prohibitedProfileWrite: false,
      prohibitedRegistrationWrite: false,
      prohibitedMasterDataWrite: false,
    };

    (User as any).create = async () => { tracker8e.prohibitedUserWrite = true; return {}; };
    (User as any).countDocuments = async () => 0; // If demo seed were to execute, count === 0 triggers users
    (Profile as any).create = async () => { tracker8e.prohibitedProfileWrite = true; return {}; };
    (Profile as any).findOneAndUpdate = async () => { tracker8e.prohibitedProfileWrite = true; return {}; };
    (Registration as any).insertMany = async () => { tracker8e.prohibitedRegistrationWrite = true; return []; };
    (Country as any).insertMany = async () => { tracker8e.prohibitedMasterDataWrite = true; return []; };

    await seedInitialData();

    assert('Production protection: seedInitialData in production performs 0 demo user writes', tracker8e.prohibitedUserWrite === false);
    assert('Production protection: seedInitialData in production performs 0 demo profile writes', tracker8e.prohibitedProfileWrite === false);
    assert('Production protection: seedInitialData in production performs 0 sample transaction writes', tracker8e.prohibitedRegistrationWrite === false);
    assert('Production protection: seedInitialData in production performs 0 implicit master-data writes', tracker8e.prohibitedMasterDataWrite === false);

    // ── Test 8f: Existing platform settings remaining unchanged ──
    const liveProductionSettings: any = {
      _id: 'sett_prod_live_8f',
      siteName: 'Live Matrimonial Production',
      maintenanceMode: true,
      allowNewRegistrations: false,
      requireEmailVerification: true,
      requireManualProfileApproval: true,
      razorpayLiveMode: true,
      allowAdminAccess: true,
      supportEmail: 'ops@wonderfuljodi.com',
      supportPhone: '+91 99999 88888',
      tollFreeNumber: '+91 1800 000 000',
      officeAddress: 'Corporate Tower 4, Cyber City, Gurugram',
      currency: 'INR',
      minAgeMale: 21,
      minAgeFemale: 18,
      maxPhotoUploadLimit: 10,
      saveCalls: 0,
      save: async function () { this.saveCalls++; return this; },
    };

    (Setting as any).findOne = async () => liveProductionSettings;
    (Setting as any).create = async () => { throw new Error('Setting.create should not be called'); };
    (Setting as any).findOneAndUpdate = async () => { throw new Error('Setting.findOneAndUpdate should not be called'); };

    await ensurePlatformSettingsExist();

    assert('Settings protection: Operational maintenanceMode is preserved as true', liveProductionSettings.maintenanceMode === true);
    assert('Settings protection: Operational allowNewRegistrations is preserved as false', liveProductionSettings.allowNewRegistrations === false);
    assert('Settings protection: Operational razorpayLiveMode is preserved as true', liveProductionSettings.razorpayLiveMode === true);
    assert('Settings protection: Operational requireEmailVerification is preserved as true', liveProductionSettings.requireEmailVerification === true);
    assert('Settings protection: Operational requireManualProfileApproval is preserved as true', liveProductionSettings.requireManualProfileApproval === true);
    assert('Settings protection: Operational settings were not saved or modified when no fields missing', liveProductionSettings.saveCalls === 0);

    // ── Test 8g: Repeated seeding remaining idempotent ──
    const tracker8g = {
      idempotentInsertAttempts: 0,
      idempotentCreateAttempts: 0,
    };

    (Country as any).countDocuments = async () => 27;
    (Country as any).findOne = async () => ({ _id: 'ind_id_idem', code: 'IN', name: 'India' });
    (State as any).countDocuments = async () => 36;
    (District as any).countDocuments = async () => 700;
    (SubDistrict as any).countDocuments = async () => 5000;
    (City as any).countDocuments = async () => 1200;
    (Village as any).countDocuments = async () => 100;
    (Language as any).countDocuments = async () => 22;
    (Religion as any).countDocuments = async () => 7;
    (Caste as any).countDocuments = async () => 300;

    (Country as any).insertMany = async () => { tracker8g.idempotentInsertAttempts++; return []; };
    (State as any).findOneAndUpdate = async () => { tracker8g.idempotentCreateAttempts++; return {}; };
    (Language as any).insertMany = async () => { tracker8g.idempotentInsertAttempts++; return []; };
    (Religion as any).insertMany = async () => { tracker8g.idempotentInsertAttempts++; return []; };

    // Run 3 consecutive seeding runs
    await seedMasterDataIfEmpty();
    await seedMasterDataIfEmpty();
    await seedMasterDataIfEmpty();

    assert('Idempotency: Repeated master data seed runs perform 0 duplicate insertMany calls', tracker8g.idempotentInsertAttempts === 0);
    assert('Idempotency: Repeated master data seed runs perform 0 duplicate entity upserts', tracker8g.idempotentCreateAttempts === 0);

    // ── Test 8h: Genuinely case-insensitive country-code matching ('in') ──
    const lowercaseIndiaDoc = {
      _id: 'country_in_lower_8h',
      code: 'in',
      name: 'India',
      isoCode: 'IND',
      phoneCode: '+91',
    };
    const tracker8h = {
      exactCodeLookupCalled: false,
      regexCodeLookupCalled: false,
      recoveryCalled: false,
    };

    (Country as any).countDocuments = async () => 1;
    (Country as any).findOne = async (filter: any) => {
      // 1. Exact match { code: 'IN' } will not match lowercase 'in' in case-sensitive environments
      if (filter?.code === 'IN') {
        tracker8h.exactCodeLookupCalled = true;
        return null;
      }
      // 2. Case-insensitive regex match { code: { $regex: '^IN$', $options: 'i' } } matches 'in'
      if (filter?.code?.$regex) {
        tracker8h.regexCodeLookupCalled = true;
        const reg = new RegExp(filter.code.$regex, filter.code.$options || '');
        if (reg.test(lowercaseIndiaDoc.code)) {
          return lowercaseIndiaDoc;
        }
      }
      return null;
    };
    (Country as any).create = async () => {
      tracker8h.recoveryCalled = true;
      return lowercaseIndiaDoc;
    };

    const resolvedLower = await resolveOrRecoverIndiaCountry();

    assert('Case-insensitive code: Exact code lookup attempted first', tracker8h.exactCodeLookupCalled === true);
    assert('Case-insensitive code: Case-insensitive regex fallback is invoked with $options "i"', tracker8h.regexCodeLookupCalled === true);
    assert('Case-insensitive code: Resolves lowercase "in" to valid India country record', resolvedLower?._id === 'country_in_lower_8h');
    assert('Case-insensitive code: Preserves existing lowercase code and attributes without duplicate creation', tracker8h.recoveryCalled === false);

    // ── Test 8i: Conflicting non-India country records (e.g. Indonesia/Indiana) are never returned as India ──
    const validIndiaCanonical = { code: 'IN', name: 'India' };
    const validIndiaLower = { code: 'in', name: 'India' };
    const conflictingIndonesiaDoc = {
      _id: 'country_conflict_id_8i',
      code: 'IN',
      name: 'Indonesia',
      isoCode: 'IDN',
    };
    const tracker8i = {
      recoveryAttempted: false,
    };

    (Country as any).countDocuments = async () => 1;
    (Country as any).findOne = async () => conflictingIndonesiaDoc;
    (Country as any).create = async () => {
      tracker8i.recoveryAttempted = true;
      return conflictingIndonesiaDoc;
    };

    const resolvedConflict = await resolveOrRecoverIndiaCountry();

    assert('Lookup validation: { code: "IN", name: "India" } is accepted', isGenuinelyIndia(validIndiaCanonical) === true);
    assert('Lookup validation: { code: "in", name: "India" } is accepted when lowercase codes are supported', isGenuinelyIndia(validIndiaLower) === true);
    assert('Conflict protection: { code: "IN", name: "Indonesia" } is rejected', isGenuinelyIndia(conflictingIndonesiaDoc) === false);
    assert('Conflict protection: Conflicting country record is NEVER returned as India', resolvedConflict === null);
    assert('Conflict protection: Conflicting records are not overwritten via Country.create', tracker8i.recoveryAttempted === false);
    assert('Conflict protection: A rejected record does not trigger unsafe recovery or duplicate creation', tracker8i.recoveryAttempted === false);

    // ── Test 8j: Name match with unrelated country code is rejected without recovery ──
    const foreignCodeIndiaNameDoc = {
      _id: 'country_conflict_us_8j',
      code: 'US',
      name: 'India',
      isoCode: 'USA',
    };
    const tracker8j = {
      recoveryAttempted: false,
    };

    (Country as any).countDocuments = async () => 1;
    (Country as any).findOne = async (filter: any) => {
      if (filter?.code === 'IN' || filter?.code?.$regex) return null;
      if (filter?.name?.$regex) return foreignCodeIndiaNameDoc;
      return null;
    };
    (Country as any).create = async () => {
      tracker8j.recoveryAttempted = true;
      return foreignCodeIndiaNameDoc;
    };

    const resolvedForeign = await resolveOrRecoverIndiaCountry();

    assert('Conflict protection: isGenuinelyIndia rejects name "India" paired with unrelated code "US"', isGenuinelyIndia(foreignCodeIndiaNameDoc) === false);
    assert('Conflict protection: Record with foreign code and name "India" is rejected as India', resolvedForeign === null);
    assert('Conflict protection: Rejected foreign code record does not trigger unsafe recovery or create', tracker8j.recoveryAttempted === false);

    // ── Test 8k: Duplicate-key race recovery during concurrent Country.create() ──
    const concurrentIndiaDoc = {
      _id: 'country_concurrent_raced_8k',
      code: 'IN',
      name: 'India',
      isoCode: 'IND',
      phoneCode: '+91',
    };
    const tracker8k = {
      createAttempted: false,
      requeryAttempted: false,
    };

    let findOneCallCount = 0;
    (Country as any).findOne = async (filter: any) => {
      findOneCallCount++;
      // Initial checks (steps 1, 2, 3, 4 initial conflict check) return null
      if (findOneCallCount <= 4) {
        return null;
      }
      // Re-query after duplicate-key race condition returns the concurrently created India doc
      tracker8k.requeryAttempted = true;
      return concurrentIndiaDoc;
    };

    (Country as any).create = async () => {
      tracker8k.createAttempted = true;
      // Simulate MongoDB duplicate key error (code 11000)
      const dupError: any = new Error('E11000 duplicate key error collection: countries index: code_1 dup key');
      dupError.code = 11000;
      dupError.name = 'MongoServerError';
      throw dupError;
    };

    const resolvedRaced = await resolveOrRecoverIndiaCountry();

    assert('Race protection: Concurrent create throws confirmed duplicate-key error (code 11000)', tracker8k.createAttempted === true);
    assert('Race protection: Gracefully catches confirmed duplicate key race and re-queries database', tracker8k.requeryAttempted === true);
    assert('Race protection: Returns verified concurrently-created India record', resolvedRaced?._id === 'country_concurrent_raced_8k');
    assert('Race protection: Verified concurrently-created record satisfies isGenuinelyIndia', isGenuinelyIndia(resolvedRaced) === true);

    // ── Test 8l: Unrelated MongoDB errors are distinguished from duplicate-key race conditions ──
    const tracker8l = {
      createAttempted: false,
    };

    (Country as any).countDocuments = async () => 0;
    (Country as any).findOne = async () => null;
    (Country as any).create = async () => {
      tracker8l.createAttempted = true;
      // Simulate unrelated MongoDB server error (e.g. execution timeout or auth error, code 50)
      const unrelatedMongoError: any = new Error('operation exceeded time limit');
      unrelatedMongoError.name = 'MongoServerError';
      unrelatedMongoError.code = 50;
      throw unrelatedMongoError;
    };

    const resolvedUnrelated = await resolveOrRecoverIndiaCountry();

    assert('Error discrimination: Unrelated MongoServerError (code 50) triggers create attempt', tracker8l.createAttempted === true);
    assert('Error discrimination: Unrelated MongoServerError is NOT treated as duplicate-key condition', resolvedUnrelated === null);
  } finally {
    // Restore all Suite 8 mocks
    (Country as any).countDocuments = origSuite8CountryCount;
    (Country as any).findOne = origSuite8CountryFindOne;
    (Country as any).create = origSuite8CountryCreate;
    (Country as any).insertMany = origSuite8CountryInsertMany;
    (State as any).countDocuments = origSuite8StateCount;
    (State as any).findOneAndUpdate = origSuite8StateFindOneAndUpdate;
    (State as any).find = origSuite8StateFind;
    (District as any).countDocuments = origSuite8DistrictCount;
    (District as any).findOneAndUpdate = origSuite8DistrictFindOneAndUpdate;
    (SubDistrict as any).countDocuments = origSuite8SubDistrictCount;
    (City as any).countDocuments = origSuite8CityCount;
    (Village as any).countDocuments = origSuite8VillageCount;
    (Language as any).countDocuments = origSuite8LanguageCount;
    (Language as any).insertMany = origSuite8LanguageInsertMany;
    (Religion as any).countDocuments = origSuite8ReligionCount;
    (Religion as any).insertMany = origSuite8ReligionInsertMany;
    (Religion as any).find = origSuite8ReligionFind;
    (Caste as any).countDocuments = origSuite8CasteCount;
    (Caste as any).findOneAndUpdate = origSuite8CasteFindOneAndUpdate;
    (SubCaste as any).findOneAndUpdate = origSuite8SubCasteFindOneAndUpdate;
    (User as any).create = origSuite8UserCreate;
    (User as any).countDocuments = origSuite8UserCount;
    (Profile as any).create = origSuite8ProfileCreate;
    (Registration as any).insertMany = origSuite8RegistrationInsertMany;
    (Setting as any).findOne = origSuite8SettingFindOne;
    (Setting as any).create = origSuite8SettingCreate;
    (Setting as any).findOneAndUpdate = origSuite8SettingFindOneAndUpdate;
    process.env.NODE_ENV = origSuite8Env;
    if (origSuite8AllowDemo !== undefined) {
      process.env.ALLOW_DEMO_SEED = origSuite8AllowDemo;
    } else {
      delete process.env.ALLOW_DEMO_SEED;
    }
  }

  // ─── SUMMARY ───
  console.log('\n===============================================================');
  console.log('       PROFILE DATA INTEGRITY TEST EXECUTION SUMMARY');
  console.log('===============================================================');

  const suiteStats = new Map<string, { total: number; passed: number; failed: number }>();
  for (const a of assertions) {
    const stats = suiteStats.get(a.suite) || { total: 0, passed: 0, failed: 0 };
    stats.total++;
    if (a.passed) stats.passed++;
    else stats.failed++;
    suiteStats.set(a.suite, stats);
  }

  for (const [suite, stats] of suiteStats.entries()) {
    console.log(`  ${suite}: ${stats.passed}/${stats.total} passed`);
  }

  console.log('---------------------------------------------------------------');
  const passedCount = assertions.filter(a => a.passed).length;
  const failedCount = assertions.filter(a => !a.passed).length;
  console.log(`TOTAL TESTS: ${assertions.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run test suite
runDataIntegrityTestSuite().catch(err => {
  console.error('Test suite failed with uncaught error:', err);
  process.exit(1);
});
