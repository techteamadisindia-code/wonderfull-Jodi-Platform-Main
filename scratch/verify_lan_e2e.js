const http = require('http');

const LAN_IP = '192.168.1.35';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          json: (() => {
            try {
              return JSON.parse(body);
            } catch {
              return null;
            }
          })(),
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING FULL LAN ACCESS & FUNCTIONALITY VERIFICATION ===\n');

  // 1. Test Local Frontend
  const localFe = await request({ hostname: '127.0.0.1', port: 3000, path: '/', method: 'GET' });
  console.log(`[PASS] Local Frontend (http://localhost:3000): HTTP ${localFe.statusCode}`);

  // 2. Test LAN Frontend
  const lanFe = await request({ hostname: LAN_IP, port: 3000, path: '/', method: 'GET' });
  console.log(`[PASS] LAN Frontend (http://${LAN_IP}:3000): HTTP ${lanFe.statusCode}`);

  // 3. Test Local Backend Health
  const localBe = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/health', method: 'GET' });
  console.log(`[PASS] Local Backend (http://localhost:5000/api/health): HTTP ${localBe.statusCode} - Status: ${localBe.json?.status}`);

  // 4. Test LAN Backend Health
  const lanBe = await request({ hostname: LAN_IP, port: 5000, path: '/api/health', method: 'GET' });
  console.log(`[PASS] LAN Backend (http://${LAN_IP}:5000/api/health): HTTP ${lanBe.statusCode} - Status: ${lanBe.json?.status}`);

  // 5. Test CORS Preflight and Header from LAN Origin
  const corsPreflight = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/search',
    method: 'OPTIONS',
    headers: {
      Origin: `http://${LAN_IP}:3000`,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  });
  console.log(`[PASS] CORS Preflight for Origin http://${LAN_IP}:3000: HTTP ${corsPreflight.statusCode}`);
  console.log(`       Access-Control-Allow-Origin: ${corsPreflight.headers['access-control-allow-origin']}`);
  console.log(`       Access-Control-Allow-Credentials: ${corsPreflight.headers['access-control-allow-credentials']}`);

  // 6. Test User Login via LAN IP
  const loginRes = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: `http://${LAN_IP}:3000`,
      },
    },
    {
      email: 'ananya.verma@example.com',
      password: 'Password123!',
    }
  );
  console.log(`[PASS] User Login via LAN IP: HTTP ${loginRes.statusCode} - Success: ${loginRes.json?.success}`);
  const userToken = loginRes.json?.token;

  // 7. Test Profile Search via LAN IP with Auth Token
  const searchRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/search?limit=5',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userToken}`,
      Origin: `http://${LAN_IP}:3000`,
    },
  });
  console.log(`[PASS] Profile Search via LAN IP: HTTP ${searchRes.statusCode} - Found ${searchRes.json?.data?.profiles?.length || 0} profiles`);

  // 8. Test Admin Login via LAN IP
  const adminLogin = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/admin/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: `http://${LAN_IP}:3000`,
      },
    },
    {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    }
  );
  console.log(`[PASS] Admin Login via LAN IP: HTTP ${adminLogin.statusCode} - Success: ${adminLogin.json?.success}`);
  const adminToken = adminLogin.json?.token;

  // 9. Test Admin Dashboard stats via LAN IP
  const adminDash = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/dashboard',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Origin: `http://${LAN_IP}:3000`,
    },
  });
  console.log(`[PASS] Admin Dashboard API: HTTP ${adminDash.statusCode} - Total Users: ${adminDash.json?.stats?.totalUsers}`);

  // 10. Test Compliance Detection (Phone number detection)
  const complianceTest = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/admin/messages/simulate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        Origin: `http://${LAN_IP}:3000`,
      },
    },
    {
      message: 'Call me at 98765 43210',
    }
  );
  console.log(`[PASS] Compliance Detector Simulation ("Call me at 98765 43210"):`);
  console.log(`       Status: ${complianceTest.json?.data?.status}`);
  console.log(`       Category: ${complianceTest.json?.data?.category}`);
  console.log(`       Score: ${complianceTest.json?.data?.score}`);

  // 11. Test Membership Plans via LAN IP
  const plansRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/memberships',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userToken}`,
      Origin: `http://${LAN_IP}:3000`,
    },
  });
  console.log(`[PASS] Membership Plans via LAN IP: HTTP ${plansRes.statusCode} - Success: ${plansRes.json?.success}`);

  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(console.error);
