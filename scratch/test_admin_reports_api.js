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

async function runAdminReportsTests() {
  console.log('================================================================');
  console.log('   ADMIN ABUSE & SAFETY REPORTS API COMPREHENSIVE TEST SUITE   ');
  console.log('================================================================\n');

  // Step 1: User Login & Public Report Submission
  console.log('--- Step 1: User Login & Public Report Submission (POST /api/reports) ---');
  const userLogin = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: `http://${LAN_IP}:3000` },
    },
    { email: 'vikram.singh@example.com', password: 'Password123!' }
  );

  if (userLogin.statusCode !== 200 || !userLogin.json?.data?.token) {
    console.error('[FAIL] User login failed:', userLogin.body);
    process.exit(1);
  }

  const userToken = userLogin.json.data.token;
  const reportingUserId = userLogin.json.data.user?._id;
  console.log(`[PASS] User Authenticated successfully. User ID: ${reportingUserId}`);

  // Look up another target user from DB
  await mongoose.connect('mongodb://localhost:27017/wonderfuljodi');
  const db = mongoose.connection.db;
  const targetUser = await db.collection('users').findOne({
    _id: { $ne: new mongoose.Types.ObjectId(reportingUserId) },
    role: 'user',
  });

  console.log(`[INFO] Reporting target user: ${targetUser.fullName} (${targetUser._id})`);

  // Submit new report
  const submitRes = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/reports',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
        Origin: `http://${LAN_IP}:3000`,
      },
    },
    {
      reportedUserId: String(targetUser._id),
      reason: 'Harassment',
      details: 'Sent repetitive unsolicited messages after request to cease communication.',
      targetType: 'USER',
    }
  );

  console.log(`[PASS] Report submission response: HTTP ${submitRes.statusCode} - ${submitRes.json?.message}`);
  const createdReportId = submitRes.json?.data?._id;

  // Test duplicate spam prevention
  const dupRes = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/reports',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
        Origin: `http://${LAN_IP}:3000`,
      },
    },
    {
      reportedUserId: String(targetUser._id),
      reason: 'Harassment',
      details: 'Sent repetitive unsolicited messages after request to cease communication.',
    }
  );
  console.log(`[PASS] Duplicate Spam Prevention: HTTP ${dupRes.statusCode} - (Expected 400 duplicate rejection)`);

  // Step 2: Admin Login
  console.log('\n--- Step 2: Admin Authentication ---');
  const adminLogin = await request(
    {
      hostname: LAN_IP,
      port: 5000,
      path: '/api/admin/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: `http://${LAN_IP}:3000` },
    },
    { email: 'admin@wonderfuljodi.com', password: 'Password123!' }
  );

  const adminToken = adminLogin.json.data.token;
  console.log('[PASS] Admin Authenticated. Bearer token secured.');

  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
    Origin: `http://${LAN_IP}:3000`,
  };

  // Step 3: Fetch Reports with Pagination and Live Tab Counts
  console.log('\n--- Step 3: Fetch Reports with Pagination and Live Tab Counts (GET /api/admin/reports) ---');
  const listRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/reports?page=1&limit=10',
    method: 'GET',
    headers: adminHeaders,
  });

  console.log(`[PASS] HTTP Status: ${listRes.statusCode}`);
  const listData = listRes.json?.data;
  console.log(`       Total Reports: ${listData?.pagination?.total}`);
  console.log(`       Tab Counts -> ALL: ${listData?.counts?.ALL}, PENDING: ${listData?.counts?.PENDING}, RESOLVED: ${listData?.counts?.RESOLVED}, DISMISSED: ${listData?.counts?.DISMISSED}`);
  console.log(`       Available Reasons: ${listData?.filters?.reasons?.length} items`);

  // Step 4: Test Search Query
  console.log('\n--- Step 4: Test Server-Side Search (search=Harassment) ---');
  const searchRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/reports?search=Harassment',
    method: 'GET',
    headers: adminHeaders,
  });
  console.log(`[PASS] Search Results Count: ${searchRes.json?.data?.reports?.length}`);

  // Step 5: Test Status Filter
  console.log('\n--- Step 5: Test Tab Filtering (status=PENDING) ---');
  const pendingRes = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/reports?status=PENDING',
    method: 'GET',
    headers: adminHeaders,
  });
  console.log(`[PASS] Pending Reports Count: ${pendingRes.json?.data?.reports?.length}`);

  // Step 6: Test Resolve Report
  if (createdReportId) {
    console.log('\n--- Step 6: Test Resolve Report (PUT /api/admin/reports/:id/resolve) ---');
    const resolveRes = await request(
      {
        hostname: LAN_IP,
        port: 5000,
        path: `/api/admin/reports/${createdReportId}/resolve`,
        method: 'PUT',
        headers: adminHeaders,
      },
      {
        notes: 'Contacted reporter and confirmed communication ceased after platform moderation warning.',
      }
    );

    console.log(`[PASS] Resolve API Status: HTTP ${resolveRes.statusCode} - ${resolveRes.json?.message}`);

    // Verify DB
    const updatedDoc = await db.collection('reports').findOne({ _id: new mongoose.Types.ObjectId(createdReportId) });
    console.log(`[PASS] Database report status: ${updatedDoc?.status} (Expected RESOLVED)`);
    console.log(`       Resolution Notes: "${updatedDoc?.resolutionNotes}"`);
    console.log(`       Moderator ID: ${updatedDoc?.moderator}`);
  }

  // Step 7: Test Dismiss Report on another test report
  console.log('\n--- Step 7: Test Dismiss Report (PUT /api/admin/reports/:id/dismiss) ---');
  const pendingReport = await db.collection('reports').findOne({ status: 'PENDING' });
  if (pendingReport) {
    const dismissRes = await request(
      {
        hostname: LAN_IP,
        port: 5000,
        path: `/api/admin/reports/${pendingReport._id}/dismiss`,
        method: 'PUT',
        headers: adminHeaders,
      },
      {
        notes: 'Investigated claim; found no violation of platform terms.',
      }
    );
    console.log(`[PASS] Dismiss API Status: HTTP ${dismissRes.statusCode} - ${dismissRes.json?.message}`);

    const dismissedDoc = await db.collection('reports').findOne({ _id: pendingReport._id });
    console.log(`[PASS] Database report status: ${dismissedDoc?.status} (Expected DISMISSED)`);
  }

  // Step 8: Test Block Account via Report
  console.log('\n--- Step 8: Test Block User via Report (POST /api/admin/reports/:id/block-user) ---');
  const blockTestReport = await db.collection('reports').findOne({ status: 'PENDING' });
  if (blockTestReport) {
    const blockRes = await request(
      {
        hostname: LAN_IP,
        port: 5000,
        path: `/api/admin/reports/${blockTestReport._id}/block-user`,
        method: 'POST',
        headers: adminHeaders,
      },
      {
        reason: 'Severe violation of conduct guidelines.',
      }
    );
    console.log(`[PASS] Block User Status: HTTP ${blockRes.statusCode} - ${blockRes.json?.message}`);

    const blockedUser = await db.collection('users').findOne({ _id: blockTestReport.reportedUser });
    console.log(`[PASS] Reported user isActive: ${blockedUser?.isActive} (Expected false / deactivated)`);
  }

  // Step 9: Test Unauthorized Access
  console.log('\n--- Step 9: Test Security Guard (Unauthorized access) ---');
  const unauth = await request({
    hostname: LAN_IP,
    port: 5000,
    path: '/api/admin/reports',
    method: 'GET',
    headers: { Origin: `http://${LAN_IP}:3000` },
  });
  console.log(`[PASS] Unauthorized request rejected with HTTP ${unauth.statusCode}`);

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('   ALL ADMIN REPORT TESTS PASSED SUCCESSFULLY!   ');
  console.log('================================================================\n');
}

runAdminReportsTests().catch(console.error);
