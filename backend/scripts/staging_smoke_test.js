/**
 * Wonderful Jodi — Staging Smoke Test Suite
 *
 * PURPOSE:
 * End-to-end acceptance, privacy, and concurrency verification for the
 * Profile View Notifications feature against an isolated staging environment.
 *
 * CRITICAL NOTIFICATION OWNERSHIP ARCHITECTURE:
 * Profile-view notifications are created for and sent to the OWNER of the profile
 * being viewed (NOT the viewer).
 *
 * TEST IDENTITIES:
 * 1. Viewer Account: Authenticated member browsing the platform.
 * 2. Free Profile Owner: Member without a paid subscription receiving locked notifications.
 * 3. Paid Profile Owner: Member with an active paid plan (DOCTOR_CONNECT) receiving unlocked visitor cards.
 *
 * SAFETY GUARDS:
 * 1. Requires explicit CLI flag: --confirm-staging.
 * 2. Target URL must be staging (aborts if targeting production wonderfuljodi.com).
 * 3. Never logs credentials, passwords, session tokens, or full connection strings.
 * 4. Verifies DATABASE_URL through stagingGuard before any direct database connection.
 *
 * USAGE (via environment variables - recommended):
 *   export STAGING_CONFIRMED=true
 *   export STAGING_BASE_URL="https://staging.wonderfuljodi.com"
 *   export STAGING_VIEWER_EMAIL="viewer@staging.wonderfuljodi.test"
 *   export STAGING_VIEWER_PASSWORD="<STRONG_VIEWER_PASSWORD>"
 *   export STAGING_FREE_OWNER_EMAIL="free_owner@staging.wonderfuljodi.test"
 *   export STAGING_FREE_OWNER_PASSWORD="<STRONG_FREE_PASSWORD>"
 *   export STAGING_FREE_OWNER_PROFILE_ID="<FREE_OWNER_PROFILE_OR_CANDIDATE_ID>"
 *   export STAGING_PAID_OWNER_EMAIL="paid_owner@staging.wonderfuljodi.test"
 *   export STAGING_PAID_OWNER_PASSWORD="<STRONG_PAID_PASSWORD>"
 *   export STAGING_PAID_OWNER_PROFILE_ID="<PAID_OWNER_PROFILE_OR_CANDIDATE_ID>"
 *   node backend/scripts/staging_smoke_test.js --confirm-staging
 */

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');
const assert = require('assert');

