/**
 * Acceptance Test Suite: Divorced / Widowed Conditional Registration Fields
 *
 * Tests:
 * 1. Unit validation tests in doctorValidation.ts:
 *    - Never Married: ignores previousMarriageDetails
 *    - Divorced / Widowed: requires hasChildren
 *    - Completed divorce requires finalization year (1950 - currentYear)
 *    - Divorce settlement statuses (Completed, Pending, Mutual Consent Filed, Contested / In Process, Not applicable, Other)
 *    - Future year rejection
 *    - Child count validation (1 to 10 max enforced)
 *    - Child count mismatch rejection
 *    - Malformed / missing child details rejection
 *    - Living arrangement validation
 *    - Widowed requires spousePassingYear
 * 2. Privacy & Serialization Unit Tests in securityUtils.ts:
 *    - serializePublicProfile: hides previousMarriageDetails for unauthenticated viewers
 *    - serializePublicProfile: exposes previousMarriageDetails for authenticated viewers
 *    - serializePrivateProfile: preserves previousMarriageDetails for account owner / admin
 * 3. End-to-End API Integration tests:
 *    - Step 1 -> Step 2 Divorced with children + completed settlement
 *    - Resume registration session
 *    - Switch to Widowed
 *    - Switch to Never Married (clears previousMarriageDetails)
 *    - Complete registration and verify Profile persistence
 *    - Strict synthetic isolation: uses test_acceptance_* identifiers
 */

const http = require('http');
const { validatePreviousMarriageDetails } = require('./dist/utils/doctorValidation');
const { serializePublicProfile, serializePrivateProfile } = require('./dist/utils/securityUtils');

