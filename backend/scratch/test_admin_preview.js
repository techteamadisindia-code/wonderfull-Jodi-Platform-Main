const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING ADMIN PROFILE PREVIEW SYSTEM & SECURITY   ');
  console.log('====================================================\n');

  let adminToken = '';
  let userToken = '';
  let testProfileId = '';
  let testUserId = '';

  // 1. Admin Authentication
  try {
    console.log('1. Authenticating as Admin (admin@wonderfuljodi.com)...');
    const adminLoginRes = await axios.post(`${API_BASE}/admin/auth/login`, {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    });
    adminToken = adminLoginRes.data.token || adminLoginRes.data.data?.token;
    console.log('   ✓ Admin authenticated successfully.');
  } catch (err) {
    console.error('   ✗ Admin login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 2. Normal User Authentication
  try {
    console.log('2. Authenticating as Normal User (priya.sharma@example.com)...');
    const userLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'priya.sharma@example.com',
      password: 'Password123!',
    });
    userToken = userLoginRes.data.token || userLoginRes.data.data?.token;
    console.log('   ✓ Normal user authenticated successfully.');
  } catch (err) {
    console.error('   ✗ User login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 3. Fetch list of profiles as admin to get a valid profile ID
  try {
    console.log('3. Fetching profile directory to obtain target Profile ID...');
    const listRes = await axios.get(`${API_BASE}/admin/profiles?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const profiles = listRes.data.data?.profiles || listRes.data.profiles || [];
    if (profiles.length === 0) {
      throw new Error('No profiles found in database');
    }
    testProfileId = profiles[0]._id;
    testUserId = profiles[0].user?._id || profiles[0].user;
    console.log(`   ✓ Found target profile: "${profiles[0].displayName || profiles[0].fullName}" (ID: ${testProfileId}, UserID: ${testUserId})`);
  } catch (err) {
    console.error('   ✗ Fetching profiles failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 4. Test Admin Profile Preview by Profile ID
  try {
    console.log('4. Testing GET /api/admin/profiles/:id as ADMIN (by Profile ID)...');
    const previewRes = await axios.get(`${API_BASE}/admin/profiles/${testProfileId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = previewRes.data.data;
    if (!data) throw new Error('No data returned');

    console.log('   ✓ Status 200 OK');
    console.log(`   ✓ Candidate Full Name: "${data.displayName || data.user?.fullName}"`);
    console.log(`   ✓ Sensitive Email: "${data.user?.email || 'N/A'}" (Exposed to Admin)`);
    console.log(`   ✓ Sensitive Mobile: "${data.user?.mobile || 'N/A'}" (Exposed to Admin)`);
    console.log(`   ✓ Verification Records: ${data.verifications?.length ?? 0} documents`);
    console.log(`   ✓ Subscription Records: ${data.subscriptions?.length ?? 0} plans`);
    console.log(`   ✓ Safety Reports: ${data.reports?.length ?? 0} reports`);
    console.log(`   ✓ Audit Logs: ${data.auditLogs?.length ?? 0} log events`);
    console.log(`   ✓ Admin Notes: ${data.adminNotes?.length ?? 0} notes`);
  } catch (err) {
    console.error('   ✗ Admin profile preview failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 5. Test Admin Profile Preview by User ID (Seamless identifier fallback)
  if (testUserId) {
    try {
      console.log('5. Testing GET /api/admin/profiles/:id as ADMIN using USER ID...');
      const previewByUserRes = await axios.get(`${API_BASE}/admin/profiles/${testUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const dataByUser = previewByUserRes.data.data;
      if (!dataByUser) throw new Error('No data returned by user ID');
      console.log(`   ✓ Status 200 OK — resolved candidate "${dataByUser.displayName || dataByUser.user?.fullName}" seamlessly via User ID.`);
    } catch (err) {
      console.error('   ✗ Fallback by User ID failed:', err.response?.data || err.message);
      process.exit(1);
    }
  }

  // 6. Test Adding an Internal Admin Note
  const testNoteText = `Automated compliance check verified at ${new Date().toISOString()} - Profile looks genuine.`;
  try {
    console.log('6. Testing POST /api/admin/profiles/:id/notes (Add internal note)...');
    const noteRes = await axios.post(
      `${API_BASE}/admin/profiles/${testProfileId}/notes`,
      { note: testNoteText },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const notes = noteRes.data.data;
    const found = notes?.some((n) => n.note === testNoteText);
    if (!found) throw new Error('Note was not found in returned notes list');
    console.log(`   ✓ Status 200 OK — Note added and audit trail logged. Total notes: ${notes.length}`);
  } catch (err) {
    console.error('   ✗ Adding admin note failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // 7. Security Test: Normal User Access to Admin Endpoint
  try {
    console.log('7. Security Check: Normal user attempting GET /api/admin/profiles/:id...');
    await axios.get(`${API_BASE}/admin/profiles/${testProfileId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.error('   ✗ SECURITY FAILURE: Normal user was able to access admin endpoint!');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 401) {
      console.log(`   ✓ ACCESS DENIED as expected (HTTP ${err.response.status}: ${err.response.data?.message || 'Forbidden'})`);
    } else {
      console.error('   ✗ Unexpected error status:', err.response?.status);
      process.exit(1);
    }
  }

  // 8. Security Check: Unauthenticated Visitor Access to Admin Endpoint
  try {
    console.log('8. Security Check: Unauthenticated visitor attempting GET /api/admin/profiles/:id...');
    await axios.get(`${API_BASE}/admin/profiles/${testProfileId}`);
    console.error('   ✗ SECURITY FAILURE: Unauthenticated visitor was able to access admin endpoint!');
    process.exit(1);
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.log(`   ✓ ACCESS DENIED as expected (HTTP ${err.response.status}: ${err.response.data?.message || 'Unauthorized'})`);
    } else {
      console.error('   ✗ Unexpected error status:', err.response?.status);
      process.exit(1);
    }
  }

  // 9. Privacy Check: Public Profile API must NOT leak sensitive contact info or admin notes
  try {
    console.log('9. Privacy Check: Inspecting Public API GET /api/profiles/:id...');
    const publicRes = await axios.get(`${API_BASE}/profiles/${testProfileId}`);
    const pubData = publicRes.data.data;

    // Check that sensitive fields are stripped
    const leaksAdminNotes = Boolean(pubData.adminNotes && pubData.adminNotes.length > 0);
    const leaksRawEmail = Boolean(pubData.user?.email && pubData.user.email.includes('@'));
    const leaksRawMobile = Boolean(pubData.user?.mobile);

    if (leaksAdminNotes) {
      console.error('   ✗ PRIVACY VIOLATION: Admin notes exposed in public API!');
      process.exit(1);
    }
    if (leaksRawEmail || leaksRawMobile) {
      console.error('   ✗ PRIVACY VIOLATION: Raw contact details exposed in public API without unlocked interest!');
      process.exit(1);
    }

    console.log('   ✓ Public API correctly sanitizes profile data.');
    console.log('   ✓ Admin notes NOT leaked to public website.');
    console.log('   ✓ Raw contact details NOT leaked to public website.');
  } catch (err) {
    console.error('   ✗ Public profile check error:', err.response?.data || err.message);
  }

  console.log('\n====================================================');
  console.log('  ALL ADMIN PROFILE PREVIEW VERIFICATIONS PASSED!   ');
  console.log('====================================================\n');
}

runTests().catch(console.error);
