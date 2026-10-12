/**
 * Wonderful Jodi - Registration Improvements & Privacy Verification Test Suite
 *
 * Verifies:
 * 1. Annual Income (options, empty default, legacy backward compatibility)
 * 2. Height Selector & Normalization (options 2.1 - 7.10, 8+, decimal distinction, legacy format)
 * 3. Doctor Education Structure (UG, PG, Doctorate, Specialities from official references)
 * 4. Completion Year Sequences (dynamic chronology validation)
 * 5. Cascading Location Hierarchy & District HQ Fallback
 * 6. Profile Privacy Access Tiers (Public Visitor, Logged-in Free Member, Paid Unlocked Member)
 * 7. Legacy Education Schema Compatibility
 */

const path = require('path');
const fs = require('fs');

// Locate backend dist directory dynamically
let backendDist;
if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
  backendDist = path.resolve(__dirname, 'dist');
} else if (fs.existsSync(path.resolve(__dirname, '../backend/dist'))) {
  backendDist = path.resolve(__dirname, '../backend/dist');
} else if (fs.existsSync(path.resolve(__dirname, 'backend/dist'))) {
  backendDist = path.resolve(__dirname, 'backend/dist');
} else {
  backendDist = path.resolve('C:/Users/rushi/Downloads/wonderfull-Jodi-Platform-Main-Github/wonderfull-Jodi-Platform-Main-main/backend/dist');
}

