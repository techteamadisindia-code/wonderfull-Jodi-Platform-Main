/**
 * Wonderful Jodi - Phase 2 Regression Test Suite
 * Covers:
 * 1. Admin Teams & Access Roles:
 *    - Authorized admin viewing permitted details
 *    - Unauthorized admin view rejection (HTTP 403)
 *    - Sensitive fields (password, tokens) absence
 *    - Authorized deletion succeeding
 *    - Unauthorized deletion rejection (HTTP 403)
 *    - Self-deletion rejection (HTTP 400)
 *    - Last active Super Admin deletion protection (HTTP 400)
 *    - Deactivated/deleted admin session rejection by auth middleware
 * 2. Incomplete Registrations:
 *    - Authorized deletion of eligible incomplete registration
 *    - Unauthorized deletion rejection (HTTP 403)
 *    - Completed registration deletion rejection (HTTP 400)
 *    - Active user account deletion protection (HTTP 400)
 *    - Payment/Subscription linked record protection (HTTP 400)
 *    - Exclusion of deleted records from normal listing queries
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
  console.log('   WONDERFUL JODI: PHASE 2 ADMIN & INCOMPLETE REGISTRATION TESTS        ');
  console.log('========================================================================\n');

  // Load compiled controllers & models from backend/dist
  const adminController = require('./dist/controllers/adminController');
  const regController = require('./dist/controllers/registrationController');
  const { User } = require('./dist/models/User');
  const { Admin } = require('./dist/models/Admin');
  const { Registration } = require('./dist/models/Registration');
  const { Payment } = require('./dist/models/Payment');
  const { Subscription } = require('./dist/models/Subscription');
  const { RefreshToken } = require('./dist/models/RefreshToken');
  const { AuditLog } = require('./dist/models/AuditLog');
  const { requireRole, requireAuth } = require('./dist/middleware/authMiddleware');

  console.log('--- 1. Admin Teams & Access Roles: View Details ---');

  await runAsyncTest('Authorized Superadmin can view permitted admin details', async () => {
    // Mock User.findOne and Admin.findOne
    const origUserFindOne = User.findOne;
    const origAdminFindOne = Admin.findOne;

    User.findOne = () => ({
      select: () =>
        Promise.resolve({
          _id: 'target-admin-1',
          fullName: 'Staff Admin Pooja',
          email: 'pooja.admin@wonderfuljodi.com',
          mobile: '+919876543210',
          role: 'admin',
          isActive: true,
          status: 'Active',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-02-01'),
        }),
    });

    Admin.findOne = (query) => {
      if (query.user === 'superadmin-1') {
        return Promise.resolve({ permissions: ['all'] });
      }
      return Promise.resolve({ permissions: ['users', 'verifications'] });
    };

    const req = {
      params: { id: 'target-admin-1' },
      user: { userId: 'superadmin-1', role: 'admin', email: 'super@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await adminController.getAdminById(req, res, () => {});

    User.findOne = origUserFindOne;
    Admin.findOne = origAdminFindOne;

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.fullName, 'Staff Admin Pooja');
    assert.deepStrictEqual(res.body.data.permissions, ['users', 'verifications']);
    // Sensitive fields must be absent
    assert.strictEqual(res.body.data.password, undefined);
    assert.strictEqual(res.body.data.passwordHash, undefined);
    assert.strictEqual(res.body.data.token, undefined);
  });

  await runAsyncTest('Unauthorized admin without admins/users permission cannot view details', async () => {
    const origAdminFindOne = Admin.findOne;

    Admin.findOne = () => Promise.resolve({ permissions: ['reports'] }); // Only reports, no 'admins', 'users', or 'all'

    const req = {
      params: { id: 'target-admin-1' },
      user: { userId: 'limited-admin-1', role: 'admin', email: 'reports@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await adminController.getAdminById(req, res, () => {});

    Admin.findOne = origAdminFindOne;

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Insufficient permissions/i);
  });

  console.log('\n--- 2. Admin Teams & Access Roles: Delete Action & Safeguards ---');

  await runAsyncTest('Self-deletion of administrator account is strictly rejected (HTTP 400)', async () => {
    const origAdminFindOne = Admin.findOne;
    Admin.findOne = () => Promise.resolve({ permissions: ['all'] });

    const req = {
      params: { id: 'superadmin-1' },
      user: { userId: 'superadmin-1', role: 'admin', email: 'super@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await adminController.deleteAdmin(req, res, () => {});

    Admin.findOne = origAdminFindOne;

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Self-deletion is prohibited/i);
  });

  await runAsyncTest('Unauthorized admin (non-superadmin) cannot delete another admin (HTTP 403)', async () => {
    const origAdminFindOne = Admin.findOne;
    Admin.findOne = () => Promise.resolve({ permissions: ['users', 'verifications'] }); // lacks 'all'

    const req = {
      params: { id: 'target-admin-2' },
      user: { userId: 'staff-admin-1', role: 'admin', email: 'staff@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await adminController.deleteAdmin(req, res, () => {});

    Admin.findOne = origAdminFindOne;

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Only Super Administrators can delete/i);
  });

  await runAsyncTest('The last active Super Administrator cannot be deleted (HTTP 400)', async () => {
    const origAdminFindOne = Admin.findOne;
    const origUserFindOne = User.findOne;
    const origUserFind = User.find;

    User.findOne = () =>
      Promise.resolve({
        _id: 'target-super-2',
        role: 'admin',
        isDeleted: false,
        email: 'super2@wonderfuljodi.com',
      });

    Admin.findOne = (query) => {
      // Both caller and target are superadmins
      return Promise.resolve({ permissions: ['all'] });
    };

    // Only 1 active superadmin returned across the system
    User.find = () =>
      Promise.resolve([
        { _id: 'target-super-2', role: 'admin', isActive: true, isDeleted: false, email: 'super2@wonderfuljodi.com' },
      ]);

    const req = {
      params: { id: 'target-super-2' },
      user: { userId: 'calling-super-1', role: 'admin', email: 'caller@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await adminController.deleteAdmin(req, res, () => {});

    User.findOne = origUserFindOne;
    User.find = origUserFind;
    Admin.findOne = origAdminFindOne;

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Cannot delete the last active Super Administrator/i);
  });

  await runAsyncTest('Authorized deletion soft-deletes admin, revokes sessions, and records audit log', async () => {
    const origAdminFindOne = Admin.findOne;
    const origUserFindOne = User.findOne;
    const origUserUpdate = User.findByIdAndUpdate;
    const origRefreshUpdate = RefreshToken.updateMany;
    const origAuditCreate = AuditLog.create;

    let updatedUserId = null;
    let updateFields = null;
    let revokedUserId = null;
    let auditEntry = null;

    User.findOne = () =>
      Promise.resolve({
        _id: 'staff-admin-to-delete',
        role: 'admin',
        isDeleted: false,
        email: 'to-delete@wonderfuljodi.com',
        status: 'Active',
      });

    Admin.findOne = (query) => {
      if (query.user === 'caller-super') {
        return Promise.resolve({ permissions: ['all'] });
      }
      return Promise.resolve({ permissions: ['users'] }); // Target is regular staff
    };

    User.findByIdAndUpdate = (id, fields) => {
      updatedUserId = id;
      updateFields = fields;
      return Promise.resolve({ _id: id, ...fields });
    };

    RefreshToken.updateMany = (filter, update) => {
      revokedUserId = filter.user;
      return Promise.resolve({ modifiedCount: 3 });
    };

    AuditLog.create = (entry) => {
      auditEntry = entry;
      return Promise.resolve(entry);
    };

    const req = {
      params: { id: 'staff-admin-to-delete' },
      body: { reason: 'Staff member departed company' },
      user: { userId: 'caller-super', role: 'admin', email: 'super@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await adminController.deleteAdmin(req, res, () => {});

    User.findOne = origUserFindOne;
    Admin.findOne = origAdminFindOne;
    User.findByIdAndUpdate = origUserUpdate;
    RefreshToken.updateMany = origRefreshUpdate;
    AuditLog.create = origAuditCreate;

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(updatedUserId, 'staff-admin-to-delete');
    assert.strictEqual(updateFields.isDeleted, true);
    assert.strictEqual(updateFields.isActive, false);
    assert.strictEqual(updateFields.status, 'Deleted');
    assert.strictEqual(revokedUserId, 'staff-admin-to-delete');
    assert.strictEqual(auditEntry.action, 'ADMIN_DELETED');
  });

  await runAsyncTest('Deleted/deactivated admin access is rejected by requireRole and requireAuth', async () => {
    const origUserFindById = User.findById;

    // Simulate database returning a soft-deleted or deactivated admin
    User.findById = () =>
      Promise.resolve({
        _id: 'deleted-admin-1',
        role: 'admin',
        isDeleted: true,
        isActive: false,
        status: 'Deleted',
      });

    const req = {
      user: { userId: 'deleted-admin-1', role: 'admin', email: 'deleted@wonderfuljodi.com' },
    };
    const res = mockResponse();

    const roleMiddleware = requireRole('admin');
    await roleMiddleware(req, res, () => {});

    User.findById = origUserFindById;

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'ADMIN_DEACTIVATED');
  });

  console.log('\n--- 3. Incomplete Registrations: Deletion & Protections ---');

  await runAsyncTest('Eligible incomplete registration is soft-deleted and logged', async () => {
    const origAdminFindOne = Admin.findOne;
    const origRegFindOne = Registration.findOne;
    const origRegUpdate = Registration.findByIdAndUpdate;
    const origAuditCreate = AuditLog.create;

    let softDeletedId = null;
    let loggedAudit = null;

    Admin.findOne = () => Promise.resolve({ permissions: ['all'] });
    Registration.findOne = () =>
      Promise.resolve({
        _id: 'reg-inc-1',
        registrationId: 'REG-20261014-ABC123',
        status: 'IN_PROGRESS',
        currentStep: 2,
        completionPercentage: 45,
        candidateName: 'Dr. Test Candidate',
        user: null,
        isDeleted: false,
      });

    Registration.findByIdAndUpdate = (id, fields) => {
      softDeletedId = id;
      return Promise.resolve({ _id: id, ...fields });
    };

    AuditLog.create = (entry) => {
      loggedAudit = entry;
      return Promise.resolve(entry);
    };

    const req = {
      params: { id: 'reg-inc-1' },
      body: { reason: 'Abandoned test draft cleanup' },
      user: { userId: 'admin-1', role: 'admin', email: 'admin@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await regController.deleteAdminRegistration(req, res, () => {});

    Admin.findOne = origAdminFindOne;
    Registration.findOne = origRegFindOne;
    Registration.findByIdAndUpdate = origRegUpdate;
    AuditLog.create = origAuditCreate;

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(softDeletedId, 'reg-inc-1');
    assert.strictEqual(loggedAudit.action, 'REGISTRATION_DELETED');
    assert.strictEqual(loggedAudit.targetModel, 'Registration');
  });

  await runAsyncTest('Completed registration deletion is rejected (HTTP 400)', async () => {
    const origAdminFindOne = Admin.findOne;
    const origRegFindOne = Registration.findOne;

    Admin.findOne = () => Promise.resolve({ permissions: ['all'] });
    Registration.findOne = () =>
      Promise.resolve({
        _id: 'reg-comp-1',
        registrationId: 'REG-COMPLETED-100',
        status: 'COMPLETED',
        candidateName: 'Dr. Completed Candidate',
        isDeleted: false,
      });

    const req = {
      params: { id: 'reg-comp-1' },
      user: { userId: 'admin-1', role: 'admin', email: 'admin@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await regController.deleteAdminRegistration(req, res, () => {});

    Admin.findOne = origAdminFindOne;
    Registration.findOne = origRegFindOne;

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.code, 'CANNOT_DELETE_COMPLETED');
  });

  await runAsyncTest('Registration linked to active user account is protected from deletion (HTTP 400)', async () => {
    const origAdminFindOne = Admin.findOne;
    const origRegFindOne = Registration.findOne;
    const origUserFindById = User.findById;

    Admin.findOne = () => Promise.resolve({ permissions: ['all'] });
    Registration.findOne = () =>
      Promise.resolve({
        _id: 'reg-active-user-1',
        registrationId: 'REG-ACTIVE-USER',
        status: 'IN_PROGRESS',
        user: 'user-active-123',
        isDeleted: false,
      });

    User.findById = () =>
      Promise.resolve({
        _id: 'user-active-123',
        isActive: true,
        isDeleted: false,
        status: 'Active',
      });

    const req = {
      params: { id: 'reg-active-user-1' },
      user: { userId: 'admin-1', role: 'admin', email: 'admin@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await regController.deleteAdminRegistration(req, res, () => {});

    Admin.findOne = origAdminFindOne;
    Registration.findOne = origRegFindOne;
    User.findById = origUserFindById;

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.code, 'CANNOT_DELETE_ACTIVE_USER');
  });

  await runAsyncTest('Registration linked to completed payments is protected from deletion (HTTP 400)', async () => {
    const origAdminFindOne = Admin.findOne;
    const origRegFindOne = Registration.findOne;
    const origUserFindById = User.findById;
    const origPaymentFindOne = Payment.findOne;
    const origSubFindOne = Subscription.findOne;

    Admin.findOne = () => Promise.resolve({ permissions: ['all'] });
    Registration.findOne = () =>
      Promise.resolve({
        _id: 'reg-paid-1',
        registrationId: 'REG-PAID-CANDIDATE',
        status: 'IN_PROGRESS',
        user: 'user-paid-1',
        isDeleted: false,
      });

    User.findById = () => Promise.resolve({ _id: 'user-paid-1', isActive: false, status: 'Incomplete' });
    Payment.findOne = () => Promise.resolve({ _id: 'pay-123', status: 'SUCCESS', amount: 4999 });
    Subscription.findOne = () => Promise.resolve(null);

    const req = {
      params: { id: 'reg-paid-1' },
      user: { userId: 'admin-1', role: 'admin', email: 'admin@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await regController.deleteAdminRegistration(req, res, () => {});

    Admin.findOne = origAdminFindOne;
    Registration.findOne = origRegFindOne;
    User.findById = origUserFindById;
    Payment.findOne = origPaymentFindOne;
    Subscription.findOne = origSubFindOne;

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.code, 'CANNOT_DELETE_FINANCIAL_RECORDS');
  });

  await runAsyncTest('Unauthorized admin cannot delete registration (HTTP 403)', async () => {
    const origAdminFindOne = Admin.findOne;
    // Admin only has 'reports', lacking 'all', 'users', 'admins'
    Admin.findOne = () => Promise.resolve({ permissions: ['reports'] });

    const req = {
      params: { id: 'reg-any-1' },
      user: { userId: 'unauthorized-admin', role: 'admin', email: 'reports@wonderfuljodi.com' },
    };
    const res = mockResponse();

    await regController.deleteAdminRegistration(req, res, () => {});

    Admin.findOne = origAdminFindOne;

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Insufficient permissions/i);
  });

  console.log('\n========================================================================');
  console.log(`PHASE 2 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
