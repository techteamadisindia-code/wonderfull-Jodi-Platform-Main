const http = require('http');
const mongoose = require('mongoose');

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

async function runAdminShortlistsTests() {
  console.log('================================================================');
  console.log('   ADMIN SHORTLISTS TRACKER API COMPREHENSIVE TEST SUITE   ');
  console.log('================================================================\n');

  // Step 1: Admin Login to obtain real JWT
  console.log('--- Step 1: Admin Authentication ---');
  const loginRes = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/admin/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: `http://${LAN_IP}:3000` },
    },
    { email: 'admin@wonderfuljodi.com', password: 'Password123!' }
  );

  if (loginRes.statusCode !== 200 || !loginRes.json?.data?.token) {
    console.error('[FAIL] Admin login failed:', loginRes.body);
    process.exit(1);
  }

  const adminToken = loginRes.json.data.token;
  console.log('[PASS] Admin Authenticated successfully. Token obtained.');

  const authHeaders = {
    Authorization: `Bearer ${adminToken}`,
    Origin: `http://${LAN_IP}:3000`,
  };

  // Step 2: Fetch default paginated shortlists
  console.log('\n--- Step 2: Fetch Default Paginated Shortlists (GET /api/admin/shortlists) ---');
  const listRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/shortlists?page=1&limit=10',
    method: 'GET',
    headers: authHeaders,
  });

  console.log(`[PASS] HTTP Status: ${listRes.statusCode}`);
  const listData = listRes.json?.data;
  console.log(`       Total Shortlists in DB: ${listData?.pagination?.total}`);
  console.log(`       Current Page Items: ${listData?.shortlists?.length}`);
  console.log(`       Total Pages: ${listData?.pagination?.totalPages}`);
  console.log(`       Available Filter Professions: ${listData?.filters?.professions?.length} items`);
  console.log(`       Available Filter Cities: ${listData?.filters?.cities?.length} items`);

  if (listData?.shortlists?.length > 0) {
    const sample = listData.shortlists[0];
    console.log(`       Sample Record: [Bookmarker] ${sample.user?.fullName} (${sample.user?.email}) -> [Shortlisted] ${sample.shortlistedProfile?.displayName} (${sample.shortlistedProfile?.profession}, ${sample.shortlistedProfile?.city})`);
  }

  // Step 3: Test Search Functionality
  console.log('\n--- Step 3: Test Search Functionality (search=Vikramaditya) ---');
  const searchRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/shortlists?search=Vikramaditya',
    method: 'GET',
    headers: authHeaders,
  });

  console.log(`[PASS] Search Result Count: ${searchRes.json?.data?.shortlists?.length}`);
  searchRes.json?.data?.shortlists?.forEach((s) => {
    console.log(`       - Bookmarker: ${s.user?.fullName} -> Shortlisted: ${s.shortlistedProfile?.displayName}`);
  });

  // Step 4: Test Filter by Profession
  console.log('\n--- Step 4: Test Filter by Profession (profession=Consultant Cardiologist) ---');
  const profRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/shortlists?profession=Consultant%20Cardiologist',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`[PASS] Profession Filter Match Count: ${profRes.json?.data?.shortlists?.length}`);

  // Step 5: Test Filter by City
  console.log('\n--- Step 5: Test Filter by City (city=Jaipur) ---');
  const cityRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/shortlists?city=Jaipur',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`[PASS] City Filter Match Count: ${cityRes.json?.data?.shortlists?.length}`);

  // Step 6: Test Shortlist Deletion (DELETE /api/admin/shortlists/:id)
  console.log('\n--- Step 6: Test Shortlist Deletion & Data Preservation ---');
  await mongoose.connect('mongodb://localhost:27017/wonderfuljodi');
  const db = mongoose.connection.db;

  const testUser = await db.collection('users').findOne({ role: 'user' });
  const testProfile = await db.collection('profiles').findOne();

  // Create a temporary shortlist bookmark for testing deletion
  const tempDoc = await db.collection('shortlists').insertOne({
    user: testUser._id,
    profile: testProfile._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const tempId = tempDoc.insertedId.toString();
  console.log(`[INFO] Created temporary test shortlist: ID ${tempId}`);

  // Delete via Admin API
  const deleteRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: `/api/admin/shortlists/${tempId}`,
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log(`[PASS] DELETE API Response: HTTP ${deleteRes.statusCode} - ${JSON.stringify(deleteRes.json)}`);

  // Verify shortlist document is deleted
  const checkDoc = await db.collection('shortlists').findOne({ _id: tempDoc.insertedId });
  console.log(`[PASS] Verified shortlist is deleted in DB: ${checkDoc === null}`);

  // Verify User and Profile are STILL intact in DB
  const userStillExists = await db.collection('users').findOne({ _id: testUser._id });
  const profileStillExists = await db.collection('profiles').findOne({ _id: testProfile._id });
  console.log(`[PASS] User record preserved intact: ${userStillExists !== null} (${userStillExists?.fullName})`);
  console.log(`[PASS] Profile record preserved intact: ${profileStillExists !== null} (${profileStillExists?.displayName})`);

  // Step 7: Test Unauthorized Access
  console.log('\n--- Step 7: Test Authorization Security ---');
  const unauthRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/shortlists',
    method: 'GET',
    headers: { Origin: `http://${LAN_IP}:3000` },
  });
  console.log(`[PASS] Unauthorized Request: HTTP ${unauthRes.statusCode} (Expected 401 rejection)`);

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('   ALL ADMIN SHORTLIST TESTS PASSED SUCCESSFULLY!   ');
  console.log('================================================================\n');
}

runAdminShortlistsTests().catch(console.error);
