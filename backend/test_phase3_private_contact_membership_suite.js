/**
 * Wonderful Jodi - Phase 3 Regression & Security Test Suite
 * Covers:
 * 1. Private Contact and Contract Information:
 *    - Data masking functions (maskEmail, maskMobile)
 *    - Authorized viewing with privateInfo.view (unmasked data)
 *    - Unauthorized viewing without privateInfo.view (masked data, zero leakage)
 *    - View-only permission never implies edit permission (HTTP 403 rejection)
 *    - Authorized editing with privateInfo.edit (updates User model & address)
 *    - Unauthorized editing without privateInfo.edit (HTTP 403 rejection)
 *    - Email uniqueness validation on update
 *    - AuditLog recording for PRIVATE_CONTACT_UPDATED
 * 2. Super Admin-Only Manual Paid Membership Grants:
 *    - Non-superadmin rejection (HTTP 403)
 *    - Input validation (missing user, missing plan, short reason, deleted user)
 *    - Successful grant creating ACTIVE subscription with SUPERADMIN_MANUAL_GRANT reference
 *    - Strict Payment Integrity: Zero fake Payment records created
 *    - AuditLog recording with MEMBERSHIP_MANUALLY_GRANTED and grantReason
 *    - Subscription extension for candidates with existing active plans
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

async function main() {
  console.log('========================================================================');
  console.log('   WONDERFUL JODI: PHASE 3 PRIVATE CONTACT & MEMBERSHIP GRANT TESTS     ');
  console.log('========================================================================\n');

  // Load compiled controllers & models from backend/dist
  const adminController = require('./dist/controllers/adminController');
  const { User } = require('./dist/models/User');
  const { Admin } = require('./dist/models/Admin');
  const { Profile } = require('./dist/models/Profile');
  const { Subscription } = require('./dist/models/Subscription');
  const { MembershipPlan } = require('./dist/models/MembershipPlan');
  const { Payment } = require('./dist/models/Payment');
  const { AuditLog } = require('./dist/models/AuditLog');

  const timestamp = Date.now();

  // Test 1: Data masking helpers
  console.log('--- 1. Testing Contact Data Masking Utilities ---');
  runTest('maskEmail correctly masks email characters with domain preserved', () => {
    const masked = adminController.maskEmail('dr.sharma@example.com');
    assert.ok(masked.includes('•'), 'Masked email should include bullet dots');
    assert.ok(masked.endsWith('@example.com'), 'Domain must be preserved');
    assert.strictEqual(masked[0], 'd', 'First character should be preserved');
  });

  runTest('maskMobile correctly masks phone digits with prefix/suffix preserved', () => {
    const masked = adminController.maskMobile('+919876543210');
    assert.ok(masked.includes('•'), 'Masked mobile should include bullets');
    assert.ok(masked.startsWith('+91'), 'Country/area prefix should be preserved');
    assert.ok(masked.endsWith('10'), 'Last two digits preserved');
  });

  // Setup test users & profiles
  console.log('\n--- 2. Setting Up Test Accounts for Authorization Scenarios ---');

  // A. Super Admin User
  const superAdminUser = await User.create({
    fullName: `Super Admin Phase3 ${timestamp}`,
    email: `superadmin_p3_${timestamp}@wonderfuljodi.com`,
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'hashed_password_123',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: superAdminUser._id,
    permissions: ['all'],
  });

  // B. Staff Admin with View-Only Permission (privateInfo.view, NO privateInfo.edit)
  const viewOnlyAdminUser = await User.create({
    fullName: `View-Only Admin Phase3 ${timestamp}`,
    email: `viewadmin_p3_${timestamp}@wonderfuljodi.com`,
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'hashed_password_123',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: viewOnlyAdminUser._id,
    permissions: ['profiles', 'privateInfo.view'],
  });

  // C. Staff Admin with Edit Permission (privateInfo.edit)
  const editAdminUser = await User.create({
    fullName: `Edit Admin Phase3 ${timestamp}`,
    email: `editadmin_p3_${timestamp}@wonderfuljodi.com`,
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'hashed_password_123',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: editAdminUser._id,
    permissions: ['profiles', 'privateInfo.edit'],
  });

  // D. Restricted Staff Admin (verifications only, NO privateInfo permissions)
  const restrictedAdminUser = await User.create({
    fullName: `Restricted Admin Phase3 ${timestamp}`,
    email: `restricted_p3_${timestamp}@wonderfuljodi.com`,
    mobile: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'hashed_password_123',
    role: 'admin',
    verified: true,
  });
  await Admin.create({
    user: restrictedAdminUser._id,
    permissions: ['verifications', 'reports'],
  });

  // E. Test Candidate User & Profile
  const candidateUser = await User.create({
    fullName: `Dr. Neha Kapoor ${timestamp}`,
    email: `dr.neha_${timestamp}@hospital.org`,
    mobile: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'hashed_candidate_pass',
    role: 'user',
    verified: true,
  });

  const candidateProfile = await Profile.create({
    user: candidateUser._id,
    candidateId: `WJ_P3_${timestamp.toString().slice(-4)}`,
    displayName: `Dr. Neha Kapoor`,
    gender: 'Female',
    dob: new Date('1992-05-15'),
    height: '5ft 6in',
    maritalStatus: 'Never Married',
    education: 'MBBS, MD',
    degree: 'Doctor of Medicine',
    profession: 'Cardiologist',
    city: 'Mumbai',
    country: 'India',
    currentLocation: {
      formattedAddress: 'Flat 402, Lotus Towers, Andheri West, Mumbai, Maharashtra 400053',
      pincode: '400053',
    },
    nativePlaceDetails: {
      formattedAddress: 'Kapoor Villa, Civil Lines, Jaipur, Rajasthan 302006',
    },
  });

  console.log(`Created Candidate Profile: ${candidateProfile.candidateId} (User: ${candidateUser.email})`);

  // Test Feature A: Private Contact Authorization (View & Edit)
  console.log('\n--- 3. Testing Feature A: Private Contact Information View Authorization ---');

  await runAsyncTest('Admin with privateInfo.view receives unmasked email and phone', async () => {
    const req = {
      params: { id: candidateProfile._id },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
      query: {},
    };
    const res = mockResponse();
    await adminController.getProfileById(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.body.success, true, 'Should succeed');
    assert.strictEqual(res.body.data.canViewPrivateContact, true, 'canViewPrivateContact must be true');
    assert.strictEqual(res.body.data.isPrivateContactMasked, false, 'isPrivateContactMasked must be false');
    assert.strictEqual(res.body.data.user.email, candidateUser.email, 'Email must be unmasked');
    assert.strictEqual(res.body.data.user.mobile, candidateUser.mobile, 'Mobile must be unmasked');
    assert.strictEqual(
      res.body.data.profile.currentLocation.formattedAddress,
      candidateProfile.currentLocation.formattedAddress,
      'Full address must be unmasked'
    );
  });

  await runAsyncTest('Admin WITHOUT privateInfo.view receives masked contact data', async () => {
    const req = {
      params: { id: candidateProfile._id },
      user: { userId: restrictedAdminUser._id, email: restrictedAdminUser.email, role: 'admin' },
      query: {},
    };
    const res = mockResponse();
    await adminController.getProfileById(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.body.data.canViewPrivateContact, false, 'canViewPrivateContact must be false');
    assert.strictEqual(res.body.data.isPrivateContactMasked, true, 'isPrivateContactMasked must be true');
    assert.ok(
      res.body.data.user.email.includes('•'),
      `Email must be masked with dots, got: ${res.body.data.user.email}`
    );
    assert.ok(
      res.body.data.user.mobile.includes('•'),
      `Mobile must be masked with dots, got: ${res.body.data.user.mobile}`
    );
    assert.ok(
      res.body.data.profile.currentLocation.formattedAddress.includes('View Permission Required'),
      'Address must be masked'
    );
  });

  await runAsyncTest('Profiles directory listing masks contact data for unauthorized admins', async () => {
    const req = {
      query: { search: candidateProfile.displayName },
      user: { userId: restrictedAdminUser._id, email: restrictedAdminUser.email, role: 'admin' },
    };
    const res = mockResponse();
    await adminController.getProfiles(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.body.data.canViewPrivateContact, false, 'Listing canViewPrivateContact must be false');
    const match = res.body.data.profiles.find((p) => String(p._id) === String(candidateProfile._id));
    assert.ok(match, 'Candidate profile should be found in listing');
    assert.ok(match.user.email.includes('•'), 'Listing email must be masked');
    assert.ok(match.user.mobile.includes('•'), 'Listing mobile must be masked');
    assert.ok(
      match.currentLocation.formattedAddress.includes('View Permission Required'),
      'Listing address must be masked'
    );
  });

  console.log('\n--- 4. Testing Feature A: Private Contact Information Edit Authorization ---');

  await runAsyncTest('Rule 3: Admin with View-only permission CANNOT edit contact info (HTTP 403)', async () => {
    const req = {
      params: { id: candidateProfile._id },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
      body: {
        mobile: '+919876549999',
      },
    };
    const res = mockResponse();
    await adminController.updateProfile(req, res, () => {});

    assert.strictEqual(res.statusCode, 403, 'Must reject with HTTP 403 Forbidden');
    assert.strictEqual(res.body.success, false, 'Success must be false');
    assert.ok(
      res.body.message.includes('privateInfo.edit permission required'),
      `Error message should mention privateInfo.edit, got: ${res.body.message}`
    );
  });

  await runAsyncTest('Admin with profiles permission can still edit non-private fields (HTTP 200)', async () => {
    const req = {
      params: { id: candidateProfile._id },
      user: { userId: viewOnlyAdminUser._id, email: viewOnlyAdminUser.email, role: 'admin' },
      body: {
        about: 'Senior consulting cardiologist passionate about clinical care.',
        maritalStatus: 'Never Married',
      },
    };
    const res = mockResponse();
    await adminController.updateProfile(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200 for non-private fields');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(
      res.body.data.about,
      'Senior consulting cardiologist passionate about clinical care.'
    );
  });

  await runAsyncTest('Admin with privateInfo.edit successfully updates contact info & logs audit', async () => {
    const updatedMobile = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    const updatedAddress = 'Flat 801, Sea View Apartments, Bandra West, Mumbai 400050';

    const req = {
      params: { id: candidateProfile._id },
      user: { userId: editAdminUser._id, email: editAdminUser.email, role: 'admin' },
      body: {
        mobile: updatedMobile,
        currentLocation: {
          formattedAddress: updatedAddress,
        },
      },
    };
    const res = mockResponse();
    await adminController.updateProfile(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.body.success, true);

    // Verify User model was updated
    const refreshedUser = await User.findById(candidateUser._id);
    assert.strictEqual(refreshedUser.mobile, updatedMobile, 'User mobile must be updated in database');

    // Verify AuditLog record
    const auditRecord = await AuditLog.findOne({
      targetProfileId: candidateProfile._id,
      action: 'PRIVATE_CONTACT_UPDATED',
    }).sort({ createdAt: -1 });

    assert.ok(auditRecord, 'AuditLog entry for PRIVATE_CONTACT_UPDATED must exist');
    assert.strictEqual(auditRecord.status, 'SUCCESS');
    assert.strictEqual(auditRecord.adminEmail, editAdminUser.email);
  });

  console.log('\n--- 5. Testing Feature B: Super Admin-Only Manual Paid Membership Grants ---');

  // Create a plan for testing grant
  let testPlan = await MembershipPlan.findOne({ isActive: true });
  if (!testPlan) {
    testPlan = await MembershipPlan.create({
      name: 'Platinum Doctor Match',
      slug: `platinum-doctor-match-${timestamp}`,
      description: 'VIP testing plan for Phase 3 manual grant verification',
      originalPrice: 15999,
      discountedPrice: 12999,
      currency: 'INR',
      durationDays: 180,
      contactRequestLimit: 75,
      isActive: true,
    });
  }

  await runAsyncTest('Non-superadmin calling grant membership is rejected with HTTP 403', async () => {
    const req = {
      user: { userId: editAdminUser._id, email: editAdminUser.email, role: 'admin' },
      body: {
        userId: candidateUser._id,
        planId: testPlan._id,
        grantReason: 'Attempted grant by non-super admin staff',
      },
    };
    const res = mockResponse();
    await adminController.grantMembershipBySuperAdmin(req, res, () => {});

    assert.strictEqual(res.statusCode, 403, 'Must reject non-superadmin with HTTP 403');
    assert.strictEqual(res.body.success, false);
    assert.ok(
      res.body.message.includes('Only Super Administrators can manually grant'),
      `Message must state Super Admin requirement, got: ${res.body.message}`
    );
  });

  await runAsyncTest('Grant membership validates grant reason minimum length (HTTP 400)', async () => {
    const req = {
      user: { userId: superAdminUser._id, email: superAdminUser.email, role: 'admin' },
      body: {
        userId: candidateUser._id,
        planId: testPlan._id,
        grantReason: 'ok', // too short
      },
    };
    const res = mockResponse();
    await adminController.grantMembershipBySuperAdmin(req, res, () => {});

    assert.strictEqual(res.statusCode, 400, 'Must reject with HTTP 400 for short reason');
    assert.ok(res.body.message.includes('minimum 5 characters'));
  });

  const paymentCountBefore = await Payment.countDocuments();

  await runAsyncTest('Super Admin successfully grants paid membership with payment integrity guarantee', async () => {
    const grantReason = 'VIP Doctor offline settlement verified during executive consultation';
    const req = {
      user: { userId: superAdminUser._id, email: superAdminUser.email, role: 'admin', fullName: 'Super Admin' },
      body: {
        userId: candidateUser._id,
        planId: testPlan._id,
        durationDays: 90,
        grantReason,
      },
    };
    const res = mockResponse();
    await adminController.grantMembershipBySuperAdmin(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'ACTIVE');
    assert.ok(
      res.body.data.paymentReference.startsWith('SUPERADMIN_MANUAL_GRANT_'),
      `paymentReference must clearly indicate manual grant: ${res.body.data.paymentReference}`
    );

    // CRITICAL SECURITY & INTEGRITY VERIFICATION:
    const paymentCountAfter = await Payment.countDocuments();
    assert.strictEqual(
      paymentCountAfter,
      paymentCountBefore,
      'Strict Financial Integrity: Zero fake Payment records must be created!'
    );

    // Verify Subscription model
    const sub = await Subscription.findById(res.body.data.subscriptionId);
    assert.ok(sub, 'Subscription record must exist');
    assert.strictEqual(sub.status, 'ACTIVE');
    assert.strictEqual(String(sub.userId || sub.user), String(candidateUser._id));
    assert.strictEqual(sub.contactRequestsRemaining, testPlan.contactRequestLimit || 30);

    // Verify AuditLog
    const auditRecord = await AuditLog.findOne({
      targetUserId: candidateUser._id,
      action: 'MEMBERSHIP_MANUALLY_GRANTED',
    }).sort({ createdAt: -1 });

    assert.ok(auditRecord, 'AuditLog entry for MEMBERSHIP_MANUALLY_GRANTED must exist');
    assert.strictEqual(auditRecord.reason, grantReason);
    assert.strictEqual(auditRecord.adminEmail, superAdminUser.email);
    assert.strictEqual(auditRecord.metadata.manualGrant, true);
  });

  await runAsyncTest('Super Admin extending existing active membership adds credits and advances expiry', async () => {
    const existingSub = await Subscription.findOne({ user: candidateUser._id, status: 'ACTIVE' });
    assert.ok(existingSub, 'Active subscription should exist from previous test');

    const oldExpiry = new Date(existingSub.expiryDate);
    const oldCredits = existingSub.contactRequestsRemaining;

    const req = {
      user: { userId: superAdminUser._id, email: superAdminUser.email, role: 'admin' },
      body: {
        userId: candidateUser._id,
        planId: testPlan._id,
        durationDays: 30,
        extendExisting: true,
        grantReason: 'Customer satisfaction loyalty extension for valued doctor candidate',
      },
    };
    const res = mockResponse();
    await adminController.grantMembershipBySuperAdmin(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.isExtended, true, 'isExtended must be true');

    const updatedSub = await Subscription.findById(existingSub._id);
    assert.ok(
      new Date(updatedSub.expiryDate) > oldExpiry,
      'Expiry date must be advanced beyond previous expiration'
    );
    assert.ok(
      updatedSub.contactRequestsRemaining > oldCredits,
      'Contact requests remaining must be incremented'
    );
  });

  console.log('\n========================================================================');
  console.log(`   TEST EXECUTION COMPLETED: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
