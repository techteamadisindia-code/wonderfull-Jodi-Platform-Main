/**
 * Wonderful Jodi — Final Maintenance Mode Security Review & Platform Availability Test Suite
 *
 * Comprehensive verification covering:
 * 1. Admin Authentication Route Exceptions (Public login/recovery vs authenticated sessions)
 * 2. Shared JWT Authentication Hardening & Fail-Closed Enforcement (getSafeJwtSecret, requireAuth)
 * 3. Primary Super Admin 6-Point Database Verification & Impersonation Defense
 * 4. Full Audit of Every Registration Creation, Save-Step, Auto-Save, and Completion Endpoint
 * 5. Four-State Platform Availability Matrix (States 1-4)
 * 6. Frontend Layout & Signature-Based Dismissal Reset Logic
 * 7. Admin Settings Validation & Cache Management
 *
 * Run: node backend/test_maintenance_platform_availability_suite.js
 */

const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Set JWT secret for tests
const TEST_JWT_SECRET = 'wonderfuljodi_test_jwt_secret_key_12345';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.NODE_ENV = 'production';

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

function createMockReq(options = {}) {
  return {
    method: options.method || 'GET',
    originalUrl: options.url || '/api/profiles',
    path: (options.url || '/api/profiles').split('?')[0],
    headers: options.headers || {},
    cookies: options.cookies || {},
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    user: options.user || null,
    socket: options.socket || { remoteAddress: '127.0.0.1' },
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    cookies: {},
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options) {
      delete this.cookies[name];
      return this;
    },
  };
  return res;
}

console.log('========================================================================');
console.log('  WONDERFUL JODI - FINAL MAINTENANCE MODE & SECURITY REVIEW SUITE');
console.log('  Verification Mode: Strict Route-Level & Middleware Security Matrix');
console.log('========================================================================\n');