const doctorValidation = require(path.join(backendDist, 'utils/doctorValidation.js'));
const securityUtils = require(path.join(backendDist, 'utils/securityUtils.js'));
const locationController = require(path.join(backendDist, 'controllers/locationController.js'));
const profileController = require(path.join(backendDist, 'controllers/profileController.js'));
const registrationController = require(path.join(backendDist, 'controllers/registrationController.js'));
const registrationRoutes = require(path.join(backendDist, 'routes/registrationRoutes.js')).default || require(path.join(backendDist, 'routes/registrationRoutes.js'));
let jwt;
try {
  jwt = require('jsonwebtoken');
} catch {
  jwt = require(path.join(backendDist, '../node_modules/jsonwebtoken'));
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

async function test(name, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined but got ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected defined value but got undefined`);
      }
    },
    toContain(item) {
      if (!Array.isArray(actual) && typeof actual !== 'string') {
        throw new Error(`Expected array or string to check containment`);
      }
      if (!actual.includes(item)) {
        throw new Error(`Expected to contain ${JSON.stringify(item)}`);
      }
    },
    toNotContain(item) {
      if (actual.includes(item)) {
        throw new Error(`Expected NOT to contain ${JSON.stringify(item)}`);
      }
    }
  };
}

async function runTestSuite() {
  console.log('=============================================================================');
  console.log('   WONDERFUL JODI — REGISTRATION IMPROVEMENTS VERIFICATION SUITE   ');
  console.log('=============================================================================\n');

  // =========================================================================
  // 1. ANNUAL INCOME VERIFICATION
  // =========================================================================
  console.log('1. Annual Income Suite:');

  await test('1.1 Allows empty string when optional (no auto-selected default)', () => {
    const res = doctorValidation.validateAnnualIncome('');
    expect(res.isValid).toBe(true);
  });

  await test('1.2 Allows null and undefined when optional', () => {
    expect(doctorValidation.validateAnnualIncome(null).isValid).toBe(true);
    expect(doctorValidation.validateAnnualIncome(undefined).isValid).toBe(true);
  });

  await test('1.3 ANNUAL_INCOME_OPTIONS contains "Below ₹5 Lakh"', () => {
    expect(doctorValidation.ANNUAL_INCOME_OPTIONS).toContain('Below ₹5 Lakh');
  });

  await test('1.4 Validates "Below ₹5 Lakh" as valid range', () => {
    const res = doctorValidation.validateAnnualIncome('Below ₹5 Lakh');
    expect(res.isValid).toBe(true);
  });

  await test('1.5 Accepts all standard annual income options', () => {
    const standards = [
      '₹ 5 - 10 Lakhs',
      '₹ 10 - 15 Lakhs',
      '₹ 15 - 25 Lakhs',
      '₹ 25 - 35 Lakhs',
      '₹ 35 - 50 Lakhs',
      '₹ 50 Lakhs - 1 Crore',
      '₹ 1 Crore+'
    ];
    for (const opt of standards) {
      expect(doctorValidation.validateAnnualIncome(opt).isValid).toBe(true);
    }
  });

  await test('1.6 Accepts legacy database ranges for backward compatibility (₹ 40 - 55 Lakhs, ₹ 50 - 75 Lakhs)', () => {
    expect(doctorValidation.validateAnnualIncome('₹ 40 - 55 Lakhs').isValid).toBe(true);
    expect(doctorValidation.validateAnnualIncome('₹ 50 - 75 Lakhs').isValid).toBe(true);
  });

  await test('1.7 Rejects invalid non-income strings', () => {
    expect(doctorValidation.validateAnnualIncome('Below 50k').isValid).toBe(false);
    expect(doctorValidation.validateAnnualIncome('100000').isValid).toBe(false);
    expect(doctorValidation.validateAnnualIncome('Arbitrary Text').isValid).toBe(false);
  });


  // =========================================================================
  // 2. HEIGHT SELECTOR & NORMALIZATION
  // =========================================================================
  console.log('\n2. Height Selector & Normalization Suite:');

  await test('2.1 Includes required height range bounds (2.1 to 7.10, plus 8+)', () => {
    expect(doctorValidation.HEIGHT_RAW_VALUES).toContain('2.1');
    expect(doctorValidation.HEIGHT_RAW_VALUES).toContain('7.10');
    expect(doctorValidation.HEIGHT_RAW_VALUES).toContain('8+');
  });

  await test('2.2 Distinguishes 5.10 (5 ft 10 in) from 5.1 (5 ft 1 in) and normalizes properly', () => {
    const display10 = doctorValidation.formatHeightDisplay('5.10');
    const display1 = doctorValidation.formatHeightDisplay('5.1');
    expect(display10).toBe('5′ 10″');
    expect(display1).toBe('5′ 1″');
    if (display10 === display1) throw new Error('5.10 must not be treated as 5.1');
  });

  await test('2.3 Normalizes comma separated height format ("3,2" -> "3′ 2″")', () => {
    expect(doctorValidation.formatHeightDisplay('3,2')).toBe('3′ 2″');
  });

  await test('2.4 Normalizes standard decimal notation ("5.2" -> "5′ 2″")', () => {
    expect(doctorValidation.formatHeightDisplay('5.2')).toBe('5′ 2″');
  });

  await test('2.5 Normalizes 8+ format to readable display ("8+" -> "8′+")', () => {
    expect(doctorValidation.formatHeightDisplay('8+')).toBe('8′+');
  });

  await test('2.6 Preserves and formats legacy ASCII quote heights ("5\' 6\\"" -> "5′ 6″")', () => {
    expect(doctorValidation.formatHeightDisplay("5' 6\"")).toBe('5′ 6″');
  });

  await test('2.7 Preserves and formats legacy ASCII quote heights ("6\' 0\\"" -> "6′ 0″")', () => {
    expect(doctorValidation.formatHeightDisplay("6' 0\"")).toBe('6′ 0″');
  });

  await test('2.8 Normalizes text height format ("5 ft 10 in" -> "5′ 10″")', () => {
    expect(doctorValidation.formatHeightDisplay("5 ft 10 in")).toBe('5′ 10″');
  });

  await test('2.9 validateHeight accepts valid height representations and rejects empty', () => {
    expect(doctorValidation.validateHeight('5.10').isValid).toBe(true);
    expect(doctorValidation.validateHeight("5' 6\"").isValid).toBe(true);
    expect(doctorValidation.validateHeight('').isValid).toBe(false);
    expect(doctorValidation.validateHeight(null).isValid).toBe(false);
  });


  // =========================================================================
  // 3. DOCTOR EDUCATION STRUCTURE
  // =========================================================================
  console.log('\n3. Doctor Education Structure Suite:');

  await test('3.1 Supported UG qualifications match reference (MBBS, BDS, BAMS, BHMS, BUMS, BSMS, BNYS)', () => {
    const expectedUG = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS'];
    for (const ug of expectedUG) {
      expect(doctorValidation.UG_MEDICAL_QUALIFICATIONS).toContain(ug);
    }
  });

  await test('3.2 Supported PG qualifications match reference (MD, MS, MDS, DNB)', () => {
    const expectedPG = ['MD', 'MS', 'MDS', 'DNB'];
    for (const pg of expectedPG) {
      expect(doctorValidation.PG_MEDICAL_QUALIFICATIONS).toContain(pg);
    }
  });

  await test('3.3 Supported Doctorate qualifications match reference (DM, MCh, DrNB)', () => {
    const expectedDoc = ['DM', 'MCh', 'DrNB'];
    for (const doc of expectedDoc) {
      expect(doctorValidation.DOCTORATE_MEDICAL_QUALIFICATIONS).toContain(doc);
    }
  });

  await test('3.4 MD and MS specializations list contains key clinical specialties', () => {
    expect(doctorValidation.MD_SPECIALIZATIONS).toContain('General Medicine');
    expect(doctorValidation.MD_SPECIALIZATIONS).toContain('Paediatrics');
    expect(doctorValidation.MS_SPECIALIZATIONS).toContain('General Surgery');
    expect(doctorValidation.MS_SPECIALIZATIONS).toContain('Orthopaedics');
  });

  await test('3.5 MDS specializations list includes Orthodontics', () => {
    const hasOrtho = doctorValidation.MDS_SPECIALIZATIONS.some(s => s.toLowerCase().includes('orthodontics'));
    expect(hasOrtho).toBe(true);
  });

  await test('3.6 Super-speciality pathways map PG to DM / MCh specialities (Cardiology, Neurosurgery)', () => {
    expect(doctorValidation.ALL_SUPER_SPECIALIZATIONS).toContain('Cardiology');
    expect(doctorValidation.ALL_SUPER_SPECIALIZATIONS).toContain('Neurosurgery');
    expect(doctorValidation.SUPER_SPECIALITY_PATHWAYS['General Medicine'].specialities).toContain('Cardiology');
    expect(doctorValidation.SUPER_SPECIALITY_PATHWAYS['General Surgery'].specialities).toContain('Neurosurgery');
  });


  // =========================================================================
  // 4. COMPLETION YEARS DYNAMICS & VALIDATION
  // =========================================================================
  console.log('\n4. Completion Years Dynamics & Validation Suite:');

  await test('4.1 Accepts valid chronological sequence (UG 2015 -> PG 2018 -> Doctorate 2021)', () => {
    const res = doctorValidation.validateDegreeYearSequence(2015, 2018, 2021);
    expect(res.isValid).toBe(true);
  });

  await test('4.2 Accepts UG qualification alone without PG or Doctorate', () => {
    const res = doctorValidation.validateDegreeYearSequence(2020, undefined, undefined);
    expect(res.isValid).toBe(true);
  });

  await test('4.3 Accepts UG and PG without Doctorate', () => {
    const res = doctorValidation.validateDegreeYearSequence(2017, 2020, undefined);
    expect(res.isValid).toBe(true);
  });

  await test('4.4 Rejects invalid backward chronology where PG year is before UG year', () => {
    const res = doctorValidation.validateDegreeYearSequence(2018, 2016, undefined);
    expect(res.isValid).toBe(false);
  });

  await test('4.5 Rejects invalid backward chronology where Doctorate year is before PG year', () => {
    const res = doctorValidation.validateDegreeYearSequence(2015, 2019, 2018);
    expect(res.isValid).toBe(false);
  });


  // =========================================================================
  // 5. CASCADING LOCATION HIERARCHY & HQ FALLBACK
  // =========================================================================
  console.log('\n5. Cascading Location Hierarchy & HQ Fallback Suite:');

  await test('5.1 validateLocationHierarchy rejects invalid ObjectId syntax', async () => {
    const res = await locationController.validateLocationHierarchy({ stateId: 'not-a-valid-id' });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Invalid stateId');
  });

  await test('5.2 validateLocationHierarchy handles district HQ fallback prefix ("hq-<districtId>") safely', async () => {
    const fakeDistrictId = '507f1f77bcf86cd799439011';
    const res = await locationController.validateLocationHierarchy({
      districtId: fakeDistrictId,
      cityId: `hq-${fakeDistrictId}`
    });
    // Expected to safely check District without crashing on city lookup
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('District not found');
  });

  await test('5.3 validateLocationHierarchy handles direct district ID as fallback cityId safely', async () => {
    const fakeDistrictId = '507f1f77bcf86cd799439011';
    const res = await locationController.validateLocationHierarchy({
      districtId: fakeDistrictId,
      cityId: fakeDistrictId
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('District not found');
  });


  // =========================================================================
  // 6. PROFILE PRIVACY - THREE ACCESS TIERS & SERIALIZATION
  // =========================================================================
  console.log('\n6. Profile Privacy - Three Access Tiers Suite:');

  const candidateProfile = {
    _id: '507f1f77bcf86cd799439020',
    id: '507f1f77bcf86cd799439020',
    candidateId: 'WJ-204910',
    firstName: 'Sneha',
    lastName: 'Kulkarni',
    displayName: 'Dr. Sneha Kulkarni',
    gender: 'Female',
    height: '5.4',
    annualIncome: '₹ 25 - 35 Lakhs',
    state: 'Maharashtra',
    city: 'Mumbai',
    company: 'Lilavati Hospital',
    currentHospital: 'Lilavati Hospital',
    medicalRegistrationNumber: 'MMC-2016-12345',
    medicalCollege: 'Seth GS Medical College (KEM)',
    medicalUniversity: 'MUHS',
    user: {
      _id: '507f1f77bcf86cd799439021',
      id: '507f1f77bcf86cd799439021',
      mobile: '+919876543210',
      email: 'dr.sneha@example.com',
      fullName: 'Sneha Kulkarni'
    },
    medicalQualifications: {
      undergraduate: [
        { qualification: 'MBBS', college: 'Seth GS Medical College', completionYear: '2016' }
      ],
      postgraduate: [
        { qualification: 'MD', specialization: 'Paediatrics', college: 'KEM Hospital Mumbai', completionYear: '2019' }
      ],
      doctorate: [
        { qualification: 'DM', specialization: 'Neonatology', college: 'PGI Chandigarh', completionYear: '2022' }
      ]
    }
  };

  // --- TIER 1: PUBLIC VISITOR (Unauthenticated) ---
  await test('6.1 Tier 1 (Public Visitor): displays Candidate ID and masks all name fields to null', () => {
    const tier1 = securityUtils.serializePublicProfile(candidateProfile, { isAuthenticatedViewer: false });
    expect(tier1.candidateId).toBe('WJ-204910');
    expect(tier1.displayName).toBe(null);
    expect(tier1.firstName).toBe(null);
    expect(tier1.lastName).toBe(null);
    expect(tier1.fullName).toBe(null);
  });

  await test('6.2 Tier 1 (Public Visitor): masks legacy medicalCollege and medicalUniversity to undefined', () => {
    const tier1 = securityUtils.serializePublicProfile(candidateProfile, { isAuthenticatedViewer: false });
    expect(tier1.medicalCollege).toBeUndefined();
    expect(tier1.medicalUniversity).toBeUndefined();
  });

  await test('6.3 Tier 1 (Public Visitor): displays medical degrees and years while masking colleges/institutions', () => {
    const tier1 = securityUtils.serializePublicProfile(candidateProfile, { isAuthenticatedViewer: false });
    const medQuals = tier1.medicalQualifications;
    expect(medQuals.undergraduate[0].qualification).toBe('MBBS');
    expect(medQuals.undergraduate[0].completionYear).toBe('2016');
    expect(medQuals.undergraduate[0].college).toBeUndefined();

    expect(medQuals.postgraduate[0].qualification).toBe('MD');
    expect(medQuals.postgraduate[0].specialization).toBe('Paediatrics');
    expect(medQuals.postgraduate[0].college).toBeUndefined();

    expect(medQuals.doctorate[0].qualification).toBe('DM');
    expect(medQuals.doctorate[0].specialization).toBe('Neonatology');
    expect(medQuals.doctorate[0].college).toBeUndefined();
  });

  await test('6.4 Tier 1 (Public Visitor): masks annual income, workplace, registration number, and contact details', () => {
    const tier1 = securityUtils.serializePublicProfile(candidateProfile, { isAuthenticatedViewer: false });
    expect(tier1.annualIncome).toBeUndefined();
    expect(tier1.company).toBeUndefined();
    expect(tier1.currentHospital).toBeUndefined();
    expect(tier1.medicalRegistrationNumber).toBeUndefined();
    expect(tier1.contactDetails).toBeUndefined();
  });

  // --- TIER 2: LOGGED-IN FREE MEMBER ---
  await test('6.5 Tier 2 (Logged-in Free Member): reveals Doctor Title + First Name while strictly hiding surname', () => {
    const tier2 = securityUtils.serializePublicProfile(candidateProfile, {
      isAuthenticatedViewer: true,
      isContactUnlocked: false
    });
    expect(tier2.candidateId).toBe('WJ-204910');
    expect(tier2.displayName).toBe('Dr. Sneha');
    expect(tier2.firstName).toBe('Sneha');
    expect(tier2.lastName).toBe(null);
    expect(tier2.fullName).toBe(null);
  });

  await test('6.6 Tier 2 (Logged-in Free Member): reveals medical college and institution details to verified members', () => {
    const tier2 = securityUtils.serializePublicProfile(candidateProfile, {
      isAuthenticatedViewer: true,
      isContactUnlocked: false
    });
    expect(tier2.medicalCollege).toBe('Seth GS Medical College (KEM)');
    expect(tier2.medicalQualifications.undergraduate[0].college).toBe('Seth GS Medical College');
    expect(tier2.medicalQualifications.postgraduate[0].college).toBe('KEM Hospital Mumbai');
    expect(tier2.medicalQualifications.doctorate[0].college).toBe('PGI Chandigarh');
  });

  await test('6.7 Tier 2 (Logged-in Free Member): protects contact details and annual income until unlocked', () => {
    const tier2 = securityUtils.serializePublicProfile(candidateProfile, {
      isAuthenticatedViewer: true,
      isContactUnlocked: false
    });
    expect(tier2.annualIncome).toBeUndefined();
    expect(tier2.company).toBeUndefined();
    expect(tier2.currentHospital).toBeUndefined();
    expect(tier2.contactDetails).toBeUndefined();
    expect(typeof tier2.contactPrivacyMessage).toBe('string');
  });

  // --- TIER 3: PAID UNLOCKED MEMBER ---
  await test('6.8 Tier 3 (Paid Member / Unlocked): reveals full contact details and annual income', () => {
    const tier3 = securityUtils.serializePublicProfile(candidateProfile, {
      isAuthenticatedViewer: true,
      isContactUnlocked: true
    });
    expect(tier3.annualIncome).toBe('₹ 25 - 35 Lakhs');
    expect(tier3.company).toBe('Lilavati Hospital');
    expect(tier3.currentHospital).toBe('Lilavati Hospital');
    expect(tier3.medicalRegistrationNumber).toBe('MMC-2016-12345');
    expect(tier3.contactDetails.mobile).toBe('+919876543210');
    expect(tier3.contactDetails.email).toBe('dr.sneha@example.com');
  });

  // --- BACKWARD COMPATIBILITY: LEGACY SCHEMA ---
  await test('6.9 Backward Compatibility: supports legacy object format { ug, pg, superSpeciality } and alternative year keys', () => {
    const legacyProfile = {
      ...candidateProfile,
      medicalQualifications: {
        ug: { qualification: 'MBBS', college: 'Grant Medical College', year: '2014' },
        pg: { qualification: 'MS', specialization: 'General Surgery', college: 'KEM Hospital', passingYear: '2017' },
        superSpeciality: { qualification: 'MCh', specialization: 'Neurosurgery', college: 'NIMHANS', completionYear: '2020' }
      }
    };
    const serialized = securityUtils.serializePublicProfile(legacyProfile, { isAuthenticatedViewer: true });
    expect(serialized.medicalQualifications.undergraduate[0].qualification).toBe('MBBS');
    expect(serialized.medicalQualifications.undergraduate[0].completionYear).toBe('2014');
    expect(serialized.medicalQualifications.postgraduate[0].qualification).toBe('MS');
    expect(serialized.medicalQualifications.postgraduate[0].completionYear).toBe('2017');
    expect(serialized.medicalQualifications.doctorate[0].qualification).toBe('MCh');
    expect(serialized.medicalQualifications.doctorate[0].specialization).toBe('Neurosurgery');
  });

  // =========================================================================
  // 7. PROFILE CREATION FALLBACK AUDIT & FIX VERIFICATION
  // =========================================================================
  console.log('\n7. Profile Creation Fallback Audit Suite:');

  await test('7.1 updateMyProfile rejects when profile does not exist (returns 404, does not fabricate details)', async () => {
    const fakeUserId = '507f1f77bcf86cd799439099';
    const req = {
      user: { userId: fakeUserId },
      body: { motherTongue: 'Hindi' }
    };
    let responseStatus = 200;
    let responseJson = null;
    const res = {
      status(code) { responseStatus = code; return this; },
      json(data) { responseJson = data; return this; }
    };

    await profileController.updateMyProfile(req, res, (err) => { if (err) throw err; });

    expect(responseStatus).toBe(404);
    expect(responseJson.success).toBe(false);
    expect(responseJson.message).toBe('Profile not found. Please complete profile registration first.');
  });

  await test('7.2 updateMyProfile preserves legitimate update controller flow definition', () => {
    expect(typeof profileController.updateMyProfile).toBe('function');
  });

  // =========================================================================
  // 8. REGISTRATION DRAFT AUTHORIZATION & SECURITY AUDIT SUITE
  // =========================================================================
  console.log('\n8. Registration Draft Authorization Security Suite:');

  const { Registration } = require(path.join(backendDist, 'models/Registration.js'));
  const { User } = require(path.join(backendDist, 'models/User.js'));
  const { Profile } = require(path.join(backendDist, 'models/Profile.js'));

  function mockReqRes(options = {}) {
    let statusCode = 200;
    let jsonData = null;
    const req = {
      params: options.params || {},
      query: options.query || {},
      headers: options.headers || {},
      body: options.body || {},
      socket: {},
      cookies: options.cookies || {},
      user: options.user || undefined,
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonData = data;
        return this;
      },
    };
    return {
      req,
      res,
      getStatus: () => statusCode,
      getJson: () => jsonData,
    };
  }

  let draftA_Id = null;
  let draftA_Token = null;
  const mockEmailA = `synth.alpha.${Date.now()}@example.test`;
  const mockMobileA = '98' + Math.floor(10000000 + Math.random() * 90000000);

  let draftB_Id = null;
  let draftB_Token = null;
  const mockEmailB = `synth.beta.${Date.now()}@example.test`;
  const mockMobileB = '97' + Math.floor(10000000 + Math.random() * 90000000);

  let createdUserIdA = null;

  await test('8.1 startRegistration generates cryptographically secure 64-char hex resumeTokens for distinct users', async () => {
    // User A draft
    const m1 = mockReqRes({
      body: {
        fullName: 'Dr. Synthetic Alpha',
        email: mockEmailA,
        mobile: mockMobileA,
        password: 'Password123!',
        gender: 'Female',
        dob: '1995-05-15',
        agreeTerms: true,
      },
    });
    await registrationController.startRegistration(m1.req, m1.res, (err) => { if (err) throw err; });
    expect(m1.getStatus()).toBe(201);
    expect(m1.getJson().success).toBe(true);
    draftA_Id = m1.getJson().data.registrationId;
    draftA_Token = m1.getJson().data.resumeToken;
    expect(typeof draftA_Id).toBe('string');
    expect(typeof draftA_Token).toBe('string');
    expect(draftA_Token.length).toBe(64);

    // User B draft
    const m2 = mockReqRes({
      body: {
        fullName: 'Dr. Synthetic Beta',
        email: mockEmailB,
        mobile: mockMobileB,
        password: 'Password123!',
        gender: 'Male',
        dob: '1994-04-14',
        agreeTerms: true,
      },
    });
    await registrationController.startRegistration(m2.req, m2.res, (err) => { if (err) throw err; });
    expect(m2.getStatus()).toBe(201);
    expect(m2.getJson().success).toBe(true);
    draftB_Id = m2.getJson().data.registrationId;
    draftB_Token = m2.getJson().data.resumeToken;
    expect(typeof draftB_Id).toBe('string');
    expect(typeof draftB_Token).toBe('string');
    expect(draftB_Token.length).toBe(64);
    expect(draftA_Token !== draftB_Token).toBe(true);
  });

  await test('8.2 Valid token can resume and retrieve its own draft session (never returning resumeToken in response)', async () => {
    const m = mockReqRes({
      params: { registrationId: draftA_Id },
      headers: { 'x-resume-token': draftA_Token },
    });
    await registrationController.getRegistrationById(m.req, m.res, (err) => { if (err) throw err; });
    expect(m.getStatus()).toBe(200);
    expect(m.getJson().success).toBe(true);
    expect(m.getJson().data.registrationId).toBe(draftA_Id);
    expect(m.getJson().data.email).toBe(mockEmailA);
    expect(m.getJson().data.resumeToken).toBeUndefined();
  });

  await test('8.3 Valid token can update its own draft via saveStep', async () => {
    const m = mockReqRes({
      headers: { 'x-resume-token': draftA_Token },
      body: {
        registrationId: draftA_Id,
        stepNumber: 2,
        section: 'personalInfo',
        data: {
          city: 'Nagpur',
          religion: 'Hindu',
          maritalStatus: 'Never Married',
          state: 'Maharashtra',
          height: '5.6',
        },
      },
    });
    await registrationController.saveStep(m.req, m.res, (err) => { if (err) throw err; });
    expect(m.getStatus()).toBe(200);
    expect(m.getJson().success).toBe(true);
    expect(m.getJson().data.stepData.personalInfo.city).toBe('Nagpur');
    expect(m.getJson().data.resumeToken).toBeUndefined();
  });

  await test('8.4 Missing token is rejected with HTTP 401 across all draft endpoints', async () => {
    // getRegistrationById
    const mGet = mockReqRes({ params: { registrationId: draftA_Id } });
    await registrationController.getRegistrationById(mGet.req, mGet.res, (err) => { if (err) throw err; });
    expect(mGet.getStatus()).toBe(401);
    expect(mGet.getJson().code).toBe('RESUME_TOKEN_REQUIRED');

    // saveStep
    const mSave = mockReqRes({
      body: { registrationId: draftA_Id, stepNumber: 2, section: 'personalInfo', data: { city: 'Pune' } },
    });
    await registrationController.saveStep(mSave.req, mSave.res, (err) => { if (err) throw err; });
    expect(mSave.getStatus()).toBe(401);
    expect(mSave.getJson().code).toBe('RESUME_TOKEN_REQUIRED');

    // autoSave
    const mAuto = mockReqRes({
      body: { registrationId: draftA_Id, section: 'personalInfo', data: { city: 'Pune' } },
    });
    await registrationController.autoSave(mAuto.req, mAuto.res, (err) => { if (err) throw err; });
    expect(mAuto.getStatus()).toBe(401);
    expect(mAuto.getJson().code).toBe('RESUME_TOKEN_REQUIRED');

    // validateRegistrationDraft
    const mVal = mockReqRes({ params: { registrationId: draftA_Id } });
    await registrationController.validateRegistrationDraft(mVal.req, mVal.res, (err) => { if (err) throw err; });
    expect(mVal.getStatus()).toBe(401);
    expect(mVal.getJson().code).toBe('RESUME_TOKEN_REQUIRED');

    // completeRegistration
    const mComp = mockReqRes({ body: { registrationId: draftA_Id } });
    await registrationController.completeRegistration(mComp.req, mComp.res, (err) => { if (err) throw err; });
    expect(mComp.getStatus()).toBe(401);
    expect(mComp.getJson().code).toBe('RESUME_TOKEN_REQUIRED');
  });

  await test('8.5 Incorrect or malformed token is rejected with HTTP 403', async () => {
    const wrongToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const mGet = mockReqRes({
      params: { registrationId: draftA_Id },
      headers: { 'x-resume-token': wrongToken },
    });
    await registrationController.getRegistrationById(mGet.req, mGet.res, (err) => { if (err) throw err; });
    expect(mGet.getStatus()).toBe(403);
    expect(mGet.getJson().code).toBe('INVALID_RESUME_TOKEN');

    const mSave = mockReqRes({
      headers: { 'x-resume-token': 'bad_token' },
      body: { registrationId: draftA_Id, stepNumber: 2, section: 'personalInfo', data: { city: 'Nashik' } },
    });
    await registrationController.saveStep(mSave.req, mSave.res, (err) => { if (err) throw err; });
    expect(mSave.getStatus()).toBe(403);
    expect(mSave.getJson().code).toBe('INVALID_RESUME_TOKEN');
  });

  await test("8.6 A different user's token is rejected with HTTP 403 (Cross-User BOLA protection)", async () => {
    // User B tries to read User A's draft using User B's token
    const mGet = mockReqRes({
      params: { registrationId: draftA_Id },
      headers: { 'x-resume-token': draftB_Token },
    });
    await registrationController.getRegistrationById(mGet.req, mGet.res, (err) => { if (err) throw err; });
    expect(mGet.getStatus()).toBe(403);
    expect(mGet.getJson().code).toBe('INVALID_RESUME_TOKEN');

    // User B tries to mutate User A's draft using User B's token
    const mSave = mockReqRes({
      headers: { 'x-resume-token': draftB_Token },
      body: { registrationId: draftA_Id, stepNumber: 2, section: 'personalInfo', data: { city: 'HackedCity' } },
    });
    await registrationController.saveStep(mSave.req, mSave.res, (err) => { if (err) throw err; });
    expect(mSave.getStatus()).toBe(403);
    expect(mSave.getJson().code).toBe('INVALID_RESUME_TOKEN');

    // Confirm Draft A data was NOT modified by unauthorized caller
    const checkA = await Registration.findOne({ registrationId: draftA_Id });
    expect(checkA.stepData.personalInfo.city).toBe('Nagpur');
  });

  await test('8.7 Registration ID alone cannot retrieve sensitive draft data', async () => {
    const m = mockReqRes({
      params: { registrationId: draftA_Id },
      headers: {},
      body: {},
    });
    await registrationController.getRegistrationById(m.req, m.res, (err) => { if (err) throw err; });
    expect(m.getStatus()).toBe(401);
    expect(m.getJson().data).toBeUndefined();
  });

  await test('8.8 Unauthorized auto-save and draft validation are rejected', async () => {
    // autoSave with wrong token
    const mAuto = mockReqRes({
      headers: { 'x-resume-token': draftB_Token },
      body: { registrationId: draftA_Id, section: 'personalInfo', data: { city: 'UnauthCity' } },
    });
    await registrationController.autoSave(mAuto.req, mAuto.res, (err) => { if (err) throw err; });
    expect(mAuto.getStatus()).toBe(403);
    expect(mAuto.getJson().code).toBe('INVALID_RESUME_TOKEN');

    // validateRegistrationDraft with wrong token
    const mVal = mockReqRes({
      params: { registrationId: draftA_Id },
      headers: { 'x-resume-token': draftB_Token },
    });
    await registrationController.validateRegistrationDraft(mVal.req, mVal.res, (err) => { if (err) throw err; });
    expect(mVal.getStatus()).toBe(403);
    expect(mVal.getJson().code).toBe('INVALID_RESUME_TOKEN');
  });

  await test('8.9 Duplicate startRegistration without matching resumeToken returns HTTP 409 and does not leak token', async () => {
    // Attacker tries to start registration with victim's email without token
    const mAttacker = mockReqRes({
      body: {
        fullName: 'Attacker Impersonator',
        email: mockEmailA,
        mobile: mockMobileA,
        dob: '1995-05-15',
        agreeTerms: true,
      },
    });
    await registrationController.startRegistration(mAttacker.req, mAttacker.res, (err) => { if (err) throw err; });
    expect(mAttacker.getStatus()).toBe(409);
    expect(mAttacker.getJson().code).toBe('DRAFT_ALREADY_EXISTS');
    expect(mAttacker.getJson().data).toBeUndefined();

    // Legitimate user resumes with token
    const mLegit = mockReqRes({
      headers: { 'x-resume-token': draftA_Token },
      body: {
        fullName: 'Dr. Synthetic Alpha Updated',
        email: mockEmailA,
        mobile: mockMobileA,
        dob: '1995-05-15',
        agreeTerms: true,
      },
    });
    await registrationController.startRegistration(mLegit.req, mLegit.res, (err) => { if (err) throw err; });
    expect(mLegit.getStatus()).toBe(201);
    expect(mLegit.getJson().success).toBe(true);
  });

  await test('8.10 Unauthorized completion cannot create an account or issue a JWT', async () => {
    // Attacker attempts to complete victim's draft
    const mCompleteUnauth = mockReqRes({
      headers: { 'x-resume-token': draftB_Token },
      body: {
        registrationId: draftA_Id,
        finalData: { password: 'HackedPassword123!' },
      },
    });
    await registrationController.completeRegistration(mCompleteUnauth.req, mCompleteUnauth.res, (err) => { if (err) throw err; });
    expect(mCompleteUnauth.getStatus()).toBe(403);
    expect(mCompleteUnauth.getJson().code).toBe('INVALID_RESUME_TOKEN');
    expect(mCompleteUnauth.getJson().token).toBeUndefined();

    // Verify no user account was created in User collection for victim email
    const existingUser = await User.findOne({ email: mockEmailA.toLowerCase() });
    expect(existingUser).toBe(null);
  });

  await test('8.11 Legitimate completion with valid token creates User and Profile and issues JWT', async () => {
    // Save Step 3 (education & profession)
    const mStep3 = mockReqRes({
      headers: { 'x-resume-token': draftA_Token },
      body: {
        registrationId: draftA_Id,
        stepNumber: 3,
        section: 'educationProfession',
        data: {
          education: 'MBBS',
          degree: 'MBBS',
          profession: 'General Physician',
          annualIncome: '15-25 Lakhs',
        },
      },
    });
    await registrationController.saveStep(mStep3.req, mStep3.res, (err) => { if (err) throw err; });
    expect(mStep3.getStatus()).toBe(200);

    // Save Step 4 (preferences & expectations)
    const mStep4 = mockReqRes({
      headers: { 'x-resume-token': draftA_Token },
      body: {
        registrationId: draftA_Id,
        stepNumber: 4,
        section: 'preferences',
        data: {
          lookingFor: 'Male',
          prefAgeMin: '25',
          prefAgeMax: '35',
        },
      },
    });
    await registrationController.saveStep(mStep4.req, mStep4.res, (err) => { if (err) throw err; });
    expect(mStep4.getStatus()).toBe(200);

    // Complete registration with valid token
    const mComplete = mockReqRes({
      headers: { 'x-resume-token': draftA_Token },
      body: {
        registrationId: draftA_Id,
        finalData: {
          password: 'Password123!',
          qualification: 'MBBS',
          profession: 'General Physician',
        },
      },
    });
    await registrationController.completeRegistration(mComplete.req, mComplete.res, (err) => { if (err) throw err; });
    expect(mComplete.getStatus()).toBe(201);
    expect(mComplete.getJson().success).toBe(true);
    expect(typeof mComplete.getJson().token).toBe('string');
    expect(mComplete.getJson().data.user.email).toBe(mockEmailA.toLowerCase());

    createdUserIdA = mComplete.getJson().data.user.id || mComplete.getJson().data.user._id;
    expect(Boolean(createdUserIdA)).toBe(true);

    // Verify registration status is marked COMPLETED
    const completedReg = await Registration.findOne({ registrationId: draftA_Id });
    expect(completedReg.status).toBe('COMPLETED');
  });

  await test('8.12 Completed draft cannot be mutated or re-completed', async () => {
    const mSave = mockReqRes({
      headers: { 'x-resume-token': draftA_Token },
      body: { registrationId: draftA_Id, stepNumber: 2, section: 'personalInfo', data: { city: 'Mumbai' } },
    });
    await registrationController.saveStep(mSave.req, mSave.res, (err) => { if (err) throw err; });
    expect(mSave.getStatus()).toBe(400);
    expect(mSave.getJson().code).toBe('ALREADY_COMPLETED');

    const mComplete = mockReqRes({
      headers: { 'x-resume-token': draftA_Token },
      body: { registrationId: draftA_Id },
    });
    await registrationController.completeRegistration(mComplete.req, mComplete.res, (err) => { if (err) throw err; });
    expect(mComplete.getStatus()).toBe(400);
    expect(mComplete.getJson().code).toBe('ALREADY_COMPLETED');
  });

  await test('8.13 Legitimate existing profile editing works for completed user without fabrications', async () => {
    const mEdit = mockReqRes({
      user: { userId: String(createdUserIdA) },
      body: {
        aboutMe: 'Updated bio for completed doctor profile.',
        annualIncome: '25-35 Lakhs',
      },
    });
    await profileController.updateMyProfile(mEdit.req, mEdit.res, (err) => { if (err) throw err; });
    expect(mEdit.getStatus()).toBe(200);
    expect(mEdit.getJson().success).toBe(true);
    expect(mEdit.getJson().data?.aboutMe || mEdit.getJson().profile?.aboutMe).toBe('Updated bio for completed doctor profile.');
  });

  await test('8.14 Profile update returns 404 when profile is missing and does not fabricate personal information', async () => {
    const fakeUserId = '507f1f77bcf86cd799439099';
    const mFake = mockReqRes({
      user: { userId: fakeUserId },
      body: { aboutMe: 'Fabricated bio attempt' },
    });
    await profileController.updateMyProfile(mFake.req, mFake.res, (err) => { if (err) throw err; });
    expect(mFake.getStatus()).toBe(404);
    expect(mFake.getJson().success).toBe(false);
    expect(mFake.getJson().message).toBe('Profile not found. Please complete profile registration first.');

    // Ensure zero records were created in Profile database
    const fakeProfile = await Profile.findOne({ user: fakeUserId });
    expect(fakeProfile).toBe(null);
  });

  await test('8.15 Clean up all synthetic test registration, user, and profile records from database', async () => {
    if (draftA_Id) await Registration.deleteOne({ registrationId: draftA_Id });
    if (draftB_Id) await Registration.deleteOne({ registrationId: draftB_Id });
    if (createdUserIdA) {
      await User.deleteOne({ _id: createdUserIdA });
      await Profile.deleteOne({ user: createdUserIdA });
    }

    const regA = await Registration.findOne({ registrationId: draftA_Id });
    const regB = await Registration.findOne({ registrationId: draftB_Id });
    expect(regA).toBe(null);
    expect(regB).toBe(null);
  });

  // =========================================================================
  // 9. SECURITY FOLLOW-UP: URL-TOKEN REMOVAL & INCOMPLETE COUNT ACCESS CONTROL
  // =========================================================================
  console.log('\n9. Security Follow-Up Suite (URL Token Removal & Admin Count Route Access Control):');

  await test('9.1 frontend/services/registrationApi.ts does not send resume tokens in URL query parameters', () => {
    const apiFile = path.resolve(__dirname, '../frontend/services/registrationApi.ts');
    const apiContent = fs.existsSync(apiFile)
      ? fs.readFileSync(apiFile, 'utf8')
      : fs.readFileSync(path.resolve('C:/Users/rushi/Downloads/wonderfull-Jodi-Platform-Main-Github/wonderfull-Jodi-Platform-Main-main/frontend/services/registrationApi.ts'), 'utf8');

    // Ensure getRegistrationSession does not append ?resumeToken=
    expect(apiContent.includes('/registration/${encodeURIComponent(registrationId)}`')).toBe(true);
    expect(apiContent.includes('?resumeToken=')).toBe(false);

    // Ensure validateRegistrationSession does not append ?resumeToken=
    expect(apiContent.includes('/registration/${encodeURIComponent(registrationId)}/validate`')).toBe(true);

    // Ensure x-resume-token header is attached
    expect(apiContent.includes("headers['x-resume-token'] = token")).toBe(true);
  });

  await test('9.2 frontend/app/register/page.tsx safely extracts URL token, persists to storage, and strips sensitive token from address bar', () => {
    const pageFile = path.resolve(__dirname, '../frontend/app/register/page.tsx');
    const pageContent = fs.existsSync(pageFile)
      ? fs.readFileSync(pageFile, 'utf8')
      : fs.readFileSync(path.resolve('C:/Users/rushi/Downloads/wonderfull-Jodi-Platform-Main-Github/wonderfull-Jodi-Platform-Main-main/frontend/app/register/page.tsx'), 'utf8');

    // Ensure token is extracted and set to state and storage
    expect(pageContent.includes("searchParams.get('token') || searchParams.get('resumeToken')")).toBe(true);
    expect(pageContent.includes('setStoredResumeToken(savedToken)')).toBe(true);
    expect(pageContent.includes('setResumeToken(savedToken)')).toBe(true);

    // Ensure sensitive query parameters are stripped from address bar promptly
    expect(pageContent.includes("url.searchParams.delete('token')")).toBe(true);
    expect(pageContent.includes("url.searchParams.delete('resumeToken')")).toBe(true);
    expect(pageContent.includes('window.history.replaceState')).toBe(true);

    // Ensure no token logging in console
    expect(pageContent.includes('console.log(tokenParam')).toBe(false);
    expect(pageContent.includes('console.log(savedToken')).toBe(false);
  });

  let draftC_Id = null;
  let draftC_Token = null;
  const mockEmailC = `synth.gamma.${Date.now()}@example.test`;
  const mockMobileC = '96' + Math.floor(10000000 + Math.random() * 90000000);

  await test('9.3 Backend accepts resumeToken passed exclusively via x-resume-token header (no URL query param)', async () => {
    const mStart = mockReqRes({
      body: {
        fullName: 'Dr. Synthetic Gamma',
        email: mockEmailC,
        mobile: mockMobileC,
        password: 'Password123!',
        gender: 'Male',
        dob: '1992-08-20',
        agreeTerms: true,
      },
    });
    await registrationController.startRegistration(mStart.req, mStart.res, (err) => { if (err) throw err; });
    expect(mStart.getStatus()).toBe(201);
    draftC_Id = mStart.getJson().data.registrationId;
    draftC_Token = mStart.getJson().data.resumeToken;

    // Retrieve draft using ONLY x-resume-token header, with completely empty query params
    const mGet = mockReqRes({
      params: { registrationId: draftC_Id },
      headers: { 'x-resume-token': draftC_Token },
      query: {},
    });
    await registrationController.getRegistrationById(mGet.req, mGet.res, (err) => { if (err) throw err; });
    expect(mGet.getStatus()).toBe(200);
    expect(mGet.getJson().success).toBe(true);
    expect(mGet.getJson().data.registrationId).toBe(draftC_Id);

    // Validate draft using ONLY x-resume-token header, with empty query params
    const mVal = mockReqRes({
      params: { registrationId: draftC_Id },
      headers: { 'x-resume-token': draftC_Token },
      query: {},
    });
    await registrationController.validateRegistrationDraft(mVal.req, mVal.res, (err) => { if (err) throw err; });
    expect(mVal.getStatus()).toBe(200);
    expect(mVal.getJson().success).toBe(true);
  });

  await test('9.4 Backend strictly rejects draft requests with HTTP 401 when x-resume-token header is absent', async () => {
    const mGet = mockReqRes({
      params: { registrationId: draftC_Id },
      headers: {},
      query: {},
    });
    await registrationController.getRegistrationById(mGet.req, mGet.res, (err) => { if (err) throw err; });
    expect(mGet.getStatus()).toBe(401);
    expect(mGet.getJson().code).toBe('RESUME_TOKEN_REQUIRED');

    const mVal = mockReqRes({
      params: { registrationId: draftC_Id },
      headers: {},
      query: {},
    });
    await registrationController.validateRegistrationDraft(mVal.req, mVal.res, (err) => { if (err) throw err; });
    expect(mVal.getStatus()).toBe(401);
    expect(mVal.getJson().code).toBe('RESUME_TOKEN_REQUIRED');
  });

  await test('9.5 registrationRoutes mounts requireAuth and requireRole(admin) on /incomplete/count', () => {
    const countLayer = registrationRoutes.stack.find(
      (l) => l.route && l.route.path === '/incomplete/count' && l.route.methods.get
    );
    expect(Boolean(countLayer)).toBe(true);
    expect(countLayer.route.stack.length).toBe(3); // [requireAuth, requireRole('admin'), getIncompleteRegistrationsCount]
  });

  async function runRoutePipeline(routeLayer, m) {
    for (const h of routeLayer.route.stack) {
      let next = false;
      await new Promise((r) => {
        const p = h.handle(m.req, m.res, (err) => {
          next = true;
          r();
        });
        if (p && typeof p.then === 'function') {
          p.then(r);
        } else {
          setImmediate(r);
        }
      });
      if (!next || m.getJson() !== null) break;
    }
  }

  await test('9.6 /incomplete/count rejects unauthenticated request with HTTP 401', async () => {
    const countLayer = registrationRoutes.stack.find(
      (l) => l.route && l.route.path === '/incomplete/count' && l.route.methods.get
    );
    const m = mockReqRes({ headers: {} });
    await runRoutePipeline(countLayer, m);

    expect(m.getStatus()).toBe(401);
    expect(m.getJson().success).toBe(false);
    expect(m.getJson().message).toBe('Authentication required');
  });

  await test('9.7 /incomplete/count rejects authenticated non-admin request with HTTP 403', async () => {
    const countLayer = registrationRoutes.stack.find(
      (l) => l.route && l.route.path === '/incomplete/count' && l.route.methods.get
    );
    const secret = process.env.JWT_SECRET || 'supersecret_wonderfuljodi_dev_key_2026';
    const memberToken = jwt.sign({ userId: '507f1f77bcf86cd799439011', role: 'user' }, secret, { expiresIn: '1h' });

    const m = mockReqRes({
      headers: { authorization: `Bearer ${memberToken}` },
    });
    await runRoutePipeline(countLayer, m);

    expect(m.getStatus()).toBe(403);
    expect(m.getJson().success).toBe(false);
    expect(m.getJson().message).toBe('Access denied: insufficient permissions');
  });

  await test('9.8 /incomplete/count authorizes admin request with HTTP 200 and returns count', async () => {
    const countLayer = registrationRoutes.stack.find(
      (l) => l.route && l.route.path === '/incomplete/count' && l.route.methods.get
    );
    const secret = process.env.JWT_SECRET || 'supersecret_wonderfuljodi_dev_key_2026';
    const adminToken = jwt.sign({ userId: '507f1f77bcf86cd799439099', role: 'admin' }, secret, { expiresIn: '1h' });

    const m = mockReqRes({
      headers: { authorization: `Bearer ${adminToken}` },
    });
    await runRoutePipeline(countLayer, m);

    expect(m.getStatus()).toBe(200);
    expect(m.getJson().success).toBe(true);
    expect(typeof m.getJson().count).toBe('number');
    expect(typeof m.getJson().data.count).toBe('number');
  });

  await test('9.10 Backend rejects resume token supplied only via URL query parameter (token must not be in URL)', async () => {
    // After the security fix, extractResumeToken() no longer reads from req.query.
    // Supplying the token ONLY as a query param must yield HTTP 401 (RESUME_TOKEN_REQUIRED),
    // not HTTP 200 � confirming the backend now treats URL-borne tokens as missing.
    const mGetQueryOnly = mockReqRes({
      params: { registrationId: draftC_Id },
      headers: {}, // no x-resume-token header
      query: { resumeToken: draftC_Token }, // token in query param only � must be ignored
    });
    await registrationController.getRegistrationById(mGetQueryOnly.req, mGetQueryOnly.res, (err) => { if (err) throw err; });
    expect(mGetQueryOnly.getStatus()).toBe(401);
    expect(mGetQueryOnly.getJson().code).toBe('RESUME_TOKEN_REQUIRED');

    const mSaveQueryOnly = mockReqRes({
      body: { registrationId: draftC_Id, stepNumber: 1, stepData: {} },
      headers: {}, // no x-resume-token header
      query: { resumeToken: draftC_Token }, // token in query param only � must be ignored
    });
    await registrationController.saveStep(mSaveQueryOnly.req, mSaveQueryOnly.res, (err) => { if (err) throw err; });
    expect(mSaveQueryOnly.getStatus()).toBe(401);
    expect(mSaveQueryOnly.getJson().code).toBe('RESUME_TOKEN_REQUIRED');
  });

  await test('9.9 Clean up synthetic test records from database', async () => {
    if (draftC_Id) {
      await Registration.deleteOne({ registrationId: draftC_Id });
      const check = await Registration.findOne({ registrationId: draftC_Id });
      expect(check).toBe(null);
    }
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n=============================================================================');
  console.log(`EXECUTION SUMMARY:`);
  console.log(`  Total Tests Run:  ${totalTests}`);
  console.log(`  Passed Tests:     ${passedTests}`);
  console.log(`  Failed Tests:     ${failedTests}`);
  console.log(`  Skipped Tests:    ${skippedTests}`);
  console.log('=============================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test suite runner error:', err);
  process.exit(1);
});
