const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING ADMIN PROFILE EDIT & PROTECTED FIELDS TESTS ===\n');

  // 1. Admin login
  console.log('[1] Logging in as Admin...');
  const adminLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@wonderfuljodi.com', password: 'Password123!' }
  );

  if (adminLogin.status !== 200 || !adminLogin.data?.data?.token) {
    console.error('Failed to log in as admin:', adminLogin);
    process.exit(1);
  }
  const adminToken = adminLogin.data.data.token;
  console.log('    Admin login successful.');

  // 2. Normal user login
  console.log('\n[2] Logging in as Normal User (Priya Sharma)...');
  const userLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'priya.sharma@example.com', password: 'Password123!' }
  );
  const userToken = userLogin.data?.data?.token;
  console.log('    User login status:', userLogin.status);

  // Target profile ID: Priya Sharma (6a9915fb4b45e3411f49ff47)
  const targetProfileId = '6a9915fb4b45e3411f49ff47';

  // 3. Test Admin Editing Allowed Fields
  console.log('\n[3] Testing Admin Edit with Allowed Fields (city, about, annualIncome, familyType)...');
  const allowedUpdate = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/profiles/${targetProfileId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      city: 'Pune Metro',
      annualIncome: '₹35 - 50 Lakhs',
      about: 'Senior pediatric specialist dedicated to healthcare and family harmony.',
      familyType: 'Nuclear',
    }
  );

  console.log('    Status:', allowedUpdate.status);
  console.log('    Response message:', allowedUpdate.data?.message);
  console.log('    Updated city in response:', allowedUpdate.data?.data?.city);
  if (allowedUpdate.status === 200 && allowedUpdate.data?.data?.city === 'Pune Metro') {
    console.log('    TEST PASSED: Allowed profile fields updated successfully!');
  } else {
    console.error('    TEST FAILED: Could not update allowed fields:', allowedUpdate.data);
    process.exit(1);
  }

  // 4. Test Protected Field: fullName attempt
  console.log('\n[4] Testing Protection: Attempting to modify fullName...');
  const nameAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/profiles/${targetProfileId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      fullName: 'Hacked Name By Admin',
    }
  );
  console.log('    Status:', nameAttempt.status, '(Expected 400)');
  console.log('    Message:', nameAttempt.data?.message);
  if (nameAttempt.status === 400 && nameAttempt.data?.message?.includes('cannot be modified by administrators')) {
    console.log('    TEST PASSED: fullName modification was strictly rejected!');
  } else {
    console.error('    TEST FAILED: fullName was not rejected:', nameAttempt);
    process.exit(1);
  }

  // 5. Test Protected Field: email attempt
  console.log('\n[5] Testing Protection: Attempting to modify email...');
  const emailAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/profiles/${targetProfileId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      email: 'hacked.email@example.com',
    }
  );
  console.log('    Status:', emailAttempt.status, '(Expected 400)');
  console.log('    Message:', emailAttempt.data?.message);
  if (emailAttempt.status === 400 && emailAttempt.data?.message?.includes('cannot be modified by administrators')) {
    console.log('    TEST PASSED: email modification was strictly rejected!');
  } else {
    console.error('    TEST FAILED: email was not rejected:', emailAttempt);
    process.exit(1);
  }

  // 6. Test Protected Field: mobile / phone attempt
  console.log('\n[6] Testing Protection: Attempting to modify phone / mobile...');
  const phoneAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/profiles/${targetProfileId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      mobile: '+91 9999999999',
    }
  );
  console.log('    Status:', phoneAttempt.status, '(Expected 400)');
  console.log('    Message:', phoneAttempt.data?.message);
  if (phoneAttempt.status === 400 && phoneAttempt.data?.message?.includes('cannot be modified by administrators')) {
    console.log('    TEST PASSED: mobile modification was strictly rejected!');
  } else {
    console.error('    TEST FAILED: mobile was not rejected:', phoneAttempt);
    process.exit(1);
  }

  // 7. Test Normal User Unauthorized Access
  console.log('\n[7] Testing Authorization: Normal user attempting to edit via Admin endpoint...');
  const normalUserAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/admin/profiles/${targetProfileId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    },
    { city: 'Unauthorized City' }
  );
  console.log('    Status:', normalUserAttempt.status, '(Expected 403)');
  if (normalUserAttempt.status === 403) {
    console.log('    TEST PASSED: Normal user rejected with 403 Forbidden!');
  } else {
    console.error('    TEST FAILED: Normal user was not blocked:', normalUserAttempt);
    process.exit(1);
  }

  // 8. Verify Audit Log was recorded
  console.log('\n[8] Verifying Audit Log creation for Admin Edit...');
  const profileFetch = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/profiles/${targetProfileId}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const logs = profileFetch.data?.data?.auditLogs || [];
  const editLog = logs.find((l) => l.action === 'PROFILE_EDITED');
  if (editLog) {
    console.log('    Audit log found for PROFILE_EDITED:');
    console.log('    Details:', editLog.details);
    console.log('    Changes in metadata:', editLog.metadata?.changes?.map((c) => `${c.field}: ${c.oldValue} -> ${c.newValue}`));
    console.log('    TEST PASSED: Profile edits recorded in Audit Log!');
  } else {
    console.error('    TEST FAILED: No PROFILE_EDITED log found in audit logs:', logs);
    process.exit(1);
  }

  console.log('\n=== ALL ADMIN PROFILE EDIT & SECURITY TESTS PASSED! ===');
}

runTests().catch((err) => {
  console.error('Error running test script:', err);
  process.exit(1);
});
