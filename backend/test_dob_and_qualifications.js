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
  console.log('======================================================================');
  console.log('    WONDERFUL JODI: DOB & MEDICAL QUALIFICATION COMPREHENSIVE TEST    ');
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

  // 1. Register & Authenticate a fresh test user
  console.log('1. Registering and Authenticating test doctor user...');
  const testUserEmail = `dr.test.${Date.now()}@example.com`;
  const regRes = await request('POST', '/api/auth/register', {
    fullName: 'Dr. Test Physician',
    email: testUserEmail,
    mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password123!',
    gender: 'Female',
  });
  assert(regRes.status === 201 && (regRes.body.data?.token || regRes.body.token), 'Test Doctor Registered successfully');
  const userToken = regRes.body.data?.token || regRes.body.token;

  const adminLogin = await request('POST', '/api/admin/auth/login', {
    email: 'admin@wonderfuljodi.com',
    password: 'Password123!',
  });
  assert(adminLogin.status === 200 && (adminLogin.body.data?.token || adminLogin.body.token), 'Admin login successful');
  const adminToken = adminLogin.body.data?.token || adminLogin.body.token;

  // 2. Testing DOB Invalid Cases via Profile API
  console.log('\n2. Testing DOB Validation (Direct Profile API)');

  const invalidDobCases = [
    { dob: '123456-01-01', desc: '6-digit year 123456-01-01' },
    { dob: '12345-01-01', desc: '5-digit year 12345-01-01' },
    { dob: '123-01-01', desc: '3-digit year 123-01-01' },
    { dob: 'abcd-01-01', desc: 'Alphabetic year abcd-01-01' },
    { dob: '2000-13-01', desc: 'Invalid month 2000-13-01' },
    { dob: '2000-02-30', desc: 'Invalid day for Feb 2000-02-30' },
    { dob: '2023-02-29', desc: 'Non-leap year Feb 29 (2023-02-29)' },
    { dob: '2027-01-01', desc: 'Future date 2027-01-01' },
  ];

  for (const tc of invalidDobCases) {
    const res = await request(
      'PUT',
      '/api/profiles/me',
      { dob: tc.dob, education: 'MD', degree: 'MBBS, MD Dermatology' },
      userToken
    );
    assert(
      res.status >= 400,
      `Rejected invalid DOB (${tc.desc}) -> HTTP ${res.status}: ${JSON.stringify(res.body.message || res.body.error || res.body)}`
    );
  }

  // 3. Testing DOB Valid Cases via Profile API
  console.log('\n3. Testing Valid DOB Cases');
  const validDobCases = [
    { dob: '2000-01-15', desc: 'Valid date 2000-01-15' },
    { dob: '1998-12-31', desc: 'Valid date 1998-12-31' },
    { dob: '1995-06-10', desc: 'Valid date 1995-06-10' },
  ];

  for (const tc of validDobCases) {
    const res = await request(
      'PUT',
      '/api/profiles/me',
      { dob: tc.dob, education: 'MD', degree: 'MBBS, MD Dermatology' },
      userToken
    );
    assert(res.status === 200, `Accepted valid DOB (${tc.desc}) -> HTTP 200`);
  }

  // 4. Testing Non-Medical Qualifications Rejection
  console.log('\n4. Testing Non-Medical Qualifications Rejection (Backend Source of Truth)');
  const invalidQuals = [
    'B.Tech',
    'M.Tech',
    'BCA',
    'MCA',
    'MBA',
    'BBA',
    'B.Com',
    'B.Sc',
    'Engineering',
    'Generic Graduate',
  ];

  for (const qual of invalidQuals) {
    const res = await request(
      'PUT',
      '/api/profiles/me',
      { education: qual, degree: qual },
      userToken
    );
    assert(
      res.status >= 400,
      `Rejected non-medical qualification "${qual}" -> HTTP ${res.status}: ${JSON.stringify(res.body.message || res.body.error || res.body)}`
    );
  }

  // 5. Testing Medical Qualifications Acceptance
  console.log('\n5. Testing Doctor Qualifications Acceptance');
  const validQuals = [
    'MBBS',
    'BDS',
    'BAMS',
    'BHMS',
    'MD',
    'MS',
    'DNB',
    'MDS',
    'DM',
    'MCh',
    'Fellowship',
  ];

  for (const qual of validQuals) {
    const res = await request(
      'PUT',
      '/api/profiles/me',
      { education: qual, degree: `${qual} Clinical Medicine` },
      userToken
    );
    assert(res.status === 200, `Accepted doctor qualification "${qual}" -> HTTP 200`);
  }

  // 6. Testing Registration API with Invalid and Valid DOB / Qual
  console.log('\n6. Testing Multi-Step Registration API Validation');
  const testEmail = `doctor.test.${Date.now()}@example.com`;

  // Start registration with invalid DOB
  const startInvalidDob = await request('POST', '/api/registration/start', {
    fullName: 'Dr. Test Candidate',
    email: testEmail,
    mobile: '9876543299',
    gender: 'Female',
    dob: '123456-01-01',
    password: 'Password123!',
  });
  assert(
    startInvalidDob.status >= 400,
    `Registration Start rejected 6-digit year -> HTTP ${startInvalidDob.status}: ${startInvalidDob.body.message}`
  );

  // Start registration with valid DOB
  const startValid = await request('POST', '/api/registration/start', {
    fullName: 'Dr. Test Candidate',
    email: testEmail,
    mobile: '9876543299',
    gender: 'Female',
    dob: '1996-08-20',
    password: 'Password123!',
  });
  assert(startValid.status === 200 || startValid.status === 201, `Registration Start accepted valid DOB -> HTTP ${startValid.status}`);
  const regId = startValid.body.data?.registrationId;

  if (regId) {
    // Save Step with non-medical qualification (B.Tech)
    const saveNonMed = await request('POST', '/api/registration/save-step', {
      registrationId: regId,
      stepNumber: 3,
      section: 'educationProfession',
      data: {
        education: 'B.Tech',
        degree: 'B.Tech Computer Science',
      },
    });
    assert(
      saveNonMed.status >= 400,
      `Registration Step rejected non-medical qualification -> HTTP ${saveNonMed.status}: ${saveNonMed.body.message}`
    );

    // Save Step with valid medical qualification (MD)
    const saveMed = await request('POST', '/api/registration/save-step', {
      registrationId: regId,
      stepNumber: 3,
      section: 'educationProfession',
      data: {
        education: 'MD',
        degree: 'MBBS, MD Cardiology',
        profession: 'Cardiologist',
      },
    });
    assert(saveMed.status === 200, `Registration Step accepted doctor qualification -> HTTP ${saveMed.status}`);
  }

  console.log('\n======================================================================');
  console.log(`  FINAL RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution exception:', err);
  process.exit(1);
});
