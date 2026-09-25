/**
 * Automated Test Suite for Wonderful Jodi Matrimonial Registration System
 * Tests Steps 1-4, Field Validation, Placeholders, Duplicate Prevention, and Profile Creation
 */

const http = require('http');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      `http://localhost:5000/api${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:5000/api${endpoint}`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log(' RUNNING WONDERFUL JODI REGISTRATION FULL-FLOW TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extraInfo) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${name}`);
      if (extraInfo) console.error(`    Detail:`, extraInfo);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testEmail = `dr.neha_${timestamp}@example.com`;
  const testMobile = `98${String(timestamp).slice(-8)}`;

  // ── TEST 1: Step 1 Validation - Empty DOB ──
  console.log('--- Test 1: Step 1 Validation (Empty DOB) ---');
  const res1 = await post('/registration/start', {
    fullName: 'Dr. Neha Patel',
    email: testEmail,
    mobile: testMobile,
    password: 'Password123!',
    gender: 'Female',
    dob: '',
    agreeTerms: true,
  });
  assert('Start registration rejects empty DOB', res1.status === 400 && res1.body.message.includes('Date of birth'), res1.body);

  // ── TEST 2: Step 1 Validation - Invalid Leap Year DOB ──
  console.log('\n--- Test 2: Step 1 Validation (Invalid Leap Year DOB) ---');
  const res2 = await post('/registration/start', {
    fullName: 'Dr. Neha Patel',
    email: testEmail,
    mobile: testMobile,
    password: 'Password123!',
    gender: 'Female',
    dob: '29/02/2001',
    agreeTerms: true,
  });
  assert('Start registration rejects invalid leap year 29/02/2001', res2.status === 400 && res2.body.message.includes('leap year'), res2.body);

  // ── TEST 3: Step 1 Success - Starts Registration & Returns Registration ID ──
  console.log('\n--- Test 3: Step 1 Success (Valid Registration Start) ---');
  const res3 = await post('/registration/start', {
    fullName: 'Dr. Neha Patel',
    email: testEmail,
    mobile: testMobile,
    password: 'Password123!',
    gender: 'Female',
    dob: '15/06/1996',
    agreeTerms: true,
  });
  assert('Start registration succeeds with 201', res3.status === 201, res3.body);
  const regId = res3.body?.data?.registrationId;
  assert('Generated unique registrationId (REG-...)', !!regId && regId.startsWith('REG-'), regId);

  // ── TEST 4: Step 2 Validation - Required Marital Status, Religion, City ──
  console.log('\n--- Test 4: Step 2 Validation (Required Marital Status, Religion, City) ---');
  const res4a = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 3,
    section: 'personalInfo',
    data: {
      maritalStatus: '',
      religion: 'Hindu',
      city: 'Mumbai',
    },
  });
  assert('Step 2 rejects empty marital status', res4a.status === 400 && res4a.body.message.includes('Marital status'), res4a.body);

  const res4b = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 3,
    section: 'personalInfo',
    data: {
      maritalStatus: 'Never Married',
      religion: '',
      city: 'Mumbai',
    },
  });
  assert('Step 2 rejects empty religion', res4b.status === 400 && res4b.body.message.includes('Religion'), res4b.body);

  const res4c = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 3,
    section: 'personalInfo',
    data: {
      maritalStatus: 'Never Married',
      religion: 'Hindu',
      city: '',
    },
  });
  assert('Step 2 rejects empty city', res4c.status === 400 && res4c.body.message.includes('City of residence'), res4c.body);

  // ── TEST 5: Step 2 Success - Saves Personal Info and Optional Family Details ──
  console.log('\n--- Test 5: Step 2 Success (Saves Personal & Family Details) ---');
  const res5 = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 3,
    section: 'personalInfo',
    data: {
      maritalStatus: 'Never Married',
      motherTongue: 'Gujarati',
      religion: 'Hindu',
      caste: 'Patel',
      height: `5' 4"`,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      about: 'Compassionate medical professional from a traditional family.',
      familyType: 'Nuclear Family',
      fatherOccupation: 'Senior Physician',
      motherOccupation: 'Professor',
      siblings: '1 Brother (Married)',
    },
  });
  assert('Step 2 saves successfully (HTTP 200)', res5.status === 200, res5.body);
  assert('Step 2 returned same registrationId', res5.body?.data?.registrationId === regId);
  assert('Step 2 saved familyDetails in database', res5.body?.data?.stepData?.familyDetails?.fatherOccupation === 'Senior Physician');

  // ── TEST 6: Step 3 Validation - Required Qualification & Profession ──
  console.log('\n--- Test 6: Step 3 Validation (Required Medical Qualification & Profession) ---');
  const res6a = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 4,
    section: 'educationProfession',
    data: {
      qualification: '',
      profession: 'Gynecologist',
    },
  });
  assert('Step 3 rejects empty qualification', res6a.status === 400 && res6a.body.message.includes('qualification'), res6a.body);

  const res6b = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 4,
    section: 'educationProfession',
    data: {
      qualification: 'B.Tech Computer Science',
      profession: 'Software Engineer',
    },
  });
  assert('Step 3 rejects non-medical qualification (B.Tech)', res6b.status === 400 && res6b.body.message.includes('medical'), res6b.body);

  const res6c = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 4,
    section: 'educationProfession',
    data: {
      qualification: 'MBBS',
      profession: '',
    },
  });
  assert('Step 3 rejects empty profession', res6c.status === 400 && res6c.body.message.includes('specialization'), res6c.body);

  // ── TEST 7: Step 3 Success - Saves Education, Profession, and Optional Medical Credentials ──
  console.log('\n--- Test 7: Step 3 Success (Saves Education & Medical Credentials) ---');
  const res7 = await post('/registration/step', {
    registrationId: regId,
    stepNumber: 4,
    section: 'educationProfession',
    data: {
      education: 'MD',
      degree: 'MD',
      profession: 'Gynecologist',
      company: 'Lilavati Hospital, Mumbai',
      workLocation: 'Mumbai',
      annualIncome: '₹ 25 - 35 Lakhs',
      medicalRegistrationNumber: 'MMC-2018-987654',
      medicalCollege: 'Grant Medical College, Mumbai',
      medicalExperience: '6-10 Years',
    },
  });
  assert('Step 3 saves successfully (HTTP 200)', res7.status === 200, res7.body);
  assert('Step 3 preserves same registrationId', res7.body?.data?.registrationId === regId);
  const eduData = res7.body?.data?.stepData?.educationProfession;
  assert('Step 3 saved medical registration number', eduData?.medicalRegistrationNumber === 'MMC-2018-987654');
  assert('Step 3 saved medical college', eduData?.medicalCollege === 'Grant Medical College, Mumbai');
  assert('Step 3 saved medical experience', eduData?.medicalExperience === '6-10 Years');

  // ── TEST 8: Step 4 Completion - Complete Registration & Verify Profile Creation ──
  console.log('\n--- Test 8: Step 4 Completion & Profile Generation ---');
  const res8 = await post('/registration/complete', {
    registrationId: regId,
    finalData: {
      agreeTerms: true,
      preferences: {
        lookingFor: 'Male',
        prefAgeMin: '28',
        prefAgeMax: '35',
        prefCity: 'Mumbai',
        prefDiet: 'Vegetarian',
        prefEducation: 'MD/MS/DNB',
        prefProfession: 'Surgeon',
      },
      photos: {
        primaryPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      },
    },
  });

  assert('Complete registration returns 201 Created', res8.status === 201, res8.body);
  assert('Returned auth JWT token', !!res8.body?.token);
  const createdProfile = res8.body?.data?.profile;
  assert('Profile created in MongoDB', !!createdProfile);
  assert('Profile has medicalRegistrationNumber', createdProfile?.medicalRegistrationNumber === 'MMC-2018-987654', createdProfile?.medicalRegistrationNumber);
  assert('Profile has medicalCollege', createdProfile?.medicalCollege === 'Grant Medical College, Mumbai', createdProfile?.medicalCollege);
  assert('Profile has medicalExperience', createdProfile?.medicalExperience === '6-10 Years', createdProfile?.medicalExperience);
  assert('Profile has familyType', createdProfile?.familyType === 'Nuclear Family', createdProfile?.familyType);
  assert('Profile has fatherOccupation', createdProfile?.fatherOccupation === 'Senior Physician', createdProfile?.fatherOccupation);
  assert('Profile has partnerPreferences.preferredQualification', createdProfile?.partnerPreferences?.preferredQualification === 'MD/MS/DNB', createdProfile?.partnerPreferences);
  assert('Profile has partnerPreferences.preferredSpecialization', createdProfile?.partnerPreferences?.preferredSpecialization === 'Surgeon', createdProfile?.partnerPreferences);

  // ── TEST 9: Duplicate Prevention - Email & Mobile ──
  console.log('\n--- Test 9: Duplicate Email & Mobile Prevention ---');
  const res9 = await post('/registration/start', {
    fullName: 'Duplicate Doctor Test',
    email: testEmail,
    mobile: '9999999999',
    password: 'Password123!',
    gender: 'Female',
    dob: '15/06/1996',
    agreeTerms: true,
  });
  assert('Duplicate email registration rejected', res9.status === 400 && res9.body.code === 'USER_ALREADY_REGISTERED', res9.body);

  const res10 = await post('/registration/start', {
    fullName: 'Duplicate Mobile Test',
    email: 'new_unique_email@example.com',
    mobile: testMobile,
    password: 'Password123!',
    gender: 'Female',
    dob: '15/06/1996',
    agreeTerms: true,
  });
  assert('Duplicate mobile registration rejected', res10.status === 400 && res10.body.code === 'USER_ALREADY_REGISTERED', res10.body);

  // ── SUMMARY ──
  console.log('\n===============================================================');
  console.log(` TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test run failure:', err);
  process.exit(1);
});
