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

async function runDobSuite() {
  console.log('======================================================================');
  console.log('    WONDERFUL JODI: DATE OF BIRTH COMPREHENSIVE VERIFICATION SUITE   ');
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

  // --- 1. Admin & Test User Setup ---
  console.log('--- 1. Authenticating Admin & Test User ---');
  const adminLogin = await request('POST', '/api/admin/auth/login', {
    email: 'admin@wonderfuljodi.com',
    password: 'Password123!',
  });
  assert(adminLogin.status === 200 && (adminLogin.body.data?.token || adminLogin.body.token), 'Admin login successful');
  const adminToken = adminLogin.body.data?.token || adminLogin.body.token;

  const testUserEmail = `dr.dobtest.${Date.now()}@example.com`;
  const regUser = await request('POST', '/api/auth/register', {
    fullName: 'Dr. Dob Tester',
    email: testUserEmail,
    mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password123!',
    gender: 'Female',
    termsAccepted: true,
  });
  assert(regUser.status === 201 && (regUser.body.data?.token || regUser.body.token), 'Test Doctor User Registered');
  const userToken = regUser.body.data?.token || regUser.body.token;

  // --- 2. Testing Invalid DOB Cases via Profile Update API ---
  console.log('\n--- 2. Testing Invalid DOB Cases (Profile API) ---');

  const invalidCases = [
    { dob: '31/02/1997', desc: 'Invalid day 31/02/1997 for February' },
    { dob: '29/02/2001', desc: 'Non-leap year Feb 29 (29/02/2001)' },
    { dob: '00/05/1997', desc: 'Day 00 (00/05/1997)' },
    { dob: '15/13/1997', desc: 'Month 13 (15/13/1997)' },
    { dob: '32/01/1997', desc: 'Day 32 (32/01/1997)' },
    { dob: '15/06/2030', desc: 'Future date (15/06/2030)' },
    { dob: '15/06/997',  desc: '3-digit year (15/06/997)' },
    { dob: '15/06/19970',desc: '5-digit year (15/06/19970)' },
    { dob: 'ab/cd/efgh', desc: 'Alphabetic characters (ab/cd/efgh)' },
    { dob: '',           desc: 'Empty DOB string' },
  ];

  for (const tc of invalidCases) {
    const res = await request(
      'PUT',
      '/api/profiles/me',
      { dob: tc.dob, education: 'MBBS', degree: 'MBBS' },
      userToken
    );
    assert(
      res.status >= 400,
      `Rejected invalid DOB: ${tc.desc} -> Status ${res.status}: ${res.body.message || JSON.stringify(res.body)}`
    );
  }

  // --- 3. Testing Valid DOB Cases via Profile Update API ---
  console.log('\n--- 3. Testing Valid DOB Cases (Profile API) ---');

  const validCases = [
    { dob: '15/06/1997', desc: 'Valid DD/MM/YYYY: 15/06/1997' },
    { dob: '01/01/2000', desc: 'Valid DD/MM/YYYY: 01/01/2000' },
    { dob: '29/02/2000', desc: 'Valid Leap Year: 29/02/2000' },
    { dob: '1997-06-15', desc: 'Valid ISO YYYY-MM-DD: 1997-06-15' },
  ];

  for (const tc of validCases) {
    const res = await request(
      'PUT',
      '/api/profiles/me',
      { dob: tc.dob, education: 'MBBS', degree: 'MBBS' },
      userToken
    );
    assert(res.status === 200, `Accepted valid DOB: ${tc.desc} -> Status 200`);
  }

  // --- 4. Testing Multi-Step Registration DOB API ---
  console.log('\n--- 4. Testing Multi-Step Registration DOB API ---');

  const regEmail = `newreg.${Date.now()}@example.com`;
  const regMobile = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

  // 4a. Reject Registration Start with Missing DOB
  const missingDobRes = await request('POST', '/api/registration/start', {
    fullName: 'Dr. No DOB',
    email: `nodob.${Date.now()}@example.com`,
    mobile: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
    gender: 'Female',
    password: 'Password123!',
    agreeTerms: true,
  });
  assert(missingDobRes.status === 400, `Registration rejected when DOB missing -> Status 400: ${missingDobRes.body.message}`);

  // 4b. Reject Registration Start with Invalid DOB (31/02/1997)
  const invalidDobRes = await request('POST', '/api/registration/start', {
    fullName: 'Dr. Invalid DOB',
    email: `invaliddob.${Date.now()}@example.com`,
    mobile: `95${Math.floor(10000000 + Math.random() * 90000000)}`,
    gender: 'Female',
    dob: '31/02/1997',
    password: 'Password123!',
    agreeTerms: true,
  });
  assert(invalidDobRes.status === 400, `Registration rejected invalid DOB 31/02/1997 -> Status 400: ${invalidDobRes.body.message}`);

  // 4c. Accept Registration Start with Valid DOB (15/06/1997)
  const startRes = await request('POST', '/api/registration/start', {
    fullName: 'Dr. Valid Registration',
    email: regEmail,
    mobile: regMobile,
    gender: 'Female',
    dob: '15/06/1997',
    password: 'Password123!',
    agreeTerms: true,
  });
  assert(
    (startRes.status === 200 || startRes.status === 201) && startRes.body.data?.registrationId,
    `Registration Start accepted valid DOB (15/06/1997) -> Stored normalized: ${startRes.body.data?.stepData?.basicInfo?.dob}`
  );
  const regId = startRes.body.data?.registrationId;
  assert(startRes.body.data?.stepData?.basicInfo?.dob === '1997-06-15', 'DOB normalized to YYYY-MM-DD: 1997-06-15');

  if (regId) {
    // 4d. Save Step 2 (Personal Info) - verify DOB is preserved
    const step2Res = await request('POST', '/api/registration/save-step', {
      registrationId: regId,
      stepNumber: 2,
      section: 'personalInfo',
      data: {
        maritalStatus: 'Never Married',
        religion: 'Hindu',
        motherTongue: 'Hindi',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
    });
    assert(step2Res.status === 200, 'Step 2 saved successfully');

    // 4e. Fetch registration session (resume draft) - check DOB
    const sessionRes = await request('GET', `/api/registration/${regId}`);
    assert(
      sessionRes.status === 200 && sessionRes.body.data?.stepData?.basicInfo?.dob === '1997-06-15',
      `Resumed draft preserves exact DOB (1997-06-15) -> Got: ${sessionRes.body.data?.stepData?.basicInfo?.dob}`
    );

    // 4f. Complete registration
    const compRes = await request('POST', '/api/registration/complete', {
      registrationId: regId,
      finalData: {
        qualification: 'MBBS',
        profession: 'General Physician',
      },
    });
    assert(compRes.status === 200 || compRes.status === 201, `Registration completed successfully -> Status ${compRes.status}`);

    // Verify Profile in database has exact DOB
    const myProfileRes = await request('GET', '/api/profiles/me', null, compRes.body.data?.token);
    assert(
      myProfileRes.status === 200 && myProfileRes.body.data?.dob?.startsWith('1997-06-15'),
      `Final profile created with exact DOB in database: ${myProfileRes.body.data?.dob}`
    );
  }

  // --- 5. Testing Admin Profile Update DOB API ---
  console.log('\n--- 5. Testing Admin Profile Update DOB API ---');
  // Fetch profiles list to get a test profile ID
  const profListRes = await request('GET', '/api/admin/profiles?limit=1', null, adminToken);
  const testProf = profListRes.body.data?.profiles?.[0];
  if (testProf) {
    const profId = testProf._id;

    // Reject empty DOB
    const adminEmptyRes = await request(
      'PUT',
      `/api/admin/profiles/${profId}`,
      { dob: '' },
      adminToken
    );
    assert(adminEmptyRes.status === 400, `Admin rejected empty DOB -> Status ${adminEmptyRes.status}`);

    // Reject invalid leap year 29/02/2001
    const adminInvalidRes = await request(
      'PUT',
      `/api/admin/profiles/${profId}`,
      { dob: '29/02/2001' },
      adminToken
    );
    assert(adminInvalidRes.status === 400, `Admin rejected 29/02/2001 -> Status ${adminInvalidRes.status}`);

    // Accept valid leap year 29/02/2000
    const adminValidRes = await request(
      'PUT',
      `/api/admin/profiles/${profId}`,
      { dob: '29/02/2000' },
      adminToken
    );
    assert(adminValidRes.status === 200, `Admin accepted valid leap year 29/02/2000 -> Status ${adminValidRes.status}`);
  }

  console.log('\n======================================================================');
  console.log(`  COMPREHENSIVE DOB TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDobSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
