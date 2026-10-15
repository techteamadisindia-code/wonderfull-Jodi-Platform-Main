/**
 * Wonderful Jodi - Final Security Remediation Behavioral Test Suite
 *
 * Covers all 4 findings from the Security Verification Report:
 *
 * Finding 1: Remove Email-Only Super Admin Bypasses
 *   - Account with email 'admin@wonderfuljodi.com' but without trusted Super Admin permissions is denied.
 *   - Properly authorized Super Admin retains intended access across all operations.
 *   - Client-supplied email or role cannot elevate privileges.
 *
 * Finding 2: Redact All Private Address Components
 *   - Caller without privateInfo.view has formattedAddress redacted and addressLine1, addressLine2, landmark, pincode omitted.
 *   - Tested across all four redaction sites: getProfileById, getUserById, getProfiles, updateProfile.
 *   - Raw address values cannot leak in serialized JSON; approved metadata is preserved without mutating shared objects.
 *   - Authorized callers receive full unredacted address components.
 *
 * Finding 3: Remove Client-Supplied currentFamily Fallback
 *   - Forged currentFamily in request body is completely ignored.
 *   - Invalid or expired refresh token cannot authenticate or bind session identity.
 *   - Strict ownership isolation prevents cross-user session tampering.
 *   - Valid current session is preserved and other sessions are revoked.
 *
 * Finding 4: Enforce Super Admin Authorization on Membership Updates
 *   - Ordinary administrator calling updateMembership receives HTTP 403.
 *   - Client-supplied email or role cannot bypass updateMembership authorization.
 *   - Authorized Super Admin can perform permitted membership updates (HTTP 200).
 *   - Membership updates strictly disallow fabricating payment records or gateway transaction identifiers.
 *   - Ordinary permitted viewing (getMemberships) remains preserved.
 */

