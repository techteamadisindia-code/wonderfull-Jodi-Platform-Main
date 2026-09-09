const http = require('http');

async function checkRoute(path, port = 3000) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: port,
        path: path,
        method: 'GET',
        headers: { 'User-Agent': 'TestRunner/1.0' },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {}
          resolve({
            path,
            statusCode: res.statusCode,
            data: json,
            ok: res.statusCode >= 200 && res.statusCode < 400,
            bodyLength: body.length,
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ path, statusCode: 500, ok: false, error: err.message });
    });
    req.end();
  });
}

async function runTests() {
  console.log('=== VERIFYING WEBSITE PAGES & NAVIGATION ROUTES ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Check Backend APIs
  const [searchApi, docApi] = await Promise.all([
    checkRoute('/api/search?limit=4&sort=bestMatch', 5000),
    checkRoute('/api/search?profession=Doctor', 5000),
  ]);

  assert(
    searchApi.ok && Array.isArray(searchApi.data?.data?.profiles),
    'Backend API: GET /api/search?limit=4 returns profiles'
  );
  assert(docApi.ok, 'Backend API: GET /api/search?profession=Doctor executes successfully');

  const sampleProfile = searchApi.data?.data?.profiles?.[0];
  const profileId = sampleProfile?._id || sampleProfile?.id;

  if (profileId) {
    const singleProfileApi = await checkRoute(`/api/profiles/${profileId}`, 5000);
    assert(
      singleProfileApi.ok && singleProfileApi.data?.data?.displayName,
      `Backend API: GET /api/profiles/${profileId} returns candidate details`
    );
  }

  // 2. Check All Frontend Routes in Parallel
  const frontendRoutes = [
    '/',
    '/search',
    '/membership',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/safety',
    '/help',
    '/stories',
    '/verification-policy',
    '/careers',
    '/awards',
    '/biodata-maker',
    '/live',
    '/centres',
    '/astrology',
    '/blog',
    '/profile/verification',
    ...(profileId ? [`/profile/${profileId}`] : []),
  ];

  const results = await Promise.all(frontendRoutes.map((r) => checkRoute(r, 3000)));

  for (const res of results) {
    assert(res.ok, `Frontend Route: ${res.path} returns HTTP ${res.statusCode}`);
  }

  console.log(`\n=== SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
}

runTests().catch(console.error);