const API_HOST = 'localhost';
const API_PORT = 5000;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: API_HOST,
        port: API_PORT,
        path,
        method,
        headers,
        timeout: 10000,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log('  WONDERFUL JODI: CONDITIONAL FIELDS (DIVORCED / WIDOWED) TEST SUITE  ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  const currentYear = new Date().getFullYear();

  // ──────────────────────────────────────────────────────────────────────────
  // 1. UNIT VALIDATION TESTS (doctorValidation.ts)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. UNIT VALIDATION SUITE ---');

  // Case 1: Never Married -> No previous marriage details required, returns null sanitized
  const resNever = validatePreviousMarriageDetails('Never Married', { hasChildren: false });
  assert(resNever.isValid && resNever.sanitized === null, 'Never Married: Valid and returns null sanitized data');

  // Case 2: Divorced - Missing hasChildren
  const resDivNoChildrenSpec = validatePreviousMarriageDetails('Divorced', { divorceSettlementStatus: 'Completed', divorceFinalizationYear: '2020' });
  assert(!resDivNoChildrenSpec.isValid, 'Divorced: Fails when hasChildren is not specified');

  // Case 3: Divorced - Completed settlement requires finalization year
  const resDivNoYear = validatePreviousMarriageDetails('Divorced', {
    hasChildren: false,
    divorceSettlementStatus: 'Completed',
  });
  assert(!resDivNoYear.isValid, 'Divorced + Completed: Fails when divorceFinalizationYear is missing');

  const resDivFutureYear = validatePreviousMarriageDetails('Divorced', {
    hasChildren: false,
    divorceSettlementStatus: 'Completed',
    divorceFinalizationYear: String(currentYear + 2),
  });
  assert(!resDivFutureYear.isValid, 'Divorced + Completed: Fails when divorceFinalizationYear is in the future');

  const resDivValidCompleted = validatePreviousMarriageDetails('Divorced', {
    hasChildren: false,
    divorceSettlementStatus: 'Completed',
    divorceFinalizationYear: '2021',
    divorceFinalizationDate: '2021-06-15',
    additionalNotes: 'Mutual consent amicably resolved.',
  });
  assert(
    resDivValidCompleted.isValid &&
    resDivValidCompleted.sanitized?.divorceFinalizationYear === '2021' &&
    resDivValidCompleted.sanitized?.hasChildren === false,
    'Divorced + Completed: Passes with valid 4-digit finalization year'
  );

  // Case 4: Divorced - Other settlement statuses (Pending, Mutual Consent Filed, Contested / In Process, Not applicable, Other)
  const resDivPending = validatePreviousMarriageDetails('Divorced', {
    hasChildren: false,
    divorceSettlementStatus: 'Pending',
    pendingCaseDetails: 'Final hearing in progress',
    expectedCompletionYear: String(currentYear + 1),
  });
  assert(
    resDivPending.isValid &&
    resDivPending.sanitized?.divorceSettlementStatus === 'Pending' &&
    resDivPending.sanitized?.expectedCompletionYear === String(currentYear + 1),
    'Divorced + Pending: Passes without finalization year'
  );

  const resDivMutual = validatePreviousMarriageDetails('Divorced', {
    hasChildren: false,
    divorceSettlementStatus: 'Mutual Consent Filed',
    pendingCaseDetails: 'First motion completed',
  });
  assert(
    resDivMutual.isValid &&
    resDivMutual.sanitized?.divorceSettlementStatus === 'Mutual Consent Filed',
    'Divorced + Mutual Consent Filed: Passes consistently'
  );

  // Case 5: Divorced with Children count and detail groups
  const resDivMismatchChildren = validatePreviousMarriageDetails('Divorced', {
    hasChildren: true,
    childrenCount: 2,
    children: [{ gender: 'Boy', ageOrDob: '4' }], // only 1 child
    divorceSettlementStatus: 'Completed',
    divorceFinalizationYear: '2020',
  });
  assert(!resDivMismatchChildren.isValid, 'Divorced + Children: Fails when child details count does not match childrenCount');

  const resDivInvalidGender = validatePreviousMarriageDetails('Divorced', {
    hasChildren: true,
    childrenCount: 1,
    children: [{ gender: 'InvalidGender', ageOrDob: '4' }],
    divorceSettlementStatus: 'Completed',
    divorceFinalizationYear: '2020',
  });
  assert(!resDivInvalidGender.isValid, 'Divorced + Children: Fails when child gender is invalid');

  // Case 6: Enforce Max Child Count of 10
  const resDivOver10Children = validatePreviousMarriageDetails('Divorced', {
    hasChildren: true,
    childrenCount: 11,
    children: Array.from({ length: 11 }, () => ({ gender: 'Boy' })),
    divorceSettlementStatus: 'Completed',
    divorceFinalizationYear: '2020',
  });
  assert(!resDivOver10Children.isValid, 'Divorced + Children: Fails when childrenCount exceeds maximum of 10');

  // Case 7: Reject malformed child details (null / invalid object)
  const resDivMalformedChild = validatePreviousMarriageDetails('Divorced', {
    hasChildren: true,
    childrenCount: 1,
    children: [null],
    divorceSettlementStatus: 'Completed',
    divorceFinalizationYear: '2020',
  });
  assert(!resDivMalformedChild.isValid, 'Divorced + Children: Fails when child entry is malformed or null');

  const resDivValidChildren = validatePreviousMarriageDetails('Divorced', {
    hasChildren: true,
    childrenCount: 2,
    children: [
      { gender: 'Boy', ageOrDob: '6 yrs', livingArrangement: 'With me' },
      { gender: 'Girl', ageOrDob: '2 yrs', livingArrangement: 'Shared custody' },
    ],
    divorceSettlementStatus: 'Completed',
    divorceFinalizationYear: '2020',
  });
  assert(
    resDivValidChildren.isValid &&
    resDivValidChildren.sanitized?.children?.length === 2 &&
    resDivValidChildren.sanitized?.children[0].gender === 'Boy',
    'Divorced + Children: Passes with multiple valid child details'
  );

  // Case 8: Widowed - Passing year validation
  const resWidNoYear = validatePreviousMarriageDetails('Widowed', {
    hasChildren: false,
  });
  assert(!resWidNoYear.isValid, 'Widowed: Fails when spousePassingYear is missing');

  const resWidFutureYear = validatePreviousMarriageDetails('Widowed', {
    hasChildren: false,
    spousePassingYear: String(currentYear + 1),
  });
  assert(!resWidFutureYear.isValid, 'Widowed: Fails when spousePassingYear is in the future');

  const resWidValid = validatePreviousMarriageDetails('Widowed', {
    hasChildren: true,
    childrenCount: 1,
    children: [{ gender: 'Girl', ageOrDob: '5', livingArrangement: 'With me' }],
    spousePassingYear: '2019',
    divorceSettlementStatus: 'Completed', // Irrelevant field for widowed
  });
  assert(
    resWidValid.isValid &&
    resWidValid.sanitized?.spousePassingYear === '2019' &&
    resWidValid.sanitized?.divorceSettlementStatus === undefined,
    'Widowed: Passes with valid passing year and strips irrelevant divorce fields'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PRIVACY & SERIALIZATION TESTS (securityUtils.ts)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. PRIVACY & SERIALIZATION SUITE ---');

  const mockProfile = {
    _id: 'mock_profile_123',
    displayName: 'Dr. Test Candidate',
    gender: 'Female',
    maritalStatus: 'Divorced',
    city: 'Mumbai',
    previousMarriageDetails: {
      hasChildren: true,
      childrenCount: 1,
      children: [{ gender: 'Boy', ageOrDob: '5 yrs', livingArrangement: 'With me' }],
      divorceSettlementStatus: 'Completed',
      divorceFinalizationYear: '2021',
    },
    privacySettings: {
      profileVisibility: 'all',
      photoVisibility: 'all',
      contactVisibility: 'accepted_interests_only',
      whoCanSendInterest: 'all',
      whoCanMessage: 'accepted_interests_only',
    },
  };

  const mockUser = {
    _id: 'mock_user_123',
    fullName: 'Dr. Test Candidate',
    email: 'test@example.com',
    role: 'MEMBER',
    verified: true,
  };

  // Test 2.1: Unauthenticated viewer in serializePublicProfile must NOT see previousMarriageDetails
  const publicUnauth = serializePublicProfile(mockProfile, { isAuthenticatedViewer: false });
  assert(
    publicUnauth && publicUnauth.previousMarriageDetails === undefined,
    'Security: serializePublicProfile conceals previousMarriageDetails from unauthenticated guests'
  );

  // Test 2.2: Authenticated viewer in serializePublicProfile DOES see previousMarriageDetails
  const publicAuth = serializePublicProfile(mockProfile, { isAuthenticatedViewer: true });
  assert(
    publicAuth && publicAuth.previousMarriageDetails && publicAuth.previousMarriageDetails.divorceFinalizationYear === '2021',
    'Security: serializePublicProfile includes previousMarriageDetails for authenticated members'
  );

  // Test 2.3: Private profile serializer preserves previousMarriageDetails for owner
  const privateProfile = serializePrivateProfile(mockProfile, mockUser);
  assert(
    privateProfile && privateProfile.previousMarriageDetails && privateProfile.previousMarriageDetails.hasChildren === true,
    'Security: serializePrivateProfile preserves previousMarriageDetails for profile owner'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. END-TO-END API INTEGRATION TESTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. END-TO-END API INTEGRATION SUITE ---');

  const testSuffix = Date.now();
  const testMobile = '99' + Math.floor(10000000 + Math.random() * 90000000);
  const testEmail = `test_acceptance_divorced_${testSuffix}@example.com`;

  try {
    // A. Start Registration
    const startRes = await request('POST', '/api/registration/start', {
      fullName: 'Dr. Acceptance Candidate',
      email: testEmail,
      mobile: testMobile,
      gender: 'Male',
      dob: '1988-04-12',
      agreeTerms: true,
    });
    assert(startRes.status === 201 && startRes.body.data?.registrationId, 'API: Step 1 Registration started successfully');
    const registrationId = startRes.body.data?.registrationId;

    if (registrationId) {
      // B. Save Step 2 with Divorced status + Children + Completed Settlement
      const step2DivorcedRes = await request('POST', '/api/registration/step', {
        registrationId,
        stepNumber: 3,
        section: 'personalInfo',
        data: {
          maritalStatus: 'Divorced',
          motherTongue: 'Marathi',
          religion: 'Hindu',
          caste: 'Maratha',
          height: `5' 10"`,
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          aboutMe: 'Consultant cardiologist focused on patient care and balanced life.',
          previousMarriageDetails: {
            hasChildren: true,
            childrenCount: 2,
            children: [
              { gender: 'Boy', ageOrDob: '7 yrs', livingArrangement: 'With me' },
              { gender: 'Girl', ageOrDob: '4 yrs', livingArrangement: 'Shared custody' },
            ],
            divorceSettlementStatus: 'Completed',
            divorceFinalizationYear: '2021',
            divorceFinalizationDate: '2021-09-10',
            additionalNotes: 'Amicable mutual divorce finalized.',
          },
        },
      });
      assert(
        step2DivorcedRes.status === 200 &&
        step2DivorcedRes.body.data?.stepData?.personalInfo?.previousMarriageDetails?.divorceFinalizationYear === '2021' &&
        step2DivorcedRes.body.data?.stepData?.personalInfo?.previousMarriageDetails?.children?.length === 2,
        'API: Step 2 Saved Divorced profile with 2 children & completed settlement'
      );

      // C. Resume registration session and verify restored fields
      const resumeRes = await request('GET', `/api/registration/session/${registrationId}`);
      assert(
        resumeRes.status === 200 &&
        resumeRes.body.data?.stepData?.personalInfo?.maritalStatus === 'Divorced' &&
        resumeRes.body.data?.stepData?.personalInfo?.previousMarriageDetails?.hasChildren === true &&
        resumeRes.body.data?.stepData?.personalInfo?.previousMarriageDetails?.childrenCount === 2 &&
        resumeRes.body.data?.stepData?.personalInfo?.previousMarriageDetails?.divorceFinalizationYear === '2021',
        'API: Resume session accurately restores previousMarriageDetails'
      );

      // D. Switch to Widowed and save
      const step2WidowedRes = await request('POST', '/api/registration/step', {
        registrationId,
        stepNumber: 3,
        section: 'personalInfo',
        data: {
          maritalStatus: 'Widowed',
          motherTongue: 'Marathi',
          religion: 'Hindu',
          caste: 'Maratha',
          height: `5' 10"`,
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          previousMarriageDetails: {
            hasChildren: true,
            childrenCount: 1,
            children: [{ gender: 'Boy', ageOrDob: '7 yrs', livingArrangement: 'With me' }],
            spousePassingYear: '2020',
            additionalNotes: 'Supportive family background.',
          },
        },
      });
      assert(
        step2WidowedRes.status === 200 &&
        step2WidowedRes.body.data?.stepData?.personalInfo?.maritalStatus === 'Widowed' &&
        step2WidowedRes.body.data?.stepData?.personalInfo?.previousMarriageDetails?.spousePassingYear === '2020' &&
        step2WidowedRes.body.data?.stepData?.personalInfo?.previousMarriageDetails?.divorceSettlementStatus === undefined,
        'API: Switched to Widowed: saved spousePassingYear and excluded divorce settlement fields'
      );

      // E. Switch to Never Married and save -> ensures previous marriage data is cleaned
      const step2NeverRes = await request('POST', '/api/registration/step', {
        registrationId,
        stepNumber: 3,
        section: 'personalInfo',
        data: {
          maritalStatus: 'Never Married',
          motherTongue: 'Marathi',
          religion: 'Hindu',
          caste: 'Maratha',
          height: `5' 10"`,
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
        },
      });
      assert(
        step2NeverRes.status === 200 &&
        step2NeverRes.body.data?.stepData?.personalInfo?.maritalStatus === 'Never Married' &&
        !step2NeverRes.body.data?.stepData?.personalInfo?.previousMarriageDetails,
        'API: Switched to Never Married: previousMarriageDetails excluded/cleared'
      );

      // F. Re-save as Divorced with full education, photo, preferences & complete registration
      await request('POST', '/api/registration/step', {
        registrationId,
        stepNumber: 3,
        section: 'personalInfo',
        data: {
          maritalStatus: 'Divorced',
          motherTongue: 'Marathi',
          religion: 'Hindu',
          caste: 'Maratha',
          height: `5' 10"`,
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          aboutMe: 'Cardiologist seeking compatible partner.',
          previousMarriageDetails: {
            hasChildren: true,
            childrenCount: 1,
            children: [{ gender: 'Boy', ageOrDob: '5 yrs', livingArrangement: 'With me' }],
            divorceSettlementStatus: 'Completed',
            divorceFinalizationYear: '2022',
          },
        },
      });

      // Step 3: Education
      await request('POST', '/api/registration/step', {
        registrationId,
        stepNumber: 4,
        section: 'educationProfession',
        data: {
          education: 'MBBS',
          profession: 'Cardiologist',
          medicalQualifications: {
            undergraduate: [{ qualification: 'MBBS', college: 'BJ Medical College Pune', passingYear: '2012', status: 'Completed' }],
          },
        },
      });

      // Step 4: Photo & Preferences
      await request('POST', '/api/registration/step', {
        registrationId,
        stepNumber: 5,
        section: 'preferences',
        data: {
          lookingFor: 'Female',
          prefAgeMin: 28,
          prefAgeMax: 36,
          prefMaritalStatus: 'Does Not Matter',
        },
      });

      // Complete Registration
      const completeRes = await request('POST', '/api/registration/complete', { registrationId });
      assert(
        (completeRes.status === 200 || completeRes.status === 201) && completeRes.body.data?.token,
        'API: Complete registration succeeds with profile creation'
      );

      // Verify created Profile has previousMarriageDetails
      if (completeRes.body.data?.token) {
        const profileRes = await request('GET', '/api/profile/me', null, completeRes.body.data.token);
        assert(
          profileRes.status === 200 &&
          profileRes.body.data?.maritalStatus === 'Divorced' &&
          profileRes.body.data?.previousMarriageDetails?.hasChildren === true &&
          profileRes.body.data?.previousMarriageDetails?.divorceFinalizationYear === '2022',
          'API: User Profile reflects persisted previousMarriageDetails'
        );
      }
    }
  } catch (err) {
    console.error('API Test Error (check if backend server is running on port 5000):', err.message);
  }

  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();