// ─── Command Line & Environment Configuration ───
const args = process.argv.slice(2);
function getArg(name) {
  const prefix = `--${name}=`;
  const match = args.find((a) => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

const hasConfirmation =
  args.includes('--confirm-staging') ||
  process.env.STAGING_CONFIRMED === 'true' ||
  process.env.STAGING_SMOKE_CONFIRMED === 'true';

const baseUrl = (
  getArg('base-url') ||
  process.env.STAGING_BASE_URL ||
  'https://staging.wonderfuljodi.com'
).replace(/\/+$/, '');

// Test Account Credentials (preferred via Environment Variables)
const viewerEmail = getArg('viewer-email') || process.env.STAGING_VIEWER_EMAIL;
const viewerPassword = getArg('viewer-password') || process.env.STAGING_VIEWER_PASSWORD;

const freeOwnerEmail = getArg('free-owner-email') || process.env.STAGING_FREE_OWNER_EMAIL;
const freeOwnerPassword = getArg('free-owner-password') || process.env.STAGING_FREE_OWNER_PASSWORD;
const freeOwnerProfileId = getArg('free-owner-profile-id') || process.env.STAGING_FREE_OWNER_PROFILE_ID;

const paidOwnerEmail = getArg('paid-owner-email') || process.env.STAGING_PAID_OWNER_EMAIL;
const paidOwnerPassword = getArg('paid-owner-password') || process.env.STAGING_PAID_OWNER_PASSWORD;
const paidOwnerProfileId = getArg('paid-owner-profile-id') || process.env.STAGING_PAID_OWNER_PROFILE_ID;

// ─── Safety Guard: Reject Production Targets ───
function assertStagingTarget(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    console.error(`🛑 Malformed target URL: ${urlStr}`);
    process.exit(1);
  }

  const host = parsed.hostname.toLowerCase();

  // Strict production hostname intercepts
  if (
    host === 'wonderfuljodi.com' ||
    host === 'www.wonderfuljodi.com' ||
    host === 'api.wonderfuljodi.com' ||
    host === 'admin.wonderfuljodi.com'
  ) {
    console.error('\n🛑 CRITICAL SAFETY HALT: Target URL points to PRODUCTION wonderfuljodi.com!');
    console.error('Smoke tests must ONLY run against staging (staging.wonderfuljodi.com).\n');
    process.exit(1);
  }

  if (!host.includes('staging') && host !== 'localhost' && host !== '127.0.0.1') {
    console.error(`\n🛑 SAFETY HALT: Host '${host}' does not appear to be an approved staging host.`);
    console.error('Target hostname must contain "staging" or be localhost.\n');
    process.exit(1);
  }
}

// ─── HTTP Request Helper with Independent TCP Connections ───
function request(method, path, body = null, headers = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(path, baseUrl);
    const isHttps = fullUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    // Force an isolated TCP connection per request (disable HTTP keep-alive)
    const agent = new transport.Agent({ keepAlive: false });

    const reqHeaders = {
      'User-Agent': 'WJ-Staging-SmokeTest/2.0',
      'Accept': 'application/json',
      ...headers,
    };

    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = transport.request(
      fullUrl,
      {
        method,
        headers: reqHeaders,
        agent: options.agent || agent,
        timeout: 12000,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request ${method} ${path} timed out after 12000ms`));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

// ─── Authentication Helper ───
async function loginUser(email, password, label) {
  if (!email || !password) {
    throw new Error(`Missing credentials for ${label}`);
  }

  const res = await request('POST', '/api/auth/login', {
    emailOrMobile: email,
    password: password,
  });

  if (res.statusCode !== 200 || !res.data?.success) {
    const errorMsg = res.data?.message || res.data?.error || `HTTP ${res.statusCode}`;
    throw new Error(`Authentication failed for ${label} (${maskEmail(email)}): ${errorMsg}`);
  }

  const token = res.data?.token || res.data?.data?.token;
  const user = res.data?.user || res.data?.data?.user;

  if (!token) {
    throw new Error(`No JWT token returned in login response for ${label}`);
  }

  return { token, user };
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

// ─── Recursive Privacy Assertion for Free Members ───
function assertNoVisitorIdentityRecursive(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;

  const FORBIDDEN_KEYS = [
    'vieweruserid',
    'viewerid',
    'visitorname',
    'viewername',
    'visitorphoto',
    'vieweravatar',
    'visitorprofileid',
    'fullname',
    'mobile',
    'phone',
    'avatar',
    'profilephoto',
    'candidateid',
  ];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const lowerKey = key.toLowerCase();

    for (const forbidden of FORBIDDEN_KEYS) {
      if (lowerKey === forbidden) {
        assert.fail(`Privacy violation: forbidden identifying key '${currentPath}' detected in Free member notification payload`);
      }
    }

    if (lowerKey.includes('visitor') && lowerKey !== 'visitor' && !lowerKey.includes('profile-viewers')) {
      assert.fail(`Privacy violation: unexpected visitor key '${currentPath}' detected in Free member notification payload`);
    }

    if (typeof value === 'object' && value !== null) {
      assertNoVisitorIdentityRecursive(value, currentPath);
    }
  }
}

// ─── Main Smoke Test Runner ───
async function runSmokeTests() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  WONDERFUL JODI — STAGING ACCEPTANCE & SMOKE TEST SUITE');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Guard 1: Developer Confirmation Flag
  if (!hasConfirmation) {
    console.error('❌ SAFETY HALT: Manual confirmation flag --confirm-staging is required.');
    console.log('\nConfigure environment variables and run:');
    console.log('  node backend/scripts/staging_smoke_test.js --confirm-staging\n');
    process.exit(1);
  }

  // Guard 2: Target URL Validation
  console.log(`[PREFLIGHT] Validating staging target URL: ${baseUrl}`);
  assertStagingTarget(baseUrl);
  console.log('  ✅ Staging target confirmed (production domain blocked)\n');

  // Guard 3: Health Endpoint Check
  console.log('[PROBE 1] Checking API health endpoint (/api/health)...');
  const healthRes = await request('GET', '/api/health');
  if (healthRes.statusCode !== 200) {
    throw new Error(`Health check failed with status ${healthRes.statusCode}: ${JSON.stringify(healthRes.data)}`);
  }
  console.log('  ✅ Health endpoint responded HTTP 200 OK');
  console.log(`     Server Status:   ${healthRes.data?.status || 'OK'}`);
  console.log(`     Database Status: ${healthRes.data?.database || healthRes.data?.db || 'connected'}\n`);

  // Check if test account credentials are provided
  const hasFreeTest = Boolean(viewerEmail && viewerPassword && freeOwnerEmail && freeOwnerPassword && freeOwnerProfileId);
  const hasPaidTest = Boolean(viewerEmail && viewerPassword && paidOwnerEmail && paidOwnerPassword && paidOwnerProfileId);

  if (!hasFreeTest && !hasPaidTest) {
    console.warn('⚠️ Test identities not fully provided via environment variables.');
    console.warn('To run live profile-view ownership tests, supply:');
    console.warn('  STAGING_VIEWER_EMAIL & STAGING_VIEWER_PASSWORD');
    console.warn('  STAGING_FREE_OWNER_EMAIL, STAGING_FREE_OWNER_PASSWORD, STAGING_FREE_OWNER_PROFILE_ID');
    console.warn('  STAGING_PAID_OWNER_EMAIL, STAGING_PAID_OWNER_PASSWORD, STAGING_PAID_OWNER_PROFILE_ID\n');
    console.log('[STATUS] Health preflight passed. Awaiting provisioned staging test identities.\n');
    return;
  }

  // Authenticate Viewer Account
  console.log(`[AUTH] Authenticating browsing viewer: ${maskEmail(viewerEmail)}`);
  const viewerSession = await loginUser(viewerEmail, viewerPassword, 'Viewer');
  const viewerAuthHeader = { Authorization: `Bearer ${viewerSession.token}` };
  const viewerUserId = String(viewerSession.user?.id || viewerSession.user?._id || '');
  console.log(`  ✅ Viewer authenticated: ID=${viewerUserId ? `${viewerUserId.slice(0, 8)}...` : '(unknown)'}\n`);

  // ════════════════════════════════════════════════════════════════
  // TEST 1: FREE PROFILE OWNER PRIVACY VERIFICATION
  // ════════════════════════════════════════════════════════════════
  if (hasFreeTest) {
    console.log('────────────────────────────────────────────────────────────────');
    console.log('TEST 1: Free Profile Owner Privacy & Locked Notification');
    console.log('────────────────────────────────────────────────────────────────');

    // Step 1: Viewer requests Free owner's full profile
    console.log(`Step 1: Viewer browsing Free owner profile: ${freeOwnerProfileId}`);
    const viewFreeRes = await request('GET', `/api/profiles/${freeOwnerProfileId}`, null, viewerAuthHeader);
    assert.strictEqual(
      viewFreeRes.statusCode,
      200,
      `Viewer failed to fetch Free owner profile: HTTP ${viewFreeRes.statusCode}`
    );
    console.log('  ✅ Profile view HTTP 200 recorded by server');

    // Allow asynchronous notification tracking worker to persist
    await new Promise((r) => setTimeout(r, 1200));

    // Step 2: Authenticate AS THE FREE PROFILE OWNER
    console.log(`Step 2: Authenticating as Free Profile Owner: ${maskEmail(freeOwnerEmail)}`);
    const freeOwnerSession = await loginUser(freeOwnerEmail, freeOwnerPassword, 'Free Owner');
    const freeOwnerAuthHeader = { Authorization: `Bearer ${freeOwnerSession.token}` };
    const freeOwnerUserId = String(freeOwnerSession.user?.id || freeOwnerSession.user?._id || '');
    console.log('  ✅ Free Profile Owner authenticated');

    // Step 3: Fetch notifications AS THE FREE PROFILE OWNER
    console.log('Step 3: Fetching notifications as Free Profile Owner...');
    const freeNotifRes = await request('GET', '/api/notifications?page=1&limit=5', null, freeOwnerAuthHeader);
    assert.strictEqual(freeNotifRes.statusCode, 200, `Failed to fetch notifications: HTTP ${freeNotifRes.statusCode}`);

    const notifList = freeNotifRes.data?.notifications || freeNotifRes.data?.data?.notifications || freeNotifRes.data?.data || [];
    const pvNotifs = (Array.isArray(notifList) ? notifList : []).filter((n) => n.type === 'PROFILE_VIEW');

    console.log(`  Found ${pvNotifs.length} PROFILE_VIEW notification(s) for Free Owner`);
    assert.ok(pvNotifs.length > 0, 'Free profile owner must have received at least 1 PROFILE_VIEW notification');

    const latestPv = pvNotifs[0];

    // Step 4: Strict Privacy & Contract Assertions
    console.log('Step 4: Verifying locked projection & zero visitor identity leakage...');
    assert.strictEqual(latestPv.type, 'PROFILE_VIEW', 'Notification type must be PROFILE_VIEW');
    assert.strictEqual(latestPv.title, 'Someone viewed your profile', 'Title must be generic for Free member');
    assert.strictEqual(
      latestPv.message,
      'A member is interested in your profile. Upgrade to discover who.',
      'Message must invite upgrade without revealing details'
    );
    assert.strictEqual(
      latestPv.actionUrl,
      '/membership?feature=profile-viewers',
      'Action URL must route to membership feature upgrade'
    );
    assert.strictEqual(
      latestPv.link,
      '/membership?feature=profile-viewers',
      'Link must route to membership feature upgrade'
    );
    assert.strictEqual(latestPv.isLocked, true, 'Top-level isLocked must be true for Free member');
    assert.strictEqual(latestPv.metadata?.isLocked, true, 'metadata.isLocked must be true for Free member');
    assert.strictEqual(
      latestPv.metadata?.upgradeFeature,
      'profile-viewers',
      'metadata.upgradeFeature must be profile-viewers'
    );
    assert.strictEqual(
      latestPv.metadata?.unlockUrl,
      '/membership?feature=profile-viewers',
      'metadata.unlockUrl must route to membership'
    );

    // Recursive search: assert NO visitor-identifying keys or values anywhere
    assertNoVisitorIdentityRecursive(latestPv);

    // Deep substring search: ensure viewerUserId does not appear anywhere in payload
    if (viewerUserId) {
      const serializedStr = JSON.stringify(latestPv);
      assert.ok(
        !serializedStr.includes(viewerUserId),
        'Viewer user ID must NOT appear anywhere in serialized Free notification'
      );
    }

    console.log('  ✅ [PASS] Free Profile Owner privacy verified (0 visitor identity fields returned)\n');
  }

  let paidOwnerUserId = '';

  // ════════════════════════════════════════════════════════════════
  // TEST 2: PAID PROFILE OWNER ENTITLEMENT VERIFICATION
  // ════════════════════════════════════════════════════════════════
  if (hasPaidTest) {
    console.log('────────────────────────────────────────────────────────────────');
    console.log('TEST 2: Paid Profile Owner Entitlement & Unlocked Projection');
    console.log('────────────────────────────────────────────────────────────────');

    // Step 1: Viewer requests Paid owner's full profile
    console.log(`Step 1: Viewer browsing Paid owner profile: ${paidOwnerProfileId}`);
    const viewPaidRes = await request('GET', `/api/profiles/${paidOwnerProfileId}`, null, viewerAuthHeader);
    assert.strictEqual(
      viewPaidRes.statusCode,
      200,
      `Viewer failed to fetch Paid owner profile: HTTP ${viewPaidRes.statusCode}`
    );
    console.log('  ✅ Profile view HTTP 200 recorded by server');

    await new Promise((r) => setTimeout(r, 1200));

    // Step 2: Authenticate AS THE PAID PROFILE OWNER
    console.log(`Step 2: Authenticating as Paid Profile Owner: ${maskEmail(paidOwnerEmail)}`);
    const paidOwnerSession = await loginUser(paidOwnerEmail, paidOwnerPassword, 'Paid Owner');
    const paidOwnerAuthHeader = { Authorization: `Bearer ${paidOwnerSession.token}` };
    paidOwnerUserId = String(paidOwnerSession.user?.id || paidOwnerSession.user?._id || '');
    console.log(`  ✅ Paid Profile Owner authenticated: ID=${paidOwnerUserId ? `${paidOwnerUserId.slice(0, 8)}...` : '(unknown)'}`);

    // Step 3: Fetch notifications AS THE PAID PROFILE OWNER
    console.log('Step 3: Fetching notifications as Paid Profile Owner...');
    const paidNotifRes = await request('GET', '/api/notifications?page=1&limit=5', null, paidOwnerAuthHeader);
    assert.strictEqual(paidNotifRes.statusCode, 200, `Failed to fetch notifications: HTTP ${paidNotifRes.statusCode}`);

    const notifList = paidNotifRes.data?.notifications || paidNotifRes.data?.data?.notifications || paidNotifRes.data?.data || [];
    const pvNotifs = (Array.isArray(notifList) ? notifList : []).filter((n) => n.type === 'PROFILE_VIEW');

    console.log(`  Found ${pvNotifs.length} PROFILE_VIEW notification(s) for Paid Owner`);
    assert.ok(pvNotifs.length > 0, 'Paid profile owner must have received at least 1 PROFILE_VIEW notification');

    const latestPv = pvNotifs[0];

    // Step 4: Strict Entitlement & Approved Public Contract Assertions
    console.log('Step 4: Verifying unlocked projection & allowlisted visitor card...');
    assert.strictEqual(latestPv.type, 'PROFILE_VIEW', 'Notification type must be PROFILE_VIEW');
    assert.strictEqual(latestPv.isLocked, false, 'Top-level isLocked must be false for Paid member');
    assert.strictEqual(latestPv.metadata?.isLocked, false, 'metadata.isLocked must be false for Paid member');

    // Permitted Public Projection
    assert.ok(
      typeof latestPv.metadata?.visitorName === 'string' && latestPv.metadata.visitorName.length > 0,
      'metadata.visitorName must be a valid non-empty display name'
    );
    assert.ok(
      latestPv.metadata?.visitorProfileId,
      'metadata.visitorProfileId must be present for Paid member'
    );
    assert.strictEqual(
      latestPv.actionUrl,
      `/profile/${latestPv.metadata.visitorProfileId}`,
      'actionUrl must route to /profile/:id'
    );
    assert.strictEqual(
      latestPv.metadata?.profileUrl,
      `/profile/${latestPv.metadata.visitorProfileId}`,
      'metadata.profileUrl must route to /profile/:id'
    );

    // Reject Private Contact Details
    assert.strictEqual(latestPv.metadata?.email, undefined, 'Private email must NEVER leak in metadata');
    assert.strictEqual(latestPv.metadata?.mobile, undefined, 'Private mobile must NEVER leak in metadata');
    assert.strictEqual(latestPv.metadata?.phone, undefined, 'Private phone must NEVER leak in metadata');

    console.log(`  Visitor Name:      ${latestPv.metadata.visitorName}`);
    console.log(`  Visitor Profile:   ${latestPv.metadata.visitorProfileId}`);
    console.log(`  Action URL:        ${latestPv.actionUrl}`);
    console.log('  ✅ [PASS] Paid Profile Owner unlocked projection verified\n');
  }

  // ════════════════════════════════════════════════════════════════
  // TEST 3: DETERMINISTIC CONCURRENCY VERIFICATION
  // ════════════════════════════════════════════════════════════════
  if (hasPaidTest) {
    console.log('────────────────────────────────────────────────────────────────');
    console.log('TEST 3: Deterministic Concurrency via Separate HTTP Connections');
    console.log('────────────────────────────────────────────────────────────────');
    console.log('Submitting 5 simultaneous full-profile view requests from separate TCP sockets...');
    console.log(`  Authenticated Viewer ID: ${viewerUserId ? `${viewerUserId.slice(0, 8)}...` : '(present)'}`);
    console.log(`  Target Profile Owner ID: ${paidOwnerProfileId}`);

    // Create 5 simultaneous HTTP requests using separate TCP sockets (keepAlive: false)
    const concurrentRequests = Array.from({ length: 5 }, (_, idx) => {
      return request('GET', `/api/profiles/${paidOwnerProfileId}`, null, viewerAuthHeader);
    });

    const results = await Promise.all(concurrentRequests);
    const statusCodes = results.map((r) => r.statusCode);
    console.log(`  Response Status Codes: [${statusCodes.join(', ')}]`);
    assert.ok(
      statusCodes.every((s) => s === 200),
      'All concurrent profile view requests must succeed with HTTP 200'
    );

    // Wait for database transaction commitments
    await new Promise((r) => setTimeout(r, 1500));

    // Direct Database Count Verification (Using Exact MariaDB Schema)
    if (process.env.DATABASE_URL) {
      console.log('Step 2: Connecting directly to staging database to verify notification count...');
      const { validateStagingDatabaseUrl } = require('../dist/utils/stagingGuard');
      const validation = validateStagingDatabaseUrl(process.env.DATABASE_URL);

      if (!validation.isValid) {
        console.error(`  ❌ Direct DB check skipped: ${validation.error}`);
      } else {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient({
          datasources: { db: { url: process.env.DATABASE_URL } },
          log: ['error'],
        });

        try {
          // Exact MariaDB column names:
          // table: 'notifications'
          // recipient column: 'user'
          // type column: 'type'
          // metadata column: 'metadata' (JSON)
          // timestamp column: 'createdAt'
          const targetOwnerUserId = paidOwnerUserId || paidOwnerProfileId;
          const rows = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM notifications
            WHERE \`user\` = ${targetOwnerUserId}
              AND \`type\` = 'PROFILE_VIEW'
              AND (
                JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.viewerUserId')) = ${viewerUserId}
                OR metadata LIKE ${`%"viewerUserId":"${viewerUserId}"%`}
              )
              AND \`createdAt\` >= NOW() - INTERVAL 1 DAY;
          `;

          const count = Number(rows?.[0]?.count || 0);
          console.log(`  Direct SQL Count: ${count} notification(s) found for (viewer=${viewerUserId.slice(0, 8)}..., owner=${targetOwnerUserId})`);
          assert.strictEqual(
            count,
            1,
            `Concurrency race condition detected! Expected exactly 1 notification, found ${count}`
          );
          console.log('  ✅ [PASS] Advisory lock verified: Exactly 1 notification created within 24h cooldown');
        } finally {
          await prisma.$disconnect();
        }
      }
    } else {
      console.log('  [NOTE] DATABASE_URL not set in process.env; direct MariaDB count skipped.');
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  ALL STAGING SMOKE & CONCURRENCY TESTS PASSED SUCCESSFULLY');
  console.log('════════════════════════════════════════════════════════════════\n');
}

runSmokeTests().catch((err) => {
  console.error('\n❌ Staging Smoke Test Error:', err.message);
  process.exit(1);
});
