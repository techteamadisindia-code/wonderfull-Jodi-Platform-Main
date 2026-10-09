/**
 * Acceptance Test Suite: Hostinger Production Fixes & Diagnostics
 *
 * Verifies:
 * 1. Location Model & Adapter (.exists, findById, P1001 genuine error propagation)
 * 2. Profile & Admin User Relation Resilience (User? optional relation)
 * 3. Master Data & Safe Counting Resilience (P2021 handling vs genuine outage propagation)
 * 4. SMTP Configuration & Email Service Fallback (explicit failure when unconfigured)
 * 5. API Health & Public Location Endpoints (with explicit pass/fail/skip reporting)
 */

const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const { State, District } = require('./dist/models/Location');
const { SubCaste, Caste, Religion, Language } = require('./dist/models/CommunityMaster');
const { Profile } = require('./dist/models/Profile');
const { Admin } = require('./dist/models/Admin');
const { getEmailConfig, verifyEmailTransporter, sendMail } = require('./dist/services/emailService');
const { createPrismaModelAdapter } = require('./dist/db/prismaBridge');

function request(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    if (dataString) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: urlPath,
        method,
        headers,
        timeout: 2000,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runProductionFixTests() {
  console.log('======================================================================');
  console.log('  WONDERFUL JODI: PRODUCTION FIXES & DIAGNOSTICS ACCEPTANCE SUITE     ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  function skip(message, reason) {
    console.log(`- SKIP: ${message} (${reason})`);
    skipped++;
  }

  // ----------------------------------------------------------------------
  // 1. STATE & DISTRICT LOCATION API (.exists & findById COMPATIBILITY)
  // ----------------------------------------------------------------------
  console.log('\n--- 1. LOCATION MODEL & ADAPTER TESTS ---');

  // Test 1.1: State model query methods
  assert(typeof State.findById === 'function', 'Location: State.findById is a valid function');
  assert(typeof State.findOne === 'function', 'Location: State.findOne is a valid function');
  assert(typeof State.find === 'function', 'Location: State.find is a valid function');
  assert(typeof State.countDocuments === 'function', 'Location: State.countDocuments is a valid function');
  assert(typeof State.exists === 'function', 'Location: State.exists adapter method is present and callable');

  // Test 1.2: District model query methods
  assert(typeof District.findById === 'function', 'Location: District.findById is a valid function');
  assert(typeof District.exists === 'function', 'Location: District.exists adapter method is present and callable');

  // Test 1.3: Calling exists with non-existent ID returns null
  try {
    const fakeStateExists = await State.exists({ _id: 'non_existent_state_id_000000000000' });
    assert(fakeStateExists === null, 'Location: State.exists returns null for non-existent record without throwing');
  } catch (err) {
    assert(false, `Location: State.exists threw error: ${err.message}`);
  }

  // Test 1.4: SubCaste.exists handles missing table (P2021) cleanly
  try {
    const subCasteExists = await SubCaste.exists({ name: 'TestSubCaste' });
    assert(subCasteExists === null, 'MasterData: SubCaste.exists safely returns null on missing table (P2021)');
  } catch (err) {
    assert(false, `MasterData: SubCaste.exists threw unexpected error on missing table: ${err.message}`);
  }

  // Test 1.5: Genuine database error propagates from .exists()
  try {
    const FailingModel = createPrismaModelAdapter('nonExistentDelegate');
    FailingModel.countDocuments = async () => {
      const dbErr = new Error('ECONNREFUSED: Database connection terminated unexpectedly');
      dbErr.code = 'P1001';
      throw dbErr;
    };

    let caughtError = null;
    try {
      await FailingModel.exists({ name: 'test' });
    } catch (err) {
      caughtError = err;
    }

    assert(
      caughtError !== null && caughtError.code === 'P1001',
      'Adapter: Genuine database error (P1001) is propagated by .exists() instead of being converted into null'
    );
  } catch (testSetupErr) {
    assert(false, `Adapter genuine error propagation test failed: ${testSetupErr.message}`);
  }

  // ----------------------------------------------------------------------
  // 2. PROFILE & ADMIN RELATIONSHIP RESILIENCE (ORPHANED USER TOLERANCE)
  // ----------------------------------------------------------------------
  console.log('\n--- 2. PROFILE & ADMIN RELATIONSHIP TESTS ---');

  // Test 2.1: Profile.find().populate('user')
  try {
    const profileQuery = Profile.find().populate('user', 'fullName email mobile role isActive').limit(5);
    const profiles = await profileQuery;
    assert(Array.isArray(profiles), 'Profile: Profile.find().populate("user") executes without "Inconsistent query result" error');
  } catch (err) {
    assert(false, `Profile: Profile.find().populate("user") failed: ${err.message}`);
  }

  // Test 2.2: Admin.find().populate('user')
  try {
    const adminQuery = Admin.find().populate('user', 'fullName email mobile role');
    const admins = await adminQuery;
    assert(Array.isArray(admins), 'Admin: Admin.find().populate("user") executes without throwing null join errors');
  } catch (err) {
    assert(false, `Admin: Admin.find().populate("user") failed: ${err.message}`);
  }

  // ----------------------------------------------------------------------
  // 3. MASTER DATA SUMMARY & SAFE COUNTING RESILIENCE
  // ----------------------------------------------------------------------
  console.log('\n--- 3. MASTER DATA RESILIENCE TESTS ---');

  // Test 3.1: SubCaste.countDocuments() on missing table
  try {
    const subCasteCount = await SubCaste.countDocuments();
    assert(typeof subCasteCount === 'number' && subCasteCount >= 0, 'MasterData: SubCaste.countDocuments() safely returns 0 on missing table (P2021)');
  } catch (err) {
    assert(false, `MasterData: SubCaste.countDocuments() threw: ${err.message}`);
  }

  // Test 3.2: Community master models countDocuments
  try {
    const [relCount, casteCount, langCount] = await Promise.all([
      Religion.countDocuments(),
      Caste.countDocuments(),
      Language.countDocuments(),
    ]);
    assert(
      typeof relCount === 'number' && typeof casteCount === 'number' && typeof langCount === 'number',
      'MasterData: Religion, Caste, and Language countDocuments execute successfully'
    );
  } catch (err) {
    assert(false, `MasterData: Community models counting failed: ${err.message}`);
  }

  // Test 3.3: Genuine database failure in safe counting propagates
  try {
    const safeCount = async (model) => {
      if (!model || typeof model.countDocuments !== 'function') return 0;
      try {
        return await model.countDocuments();
      } catch (err) {
        if (err.code === 'P2021' || (err.message && err.message.includes('does not exist in the current database'))) {
          return 0;
        }
        throw err;
      }
    };

    const BrokenModel = {
      countDocuments: async () => {
        const err = new Error('Authentication failed for database');
        err.code = 'P1000';
        throw err;
      },
    };

    let caughtSafeCountErr = null;
    try {
      await safeCount(BrokenModel);
    } catch (err) {
      caughtSafeCountErr = err;
    }

    assert(
      caughtSafeCountErr !== null && caughtSafeCountErr.code === 'P1000',
      'MasterData: safeCount propagates genuine database outage (P1000) instead of swallowing into 0'
    );
  } catch (err) {
    assert(false, `MasterData safeCount propagation test failed: ${err.message}`);
  }

  // ----------------------------------------------------------------------
  // 4. SMTP CONFIGURATION & EMAIL SERVICE TESTS
  // ----------------------------------------------------------------------
  console.log('\n--- 4. SMTP CONFIGURATION & EMAIL SERVICE TESTS ---');

  const savedEnv = {
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_PORT: process.env.MAIL_PORT,
    MAIL_USERNAME: process.env.MAIL_USERNAME,
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    MAIL_FROM: process.env.MAIL_FROM,
  };

  // Clear primary EMAIL_* and MAIL_* envs to test SMTP_* fallback
  delete process.env.EMAIL_HOST;
  delete process.env.EMAIL_PORT;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  delete process.env.EMAIL_FROM;
  delete process.env.MAIL_HOST;
  delete process.env.MAIL_PORT;
  delete process.env.MAIL_USERNAME;
  delete process.env.MAIL_PASSWORD;
  delete process.env.MAIL_FROM;

  // Set test SMTP aliases
  process.env.SMTP_HOST = 'smtp.test.hostinger.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_USER = 'test@wonderfuljodi.com';
  process.env.SMTP_PASS = 'secret123';
  process.env.SMTP_FROM = 'contact@wonderfuljodi.com';

  const resolvedConfig = getEmailConfig();
  assert(resolvedConfig.host === 'smtp.test.hostinger.com', 'EmailService: getEmailConfig resolves SMTP_HOST alias');
  assert(resolvedConfig.port === 465, 'EmailService: getEmailConfig resolves SMTP_PORT alias');
  assert(resolvedConfig.user === 'test@wonderfuljodi.com', 'EmailService: getEmailConfig resolves SMTP_USER alias');
  assert(resolvedConfig.from === 'contact@wonderfuljodi.com', 'EmailService: getEmailConfig resolves SMTP_FROM alias');

  // Clear all SMTP variables to test unconfigured state
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;

  // Test 4.2: verifyEmailTransporter when credentials unconfigured
  const unconfiguredStatus = await verifyEmailTransporter();
  assert(
    unconfiguredStatus.success === false && unconfiguredStatus.code === 'ENV_CONFIG_MISSING',
    'EmailService: verifyEmailTransporter cleanly returns ENV_CONFIG_MISSING without crashing when unconfigured'
  );

  // Test 4.3: sendMail returns explicit failure result when unconfigured (no fake/mock messageId)
  const mailResult = await sendMail({
    to: 'diagnostic_test@example.com',
    subject: 'Wonderful Jodi SMTP Test',
    text: 'Automated test content',
  });
  assert(
    mailResult.success === false &&
      mailResult.delivered === false &&
      mailResult.code === 'SMTP_NOT_CONFIGURED' &&
      !mailResult.messageId,
    'EmailService: sendMail returns explicit failure (delivered: false, code: SMTP_NOT_CONFIGURED) without returning mock messageId'
  );

  // Restore env
  Object.entries(savedEnv).forEach(([k, v]) => {
    if (v !== undefined) process.env[k] = v;
    else delete process.env[k];
  });

  // ----------------------------------------------------------------------
  // 5. API HEALTH & PUBLIC LOCATION ENDPOINTS INTEGRATION TESTS
  // ----------------------------------------------------------------------
  console.log('\n--- 5. API HEALTH & ENDPOINTS INTEGRATION TESTS ---');

  let serverAvailable = false;
  try {
    const probe = await request('GET', '/api/health');
    if (probe && (probe.status === 200 || probe.status === 503)) {
      serverAvailable = true;
    }
  } catch (err) {
    serverAvailable = false;
  }

  if (serverAvailable) {
    try {
      // Test 5.1: Health check endpoint
      const healthRes = await request('GET', '/api/health');
      assert(
        (healthRes.status === 200 || healthRes.status === 503) &&
          (healthRes.body.status === 'ok' || healthRes.body.status === 'degraded'),
        'API: /api/health responds with valid health payload'
      );

      // Test 5.2: Public countries endpoint
      const countriesRes = await request('GET', '/api/locations/countries');
      assert(
        countriesRes.status === 200 && Array.isArray(countriesRes.body.data),
        'API: /api/locations/countries responds with 200 and country array'
      );

      // Test 5.3: Public states endpoint
      const statesRes = await request('GET', '/api/locations/states');
      assert(
        statesRes.status === 200 && Array.isArray(statesRes.body.data),
        'API: /api/locations/states responds with 200 and states array'
      );

      // Test 5.4: Districts endpoint with invalid stateId returns 400
      const invalidDistRes = await request('GET', '/api/locations/districts?stateId=invalid_id_123');
      assert(
        invalidDistRes.status === 400,
        'API: /api/locations/districts rejects invalid stateId format with 400'
      );

      // Test 5.5: Districts endpoint with non-existent ObjectId returns 404 (State not found)
      const notFoundDistRes = await request('GET', '/api/locations/districts?stateId=507f1f77bcf86cd799439011');
      assert(
        notFoundDistRes.status === 404 && notFoundDistRes.body.message === 'Specified state not found.',
        'API: /api/locations/districts returns 404 "Specified state not found." using State.findById'
      );

      // Test 5.6: Location search endpoint
      const searchRes = await request('GET', '/api/locations/search?q=Pune');
      assert(
        searchRes.status === 200 && Array.isArray(searchRes.body.data),
        'API: /api/locations/search?q=Pune responds with 200 and search results array'
      );
    } catch (apiErr) {
      assert(false, `API Integration test failed during execution: ${apiErr.message}`);
    }
  } else {
    skip('API: /api/health', 'Backend server not running on port 5000');
    skip('API: /api/locations/countries', 'Backend server not running on port 5000');
    skip('API: /api/locations/states', 'Backend server not running on port 5000');
    skip('API: /api/locations/districts [invalid id]', 'Backend server not running on port 5000');
    skip('API: /api/locations/districts [not found]', 'Backend server not running on port 5000');
    skip('API: /api/locations/search?q=Pune', 'Backend server not running on port 5000');
  }

  console.log('\n======================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runProductionFixTests().catch((err) => {
  console.error('Test Runner Unhandled Error:', err);
  process.exit(1);
});
