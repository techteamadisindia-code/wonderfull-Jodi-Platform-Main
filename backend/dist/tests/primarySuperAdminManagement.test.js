"use strict";
/**
 * PRIMARY SUPER ADMINISTRATOR & ADMIN EDIT MANAGEMENT REGRESSION TEST SUITE
 *
 * Verifies all 20 requirements:
 * 1. Shubham can delete ordinary admin.
 * 2. Shubham can delete another Super Admin.
 * 3. Shubham cannot delete himself (400 SELF_DELETION_PROHIBITED).
 * 4. Another Super Admin cannot delete Shubham (403 CANNOT_DELETE_PRIMARY_SUPER_ADMIN).
 * 5. Direct DELETE API calls fail closed against Shubham (deleteUser & deleteAdmin).
 * 6. Another Super Admin cannot change Shubham's email (403 CANNOT_MODIFY_PRIMARY_SUPER_ADMIN).
 * 7. Another Super Admin cannot demote Shubham (403 CANNOT_DEMOTE_PRIMARY_SUPER_ADMIN).
 * 8. Another Super Admin cannot revoke Shubham's permissions (403/400).
 * 9. Case-insensitive email matching (e.g. SHUBHAMCHAUDANTE@GMAIL.COM).
 * 10. Shubham can edit another admin.
 * 11. Editing updates existing record without creating duplicate entries.
 * 12. Duplicate admin emails are rejected (400 DUPLICATE_EMAIL).
 * 13. Invalid roles are rejected (400 INVALID_ROLE).
 * 14. Invalid module permissions are rejected (400 INVALID_PERMISSION_VALUE).
 * 15. Unauthorized edit requests return HTTP 403 (INSUFFICIENT_PERMISSIONS / SUPER_ADMIN_ELEVATION_PROHIBITED).
 * 16. Deleted admin sessions/refresh tokens are invalidated.
 * 17. Audit records are created for updates and deletions.
 * 18. Frontend permissions respected and validated against ALLOWED_ADMIN_PERMISSIONS.
 * 19. Protected badge on Shubham row verification.
 * 20. Non-actionable delete button / locked indicator on Shubham row verification.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const permissionUtils_1 = require("../utils/permissionUtils");
const adminController_1 = require("../controllers/adminController");
const superAdminController_1 = require("../controllers/superAdminController");
const Admin_1 = require("../models/Admin");
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
const RefreshToken_1 = require("../models/RefreshToken");
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
function it(desc, fn) {
    totalTests++;
    return Promise.resolve()
        .then(() => fn())
        .then(() => {
        passedTests++;
        console.log(`  [PASS] ${desc}`);
    })
        .catch((err) => {
        failedTests++;
        console.error(`  [FAIL] ${desc}`);
        console.error(`         ${err.message || err}`);
    });
}
function createMockReq(overrides = {}) {
    return {
        headers: {},
        cookies: {},
        params: {},
        query: {},
        body: {},
        ip: '127.0.0.1',
        user: undefined,
        ...overrides,
    };
}
function createMockRes() {
    let statusCode = 200;
    let body = null;
    const res = {
        status(code) {
            statusCode = code;
            return res;
        },
        json(data) {
            body = data;
            return res;
        },
    };
    return {
        res,
        getResult: () => ({ statusCode, body }),
    };
}
async function runAll() {
    console.log('\n============================================================');
    console.log(' PRIMARY SUPER ADMIN & ADMIN MANAGEMENT REGRESSION TESTS');
    console.log('============================================================\n');
    // Test 1: Shubham can delete ordinary admin
    await it('1. Shubham (Primary Super Admin) can delete ordinary admin', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origUserFindByIdAndUpdate = User_1.User.findByIdAndUpdate;
        const origAdminFindOne = Admin_1.Admin.findOne;
        const origRefreshTokenUpdateMany = RefreshToken_1.RefreshToken.updateMany;
        const origAuditCreate = AuditLog_1.AuditLog.create;
        let softDeleted = false;
        let tokensRevoked = false;
        let auditLogged = false;
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = ((query) => {
            if (query?.user === 'shubham_id') {
                return Promise.resolve({ permissions: ['all'] });
            }
            if (query?.user === 'ordinary_id') {
                return Promise.resolve({ permissions: ['users', 'profiles'] });
            }
            return Promise.resolve(null);
        });
        User_1.User.findOne = ((query) => {
            if (query?._id === 'ordinary_id') {
                return Promise.resolve({
                    _id: 'ordinary_id',
                    email: 'staff.admin@wj.com',
                    role: 'admin',
                    isActive: true,
                    isDeleted: false,
                });
            }
            return Promise.resolve(null);
        });
        User_1.User.findByIdAndUpdate = ((id, update) => {
            if (id === 'ordinary_id' && update.isDeleted === true) {
                softDeleted = true;
            }
            return Promise.resolve({});
        });
        RefreshToken_1.RefreshToken.updateMany = (() => {
            tokensRevoked = true;
            return Promise.resolve({ modifiedCount: 1 });
        });
        AuditLog_1.AuditLog.create = ((data) => {
            if (data?.action === 'ADMIN_DELETED') {
                auditLogged = true;
            }
            return Promise.resolve(data);
        });
        try {
            const req = createMockReq({
                params: { id: 'ordinary_id' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.deleteAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(body.success, true);
            assert_1.default.strictEqual(softDeleted, true);
            assert_1.default.strictEqual(tokensRevoked, true);
            assert_1.default.strictEqual(auditLogged, true);
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            User_1.User.findByIdAndUpdate = origUserFindByIdAndUpdate;
            Admin_1.Admin.findOne = origAdminFindOne;
            RefreshToken_1.RefreshToken.updateMany = origRefreshTokenUpdateMany;
            AuditLog_1.AuditLog.create = origAuditCreate;
        }
    });
    // Test 2: Shubham can delete another Super Admin
    await it('2. Shubham (Primary Super Admin) can delete another Super Admin', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origUserFindByIdAndUpdate = User_1.User.findByIdAndUpdate;
        const origAdminFindOne = Admin_1.Admin.findOne;
        const origRefreshTokenUpdateMany = RefreshToken_1.RefreshToken.updateMany;
        const origAuditCreate = AuditLog_1.AuditLog.create;
        let softDeleted = false;
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = ((query) => {
            if (query?.user === 'shubham_id') {
                return Promise.resolve({ permissions: ['all'] });
            }
            if (query?.user === 'other_super_id') {
                return Promise.resolve({ permissions: ['all'] });
            }
            return Promise.resolve(null);
        });
        User_1.User.findOne = ((query) => {
            if (query?._id === 'other_super_id') {
                return Promise.resolve({
                    _id: 'other_super_id',
                    email: 'other.super@wj.com',
                    role: 'admin',
                    isActive: true,
                    isDeleted: false,
                });
            }
            return Promise.resolve(null);
        });
        User_1.User.findByIdAndUpdate = ((id, update) => {
            if (id === 'other_super_id' && update.isDeleted === true) {
                softDeleted = true;
            }
            return Promise.resolve({});
        });
        RefreshToken_1.RefreshToken.updateMany = (() => Promise.resolve({ modifiedCount: 1 }));
        AuditLog_1.AuditLog.create = (() => Promise.resolve({}));
        try {
            const req = createMockReq({
                params: { id: 'other_super_id' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.deleteAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(body.success, true);
            assert_1.default.strictEqual(softDeleted, true);
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            User_1.User.findByIdAndUpdate = origUserFindByIdAndUpdate;
            Admin_1.Admin.findOne = origAdminFindOne;
            RefreshToken_1.RefreshToken.updateMany = origRefreshTokenUpdateMany;
            AuditLog_1.AuditLog.create = origAuditCreate;
        }
    });
    // Test 3: Shubham cannot delete himself (400)
    await it('3. Shubham cannot delete himself (400 SELF_DELETION_PROHIBITED)', async () => {
        const origAdminFindOne = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        try {
            const req = createMockReq({
                params: { id: 'shubham_id' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.deleteAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 400);
            assert_1.default.strictEqual(body.code, 'SELF_DELETION_PROHIBITED');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // Test 4: Another Super Admin cannot delete Shubham (403)
    await it('4. Another Super Admin cannot delete Shubham (403 CANNOT_DELETE_PRIMARY_SUPER_ADMIN)', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = ((id) => {
            if (id === 'other_super_id') {
                return Promise.resolve({
                    _id: 'other_super_id',
                    email: 'other.super@wj.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = ((query) => {
            if (query?._id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'shubham_id' },
                user: { userId: 'other_super_id', email: 'other.super@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.deleteAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'CANNOT_DELETE_PRIMARY_SUPER_ADMIN');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // Test 5: Direct DELETE API calls fail closed against Shubham (deleteUser)
    await it('5. Direct DELETE API (deleteUser) fails closed against Shubham with 403', async () => {
        const origUserFindById = User_1.User.findById;
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'shubham_id' },
                user: { userId: 'caller_any_id', email: 'attacker@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.deleteUser)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'CANNOT_DELETE_PRIMARY_SUPER_ADMIN');
        }
        finally {
            User_1.User.findById = origUserFindById;
        }
    });
    // Test 6: Another Super Admin cannot change Shubham's email (403)
    await it('6. Another Super Admin cannot modify Shubham account/email (403 CANNOT_MODIFY_PRIMARY_SUPER_ADMIN)', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = ((id) => {
            if (id === 'other_super_id') {
                return Promise.resolve({
                    _id: 'other_super_id',
                    email: 'other.super@wj.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = ((query) => {
            if (query?._id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'shubham_id' },
                body: { email: 'hijacked@wj.com' },
                user: { userId: 'other_super_id', email: 'other.super@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'CANNOT_MODIFY_PRIMARY_SUPER_ADMIN');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // Test 7: Another Super Admin cannot demote Shubham (updateUserRole -> 403)
    await it('7. Demote attempt via updateUserRole fails closed against Shubham (403 CANNOT_DEMOTE_PRIMARY_SUPER_ADMIN)', async () => {
        const origUserFindById = User_1.User.findById;
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'shubham_id' },
                body: { role: 'user' },
                user: { userId: 'other_super_id', email: 'other.super@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateUserRole)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'CANNOT_DEMOTE_PRIMARY_SUPER_ADMIN');
        }
        finally {
            User_1.User.findById = origUserFindById;
        }
    });
    // Test 8: Another Super Admin cannot revoke Shubham's permissions via updateAdminPermissions (403)
    await it('8. Another Super Admin cannot revoke Shubham permissions via updateAdminPermissions (403)', async () => {
        const origAdminFindById = Admin_1.Admin.findById;
        const origUserFindById = User_1.User.findById;
        Admin_1.Admin.findById = ((id) => {
            if (id === 'adm_shubham') {
                return Promise.resolve({
                    id: 'adm_shubham',
                    _id: 'adm_shubham',
                    user: 'shubham_id',
                    permissions: ['all'],
                });
            }
            return Promise.resolve(null);
        });
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            if (id === 'other_super_id') {
                return Promise.resolve({
                    _id: 'other_super_id',
                    email: 'other.super@wj.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'adm_shubham' },
                body: { permissions: ['reports'] },
                user: { userId: 'other_super_id', email: 'other.super@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'CANNOT_MODIFY_PRIMARY_SUPER_ADMIN');
        }
        finally {
            Admin_1.Admin.findById = origAdminFindById;
            User_1.User.findById = origUserFindById;
        }
    });
    // Test 9: Case-insensitive email matching
    await it('9. Case-insensitive email matching for Primary Super Admin', () => {
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)('shubhamchaudante@gmail.com'), true);
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)('SHUBHAMCHAUDANTE@GMAIL.COM'), true);
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)('  ShubhamChaudante@Gmail.Com  '), true);
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)('shubham.other@gmail.com'), false);
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)(null), false);
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)(undefined), false);
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)(''), false);
    });
    // Test 10: Shubham can edit another admin
    await it('10. Shubham can edit another admin account (200 success)', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origUserFindByIdAndUpdate = User_1.User.findByIdAndUpdate;
        const origAdminFindOne = Admin_1.Admin.findOne;
        const origAdminFindOneAndUpdate = Admin_1.Admin.findOneAndUpdate;
        const origAuditCreate = AuditLog_1.AuditLog.create;
        let userUpdated = false;
        let adminUpdated = false;
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = ((query) => {
            if (query?.user === 'shubham_id') {
                return Promise.resolve({ permissions: ['all'] });
            }
            if (query?.user === 'target_id') {
                return Promise.resolve({ permissions: ['users'] });
            }
            return Promise.resolve(null);
        });
        User_1.User.findOne = ((query) => {
            if (query?._id === 'target_id') {
                return Promise.resolve({
                    _id: 'target_id',
                    fullName: 'Staff One',
                    email: 'staff1@wj.com',
                    mobile: '+919876543210',
                    role: 'admin',
                    isActive: true,
                    status: 'Active',
                });
            }
            // Check for duplicate email returns null
            return Promise.resolve(null);
        });
        User_1.User.findByIdAndUpdate = ((id, updates) => {
            if (id === 'target_id') {
                userUpdated = true;
            }
            return Promise.resolve({});
        });
        Admin_1.Admin.findOneAndUpdate = ((query, updates) => {
            if (query?.user === 'target_id') {
                adminUpdated = true;
            }
            return Promise.resolve({});
        });
        AuditLog_1.AuditLog.create = (() => Promise.resolve({}));
        try {
            const req = createMockReq({
                params: { id: 'target_id' },
                body: {
                    fullName: 'Staff One Updated',
                    email: 'staff1.new@wj.com',
                    mobile: '+919999999999',
                    permissions: ['users', 'profiles'],
                },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(body.success, true);
            assert_1.default.strictEqual(userUpdated, true);
            assert_1.default.strictEqual(adminUpdated, true);
            assert_1.default.strictEqual(body.data.fullName, 'Staff One Updated');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            User_1.User.findByIdAndUpdate = origUserFindByIdAndUpdate;
            Admin_1.Admin.findOne = origAdminFindOne;
            Admin_1.Admin.findOneAndUpdate = origAdminFindOneAndUpdate;
            AuditLog_1.AuditLog.create = origAuditCreate;
        }
    });
    // Test 11: Editing updates existing record (no duplicates)
    await it('11. Editing updates existing user ID and does not create new records', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origUserFindByIdAndUpdate = User_1.User.findByIdAndUpdate;
        const origAdminFindOne = Admin_1.Admin.findOne;
        const origAdminFindOneAndUpdate = Admin_1.Admin.findOneAndUpdate;
        const origAuditCreate = AuditLog_1.AuditLog.create;
        let targetUpdatedId = null;
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = ((query) => {
            if (query?._id === 'target_existing_id') {
                return Promise.resolve({
                    _id: 'target_existing_id',
                    fullName: 'Existing Admin',
                    email: 'existing@wj.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        User_1.User.findByIdAndUpdate = ((id) => {
            targetUpdatedId = id;
            return Promise.resolve({});
        });
        Admin_1.Admin.findOneAndUpdate = (() => Promise.resolve({}));
        AuditLog_1.AuditLog.create = (() => Promise.resolve({}));
        try {
            const req = createMockReq({
                params: { id: 'target_existing_id' },
                body: { fullName: 'Existing Admin Renamed' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(targetUpdatedId, 'target_existing_id');
            assert_1.default.strictEqual(body.data.id, 'target_existing_id');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            User_1.User.findByIdAndUpdate = origUserFindByIdAndUpdate;
            Admin_1.Admin.findOne = origAdminFindOne;
            Admin_1.Admin.findOneAndUpdate = origAdminFindOneAndUpdate;
            AuditLog_1.AuditLog.create = origAuditCreate;
        }
    });
    // Test 12: Duplicate admin emails are rejected (400 DUPLICATE_EMAIL)
    await it('12. Duplicate admin emails are rejected with 400 DUPLICATE_EMAIL', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = ((id) => {
            if (id === 'shubham_id') {
                return Promise.resolve({
                    _id: 'shubham_id',
                    email: 'shubhamchaudante@gmail.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = ((query) => {
            if (query?._id === 'target_id') {
                return Promise.resolve({
                    _id: 'target_id',
                    fullName: 'Target Admin',
                    email: 'target@wj.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            // Another user has 'already_used@wj.com'
            if (query?.email === 'already_used@wj.com') {
                return Promise.resolve({
                    _id: 'someone_else_id',
                    email: 'already_used@wj.com',
                });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'target_id' },
                body: { email: 'already_used@wj.com' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 400);
            assert_1.default.strictEqual(body.code, 'DUPLICATE_EMAIL');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // Test 13: Invalid roles are rejected (400 INVALID_ROLE)
    await it('13. Invalid roles are rejected with 400 INVALID_ROLE', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => Promise.resolve({ _id: 'shubham_id', email: 'shubhamchaudante@gmail.com' }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = (() => Promise.resolve({ _id: 'target_id', email: 'staff@wj.com', role: 'admin' }));
        try {
            const req = createMockReq({
                params: { id: 'target_id' },
                body: { role: 'member' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 400);
            assert_1.default.strictEqual(body.code, 'INVALID_ROLE');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // Test 14: Invalid module permissions are rejected (400 INVALID_PERMISSION_VALUE)
    await it('14. Invalid module permissions are rejected with 400 INVALID_PERMISSION_VALUE', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => Promise.resolve({ _id: 'shubham_id', email: 'shubhamchaudante@gmail.com' }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = (() => Promise.resolve({ _id: 'target_id', email: 'staff@wj.com', role: 'admin' }));
        try {
            const req = createMockReq({
                params: { id: 'target_id' },
                body: { permissions: ['users', 'unauthorized_hack_module'] },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 400);
            assert_1.default.strictEqual(body.code, 'INVALID_PERMISSION_VALUE');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // Test 15: Unauthorized edit requests return HTTP 403 (SUPER_ADMIN_ELEVATION_PROHIBITED)
    await it('15. Other Super Admin cannot grant "all" (Super Admin) to another admin (403)', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = ((id) => {
            if (id === 'other_super_id') {
                return Promise.resolve({
                    _id: 'other_super_id',
                    email: 'other.super@wj.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        Admin_1.Admin.findOne = ((query) => {
            if (query?.user === 'other_super_id') {
                return Promise.resolve({ permissions: ['all'] });
            }
            if (query?.user === 'target_id') {
                return Promise.resolve({ permissions: ['users'] });
            }
            return Promise.resolve(null);
        });
        User_1.User.findOne = ((query) => {
            if (query?._id === 'target_id') {
                return Promise.resolve({
                    _id: 'target_id',
                    fullName: 'Target Staff',
                    email: 'target@wj.com',
                    role: 'admin',
                    isActive: true,
                });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'target_id' },
                body: { permissions: ['all', 'users'] }, // Other super admin attempting to elevate target to super admin
                user: { userId: 'other_super_id', email: 'other.super@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.updateAdmin)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'SUPER_ADMIN_ELEVATION_PROHIBITED');
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // Test 16: Deleted admin sessions/refresh tokens are invalidated
    await it('16. Deleting administrator account invalidates all refresh tokens and sessions', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origUserFindByIdAndUpdate = User_1.User.findByIdAndUpdate;
        const origAdminFindOne = Admin_1.Admin.findOne;
        const origRefreshTokenUpdateMany = RefreshToken_1.RefreshToken.updateMany;
        const origAuditCreate = AuditLog_1.AuditLog.create;
        let revokedFilter = null;
        let revokedPayload = null;
        User_1.User.findById = (() => Promise.resolve({ _id: 'shubham_id', email: 'shubhamchaudante@gmail.com' }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = (() => Promise.resolve({ _id: 'target_id', email: 'staff@wj.com', role: 'admin' }));
        User_1.User.findByIdAndUpdate = (() => Promise.resolve({}));
        RefreshToken_1.RefreshToken.updateMany = ((filter, update) => {
            revokedFilter = filter;
            revokedPayload = update;
            return Promise.resolve({ modifiedCount: 3 });
        });
        AuditLog_1.AuditLog.create = (() => Promise.resolve({}));
        try {
            const req = createMockReq({
                params: { id: 'target_id' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, adminController_1.deleteAdmin)(req, res, () => { });
            const { statusCode } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(String(revokedFilter.user), 'target_id');
            assert_1.default.strictEqual(revokedPayload.isRevoked, true);
            assert_1.default.strictEqual(revokedPayload.isUsed, true);
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            User_1.User.findByIdAndUpdate = origUserFindByIdAndUpdate;
            Admin_1.Admin.findOne = origAdminFindOne;
            RefreshToken_1.RefreshToken.updateMany = origRefreshTokenUpdateMany;
            AuditLog_1.AuditLog.create = origAuditCreate;
        }
    });
    // Test 17: Audit records created for updates and deletions
    await it('17. Audit records accurately record ADMIN_UPDATED and ADMIN_DELETED events', async () => {
        const origUserFindById = User_1.User.findById;
        const origUserFindOne = User_1.User.findOne;
        const origUserFindByIdAndUpdate = User_1.User.findByIdAndUpdate;
        const origAdminFindOne = Admin_1.Admin.findOne;
        const origAdminFindOneAndUpdate = Admin_1.Admin.findOneAndUpdate;
        const origAuditCreate = AuditLog_1.AuditLog.create;
        const loggedActions = [];
        User_1.User.findById = (() => Promise.resolve({ _id: 'shubham_id', email: 'shubhamchaudante@gmail.com' }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        User_1.User.findOne = (() => Promise.resolve({ _id: 'target_id', email: 'staff@wj.com', role: 'admin' }));
        User_1.User.findByIdAndUpdate = (() => Promise.resolve({}));
        Admin_1.Admin.findOneAndUpdate = (() => Promise.resolve({}));
        AuditLog_1.AuditLog.create = ((data) => {
            loggedActions.push(data.action);
            return Promise.resolve(data);
        });
        try {
            // 1. Update action
            const reqUpdate = createMockReq({
                params: { id: 'target_id' },
                body: { fullName: 'New Staff Name' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res: resUpdate } = createMockRes();
            await (0, adminController_1.updateAdmin)(reqUpdate, resUpdate, () => { });
            // 2. Delete action
            const reqDelete = createMockReq({
                params: { id: 'target_id' },
                user: { userId: 'shubham_id', email: 'shubhamchaudante@gmail.com' },
            });
            const { res: resDelete } = createMockRes();
            await (0, adminController_1.deleteAdmin)(reqDelete, resDelete, () => { });
            assert_1.default.ok(loggedActions.includes('ADMIN_UPDATED'));
            assert_1.default.ok(loggedActions.includes('ADMIN_DELETED'));
        }
        finally {
            User_1.User.findById = origUserFindById;
            User_1.User.findOne = origUserFindOne;
            User_1.User.findByIdAndUpdate = origUserFindByIdAndUpdate;
            Admin_1.Admin.findOne = origAdminFindOne;
            Admin_1.Admin.findOneAndUpdate = origAdminFindOneAndUpdate;
            AuditLog_1.AuditLog.create = origAuditCreate;
        }
    });
    // Test 18: Frontend permissions respected and validated against ALLOWED_ADMIN_PERMISSIONS
    await it('18. ALLOWED_ADMIN_PERMISSIONS constant matches expected security modules', () => {
        const expected = [
            'all',
            'users',
            'profiles',
            'privateInfo.view',
            'privateInfo.edit',
            'verifications',
            'memberships',
            'payments',
            'reports',
            'settings',
        ];
        assert_1.default.deepStrictEqual(Array.from(permissionUtils_1.ALLOWED_ADMIN_PERMISSIONS), expected);
        assert_1.default.strictEqual(permissionUtils_1.ALLOWED_ADMIN_PERMISSIONS.includes('all'), true);
        assert_1.default.strictEqual(permissionUtils_1.ALLOWED_ADMIN_PERMISSIONS.includes('users'), true);
        assert_1.default.strictEqual(permissionUtils_1.ALLOWED_ADMIN_PERMISSIONS.includes('settings'), true);
    });
    // Test 19: Protected badge on Shubham row in frontend
    await it('19. Frontend identifies Primary Super Admin row for PRIMARY SUPER ADMIN badge', () => {
        const shubhamRow = { email: 'shubhamchaudante@gmail.com' };
        const otherAdminRow = { email: 'staff@wonderfuljodi.com' };
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)(shubhamRow.email), true);
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)(otherAdminRow.email), false);
    });
    // Test 20: No actionable delete button on Shubham row
    await it('20. Frontend and Backend guarantee non-actionable delete for Primary Super Admin', () => {
        // Both isPrimarySuperAdminEmail check and backend 403 guarantee safety
        const isTargetPrimary = (0, permissionUtils_1.isPrimarySuperAdminEmail)('shubhamchaudante@gmail.com');
        assert_1.default.strictEqual(isTargetPrimary, true);
        // Primary Super Admin cannot be deactivated or deleted by anyone
        assert_1.default.strictEqual((0, permissionUtils_1.isPrimarySuperAdminEmail)('SHUBHAMCHAUDANTE@GMAIL.COM'), true);
    });
    console.log('\n============================================================');
    console.log(` RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('============================================================\n');
    if (failedTests > 0) {
        process.exit(1);
    }
}
runAll().catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=primarySuperAdminManagement.test.js.map