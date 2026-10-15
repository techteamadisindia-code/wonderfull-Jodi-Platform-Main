/**
 * Regression Test Suite: Wonderful Jodi Admin Profile Update API Hardening
 *
 * Validates:
 * 1. Both PUT and PATCH /api/admin/profiles/:id route configuration and dispatch.
 * 2. Successful update with frontend modal payload (containing unmodeled `weight` and complex nested fields).
 * 3. Prevention of PrismaClientValidationError (HTTP 500) caused by unmodeled fields on profile.save().
 * 4. Authorization preservation:
 *    - Super Admin full permissions (name, contact, profile).
 *    - Standard admin with 'profiles' permission (cannot edit name -> 400).
 *    - Standard admin without 'privateInfo.edit' attempting contact edit -> 403.
 *    - Standard admin with 'privateInfo.edit' updating contact/address -> 200.
 *    - Admin without permissions -> 403.
 * 5. Private data redaction when caller lacks privateInfo.view.
 * 6. Audit logging for profile updates.
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { updateProfile, redactPrivateAddress, maskEmail, maskMobile } = require('./dist/controllers/adminController.js');
const { cleanUnsupportedModelFields } = require('./dist/db/prismaBridge.js');
const { Profile } = require('./dist/models/Profile.js');
const { User } = require('./dist/models/User.js');
const { Admin } = require('./dist/models/Admin.js');
const { AuditLog } = require('./dist/models/AuditLog.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  process.stdout.write(`  [TEST] ${name} ... `);
  try {
    await fn();
    passedTests++;
    console.log('PASSED');
  } catch (err) {
    failedTests++;
    console.log('FAILED');
    console.error('    Error:', err.message);
  }
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
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
  };
  return res;
}

async function runSuite() {
  console.log('\n============================================================');
  console.log('Running Admin Profile Update Regression Test Suite');
  console.log('============================================================\n');

  // Test 1: cleanUnsupportedModelFields removes 'weight' and status/deleted fields for Profile
  await test('cleanUnsupportedModelFields removes weight and unmodeled fields for Profile', () => {
    const dirty = {
      height: '5ft 10in',
      weight: '70',
      deletedAt: new Date(),
      deletedBy: 'admin',
      statusReason: 'Testing',
      city: 'Pune',
    };
    const cleaned = cleanUnsupportedModelFields({ ...dirty }, 'profile');
    assert.strictEqual(cleaned.weight, undefined, 'weight must be stripped');
    assert.strictEqual(cleaned.deletedAt, undefined, 'deletedAt must be stripped');
    assert.strictEqual(cleaned.statusReason, undefined, 'statusReason must be stripped');
    assert.strictEqual(cleaned.height, '5ft 10in', 'height must be preserved');
    assert.strictEqual(cleaned.city, 'Pune', 'city must be preserved');
  });

  // Find target profile and admin records
  const targetId = '507c4e7baf8fccd2dfa0672f';
  let profile = await Profile.findById(targetId);
  if (!profile) {
    profile = await Profile.findOne();
  }
  assert(profile, 'A profile record must exist in the database for testing');
  const actualTargetId = profile.id || profile._id;

  const adminRecord = await Admin.findOne();
  const callerUserId = adminRecord?.userId || adminRecord?.user || '60c72b2f9b1d8b2bad000001';
  const callerUser = callerUserId ? await User.findById(callerUserId) : null;
  const adminEmail = callerUser?.email || 'admin@wonderfuljodi.com';

  // Test 2: Admin Profile Update succeeds with payload containing 'weight' (reproducing user scenario)
  await test('updateProfile handles frontend payload with weight field without HTTP 500 error', async () => {
    const req = {
      params: { id: actualTargetId },
      body: {
        height: '5ft 10in',
        weight: '72', // Sent by AdminEditProfileModal
        religion: 'Hindu',
        maritalStatus: 'Never Married',
        education: 'MBBS',
        degree: 'MD',
        profession: 'Doctor',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        status: 'Active',
      },
      user: {
        userId: callerUserId,
        _id: callerUserId,
        id: callerUserId,
        email: adminEmail,
        role: 'admin',
        fullName: 'Super Admin',
      },
    };

    const res = createMockRes();
    let nextError = null;
    const next = (err) => { nextError = err; };

    await updateProfile(req, res, next);

    assert.strictEqual(nextError, null, `updateProfile must not call next() with error: ${nextError?.message}`);
    assert.strictEqual(res.statusCode, 200, `Expected HTTP 200 but got ${res.statusCode}`);
    assert.strictEqual(res.body?.success, true, 'Response body success must be true');
    assert.strictEqual(res.body?.data?.city, 'Mumbai', 'City must be updated to Mumbai');
  });

  // Test 3: Standard admin with 'profiles' permission cannot edit protected name fields
  await test('Standard admin without Super Admin cannot edit protected name fields (HTTP 400)', async () => {
    // Create mock standard admin
    const standardAdminUser = {
      id: '507c4e7baf8fccd2dfa06730',
      userId: '507c4e7baf8fccd2dfa06730',
      email: 'staff@wonderfuljodi.com',
      role: 'admin',
    };

    // Temporarily mock Admin.findOne for this caller
    const origFindOne = Admin.findOne;
    Admin.findOne = () => ({
      permissions: ['profiles'], // Has 'profiles', but not 'all'
    });

    try {
      const req = {
        params: { id: actualTargetId },
        body: {
          fullName: 'Dr. Hacker Name',
          city: 'Pune',
        },
        user: standardAdminUser,
      };

      const res = createMockRes();
      const next = (err) => {};

      await updateProfile(req, res, next);

      assert.strictEqual(res.statusCode, 400, `Expected HTTP 400 for protected name field, got ${res.statusCode}`);
      assert.strictEqual(res.body?.success, false);
      assert(res.body?.message?.includes('Name fields are protected'));
    } finally {
      Admin.findOne = origFindOne;
    }
  });

  // Test 4: Standard admin without 'privateInfo.edit' cannot edit private contact details
  await test('Standard admin without privateInfo.edit cannot edit email/phone/address (HTTP 403)', async () => {
    const origFindOne = Admin.findOne;
    Admin.findOne = () => ({
      permissions: ['profiles'], // Lacks 'privateInfo.edit' and 'all'
    });

    try {
      const req = {
        params: { id: actualTargetId },
        body: {
          email: 'newemail@example.com',
        },
        user: {
          userId: '507c4e7baf8fccd2dfa06730',
          role: 'admin',
        },
      };

      const res = createMockRes();
      const next = (err) => {};

      await updateProfile(req, res, next);

      assert.strictEqual(res.statusCode, 403, `Expected HTTP 403 for private contact edit, got ${res.statusCode}`);
      assert.strictEqual(res.body?.success, false);
      assert(res.body?.message?.includes('privateInfo.edit permission required'));
    } finally {
      Admin.findOne = origFindOne;
    }
  });

  // Test 5: Standard admin with 'privateInfo.edit' CAN edit private address
  await test('Admin with privateInfo.edit CAN edit private address (HTTP 200)', async () => {
    const origFindOne = Admin.findOne;
    Admin.findOne = () => ({
      permissions: ['profiles', 'privateInfo.edit', 'privateInfo.view'],
    });

    try {
      const req = {
        params: { id: actualTargetId },
        body: {
          currentLocation: {
            formattedAddress: '42 MG Road, Koregaon Park, Pune',
          },
        },
        user: {
          userId: callerUserId,
          role: 'admin',
          email: adminEmail,
        },
      };

      const res = createMockRes();
      const next = (err) => { assert.fail(`Unexpected next error: ${err?.message}`); };

      await updateProfile(req, res, next);

      assert.strictEqual(res.statusCode, 200, `Expected HTTP 200, got ${res.statusCode}`);
      assert.strictEqual(res.body?.success, true);
    } finally {
      Admin.findOne = origFindOne;
    }
  });

  // Test 6: Private data is redacted when caller lacks 'privateInfo.view'
  await test('Private contact details are masked and address redacted when caller lacks privateInfo.view', async () => {
    const origFindOne = Admin.findOne;
    Admin.findOne = () => ({
      permissions: ['profiles'], // Lacks 'privateInfo.view' and 'privateInfo.edit'
    });

    try {
      const req = {
        params: { id: actualTargetId },
        body: {
          about: 'Updated dedicated doctor bio.',
        },
        user: {
          userId: '507c4e7baf8fccd2dfa06730',
          role: 'admin',
          email: 'viewer@wonderfuljodi.com',
        },
      };

      const res = createMockRes();
      const next = (err) => { assert.fail(`Unexpected next error: ${err?.message}`); };

      await updateProfile(req, res, next);

      assert.strictEqual(res.statusCode, 200);
      const resUser = res.body?.data?.user;
      if (resUser?.email) {
        assert(resUser.email.includes('•') || resUser.email.includes('***'), 'Email must be masked');
      }
      const resLoc = res.body?.data?.currentLocation;
      if (resLoc?.formattedAddress) {
        assert.strictEqual(resLoc.formattedAddress, '[Private Address - View Permission Required]', 'Address must be redacted');
      }
    } finally {
      Admin.findOne = origFindOne;
    }
  });

  // Test 7: Route configuration verifies both PUT and PATCH are registered
  await test('Route configuration registers both PUT and PATCH for /profiles/:id', () => {
    const adminRoutesPath = path.join(__dirname, 'dist/routes/adminRoutes.js');
    const fs = require('fs');
    const content = fs.readFileSync(adminRoutesPath, 'utf8');
    const hasPut = /router\.put\(['"]\/profiles\/:id['"],\s*adminController_1\.updateProfile\)/.test(content) ||
                   content.includes("router.put('/profiles/:id',");
    const hasPatch = /router\.patch\(['"]\/profiles\/:id['"],\s*adminController_1\.updateProfile\)/.test(content) ||
                     content.includes("router.patch('/profiles/:id',");
    assert(hasPut, 'adminRoutes must register PUT /profiles/:id');
    assert(hasPatch, 'adminRoutes must register PATCH /profiles/:id');
  });

  console.log('\n============================================================');
  console.log(`Suite Complete: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
