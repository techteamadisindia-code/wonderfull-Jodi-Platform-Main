import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runEndToEndTests() {
  console.log('====================================================');
  console.log('STARTING END-TO-END REGISTRATION TRACKING VERIFICATION');
  console.log('====================================================\n');

  try {
    // 0. Initial Incomplete Count
    const initialCountRes = await axios.get(`${BASE_URL}/registration/incomplete/count`);
    const initialCount = initialCountRes.data.count;
    console.log(`[INIT] Initial Incomplete Count: ${initialCount}`);

    // TEST 1: Open /register, enter Page 1, Click Next
    console.log('\n--- TEST 1: Start Registration (Page 1) ---');
    const testCandidateEmail = `test.candidate.${Date.now()}@example.com`;
    const testCandidateMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    const page1Payload = {
      fullName: 'Test Candidate',
      email: testCandidateEmail,
      mobile: testCandidateMobile,
      password: 'Password123!',
      gender: 'Female',
      dob: '1997-06-15',
      agreeTerms: true,
      rawFormData: {
        fullName: 'Test Candidate',
        email: testCandidateEmail,
        mobile: testCandidateMobile,
        gender: 'Female',
      },
    };

    const startRes = await axios.post(`${BASE_URL}/registration/start`, page1Payload);
    const startData = startRes.data.data;
    console.log('Registration Started successfully:');
    console.log(`  Registration ID: ${startData.registrationId}`);
    console.log(`  Current Step: ${startData.currentStep}`);
    console.log(`  Status: ${startData.status}`);
    console.log(`  Completion %: ${startData.completionPercentage}%`);

    if (!startData.registrationId.startsWith('REG-')) {
      throw new Error(`Invalid registrationId format: ${startData.registrationId}`);
    }
    if (startData.currentStep !== 2) {
      throw new Error(`Expected currentStep to be 2, got: ${startData.currentStep}`);
    }
    if (startData.status !== 'IN_PROGRESS') {
      throw new Error(`Expected status to be IN_PROGRESS, got: ${startData.status}`);
    }
    console.log('✓ TEST 1 PASSED: Registration saved immediately to Database at Step 1.');

    // TEST 2: Check Admin Incomplete Count & View Candidate in Admin
    console.log('\n--- TEST 2: Admin Dashboard & Candidate Monitoring ---');
    const updatedCountRes = await axios.get(`${BASE_URL}/registration/incomplete/count`);
    const updatedCount = updatedCountRes.data.count;
    console.log(`  Incomplete Registrations Count: ${updatedCount} (Was: ${initialCount})`);

    if (updatedCount !== initialCount + 1) {
      throw new Error(`Expected incomplete count to increase by 1 (${initialCount + 1}), got: ${updatedCount}`);
    }

    // Admin List
    const adminLoginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    });
    const adminToken = adminLoginRes.data.token || adminLoginRes.data.data?.token;

    const adminListRes = await axios.get(
      `${BASE_URL}/admin/registrations?search=${startData.registrationId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const candidateInList = adminListRes.data.data.registrations[0];
    console.log('  Admin Search Result:');
    console.log(`    Found Candidate: ${candidateInList.candidateName} (${candidateInList.email})`);
    console.log(`    Registration ID: ${candidateInList.registrationId}`);
    console.log(`    Current Step: ${candidateInList.currentStep}`);

    // Admin Details View
    const adminDetailRes = await axios.get(
      `${BASE_URL}/admin/registrations/${startData.registrationId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const detailData = adminDetailRes.data.data;
    console.log('  Admin Candidate Detailed View:');
    console.log(`    Basic Info Completed: ${detailData.sectionStatus.basicInfo.completed}`);
    console.log(`    Personal Info Completed: ${detailData.sectionStatus.personalInfo.completed}`);
    console.log(`    Education Info Completed: ${detailData.sectionStatus.educationProfession.completed}`);

    if (!detailData.sectionStatus.basicInfo.completed) {
      throw new Error('Expected Basic Info section to be completed');
    }
    if (detailData.sectionStatus.personalInfo.completed) {
      throw new Error('Expected Personal Info section to NOT be completed yet');
    }
    console.log('✓ TEST 2 PASSED: Admin Dashboard reflects real DB count and candidate details.');

    // TEST 3: User returns / resumes registration
    console.log('\n--- TEST 3: Resume Registration & Save Step 2 & Step 3 ---');
    const resumeRes = await axios.get(`${BASE_URL}/registration/${startData.registrationId}`);
    const resumed = resumeRes.data.data;
    console.log('  Resumed Registration:');
    console.log(`    Registration ID: ${resumed.registrationId}`);
    console.log(`    Saved Full Name: ${resumed.candidateName}`);
    console.log(`    Saved Email: ${resumed.email}`);
    console.log(`    Current Step: ${resumed.currentStep}`);

    if (resumed.registrationId !== startData.registrationId) {
      throw new Error('Resumed ID does not match original registrationId');
    }

    // Save Page 2
    console.log('  Saving Page 2 (Personal Details)...');
    const step2Res = await axios.post(`${BASE_URL}/registration/save-step`, {
      registrationId: startData.registrationId,
      stepNumber: 3,
      section: 'personalInfo',
      data: {
        maritalStatus: 'Never Married',
        motherTongue: 'Hindi',
        religion: 'Hindu',
        caste: 'Brahmin',
        height: `5' 6"`,
        city: 'Bengaluru',
        state: 'Karnataka',
        about: 'Passionate professional looking for a life partner.',
      },
    });
    console.log(`  Page 2 Saved. New Step: ${step2Res.data.data.currentStep}, Progress: ${step2Res.data.data.completionPercentage}%`);

    // Save Page 3
    console.log('  Saving Page 3 (Career Details)...');
    const step3Res = await axios.post(`${BASE_URL}/registration/save-step`, {
      registrationId: startData.registrationId,
      stepNumber: 4,
      section: 'educationProfession',
      data: {
        education: 'B.Tech / M.Tech (Computer Science / Engineering)',
        degree: 'M.Tech',
        profession: 'Software Engineer / Tech Lead',
        company: 'Innovate Labs',
        workLocation: 'Bengaluru',
        annualIncome: '₹ 25 - 35 Lakhs',
      },
    });
    console.log(`  Page 3 Saved. New Step: ${step3Res.data.data.currentStep}, Progress: ${step3Res.data.data.completionPercentage}%`);

    if (step3Res.data.data.registrationId !== startData.registrationId) {
      throw new Error('Registration ID changed during step progression!');
    }
    console.log('✓ TEST 3 PASSED: Resume and step-by-step saves succeed with identical registration ID.');

    // TEST 4: Complete Registration
    console.log('\n--- TEST 4: Complete Registration & Final Verification ---');
    const completeRes = await axios.post(`${BASE_URL}/registration/complete`, {
      registrationId: startData.registrationId,
      finalData: {
        preferences: {
          lookingFor: 'Male',
          prefAgeMin: '25',
          prefAgeMax: '32',
          prefCity: 'Bengaluru',
          prefDiet: 'Vegetarian',
        },
        primaryPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      },
    });

    console.log('  Registration Completed Result:');
    console.log(`    Status: ${completeRes.data.data.status}`);
    console.log(`    Created User ID: ${completeRes.data.data.user.id}`);
    console.log(`    Created Profile ID: ${completeRes.data.data.profile.id}`);
    console.log(`    Auth Token Generated: ${Boolean(completeRes.data.token)}`);

    if (completeRes.data.data.status !== 'COMPLETED') {
      throw new Error(`Expected status COMPLETED, got: ${completeRes.data.data.status}`);
    }

    // Verify Incomplete Count decreased back
    const finalCountRes = await axios.get(`${BASE_URL}/registration/incomplete/count`);
    const finalCount = finalCountRes.data.count;
    console.log(`  Final Incomplete Count: ${finalCount} (Decreased from ${updatedCount} back to ${initialCount})`);

    if (finalCount !== initialCount) {
      throw new Error(`Expected incomplete count to decrease back to ${initialCount}, got: ${finalCount}`);
    }

    // Verify duplicate prevention on same email
    console.log('  Testing duplicate account prevention...');
    try {
      await axios.post(`${BASE_URL}/registration/start`, {
        fullName: 'Duplicate Candidate',
        email: testCandidateEmail,
        mobile: '9876543999',
        password: 'Password123!',
      });
      throw new Error('Duplicate email registration should have failed!');
    } catch (dupErr: any) {
      if (dupErr.response?.status === 400) {
        console.log(`    Duplicate properly prevented: "${dupErr.response.data.message}"`);
      } else {
        throw dupErr;
      }
    }

    console.log('\n====================================================');
    console.log('ALL 4 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('TEST FAILED:', error.response?.data || error.message);
    process.exit(1);
  }
}

runEndToEndTests();