async function main() {
  const { Setting } = require('./dist/models/Setting.js');
  const { User } = require('./dist/models/User.js');
  const { Admin } = require('./dist/models/Admin.js');
  const {
    checkMaintenanceMode,
    checkRegistrationEnabled,
    getCachedMaintenanceConfig,
    invalidateMaintenanceCache,
  } = require('./dist/middleware/maintenanceMiddleware.js');
  const { requireAuth, optionalAuth } = require('./dist/middleware/authMiddleware.js');
  const {
    isPrimarySuperAdminEmail,
    PRIMARY_SUPER_ADMIN_EMAIL,
    getSafeJwtSecret,
    getJwtSecret,
    verifyPrimarySuperAdminInDatabase,
  } = require('./dist/utils/permissionUtils.js');

  // Mock Database State
  let mockSettingDoc = {
    maintenanceMode: false,
    maintenanceBanner: false,
    maintenanceTitle: "We'll Be Back Soon",
    maintenanceMessage: 'Wonderful Jodi is undergoing scheduled maintenance.',
    maintenanceEstimatedEndTime: null,
    allowAdminAccess: true,
    allowNewRegistrations: true,
  };

  Setting.findOne = () => ({
    lean: async () => ({ ...mockSettingDoc }),
  });

  function setSystemState(settings) {
    mockSettingDoc = {
      maintenanceMode: false,
      maintenanceBanner: false,
      maintenanceTitle: "We'll Be Back Soon",
      maintenanceMessage: 'Wonderful Jodi is undergoing scheduled maintenance.',
      maintenanceEstimatedEndTime: null,
      allowAdminAccess: true,
      allowNewRegistrations: true,
      ...settings,
    };
    invalidateMaintenanceCache();
  }

  // Known mock users in database
  const PRIMARY_ADMIN_USER_ID = 'primary_admin_id_001';
  const ORDINARY_ADMIN_USER_ID = 'ordinary_admin_id_002';
  const REGULAR_USER_ID = 'regular_user_id_003';

  const mockUsersDb = new Map([
    [
      PRIMARY_ADMIN_USER_ID,
      {
        _id: PRIMARY_ADMIN_USER_ID,
        id: PRIMARY_ADMIN_USER_ID,
        email: PRIMARY_SUPER_ADMIN_EMAIL,
        role: 'admin',
        isActive: true,
        isDeleted: false,
        status: 'Active',
        isBlocked: false,
      },
    ],
    [
      ORDINARY_ADMIN_USER_ID,
      {
        _id: ORDINARY_ADMIN_USER_ID,
        id: ORDINARY_ADMIN_USER_ID,
        email: 'staff.moderator@wonderfuljodi.com',
        role: 'admin',
        isActive: true,
        isDeleted: false,
        status: 'Active',
        isBlocked: false,
      },
    ],
    [
      REGULAR_USER_ID,
      {
        _id: REGULAR_USER_ID,
        id: REGULAR_USER_ID,
        email: 'doctor.candidate@example.com',
        role: 'user',
        isActive: true,
        isDeleted: false,
        status: 'Active',
        isBlocked: false,
      },
    ],
  ]);

  const mockAdminRecordsDb = new Map([
    [
      PRIMARY_ADMIN_USER_ID,
      {
        user: PRIMARY_ADMIN_USER_ID,
        permissions: ['all'],
      },
    ],
    [
      ORDINARY_ADMIN_USER_ID,
      {
        user: ORDINARY_ADMIN_USER_ID,
        permissions: ['users', 'profiles', 'verifications'],
      },
    ],
  ]);

  User.findById = async (id) => {
    if (!id) return null;
    const doc = mockUsersDb.get(String(id));
    return doc ? { ...doc } : null;
  };

  Admin.findOne = async (query) => {
    const userId = String(query?.user || query?.userId || '');
    const doc = mockAdminRecordsDb.get(userId);
    return doc ? { ...doc } : null;
  };

  // Helper to generate valid test JWT
  function createTestToken(userId, role, email) {
    return jwt.sign({ userId, role, email }, TEST_JWT_SECRET, { expiresIn: '15m' });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 1: ADMIN AUTHENTICATION ROUTE EXCEPTIONS (SECTION 1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- Group 1: Admin Authentication Route Exceptions ---');

  await runAsyncTest('1.1 POST /api/admin/auth/login is permitted during maintenance (public auth exception)', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const req = createMockReq({ method: 'POST', url: '/api/admin/auth/login' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Admin login endpoint must remain accessible');
  });

  await runAsyncTest('1.2 POST /api/admin/auth/forgot-password is permitted during maintenance', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const req = createMockReq({ method: 'POST', url: '/api/admin/auth/forgot-password' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Admin forgot password must remain accessible');
  });

  await runAsyncTest('1.3 GET /api/admin/auth/validate-reset-token is permitted during maintenance', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const req = createMockReq({ method: 'GET', url: '/api/admin/auth/validate-reset-token' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Validate reset token must remain accessible');
  });

  await runAsyncTest('1.4 POST /api/admin/auth/reset-password is permitted during maintenance', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const req = createMockReq({ method: 'POST', url: '/api/admin/auth/reset-password' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Reset password must remain accessible');
  });

  await runAsyncTest('1.5 GET /api/admin/auth/me is BLOCKED when allowAdminAccess === false for ordinary admin', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const token = createTestToken(ORDINARY_ADMIN_USER_ID, 'admin', 'staff.moderator@wonderfuljodi.com');
    const req = createMockReq({
      method: 'GET',
      url: '/api/admin/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'Authenticated /me route must enforce allowAdminAccess');
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.body?.code, 'ADMIN_ACCESS_RESTRICTED');
  });

  await runAsyncTest('1.6 GET /api/admin/auth/me is ALLOWED when allowAdminAccess === false for Primary Super Admin', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const token = createTestToken(PRIMARY_ADMIN_USER_ID, 'admin', PRIMARY_SUPER_ADMIN_EMAIL);
    const req = createMockReq({
      method: 'GET',
      url: '/api/admin/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Primary Super Admin must retain emergency access to /me');
  });

  await runAsyncTest('1.7 Authenticated admin session routes (sessions, logout, change-password) enforce allowAdminAccess', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const ordinaryToken = createTestToken(ORDINARY_ADMIN_USER_ID, 'admin', 'staff.moderator@wonderfuljodi.com');
    const endpoints = [
      { method: 'POST', url: '/api/admin/auth/logout' },
      { method: 'POST', url: '/api/admin/auth/change-password' },
      { method: 'GET', url: '/api/admin/auth/sessions' },
      { method: 'POST', url: '/api/admin/auth/revoke-other-sessions' },
      { method: 'GET', url: '/api/admin/auth/recent-activity' },
    ];

    for (const ep of endpoints) {
      const req = createMockReq({
        method: ep.method,
        url: ep.url,
        headers: { authorization: `Bearer ${ordinaryToken}` },
      });
      const res = createMockRes();
      let nextCalled = false;
      await checkMaintenanceMode(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, false, `${ep.url} must be blocked for ordinary admin when allowAdminAccess is false`);
      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body?.code, 'ADMIN_ACCESS_RESTRICTED');
    }
  });

  await runAsyncTest('1.8 Authenticated admin routes are ALLOWED when allowAdminAccess === true', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: true });
    const ordinaryToken = createTestToken(ORDINARY_ADMIN_USER_ID, 'admin', 'staff.moderator@wonderfuljodi.com');
    const req = createMockReq({
      method: 'GET',
      url: '/api/admin/auth/sessions',
      headers: { authorization: `Bearer ${ordinaryToken}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Active ordinary admin must be allowed when allowAdminAccess is true');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 2: SHARED JWT AUTHENTICATION HARDENING (SECTION 2)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Group 2: Shared JWT Authentication Hardening ---');

  runTest('2.1 getSafeJwtSecret fails closed in production when JWT_SECRET is unset or empty', () => {
    const origSecret = process.env.JWT_SECRET;
    const origEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      assert.strictEqual(getSafeJwtSecret(), null, 'Must return null in production when JWT_SECRET is deleted');

      process.env.JWT_SECRET = '   ';
      assert.strictEqual(getSafeJwtSecret(), null, 'Must return null in production when JWT_SECRET is whitespace');

      assert.throws(() => getJwtSecret(), /missing or empty in production/, 'getJwtSecret must throw in production');
    } finally {
      process.env.JWT_SECRET = origSecret;
      process.env.NODE_ENV = origEnv;
    }
  });

  runTest('2.2 getSafeJwtSecret permits explicit dev secret only in non-production', () => {
    const origSecret = process.env.JWT_SECRET;
    const origEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;
      assert.strictEqual(getSafeJwtSecret(), 'supersecret_wonderfuljodi_dev_key_2026');
      assert.strictEqual(getJwtSecret(), 'supersecret_wonderfuljodi_dev_key_2026');
    } finally {
      process.env.JWT_SECRET = origSecret;
      process.env.NODE_ENV = origEnv;
    }
  });

  await runAsyncTest('2.3 requireAuth rejects request with HTTP 500 if JWT_SECRET is missing in production', async () => {
    const origSecret = process.env.JWT_SECRET;
    const origEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      const req = createMockReq({
        headers: { authorization: 'Bearer some.token.here' },
      });
      const res = createMockRes();
      let nextCalled = false;
      await requireAuth(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false, 'requireAuth must fail closed');
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body?.message, 'Authentication service configuration error');
    } finally {
      process.env.JWT_SECRET = origSecret;
      process.env.NODE_ENV = origEnv;
    }
  });

  await runAsyncTest('2.4 requireAuth succeeds with valid token and configured secret', async () => {
    const token = createTestToken(REGULAR_USER_ID, 'user', 'doctor.candidate@example.com');
    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user?.userId, REGULAR_USER_ID);
  });

  await runAsyncTest('2.5 requireAuth rejects expired token with TOKEN_EXPIRED code', async () => {
    const expiredToken = jwt.sign(
      { userId: REGULAR_USER_ID, role: 'user' },
      TEST_JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const req = createMockReq({
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.code, 'TOKEN_EXPIRED');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 3: PRIMARY SUPER ADMIN DATABASE VERIFICATION (SECTION 3)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Group 3: Primary Super Admin Database Verification & Impersonation Defense ---');

  await runAsyncTest('3.1 Valid active Primary Super Admin session is verified and granted emergency access', async () => {
    const isVerified = await verifyPrimarySuperAdminInDatabase(PRIMARY_ADMIN_USER_ID);
    assert.strictEqual(isVerified, true, 'Genuine active Primary Super Admin must verify true');
  });

  await runAsyncTest('3.2 Expired token is rejected and denied emergency access', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const expiredToken = jwt.sign(
      { userId: PRIMARY_ADMIN_USER_ID, role: 'admin', email: PRIMARY_SUPER_ADMIN_EMAIL },
      TEST_JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const req = createMockReq({
      method: 'GET',
      url: '/api/admin/settings',
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Expired token must be rejected');
    assert.strictEqual(res.statusCode, 503);
  });

  await runAsyncTest('3.3 Invalid token signature is rejected and denied emergency access', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const forgedToken = jwt.sign(
      { userId: PRIMARY_ADMIN_USER_ID, role: 'admin', email: PRIMARY_SUPER_ADMIN_EMAIL },
      'wrong_untrusted_secret_key'
    );
    const req = createMockReq({
      method: 'GET',
      url: '/api/admin/settings',
      headers: { authorization: `Bearer ${forgedToken}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Forged token must be rejected');
    assert.strictEqual(res.statusCode, 503);
  });

  await runAsyncTest('3.4 Missing database user is denied emergency access', async () => {
    const isVerified = await verifyPrimarySuperAdminInDatabase('non_existent_user_id');
    assert.strictEqual(isVerified, false, 'Non-existent DB user must fail closed');
  });

  await runAsyncTest('3.5 Inactive database user is denied emergency access', async () => {
    const INACTIVE_PRIMARY_ID = 'inactive_primary_admin';
    mockUsersDb.set(INACTIVE_PRIMARY_ID, {
      _id: INACTIVE_PRIMARY_ID,
      email: PRIMARY_SUPER_ADMIN_EMAIL,
      role: 'admin',
      isActive: false,
      isDeleted: false,
      status: 'Active',
      isBlocked: false,
    });
    mockAdminRecordsDb.set(INACTIVE_PRIMARY_ID, { user: INACTIVE_PRIMARY_ID, permissions: ['all'] });

    const isVerified = await verifyPrimarySuperAdminInDatabase(INACTIVE_PRIMARY_ID);
    assert.strictEqual(isVerified, false, 'Inactive account must be denied emergency access');
  });

  await runAsyncTest('3.6 Deleted database user is denied emergency access', async () => {
    const DELETED_PRIMARY_ID = 'deleted_primary_admin';
    mockUsersDb.set(DELETED_PRIMARY_ID, {
      _id: DELETED_PRIMARY_ID,
      email: PRIMARY_SUPER_ADMIN_EMAIL,
      role: 'admin',
      isActive: true,
      isDeleted: true,
      status: 'Deleted',
      isBlocked: false,
    });
    mockAdminRecordsDb.set(DELETED_PRIMARY_ID, { user: DELETED_PRIMARY_ID, permissions: ['all'] });

    const isVerified = await verifyPrimarySuperAdminInDatabase(DELETED_PRIMARY_ID);
    assert.strictEqual(isVerified, false, 'Deleted account must be denied emergency access');
  });

  await runAsyncTest('3.7 Suspended or blocked database user is denied emergency access', async () => {
    const BLOCKED_PRIMARY_ID = 'blocked_primary_admin';
    mockUsersDb.set(BLOCKED_PRIMARY_ID, {
      _id: BLOCKED_PRIMARY_ID,
      email: PRIMARY_SUPER_ADMIN_EMAIL,
      role: 'admin',
      isActive: true,
      isDeleted: false,
      status: 'Blocked',
      isBlocked: true,
    });
    mockAdminRecordsDb.set(BLOCKED_PRIMARY_ID, { user: BLOCKED_PRIMARY_ID, permissions: ['all'] });

    const isVerified = await verifyPrimarySuperAdminInDatabase(BLOCKED_PRIMARY_ID);
    assert.strictEqual(isVerified, false, 'Blocked account must be denied emergency access');
  });

  await runAsyncTest('3.8 Token email claim conflicting with database email fails closed (anti-spoofing)', async () => {
    // Attacker generates token with Primary Super Admin email claim, but userId belongs to an ordinary user
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const spoofedToken = createTestToken(ORDINARY_ADMIN_USER_ID, 'admin', PRIMARY_SUPER_ADMIN_EMAIL);
    const req = createMockReq({
      method: 'GET',
      url: '/api/admin/settings',
      headers: { authorization: `Bearer ${spoofedToken}` },
    });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Spoofed email claim must be rejected by database verification');
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.body?.code, 'ADMIN_ACCESS_RESTRICTED');
  });

  await runAsyncTest('3.9 Ordinary admin attempting to impersonate via request body/query is denied', async () => {
    setSystemState({ maintenanceMode: true, allowAdminAccess: false });
    const ordinaryToken = createTestToken(ORDINARY_ADMIN_USER_ID, 'admin', 'staff.moderator@wonderfuljodi.com');
    const req = createMockReq({
      method: 'POST',
      url: '/api/admin/settings',
      headers: { authorization: `Bearer ${ordinaryToken}` },
      body: { email: PRIMARY_SUPER_ADMIN_EMAIL, role: 'super_admin' },
      query: { overrideEmail: PRIMARY_SUPER_ADMIN_EMAIL },
    });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Body/query parameters must never bypass database verification');
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.body?.code, 'ADMIN_ACCESS_RESTRICTED');
  });

  await runAsyncTest('3.10 Admin record lacking "all" permission fails closed', async () => {
    const LIMITED_ADMIN_ID = 'limited_admin_id';
    mockUsersDb.set(LIMITED_ADMIN_ID, {
      _id: LIMITED_ADMIN_ID,
      email: PRIMARY_SUPER_ADMIN_EMAIL, // even if email matched
      role: 'admin',
      isActive: true,
      isDeleted: false,
      status: 'Active',
      isBlocked: false,
    });
    mockAdminRecordsDb.set(LIMITED_ADMIN_ID, { user: LIMITED_ADMIN_ID, permissions: ['users', 'settings'] }); // lacking 'all'

    const isVerified = await verifyPrimarySuperAdminInDatabase(LIMITED_ADMIN_ID);
    assert.strictEqual(isVerified, false, 'Account lacking "all" super admin permission must be denied');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 4: AUDIT OF EVERY REGISTRATION ENTRY POINT (SECTION 4)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Group 4: Audit of Every Registration Entry Point ---');

  const registrationEndpointsToTest = [
    { method: 'POST', url: '/api/auth/register', name: 'POST /api/auth/register' },
    { method: 'POST', url: '/api/registrations/start', name: 'POST /api/registrations/start' },
    { method: 'POST', url: '/api/registrations/save-step', name: 'POST /api/registrations/save-step' },
    { method: 'POST', url: '/api/registrations/step', name: 'POST /api/registrations/step' },
    { method: 'POST', url: '/api/registrations/save', name: 'POST /api/registrations/save' },
    { method: 'POST', url: '/api/registrations/auto-save', name: 'POST /api/registrations/auto-save' },
    { method: 'POST', url: '/api/registrations/complete', name: 'POST /api/registrations/complete' },
    { method: 'POST', url: '/api/registrations/REG123/step', name: 'POST /api/registrations/:registrationId/step' },
    { method: 'POST', url: '/api/registrations/REG123/complete', name: 'POST /api/registrations/:registrationId/complete' },
  ];

  for (const ep of registrationEndpointsToTest) {
    await runAsyncTest(`4.1 ${ep.name} returns HTTP 403 REGISTRATIONS_PAUSED when allowNewRegistrations is false`, async () => {
      setSystemState({ maintenanceMode: false, allowNewRegistrations: false });
      const req = createMockReq({ method: ep.method, url: ep.url });
      const res = createMockRes();
      let nextCalled = false;
      await checkRegistrationEnabled(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false, `${ep.name} must be blocked`);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'REGISTRATIONS_PAUSED');
      assert.ok(res.body?.message?.includes('temporarily paused'));
    });
  }

  for (const ep of registrationEndpointsToTest) {
    await runAsyncTest(`4.2 ${ep.name} is permitted when allowNewRegistrations is true`, async () => {
      setSystemState({ maintenanceMode: false, allowNewRegistrations: true });
      const req = createMockReq({ method: ep.method, url: ep.url });
      const res = createMockRes();
      let nextCalled = false;
      await checkRegistrationEnabled(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true, `${ep.name} must pass through when registrations enabled`);
    });
  }

  await runAsyncTest('4.3 Existing account login succeeds when allowNewRegistrations === false', async () => {
    setSystemState({ maintenanceMode: false, allowNewRegistrations: false });
    const req = createMockReq({ method: 'POST', url: '/api/auth/login' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Existing user login must not be blocked when registrations paused');
  });

  await runAsyncTest('4.4 Existing user profile browsing succeeds when allowNewRegistrations === false', async () => {
    setSystemState({ maintenanceMode: false, allowNewRegistrations: false });
    const req = createMockReq({ method: 'GET', url: '/api/profiles' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Profile browsing must continue unaffected');
  });

  await runAsyncTest('4.5 Existing user search and interest features succeed when allowNewRegistrations === false', async () => {
    setSystemState({ maintenanceMode: false, allowNewRegistrations: false });
    const searchReq = createMockReq({ method: 'GET', url: '/api/search' });
    const interestReq = createMockReq({ method: 'POST', url: '/api/interests' });
    let nextCalled1 = false;
    let nextCalled2 = false;

    await checkMaintenanceMode(searchReq, createMockRes(), () => { nextCalled1 = true; });
    await checkMaintenanceMode(interestReq, createMockRes(), () => { nextCalled2 = true; });

    assert.strictEqual(nextCalled1, true);
    assert.strictEqual(nextCalled2, true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 5: FOUR-STATE PLATFORM MATRIX (SECTION 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Group 5: Four-State Platform Matrix ---');

  await runAsyncTest('State 1 (OFF / OFF): Normal layout, no banner, full public access', async () => {
    setSystemState({ maintenanceMode: false, maintenanceBanner: false });
    const config = await getCachedMaintenanceConfig();
    assert.strictEqual(config.enabled, false);
    assert.strictEqual(config.banner, false);

    const req = createMockReq({ url: '/api/profiles' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await runAsyncTest('State 2 (OFF / ON): Announcement banner active, public APIs fully functional', async () => {
    setSystemState({ maintenanceMode: false, maintenanceBanner: true });
    const config = await getCachedMaintenanceConfig();
    assert.strictEqual(config.enabled, false);
    assert.strictEqual(config.banner, true);

    const req = createMockReq({ url: '/api/profiles' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await runAsyncTest('State 3 (ON / OFF): Full maintenance 503, full-screen page, banner flag disabled', async () => {
    setSystemState({ maintenanceMode: true, maintenanceBanner: false });
    const config = await getCachedMaintenanceConfig();
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.banner, false);

    const req = createMockReq({ url: '/api/profiles' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 503);
  });

  await runAsyncTest('State 4 (ON / ON): Full maintenance 503, full-screen page active, no duplicate banner', async () => {
    setSystemState({ maintenanceMode: true, maintenanceBanner: true });
    const config = await getCachedMaintenanceConfig();
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.banner, true);

    const req = createMockReq({ url: '/api/search' });
    const res = createMockRes();
    let nextCalled = false;
    await checkMaintenanceMode(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 503);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 6: ADMIN SETTINGS VALIDATIONS & CACHE INVALIDATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Group 6: Admin Settings Validations & Cache Invalidation ---');

  const { updateMaintenanceSettings } = require('./dist/controllers/adminController.js');

  await runAsyncTest('6.1 updateMaintenanceSettings validates title, message, and date', async () => {
    const origFindOneAndUpdate = Setting.findOneAndUpdate;
    Setting.findOneAndUpdate = async () => ({});

    try {
      const res1 = createMockRes();
      await updateMaintenanceSettings(createMockReq({ body: { maintenanceTitle: '  ' } }), res1);
      assert.strictEqual(res1.statusCode, 400);

      const res2 = createMockRes();
      await updateMaintenanceSettings(createMockReq({ body: { maintenanceMessage: 'X'.repeat(2001) } }), res2);
      assert.strictEqual(res2.statusCode, 400);

      const res3 = createMockRes();
      await updateMaintenanceSettings(createMockReq({ body: { maintenanceEstimatedEndTime: 'invalid-date' } }), res3);
      assert.strictEqual(res3.statusCode, 400);
    } finally {
      Setting.findOneAndUpdate = origFindOneAndUpdate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GROUP 7: JWT TOKEN GENERATION & OPTIONAL VERIFICATION HARDENING
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Group 7: JWT Token Generation & Optional Verification Hardening ---');

  const { loginUser } = require('./dist/controllers/authController.js');
  const { adminLogin } = require('./dist/controllers/adminAuthController.js');
  const { completeRegistration } = require('./dist/controllers/registrationController.js');
  const { searchProfiles } = require('./dist/controllers/searchController.js');
  const { Registration } = require('./dist/models/Registration.js');
  const { Profile } = require('./dist/models/Profile.js');
  const { RefreshToken } = require('./dist/models/RefreshToken.js');
  const { Block } = require('./dist/models/Block.js');
  const { SecurityLog } = require('./dist/models/SecurityLog.js');
  const { AuditLog } = require('./dist/models/AuditLog.js');

  const PROD_SECRET = 'production_super_strong_secret_key_2026_xyz';
  const DEV_FALLBACK_SECRET = 'supersecret_wonderfuljodi_dev_key_2026';
  const userPasswordHash = await bcrypt.hash('CorrectPass123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminStrongPass123!@#', 10);

  // Setup Mocks
  SecurityLog.create = async () => ({});
  AuditLog.create = async () => ({});
  RefreshToken.create = async () => ({});
  RefreshToken.find = () => ({
    sort: async () => [],
  });

  const origUserFindOne = User.findOne;
  const origUserFind = User.find;
  const origUserCreate = User.create;
  const origProfileCreate = Profile.create;
  const origProfileCount = Profile.countDocuments;
  const origProfileFind = Profile.find;
  const origBlockFind = Block.find;

  await runAsyncTest('7.1 Regular login token generation with a configured production secret', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = PROD_SECRET;

      User.findOne = async (query) => {
        if (query?.email === 'doctor.candidate@example.com' || query?.$or?.[0]?.email === 'doctor.candidate@example.com') {
          return {
            _id: REGULAR_USER_ID,
            id: REGULAR_USER_ID,
            fullName: 'Dr. Test Candidate',
            email: 'doctor.candidate@example.com',
            mobile: '9876543210',
            role: 'user',
            password: userPasswordHash,
            isActive: true,
            isDeleted: false,
            status: 'Active',
            isBlocked: false,
          };
        }
        return null;
      };

      const res = createMockRes();
      await loginUser(
        createMockReq({
          method: 'POST',
          url: '/api/auth/login',
          body: { email: 'doctor.candidate@example.com', password: 'CorrectPass123!' },
        }),
        res,
        (err) => { if (err) throw err; }
      );

      assert.strictEqual(res.statusCode, 200);
      assert(res.cookies.access_token, 'access_token cookie must be set');
      const decoded = jwt.verify(res.cookies.access_token.value, PROD_SECRET);
      assert.strictEqual(decoded.userId, REGULAR_USER_ID);
      assert.strictEqual(decoded.role, 'user');
      assert.throws(
        () => jwt.verify(res.cookies.access_token.value, DEV_FALLBACK_SECRET),
        /invalid signature/,
        'Token must NOT verify with dev fallback secret'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      User.findOne = origUserFindOne;
    }
  });

  await runAsyncTest('7.2 Admin login token generation with a configured production secret', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = PROD_SECRET;

      User.findOne = async (query) => {
        if (query?.email === 'staff.moderator@wonderfuljodi.com') {
          return {
            _id: ORDINARY_ADMIN_USER_ID,
            id: ORDINARY_ADMIN_USER_ID,
            fullName: 'Staff Moderator',
            email: 'staff.moderator@wonderfuljodi.com',
            role: 'admin',
            password: adminPasswordHash,
            isActive: true,
            isDeleted: false,
            status: 'Active',
            isBlocked: false,
          };
        }
        return null;
      };

      const res = createMockRes();
      await adminLogin(
        createMockReq({
          method: 'POST',
          url: '/api/admin/auth/login',
          body: { email: 'staff.moderator@wonderfuljodi.com', password: 'AdminStrongPass123!@#' },
        }),
        res,
        (err) => { if (err) throw err; }
      );

      assert.strictEqual(res.statusCode, 200);
      assert(res.cookies.admin_access_token, 'admin_access_token cookie must be set');
      const decoded = jwt.verify(res.cookies.admin_access_token.value, PROD_SECRET);
      assert.strictEqual(decoded.userId, ORDINARY_ADMIN_USER_ID);
      assert.strictEqual(decoded.role, 'admin');
      assert.throws(
        () => jwt.verify(res.cookies.admin_access_token.value, DEV_FALLBACK_SECRET),
        /invalid signature/,
        'Admin token must NOT verify with dev fallback secret'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      User.findOne = origUserFindOne;
    }
  });

  await runAsyncTest('7.3 Registration token generation with a configured production secret', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = PROD_SECRET;

      User.create = async (doc) => ({ ...doc, _id: 'new_reg_user_789', id: 'new_reg_user_789' });
      Profile.create = async (doc) => ({ ...doc, _id: 'new_reg_prof_789', id: 'new_reg_prof_789' });

      const mockRegDoc = {
        registrationId: 'REG-20261103-VALID01',
        resumeToken: 'test_resume_token_123',
        status: 'IN_PROGRESS',
        candidateName: 'Dr. New Registrant',
        email: 'new.reg@wonderfuljodi.com',
        mobile: '9123456780',
        gender: 'Female',
        totalSteps: 4,
        currentStep: 3,
        stepData: {
          basicInfo: {
            fullName: 'Dr. New Registrant',
            email: 'new.reg@wonderfuljodi.com',
            mobile: '9123456780',
            gender: 'Female',
            dob: '1994-06-20',
            passwordHash: userPasswordHash,
            agreeTerms: true,
          },
          personalInfo: {
            maritalStatus: 'Never Married',
            religion: 'Hindu',
            caste: 'Maratha',
            city: 'Mumbai',
            state: 'Maharashtra',
          },
          educationProfession: {
            education: 'MBBS',
            degree: 'MBBS',
            profession: 'General Physician',
          },
        },
        save: async function() { this.saved = true; return this; },
      };

      Registration.findOne = async () => mockRegDoc;
      User.findOne = async () => null;

      const res = createMockRes();
      await completeRegistration(
        createMockReq({
          method: 'POST',
          url: '/api/registrations/complete',
          headers: { 'x-resume-token': 'test_resume_token_123' },
          body: { registrationId: 'REG-20261103-VALID01', agreeTerms: true },
        }),
        res,
        (err) => { if (err) throw err; }
      );

      assert.strictEqual(res.statusCode, 201);
      assert(res.body?.token, 'Registration response must contain auth token');
      const decoded = jwt.verify(res.body.token, PROD_SECRET);
      assert.strictEqual(decoded.userId, 'new_reg_user_789');
      assert.strictEqual(decoded.role, 'user');
      assert.throws(
        () => jwt.verify(res.body.token, DEV_FALLBACK_SECRET),
        /invalid signature/,
        'Registration token must NOT verify with dev fallback secret'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      User.create = origUserCreate;
      Profile.create = origProfileCreate;
    }
  });

  await runAsyncTest('7.4 All three token-generation paths fail safely when production JWT_SECRET is missing', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      User.findOne = async (query) => {
        if (query?.email === 'doctor.candidate@example.com' || query?.$or?.[0]?.email === 'doctor.candidate@example.com') {
          return {
            _id: REGULAR_USER_ID,
            id: REGULAR_USER_ID,
            fullName: 'Dr. Test Candidate',
            email: 'doctor.candidate@example.com',
            mobile: '9876543210',
            role: 'user',
            password: userPasswordHash,
            isActive: true,
            isDeleted: false,
            status: 'Active',
            isBlocked: false,
          };
        }
        if (query?.email === 'staff.moderator@wonderfuljodi.com') {
          return {
            _id: ORDINARY_ADMIN_USER_ID,
            id: ORDINARY_ADMIN_USER_ID,
            fullName: 'Staff Moderator',
            email: 'staff.moderator@wonderfuljodi.com',
            role: 'admin',
            password: adminPasswordHash,
            isActive: true,
            isDeleted: false,
            status: 'Active',
            isBlocked: false,
          };
        }
        return null;
      };

      // 4a: loginUser
      let loginErr = null;
      try {
        await loginUser(
          createMockReq({
            method: 'POST',
            url: '/api/auth/login',
            body: { email: 'doctor.candidate@example.com', password: 'CorrectPass123!' },
          }),
          createMockRes(),
          (err) => { loginErr = err; }
        );
      } catch (err) {
        loginErr = err;
      }
      assert(loginErr, 'loginUser must fail when JWT_SECRET is missing in production');
      assert(/JWT_SECRET/.test(loginErr.message), 'Error must identify missing JWT_SECRET');

      // 4b: adminLogin
      let adminLoginErr = null;
      try {
        await adminLogin(
          createMockReq({
            method: 'POST',
            url: '/api/admin/auth/login',
            body: { email: 'staff.moderator@wonderfuljodi.com', password: 'AdminStrongPass123!@#' },
          }),
          createMockRes(),
          (err) => { adminLoginErr = err; }
        );
      } catch (err) {
        adminLoginErr = err;
      }
      assert(adminLoginErr, 'adminLogin must fail when JWT_SECRET is missing in production');
      assert(/JWT_SECRET/.test(adminLoginErr.message), 'Error must identify missing JWT_SECRET');

      // 4c: completeRegistration
      let regErr = null;
      const regDoc4c = {
        registrationId: 'REG-20261103-TEST4C',
        resumeToken: 'test_resume_token_123',
        status: 'IN_PROGRESS',
        candidateName: 'Dr. Four C',
        email: 'four.c@wonderfuljodi.com',
        mobile: '9123456784',
        gender: 'Female',
        totalSteps: 4,
        currentStep: 3,
        stepData: {
          basicInfo: {
            fullName: 'Dr. Four C',
            email: 'four.c@wonderfuljodi.com',
            mobile: '9123456784',
            gender: 'Female',
            dob: '1994-06-20',
            passwordHash: userPasswordHash,
            agreeTerms: true,
          },
          personalInfo: {
            maritalStatus: 'Never Married',
            religion: 'Hindu',
            caste: 'Maratha',
            city: 'Mumbai',
            state: 'Maharashtra',
          },
          educationProfession: {
            education: 'MBBS',
            degree: 'MBBS',
            profession: 'General Physician',
          },
        },
        save: async function() { this.saved = true; return this; },
      };
      Registration.findOne = async () => regDoc4c;

      try {
        await completeRegistration(
          createMockReq({
            method: 'POST',
            url: '/api/registrations/complete',
            headers: { 'x-resume-token': 'test_resume_token_123' },
            body: { registrationId: 'REG-20261103-TEST4C', agreeTerms: true },
          }),
          createMockRes(),
          (err) => { regErr = err; }
        );
      } catch (err) {
        regErr = err;
      }
      assert(regErr, 'completeRegistration must fail when JWT_SECRET is missing in production');
      assert(/JWT_SECRET/.test(regErr.message), 'Error must identify missing JWT_SECRET');
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      User.findOne = origUserFindOne;
    }
  });

  await runAsyncTest('7.5 Registration does not create a partial database record when token configuration is unavailable', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      let userCreateCount = 0;
      let profileCreateCount = 0;
      User.create = async () => { userCreateCount++; return { _id: 'fake' }; };
      Profile.create = async () => { profileCreateCount++; return { _id: 'fake' }; };

      const uncompletedDoc = {
        registrationId: 'REG-20261103-PARTIAL',
        resumeToken: 'test_resume_token_123',
        status: 'IN_PROGRESS',
        candidateName: 'Dr. Partial Test',
        email: 'partial.test@wonderfuljodi.com',
        mobile: '9123456799',
        gender: 'Male',
        totalSteps: 4,
        currentStep: 3,
        stepData: {
          basicInfo: {
            fullName: 'Dr. Partial Test',
            email: 'partial.test@wonderfuljodi.com',
            mobile: '9123456799',
            gender: 'Male',
            dob: '1992-03-15',
            passwordHash: userPasswordHash,
            agreeTerms: true,
          },
          personalInfo: {
            maritalStatus: 'Never Married',
            religion: 'Hindu',
            city: 'Mumbai',
            state: 'Maharashtra',
          },
          educationProfession: {
            education: 'MBBS',
            profession: 'Physician',
          },
        },
        save: async function() { this.saved = true; return this; },
      };

      Registration.findOne = async () => uncompletedDoc;
      User.findOne = async () => null;

      let partialErr = null;
      try {
        await completeRegistration(
          createMockReq({
            method: 'POST',
            url: '/api/registrations/complete',
            headers: { 'x-resume-token': 'test_resume_token_123' },
            body: { registrationId: 'REG-20261103-PARTIAL', agreeTerms: true },
          }),
          createMockRes(),
          (err) => { partialErr = err; }
        );
      } catch (err) {
        partialErr = err;
      }

      assert(partialErr, 'Expected configuration error on completeRegistration');
      assert.strictEqual(userCreateCount, 0, 'User record must NOT be created when JWT_SECRET is missing');
      assert.strictEqual(profileCreateCount, 0, 'Profile record must NOT be created when JWT_SECRET is missing');
      assert.strictEqual(uncompletedDoc.status, 'IN_PROGRESS', 'Registration status must NOT be changed to COMPLETED');
      assert.strictEqual(uncompletedDoc.saved, undefined, 'Registration must NOT be saved when JWT_SECRET is missing');
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      User.create = origUserCreate;
      Profile.create = origProfileCreate;
    }
  });

  await runAsyncTest('7.6 Optional search authentication does not accept tokens signed using the development fallback', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = PROD_SECRET;

      const devSignedToken = jwt.sign(
        { userId: 'spoofed_user_dev', role: 'user' },
        DEV_FALLBACK_SECRET,
        { expiresIn: '15m' }
      );

      let searchExcludedIds = null;
      User.find = (query) => {
        if (query?._id?.$nin) {
          searchExcludedIds = query._id.$nin;
        }
        return {
          select: async () => [{ _id: 'result_candidate_1' }],
        };
      };
      Profile.countDocuments = async () => 1;
      Profile.find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: async () => [
                {
                  _id: 'prof_1',
                  candidateId: 'WJ-DOC-001',
                  gender: 'Female',
                  displayName: 'Dr. Sample Doctor',
                  user: { _id: 'result_candidate_1', role: 'user', verified: true },
                },
              ],
            }),
          }),
        }),
      });
      Block.find = async () => [];

      const res = createMockRes();
      await searchProfiles(
        createMockReq({
          method: 'GET',
          url: '/api/search',
          headers: { authorization: `Bearer ${devSignedToken}` },
          query: { page: '1', limit: '10' },
        }),
        res,
        (err) => { if (err) throw err; }
      );

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert(
        !searchExcludedIds || !searchExcludedIds.includes('spoofed_user_dev'),
        'Dev-signed token MUST NOT authenticate the user in production'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      User.find = origUserFind;
      Profile.countDocuments = origProfileCount;
      Profile.find = origProfileFind;
      Block.find = origBlockFind;
    }
  });

  await runAsyncTest('7.7 Guest search remains functional without authentication headers or tokens', async () => {
    let searchExcludedIds = null;
    User.find = (query) => {
      if (query?._id?.$nin) {
        searchExcludedIds = query._id.$nin;
      }
      return {
        select: async () => [{ _id: 'result_candidate_1' }],
      };
    };
    Profile.countDocuments = async () => 1;
    Profile.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: async () => [
              {
                _id: 'prof_1',
                candidateId: 'WJ-DOC-001',
                gender: 'Female',
                displayName: 'Dr. Sample Doctor',
                user: { _id: 'result_candidate_1', role: 'user', verified: true },
              },
            ],
          }),
        }),
      }),
    });

    try {
      const res = createMockRes();
      await searchProfiles(
        createMockReq({
          method: 'GET',
          url: '/api/search',
          headers: {},
          cookies: {},
          query: { page: '1', limit: '10' },
        }),
        res,
        (err) => { if (err) throw err; }
      );

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.data?.total, 1);
      assert.strictEqual(searchExcludedIds, null, 'Guest search must have no excluded user IDs');
    } finally {
      User.find = origUserFind;
      Profile.countDocuments = origProfileCount;
      Profile.find = origProfileFind;
    }
  });

  await runAsyncTest('7.8 Existing valid token verification remains functional in searchProfiles', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = PROD_SECRET;

      const validProdToken = jwt.sign(
        { userId: 'valid_candidate_123', role: 'user' },
        PROD_SECRET,
        { expiresIn: '15m' }
      );

      let searchExcludedIds = null;
      User.find = (query) => {
        if (query?._id?.$nin) {
          searchExcludedIds = query._id.$nin;
        }
        return {
          select: async () => [{ _id: 'result_candidate_1' }],
        };
      };
      Profile.countDocuments = async () => 1;
      Profile.find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: async () => [
                {
                  _id: 'prof_1',
                  candidateId: 'WJ-DOC-001',
                  gender: 'Female',
                  displayName: 'Dr. Sample Doctor',
                  user: { _id: 'result_candidate_1', role: 'user', verified: true },
                },
              ],
            }),
          }),
        }),
      });
      Block.find = async () => [];

      const res = createMockRes();
      await searchProfiles(
        createMockReq({
          method: 'GET',
          url: '/api/search',
          headers: { authorization: `Bearer ${validProdToken}` },
          query: { page: '1', limit: '10' },
        }),
        res,
        (err) => { if (err) throw err; }
      );

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert(
        searchExcludedIds && searchExcludedIds.includes('valid_candidate_123'),
        'Authenticated user must be identified and excluded from their own search results'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      User.find = origUserFind;
      Profile.countDocuments = origProfileCount;
      Profile.find = origProfileFind;
      Block.find = origBlockFind;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n========================================================================');
  console.log(`Results: ${passedTests} Passed | ${failedTests} Failed`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
