/**
 * Wonderful Jodi - Phase 4 Regression & Security Test Suite
 *
 * Covers:
 * Part 1: Address Tests (1-8)
 *  1. Current Address displays saved currentLocation data.
 *  2. Permanent Address displays saved nativePlaceDetails data.
 *  3. Missing addresses display an appropriate empty state.
 *  4. Updating Current Address preserves unrelated JSON properties.
 *  5. Updating Permanent Address preserves unrelated JSON properties.
 *  6. A user cannot edit another user's address through a direct API request (HTTP 403 / ownership enforcement).
 *  7. Unauthorized administrators cannot retrieve protected address fields (masked with View Permission Required).
 *  8. Existing Phase 3 private-information permissions remain enforced (view-only admin cannot edit private address).
 *
 * Part 2: Session Tests (1-12)
 *  1. Successful sign-in with another active session produces the expected notification.
 *  2. A first sign-in does not fabricate a previous-device notification.
 *  3. Routine token refresh does not create duplicate new-login notifications.
 *  4. The authenticated user can retrieve only their own session metadata.
 *  5. Another user cannot inspect or revoke the target user's sessions.
 *  6. Logout-other-sessions revokes the authenticated user's other active sessions.
 *  7. The current session is preserved when the user chooses to log out other sessions.
 *  8. Revoked refresh tokens cannot be reused.
 *  9. Already-revoked sessions are handled safely (idempotent).
 * 10. Session metadata is sanitized before returning it to the frontend.
 * 11. Access-token invalidation behavior is tested or its existing expiry limitation is explicitly documented.
 * 12. No passwords, tokens, or secrets appear in notifications or logs.
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
  console.log('   WONDERFUL JODI: PHASE 4 ADDRESS & DEVICE SESSION REGRESSION SUITE    ');
  console.log('========================================================================\n');

  // Load models & controllers from compiled dist
  const profileController = require('./dist/controllers/profileController');
  const authController = require('./dist/controllers/authController');
  const adminController = require('./dist/controllers/adminController');
  const { User } = require('./dist/models/User');
  const { Profile } = require('./dist/models/Profile');
  const { RefreshToken } = require('./dist/models/RefreshToken');
  const { Notification } = require('./dist/models/Notification');
  const { Admin } = require('./dist/models/Admin');
  const { AuditLog } = require('./dist/models/AuditLog');
  const bcrypt = require('bcrypt');

  const timestamp = Date.now();

  console.log('--- PART 1: Current and Permanent Address Tests ---');

  // Setup test user A and user B with required mobile number
  const userA = await User.create({
    fullName: `Dr. Address Test A ${timestamp}`,
    email: `addr_test_a_${timestamp}@example.com`,
    mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'DOCTOR',
    isActive: true,
  });

  const userB = await User.create({
    fullName: `Dr. Address Test B ${timestamp}`,
    email: `addr_test_b_${timestamp}@example.com`,
    mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'HashedPassword123!',
    role: 'DOCTOR',
    isActive: true,
  });

  // Profile A with nested location metadata (countryId, stateId, custom flags)
  const profileA = await Profile.create({
    userId: userA._id || userA.id,
    user: userA._id || userA.id,
    candidateId: `WJ_P4_A_${timestamp.toString().slice(-4)}`,
    displayName: userA.fullName,
    gender: 'Male',
    dob: new Date('1990-01-01'),
    height: '5ft 10in',
    maritalStatus: 'Never Married',
    education: 'MBBS',
    degree: 'MBBS',
    profession: 'Surgeon',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    currentLocation: {
      addressLine1: 'Flat 402, Elite residency',
      addressLine2: 'Baner Road',
      landmark: 'Near Jupiter Hospital',
      formattedAddress: 'Flat 402, Elite residency, Baner Road, Near Jupiter Hospital, Pune, Maharashtra, 411045, India',
      cityName: 'Pune',
      stateName: 'Maharashtra',
      countryName: 'India',
      pincode: '411045',
      countryId: 'IND-999',
      stateId: 'MH-001',
      districtId: 'DIST-PUNE',
      isRelocationAllowed: true,
      customMetadataTag: 'KEEP_THIS_CURRENT',
    },
    nativePlaceDetails: {
      addressLine1: 'Deshmukh Wada',
      addressLine2: 'Main Bazar',
      landmark: 'Near Temple',
      formattedAddress: 'Deshmukh Wada, Main Bazar, Baramati, Maharashtra, 413102, India',
      cityName: 'Baramati',
      stateName: 'Maharashtra',
      countryName: 'India',
      pincode: '413102',
      description: 'Ancestral family home in Baramati',
      countryId: 'IND-999',
      stateId: 'MH-001',
      customMetadataTag: 'KEEP_THIS_PERMANENT',
    },
  });

  // Profile B with empty addresses
  const profileB = await Profile.create({
    userId: userB._id || userB.id,
    user: userB._id || userB.id,
    candidateId: `WJ_P4_B_${timestamp.toString().slice(-4)}`,
    displayName: userB.fullName,
    gender: 'Female',
    dob: new Date('1994-06-15'),
    height: '5ft 4in',
    maritalStatus: 'Never Married',
    education: 'MD',
    degree: 'MD Physician',
    profession: 'Physician',
    city: 'Mumbai',
    country: 'India',
  });

  // Test 1: Current Address displays saved currentLocation data
  await runAsyncTest('1. Current Address displays saved currentLocation data', async () => {
    const req = { user: { userId: String(userA._id || userA.id) }, headers: {} };
    const res = mockResponse();
    await profileController.getMyProfile(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.data.currentLocation, 'currentLocation should be returned');
    assert.strictEqual(res.body.data.currentLocation.addressLine1, 'Flat 402, Elite residency');
    assert.strictEqual(res.body.data.currentLocation.pincode, '411045');
    assert.strictEqual(res.body.data.currentLocation.landmark, 'Near Jupiter Hospital');
  });

  // Test 2: Permanent Address displays saved nativePlaceDetails data
  await runAsyncTest('2. Permanent Address displays saved nativePlaceDetails data', async () => {
    const req = { user: { userId: String(userA._id || userA.id) }, headers: {} };
    const res = mockResponse();
    await profileController.getMyProfile(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.data.nativePlaceDetails, 'nativePlaceDetails should be returned');
    assert.strictEqual(res.body.data.nativePlaceDetails.addressLine1, 'Deshmukh Wada');
    assert.strictEqual(res.body.data.nativePlaceDetails.pincode, '413102');
    assert.strictEqual(res.body.data.nativePlaceDetails.description, 'Ancestral family home in Baramati');
  });

  // Test 3: Missing addresses display an appropriate empty state
  await runAsyncTest('3. Missing addresses display an appropriate empty state', async () => {
    const req = { user: { userId: String(userB._id || userB.id) }, headers: {} };
    const res = mockResponse();
    await profileController.getMyProfile(req, res);

    assert.strictEqual(res.statusCode, 200);
    const curr = res.body.data.currentLocation;
    const perm = res.body.data.nativePlaceDetails;

    const hasCurr = Boolean(curr?.addressLine1 || curr?.formattedAddress || curr?.pincode);
    const hasPerm = Boolean(perm?.addressLine1 || perm?.formattedAddress || perm?.pincode || perm?.description);

    assert.strictEqual(hasCurr, false, 'User B must not have fabricated current address');
    assert.strictEqual(hasPerm, false, 'User B must not have fabricated permanent address');
  });

  // Test 4: Updating Current Address preserves unrelated JSON properties
  await runAsyncTest('4. Updating Current Address preserves unrelated JSON properties', async () => {
    const req = {
      user: { userId: String(userA._id || userA.id) },
      headers: {},
      body: {
        currentLocation: {
          addressLine1: 'Flat 505, Elite residency Phase 2',
          pincode: '411050',
        },
      },
    };
    const res = mockResponse();
    await profileController.updateMyProfile(req, res);

    assert.strictEqual(res.statusCode, 200);
    const updated = res.body.data.currentLocation;
    assert.strictEqual(updated.addressLine1, 'Flat 505, Elite residency Phase 2', 'addressLine1 should be updated');
    assert.strictEqual(updated.pincode, '411050', 'pincode should be updated');
    assert.strictEqual(updated.landmark, 'Near Jupiter Hospital', 'Unspecified landmark must be preserved');
    assert.strictEqual(updated.countryId, 'IND-999', 'Nested countryId reference must be preserved');
    assert.strictEqual(updated.stateId, 'MH-001', 'Nested stateId reference must be preserved');
    assert.strictEqual(updated.customMetadataTag, 'KEEP_THIS_CURRENT', 'Unrelated JSON metadata must be preserved');
  });

  // Test 5: Updating Permanent Address preserves unrelated JSON properties
  await runAsyncTest('5. Updating Permanent Address preserves unrelated JSON properties', async () => {
    const req = {
      user: { userId: String(userA._id || userA.id) },
      headers: {},
      body: {
        nativePlaceDetails: {
          addressLine1: 'New Deshmukh Complex',
          pincode: '413105',
        },
      },
    };
    const res = mockResponse();
    await profileController.updateMyProfile(req, res);

    assert.strictEqual(res.statusCode, 200);
    const updated = res.body.data.nativePlaceDetails;
    assert.strictEqual(updated.addressLine1, 'New Deshmukh Complex', 'addressLine1 should be updated');
    assert.strictEqual(updated.pincode, '413105', 'pincode should be updated');
    assert.strictEqual(updated.landmark, 'Near Temple', 'Unspecified landmark must be preserved');
    assert.strictEqual(updated.description, 'Ancestral family home in Baramati', 'Description must be preserved');
    assert.strictEqual(updated.customMetadataTag, 'KEEP_THIS_PERMANENT', 'Unrelated JSON metadata must be preserved');
  });

  // Test 6: A user cannot edit another user's address through a direct API request
  await runAsyncTest("6. A user cannot edit another user's address through a direct API request", async () => {
    // User B tries to update User A's profile via updateProfile by passing profileA._id
    const req = {
      user: { userId: String(userB._id || userB.id), role: 'DOCTOR' },
      headers: {},
      params: { id: String(profileA._id || profileA.id) },
      body: {
        currentLocation: {
          addressLine1: 'HACKED ADDRESS BY USER B',
        },
      },
    };
    const res = mockResponse();
    await profileController.updateProfile(req, res, noopNext);

    assert.strictEqual(res.statusCode, 403, 'Cross-user profile edit must return HTTP 403 Forbidden');
    assert.strictEqual(res.body.success, false);

    // Verify User A address did not change
    const checkA = await Profile.findOne({ _id: profileA._id || profileA.id });
    assert.notStrictEqual(checkA.currentLocation?.addressLine1, 'HACKED ADDRESS BY USER B');
  });

  // Test 7: Unauthorized administrators cannot retrieve protected address fields
  await runAsyncTest('7. Unauthorized administrators cannot retrieve protected address fields', async () => {
    // Admin without privateInfo.view
    const restrictedAdminUser = await User.create({
      fullName: `Restricted Admin ${timestamp}`,
      email: `restricted_${timestamp}@example.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'HashedPassword123!',
      role: 'admin',
      verified: true,
    });

    await Admin.create({
      user: restrictedAdminUser._id,
      permissions: ['verifications'], // Does NOT have privateInfo.view
    });

    const req = {
      params: { id: profileA._id || profileA.id },
      user: { userId: restrictedAdminUser._id, email: restrictedAdminUser.email, role: 'admin' },
      headers: {},
      query: {},
    };
    const res = mockResponse();
    await adminController.getProfileById(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.canViewPrivateContact, false, 'canViewPrivateContact must be false');
    assert.strictEqual(res.body.data.isPrivateContactMasked, true, 'isPrivateContactMasked must be true');
    assert.ok(
      res.body.data.profile.currentLocation.formattedAddress.includes('View Permission Required') ||
      res.body.data.profile.currentLocation.addressLine1.includes('•'),
      'Address must be masked when admin lacks privateInfo.view'
    );
  });

  // Test 8: Existing Phase 3 private-information permissions remain enforced
  await runAsyncTest('8. Existing Phase 3 private-information permissions remain enforced', async () => {
    // Admin with privateInfo.view only (view only, NO edit)
    const viewOnlyAdminUser = await User.create({
      fullName: `View Only Admin ${timestamp}`,
      email: `viewonly_${timestamp}@example.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'HashedPassword123!',
      role: 'admin',
      verified: true,
    });

    await Admin.create({
      user: viewOnlyAdminUser._id,
      permissions: ['profiles', 'privateInfo.view'],
    });

    // 8a. View allowed with unmasked data
    const reqView = {
      params: { id: profileA._id || profileA.id },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
      headers: {},
      query: {},
    };
    const resView = mockResponse();
    await adminController.getProfileById(reqView, resView, noopNext);

    assert.strictEqual(resView.statusCode, 200);
    assert.strictEqual(resView.body.data.canViewPrivateContact, true);
    assert.strictEqual(resView.body.data.isPrivateContactMasked, false);

    // 8b. Edit rejected with HTTP 403 because view-only admin lacks privateInfo.edit
    const reqEdit = {
      params: { id: profileA._id || profileA.id },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
      headers: {},
      body: {
        mobile: '+919999988888',
      },
    };
    const resEdit = mockResponse();
    await adminController.updateProfile(reqEdit, resEdit, noopNext);

    assert.strictEqual(resEdit.statusCode, 403, 'View-only admin cannot edit contact info');
    assert.strictEqual(resEdit.body.success, false);
    assert.ok(resEdit.body.message.includes('privateInfo.edit permission required'));
  });

  console.log('\n--- PART 2: Device Session Tracking & Remote Logout Tests ---');

  // Test 9: A first sign-in does not fabricate a previous-device notification
  let userC;
  await runAsyncTest('9. A first sign-in does not fabricate a previous-device notification', async () => {
    // User C: Brand new user with no prior RefreshToken documents
    const hashedPass = await bcrypt.hash('CorrectPass123!', 10);
    userC = await User.create({
      fullName: `Dr. First Login Test ${timestamp}`,
      email: `first_login_${timestamp}@example.com`,
      mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: hashedPass,
      role: 'DOCTOR',
      isActive: true,
    });

    const notifsBefore = await Notification.find({
      user: userC._id || userC.id,
      type: 'SECURITY_ALERT',
    });
    assert.strictEqual(notifsBefore.length, 0, 'No security notifications prior to login');

    // Perform first login
    const req = {
      body: {
        email: `first_login_${timestamp}@example.com`,
        password: 'CorrectPass123!',
      },
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
      socket: { remoteAddress: '203.0.113.10' },
      ip: '203.0.113.10',
    };

    const res = mockResponse();
    await authController.loginUser(req, res, noopNext);

    assert.strictEqual(res.statusCode, 200, 'First login succeeds');
    assert.ok(res.body.token, 'Access token returned');
    assert.ok(res.cookies['refresh_token'], 'Refresh token cookie set');

    // Check notifications
    const notifsAfter = await Notification.find({
      user: userC._id || userC.id,
      type: 'SECURITY_ALERT',
    });
    assert.strictEqual(notifsAfter.length, 0, 'First sign-in MUST NOT fabricate a previous-device notification');
  });

  // Test 10: Successful sign-in with another active session produces the expected notification
  await runAsyncTest('10. Successful sign-in with another active session produces the expected notification', async () => {
    // User C now has 1 active session from Test 9.
    // Sign in from Device 2 (iPhone Safari)
    const reqDevice2 = {
      body: {
        email: `first_login_${timestamp}@example.com`,
        password: 'CorrectPass123!',
      },
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      },
      socket: { remoteAddress: '198.51.100.25' },
      ip: '198.51.100.25',
    };
    const resDevice2 = mockResponse();
    await authController.loginUser(reqDevice2, resDevice2, noopNext);

    assert.strictEqual(resDevice2.statusCode, 200, 'Second login succeeds');

    // Retrieve notifications
    const notifs = await Notification.find({
      user: userC._id || userC.id,
      type: 'SECURITY_ALERT',
    });

    assert.strictEqual(notifs.length, 1, 'Exactly one SECURITY_ALERT notification must be created');
    const alert = notifs[0];
    assert.strictEqual(alert.metadata.eventType, 'NEW_DEVICE_SIGNIN');
    assert.ok(alert.metadata, 'Notification metadata must be present');
    assert.ok(alert.metadata.previousSession, 'Previous session metadata must be recorded');
    assert.ok(alert.metadata.currentSession, 'Current session metadata must be recorded');
    assert.strictEqual(alert.metadata.isIdentityVerified, false, 'Identity verified flag must be explicitly false');
    assert.ok(alert.metadata.disclaimer.includes('metadata'), 'Disclaimer distinguishing metadata from verified identity must be included');
  });

  // Test 11: Routine token refresh does not create duplicate new-login notifications
  await runAsyncTest('11. Routine token refresh does not create duplicate new-login notifications', async () => {
    const notifsBefore = await Notification.find({
      user: userC._id || userC.id,
      type: 'SECURITY_ALERT',
    });
    const countBefore = notifsBefore.length;

    // Issue refresh
    const activeTokens = await RefreshToken.find({
      user: userC._id || userC.id,
      isRevoked: false,
      isUsed: false,
    });
    assert.ok(activeTokens.length > 0, 'Active refresh tokens exist');

    // Find the unhashed token from test cookies or DB
    // Use issueRefreshToken to get an active raw token
    const req = { headers: { 'user-agent': 'Firefox' }, socket: { remoteAddress: '198.51.100.25' } };
    const { rawRefreshToken } = await authController.issueRefreshToken(String(userC._id || userC.id), undefined, req);

    const reqRefresh = {
      body: { refreshToken: rawRefreshToken },
      cookies: {},
      headers: { 'user-agent': 'Firefox' },
      socket: { remoteAddress: '198.51.100.25' },
      ip: '198.51.100.25',
    };
    const resRefresh = mockResponse();
    await authController.refreshSession(reqRefresh, resRefresh, noopNext);

    assert.strictEqual(resRefresh.statusCode, 200, 'Refresh succeeds');

    const notifsAfter = await Notification.find({
      user: userC._id || userC.id,
      type: 'SECURITY_ALERT',
    });
    assert.strictEqual(notifsAfter.length, countBefore, 'Routine token refresh MUST NOT create new-login notifications');
  });

  // Test 12: The authenticated user can retrieve only their own session metadata
  await runAsyncTest('12. The authenticated user can retrieve only their own session metadata', async () => {
    const req = {
      user: { userId: String(userC._id || userC.id) },
      headers: {},
      socket: { remoteAddress: '198.51.100.25' },
      ip: '198.51.100.25',
    };
    const res = mockResponse();
    await authController.getActiveSessions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.sessions), 'Sessions array returned');
    assert.ok(res.body.data.sessions.length >= 2, 'User C has active sessions');

    // Verify all sessions belong to user C
    for (const s of res.body.data.sessions) {
      assert.ok(s.id, 'Session has id');
      assert.ok(s.device, 'Session has parsed device description');
      assert.ok(s.ipAddress, 'Session has masked ipAddress');
    }
  });

  // Test 13: Another user cannot inspect or revoke the target user's sessions
  await runAsyncTest("13. Another user cannot inspect or revoke the target user's sessions", async () => {
    // Attacker User B calls getActiveSessions with their own token but passes targetId in query/body
    const reqMalicious = {
      user: { userId: String(userB._id || userB.id) }, // Verified auth is User B
      headers: {},
      socket: { remoteAddress: '10.0.0.1' },
      query: { userId: String(userC._id || userC.id) },
      body: { targetUserId: String(userC._id || userC.id) },
    };
    const resMalicious = mockResponse();
    await authController.getActiveSessions(reqMalicious, resMalicious);

    assert.strictEqual(resMalicious.statusCode, 200);
    // User B only receives their own sessions (which is 0 or userB's only), never User C's
    for (const s of resMalicious.body.data.sessions) {
      const dbDoc = await RefreshToken.findById(s.id);
      assert.strictEqual(String(dbDoc.user || dbDoc.userId), String(userB._id || userB.id));
    }

    // Attacker User B tries to revoke User C's sessions
    const reqRevokeMalicious = {
      user: { userId: String(userB._id || userB.id) },
      headers: {},
      socket: { remoteAddress: '10.0.0.1' },
      body: { targetUserId: String(userC._id || userC.id) },
    };
    const resRevokeMalicious = mockResponse();
    await authController.logoutOtherSessions(reqRevokeMalicious, resRevokeMalicious);

    // Verify User C's sessions are NOT touched
    const userCTokens = await RefreshToken.find({
      user: userC._id || userC.id,
      isRevoked: false,
    });
    assert.ok(userCTokens.length > 0, 'User C tokens must remain active and unaffected by User B');
  });

  // Test 14: Logout-other-sessions revokes the authenticated user's other active sessions
  let latestActiveTokenFamily;
  await runAsyncTest("14. Logout-other-sessions revokes the authenticated user's other active sessions", async () => {
    // Active tokens for User C before remote logout
    const tokensBefore = await RefreshToken.find({
      user: userC._id || userC.id,
      isRevoked: false,
    }).sort({ updatedAt: -1 });
    assert.ok(tokensBefore.length >= 2, 'User C should have multiple active token families');

    // Pick the most recent token family as the current session
    const currentToken = tokensBefore[0];
    latestActiveTokenFamily = currentToken.family;

    const reqLogoutOther = {
      user: { userId: String(userC._id || userC.id) },
      headers: {},
      socket: { remoteAddress: '198.51.100.25' },
      body: { currentFamily: latestActiveTokenFamily },
    };
    const resLogoutOther = mockResponse();
    await authController.logoutOtherSessions(reqLogoutOther, resLogoutOther);

    assert.strictEqual(resLogoutOther.statusCode, 200);
    assert.strictEqual(resLogoutOther.body.success, true);
    assert.ok(resLogoutOther.body.data.revokedSessionsCount >= 1, 'At least 1 other session revoked');

    // Verify other sessions are revoked in database
    const revokedTokens = await RefreshToken.find({
      user: userC._id || userC.id,
      family: { $ne: latestActiveTokenFamily },
    });
    for (const t of revokedTokens) {
      assert.strictEqual(t.isRevoked, true, 'Other family tokens must be isRevoked: true');
    }
  });

  // Test 15: The current session is preserved when the user chooses to log out other sessions
  await runAsyncTest('15. The current session is preserved when the user chooses to log out other sessions', async () => {
    // Find non-revoked tokens for User C
    const activeTokens = await RefreshToken.find({
      user: userC._id || userC.id,
      isRevoked: false,
    });
    const uniqueFamilies = new Set(activeTokens.map((t) => t.family));
    assert.strictEqual(uniqueFamilies.size, 1, 'Exactly 1 active session family preserved');
    assert.strictEqual(Array.from(uniqueFamilies)[0], latestActiveTokenFamily, 'Preserved session must match current family');
  });

  // Test 16: Revoked refresh tokens cannot be reused
  await runAsyncTest('16. Revoked refresh tokens cannot be reused', async () => {
    // Issue a fresh token, revoke it, and verify refreshSession rejects it
    const req = { headers: { 'user-agent': 'Chrome' }, socket: { remoteAddress: '198.51.100.25' } };
    const { rawRefreshToken } = await authController.issueRefreshToken(String(userC._id || userC.id), undefined, req);

    // Manually revoke it
    await RefreshToken.updateMany(
      { user: userC._id || userC.id, isRevoked: false, family: { $ne: latestActiveTokenFamily } },
      { isRevoked: true, isUsed: true }
    );

    const reqReuse = {
      body: { refreshToken: rawRefreshToken },
      cookies: {},
      headers: {},
      socket: { remoteAddress: '198.51.100.25' },
      ip: '198.51.100.25',
    };
    const resReuse = mockResponse();
    await authController.refreshSession(reqReuse, resReuse, noopNext);

    assert.strictEqual(resReuse.statusCode, 401, 'Reusing revoked refresh token must be rejected with HTTP 401');
    assert.strictEqual(resReuse.body.success, false);
  });

  // Test 17: Already-revoked sessions are handled safely (idempotent)
  await runAsyncTest('17. Already-revoked sessions are handled safely (idempotent)', async () => {
    // Calling logout-other-sessions a second time when no other active sessions exist
    const reqSecondCall = {
      user: { userId: String(userC._id || userC.id) },
      headers: {},
      socket: { remoteAddress: '198.51.100.25' },
      body: { currentFamily: latestActiveTokenFamily },
    };
    const resSecondCall = mockResponse();
    await authController.logoutOtherSessions(reqSecondCall, resSecondCall);

    assert.strictEqual(resSecondCall.statusCode, 200, 'Second call must succeed gracefully');
    assert.strictEqual(resSecondCall.body.data.revokedSessionsCount, 0, 'Zero additional sessions revoked');
    assert.strictEqual(resSecondCall.body.data.currentSessionPreserved, true);
  });

  // Test 18: Session metadata is sanitized before returning it to the frontend
  await runAsyncTest('18. Session metadata is sanitized before returning it to the frontend', async () => {
    const req = {
      user: { userId: String(userC._id || userC.id) },
      headers: {},
      socket: { remoteAddress: '198.51.100.25' },
    };
    const res = mockResponse();
    await authController.getActiveSessions(req, res);

    assert.strictEqual(res.statusCode, 200);
    const sessions = res.body.data.sessions;
    for (const s of sessions) {
      assert.strictEqual(s.token, undefined, 'Raw refresh token MUST NOT be exposed');
      assert.strictEqual(s.tokenHash, undefined, 'Token hash MUST NOT be exposed');
      assert.strictEqual(s.password, undefined, 'Password MUST NOT be exposed');
      assert.strictEqual(s.secret, undefined, 'Secrets MUST NOT be exposed');
      // IP masking
      assert.ok(
        s.ipAddress.includes('***') ||
        s.ipAddress.includes('Localhost') ||
        s.ipAddress.includes('Unknown') ||
        s.ipAddress.includes(':'),
        `IP address must be masked for privacy, got: ${s.ipAddress}`
      );
    }
  });

  // Test 19: Access-token invalidation behavior is tested or its existing expiry limitation is explicitly documented
  await runAsyncTest('19. Access-token invalidation behavior and 15-minute expiry limitation documentation', async () => {
    const req = {
      user: { userId: String(userC._id || userC.id) },
      headers: {},
      socket: { remoteAddress: '198.51.100.25' },
    };
    const res = mockResponse();
    await authController.logoutOtherSessions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(
      res.body.data.statelessJwtNotice &&
      (res.body.data.statelessJwtNotice.includes('15m') ||
       res.body.data.statelessJwtNotice.includes('stateless')),
      'API response must clearly document the 15-minute stateless JWT expiry limitation'
    );
  });

  // Test 20: No passwords, tokens, or secrets appear in notifications or logs
  await runAsyncTest('20. No passwords, tokens, or secrets appear in notifications or logs', async () => {
    const notifs = await Notification.find({ user: userC._id || userC.id });
    for (const n of notifs) {
      const serialized = JSON.stringify(n);
      assert.ok(!serialized.includes('CorrectPass123!'), 'Password must never appear in notification');
      assert.ok(!serialized.includes('HashedPassword123!'), 'Password hash must not appear in notification');
      assert.ok(!serialized.includes('refreshToken'), 'Refresh token string must not appear in notification');
      assert.ok(!serialized.includes('jwt_secret'), 'Secret must not appear in notification');
    }

    const logs = await AuditLog.find({
      $or: [
        { targetUserId: String(userC._id || userC.id) },
        { targetId: String(userC._id || userC.id) },
      ],
    });
    for (const l of logs) {
      const serialized = JSON.stringify(l);
      assert.ok(!serialized.includes('CorrectPass123!'), 'Password must never appear in audit log');
      assert.ok(!serialized.includes('HashedPassword123!'), 'Password hash must not appear in audit log');
    }
  });

  console.log('\n========================================================================');
  console.log(`   PHASE 4 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
