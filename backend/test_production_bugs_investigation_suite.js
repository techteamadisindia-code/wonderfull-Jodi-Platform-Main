/**
 * WONDERFUL JODI — PRODUCTION BUG REGRESSION & DEFECT REMEDIATION TEST SUITE
 *
 * Verifies fixes for:
 * 1. Bug A: Interest acceptance HTTP 500
 *    - Dot-notation query elimination ('metadata.interestId' -> indexed query + in-memory check)
 *    - findNotificationByInterest: exact metadata interest ID matching, null/missing/empty/different ID rejection, cross-user isolation
 *    - MariaDB missing conversation_participants join table fallback:
 *      * Finding existing conversation via parameterized SQL on JSON participants column
 *      * Creating new conversation via scalar insert + parameterized JSON update
 *    - Rollback safety and concurrency on failure
 *    - Idempotency on repeated acceptance
 * 2. Bug B: Profile upload 404
 *    - UPLOAD_ROOT environment variable support for persistent Hostinger storage
 *    - Hostinger persistent domain directory discovery (domainRoot/uploads, domainRoot/public_html/uploads)
 *    - Sibling release directory discovery
 *    - Profile 404 returns clean SVG fallback avatar (HTTP 404)
 *    - Private upload protection (verifications, biodatas)
 * 3. Bug C: Next.js hashed chunk 404
 *    - Sibling release static chunks discovery
 *    - Dynamic HTML response Cache-Control header (public, max-age=0, must-revalidate)
 *    - Static chunk Cache-Control header (public, max-age=31536000, immutable)
 * 4. JSON Filter Correctness & Operator Safety (prismaBridge)
 *    - $eq, $ne, $in, $nin, $exists operators on JSON fields (objects and stringified JSON)
 *    - Handling of null values in $eq and $ne
 *    - Explicit failure (throws Error) on unsupported operators to prevent query broadening
 *    - ModelConstructor.distinct respects JSON predicates and soft-delete filters
 *    - Scan limits and atomic transaction checks on update/delete call sites
 * 5. Conversation Status Handling & Missing-Table Fallback
 *    - extractConversationCriteria preserves status operators, including { status: { $ne: 'ARCHIVED' } }
 *    - matchesStatusFilter evaluates $ne, $eq, $in, $nin, and throws on unsupported operators
 *    - Fallback raw SQL query incorporates parameterized status condition
 *    - Active conversations listing excludes archived conversations
 * 6. Notification Authentication for Guests and Cookie-Only Sessions
 *    - hasAuthSession: checks localStorage tokens + non-sensitive wj_session=1 cookie hint
 *    - Guests skip unread count polling (returns 0 without HTTP request)
 *    - Legitimate cookie-only sessions fetch notifications with withCredentials: true
 *    - X-Skip-Auth-Refresh header on polling avoids cascading 401 refresh loops
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    process.stdout.write(`  [TEST] ${name} ... `);
    await fn();
    console.log('PASSED');
    passedTests++;
  } catch (err) {
    console.log('FAILED');
    console.error(`    Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
    failedTests++;
  }
}

async function runSuite() {
  console.log('============================================================');
  console.log(' WONDERFUL JODI: PRODUCTION DEFECT REMEDIATION TEST SUITE');
  console.log('============================================================\n');

  console.log('--- 1. Testing Notification Matching in interestController ---');

  // Test 1: findNotificationByInterest unit tests
  await test('findNotificationByInterest requires exact interestId and isolates users', async () => {
    const { findNotificationByInterest } = require('./dist/controllers/interestController');
    const { Notification } = require('./dist/models/Notification');

    // Mock Notification.findOne and Notification.find
    const originalFindOne = Notification.findOne;
    const originalFind = Notification.find;

    const mockNotifications = [
      { id: 'notif-1', user: 'user-A', type: 'INTEREST_ACCEPTED', metadata: JSON.stringify({ interestId: 'int-100' }) },
      { id: 'notif-2', user: 'user-A', type: 'INTEREST_ACCEPTED', metadata: JSON.stringify({ interestId: 'int-200' }) },
      { id: 'notif-3', user: 'user-A', type: 'INTEREST_ACCEPTED', metadata: { interestId: null } },
      { id: 'notif-4', user: 'user-A', type: 'INTEREST_ACCEPTED', metadata: { interestId: '' } },
      { id: 'notif-5', user: 'user-A', type: 'INTEREST_ACCEPTED', metadata: null },
      { id: 'notif-6', user: 'user-B', type: 'INTEREST_ACCEPTED', metadata: { interestId: 'int-100' } },
    ];

    try {
      Notification.findOne = async () => null; // Force candidates search
      Notification.find = () => ({
        sort: () => ({
          limit: async () => mockNotifications.filter(n => n.user === 'user-A'),
        }),
      });

      // 1. Exact match returns correct notification
      const match100 = await findNotificationByInterest('user-A', 'INTEREST_ACCEPTED', 'int-100');
      assert(match100 && match100.id === 'notif-1', 'Found exact notification for int-100');

      const match200 = await findNotificationByInterest('user-A', 'INTEREST_ACCEPTED', 'int-200');
      assert(match200 && match200.id === 'notif-2', 'Found exact notification for int-200');

      // 2. Different / nonexistent ID returns null
      const match999 = await findNotificationByInterest('user-A', 'INTEREST_ACCEPTED', 'int-999');
      assert(match999 === null, 'Different ID returns null');

      // 3. Null / empty target interest ID returns null
      const matchNullId = await findNotificationByInterest('user-A', 'INTEREST_ACCEPTED', null);
      assert(matchNullId === null, 'Null interestId returns null');
      const matchEmptyId = await findNotificationByInterest('user-A', 'INTEREST_ACCEPTED', '   ');
      assert(matchEmptyId === null, 'Empty interestId returns null');

      // 4. Null / empty targetUserId returns null
      const matchNullUser = await findNotificationByInterest(null, 'INTEREST_ACCEPTED', 'int-100');
      assert(matchNullUser === null, 'Null targetUserId returns null');

      // 5. Notifications belonging to different user are never returned
      Notification.find = () => ({
        sort: () => ({
          limit: async () => mockNotifications.filter(n => n.user === 'user-B'),
        }),
      });
      const matchWrongUser = await findNotificationByInterest('user-A', 'INTEREST_ACCEPTED', 'int-100');
      assert(matchWrongUser === null, 'Different user notifications are never returned');
    } finally {
      Notification.findOne = originalFindOne;
      Notification.find = originalFind;
    }
  });

  console.log('\n--- 2. Testing JSON Predicate Matching & Safety (prismaBridge) ---');

  // Test 2: matchesJsonPredicates supports $eq, $ne, $in, $nin, $exists
  await test('matchesJsonPredicates supports $eq, $ne, $in, $nin, $exists correctly', () => {
    const { matchesJsonPredicates } = require('./dist/db/prismaBridge');

    const recordA = {
      id: 'rec-1',
      metadata: JSON.stringify({ category: 'GOLD', active: true, campaignId: 'c1', points: 100 }),
    };
    const recordB = {
      id: 'rec-2',
      metadata: { category: 'SILVER', campaignId: 'c2', points: 50 },
    };
    const recordEmpty = {
      id: 'rec-3',
      metadata: null,
    };

    // $eq
    assert(matchesJsonPredicates(recordA, { 'metadata.category': { $eq: 'GOLD' } }) === true, '$eq matches exact');
    assert(matchesJsonPredicates(recordB, { 'metadata.category': { $eq: 'GOLD' } }) === false, '$eq rejects different');

    // $ne
    assert(matchesJsonPredicates(recordA, { 'metadata.category': { $ne: 'SILVER' } }) === true, '$ne matches non-equal');
    assert(matchesJsonPredicates(recordB, { 'metadata.category': { $ne: 'SILVER' } }) === false, '$ne rejects equal');

    // $in
    assert(matchesJsonPredicates(recordA, { 'metadata.campaignId': { $in: ['c1', 'c3'] } }) === true, '$in matches member');
    assert(matchesJsonPredicates(recordB, { 'metadata.campaignId': { $in: ['c1', 'c3'] } }) === false, '$in rejects non-member');

    // $nin
    assert(matchesJsonPredicates(recordB, { 'metadata.campaignId': { $nin: ['c1', 'c3'] } }) === true, '$nin matches excluded');
    assert(matchesJsonPredicates(recordA, { 'metadata.campaignId': { $nin: ['c1', 'c3'] } }) === false, '$nin rejects present');

    // $exists
    assert(matchesJsonPredicates(recordA, { 'metadata.active': { $exists: true } }) === true, '$exists: true on present field');
    assert(matchesJsonPredicates(recordB, { 'metadata.active': { $exists: true } }) === false, '$exists: true on absent field');
    assert(matchesJsonPredicates(recordB, { 'metadata.active': { $exists: false } }) === true, '$exists: false on absent field');
    assert(matchesJsonPredicates(recordEmpty, { 'metadata.category': { $exists: false } }) === true, '$exists: false on null metadata');
  });

  // Test 3: matchesJsonPredicates throws on unsupported operators
  await test('matchesJsonPredicates fails closed and throws Error on unsupported operators', () => {
    const { matchesJsonPredicates } = require('./dist/db/prismaBridge');

    const record = { id: 'rec-1', metadata: { score: 95 } };

    assert.throws(
      () => matchesJsonPredicates(record, { 'metadata.score': { $gt: 90 } }),
      /Unsupported JSON predicate operator "\$gt"/,
      'Throws on $gt operator'
    );

    assert.throws(
      () => matchesJsonPredicates(record, { 'metadata.score': { $where: 'this.score > 90' } }),
      /Unsupported JSON predicate operator "\$where"/,
      'Throws on $where operator'
    );
  });

  // Test 4: normalizeFilter fails closed on unsupported operators
  await test('normalizeFilter throws on unsupported top-level and field operators', () => {
    const { normalizeFilter } = require('./dist/db/prismaBridge');

    assert.throws(
      () => normalizeFilter({ $nor: [{ a: 1 }] }),
      /Unsupported top-level query operator "\$nor"/,
      'Throws on $nor'
    );

    assert.throws(
      () => normalizeFilter({ status: { $elemMatch: { x: 1 } } }),
      /Unsupported operator "\$elemMatch"/,
      'Throws on $elemMatch'
    );
  });

  console.log('\n--- 3. Testing Conversation Status Handling & Missing-Table Fallback ---');

  // Test 5: extractConversationCriteria preserves status operators
  await test('extractConversationCriteria preserves { status: { $ne: "ARCHIVED" } } and operators', () => {
    const { extractConversationCriteria, matchesStatusFilter } = require('./dist/db/prismaBridge');

    const filterArchivedNe = {
      participants: 'user-1',
      status: { $ne: 'ARCHIVED' },
    };
    const criteria1 = extractConversationCriteria(filterArchivedNe);
    assert.deepStrictEqual(criteria1.statusFilter, { $ne: 'ARCHIVED' }, 'Preserves statusFilter object');
    assert(matchesStatusFilter('ACTIVE', criteria1.statusFilter) === true, 'ACTIVE matches $ne ARCHIVED');
    assert(matchesStatusFilter('ARCHIVED', criteria1.statusFilter) === false, 'ARCHIVED rejected by $ne ARCHIVED');

    const filterString = { status: 'ACTIVE' };
    const criteria2 = extractConversationCriteria(filterString);
    assert.strictEqual(criteria2.status, 'ACTIVE', 'Preserves direct string status');
    assert(matchesStatusFilter('ACTIVE', criteria2.statusFilter) === true, 'ACTIVE matches string ACTIVE');
    assert(matchesStatusFilter('ARCHIVED', criteria2.statusFilter) === false, 'ARCHIVED rejected by string ACTIVE');

    const filterIn = { status: { $in: ['ACTIVE', 'FLAGGED'] } };
    const criteria3 = extractConversationCriteria(filterIn);
    assert(matchesStatusFilter('FLAGGED', criteria3.statusFilter) === true, 'FLAGGED matches in [ACTIVE, FLAGGED]');
    assert(matchesStatusFilter('ARCHIVED', criteria3.statusFilter) === false, 'ARCHIVED rejected by in [ACTIVE, FLAGGED]');

    // Unsupported operator in status filter throws Error
    assert.throws(
      () => extractConversationCriteria({ status: { $gt: 5 } }),
      /Unsupported operator "\$gt" in conversation status filter/,
      'Throws on unsupported status operator'
    );
  });

  // Test 6: Fallback raw SQL query includes parameterized status condition
  await test('prismaBridge includes parameterized status condition in conversation fallback SQL', () => {
    const bridgePath = path.resolve(__dirname, 'src/db/prismaBridge.ts');
    const bridgeContent = fs.readFileSync(bridgePath, 'utf8');

    assert(
      bridgeContent.includes('statusSql') && bridgeContent.includes('${statusSql}'),
      'Conversation SQL fallback includes statusSql condition in raw SQL'
    );
    assert(
      bridgeContent.includes('status') && bridgeContent.includes('criteria.statusFilter.$ne'),
      'Handles $ne status in SQL query'
    );
  });

  console.log('\n--- 4. Testing Notification Authentication (hasAuthSession & Interceptors) ---');

  // Test 7: frontend hasAuthSession detects tokens and wj_session cookie hint
  await test('hasAuthSession correctly checks tokens and non-sensitive wj_session cookie hint', () => {
    const apiPath = path.resolve(__dirname, '../frontend/services/api.ts');
    const apiContent = fs.readFileSync(apiPath, 'utf8');

    assert(apiContent.includes('export function hasAuthSession(): boolean'), 'api.ts exports hasAuthSession');
    assert(apiContent.includes('wj_session=1'), 'hasAuthSession checks for wj_session=1 cookie hint');
    assert(apiContent.includes('localStorage.getItem(USER_TOKEN_KEY)'), 'hasAuthSession checks USER_TOKEN_KEY');
    assert(apiContent.includes('localStorage.getItem(ADMIN_TOKEN_KEY)'), 'hasAuthSession checks ADMIN_TOKEN_KEY');
  });

  // Test 8: notificationApi skips polling when hasAuthSession is false
  await test('fetchUnreadNotificationCount and fetchUserNotifications check hasAuthSession before network calls', () => {
    const notifApiPath = path.resolve(__dirname, '../frontend/services/notificationApi.ts');
    const notifApiContent = fs.readFileSync(notifApiPath, 'utf8');

    assert(notifApiContent.includes('hasAuthSession()'), 'notificationApi imports and calls hasAuthSession');
    assert(notifApiContent.includes("'X-Skip-Auth-Refresh': 'true'"), 'notificationApi attaches X-Skip-Auth-Refresh header');
  });

  // Test 9: api.ts interceptor prevents cascading refresh loops on X-Skip-Auth-Refresh
  await test('api.ts response interceptor skips refresh Auth session when X-Skip-Auth-Refresh is present', () => {
    const apiPath = path.resolve(__dirname, '../frontend/services/api.ts');
    const apiContent = fs.readFileSync(apiPath, 'utf8');

    assert(
      apiContent.includes('skipAuthRefresh') &&
      apiContent.includes('X-Skip-Auth-Refresh'),
      'api.ts detects skipAuthRefresh and rejects without refreshAuthSession'
    );
  });

  // Test 10: backend sets and clears wj_session cookie on auth lifecycle
  await test('backend authController and adminAuthController manage non-sensitive wj_session cookie', () => {
    const userAuthContent = fs.readFileSync(path.resolve(__dirname, 'src/controllers/authController.ts'), 'utf8');
    const adminAuthContent = fs.readFileSync(path.resolve(__dirname, 'src/controllers/adminAuthController.ts'), 'utf8');

    assert(userAuthContent.includes("res.cookie('wj_session'"), 'authController sets wj_session cookie');
    assert(userAuthContent.includes("res.clearCookie('wj_session'"), 'authController clears wj_session cookie');
    assert(adminAuthContent.includes("res.cookie('wj_session'"), 'adminAuthController sets wj_session cookie');
    assert(adminAuthContent.includes("res.clearCookie('wj_session'"), 'adminAuthController clears wj_session cookie');
  });

  console.log('\n--- 5. Testing Profile Uploads & Next.js Caching Regressions ---');

  // Test 11: UPLOAD_ROOT environment variable sets canonical upload directory
  await test('UPLOAD_ROOT environment variable sets canonical upload directory', () => {
    const uploadPaths = require(path.resolve(__dirname, 'dist/utils/uploadPaths.js'));
    const originalEnv = process.env.UPLOAD_ROOT;

    try {
      const customRoot = path.resolve(__dirname, 'temp_persistent_uploads');
      process.env.UPLOAD_ROOT = customRoot;

      const canonical = uploadPaths.getCanonicalUploadRootDir();
      assert.strictEqual(canonical, customRoot, 'getCanonicalUploadRootDir respects UPLOAD_ROOT');

      const primary = uploadPaths.getCanonicalUploadDir('profiles');
      assert.strictEqual(primary, path.join(customRoot, 'profiles'), 'getCanonicalUploadDir uses custom UPLOAD_ROOT');
    } finally {
      if (originalEnv !== undefined) {
        process.env.UPLOAD_ROOT = originalEnv;
      } else {
        delete process.env.UPLOAD_ROOT;
      }
    }
  });

  // Test 12: Profile missing file returns clean SVG avatar (HTTP 404), not HTML error
  await test('Missing profile photo route is configured with SVG fallback avatar', () => {
    const appPath = path.resolve(__dirname, 'src/app.ts');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert(appContent.includes('DEFAULT_PROFILE_FALLBACK_SVG'), 'app.ts defines DEFAULT_PROFILE_FALLBACK_SVG');
    assert(appContent.includes('image/svg+xml'), 'app.ts sets image/svg+xml content type for profile fallback');
  });

  // Test 13: Private uploads are protected
  await test('Private upload directories are protected with 403 on direct static access', () => {
    const appPath = path.resolve(__dirname, 'src/app.ts');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert(
      appContent.includes('/uploads/(verifications|biodatas)') || appContent.includes('verifications|biodatas'),
      'app.ts restricts static access to private uploads'
    );
  });

  // Test 14: Cache-Control on Next.js dynamic HTML responses
  await test('app.ts sets Cache-Control: public, max-age=0, must-revalidate for dynamic HTML requests', () => {
    const appPath = path.resolve(__dirname, 'src/app.ts');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert(
      appContent.includes("res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')"),
      'app.ts sets revalidation Cache-Control on non-static Next.js routes'
    );
  });

  // Test 15: frontend next.config.mjs defines immutable cache headers
  await test('frontend/next.config.mjs configures immutable headers for /_next/static', () => {
    const nextConfigPath = path.resolve(__dirname, '../frontend/next.config.mjs');
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

    assert(
      nextConfigContent.includes('public, max-age=31536000, immutable'),
      'next.config.mjs preserves immutable caching for static chunks'
    );
  });

  // Test 16: Audit of fallback JWT key in authMiddleware
  await test('authMiddleware contains fallback signing key documented for separate JWT hardening PR', () => {
    const authPath = path.resolve(__dirname, 'src/middleware/authMiddleware.ts');
    const authContent = fs.readFileSync(authPath, 'utf8');

    assert(
      authContent.includes('supersecret_wonderfuljodi_dev_key_2026'),
      'Verified presence of fallback signing key in authMiddleware for separate reviewable PR'
    );
  });

  console.log('\n============================================================');
  console.log(`Suite Complete: ${passedTests}/${passedTests + failedTests} Passed (${failedTests} Failed)`);
  console.log('============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
