/**
 * Wonderful Jodi Security Hotfix 3 & 3A: JWT Secret Hardening & Strict Admin Separation Regression Suite
 *
 * Covers:
 * 1. Production startup fails when required JWT secrets (JWT_SECRET or JWT_ADMIN_SECRET) are absent
 * 2. Staging startup fails when required JWT secrets are absent (enforces both secrets)
 * 3. Placeholder and insufficiently strong administrator & member secrets are rejected
 * 4. Valid access tokens verify with the intended configuration
 * 5. Invalid signatures and expired tokens are rejected
 * 6. Refresh tokens cannot be substituted for access tokens
 * 7. Strict administrator separation:
 *    - An access token with role: 'admin' cannot pass administrator-token verification
 *    - A valid administrator token works with the dedicated administrator secret
 *    - A member access token fails administrator verification
 *    - Administrator tokens cannot be used as member access tokens
 *    - No fallback to JWT_SECRET for administrator tokens in production or staging
 * 8. Existing login, registration, refresh and admin authentication behavior remains compatible
 * 9. Development/test configuration works only under the intended test safeguards
 */

const assert = require('assert');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load compiled modules
const {
  validateJwtEnvironment,
  validateSecretStrength,
  isProductionOrStaging,
  getJwtSecret,
  signJwtToken,
  verifyAccessToken,
  verifyAdminToken,
  MIN_SECRET_LENGTH,
} = require('./dist/config/jwtConfig');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// Preserve original environment
const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

const validMemberSecret = 'kX9vQ2mP8rL5zY1wN4tA7bC0dE3fG6hJ8kM1nP4qR7sT0uV3wX6yZ9aB2cD5eF8g';
const validAdminSecret = 'mN7bV4cX1zL0kP3jH6gF9dD2sA5qW8eR1tY4uI7oO0pA3sD6fG9hJ2kL5zX8cV1b';

console.log('\n======================================================================');
console.log('  🔒 Wonderful Jodi: JWT Hardening & Strict Admin Separation Suite');
console.log('======================================================================\n');

