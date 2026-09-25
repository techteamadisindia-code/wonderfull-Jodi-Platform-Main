/**
 * Automated Verification Test Suite for Profile & Medical Verification
 * Wonderful Jodi Matrimonial Platform
 */

const http = require('http');

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
  console.log('====================================================');
  console.log('  STARTING WONDERFUL JODI PROFILE & VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Login as Admin
    console.log('[1] Logging in as Administrator...');
    const adminLoginRes = await request('POST', '/api/admin/auth/login', {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    });

    assert(adminLoginRes.status === 200, `Admin login returns 200 OK (Status: ${adminLoginRes.status})`);
    const adminToken = adminLoginRes.body?.data?.token || adminLoginRes.body?.token;
    assert(Boolean(adminToken), 'Admin token received');

    // 2. Register/Login a fresh test doctor
    const testEmail = `dr.ananya.suite.${Date.now()}@example.com`;
    console.log(`\n[2] Registering test doctor user: ${testEmail}...`);
    const registerRes = await request('POST', '/api/auth/register', {
      fullName: 'Dr. Ananya Joshi',
      email: testEmail,
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      gender: 'Female',
      termsAccepted: true,
    });

    assert(registerRes.status === 201, `Doctor user registration returns 201 Created (Status: ${registerRes.status})`);
    const userToken = registerRes.body?.data?.token || registerRes.body?.token;
    assert(Boolean(userToken), 'Doctor JWT token received');

    // 3. Initial Profile Completion Check (Must NOT be 95% when required info is missing)
    console.log('\n[3] Checking Initial Profile Completion Calculation...');
    const initProfileRes = await request('GET', '/api/profiles/me', null, userToken);

    assert(initProfileRes.status === 200, 'GET /api/profiles/me returns 200 OK');
    const initProfile = initProfileRes.body?.data;
    assert(Boolean(initProfile), 'Profile payload returned');
    assert(Boolean(initProfile?.candidateId), `Candidate ID correctly assigned: ${initProfile?.candidateId}`);
    
    console.log(`      Initial completion percentage: ${initProfile?.completionPercentage}%`);
    assert(
      initProfile?.completionPercentage < 40,
      `Initial completion is appropriately low (${initProfile?.completionPercentage}%), NOT false 95%`
    );

    assert(
      Array.isArray(initProfile?.completionBreakdown) && initProfile?.completionBreakdown?.length === 11,
      `Breakdown contains all 11 configured sections (found ${initProfile?.completionBreakdown?.length})`
    );

    const totalWeight = initProfile?.completionBreakdown?.reduce((acc, c) => acc + c.weight, 0);
    assert(totalWeight === 100, `Total maximum category weights sum to exactly 100% (found ${totalWeight}%)`);

    // 4. Update Profile with full details
    console.log('\n[4] Updating Profile with Medical & Personal Information...');
    const updateRes = await request('PUT', '/api/profiles/me', {
      displayName: 'Dr. Ananya Joshi',
      gender: 'Female',
      dob: '15/06/1993',
      height: `5' 6"`,
      maritalStatus: 'Never Married',
      motherTongue: 'Marathi',
      religion: 'Hindu',
      caste: 'Brahmin',
      education: 'MBBS',
      degree: 'MBBS',
      medicalCollege: 'Grant Medical College, Mumbai',
      medicalUniversity: 'MUHS Nashik',
      graduationYear: '2018',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      profession: 'Cardiologist',
      currentRole: 'Consultant Cardiologist',
      currentHospital: 'Lilavati Hospital',
      workLocation: 'Mumbai',
      medicalExperience: '6 Years Clinical Practice',
      workType: 'Hospital Consultant',
      medicalRegistrationNumber: 'MMC-2018-09-12345',
      medicalCouncil: 'Maharashtra Medical Council',
      registrationYear: '2018',
      about: 'Dedicated consultant cardiologist passionate about preventative cardiology and lifestyle wellness. Looking for a doctor partner who values mutual respect and shared dreams.',
      familyType: 'Nuclear',
      familyStatus: 'Upper Middle Class',
      nativePlace: 'Pune, Maharashtra',
      fatherOccupation: 'Retired Bank Executive',
      motherOccupation: 'Professor',
      siblings: '1 Younger Brother (Software Engineer)',
      familyValues: 'Moderate',
      foodPreference: 'Vegetarian',
      smoking: 'Non-Smoker',
      drinking: 'Non-Drinker',
      lifestyleInterests: {
        diet: 'Vegetarian',
        smoking: 'Non-Smoker',
        alcohol: 'Non-Drinker',
        exercise: 'Yoga & Swimming',
        hobbies: ['Classical Music', 'Trekking', 'Reading'],
        languages: ['Marathi', 'English', 'Hindi'],
        pets: 'None',
      },
      partnerPreferences: {
        preferredAgeMin: 28,
        preferredAgeMax: 34,
        preferredQualification: 'MD / MS / DNB',
        preferredSpecialization: 'Any Clinical Specialty',
        preferredLocation: 'Mumbai / Pune',
        preferredMaritalStatus: 'Never Married',
        otherPreferences: 'Well settled medical professional',
      },
      horoscope: {
        timeOfBirth: '07:45 AM',
        placeOfBirth: 'Pune, Maharashtra',
        rashi: 'Kanya (Virgo)',
        nakshatra: 'Hasta',
        lagna: 'Tula',
        manglik: 'Non-Manglik',
        gotra: 'Kashyap',
      },
      primaryPhoto: 'https://images.unsplash.com/photo-1594824813501-48c90967399f?w=600&auto=format&fit=crop&q=80',
      photos: ['https://images.unsplash.com/photo-1594824813501-48c90967399f?w=600&auto=format&fit=crop&q=80'],
    }, userToken);

    assert(updateRes.status === 200, `PUT /api/profiles/me returns 200 OK (Status: ${updateRes.status})`);
    const updatedProfile = updateRes.body?.data;
    console.log(`      Updated completion percentage: ${updatedProfile?.completionPercentage}%`);
    assert(
      updatedProfile?.completionPercentage >= 85 && updatedProfile?.completionPercentage <= 90,
      `Accurate profile completion: ${updatedProfile?.completionPercentage}% (Verification is pending/unverified so it stays <= 90%)`
    );

    // 5. Submit Medical Verification Document (Attempt #1)
    console.log('\n[5] Submitting Medical Registration Verification Document (Attempt #1)...');
    // Valid minimal PDF Base64 string (%PDF-1.4 ...)
    const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY4IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA0Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoxODcKJSVFT0YK';

    const submitDocRes = await request('POST', '/api/verifications', {
      documentType: 'MEDICAL_REGISTRATION',
      documentName: 'Maharashtra Medical Council Certificate',
      file: samplePdfBase64,
      filename: 'MMC_Certificate_Dr_Ananya.pdf',
    }, userToken);

    assert(submitDocRes.status === 201, `POST /api/verifications returns 201 Created (Status: ${submitDocRes.status})`);
    const docData = submitDocRes.body?.data;
    const docId = docData?._id;
    assert(docData?.status === 'PENDING', 'Document initial status is PENDING');
    assert(docData?.attemptNumber === 1, 'Document attemptNumber is 1');
    assert(Boolean(docData?.documentUrl), `Secure document URL generated: ${docData?.documentUrl}`);

    // Check user verifications
    const userVerifsRes = await request('GET', '/api/verifications/me', null, userToken);
    assert(userVerifsRes.status === 200, 'GET /api/verifications/me returns 200 OK');
    const medRegSummary = userVerifsRes.body?.summary?.MEDICAL_REGISTRATION;
    assert(medRegSummary?.status === 'PENDING', 'Summary shows MEDICAL_REGISTRATION as PENDING');

    // 6. Admin Rejects Document with reason
    console.log('\n[6] Admin Rejects Verification Document with Rejection Reason...');
    const rejectionReasonText = 'Council registration number is obscured by shadow; please upload a clean scan.';
    const rejectRes = await request('PUT', `/api/admin/verifications/${docId}/reject`, {
      rejectionReason: rejectionReasonText,
    }, adminToken);

    assert(rejectRes.status === 200, `PUT /api/admin/verifications/:id/reject returns 200 OK (Status: ${rejectRes.status})`);

    // Verify user can see rejection reason
    const userVerifsAfterReject = await request('GET', '/api/verifications/me', null, userToken);
    const rejectedSummary = userVerifsAfterReject.body?.summary?.MEDICAL_REGISTRATION;
    assert(rejectedSummary?.status === 'REJECTED', 'Status updated to REJECTED in user summary');
    assert(
      rejectedSummary?.rejectionReason === rejectionReasonText,
      `User receives correct rejection reason: "${rejectedSummary?.rejectionReason}"`
    );

    // 7. Resubmit Document (Attempt #2)
    console.log('\n[7] Resubmitting Corrected Document (Attempt #2)...');
    const resubmitDocRes = await request('POST', '/api/verifications', {
      documentType: 'MEDICAL_REGISTRATION',
      documentName: 'Maharashtra Medical Council Certificate (High Resolution)',
      file: samplePdfBase64,
      filename: 'MMC_Certificate_Dr_Ananya_Clean.pdf',
    }, userToken);

    assert(resubmitDocRes.status === 201, `Resubmission returns 201 Created (Status: ${resubmitDocRes.status})`);
    const doc2Data = resubmitDocRes.body?.data;
    const doc2Id = doc2Data?._id;
    assert(doc2Data?.status === 'PENDING', 'Resubmitted status is PENDING');
    assert(doc2Data?.attemptNumber === 2, `Resubmitted document correctly marked as Attempt #2 (found ${doc2Data?.attemptNumber})`);

    // 8. Admin Approves Document
    console.log('\n[8] Admin Approves Resubmitted Verification Document...');
    const approveRes = await request('PUT', `/api/admin/verifications/${doc2Id}/approve`, {
      notes: 'Council registration verified against Maharashtra Medical Council directory.',
    }, adminToken);

    assert(approveRes.status === 200, `PUT /api/admin/verifications/:id/approve returns 200 OK (Status: ${approveRes.status})`);

    // 9. Profile Completion Reaches 100% with Verification Points
    console.log('\n[9] Checking Profile Completion Post-Approval (Should Reach 100%)...');
    const postApproveProfileRes = await request('GET', '/api/profiles/me', null, userToken);

    const finalProfile = postApproveProfileRes.body?.data;
    console.log(`      Final completion percentage: ${finalProfile?.completionPercentage}%`);
    assert(
      finalProfile?.completionPercentage === 100,
      `Final profile completion reaches exactly 100% after verification approval (found ${finalProfile?.completionPercentage}%)`
    );

    const verifSection = finalProfile?.completionBreakdown?.find(c => c.id === 'medical-verification');
    assert(verifSection?.status === 'completed', 'Medical verification section marked completed');
    assert(verifSection?.completed === true && verifSection?.weight === 10, 'Medical verification awarded full 10 points');

    // 10. Security & IDOR / BOLA Access Control Check
    console.log('\n[10] Testing IDOR / BOLA Document Access Control...');
    // Create a secondary non-admin doctor user
    const otherEmail = `dr.other.suite.${Date.now()}@example.com`;
    const otherUserRes = await request('POST', '/api/auth/register', {
      fullName: 'Dr. Rahul Patil',
      email: otherEmail,
      mobile: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      gender: 'Male',
      termsAccepted: true,
    });
    const otherToken = otherUserRes.body?.data?.token || otherUserRes.body?.token;

    const documentStorageKey = doc2Data?.storageKey || (doc2Data?.documentUrl ? doc2Data.documentUrl.split('/').pop() : '');

    // Test A: Unauthenticated user accesses document
    const unauthAccess = await request('GET', `/api/verifications/document/${documentStorageKey}`);
    assert(
      unauthAccess.status === 401,
      `Unauthenticated document download blocked: HTTP ${unauthAccess.status}`
    );

    // Test B: Different authenticated user (IDOR attempt) accesses document
    const idorAccess = await request('GET', `/api/verifications/document/${documentStorageKey}`, null, otherToken);
    assert(
      idorAccess.status === 403,
      `IDOR unauthorized document download blocked: HTTP ${idorAccess.status} Forbidden`
    );

    // Test C: Owner accesses document
    const ownerAccess = await request('GET', `/api/verifications/document/${documentStorageKey}`, null, userToken);
    assert(
      ownerAccess.status === 200,
      `Owner authorized document download succeeds: HTTP ${ownerAccess.status} OK`
    );

    // Test D: Admin accesses document
    const adminAccess = await request('GET', `/api/verifications/document/${documentStorageKey}`, null, adminToken);
    assert(
      adminAccess.status === 200,
      `Admin authorized document download succeeds: HTTP ${adminAccess.status} OK`
    );

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  }
}

runTests();
