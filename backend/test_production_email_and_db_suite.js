/**
 * WONDERFUL JODI — PRODUCTION EMAIL, ENVIRONMENT PRECEDENCE AND DATABASE VERIFICATION SUITE
 * Validates:
 * 1. Safe Email Configuration, Sender Fallback & Diagnostics (EXPLICIT, INHERITED, DEFAULT)
 * 2. Environment Loading Precedence & Isolation (process.env > backend/.env > root .env)
 * 3. verifyEmailTransporter & sendMail graceful degradation when unconfigured
 * 4. Password Reset Cryptographic Contract & Real Implementation Evaluation (30m window, reuse rejection)
 * 5. SubCaste Prisma Model Contract & Migration SQL syntax/columns
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const dotenv = require('dotenv');

let emailModule;
try {
  emailModule = require('./dist/services/emailService');
} catch (e) {
  try {
    require('ts-node/register');
    emailModule = require('./src/services/emailService');
  } catch (err) {
    throw e;
  }
}

const {
  getEmailConfig,
  getEmailConfigDiagnostics,
  verifyEmailTransporter,
  sendMail,
  formatSenderAddress,
  formatSenderStatus,
} = emailModule;

let authModule;
try {
  authModule = require('./dist/controllers/authController');
} catch (e) {
  try {
    require('ts-node/register');
    authModule = require('./src/controllers/authController');
  } catch (err) {
    throw e;
  }
}

const {
  calculatePasswordResetExpiry,
  evaluatePasswordResetTokenDoc,
  PASSWORD_RESET_EXPIRY_MINUTES,
  PASSWORD_RESET_EXPIRY_MS,
} = authModule;

let envModule;
try {
  envModule = require('./dist/config/env');
} catch (e) {
  try {
    require('ts-node/register');
    envModule = require('./src/config/env');
  } catch (err) {
    throw e;
  }
}

const { prisma } = require('./dist/db/client');

const {
  generateRandomToken,
  hashToken,
} = require('./dist/utils/securityUtils');

async function runTests() {
  console.log('========================================================================');
  console.log('  WONDERFUL JODI: EMAIL, ENV & DATABASE VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // Preserve original env
  const originalEnv = { ...process.env };

  try {
    // ----------------------------------------------------------------------
    // Group 1: Email Configuration & Safe Startup Diagnostics
    // ----------------------------------------------------------------------
    console.log('Group 1: Safe Email Configuration & Diagnostics:');

    test('1.1 Diagnostics correctly identify missing credentials when environment is empty', () => {
      delete process.env.EMAIL_HOST;
      delete process.env.SMTP_HOST;
      delete process.env.MAIL_HOST;
      delete process.env.EMAIL_USER;
      delete process.env.SMTP_USER;
      delete process.env.MAIL_USERNAME;
      delete process.env.EMAIL_PASS;
      delete process.env.SMTP_PASS;
      delete process.env.MAIL_PASSWORD;

      const diag = getEmailConfigDiagnostics();
      assert.strictEqual(diag.isConfigured, false, 'isConfigured must be false');
      assert.strictEqual(diag.hostPresent, false, 'hostPresent must be false');
      assert.strictEqual(diag.userPresent, false, 'userPresent must be false');
      assert.strictEqual(diag.passPresent, false, 'passPresent must be false');
      assert(diag.missingVariables.includes('EMAIL_HOST'), 'missingVariables includes EMAIL_HOST');
      assert(diag.missingVariables.includes('EMAIL_USER'), 'missingVariables includes EMAIL_USER');
      assert(diag.missingVariables.includes('EMAIL_PASS'), 'missingVariables includes EMAIL_PASS');
      // Ensure no passwords exist in diagnostics output
      assert.strictEqual(diag.pass, undefined, 'Password must not be in diagnostics object');
    });

    test('1.2 Diagnostics correctly report presence when configured without leaking secrets', () => {
      process.env.EMAIL_HOST = 'smtp.hostinger.com';
      process.env.EMAIL_PORT = '465';
      process.env.EMAIL_USER = 'support@wonderfuljodi.com';
      process.env.EMAIL_PASS = 'super_secret_password_123';
      process.env.EMAIL_FROM = 'Wonderful Jodi <support@wonderfuljodi.com>';

      const diag = getEmailConfigDiagnostics();
      assert.strictEqual(diag.isConfigured, true, 'isConfigured must be true');
      assert.strictEqual(diag.hostPresent, true, 'hostPresent must be true');
      assert.strictEqual(diag.userPresent, true, 'userPresent must be true');
      assert.strictEqual(diag.passPresent, true, 'passPresent must be true');
      assert.strictEqual(diag.port, 465, 'port must be 465');
      assert.strictEqual(diag.secure, true, 'port 465 defaults to secure true');
      assert.strictEqual(diag.missingVariables.length, 0, 'No missing variables');

      const jsonStr = JSON.stringify(diag);
      assert(!jsonStr.includes('super_secret_password_123'), 'Secrets must never appear in diagnostic JSON');
    });

    test('1.3 Explicit EMAIL_SECURE flag overrides port default', () => {
      process.env.EMAIL_HOST = 'smtp.titan.email';
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_SECURE = 'false';

      const diag = getEmailConfigDiagnostics();
      assert.strictEqual(diag.port, 587);
      assert.strictEqual(diag.secure, false, 'EMAIL_SECURE=false must result in secure: false');

      process.env.EMAIL_SECURE = 'true';
      const diag2 = getEmailConfigDiagnostics();
      assert.strictEqual(diag2.secure, true, 'EMAIL_SECURE=true must result in secure: true');
    });

    test('1.4 EMAIL_SECURE handles case-insensitivity and alternate representations', () => {
      process.env.EMAIL_PORT = '587';
      process.env.EMAIL_SECURE = 'TRUE';
      assert.strictEqual(getEmailConfig().secure, true, 'EMAIL_SECURE=TRUE must resolve to true');

      process.env.EMAIL_SECURE = '1';
      assert.strictEqual(getEmailConfig().secure, true, 'EMAIL_SECURE=1 must resolve to true');

      process.env.EMAIL_SECURE = 'yes';
      assert.strictEqual(getEmailConfig().secure, true, 'EMAIL_SECURE=yes must resolve to true');

      process.env.EMAIL_PORT = '465';
      process.env.EMAIL_SECURE = 'FALSE';
      assert.strictEqual(getEmailConfig().secure, false, 'EMAIL_SECURE=FALSE must override port 465 to false');

      process.env.EMAIL_SECURE = '0';
      assert.strictEqual(getEmailConfig().secure, false, 'EMAIL_SECURE=0 must override port 465 to false');
    });

    test('1.5 formatSenderAddress handles plain email, pre-formatted names, and edge cases without syntax errors', () => {
      // 1. Plain email address: should wrap with default display name
      const plain = formatSenderAddress('support@wonderfuljodi.com');
      assert.strictEqual(plain, '"Wonderful Jodi Matrimony" <support@wonderfuljodi.com>');

      // 2. Pre-formatted with double quotes
      const preQuoted = formatSenderAddress('"Wonderful Jodi" <support@wonderfuljodi.com>');
      assert.strictEqual(preQuoted, '"Wonderful Jodi" <support@wonderfuljodi.com>');

      // 3. Pre-formatted without quotes around display name: should normalize with quotes
      const unquotedName = formatSenderAddress('Wonderful Jodi <support@wonderfuljodi.com>');
      assert.strictEqual(unquotedName, '"Wonderful Jodi" <support@wonderfuljodi.com>');

      // 4. Plain email with surrounding quotes
      const quotedPlain = formatSenderAddress('"support@wonderfuljodi.com"');
      assert.strictEqual(quotedPlain, '"Wonderful Jodi Matrimony" <support@wonderfuljodi.com>');

      // 5. Angle-bracket only without display name
      const angleOnly = formatSenderAddress('<support@wonderfuljodi.com>');
      assert.strictEqual(angleOnly, '"Wonderful Jodi Matrimony" <support@wonderfuljodi.com>');

      // 6. Custom default display name
      const customName = formatSenderAddress('support@wonderfuljodi.com', 'Wonderful Jodi Support');
      assert.strictEqual(customName, '"Wonderful Jodi Support" <support@wonderfuljodi.com>');

      // 7. Empty or missing input fallback
      const empty = formatSenderAddress('');
      assert.strictEqual(empty, '"Wonderful Jodi Matrimony" <no-reply@wonderfuljodi.com>');
    });

    test('1.6 Sender source resolution: EXPLICIT_CONFIG when EMAIL_FROM is configured', () => {
      delete process.env.SMTP_FROM;
      delete process.env.MAIL_FROM;
      process.env.EMAIL_USER = 'smtpuser@domain.com';
      process.env.EMAIL_FROM = '"Custom Admin" <admin@wonderfuljodi.com>';

      const config = getEmailConfig();
      const diag = getEmailConfigDiagnostics();

      assert.strictEqual(config.senderSource, 'EXPLICIT_CONFIG');
      assert.strictEqual(diag.senderSource, 'EXPLICIT_CONFIG');
      assert.strictEqual(diag.fromPresent, true, 'fromPresent must be true for explicit config');
      assert.strictEqual(diag.senderStatus, '[CONFIGURED]');
      assert.strictEqual(formatSenderStatus('EXPLICIT_CONFIG'), '[CONFIGURED]');
      assert.strictEqual(diag.resolvedFrom, '"Custom Admin" <admin@wonderfuljodi.com>');
    });

    test('1.7 Sender source resolution: INHERITED_FROM_USER when EMAIL_FROM is empty but EMAIL_USER is present', () => {
      delete process.env.EMAIL_FROM;
      delete process.env.SMTP_FROM;
      delete process.env.MAIL_FROM;
      process.env.EMAIL_USER = 'billing@wonderfuljodi.com';

      const config = getEmailConfig();
      const diag = getEmailConfigDiagnostics();

      assert.strictEqual(config.senderSource, 'INHERITED_FROM_USER');
      assert.strictEqual(diag.senderSource, 'INHERITED_FROM_USER');
      assert.strictEqual(diag.fromPresent, false, 'fromPresent must be false when inherited from user');
      assert.strictEqual(diag.senderStatus, '[INHERITED FROM EMAIL_USER]');
      assert.strictEqual(formatSenderStatus('INHERITED_FROM_USER'), '[INHERITED FROM EMAIL_USER]');
      assert.strictEqual(config.from, 'billing@wonderfuljodi.com');
      assert.strictEqual(diag.resolvedFrom, '"Wonderful Jodi Matrimony" <billing@wonderfuljodi.com>');
    });

    test('1.8 Sender source resolution: DEFAULT_FALLBACK when both EMAIL_FROM and EMAIL_USER are empty', () => {
      delete process.env.EMAIL_FROM;
      delete process.env.SMTP_FROM;
      delete process.env.MAIL_FROM;
      delete process.env.EMAIL_USER;
      delete process.env.SMTP_USER;
      delete process.env.MAIL_USERNAME;

      const config = getEmailConfig();
      const diag = getEmailConfigDiagnostics();

      assert.strictEqual(config.senderSource, 'DEFAULT_FALLBACK');
      assert.strictEqual(diag.senderSource, 'DEFAULT_FALLBACK');
      assert.strictEqual(diag.fromPresent, false, 'fromPresent must be false for fallback');
      assert.strictEqual(diag.senderStatus, '[DEFAULT: no-reply@wonderfuljodi.com]');
      assert.strictEqual(formatSenderStatus('DEFAULT_FALLBACK'), '[DEFAULT: no-reply@wonderfuljodi.com]');
      assert.strictEqual(config.from, 'no-reply@wonderfuljodi.com');
      assert.strictEqual(diag.resolvedFrom, '"Wonderful Jodi Matrimony" <no-reply@wonderfuljodi.com>');
    });

    // ----------------------------------------------------------------------
    // Group 2: Environment Loading Precedence & Isolation
    // ----------------------------------------------------------------------
    console.log('\nGroup 2: Environment Loading Precedence & Isolation:');

    test('2.1 backend/.env takes precedence over root .env with dotenv override: false', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wj-env-prec-'));
      const backendDir = path.join(tmpDir, 'backend');
      fs.mkdirSync(backendDir, { recursive: true });

      const backendEnvPath = path.join(backendDir, '.env');
      const rootEnvPath = path.join(tmpDir, '.env');

      fs.writeFileSync(backendEnvPath, 'SHARED_KEY=backend_value\nBACKEND_EXCLUSIVE=only_in_backend\n');
      fs.writeFileSync(rootEnvPath, 'SHARED_KEY=root_value\nROOT_EXCLUSIVE=only_in_root\n');

      const testKeys = ['SHARED_KEY', 'BACKEND_EXCLUSIVE', 'ROOT_EXCLUSIVE'];
      for (const k of testKeys) delete process.env[k];

      try {
        // Load in canonical order: backend/.env then root .env, with override: false
        dotenv.config({ path: backendEnvPath, override: false });
        dotenv.config({ path: rootEnvPath, override: false });

        assert.strictEqual(process.env.SHARED_KEY, 'backend_value', 'backend/.env value must take precedence over root .env');
        assert.strictEqual(process.env.BACKEND_EXCLUSIVE, 'only_in_backend');
        assert.strictEqual(process.env.ROOT_EXCLUSIVE, 'only_in_root', 'root .env should supply fallback keys');
      } finally {
        for (const k of testKeys) delete process.env[k];
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('2.2 Existing Hostinger process environment variables take precedence over all .env files', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wj-hostinger-prec-'));
      const backendDir = path.join(tmpDir, 'backend');
      fs.mkdirSync(backendDir, { recursive: true });

      const backendEnvPath = path.join(backendDir, '.env');
      const rootEnvPath = path.join(tmpDir, '.env');

      fs.writeFileSync(backendEnvPath, 'HOSTINGER_VAR=from_backend_file\nOTHER_VAR=from_backend\n');
      fs.writeFileSync(rootEnvPath, 'HOSTINGER_VAR=from_root_file\n');

      // Pre-set in process.env (simulating Hostinger Node.js hPanel runtime variables)
      process.env.HOSTINGER_VAR = 'hostinger_runtime_exact_value';

      try {
        dotenv.config({ path: backendEnvPath, override: false });
        dotenv.config({ path: rootEnvPath, override: false });

        assert.strictEqual(
          process.env.HOSTINGER_VAR,
          'hostinger_runtime_exact_value',
          'Existing process.env must never be overwritten by .env files'
        );
        assert.strictEqual(process.env.OTHER_VAR, 'from_backend');
      } finally {
        delete process.env.HOSTINGER_VAR;
        delete process.env.OTHER_VAR;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('2.3 Root .env containing blank values cannot overwrite valid backend/.env configuration', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wj-blank-root-'));
      const backendDir = path.join(tmpDir, 'backend');
      fs.mkdirSync(backendDir, { recursive: true });

      const backendEnvPath = path.join(backendDir, '.env');
      const rootEnvPath = path.join(tmpDir, '.env');

      // Root .env has empty values (e.g. copied from template), backend/.env has configured values
      fs.writeFileSync(backendEnvPath, 'DATABASE_NAME=production_db\nEMAIL_FROM=support@domain.com\n');
      fs.writeFileSync(rootEnvPath, 'DATABASE_NAME=\nEMAIL_FROM=\n');

      delete process.env.DATABASE_NAME;
      delete process.env.EMAIL_FROM;

      try {
        dotenv.config({ path: backendEnvPath, override: false });
        dotenv.config({ path: rootEnvPath, override: false });

        assert.strictEqual(
          process.env.DATABASE_NAME,
          'production_db',
          'Blank in root .env must not wipe out valid backend/.env config'
        );
        assert.strictEqual(
          process.env.EMAIL_FROM,
          'support@domain.com',
          'Blank in root .env must not wipe out valid backend/.env config'
        );
      } finally {
        delete process.env.DATABASE_NAME;
        delete process.env.EMAIL_FROM;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('2.4 Environment loader avoids loading same file in conflicting orders', () => {
      const envTsPath = path.resolve(__dirname, 'src', 'config', 'env.ts');
      const envTsContent = fs.readFileSync(envTsPath, 'utf8');

      assert(
        !envTsContent.includes('dotenv.config();'),
        'Must not contain bare dotenv.config() which implicitly loads cwd .env before candidate check'
      );
      assert(
        envTsContent.includes('override: false'),
        'dotenv.config must specify override: false to preserve existing environment variables'
      );
      assert(
        envTsContent.includes('projectRootEnvPath !== backendEnvPath'),
        'Root .env search must verify path is distinct from loaded backend/.env'
      );
    });

    test('2.5 Deterministic environment path resolution for ts-node (src) and compiled JS (dist)', () => {
      assert(typeof envModule.getDeterministicEnvPaths === 'function', 'getDeterministicEnvPaths must be exported');

      // Simulated backend/src/config directory (ts-node runtime location)
      const simulatedSrcConfig = path.resolve(__dirname, 'src', 'config');
      const srcPaths = envModule.getDeterministicEnvPaths(simulatedSrcConfig);

      // Expected canonical paths (__dirname is <project_root>/backend in this test file)
      const expectedBackendEnv = path.resolve(__dirname, '.env');
      const expectedRootEnv = path.resolve(__dirname, '..', '.env');

      assert.strictEqual(
        path.resolve(srcPaths.backendEnvPath),
        expectedBackendEnv,
        'backendEnvPath from src/config must resolve to backend/.env'
      );
      assert.strictEqual(
        path.resolve(srcPaths.projectRootEnvPath),
        expectedRootEnv,
        'projectRootEnvPath from src/config must resolve to project-root .env'
      );

      // Simulated backend/dist/config directory (compiled JS runtime location)
      const simulatedDistConfig = path.resolve(__dirname, 'dist', 'config');
      const distPaths = envModule.getDeterministicEnvPaths(simulatedDistConfig);

      assert.strictEqual(
        path.resolve(distPaths.backendEnvPath),
        expectedBackendEnv,
        'backendEnvPath from dist/config must resolve to backend/.env'
      );
      assert.strictEqual(
        path.resolve(distPaths.projectRootEnvPath),
        expectedRootEnv,
        'projectRootEnvPath from dist/config must resolve to project-root .env'
      );

      // Ensure backend and root paths are distinct
      assert.notStrictEqual(
        srcPaths.backendEnvPath,
        srcPaths.projectRootEnvPath,
        'Backend and root env paths must be distinct'
      );
    });

    test('2.6 Unintended nested .env files (e.g. backend/src/.env, backend/dist/.env) are never loaded', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wj-nested-env-'));
      const backendDir = path.join(tmpDir, 'backend');
      const srcConfigDir = path.join(backendDir, 'src', 'config');
      const distConfigDir = path.join(backendDir, 'dist', 'config');

      fs.mkdirSync(srcConfigDir, { recursive: true });
      fs.mkdirSync(distConfigDir, { recursive: true });

      // Create canonical files
      const canonicalBackendEnv = path.join(backendDir, '.env');
      const canonicalRootEnv = path.join(tmpDir, '.env');
      fs.writeFileSync(canonicalBackendEnv, 'CANONICAL_BACKEND_VAR=valid_backend\n');
      fs.writeFileSync(canonicalRootEnv, 'CANONICAL_ROOT_VAR=valid_root\n');

      // Create unintended nested files that should NOT be loaded
      const nestedSrcEnv = path.join(backendDir, 'src', '.env');
      const nestedDistEnv = path.join(backendDir, 'dist', '.env');
      fs.writeFileSync(nestedSrcEnv, 'UNINTENDED_SRC_VAR=poison_src\nCANONICAL_BACKEND_VAR=poison_src\n');
      fs.writeFileSync(nestedDistEnv, 'UNINTENDED_DIST_VAR=poison_dist\nCANONICAL_BACKEND_VAR=poison_dist\n');

      const testKeys = ['CANONICAL_BACKEND_VAR', 'CANONICAL_ROOT_VAR', 'UNINTENDED_SRC_VAR', 'UNINTENDED_DIST_VAR'];
      for (const k of testKeys) delete process.env[k];

      try {
        // Resolve paths from both simulated locations
        const pathsFromSrc = envModule.getDeterministicEnvPaths(srcConfigDir);
        const pathsFromDist = envModule.getDeterministicEnvPaths(distConfigDir);

        // Neither path should point to the nested .env files
        assert.notStrictEqual(pathsFromSrc.backendEnvPath, nestedSrcEnv);
        assert.notStrictEqual(pathsFromSrc.backendEnvPath, nestedDistEnv);
        assert.notStrictEqual(pathsFromDist.backendEnvPath, nestedSrcEnv);
        assert.notStrictEqual(pathsFromDist.backendEnvPath, nestedDistEnv);

        // Simulate loader logic with the resolved deterministic paths
        if (fs.existsSync(pathsFromSrc.backendEnvPath)) {
          dotenv.config({ path: pathsFromSrc.backendEnvPath, override: false });
        }
        if (
          fs.existsSync(pathsFromSrc.projectRootEnvPath) &&
          pathsFromSrc.projectRootEnvPath !== pathsFromSrc.backendEnvPath
        ) {
          dotenv.config({ path: pathsFromSrc.projectRootEnvPath, override: false });
        }

        assert.strictEqual(
          process.env.CANONICAL_BACKEND_VAR,
          'valid_backend',
          'Canonical backend/.env must be loaded, not nested .env'
        );
        assert.strictEqual(
          process.env.CANONICAL_ROOT_VAR,
          'valid_root',
          'Canonical root .env must be loaded'
        );
        assert.strictEqual(
          process.env.UNINTENDED_SRC_VAR,
          undefined,
          'Nested backend/src/.env must never be loaded'
        );
        assert.strictEqual(
          process.env.UNINTENDED_DIST_VAR,
          undefined,
          'Nested backend/dist/.env must never be loaded'
        );
      } finally {
        for (const k of testKeys) delete process.env[k];
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    // ----------------------------------------------------------------------
    // Group 3: Transporter Verification & Safe Error Handling
    // ----------------------------------------------------------------------
    console.log('\nGroup 3: Transporter Verification & Safe Error Handling:');

    await asyncTest('3.1 verifyEmailTransporter returns safe missing status when env is missing', async () => {
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      const res = await verifyEmailTransporter();
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'ENV_CONFIG_MISSING');
      assert(res.message.includes('missing in environment'), 'Message mentions missing in environment');
      assert(res.diagnostics, 'Diagnostics object must be returned');
      assert.strictEqual(res.diagnostics.isConfigured, false);
    });

    await asyncTest('3.2 sendMail returns non-throwing failure when env is unconfigured', async () => {
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      const res = await sendMail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.delivered, false);
      assert.strictEqual(res.code, 'SMTP_NOT_CONFIGURED');
      assert(res.error.includes('SMTP credentials are not configured in environment'));
    });

    // ----------------------------------------------------------------------
    // Group 4: Password Reset Cryptographic Contract & Real Implementation
    // ----------------------------------------------------------------------
    console.log('\nGroup 4: Password Reset Cryptographic Contract & Real Implementation:');

    test('4.1 generateRandomToken generates high-entropy hex string', () => {
      const token1 = generateRandomToken(32);
      const token2 = generateRandomToken(32);
      assert.strictEqual(token1.length, 64, '32-byte hex token must be 64 characters');
      assert.strictEqual(token2.length, 64, '32-byte hex token must be 64 characters');
      assert.notStrictEqual(token1, token2, 'Two generated tokens must never collide');
      assert(/^[0-9a-f]{64}$/.test(token1), 'Token must be valid hexadecimal');
    });

    test('4.2 hashToken applies SHA-256 consistently for storage lookup', () => {
      const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const hash1 = hashToken(token);
      const expectedHash = crypto.createHash('sha256').update(token).digest('hex');
      assert.strictEqual(hash1, expectedHash, 'hashToken must match standard SHA-256 hex');
      assert.strictEqual(hash1.length, 64, 'SHA-256 hash must be 64 characters');
    });

    test('4.3 Real password-reset expiry contract: 30-minute window calculation (calculatePasswordResetExpiry)', () => {
      assert.strictEqual(PASSWORD_RESET_EXPIRY_MINUTES, 30, 'Expiry minutes must be 30');
      assert.strictEqual(PASSWORD_RESET_EXPIRY_MS, 30 * 60 * 1000, 'Expiry in ms must be 1,800,000');

      const fixedTime = new Date('2026-10-26T12:00:00.000Z');
      const calculatedExpiry = calculatePasswordResetExpiry(fixedTime);
      const diffMs = calculatedExpiry.getTime() - fixedTime.getTime();

      assert.strictEqual(diffMs, 30 * 60 * 1000, 'Calculated expiry must be exactly 30 minutes in the future');
      assert.strictEqual(calculatedExpiry.toISOString(), '2026-10-26T12:30:00.000Z');
    });

    test('4.4 Real password-reset token validation: active token within 30 minutes is valid (including 1ms before expiry)', () => {
      const now = new Date('2026-10-26T12:00:00.000Z');
      const activeDoc = {
        isUsed: false,
        usedAt: null,
        expiresAt: new Date('2026-10-26T12:20:00.000Z'), // 20 mins remaining
      };

      const result = evaluatePasswordResetTokenDoc(activeDoc, now);
      assert.strictEqual(result.isValid, true, 'Active unused token must be valid');
      assert.strictEqual(result.message, 'Token is valid.');

      // Boundary condition: accepted immediately before expiration (1 millisecond before)
      const justBeforeExpiry = {
        isUsed: false,
        usedAt: null,
        expiresAt: new Date(now.getTime() + 1),
      };
      const edgeResult = evaluatePasswordResetTokenDoc(justBeforeExpiry, now);
      assert.strictEqual(edgeResult.isValid, true, 'Token 1ms before expiration must be accepted');
    });

    test('4.5 Real password-reset token validation: expired token is rejected at exact expiration timestamp, 1ms after, and beyond', () => {
      const expiryTimestamp = new Date('2026-10-26T12:30:00.000Z');
      const expiredDoc = {
        isUsed: false,
        usedAt: null,
        expiresAt: expiryTimestamp,
      };

      // 1. Rejected at the EXACT expiration timestamp (now == expiresAt)
      const exactBoundaryResult = evaluatePasswordResetTokenDoc(expiredDoc, expiryTimestamp);
      assert.strictEqual(exactBoundaryResult.isValid, false, 'Token at exact expiration timestamp must be rejected');
      assert.strictEqual(exactBoundaryResult.errorReason, 'EXPIRED', 'errorReason must be EXPIRED at exact expiration');
      assert(exactBoundaryResult.message.includes('expired'), 'Message must indicate token has expired');

      // 2. Rejected 1 millisecond after expiration (now == expiresAt + 1ms)
      const oneMsAfter = new Date(expiryTimestamp.getTime() + 1);
      const oneMsAfterResult = evaluatePasswordResetTokenDoc(expiredDoc, oneMsAfter);
      assert.strictEqual(oneMsAfterResult.isValid, false, 'Token 1ms after expiration must be rejected');
      assert.strictEqual(oneMsAfterResult.errorReason, 'EXPIRED');
      assert(oneMsAfterResult.message.includes('expired'));

      // 3. Rejected when well beyond expiration (e.g., 1 second after)
      const oneSecondAfter = new Date(expiryTimestamp.getTime() + 1000);
      const oneSecondAfterResult = evaluatePasswordResetTokenDoc(expiredDoc, oneSecondAfter);
      assert.strictEqual(oneSecondAfterResult.isValid, false, 'Token 1s after expiration must be rejected');
      assert.strictEqual(oneSecondAfterResult.errorReason, 'EXPIRED');
      assert(oneSecondAfterResult.message.includes('expired'));
    });

    test('4.6 Real password-reset token validation: already-consumed token (isUsed: true or usedAt set) is rejected', () => {
      const now = new Date('2026-10-26T12:10:00.000Z');

      // Token marked isUsed: true
      const consumedDoc1 = {
        isUsed: true,
        usedAt: new Date('2026-10-26T12:05:00.000Z'),
        expiresAt: new Date('2026-10-26T12:30:00.000Z'),
      };
      const result1 = evaluatePasswordResetTokenDoc(consumedDoc1, now);
      assert.strictEqual(result1.isValid, false, 'Used token must be rejected');
      assert.strictEqual(result1.errorReason, 'NOT_FOUND_OR_USED');
      assert(result1.message.includes('already been used'), 'Message must indicate token has already been used');

      // Token where usedAt timestamp is set even if isUsed was not flipped
      const consumedDoc2 = {
        isUsed: false,
        usedAt: new Date('2026-10-26T12:05:00.000Z'),
        expiresAt: new Date('2026-10-26T12:30:00.000Z'),
      };
      const result2 = evaluatePasswordResetTokenDoc(consumedDoc2, now);
      assert.strictEqual(result2.isValid, false, 'Token with usedAt must be rejected');
      assert.strictEqual(result2.errorReason, 'NOT_FOUND_OR_USED');
      assert(result2.message.includes('already been used'));
    });

    test('4.7 Real password-reset token validation: missing or invalid token document is safely rejected', () => {
      const now = new Date();

      const nullResult = evaluatePasswordResetTokenDoc(null, now);
      assert.strictEqual(nullResult.isValid, false);
      assert.strictEqual(nullResult.errorReason, 'NOT_FOUND_OR_USED');

      const undefinedResult = evaluatePasswordResetTokenDoc(undefined, now);
      assert.strictEqual(undefinedResult.isValid, false);
      assert.strictEqual(undefinedResult.errorReason, 'NOT_FOUND_OR_USED');
    });

    // ----------------------------------------------------------------------
    // Group 5: SubCaste Database Migration & Schema Validation
    // ----------------------------------------------------------------------
    console.log('\nGroup 5: SubCaste Database Migration & Schema Validation:');

    test('5.1 Migration SQL file exists and contains valid DDL structure', () => {
      const migrationPath = path.resolve(__dirname, 'prisma', 'migrations', '20261026_create_sub_castes_table.sql');
      assert(fs.existsSync(migrationPath), `Migration file must exist at ${migrationPath}`);

      const sql = fs.readFileSync(migrationPath, 'utf8');
      assert(sql.includes('CREATE TABLE IF NOT EXISTS `sub_castes`'), 'Must contain CREATE TABLE IF NOT EXISTS `sub_castes`');
      assert(sql.includes('`_id` VARCHAR(36) NOT NULL'), 'Must define `_id` VARCHAR(36) PK');
      assert(sql.includes('`caste_id` VARCHAR(36) NOT NULL'), 'Must define `caste_id` VARCHAR(36)');
      assert(sql.includes('`name` VARCHAR(150) NOT NULL'), 'Must define `name` VARCHAR(150)');
      assert(sql.includes('`created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)'), 'Must define `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');
      assert(sql.includes('`updated_at` DATETIME(3) NOT NULL,'), 'Must define `updated_at` DATETIME(3) NOT NULL matching Prisma 6.19.3 generated DDL');
      assert(!sql.includes('`updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE'), 'updated_at must not use DB-side ON UPDATE trigger (maintained by Prisma Client)');
      assert(sql.includes('PRIMARY KEY (`_id`)'), 'Must set PRIMARY KEY (`_id`)');
      assert(sql.includes('UNIQUE KEY `sub_castes_caste_id_name_key` (`caste_id`, `name`)'), 'Must have unique constraint on (caste_id, name)');
      assert(!sql.includes('`sub_castes_caste_id_idx`'), 'Must not have redundant standalone index on caste_id (leading column of unique key)');
      assert(sql.includes('FOREIGN KEY (`caste_id`) REFERENCES `castes` (`id`)'), 'Must reference `castes`(`id`) with FK');
      assert(sql.includes('ON DELETE CASCADE ON UPDATE CASCADE'), 'FK must be CASCADE on DELETE and UPDATE');
      assert(sql.includes('DROP TABLE IF EXISTS `sub_castes`'), 'Must provide safe rollback instructions');
    });

    test('5.2 MIGRATION_REVIEW.md documents sub_castes migration and verification steps', () => {
      const reviewPath = path.resolve(__dirname, 'prisma', 'MIGRATION_REVIEW.md');
      assert(fs.existsSync(reviewPath), `MIGRATION_REVIEW.md must exist at ${reviewPath}`);

      const doc = fs.readFileSync(reviewPath, 'utf8');
      assert(doc.includes('20261026_create_sub_castes_table.sql'), 'Must reference the migration script');
      assert(doc.includes('sub_castes'), 'Must document sub_castes table');
      assert(doc.includes('u625755214_wonderfuljodi'), 'Must document target database');
      assert(doc.includes('MariaDB 11.8.9 LTS'), 'Must document database engine');
      assert(doc.includes('DROP TABLE IF EXISTS `sub_castes`'), 'Must document rollback procedure');
    });

    test('5.3 .env.example files contain comprehensive Hostinger SMTP instructions with non-misleading placeholders', () => {
      const rootEnvExample = path.resolve(__dirname, '..', '.env.example');
      const backendEnvExample = path.resolve(__dirname, '.env.example');

      assert(fs.existsSync(rootEnvExample), 'Root .env.example must exist');
      assert(fs.existsSync(backendEnvExample), 'Backend .env.example must exist');

      const rootContent = fs.readFileSync(rootEnvExample, 'utf8');
      assert(rootContent.includes('EMAIL_HOST='), 'Must document EMAIL_HOST');
      assert(rootContent.includes('EMAIL_PORT=587'), 'Must document EMAIL_PORT');
      assert(rootContent.includes('EMAIL_USER='), 'Must document EMAIL_USER');
      assert(rootContent.includes('EMAIL_PASS='), 'Must document EMAIL_PASS');
      assert(rootContent.includes('EMAIL_FROM='), 'Must document EMAIL_FROM placeholder');
      assert(rootContent.includes('smtp.hostinger.com'), 'Must document smtp.hostinger.com');
      assert(rootContent.includes('smtp.titan.email'), 'Must document smtp.titan.email');

      // Ensure active EMAIL_FROM= is blank placeholder, not misleadingly indicating an active sender
      const rootMatch = rootContent.match(/^EMAIL_FROM=(.*)$/m);
      assert(rootMatch && rootMatch[1].trim() === '', 'Active EMAIL_FROM in root .env.example must be a blank placeholder');

      const backendContent = fs.readFileSync(backendEnvExample, 'utf8');
      const backendMatch = backendContent.match(/^EMAIL_FROM=(.*)$/m);
      assert(backendMatch && backendMatch[1].trim() === '', 'Active EMAIL_FROM in backend .env.example must be a blank placeholder');
    });

    test('5.4 SubCaste model in schema.prisma aligns field-for-field with migration columns and snake_case @map attributes', () => {
      const schemaPath = path.resolve(__dirname, 'prisma', 'schema.prisma');
      assert(fs.existsSync(schemaPath), `schema.prisma must exist at ${schemaPath}`);
      const schema = fs.readFileSync(schemaPath, 'utf8');

      // Verify SubCaste model definition
      assert(schema.includes('model SubCaste {'), 'Must define model SubCaste');
      assert(schema.includes('id              String    @id @map("_id") @db.VarChar(36)'), 'Must map id to _id');
      assert(schema.includes('casteId         String    @map("caste_id") @db.VarChar(36)'), 'Must map casteId to caste_id');
      assert(schema.includes('name            String    @db.VarChar(150)'), 'Must define name VARCHAR(150)');
      assert(schema.includes('aliases         Json?'), 'Must define aliases Json?');
      assert(schema.includes('source          String    @default("Community Master") @db.VarChar(255)'), 'Must define source');
      assert(schema.includes('sourceType      String    @default("COMMUNITY_MASTER") @map("source_type") @db.VarChar(50)'), 'Must map sourceType to source_type');
      assert(schema.includes('sourceReference String?   @map("source_reference") @db.VarChar(255)'), 'Must map sourceReference to source_reference');
      assert(schema.includes('lastVerifiedAt  DateTime? @default(now()) @map("last_verified_at")'), 'Must map lastVerifiedAt to last_verified_at');
      assert(schema.includes('version         Int       @default(1)'), 'Must define version Int');
      assert(schema.includes('isActive        Boolean   @default(true) @map("is_active")'), 'Must map isActive to is_active');
      assert(schema.includes('createdAt       DateTime  @default(now()) @map("created_at")'), 'Must map createdAt to created_at');
      assert(schema.includes('updatedAt       DateTime  @updatedAt @map("updated_at")'), 'Must map updatedAt to updated_at');
      assert(schema.includes('@@unique([casteId, name])'), 'Must define @@unique([casteId, name])');
      assert(schema.includes('@@map("sub_castes")'), 'Must map model to table "sub_castes"');
    });

    test('5.5 PrismaClient exposes subCaste delegate with all standard CRUD operations', () => {
      assert(prisma, 'PrismaClient instance must be initialized');
      assert(prisma.subCaste, 'prisma.subCaste delegate must exist');
      assert.strictEqual(typeof prisma.subCaste.findMany, 'function', 'prisma.subCaste.findMany must be a function');
      assert.strictEqual(typeof prisma.subCaste.findUnique, 'function', 'prisma.subCaste.findUnique must be a function');
      assert.strictEqual(typeof prisma.subCaste.findFirst, 'function', 'prisma.subCaste.findFirst must be a function');
      assert.strictEqual(typeof prisma.subCaste.create, 'function', 'prisma.subCaste.create must be a function');
      assert.strictEqual(typeof prisma.subCaste.createMany, 'function', 'prisma.subCaste.createMany must be a function');
      assert.strictEqual(typeof prisma.subCaste.count, 'function', 'prisma.subCaste.count must be a function');
      assert.strictEqual(typeof prisma.subCaste.update, 'function', 'prisma.subCaste.update must be a function');
      assert.strictEqual(typeof prisma.subCaste.updateMany, 'function', 'prisma.subCaste.updateMany must be a function');
      assert.strictEqual(typeof prisma.subCaste.delete, 'function', 'prisma.subCaste.delete must be a function');
      assert.strictEqual(typeof prisma.subCaste.deleteMany, 'function', 'prisma.subCaste.deleteMany must be a function');
    });

  } finally {
    // Restore environment
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  }

  console.log('\n========================================================================');
  console.log(`RESULTS: ${passed} passed, 0 failed out of ${total} tests`);
  console.log('========================================================================\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