try {
  // -------------------------------------------------------------------------
  // 1. Production startup fails when required JWT secrets are absent
  // -------------------------------------------------------------------------
  console.log('--- 1. Production Startup Fail-Closed Safeguards ---');

  runTest('Production startup fails if JWT_SECRET is missing', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    assert.throws(
      () => validateJwtEnvironment(),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_SECRET" is missing or empty'));
        assert.ok(!err.message.includes('undefined'));
        return true;
      }
    );
  });

  runTest('Production startup fails if JWT_ADMIN_SECRET is missing', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    delete process.env.JWT_ADMIN_SECRET;

    assert.throws(
      () => validateJwtEnvironment(),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_ADMIN_SECRET" is missing or empty'));
        return true;
      }
    );
  });

  runTest('Production startup fails if both required secrets are absent', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ADMIN_SECRET;

    assert.throws(
      () => validateJwtEnvironment(),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_SECRET" is missing or empty'));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 2. Staging startup fails when required JWT secrets are absent
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Staging Startup Fail-Closed Safeguards ---');

  runTest('Staging enforces both required secrets: fails if JWT_SECRET is missing', () => {
    restoreEnv();
    process.env.NODE_ENV = 'staging';
    delete process.env.JWT_SECRET;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    assert.throws(
      () => validateJwtEnvironment(),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_SECRET" is missing or empty'));
        return true;
      }
    );
  });

  runTest('Staging enforces both required secrets: fails if JWT_ADMIN_SECRET is missing', () => {
    restoreEnv();
    process.env.NODE_ENV = 'staging';
    process.env.JWT_SECRET = validMemberSecret;
    delete process.env.JWT_ADMIN_SECRET;

    assert.throws(
      () => validateJwtEnvironment(),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_ADMIN_SECRET" is missing or empty'));
        return true;
      }
    );
  });

  runTest('Staging mode flag (STAGING_MODE=true) enforces both required secrets', () => {
    restoreEnv();
    process.env.NODE_ENV = 'development';
    process.env.STAGING_MODE = 'true';
    process.env.JWT_SECRET = validMemberSecret;
    delete process.env.JWT_ADMIN_SECRET;

    assert.throws(
      () => validateJwtEnvironment(),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_ADMIN_SECRET" is missing or empty'));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 3. Placeholder and insufficiently strong secrets are rejected
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Placeholder & Weak Secret Rejection ---');

  const weakSecrets = [
    { label: 'Short secret (12 chars)', val: 'short_key_12' },
    { label: 'Short secret (31 chars)', val: '1234567890123456789012345678901' },
    { label: 'Known dev fallback secret', val: 'supersecret_wonderfuljodi_dev_key_2026' },
    { label: 'Production example placeholder', val: 'supersecret_wonderfuljodi_production_key_min_32_characters_2026' },
    { label: 'Refresh example placeholder', val: 'supersecret_wonderfuljodi_refresh_key_min_32_characters_2026' },
    { label: 'Generic placeholder substring', val: 'this_is_a_placeholder_key_that_is_long_enough_32c' },
    { label: 'Generic change_me substring', val: 'change_me_before_deploying_to_production_now_32c' },
    { label: 'Generic replace_me substring', val: 'please_replace_me_with_a_secure_token_key_32c' },
    { label: 'Generic your_actual substring', val: 'use_your_actual_jwt_secret_in_this_setting_32c' },
    { label: 'Low entropy repetitive string', val: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
  ];

  for (const { label, val } of weakSecrets) {
    runTest(`Rejects ${label} for JWT_SECRET`, () => {
      restoreEnv();
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = val;
      process.env.JWT_ADMIN_SECRET = validAdminSecret;

      assert.throws(
        () => validateJwtEnvironment(),
        (err) => {
          assert.ok(err.message.includes('[FATAL] JWT Configuration Error'));
          assert.ok(!err.message.includes(val));
          return true;
        }
      );
    });

    runTest(`Rejects ${label} for JWT_ADMIN_SECRET`, () => {
      restoreEnv();
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = validMemberSecret;
      process.env.JWT_ADMIN_SECRET = val;

      assert.throws(
        () => validateJwtEnvironment(),
        (err) => {
          assert.ok(err.message.includes('[FATAL] JWT Configuration Error'));
          assert.ok(!err.message.includes(val));
          return true;
        }
      );
    });
  }

  // -------------------------------------------------------------------------
  // 4. Valid access tokens verify with intended configuration
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Valid Access Token Cryptographic Verification ---');

  runTest('Sign and verify access token with valid 32+ character secret', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const token = signJwtToken(
      { userId: 'user_med_101', role: 'user' },
      { expiresIn: '15m', purpose: 'access' }
    );

    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = verifyAccessToken(token);
    assert.strictEqual(decoded.userId, 'user_med_101');
    assert.strictEqual(decoded.role, 'user');
    assert.strictEqual(decoded.tokenType, 'access');

    // Confirm algorithm is strictly HS256
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8'));
    assert.strictEqual(header.alg, 'HS256');
  });

  // -------------------------------------------------------------------------
  // 5. Invalid signatures and expired tokens are rejected
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Cryptographic Signature & Expiry Enforcement ---');

  runTest('Rejects token tampered payload or altered signature', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const token = signJwtToken({ userId: 'user_normal', role: 'user' });
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'user_normal', role: 'admin' })).toString('base64');
    const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(
      () => verifyAccessToken(forgedToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError');
        return true;
      }
    );
  });

  runTest('Rejects token signed with wrong secret', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const otherSecret = 'An0th3r_D1ff3r3nt_S3cur3_K3y_32_Ch4rs_L0ng_H3r3';
    const foreignToken = jwt.sign({ userId: 'user_attacker', role: 'admin' }, otherSecret, { algorithm: 'HS256' });

    assert.throws(
      () => verifyAccessToken(foreignToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError' && err.message.includes('invalid signature'));
        return true;
      }
    );
  });

  runTest('Rejects tokens forged with alg: "none" (Algorithm Confusion Attack)', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const nonePayload = Buffer.from(JSON.stringify({ userId: 'forged_admin', role: 'admin' })).toString('base64');
    const noneToken = `${noneHeader}.${nonePayload}.`;

    assert.throws(
      () => verifyAccessToken(noneToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError');
        return true;
      }
    );
  });

  runTest('Rejects expired access tokens', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const expiredToken = signJwtToken(
      { userId: 'user_expired', role: 'user' },
      { expiresIn: '-10s', purpose: 'access' }
    );

    assert.throws(
      () => verifyAccessToken(expiredToken),
      (err) => {
        assert.ok(err.name === 'TokenExpiredError');
        assert.ok(err.message.includes('jwt expired'));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 6. Refresh tokens cannot be substituted for access tokens
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Refresh Token Substitution Prevention ---');

  runTest('Rejects opaque random hex refresh tokens when presented as access tokens', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const opaqueRefreshToken = '4a8f9c1e3d2b7a6f5e4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a';

    assert.throws(
      () => verifyAccessToken(opaqueRefreshToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError' && err.message.includes('jwt malformed'));
        return true;
      }
    );
  });

  runTest('Rejects JWT typed as tokenType: refresh when presented to verifyAccessToken', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const refreshJwt = signJwtToken(
      { userId: 'user_123', role: 'user', tokenType: 'refresh' },
      { expiresIn: '7d' }
    );

    assert.throws(
      () => verifyAccessToken(refreshJwt),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError');
        assert.ok(err.message.includes('refresh token cannot be used as an access token'));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 7. Strict Member vs Administrator Token Separation
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Strict Administrator Token Separation & Boundary Enforcement ---');

  runTest('An access token with role: "admin" CANNOT pass administrator-token verification', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    // Forged or misconfigured member access token signed with JWT_SECRET having role: admin
    const accessAdminToken = signJwtToken(
      { userId: 'member_attacker', role: 'admin' },
      { purpose: 'access' } // signed with JWT_SECRET!
    );

    // Cryptographic signature check against JWT_ADMIN_SECRET must fail
    assert.throws(
      () => verifyAdminToken(accessAdminToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError');
        return true;
      }
    );
  });

  runTest('A valid administrator token works with the dedicated administrator secret', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const adminToken = signJwtToken(
      {
        userId: 'admin_sys_root',
        role: 'admin',
        email: 'security@wonderfuljodi.com',
        sessionId: 'sess_admin_root_1',
        sub: 'admin_sys_root',
      },
      { purpose: 'admin', expiresIn: '15m' }
    );

    const adminPayload = verifyAdminToken(adminToken);
    assert.strictEqual(adminPayload.userId, 'admin_sys_root');
    assert.strictEqual(adminPayload.role, 'admin');
    assert.strictEqual(adminPayload.email, 'security@wonderfuljodi.com');
    assert.strictEqual(adminPayload.tokenType, 'admin_access');
  });

  runTest('A member access token fails administrator verification', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const memberToken = signJwtToken(
      { userId: 'member_doc_501', role: 'user' },
      { purpose: 'access' }
    );

    assert.throws(
      () => verifyAdminToken(memberToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError');
        return true;
      }
    );
  });

  runTest('An administrator token cannot be accepted as a member access token', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const adminToken = signJwtToken(
      { userId: 'admin_sys_root', role: 'admin', email: 'admin@wj.com' },
      { purpose: 'admin' }
    );

    // verifyAccessToken must reject admin token on signature & tokenType boundary
    assert.throws(
      () => verifyAccessToken(adminToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError');
        return true;
      }
    );
  });

  runTest('Fallback to JWT_SECRET for administrator tokens is REMOVED in production and staging', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    delete process.env.JWT_ADMIN_SECRET;

    // In production, getJwtSecret('admin') must NEVER fall back to JWT_SECRET
    assert.throws(
      () => getJwtSecret('admin'),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_ADMIN_SECRET" is missing'));
        return true;
      }
    );

    process.env.NODE_ENV = 'staging';
    assert.throws(
      () => getJwtSecret('admin'),
      (err) => {
        assert.ok(err.message.includes('Required secret "JWT_ADMIN_SECRET" is missing'));
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // 8. Backward Compatibility & Claim Preservation
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Backward Compatibility & Claim Preservation ---');

  runTest('User login token contains standard userId and role claims', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const userToken = signJwtToken({ userId: 'u_777', role: 'user' }, { expiresIn: '15m', purpose: 'access' });
    const payload = verifyAccessToken(userToken);

    assert.strictEqual(payload.userId, 'u_777');
    assert.strictEqual(payload.role, 'user');
    assert.ok(payload.exp > payload.iat);
    assert.ok(payload.exp - payload.iat <= 15 * 60 + 5);
  });

  runTest('Registration immediate-login token contains userId and role with 7d expiration', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const regToken = signJwtToken(
      { userId: 'u_new_reg', role: 'user' },
      { expiresIn: '7d', purpose: 'access' }
    );
    const payload = verifyAccessToken(regToken);

    assert.strictEqual(payload.userId, 'u_new_reg');
    assert.strictEqual(payload.role, 'user');
    assert.ok(payload.exp - payload.iat >= 7 * 24 * 60 * 60 - 10);
  });

  runTest('Admin login token preserves email, sessionId, and sub claims', () => {
    restoreEnv();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = validMemberSecret;
    process.env.JWT_ADMIN_SECRET = validAdminSecret;

    const adminToken = signJwtToken(
      {
        userId: 'admin_sys',
        role: 'admin',
        email: 'ops@wonderfuljodi.com',
        sessionId: 'session_xyz',
        sub: 'admin_sys',
      },
      { expiresIn: '15m', purpose: 'admin' }
    );
    const payload = verifyAdminToken(adminToken);

    assert.strictEqual(payload.userId, 'admin_sys');
    assert.strictEqual(payload.role, 'admin');
    assert.strictEqual(payload.email, 'ops@wonderfuljodi.com');
    assert.strictEqual(payload.sessionId, 'session_xyz');
    assert.strictEqual(payload.sub, 'admin_sys');
  });

  // -------------------------------------------------------------------------
  // 9. Development/test configuration works only under intended test safeguards
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Test / Dev Safeguard Isolation ---');

  runTest('Local test mode allows isolated unit testing when NODE_ENV=test', () => {
    restoreEnv();
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ADMIN_SECRET;

    // Should not throw in NODE_ENV === 'test'
    assert.doesNotThrow(() => validateJwtEnvironment());

    // Should issue and verify with isolated test secret
    const testToken = signJwtToken({ userId: 'test_user', role: 'user' }, { purpose: 'access' });
    const verified = verifyAccessToken(testToken);
    assert.strictEqual(verified.userId, 'test_user');

    // Admin token in test mode uses dedicated ISOLATED_TEST_ADMIN_SECRET
    const testAdminToken = signJwtToken(
      { userId: 'test_admin', role: 'admin', email: 'testadmin@wj.com' },
      { purpose: 'admin' }
    );
    const verifiedAdmin = verifyAdminToken(testAdminToken);
    assert.strictEqual(verifiedAdmin.userId, 'test_admin');

    // Test access token CANNOT verify as test admin token even in test mode
    assert.throws(
      () => verifyAdminToken(testToken),
      (err) => {
        assert.ok(err.name === 'JsonWebTokenError');
        return true;
      }
    );
  });

  console.log('\n======================================================================');
  console.log(`  🎉 ALL ${passedTests} / ${totalTests} REGRESSION TESTS PASSED SUCCESSFULLY!`);
  console.log('======================================================================\n');
} finally {
  restoreEnv();
}
