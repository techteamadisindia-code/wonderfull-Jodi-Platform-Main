/**
 * Unit & Security Test Suite: Staging Database Isolation Guard
 *
 * 100% ISOLATED (In-Memory Logic Test - Zero Database Connections)
 */

const assert = require('assert');
const path = require('path');

const {
  validateStagingDatabaseUrl,
  assertStagingIsolation,
  normalizeHostname,
  verifyServerIdentity,
} = require('./dist/utils/stagingGuard.js');

let total = 0;
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  total++;
  process.stdout.write(`  [GUARD TEST] ${name} ... `);
  try {
    fn();
    passed++;
    console.log('PASSED');
  } catch (err) {
    failed++;
    console.log('FAILED');
    console.error('    Error:', err.message);
  }
}

console.log('════════════════════════════════════════════════════════════════');
console.log('  TESTING STAGING DATABASE ISOLATION GUARD & IDENTITY PROBE');
console.log('════════════════════════════════════════════════════════════════\n');

// 1. Missing or empty DATABASE_URL
runTest('Rejects missing or empty DATABASE_URL', () => {
  const r1 = validateStagingDatabaseUrl('');
  assert.strictEqual(r1.isValid, false);
  assert.ok(r1.error.includes('missing'));

  const r2 = validateStagingDatabaseUrl(undefined);
  assert.strictEqual(r2.isValid, false);
  assert.ok(r2.error.includes('missing'));
});

// 2. Malformed URL
runTest('Rejects malformed DATABASE_URL', () => {
  const r = validateStagingDatabaseUrl('://invalid-leading-colon');
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('malformed'));
});

// 3. Unexpected protocol
runTest('Rejects non-MySQL/MariaDB protocols (postgres, http, mongodb)', () => {
  const rPostgres = validateStagingDatabaseUrl('postgresql://user:pass@127.0.0.1:5432/staging_db');
  assert.strictEqual(rPostgres.isValid, false);
  assert.ok(rPostgres.error.includes('protocol'));

  const rMongo = validateStagingDatabaseUrl('mongodb://user:pass@127.0.0.1:27017/staging_db');
  assert.strictEqual(rMongo.isValid, false);
  assert.ok(rMongo.error.includes('protocol'));
});

// 4. Missing database name
runTest('Rejects URL without target database name', () => {
  const r = validateStagingDatabaseUrl('mysql://staging_user:pass@127.0.0.1:3306/');
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('does not specify a target database'));
});

// 5. Hostname Normalization & Trailing Dots
runTest('normalizeHostname strips trailing dots, handles percent-encoding and IPv6 brackets', () => {
  assert.strictEqual(normalizeHostname('srv1646.hstgr.io.'), 'srv1646.hstgr.io');
  assert.strictEqual(normalizeHostname('SRV1646.HSTGR.IO.'), 'srv1646.hstgr.io');
  assert.strictEqual(normalizeHostname('srv%31%36%34%36.hstgr.io'), 'srv1646.hstgr.io');
  assert.strictEqual(normalizeHostname('staging-db.internal...'), 'staging-db.internal');
  assert.strictEqual(normalizeHostname('[::1]'), '::1');
  assert.strictEqual(normalizeHostname('::1'), '::1');
  assert.strictEqual(normalizeHostname('127.0.0.1.'), '127.0.0.1');
});

runTest('normalizeHostname rejects malformed, ambiguous, or dangerous hostnames', () => {
  assert.strictEqual(normalizeHostname(''), null);
  assert.strictEqual(normalizeHostname('...'), null);
  assert.strictEqual(normalizeHostname('.bad.host'), null);
  assert.strictEqual(normalizeHostname('bad..host'), null);
  assert.strictEqual(normalizeHostname('host with space'), null);
  assert.strictEqual(normalizeHostname('host/path'), null);
  assert.strictEqual(normalizeHostname('user@host'), null);
  assert.strictEqual(normalizeHostname('host:3306'), null);
  assert.strictEqual(normalizeHostname('srv%zz.hstgr.io'), null);
});

