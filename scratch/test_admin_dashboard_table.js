const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function testAdminDashboard() {
  console.log('=== TESTING ADMIN DASHBOARD RECENT USERS API & TABLE ===\n');

  // 1. Login as Admin
  const loginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    }
  );

  if (loginRes.statusCode !== 200) {
    console.error('Admin login failed:', loginRes.statusCode, loginRes.data);
    process.exit(1);
  }

  const loginData = JSON.parse(loginRes.data);
  const token = loginData.token;
  console.log('✅ [PASS] Admin authenticated successfully');

  // 2. Test GET /api/admin/dashboard
  const dashRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/dashboard',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (dashRes.statusCode !== 200) {
    console.error('GET /api/admin/dashboard failed:', dashRes.statusCode, dashRes.data);
    process.exit(1);
  }

  const dashData = JSON.parse(dashRes.data);
  const recentUsers = dashData.data?.recentUsers;
  console.log(`✅ [PASS] GET /api/admin/dashboard returned ${recentUsers?.length || 0} recent users`);

  if (recentUsers && recentUsers.length > 0) {
    console.log('\nRecent Users Sample:');
    recentUsers.slice(0, 3).forEach((u, i) => {
      console.log(`  [User ${i + 1}] Name: ${u.fullName} | ID: ${u._id} | Short ID: ${String(u._id).slice(-6)} | Email: ${u.email} | Mobile: ${u.mobile} | Verification: ${u.verificationStatus} | Status: ${u.isActive ? 'Active' : 'Suspended'}`);
    });

    const first = recentUsers[0];
    if (!first._id || !first.fullName || !first.email) {
      console.error('❌ User data is missing required fields!');
      process.exit(1);
    }
    console.log('\n✅ [PASS] Real database IDs and fields present in API response');
  }

  // 3. Test Frontend Route /admin/dashboard
  const frontRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/dashboard',
    method: 'GET',
  });

  if (frontRes.statusCode === 200 || frontRes.statusCode === 304 || frontRes.statusCode === 307) {
    console.log(`✅ [PASS] Frontend /admin/dashboard returned HTTP ${frontRes.statusCode}`);
  } else {
    console.error(`❌ Frontend /admin/dashboard returned HTTP ${frontRes.statusCode}`);
    process.exit(1);
  }

  console.log('\n=== ALL ADMIN DASHBOARD TESTS PASSED ===');
}

testAdminDashboard().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
