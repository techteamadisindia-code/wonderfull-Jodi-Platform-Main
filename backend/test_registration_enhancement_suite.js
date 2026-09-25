const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (e) {
          parsed = { raw: data };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('WONDERFUL JODI - ENHANCED REGISTRATION TEST SUITE');
  console.log('====================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Institution Search API
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Institution Search (AIIMS and Grant) ---');
    const resAiims = await request('GET', '/institutions/search?q=AIIMS');
    assert(resAiims.status === 200, `AIIMS search returned status 200 (got ${resAiims.status})`);
    assert(resAiims.data.success === true, 'AIIMS search marked success');
    assert(Array.isArray(resAiims.data.data) && resAiims.data.data.length > 0, 'Found AIIMS institutions in DB');
    const firstInst = resAiims.data.data[0];
    assert(firstInst.name && firstInst.normalizedName, 'Institution has name and normalizedName');

    const resShort = await request('GET', '/institutions/search?q=A');
    assert(resShort.status === 400 && resShort.data.success === false, 'Query shorter than 2 chars returns 400 Bad Request');

    // -------------------------------------------------------------------------
    // TEST 2: Add New Institution & Deduplication
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Add New Institution & Deduplication ---');
    const uniqueCollegeName = `Apollo Institute of Medical Sciences - Hyderabad ${Date.now()}`;
    const createRes = await request('POST', '/institutions', {
      name: uniqueCollegeName,
      type: 'COLLEGE',
      city: 'Hyderabad',
      state: 'Telangana',
    });
    assert(createRes.status === 201, `Created new institution with 201 Created (got ${createRes.status})`);
    assert(createRes.data.data.name === uniqueCollegeName, 'New institution has correct name');
    const newCollegeId = createRes.data.data._id;

    // Test duplicate creation with different casing and whitespace
    const dupRes = await request('POST', '/institutions', {
      name: `  ${uniqueCollegeName.toLowerCase()}   `,
      city: 'Hyderabad',
      state: 'Telangana',
    });
    assert(dupRes.status === 200, 'Duplicate creation returned existing institution with 200 OK');
    assert(dupRes.data.isNew === false, 'Flag isNew is false on duplicate');
    assert(dupRes.data.data._id === newCollegeId, 'Returned same institution ID');

    // Verify search finds the newly added institution
    const searchNewRes = await request('GET', `/institutions/search?q=${encodeURIComponent('Apollo Institute')}`);
    assert(searchNewRes.status === 200, 'Search for newly added college returned 200');
    assert(searchNewRes.data.data.some((inst) => inst._id === newCollegeId), 'Newly added college found in search suggestions');

    // -------------------------------------------------------------------------
    // TEST 3: Multi-Step Registration Flow with Structured Fields
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Multi-Step Registration: Step 1 (Account & Personal) ---');
    const timestamp = Date.now();
    const testEmail = `doctor.partner.${timestamp}@wonderfuljodi.test`;
    const testPhone = `98${String(timestamp).slice(-8)}`;

    const step1Payload = {
      currentStep: 1,
      step1Data: {
        fullName: 'Dr. Aarav Deshmukh',
        email: testEmail,
        phone: testPhone,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        gender: 'Male',
        dateOfBirth: '1992-06-15',
        maritalStatus: 'Never Married',
        motherTongue: 'Marathi',
        religion: 'Hindu',
        caste: 'Maratha',
        height: "5'10\"",
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        residenceStatus: 'Citizen',
      },
    };

    const startRes = await request('POST', '/registration/start', step1Payload);
    assert(startRes.status === 200 || startRes.status === 201, `Step 1 registration succeeded (got ${startRes.status})`);
    const regId = startRes.data.data.registrationId;
    assert(regId, `Got valid registrationId: ${regId}`);

    // -------------------------------------------------------------------------
    // TEST 4: Step 2: About Me, Family Background & Sibling Details
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Step 2 (About Me & Family Background & Siblings) ---');
    const step2Payload = {
      currentStep: 2,
      step2Data: {
        personalInfo: {
          aboutMe: 'Dedicated cardiologist practicing in Mumbai with a passion for preventative medicine and clinical research.',
          personalityValues: 'Compassionate, analytical, grounded with strong family traditions and modern outlook.',
          hobbiesInterests: 'Classical violin, marathon running, reading historical fiction, and traveling.',
          careerGoals: 'To establish an advanced cardiac electrophysiology clinic and mentor young medical researchers.',
        },
        familyDetails: {
          familyType: 'Nuclear Family',
          familyStatus: 'Upper Middle Class',
          fatherName: 'Dr. Ramesh Deshmukh',
          fatherProfession: 'Retired Civil Surgeon',
          motherName: 'Sunita Deshmukh',
          motherProfession: 'Professor of Botany',
          familyLocation: 'Pune, Maharashtra',
          familyValues: 'Moderate / Cultured',
          aboutFamily: 'We are a close-knit, progressive family with deep-rooted cultural values and medical lineage.',
        },
        siblings: {
          brothers: [
            {
              name: 'Dr. Rohan Deshmukh',
              age: 30,
              profession: 'Orthopedic Resident',
              maritalStatus: 'Unmarried',
              location: 'Pune',
            },
          ],
          sisters: [
            {
              name: 'Ananya Deshmukh',
              age: 26,
              profession: 'Software Architect',
              maritalStatus: 'Married',
              location: 'Bengaluru',
            },
          ],
        },
      },
    };

    const step2Res = await request('POST', `/registration/${regId}/step`, step2Payload);
    assert(step2Res.status === 200, `Step 2 saved successfully (got ${step2Res.status})`);
    const step2StepData = step2Res.data.data.stepData;
    assert(step2StepData.familyDetails.fatherName === 'Dr. Ramesh Deshmukh', 'Father name saved correctly');
    assert(step2StepData.siblings.brothers.length === 1, 'Brother details saved');
    assert(step2StepData.siblings.sisters.length === 1, 'Sister details saved');
    assert(step2StepData.personalInfo.aboutMe.includes('cardiologist'), 'About Me saved correctly');

    // -------------------------------------------------------------------------
    // TEST 5: Sibling Age Validation (Negative Age Check)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Sibling Age Validation ---');
    const invalidSiblingPayload = {
      currentStep: 2,
      step2Data: {
        siblings: {
          brothers: [
            {
              name: 'Invalid Brother',
              age: -5,
              profession: 'Student',
              maritalStatus: 'Unmarried',
              location: 'Pune',
            },
          ],
        },
      },
    };
    const invalidSiblingRes = await request('POST', `/registration/${regId}/step`, invalidSiblingPayload);
    assert(
      invalidSiblingRes.status === 400 || (invalidSiblingRes.data && invalidSiblingRes.data.success === false),
      `Negative sibling age rejected with status 400 (got ${invalidSiblingRes.status})`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Step 3 (Medical Education UG/PG/Doctorate & Autocomplete Linkage)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Step 3 (Medical Education & Career) ---');
    const step3Payload = {
      currentStep: 3,
      step3Data: {
        medicalQualifications: {
          undergraduate: [
            {
              qualification: 'MBBS',
              college: 'Grant Government Medical College & Sir J.J. Group of Hospitals, Mumbai',
              collegeId: '6ab10e2156c19183823a759b',
              passingYear: 2015,
              degreeCompletionStatus: 'Completed',
            },
          ],
          postgraduate: [
            {
              qualification: 'MD',
              specialization: 'General Medicine',
              college: 'All India Institute of Medical Sciences (AIIMS), New Delhi',
              collegeId: '6ab10e2156c19183823a7593',
              passingYear: 2018,
              degreeCompletionStatus: 'Completed',
            },
          ],
          doctorate: [
            {
              qualification: 'DM',
              specialization: 'Cardiology',
              college: uniqueCollegeName,
              collegeId: newCollegeId,
              passingYear: 2021,
              degreeCompletionStatus: 'Completed',
            },
          ],
        },
        careerDetails: {
          profession: 'Cardiologist',
          currentDesignation: 'Consultant Interventional Cardiologist',
          workingHospital: 'Lilavati Hospital & Research Centre',
          annualIncome: '₹40 - ₹50 Lakhs',
          yearsOfExperience: 8,
          medicalRegistrationNumber: 'MCI-1992-88741',
          stateMedicalCouncil: 'Maharashtra Medical Council',
          workCity: 'Mumbai',
          workCountry: 'India',
        },
      },
    };

    const step3Res = await request('POST', `/registration/${regId}/step`, step3Payload);
    assert(step3Res.status === 200, `Step 3 saved successfully (got ${step3Res.status})`);
    const step3StepData = step3Res.data.data.stepData;
    assert(step3StepData.medicalQualifications.undergraduate.length === 1, 'UG qualification saved');
    assert(step3StepData.medicalQualifications.postgraduate.length === 1, 'PG qualification saved');
    assert(step3StepData.medicalQualifications.doctorate.length === 1, 'Doctorate qualification saved');
    assert(step3StepData.medicalQualifications.doctorate[0].college === uniqueCollegeName, 'Doctorate college matches newly created college');

    // -------------------------------------------------------------------------
    // TEST 7: Backend Rejection of Non-Medical Qualifications
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Rejection of Non-Medical Qualification ---');
    const nonMedicalPayload = {
      currentStep: 3,
      step3Data: {
        medicalQualifications: {
          undergraduate: [
            {
              qualification: 'B.Tech Computer Science',
              college: 'IIT Bombay',
              passingYear: 2016,
              degreeCompletionStatus: 'Completed',
            },
          ],
        },
      },
    };
    const nonMedicalRes = await request('POST', `/registration/${regId}/step`, nonMedicalPayload);
    assert(
      nonMedicalRes.status === 400 || (nonMedicalRes.data && nonMedicalRes.data.success === false),
      `Non-medical qualification (B.Tech) correctly rejected with status 400 (got ${nonMedicalRes.status})`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Backend Rejection of Invalid Passing Year
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Rejection of Invalid Passing Year ---');
    const futureYearPayload = {
      currentStep: 3,
      step3Data: {
        medicalQualifications: {
          undergraduate: [
            {
              qualification: 'MBBS',
              college: 'Grant Medical College',
              passingYear: 2045, // Future year
              degreeCompletionStatus: 'Completed',
            },
          ],
        },
      },
    };
    const futureYearRes = await request('POST', `/registration/${regId}/step`, futureYearPayload);
    assert(
      futureYearRes.status === 400 || (futureYearRes.data && futureYearRes.data.success === false),
      `Future passing year (2045) correctly rejected with status 400 (got ${futureYearRes.status})`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Step 4 (Partner Expectations)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Step 4 (Partner Expectations & Photos) ---');
    const step4Payload = {
      currentStep: 4,
      step4Data: {
        partnerExpectations: {
          ageMin: 27,
          ageMax: 33,
          heightMin: "5'2\"",
          heightMax: "5'8\"",
          qualification: 'MD',
          specialization: 'Dermatologist',
          location: {
            country: 'India',
            state: 'Maharashtra',
            city: 'Mumbai',
          },
          willingToRelocate: 'Yes',
          maritalStatus: 'Never Married',
          lifestyle: {
            diet: 'Vegetarian',
            smoking: 'Non-Smoker',
            drinking: 'Teetotaler',
          },
          familyExpectations: 'Looking for an educated, understanding, and culturally aligned family.',
          additionalExpectations: 'Preference for a practicing doctor with similar clinical interests and shared values.',
        },
        photos: [],
      },
    };

    const step4Res = await request('POST', `/registration/${regId}/step`, step4Payload);
    assert(step4Res.status === 200, `Step 4 saved successfully (got ${step4Res.status})`);
    const step4StepData = step4Res.data.data.stepData;
    assert(step4StepData.partnerExpectations.qualification === 'MD', 'Partner preferred qualification saved');
    assert(step4StepData.partnerExpectations.specialization === 'Dermatologist', 'Partner preferred specialization saved');

    // -------------------------------------------------------------------------
    // TEST 10: Session Resume & Field Restoration
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Session Resume & Field Restoration ---');
    const sessionRes = await request('GET', `/registration/${regId}`);
    assert(sessionRes.status === 200, `Session fetched with status 200 (got ${sessionRes.status})`);
    const regSession = sessionRes.data.data.stepData;
    assert(regSession.personalInfo && regSession.personalInfo.aboutMe.includes('cardiologist'), 'About Me restored on session reload');
    assert(regSession.familyDetails && regSession.familyDetails.fatherName === 'Dr. Ramesh Deshmukh', 'Family details restored on session reload');
    assert(regSession.siblings && regSession.siblings.brothers.length === 1, 'Siblings restored on session reload');
    assert(regSession.medicalQualifications && regSession.medicalQualifications.undergraduate[0].qualification === 'MBBS', 'UG restored on session reload');
    assert(regSession.medicalQualifications.postgraduate[0].qualification === 'MD', 'PG restored on session reload');
    assert(regSession.medicalQualifications.doctorate[0].qualification === 'DM', 'Doctorate restored on session reload');
    assert(regSession.partnerExpectations && regSession.partnerExpectations.specialization === 'Dermatologist', 'Partner expectations restored on session reload');

    // -------------------------------------------------------------------------
    // TEST 11: Complete Registration & Create Profile
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Complete Registration ---');
    const completeRes = await request('POST', `/registration/${regId}/complete`, {});
    assert(completeRes.status === 200 || completeRes.status === 201, `Registration completed with status 200/201 (got ${completeRes.status})`);
    const authToken = completeRes.data.data.token;
    assert(authToken, 'Received JWT auth token upon completion');
    const createdProfile = completeRes.data.data.profile;
    assert(createdProfile, 'Profile was created');
    assert(createdProfile.aboutMe && createdProfile.aboutMe.includes('cardiologist'), 'Profile has structured aboutMe');
    assert(createdProfile.familyBackground && createdProfile.familyBackground.fatherName === 'Dr. Ramesh Deshmukh', 'Profile has structured familyBackground');
    assert(createdProfile.siblingsDetails && createdProfile.siblingsDetails.brothers.length === 1, 'Profile has structured siblingsDetails');
    assert(createdProfile.medicalQualifications && createdProfile.medicalQualifications.doctorate.length === 1, 'Profile has structured medicalQualifications');
    assert(createdProfile.partnerExpectations && createdProfile.partnerExpectations.qualification === 'MD', 'Profile has structured partnerExpectations');

    // -------------------------------------------------------------------------
    // TEST 12: Profile Fetch & Profile Editing via JWT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Authenticated Profile Fetch & Update ---');
    const myProfileRes = await request('GET', '/profiles/me', null, authToken);
    assert(myProfileRes.status === 200, `GET /profiles/me returned 200 (got ${myProfileRes.status})`);
    const fetchedProfile = myProfileRes.data.data.profile || myProfileRes.data.data;
    assert(fetchedProfile.aboutMe.includes('cardiologist'), 'Fetched profile contains structured fields');

    // Update profile with edited partner expectations & aboutMe
    const updateRes = await request(
      'PUT',
      '/profiles/me',
      {
        aboutMe: 'Updated: Dedicated cardiologist and associate professor in Mumbai.',
        partnerExpectations: {
          ageMin: 28,
          ageMax: 34,
          qualification: 'MS',
          specialization: 'Surgeon',
          willingToRelocate: 'Yes',
        },
      },
      authToken
    );
    assert(updateRes.status === 200, `Profile updated with status 200 (got ${updateRes.status})`);
    const updatedProfile = updateRes.data.data.profile || updateRes.data.data;
    assert(updatedProfile.aboutMe.includes('associate professor'), 'Updated aboutMe persisted');
    assert(updatedProfile.partnerExpectations.specialization === 'Surgeon', 'Updated partnerExpectations persisted');

    console.log('\n====================================================');
    console.log('🎉 ALL 12 ENHANCED REGISTRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