// 6. Production Hostname Rejections & Edge Cases
runTest('Strictly rejects production host srv1646.hstgr.io', () => {
  const r = validateStagingDatabaseUrl('mysql://staging_user:pass@srv1646.hstgr.io:3306/wonderfuljodi_staging', {
    allowlist: ['srv1646.hstgr.io'], // Even if developer mistakenly puts prod in allowlist!
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('SECURITY INTERCEPT'));
  assert.ok(r.error.includes('production host'));
});

runTest('Strictly rejects production host with trailing dot (srv1646.hstgr.io.)', () => {
  const r = validateStagingDatabaseUrl('mysql://staging_user:pass@srv1646.hstgr.io.:3306/wonderfuljodi_staging', {
    allowlist: ['srv1646.hstgr.io.'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('SECURITY INTERCEPT'));
  assert.ok(r.error.includes('production host'));
});

runTest('Strictly rejects percent-encoded production host (srv%31%36%34%36.hstgr.io)', () => {
  const r = validateStagingDatabaseUrl('mysql://staging_user:pass@srv%31%36%34%36.hstgr.io:3306/wonderfuljodi_staging', {
    allowlist: ['srv1646.hstgr.io'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('SECURITY INTERCEPT'));
  assert.ok(r.error.includes('production host'));
});

runTest('Strictly rejects Hostinger shared domain (*.hstgr.io)', () => {
  const r = validateStagingDatabaseUrl('mysql://staging_user:pass@srv999.hstgr.io:3306/wonderfuljodi_staging', {
    allowlist: ['srv999.hstgr.io'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('SECURITY INTERCEPT'));
});

runTest('Strictly rejects wonderfuljodi.com domains', () => {
  const r = validateStagingDatabaseUrl('mysql://staging_user:pass@db.wonderfuljodi.com:3306/wonderfuljodi_staging', {
    allowlist: ['db.wonderfuljodi.com'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('SECURITY INTERCEPT'));
});

// 7. Production Database / User Signatures
runTest('Strictly rejects production database name containing u625755214', () => {
  const r = validateStagingDatabaseUrl('mysql://staging_user:pass@staging.internal:3306/u625755214_wonderfuljodi', {
    allowlist: ['staging.internal'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('Production database identifier detected'));
});

runTest('Strictly rejects production user containing u625755214', () => {
  const r = validateStagingDatabaseUrl('mysql://u625755214_admin:pass@staging.internal:3306/wonderfuljodi_staging', {
    allowlist: ['staging.internal'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('Production user account detected'));
});

// 8. Developer Hostname Allowlist Check (Fail-Closed)
runTest('Fails closed when STAGING_DB_HOST_ALLOWLIST is empty', () => {
  const r = validateStagingDatabaseUrl('mysql://wj_staging_user:pass@127.0.0.1:3306/wonderfuljodi_staging', {
    allowlist: [],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('FAIL-CLOSED'));
  assert.ok(r.error.toLowerCase().includes('allowlist is not configured'));
});

runTest('Rejects host not explicitly present in developer allowlist', () => {
  const r = validateStagingDatabaseUrl('mysql://wj_staging_user:pass@unapproved-host.net:3306/wonderfuljodi_staging', {
    allowlist: ['staging-cluster.internal', '10.0.1.50'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('not in the approved staging allowlist'));
});

runTest('Rejects substring domain evasion attempts', () => {
  const r = validateStagingDatabaseUrl('mysql://wj_staging_user:pass@staging-cluster.internal.attacker.com:3306/wonderfuljodi_staging', {
    allowlist: ['staging-cluster.internal'],
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('not in the approved staging allowlist'));
});

// 9. Database Name & User Account Verification
runTest('Rejects unexpected database name (not wonderfuljodi_staging)', () => {
  const r = validateStagingDatabaseUrl('mysql://wj_staging_user:pass@staging-cluster.internal:3306/wrong_test_db', {
    allowlist: ['staging-cluster.internal'],
    expectedDbName: 'wonderfuljodi_staging',
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('does not match expected staging database'));
});

runTest('Rejects unapproved user account (e.g. root or unexpected user)', () => {
  const r = validateStagingDatabaseUrl('mysql://root:secret@staging-cluster.internal:3306/wonderfuljodi_staging', {
    allowlist: ['staging-cluster.internal'],
    expectedDbName: 'wonderfuljodi_staging',
    expectedDbUser: 'wj_staging_user',
  });
  assert.strictEqual(r.isValid, false);
  assert.ok(r.error.includes('does not match approved staging account'));
});

// 10. Zero Secret Exposure
runTest('Sanitized details never expose passwords or secret tokens', () => {
  const raw = 'mysql://wj_staging_user:SuperSecretP@ssw0rd123!@staging-cluster.internal:3306/wonderfuljodi_staging';
  const r = validateStagingDatabaseUrl(raw, {
    allowlist: ['staging-cluster.internal'],
    expectedDbName: 'wonderfuljodi_staging',
    expectedDbUser: 'wj_staging_user',
  });
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.sanitizedDetails.username, 'wj_***');
  assert.strictEqual(JSON.stringify(r).includes('SuperSecretP@ssw0rd123!'), false);
});

// 11. Valid Approved Staging URL (with Trailing Dot or Encoding in Staging Host)
runTest('Passes cleanly when URL satisfies all strict staging criteria', () => {
  const r = validateStagingDatabaseUrl('mysql://wj_staging_user:P@ss123@staging-host.internal:3306/wonderfuljodi_staging?connection_limit=5', {
    allowlist: ['staging-host.internal'],
    expectedDbName: 'wonderfuljodi_staging',
    expectedDbUser: 'wj_staging_user',
  });
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.sanitizedDetails.hostname, 'staging-host.internal');
  assert.strictEqual(r.sanitizedDetails.database, 'wonderfuljodi_staging');
});

runTest('Passes cleanly with normalized trailing dot on staging host', () => {
  const r = validateStagingDatabaseUrl('mysql://wj_staging_user:P@ss123@staging-host.internal.:3306/wonderfuljodi_staging', {
    allowlist: ['staging-host.internal'],
    expectedDbName: 'wonderfuljodi_staging',
    expectedDbUser: 'wj_staging_user',
  });
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.sanitizedDetails.hostname, 'staging-host.internal');
});

// 12. Server Identity Probe Pure Verification Logic
runTest('verifyServerIdentity accepts valid, isolated staging server response', () => {
  const info = {
    server_host: 'staging-mysql-server-01',
    db_name: 'wonderfuljodi_staging',
    db_user: 'wj_staging_user@10.0.1.25',
    db_version: '10.11.8-MariaDB',
  };
  const res = verifyServerIdentity(info, {
    expectedDbName: 'wonderfuljodi_staging',
    expectedDbUser: 'wj_staging_user',
  });
  assert.strictEqual(res.isValid, true);
});

runTest('verifyServerIdentity rejects production user account signature', () => {
  const info = {
    server_host: 'staging-mysql-server-01',
    db_name: 'wonderfuljodi_staging',
    db_user: 'u625755214_admin@10.0.1.25',
    db_version: '10.11.8-MariaDB',
  };
  const res = verifyServerIdentity(info);
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error.includes('matches production account signature'));
});

runTest('verifyServerIdentity rejects unapproved user account (e.g. root)', () => {
  const info = {
    server_host: 'staging-mysql-server-01',
    db_name: 'wonderfuljodi_staging',
    db_user: 'root@localhost',
    db_version: '10.11.8-MariaDB',
  };
  const res = verifyServerIdentity(info, {
    expectedDbUser: 'wj_staging_user',
  });
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error.includes('ACCOUNT MISMATCH'));
});

runTest('verifyServerIdentity rejects production database name signature', () => {
  const info = {
    server_host: 'staging-mysql-server-01',
    db_name: 'u625755214_wonderfuljodi',
    db_user: 'wj_staging_user@localhost',
    db_version: '10.11.8-MariaDB',
  };
  const res = verifyServerIdentity(info);
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error.includes('matches production database signature'));
});

runTest('verifyServerIdentity rejects production server host signatures', () => {
  const info = {
    server_host: 'srv1646.hstgr.io',
    db_name: 'wonderfuljodi_staging',
    db_user: 'wj_staging_user@localhost',
    db_version: '10.11.8-MariaDB',
  };
  const res = verifyServerIdentity(info);
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error.includes('matches production host signatures'));
});

runTest('verifyServerIdentity rejects unexpected database name', () => {
  const info = {
    server_host: 'staging-mysql-server-01',
    db_name: 'wrong_db_name',
    db_user: 'wj_staging_user@localhost',
    db_version: '10.11.8-MariaDB',
  };
  const res = verifyServerIdentity(info, {
    expectedDbName: 'wonderfuljodi_staging',
  });
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error.includes('IDENTITY MISMATCH'));
});

// 13. assertStagingIsolation Behavior
runTest('assertStagingIsolation returns silently when not in staging mode', () => {
  const oldEnv = process.env.NODE_ENV;
  const oldStaging = process.env.STAGING_MODE;
  try {
    process.env.NODE_ENV = 'development';
    delete process.env.STAGING_MODE;
    // Should return without error even if DATABASE_URL points to prod or is missing
    assertStagingIsolation({ url: 'mysql://u625755214:pass@srv1646.hstgr.io/db' });
  } finally {
    process.env.NODE_ENV = oldEnv;
    if (oldStaging) process.env.STAGING_MODE = oldStaging;
  }
});

runTest('assertStagingIsolation throws and intercepts production URL in staging mode', () => {
  const oldEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'staging';
    assert.throws(
      () => {
        assertStagingIsolation({
          url: 'mysql://staging_user:pass@srv1646.hstgr.io/wonderfuljodi_staging',
          exitOnError: false,
        });
      },
      /SECURITY INTERCEPT/
    );
  } finally {
    process.env.NODE_ENV = oldEnv;
  }
});

// 14. Environment Loader Initialization & Isolation Tests
const { initEnvironment, resetEnvironmentForTesting } = require('./dist/config/env.js');

runTest('initEnvironment in staging mode with no .env.staging does NOT load production .env', () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origDbUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'staging';
    resetEnvironmentForTesting();
    initEnvironment();
    // DATABASE_URL must NOT be populated from default .env
    assert.strictEqual(process.env.DATABASE_URL, undefined, 'Must not silently populate DATABASE_URL from .env in staging');
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origDbUrl !== undefined) process.env.DATABASE_URL = origDbUrl;
    resetEnvironmentForTesting();
  }
});

runTest('Dependency Graph: compiled db/client requires config/env before stagingGuard', () => {
  const fs = require('fs');
  const clientJs = fs.readFileSync(path.resolve(__dirname, 'dist/db/client.js'), 'utf8');
  const envIndex = clientJs.indexOf('config/env');
  const guardIndex = clientJs.indexOf('utils/stagingGuard');
  assert.ok(envIndex !== -1, 'dist/db/client.js must require config/env');
  assert.ok(guardIndex !== -1, 'dist/db/client.js must require utils/stagingGuard');
  assert.ok(envIndex < guardIndex, 'config/env must be required BEFORE utils/stagingGuard');
});

runTest('Dependency Graph: compiled server.js requires config/env as first application module', () => {
  const fs = require('fs');
  const serverJs = fs.readFileSync(path.resolve(__dirname, 'dist/server.js'), 'utf8');
  const envIndex = serverJs.indexOf('config/env');
  const appIndex = serverJs.indexOf('./app');
  assert.ok(envIndex !== -1, 'dist/server.js must require config/env');
  assert.ok(envIndex < appIndex, 'config/env must be required BEFORE ./app');
});

runTest('Dependency Graph: compiled app.js requires config/env as first application module', () => {
  const fs = require('fs');
  const appJs = fs.readFileSync(path.resolve(__dirname, 'dist/app.js'), 'utf8');
  const envIndex = appJs.indexOf('config/env');
  const dbIndex = appJs.indexOf('./db/client');
  assert.ok(envIndex !== -1, 'dist/app.js must require config/env');
  assert.ok(envIndex < dbIndex, 'config/env must be required BEFORE ./db/client');
});

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`Guard Test Suite Complete: ${passed}/${total} Passed (${failed} Failed)`);
console.log('════════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