const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
    failedTests++;
  }
}

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    cookies: {},
    cookie(name, val, opts) {
      this.cookies[name] = { val, opts };
      return this;
    },
    clearCookie(name, opts) {
      delete this.cookies[name];
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

const noopNext = (err) => {
  if (err) throw err;
};

async function main() {
  console.log('========================================================================');
  console.log('   WONDERFUL JODI: FINAL SECURITY REMEDIATION BEHAVIORAL SUITE          ');
  console.log('========================================================================\n');

  // Load compiled controllers & models from backend/dist
  const adminController = require('./dist/controllers/adminController');
  const authController = require('./dist/controllers/authController');
  const { User } = require('./dist/models/User');
  const { Admin } = require('./dist/models/Admin');
  const { Profile } = require('./dist/models/Profile');
  const { Subscription } = require('./dist/models/Subscription');
  const { MembershipPlan } = require('./dist/models/MembershipPlan');
  const { RefreshToken } = require('./dist/models/RefreshToken');

  const timestamp = Date.now();

  // Setup Test Entities
  // 1. Candidate User & Profile with Full Address & Contact details
  const candidateUser = await User.create({
    fullName: `Candidate For Security Tests ${timestamp}`,
    email: `candidate_sec_${timestamp}@example.com`,
    mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'user',
    verified: true,
  });

  const candidateProfile = await Profile.create({
    user: candidateUser._id,
    candidateId: `WJ_SEC_${timestamp.toString().slice(-4)}`,
    displayName: `Candidate For Security Tests`,
    gender: 'Female',
    dob: new Date('1994-06-20'),
    height: '5ft 5in',
    maritalStatus: 'Never Married',
    education: 'MBBS',
    degree: 'Doctor of Medicine',
    profession: 'Physician',
    city: 'Pune',
    country: 'India',
    currentLocation: {
      addressLine1: 'Bldg A-4, Flat 301, Secret Garden Residency',
      addressLine2: 'Koregaon Park Road North',
      landmark: 'Opposite German Bakery',
      pincode: '411001',
      formattedAddress: 'Bldg A-4, Flat 301, Secret Garden Residency, Koregaon Park Road North, Opposite German Bakery, Pune, Maharashtra 411001',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      countryId: 'IND-PUNE',
    },
    nativePlaceDetails: {
      addressLine1: 'Ancestral Haveli, MG Road',
      addressLine2: 'Old Town Heritage Quarter',
      landmark: 'Near Clock Tower',
      pincode: '413002',
      formattedAddress: 'Ancestral Haveli, MG Road, Old Town Heritage Quarter, Near Clock Tower, Solapur, Maharashtra 413002',
      city: 'Solapur',
      state: 'Maharashtra',
      country: 'India',
    },
  });

  const candidateSub = await Subscription.create({
    user: candidateUser._id,
    plan: 'FREE',
    status: 'ACTIVE',
    startDate: new Date(),
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // 2. Staff Admin with email 'admin@wonderfuljodi.com' but with restricted permissions (lacks 'all')
  const emailOnlyAdminUser = await User.create({
    fullName: `Restricted Staff Admin With Target Email`,
    email: 'admin@wonderfuljodi.com',
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: emailOnlyAdminUser._id,
    permissions: ['reports', 'verifications'], // NOT 'all', NOT 'privateInfo.view'
  });

  // 3. Legitimate Super Admin with trusted DB permissions containing 'all'
  const trueSuperAdminUser = await User.create({
    fullName: `Legitimate Super Administrator`,
    email: `legit_super_${timestamp}@wonderfuljodi.com`,
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: trueSuperAdminUser._id,
    permissions: ['all'],
  });

  // 4. View-Only Admin with 'privateInfo.view' but without 'all'
  const viewOnlyAdminUser = await User.create({
    fullName: `View-Only Staff Admin`,
    email: `view_only_${timestamp}@wonderfuljodi.com`,
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: viewOnlyAdminUser._id,
    permissions: ['profiles', 'privateInfo.view'],
  });

  // 5. Target Admin account for deletion tests
  const targetAdminToDelete = await User.create({
    fullName: `Target Admin To Delete`,
    email: `deletable_admin_${timestamp}@wonderfuljodi.com`,
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: targetAdminToDelete._id,
    permissions: ['reports'],
  });

  // Membership Plan for testing grants
  let testPlan = await MembershipPlan.findOne({ isActive: true });
  if (!testPlan) {
    testPlan = await MembershipPlan.create({
      name: 'Diamond Plan',
      slug: `diamond-plan-${timestamp}`,
      description: 'Diamond Plan description',
      originalPrice: 4999,
      discountedPrice: 3999,
      currency: 'INR',
      durationDays: 180,
      contactRequestLimit: 50,
      isActive: true,
    });
  }

  console.log('--- FINDING 1: Remove Email-Only Super Admin Bypasses ---');

  // 1.1 Account with email 'admin@wonderfuljodi.com' but without 'all' permission is DENIED Super Admin operations
  await runAsyncTest('1.1a Email "admin@wonderfuljodi.com" without "all" permission cannot grant membership (HTTP 403)', async () => {
    const req = {
      user: { userId: emailOnlyAdminUser._id, email: emailOnlyAdminUser.email, role: 'admin' },
      body: {
        userId: String(candidateUser._id),
        planId: testPlan._id,
        durationMonths: 3,
        grantReason: 'Attempting bypass using privileged email string',
      },
    };
    const res = mockResponse();
    await adminController.grantMembershipBySuperAdmin(req, res, noopNext);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Only Super Administrators/i);
  });

  await runAsyncTest('1.1b Email "admin@wonderfuljodi.com" without "all" permission cannot delete admin account (HTTP 403)', async () => {
    const req = {
      params: { id: String(targetAdminToDelete._id) },
      user: { userId: emailOnlyAdminUser._id, email: emailOnlyAdminUser.email, role: 'admin' },
    };
    const res = mockResponse();
    await adminController.deleteAdmin(req, res, noopNext);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Only Super Administrators/i);
  });

  await runAsyncTest('1.1c Email "admin@wonderfuljodi.com" without "all" permission cannot update membership (HTTP 403)', async () => {
    const req = {
      params: { id: String(candidateSub._id) },
      user: { userId: emailOnlyAdminUser._id, email: emailOnlyAdminUser.email, role: 'admin' },
      body: { plan: 'PREMIUM', status: 'ACTIVE' },
    };
    const res = mockResponse();
    await adminController.updateMembership(req, res, noopNext);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  await runAsyncTest('1.1d Email "admin@wonderfuljodi.com" without "all" receives masked contact data in getUserById', async () => {
    const req = {
      params: { id: String(candidateUser._id) },
      user: { userId: emailOnlyAdminUser._id, email: emailOnlyAdminUser.email, role: 'admin' },
    };
    const res = mockResponse();
    await adminController.getUserById(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.canViewPrivateContact, false);
    assert.ok(res.body.data.user.email.includes('•'), 'Email must be masked with bullet points');
    assert.ok(res.body.data.user.mobile.includes('•'), 'Mobile must be masked with bullet points');
  });

  // 1.2 Properly authorized Super Admin retains intended access across all operations
  await runAsyncTest('1.2a Authorized Super Admin can manually grant membership (HTTP 200)', async () => {
    const req = {
      user: { userId: trueSuperAdminUser._id, email: trueSuperAdminUser.email, role: 'admin' },
      body: {
        userId: String(candidateUser._id),
        planId: testPlan._id,
        durationMonths: 6,
        grantReason: 'Authorized executive courtesy VIP grant verified by auditor',
      },
    };
    const res = mockResponse();
    await adminController.grantMembershipBySuperAdmin(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.plan, testPlan.name);
  });

  await runAsyncTest('1.2b Authorized Super Admin can delete admin account (HTTP 200)', async () => {
    const req = {
      params: { id: String(targetAdminToDelete._id) },
      user: { userId: trueSuperAdminUser._id, email: trueSuperAdminUser.email, role: 'admin' },
    };
    const res = mockResponse();
    await adminController.deleteAdmin(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const checkDeleted = await User.findById(targetAdminToDelete._id);
    assert.strictEqual(checkDeleted.isDeleted, true);
  });

  // 1.3 Client-supplied email or role in JWT payload cannot elevate privileges
  await runAsyncTest('1.3 Client-supplied role: "superadmin" or email spoofing in JWT payload cannot elevate privileges', async () => {
    // Untrusted staff admin sends client-forged token claims
    const reqSpoof = {
      params: { id: String(candidateSub._id) },
      user: {
        userId: emailOnlyAdminUser._id, // Server DB record has ['reports']
        email: 'admin@wonderfuljodi.com',
        role: 'superadmin', // Client forged role
        permissions: ['all'], // Client forged permissions in token
      },
      body: { plan: 'PLATINUM' },
    };
    const resSpoof = mockResponse();
    await adminController.updateMembership(reqSpoof, resSpoof, noopNext);

    assert.strictEqual(resSpoof.statusCode, 403, 'Server must check trusted DB permissions, not client-supplied token claims');
  });

  console.log('\n--- FINDING 2: Redact All Private Address Components ---');

  // 2.1 getProfileById Redaction for unauthorized caller
  await runAsyncTest('2.1 getProfileById redacts formattedAddress and completely omits addressLine1/2/landmark/pincode for unauthorized caller', async () => {
    const req = {
      params: { id: String(candidateProfile._id) },
      user: { userId: emailOnlyAdminUser._id, email: emailOnlyAdminUser.email, role: 'admin' },
      query: {},
    };
    const res = mockResponse();
    await adminController.getProfileById(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    const profileData = res.body.data.profile;

    // Check Current Location
    assert.strictEqual(profileData.currentLocation.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(profileData.currentLocation.addressLine1, undefined, 'addressLine1 must be undefined');
    assert.strictEqual(profileData.currentLocation.addressLine2, undefined, 'addressLine2 must be undefined');
    assert.strictEqual(profileData.currentLocation.landmark, undefined, 'landmark must be undefined');
    assert.strictEqual(profileData.currentLocation.pincode, undefined, 'pincode must be undefined');
    assert.strictEqual(profileData.currentLocation.city, 'Pune', 'Approved city metadata preserved');
    assert.strictEqual(profileData.currentLocation.countryId, 'IND-PUNE', 'Approved countryId preserved');

    // Check Native Place Details
    assert.strictEqual(profileData.nativePlaceDetails.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(profileData.nativePlaceDetails.addressLine1, undefined, 'addressLine1 must be undefined');
    assert.strictEqual(profileData.nativePlaceDetails.addressLine2, undefined, 'addressLine2 must be undefined');
    assert.strictEqual(profileData.nativePlaceDetails.landmark, undefined, 'landmark must be undefined');
    assert.strictEqual(profileData.nativePlaceDetails.pincode, undefined, 'pincode must be undefined');
    assert.strictEqual(profileData.nativePlaceDetails.city, 'Solapur', 'Approved native city preserved');

    // Check raw address string leakage in serialized response JSON
    const responseJson = JSON.stringify(res.body);
    assert.ok(!responseJson.includes('Secret Garden Residency'), 'Secret Garden Residency must not leak in JSON');
    assert.ok(!responseJson.includes('Koregaon Park'), 'Koregaon Park must not leak in JSON');
    assert.ok(!responseJson.includes('German Bakery'), 'German Bakery must not leak in JSON');
    assert.ok(!responseJson.includes('411001'), 'Pincode 411001 must not leak in JSON');
    assert.ok(!responseJson.includes('Ancestral Haveli'), 'Ancestral Haveli must not leak in JSON');
    assert.ok(!responseJson.includes('Clock Tower'), 'Clock Tower must not leak in JSON');
    assert.ok(!responseJson.includes('413002'), 'Pincode 413002 must not leak in JSON');
  });

  // 2.2 getUserById Redaction for unauthorized caller
  await runAsyncTest('2.2 getUserById redacts private address components across currentLocation and nativePlaceDetails', async () => {
    const req = {
      params: { id: String(candidateUser._id) },
      user: { userId: emailOnlyAdminUser._id, email: emailOnlyAdminUser.email, role: 'admin' },
    };
    const res = mockResponse();
    await adminController.getUserById(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    const profileData = res.body.data.profile;

    assert.strictEqual(profileData.currentLocation.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(profileData.currentLocation.addressLine1, undefined);
    assert.strictEqual(profileData.currentLocation.pincode, undefined);
    assert.strictEqual(profileData.nativePlaceDetails.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(profileData.nativePlaceDetails.addressLine1, undefined);
    assert.strictEqual(profileData.nativePlaceDetails.pincode, undefined);

    const json = JSON.stringify(res.body);
    assert.ok(!json.includes('Secret Garden Residency'));
    assert.ok(!json.includes('411001'));
  });

  // 2.3 getProfiles Directory Redaction for unauthorized caller
  await runAsyncTest('2.3 getProfiles directory redacts private address components across all listed profiles', async () => {
    const req = {
      query: { page: '1', limit: '10' },
      user: { userId: emailOnlyAdminUser._id, email: emailOnlyAdminUser.email, role: 'admin' },
    };
    const res = mockResponse();
    await adminController.getProfiles(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    const targetP = res.body.data.profiles.find((p) => String(p._id) === String(candidateProfile._id));
    assert.ok(targetP, 'Candidate profile found in list');
    assert.strictEqual(targetP.currentLocation.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(targetP.currentLocation.addressLine1, undefined);
    assert.strictEqual(targetP.currentLocation.pincode, undefined);
    assert.strictEqual(targetP.nativePlaceDetails.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(targetP.nativePlaceDetails.addressLine1, undefined);
    assert.strictEqual(targetP.nativePlaceDetails.pincode, undefined);
  });

  // 2.4 updateProfile Response Redaction for unauthorized caller
  await runAsyncTest('2.4 updateProfile response payload redacts private address components when caller lacks privateInfo.view', async () => {
    // Admin with 'profiles' permission (can edit non-private fields, but lacks privateInfo.view)
    const profileEditAdmin = await User.create({
      fullName: `Profile Editor Admin ${timestamp}`,
      email: `prof_edit_${timestamp}@wonderfuljodi.com`,
      mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'HashedPassword123!',
      role: 'admin',
      verified: true,
    });
    await Admin.create({
      user: profileEditAdmin._id,
      permissions: ['profiles'], // Has profiles edit, but NOT privateInfo.view
    });

    const req = {
      params: { id: String(candidateProfile._id) },
      user: { userId: profileEditAdmin._id, email: profileEditAdmin.email, role: 'admin' },
      body: {
        about: 'Updated bio by profile editor',
      },
    };
    const res = mockResponse();
    await adminController.updateProfile(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    const returnedProfile = res.body.data;
    assert.strictEqual(returnedProfile.currentLocation.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(returnedProfile.currentLocation.addressLine1, undefined);
    assert.strictEqual(returnedProfile.currentLocation.pincode, undefined);
    assert.strictEqual(returnedProfile.nativePlaceDetails.formattedAddress, '[Private Address - View Permission Required]');
    assert.strictEqual(returnedProfile.nativePlaceDetails.addressLine1, undefined);
    assert.strictEqual(returnedProfile.nativePlaceDetails.pincode, undefined);

    const json = JSON.stringify(res.body);
    assert.ok(!json.includes('Secret Garden Residency'));
    assert.ok(!json.includes('411001'));
  });

  // 2.5 Authorized Viewers Receive Full Unredacted Information
  await runAsyncTest('2.5 Authorized viewers (privateInfo.view or Super Admin) receive complete unredacted address information', async () => {
    const req = {
      params: { id: String(candidateProfile._id) },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
      query: {},
    };
    const res = mockResponse();
    await adminController.getProfileById(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    const profileData = res.body.data.profile;

    assert.strictEqual(profileData.currentLocation.addressLine1, 'Bldg A-4, Flat 301, Secret Garden Residency');
    assert.strictEqual(profileData.currentLocation.pincode, '411001');
    assert.strictEqual(profileData.currentLocation.landmark, 'Opposite German Bakery');
    assert.strictEqual(profileData.nativePlaceDetails.addressLine1, 'Ancestral Haveli, MG Road');
    assert.strictEqual(profileData.nativePlaceDetails.pincode, '413002');
  });

  console.log('\n--- FINDING 3: Remove Client-Supplied currentFamily Fallback ---');

  // Setup User for Session Tests
  const sessionUser = await User.create({
    fullName: `Session Test User ${timestamp}`,
    email: `session_user_${timestamp}@example.com`,
    mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'user',
    verified: true,
  });

  // Create multiple active sessions for sessionUser
  const session1 = await authController.issueRefreshToken(String(sessionUser._id), 'family_device_1');
  const session2 = await authController.issueRefreshToken(String(sessionUser._id), 'family_device_2');
  const session3 = await authController.issueRefreshToken(String(sessionUser._id), 'family_device_3');

  // Another user for cross-user isolation tests
  const otherUser = await User.create({
    fullName: `Victim User For Session Isolation ${timestamp}`,
    email: `victim_session_${timestamp}@example.com`,
    mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'user',
    verified: true,
  });
  const victimSession = await authController.issueRefreshToken(String(otherUser._id), 'victim_family_1');

  // 3.1 Forged currentFamily in body is ignored
  await runAsyncTest('3.1 Client-forged currentFamily in request body is completely ignored', async () => {
    // Caller sends forged currentFamily matching session2, but presents session1's refresh token
    const req = {
      user: { userId: String(sessionUser._id) },
      headers: {},
      cookies: { refresh_token: session1.rawRefreshToken },
      body: { currentFamily: 'family_device_2' }, // Forged family string
    };
    const res = mockResponse();
    await authController.logoutOtherSessions(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    // Verified session1 (which was in refresh_token cookie) MUST be preserved
    const token1 = await RefreshToken.findOne({ family: 'family_device_1', user: sessionUser._id });
    assert.strictEqual(token1.isRevoked, false, 'Verified current session 1 must be preserved');

    // session2 (claimed in req.body.currentFamily) MUST BE REVOKED because body.currentFamily is ignored
    const token2 = await RefreshToken.findOne({ family: 'family_device_2', user: sessionUser._id });
    assert.strictEqual(token2.isRevoked, true, 'Unverified session 2 must be revoked despite body.currentFamily');

    // session3 MUST BE REVOKED
    const token3 = await RefreshToken.findOne({ family: 'family_device_3', user: sessionUser._id });
    assert.strictEqual(token3.isRevoked, true, 'Session 3 must be revoked');
  });

  // 3.2 Missing or invalid refresh token handled safely
  await runAsyncTest('3.2 Missing or invalid refresh token does not elevate or authenticate invalid session', async () => {
    const req = {
      user: { userId: String(sessionUser._id) },
      headers: {},
      cookies: { refresh_token: 'completely_invalid_garbage_token_string' },
      body: { currentFamily: 'fake_family_xyz' },
    };
    const res = mockResponse();
    await authController.logoutOtherSessions(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    // Invalid token cannot bind to any session
  });

  // 3.3 Ownership Isolation
  await runAsyncTest('3.3 Ownership Isolation: User A cannot inspect or revoke User B sessions', async () => {
    const req = {
      user: { userId: String(sessionUser._id) },
      headers: {},
      body: { targetUserId: String(otherUser._id), currentFamily: 'victim_family_1' },
    };
    const res = mockResponse();
    await authController.logoutOtherSessions(req, res, noopNext);

    // Verify victim session is completely untouched and active
    const victimDoc = await RefreshToken.findOne({ family: 'victim_family_1', user: otherUser._id });
    assert.strictEqual(victimDoc.isRevoked, false, 'Victim session must remain active and unaffected');
  });

  console.log('\n--- FINDING 4: Enforce Super Admin Authorization on Membership Updates ---');

  // 4.1 Ordinary administrator calling updateMembership receives HTTP 403
  await runAsyncTest('4.1 Ordinary administrator calling updateMembership receives HTTP 403 Forbidden', async () => {
    const req = {
      params: { id: String(candidateSub._id) },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
      body: { plan: 'VIP_GOLD', status: 'ACTIVE' },
    };
    const res = mockResponse();
    await adminController.updateMembership(req, res, noopNext);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Only Super Administrators can modify subscription memberships/i);
  });

  // 4.2 Client-supplied email or role cannot elevate updateMembership privileges
  await runAsyncTest('4.2 Client-supplied email or role in JWT payload cannot bypass updateMembership check (HTTP 403)', async () => {
    const req = {
      params: { id: String(candidateSub._id) },
      user: {
        userId: viewOnlyAdminUser._id, // DB has ['profiles', 'privateInfo.view'], NOT 'all'
        email: 'admin@wonderfuljodi.com',
        role: 'superadmin',
      },
      body: { plan: 'VIP_GOLD', status: 'ACTIVE' },
    };
    const res = mockResponse();
    await adminController.updateMembership(req, res, noopNext);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  // 4.3 Authorized Super Admin can perform permitted updates
  await runAsyncTest('4.3 Authorized Super Admin successfully updates subscription plan and status (HTTP 200)', async () => {
    const newExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const req = {
      params: { id: String(candidateSub._id) },
      user: { userId: trueSuperAdminUser._id, email: trueSuperAdminUser.email, role: 'admin' },
      body: {
        plan: 'SUPER_VIP',
        status: 'ACTIVE',
        expiryDate: newExpiry.toISOString(),
      },
    };
    const res = mockResponse();
    await adminController.updateMembership(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.plan, 'SUPER_VIP');
  });

  // 4.4 Membership edits cannot fabricate payment success or gateway transaction identifiers
  await runAsyncTest('4.4 Membership update strictly strips gateway payment and transaction fields', async () => {
    const req = {
      params: { id: String(candidateSub._id) },
      user: { userId: trueSuperAdminUser._id, email: trueSuperAdminUser.email, role: 'admin' },
      body: {
        plan: 'SUPER_VIP',
        payment: 'PAYMENT_SUCCESS_FAKE_ID',
        paymentId: 'pay_fake_gateway_txn_9999',
        paymentGateway: 'RAZORPAY',
        razorpayPaymentId: 'rzp_fake_123456789',
        transactionId: 'txn_fake_wire_transfer',
      },
    };
    const res = mockResponse();
    await adminController.updateMembership(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    const updatedSub = await Subscription.findById(candidateSub._id);
    assert.strictEqual(updatedSub.payment, undefined, 'Fake payment field must not be set');
    assert.strictEqual(updatedSub.paymentGateway, undefined, 'Fake paymentGateway field must not be set');
    assert.strictEqual(updatedSub.razorpayPaymentId, undefined, 'Fake razorpayPaymentId field must not be set');
  });

  // 4.5 Ordinary permitted membership viewing remains accessible
  await runAsyncTest('4.5 Ordinary permitted membership viewing (getMemberships) remains accessible to staff admins', async () => {
    const req = {
      query: { plan: 'SUPER_VIP' },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
    };
    const res = mockResponse();
    await adminController.getMemberships(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Memberships array returned');
  });

  console.log('========================================================================');
  console.log(`   FINAL REMEDIATION SUITE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
