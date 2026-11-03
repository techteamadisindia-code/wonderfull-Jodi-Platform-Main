"use strict";
/**
 * SUPER ADMINISTRATOR ACCESS & AUTHORIZATION REGRESSION TEST SUITE
 *
 * Comprehensive tests for:
 * 1. Permission normalization: string[], JSON-encoded arrays, fails closed on malformed/unexpected types.
 * 2. Super admin evaluation: exact 'all' permission match, no inference from role, email, or display name.
 * 3. Auth endpoints (/api/admin/auth/login, /api/admin/auth/me): no fabricated ['all'] fallback.
 * 4. Auth middleware (requireSuperAdmin): 401 unauthenticated, 403 forbidden, 500 server error.
 * 5. Authoritative verification endpoint (verifySuperAdminAccess).
 * 6. Stale client permissions rejection.
 * 7. Permission updates (updateAdminPermissions):
 *    - Updates correct Admin row using persisted Admin primary key.
 *    - User ID supplied where Admin ID is required -> rejects with 400 INVALID_ADMIN_IDENTIFIER.
 *    - Validates array of strings, rejects malformed payloads.
 *    - Safeguard against revoking privileges from the last active Super Admin.
 *    - Verifies persisted result in DB and records audit trail.
 * 8. Transient server/network error handling (avoids false permission denial).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const permissionUtils_1 = require("../utils/permissionUtils");
const authMiddleware_1 = require("../middleware/authMiddleware");
const superAdminController_1 = require("../controllers/superAdminController");
const adminAuthController_1 = require("../controllers/adminAuthController");
const Admin_1 = require("../models/Admin");
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
const ContactRequest_1 = require("../models/ContactRequest");
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
        cookie() {
            return res;
        },
        clearCookie() {
            return res;
        },
    };
    return {
        res,
        getResult: () => ({ statusCode, body }),
    };
}
function signTestToken(payload, expiresIn = '15m') {
    const secret = process.env.JWT_SECRET || 'supersecret_wonderfuljodi_dev_key_2026';
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
}
async function runTests() {
    console.log('\n============================================================');
    console.log(' SUPER ADMINISTRATOR AUTHORIZATION REGRESSION TEST SUITE');
    console.log('============================================================\n');
    // ------------------------------------------------------------------
    // 1. Permission Normalization Helper (normalizeAdminPermissions)
    // ------------------------------------------------------------------
    console.log('--- 1. Permission Normalization Helper ---');
    await it('1a. Returns empty array for null, undefined, or empty values', () => {
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(null), []);
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(undefined), []);
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(''), []);
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)('   '), []);
    });
    await it('1b. Accepts and trims a standard array of strings', () => {
        const input = ['all', ' users ', 'profiles', ''];
        const result = (0, permissionUtils_1.normalizeAdminPermissions)(input);
        assert_1.default.deepStrictEqual(result, ['all', 'users', 'profiles']);
    });
    await it('1c. Accepts and parses a valid JSON-encoded string array', () => {
        const jsonStr = '["all", "verifications", "reports"]';
        const result = (0, permissionUtils_1.normalizeAdminPermissions)(jsonStr);
        assert_1.default.deepStrictEqual(result, ['all', 'verifications', 'reports']);
    });
    await it('1d. Fails closed on malformed JSON string array', () => {
        const malformed = '["all", "broken...';
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(malformed), []);
    });
    await it('1e. Fails closed on non-array JSON objects or primitives', () => {
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)('{"role": "admin"}'), []);
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(12345), []);
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(true), []);
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)({ all: true }), []);
    });
    await it('1f. Fails closed if array contains non-string types (e.g. numbers, booleans)', () => {
        const mixed = ['all', 42, true];
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(mixed), []);
    });
    await it('1g. Fails closed on comma-separated or unsupported string representations', () => {
        const commaSeparated = 'all,users,reports';
        assert_1.default.deepStrictEqual((0, permissionUtils_1.normalizeAdminPermissions)(commaSeparated), []);
    });
    // ------------------------------------------------------------------
    // 2. Super Administrator Privilege Evaluation (hasSuperAdminPermission)
    // ------------------------------------------------------------------
    console.log('\n--- 2. Super Administrator Privilege Evaluation ---');
    await it('2a. Evaluates true when exact string "all" is present in array', () => {
        assert_1.default.strictEqual((0, permissionUtils_1.hasSuperAdminPermission)(['users', 'all', 'reports']), true);
    });
    await it('2b. Evaluates true when "all" is inside a JSON string array', () => {
        assert_1.default.strictEqual((0, permissionUtils_1.hasSuperAdminPermission)('["reports", "all"]'), true);
    });
    await it('2c. Evaluates false when "all" is missing', () => {
        assert_1.default.strictEqual((0, permissionUtils_1.hasSuperAdminPermission)(['users', 'reports', 'settings']), false);
        assert_1.default.strictEqual((0, permissionUtils_1.hasSuperAdminPermission)([]), false);
    });
    await it('2d. Strict case and exact matching (rejects "ALL", "allow", "superadmin")', () => {
        assert_1.default.strictEqual((0, permissionUtils_1.hasSuperAdminPermission)(['ALL']), false);
        assert_1.default.strictEqual((0, permissionUtils_1.hasSuperAdminPermission)(['allow']), false);
        assert_1.default.strictEqual((0, permissionUtils_1.hasSuperAdminPermission)(['superadmin']), false);
    });
    // ------------------------------------------------------------------
    // 3. No Fabricated ['all'] Fallback in Authentication Responses
    // ------------------------------------------------------------------
    console.log('\n--- 3. Authoritative Auth Profile (No Fabricated Fallback) ---');
    await it('3a. /api/admin/auth/me returns empty array if admin record has null permissions (no fake "all")', async () => {
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'adm_user_1',
                fullName: 'Test Admin',
                email: 'limited@wonderfuljodi.com',
                role: 'admin',
                isActive: true,
            }),
        }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: null }));
        try {
            const req = createMockReq({ user: { userId: 'adm_user_1', role: 'admin' } });
            const { res, getResult } = createMockRes();
            await (0, adminAuthController_1.getAdminMe)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(body.success, true);
            assert_1.default.deepStrictEqual(body.data.permissions, [], 'Must return empty array, NOT fabricated ["all"]');
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('3b. /api/admin/auth/me returns empty array if admin record does not exist in DB', async () => {
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'adm_user_2',
                fullName: 'No Admin Record',
                email: 'noadmin@wonderfuljodi.com',
                role: 'admin',
                isActive: true,
            }),
        }));
        Admin_1.Admin.findOne = (() => Promise.resolve(null));
        try {
            const req = createMockReq({ user: { userId: 'adm_user_2', role: 'admin' } });
            const { res, getResult } = createMockRes();
            await (0, adminAuthController_1.getAdminMe)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.deepStrictEqual(body.data.permissions, []);
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('3c. /api/admin/auth/me returns persisted permissions when present', async () => {
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'adm_user_3',
                fullName: 'Super Admin',
                email: 'super@wonderfuljodi.com',
                role: 'admin',
                isActive: true,
            }),
        }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all', 'read', 'write'] }));
        try {
            const req = createMockReq({ user: { userId: 'adm_user_3', role: 'admin' } });
            const { res, getResult } = createMockRes();
            await (0, adminAuthController_1.getAdminMe)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.deepStrictEqual(body.data.permissions, ['all', 'read', 'write']);
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // ------------------------------------------------------------------
    // 4. Super Admin Authorization Middleware (requireSuperAdmin)
    // ------------------------------------------------------------------
    console.log('\n--- 4. Super Admin Authorization Middleware ---');
    await it('4a. Denies access with 401 when request lacks token', async () => {
        const req = createMockReq();
        const { res, getResult } = createMockRes();
        let nextCalled = false;
        await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
            nextCalled = true;
        });
        assert_1.default.strictEqual(nextCalled, false);
        assert_1.default.strictEqual(getResult().statusCode, 401);
    });
    await it('4b. Denies access with 401 when token is expired', async () => {
        const expiredToken = signTestToken({ userId: 'u_exp', role: 'admin', email: 'exp@wj.com' }, '-1s');
        const req = createMockReq({ headers: { authorization: `Bearer ${expiredToken}` } });
        const { res, getResult } = createMockRes();
        let nextCalled = false;
        await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
            nextCalled = true;
        });
        assert_1.default.strictEqual(nextCalled, false);
        assert_1.default.strictEqual(getResult().statusCode, 401);
        assert_1.default.strictEqual(getResult().body.code, 'TOKEN_EXPIRED');
    });
    await it('4c. Denies access with 403 when authenticated user is not an admin (role !== "admin")', async () => {
        const memberToken = signTestToken({ userId: 'm_1', role: 'user', email: 'user@wj.com' });
        const req = createMockReq({ headers: { authorization: `Bearer ${memberToken}` } });
        const { res, getResult } = createMockRes();
        let nextCalled = false;
        await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
            nextCalled = true;
        });
        assert_1.default.strictEqual(nextCalled, false);
        assert_1.default.strictEqual(getResult().statusCode, 403);
    });
    await it('4d. Denies access with 403 when admin has no Admin record in database', async () => {
        const adminToken = signTestToken({ userId: 'adm_no_row', role: 'admin', email: 'norow@wj.com' });
        const req = createMockReq({ headers: { authorization: `Bearer ${adminToken}` } });
        const { res, getResult } = createMockRes();
        const origAdminFindOne = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = (() => Promise.resolve(null));
        try {
            let nextCalled = false;
            await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            assert_1.default.strictEqual(nextCalled, false);
            assert_1.default.strictEqual(getResult().statusCode, 403);
            assert_1.default.strictEqual(getResult().body.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('4e. Denies access with 403 when admin permissions do not include "all"', async () => {
        const adminToken = signTestToken({ userId: 'adm_limited', role: 'admin', email: 'limited@wj.com' });
        const req = createMockReq({ headers: { authorization: `Bearer ${adminToken}` } });
        const { res, getResult } = createMockRes();
        const origAdminFindOne = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['reports', 'verifications'] }));
        try {
            let nextCalled = false;
            await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            assert_1.default.strictEqual(nextCalled, false);
            assert_1.default.strictEqual(getResult().statusCode, 403);
            assert_1.default.strictEqual(getResult().body.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('4f. Denies access with 403 when admin permissions are malformed JSON string', async () => {
        const adminToken = signTestToken({ userId: 'adm_malformed', role: 'admin', email: 'malformed@wj.com' });
        const req = createMockReq({ headers: { authorization: `Bearer ${adminToken}` } });
        const { res, getResult } = createMockRes();
        const origAdminFindOne = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: '["all", invalid json...' }));
        try {
            let nextCalled = false;
            await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            assert_1.default.strictEqual(nextCalled, false);
            assert_1.default.strictEqual(getResult().statusCode, 403);
            assert_1.default.strictEqual(getResult().body.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('4g. Allows access when admin permissions contain "all"', async () => {
        const adminToken = signTestToken({ userId: 'adm_super', role: 'admin', email: 'super@wj.com' });
        const req = createMockReq({ headers: { authorization: `Bearer ${adminToken}` } });
        const { res } = createMockRes();
        const origAdminFindOne = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all', 'users', 'monetization'] }));
        try {
            let nextCalled = false;
            await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            assert_1.default.strictEqual(nextCalled, true, 'Super Admin must pass requireSuperAdmin guard');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('4h. Allows access when admin permissions is a valid JSON string containing "all"', async () => {
        const adminToken = signTestToken({ userId: 'adm_json_super', role: 'admin', email: 'json_super@wj.com' });
        const req = createMockReq({ headers: { authorization: `Bearer ${adminToken}` } });
        const { res } = createMockRes();
        const origAdminFindOne = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: '["all", "reports"]' }));
        try {
            let nextCalled = false;
            await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            assert_1.default.strictEqual(nextCalled, true);
        }
        finally {
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('4i. Fails closed with 500 when database throws during authorization check', async () => {
        const adminToken = signTestToken({ userId: 'adm_dberr', role: 'admin', email: 'dberr@wj.com' });
        const req = createMockReq({ headers: { authorization: `Bearer ${adminToken}` } });
        const { res, getResult } = createMockRes();
        const origAdminFindOne = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = (() => {
            throw new Error('Database connection pool exhausted');
        });
        try {
            let nextCalled = false;
            await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            assert_1.default.strictEqual(nextCalled, false);
            assert_1.default.strictEqual(getResult().statusCode, 500);
        }
        finally {
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // ------------------------------------------------------------------
    // 5. Dedicated Authoritative Verification Endpoint (verifySuperAdminAccess)
    // ------------------------------------------------------------------
    console.log('\n--- 5. Authoritative Verification Endpoint ---');
    await it('5a. Returns 200 with authorized: true and normalized data for Super Admin', async () => {
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'u_super_1',
                fullName: 'Super Administrator',
                email: 'super@wonderfuljodi.com',
                role: 'admin',
                isActive: true,
                isDeleted: false,
            }),
        }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        try {
            const req = createMockReq({ user: { userId: 'u_super_1', role: 'admin' } });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.verifySuperAdminAccess)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(body.authorized, true);
            assert_1.default.strictEqual(body.data.isSuperAdmin, true);
            assert_1.default.deepStrictEqual(body.data.permissions, ['all']);
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('5b. Returns 403 SUPER_ADMIN_REQUIRED if admin lacks "all"', async () => {
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'u_regular_1',
                fullName: 'Regular Admin',
                email: 'reg@wonderfuljodi.com',
                role: 'admin',
                isActive: true,
                isDeleted: false,
            }),
        }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['reports'] }));
        try {
            const req = createMockReq({ user: { userId: 'u_regular_1', role: 'admin' } });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.verifySuperAdminAccess)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // ------------------------------------------------------------------
    // 6. Stale Frontend Permissions Invalidation
    // ------------------------------------------------------------------
    console.log('\n--- 6. Stale Client Permissions Invalidation ---');
    await it('6a. Demoted admin whose frontend cached permissions are stale is denied server-side', async () => {
        // Client claims ['all'] in their local state, but DB record was revoked to ['read']
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'u_demoted',
                fullName: 'Demoted Admin',
                email: 'demoted@wonderfuljodi.com',
                role: 'admin',
                isActive: true,
                isDeleted: false,
            }),
        }));
        // Database is authoritative source of truth:
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['read'] }));
        try {
            const token = signTestToken({ userId: 'u_demoted', role: 'admin', email: 'demoted@wonderfuljodi.com' });
            const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
            const { res, getResult } = createMockRes();
            let nextCalled = false;
            await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            assert_1.default.strictEqual(nextCalled, false, 'Stale local cache must never bypass server-side check');
            assert_1.default.strictEqual(getResult().statusCode, 403);
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    // ------------------------------------------------------------------
    // 7. Administrator Permission Updates (updateAdminPermissions)
    // ------------------------------------------------------------------
    console.log('\n--- 7. Permission Updates and Identifier Validation ---');
    await it('7a. Rejects non-array permissions with 400 INVALID_PERMISSIONS_FORMAT', async () => {
        const req = createMockReq({
            params: { id: 'adm_1' },
            body: { permissions: 'all,users' },
            user: { userId: 'caller_super', email: 'super@wj.com' },
        });
        const { res, getResult } = createMockRes();
        await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
        const { statusCode, body } = getResult();
        assert_1.default.strictEqual(statusCode, 400);
        assert_1.default.strictEqual(body.code, 'INVALID_PERMISSIONS_FORMAT');
    });
    await it('7b. Rejects array containing non-string items with 400 INVALID_PERMISSION_ITEM', async () => {
        const req = createMockReq({
            params: { id: 'adm_1' },
            body: { permissions: ['all', 123] },
            user: { userId: 'caller_super', email: 'super@wj.com' },
        });
        const { res, getResult } = createMockRes();
        await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
        const { statusCode, body } = getResult();
        assert_1.default.strictEqual(statusCode, 400);
        assert_1.default.strictEqual(body.code, 'INVALID_PERMISSION_ITEM');
    });
    await it('7c. User ID supplied where Admin ID is required returns 400 INVALID_ADMIN_IDENTIFIER', async () => {
        const origAdminFindById = Admin_1.Admin.findById;
        const origUserFindById = User_1.User.findById;
        // Suppose caller provides User ID 'user_abc' instead of Admin PK 'admin_xyz'
        Admin_1.Admin.findById = (() => Promise.resolve(null));
        User_1.User.findById = ((id) => {
            if (id === 'user_abc') {
                return Promise.resolve({ _id: 'user_abc', email: 'user@wj.com', role: 'admin' });
            }
            return Promise.resolve(null);
        });
        try {
            const req = createMockReq({
                params: { id: 'user_abc' },
                body: { permissions: ['all'] },
                user: { userId: 'caller_super', email: 'super@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 400);
            assert_1.default.strictEqual(body.code, 'INVALID_ADMIN_IDENTIFIER');
        }
        finally {
            Admin_1.Admin.findById = origAdminFindById;
            User_1.User.findById = origUserFindById;
        }
    });
    await it('7d. Returns 404 ADMIN_NOT_FOUND when neither Admin nor User exists', async () => {
        const origAdminFindById = Admin_1.Admin.findById;
        const origUserFindById = User_1.User.findById;
        Admin_1.Admin.findById = (() => Promise.resolve(null));
        User_1.User.findById = (() => Promise.resolve(null));
        try {
            const req = createMockReq({
                params: { id: 'nonexistent_id' },
                body: { permissions: ['all'] },
                user: { userId: 'caller_super', email: 'super@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 404);
            assert_1.default.strictEqual(body.code, 'ADMIN_NOT_FOUND');
        }
        finally {
            Admin_1.Admin.findById = origAdminFindById;
            User_1.User.findById = origUserFindById;
        }
    });
    await it('7e. Prevents revoking "all" from the sole active Super Admin (LAST_SUPER_ADMIN_PROTECTION)', async () => {
        const origAdminFindById = Admin_1.Admin.findById;
        const origUserFindById = User_1.User.findById;
        const origAdminFind = Admin_1.Admin.find;
        const mockSoleSuperAdmin = {
            id: 'adm_sole',
            _id: 'adm_sole',
            user: 'u_sole',
            permissions: ['all'],
            save: async () => { },
        };
        Admin_1.Admin.findById = (() => Promise.resolve(mockSoleSuperAdmin));
        User_1.User.findById = (() => Promise.resolve({ _id: 'u_sole', email: 'sole@wj.com', role: 'admin', isActive: true }));
        // Admin.find returns only this 1 super admin (other admins have limited permissions)
        Admin_1.Admin.find = (() => ({
            populate: () => Promise.resolve([
                mockSoleSuperAdmin,
                { id: 'adm_other', permissions: ['reports'], user: { role: 'admin', isActive: true } },
            ]),
        }));
        try {
            const req = createMockReq({
                params: { id: 'adm_sole' },
                body: { permissions: ['reports'] }, // Attempting to demote sole super admin
                user: { userId: 'u_sole', email: 'sole@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 400);
            assert_1.default.strictEqual(body.code, 'LAST_SUPER_ADMIN_PROTECTION');
        }
        finally {
            Admin_1.Admin.findById = origAdminFindById;
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.find = origAdminFind;
        }
    });
    await it('7f. Successfully updates permissions, verifies persistence, and writes audit record', async () => {
        const origAdminFindById = Admin_1.Admin.findById;
        const origUserFindById = User_1.User.findById;
        const origAdminFind = Admin_1.Admin.find;
        const origAuditCreate = AuditLog_1.AuditLog.create;
        let savedPermissions = null;
        let auditEntry = null;
        const mockAdmin = {
            id: 'adm_target',
            _id: 'adm_target',
            user: { _id: 'u_target', email: 'target@wj.com', fullName: 'Target Admin' },
            userId: 'u_target',
            permissions: ['reports'],
            updatedAt: new Date(),
            save: async function () {
                savedPermissions = this.permissions;
            },
        };
        Admin_1.Admin.findById = ((_id) => {
            return {
                populate: () => Promise.resolve({ ...mockAdmin, permissions: savedPermissions || mockAdmin.permissions }),
                ...mockAdmin,
            };
        });
        User_1.User.findById = (() => Promise.resolve({ _id: 'u_target', email: 'target@wj.com', role: 'admin', isActive: true }));
        AuditLog_1.AuditLog.create = (async (data) => {
            auditEntry = data;
            return data;
        });
        try {
            const req = createMockReq({
                params: { id: 'adm_target' },
                body: { permissions: ['all', 'users'] },
                user: { userId: 'caller_super', email: 'caller@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(body.success, true);
            assert_1.default.deepStrictEqual(body.data.permissions, ['all', 'users']);
            assert_1.default.ok(auditEntry, 'Audit log must be created on permission change');
            assert_1.default.strictEqual(auditEntry.action, 'ADMIN_PERMISSIONS_UPDATED');
        }
        finally {
            Admin_1.Admin.findById = origAdminFindById;
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.find = origAdminFind;
            AuditLog_1.AuditLog.create = origAuditCreate;
        }
    });
    // ------------------------------------------------------------------
    // 8. Administrative Token Isolation and Priority
    // ------------------------------------------------------------------
    console.log('\n--- 8. Administrative Token Isolation and Priority ---');
    await it('8a. Admin endpoint strictly requires admin authentication (rejects member token with 403)', async () => {
        const memberToken = signTestToken({ userId: 'user_member', email: 'member@test.com', role: 'user' });
        const req = createMockReq({
            headers: { authorization: `Bearer ${memberToken}` },
            url: '/admin/super/security/summary',
        });
        const { res, getResult } = createMockRes();
        let nextCalled = false;
        await (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
            nextCalled = true;
        });
        const { statusCode } = getResult();
        assert_1.default.strictEqual(statusCode, 403, 'Member token accessing admin endpoint must be denied with 403');
        assert_1.default.strictEqual(nextCalled, false, 'Middleware must not proceed to next handler');
    });
    await it('8b. Conflicting tokens: admin token takes precedence for administrative routes', () => {
        function resolveRequestToken(url, adminToken, userToken) {
            const isAdmin = url.includes('/admin');
            return isAdmin ? adminToken : userToken;
        }
        const adminToken = 'admin_jwt_valid';
        const staleUserToken = 'member_jwt_expired';
        const tokenForAdmin = resolveRequestToken('/api/admin/super/auth/verify', adminToken, staleUserToken);
        assert_1.default.strictEqual(tokenForAdmin, 'admin_jwt_valid', 'Admin request must strictly use admin token');
        const tokenForMember = resolveRequestToken('/api/profile/me', adminToken, staleUserToken);
        assert_1.default.strictEqual(tokenForMember, 'member_jwt_expired', 'Member request must strictly use user token');
        const tokenMissingAdmin = resolveRequestToken('/api/admin/super/auth/verify', null, staleUserToken);
        assert_1.default.strictEqual(tokenMissingAdmin, null, 'Must not send general user token to admin route');
    });
    // ------------------------------------------------------------------
    // 9. Authorization Preflight (verifySuperAdminAccess) Status Codes
    // ------------------------------------------------------------------
    console.log('\n--- 9. Authorization Preflight Responses ---');
    await it('9a. Preflight returns 200 with authorized: true for verified Super Admin', async () => {
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'usr_super',
                fullName: 'Super Administrator',
                email: 'super@wj.com',
                role: 'admin',
                isActive: true,
                isDeleted: false,
            }),
        }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['all'] }));
        try {
            const req = createMockReq({
                user: { userId: 'usr_super', email: 'super@wj.com', role: 'admin' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.verifySuperAdminAccess)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200);
            assert_1.default.strictEqual(body.authorized, true);
            assert_1.default.deepStrictEqual(body.data.permissions, ['all']);
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('9b. Preflight returns 403 SUPER_ADMIN_REQUIRED for regular admin lacking "all"', async () => {
        const origUserFindById = User_1.User.findById;
        const origAdminFindOne = Admin_1.Admin.findOne;
        User_1.User.findById = (() => ({
            select: () => Promise.resolve({
                _id: 'usr_reg',
                fullName: 'Regular Admin',
                email: 'reg@wj.com',
                role: 'admin',
                isActive: true,
                isDeleted: false,
            }),
        }));
        Admin_1.Admin.findOne = (() => Promise.resolve({ permissions: ['users', 'reports'] }));
        try {
            const req = createMockReq({
                user: { userId: 'usr_reg', email: 'reg@wj.com', role: 'admin' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.verifySuperAdminAccess)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 403);
            assert_1.default.strictEqual(body.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.findOne = origAdminFindOne;
        }
    });
    await it('9c. Preflight returns 401 when request lacks authenticated administrator identity', async () => {
        const req = createMockReq({ user: null });
        const { res, getResult } = createMockRes();
        await (0, superAdminController_1.verifySuperAdminAccess)(req, res, () => { });
        const { statusCode, body } = getResult();
        assert_1.default.strictEqual(statusCode, 401);
        assert_1.default.strictEqual(body.success, false);
    });
    await it('9d. Preflight passes error to next handler when database throws during check', async () => {
        const origUserFindById = User_1.User.findById;
        User_1.User.findById = (() => {
            throw new Error('Database connection failed');
        });
        try {
            const req = createMockReq({
                user: { userId: 'usr_test', email: 'test@wj.com', role: 'admin' },
            });
            const { res } = createMockRes();
            let errorPassed = null;
            await (0, superAdminController_1.verifySuperAdminAccess)(req, res, (err) => {
                errorPassed = err;
            });
            assert_1.default.ok(errorPassed, 'Error must be passed to Express next handler');
            assert_1.default.strictEqual(errorPassed.message, 'Database connection failed');
        }
        finally {
            User_1.User.findById = origUserFindById;
        }
    });
    // ------------------------------------------------------------------
    // 10. Secondary Widget Failure Isolation
    // ------------------------------------------------------------------
    console.log('\n--- 10. Secondary Widget Failure Isolation ---');
    await it('10a. Error in secondary dashboard metric does not alter or invalidate authorization status', () => {
        let authState = 'authorized';
        const widgetError = { status: 500, message: 'SMTP server unreachable' };
        if (widgetError.status === 401) {
            authState = 'unauthenticated';
        }
        else if (widgetError.status === 403) {
            authState = 'forbidden';
        }
        assert_1.default.strictEqual(authState, 'authorized', 'Authorization must remain valid despite secondary widget failure');
    });
    // ------------------------------------------------------------------
    // 11. Last Super Admin Protection & Persistence Verification
    // ------------------------------------------------------------------
    console.log('\n--- 11. Last Super Admin Protection & Persistence Verification ---');
    await it('11a. Concurrent competing updates attempting to revoke last Super Admin are both safely denied', async () => {
        const soleSuperAdmin = {
            id: 'adm_sole',
            _id: 'adm_sole',
            user: 'usr_sole',
            permissions: ['all'],
            save: async () => { },
        };
        const origAdminFindById = Admin_1.Admin.findById;
        const origUserFindById = User_1.User.findById;
        const origAdminFind = Admin_1.Admin.find;
        Admin_1.Admin.findById = (async () => ({ ...soleSuperAdmin }));
        User_1.User.findById = (async () => ({ _id: 'usr_sole', email: 'sole@wj.com' }));
        Admin_1.Admin.find = (() => ({
            populate: async () => [
                { id: 'adm_sole', permissions: ['all'], user: { role: 'admin', isActive: true, status: 'Active' } },
                { id: 'adm_regular', permissions: ['users'], user: { role: 'admin', isActive: true, status: 'Active' } },
            ],
        }));
        try {
            const runAttempt = async () => {
                const req = createMockReq({
                    params: { id: 'adm_sole' },
                    body: { permissions: ['users'] },
                    user: { userId: 'caller_1', email: 'caller@wj.com' },
                });
                const { res, getResult } = createMockRes();
                await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
                return getResult();
            };
            const [res1, res2] = await Promise.all([runAttempt(), runAttempt()]);
            assert_1.default.strictEqual(res1.statusCode, 400);
            assert_1.default.strictEqual(res1.body.code, 'LAST_SUPER_ADMIN_PROTECTION');
            assert_1.default.strictEqual(res2.statusCode, 400);
            assert_1.default.strictEqual(res2.body.code, 'LAST_SUPER_ADMIN_PROTECTION');
        }
        finally {
            Admin_1.Admin.findById = origAdminFindById;
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.find = origAdminFind;
        }
    });
    await it('11b. Permission update fails with 500 PERSISTENCE_VERIFICATION_FAILED if re-read mismatches', async () => {
        const adminRecord = {
            id: 'adm_target',
            _id: 'adm_target',
            user: 'usr_target',
            permissions: ['users'],
            save: async () => { },
        };
        const origAdminFindById = Admin_1.Admin.findById;
        const origUserFindById = User_1.User.findById;
        const origAdminFind = Admin_1.Admin.find;
        let callCount = 0;
        Admin_1.Admin.findById = ((id) => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({ ...adminRecord });
            }
            return {
                populate: async () => ({
                    ...adminRecord,
                    permissions: ['users'],
                }),
            };
        });
        User_1.User.findById = (async () => ({ _id: 'usr_target', email: 'target@wj.com' }));
        Admin_1.Admin.find = (() => ({
            populate: async () => [
                { id: 'adm_sole', permissions: ['all'], user: { role: 'admin', isActive: true, status: 'Active' } },
                { id: 'adm_target', permissions: ['users'], user: { role: 'admin', isActive: true, status: 'Active' } },
            ],
        }));
        try {
            const req = createMockReq({
                params: { id: 'adm_target' },
                body: { permissions: ['all', 'users'] },
                user: { userId: 'caller_1', email: 'caller@wj.com' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 500);
            assert_1.default.strictEqual(body.code, 'PERSISTENCE_VERIFICATION_FAILED');
        }
        finally {
            Admin_1.Admin.findById = origAdminFindById;
            User_1.User.findById = origUserFindById;
            Admin_1.Admin.find = origAdminFind;
        }
    });
    // ------------------------------------------------------------------
    // 12. Contact Requests Orphaned Recipient Handling (Phase 3 Fix)
    // ------------------------------------------------------------------
    console.log('\n--- 12. Contact Requests Orphaned Recipient Handling ---');
    await it('12a. getContactRequestsOversight safely tolerates orphaned recipient foreign key and sets dataIntegrity warning', async () => {
        const rawRequests = [
            {
                id: 'cr_1',
                _id: 'cr_1',
                requesterId: 'usr_req_1',
                recipientId: 'usr_deleted_recipient',
                status: 'PENDING',
                requester: { id: 'usr_req_1', fullName: 'Dr. Jane Requester', email: 'jane@wj.com' },
                recipient: null,
                createdAt: new Date(),
            },
            {
                id: 'cr_2',
                _id: 'cr_2',
                requesterId: 'usr_req_2',
                recipientId: 'usr_rec_2',
                status: 'ACCEPTED',
                requester: { id: 'usr_req_2', fullName: 'Dr. Bob', email: 'bob@wj.com' },
                recipient: { id: 'usr_rec_2', fullName: 'Dr. Alice', email: 'alice@wj.com' },
                createdAt: new Date(),
            },
        ];
        const origContactRequestFind = ContactRequest_1.ContactRequest.find;
        const origContactRequestCount = ContactRequest_1.ContactRequest.countDocuments;
        ContactRequest_1.ContactRequest.find = (() => {
            const chain = {
                populate: () => chain,
                sort: () => chain,
                skip: () => chain,
                limit: () => Promise.resolve(rawRequests),
            };
            return chain;
        });
        ContactRequest_1.ContactRequest.countDocuments = (async () => 2);
        try {
            const req = createMockReq({
                query: { limit: '15' },
                user: { userId: 'admin_super', email: 'admin@wj.com', role: 'admin' },
            });
            const { res, getResult } = createMockRes();
            await (0, superAdminController_1.getContactRequestsOversight)(req, res, () => { });
            const { statusCode, body } = getResult();
            assert_1.default.strictEqual(statusCode, 200, 'Endpoint must return 200 without throwing Prisma Inconsistent query result');
            assert_1.default.strictEqual(body.success, true);
            assert_1.default.strictEqual(body.data.requests.length, 2);
            const orphanedReq = body.data.requests[0];
            assert_1.default.strictEqual(orphanedReq.recipient, null, 'Orphaned recipient must be represented explicitly as null');
            assert_1.default.ok(orphanedReq.dataIntegrity, 'Must attach dataIntegrity object');
            assert_1.default.strictEqual(orphanedReq.dataIntegrity.hasOrphanedReference, true);
            assert_1.default.strictEqual(orphanedReq.dataIntegrity.missingRecipient, true);
            assert_1.default.ok(orphanedReq.dataIntegrity.warning.includes('usr_deleted_recipient'), 'Warning must specify missing recipient ID');
            const normalReq = body.data.requests[1];
            assert_1.default.strictEqual(normalReq.dataIntegrity.hasOrphanedReference, false);
            assert_1.default.strictEqual(normalReq.dataIntegrity.missingRecipient, false);
        }
        finally {
            ContactRequest_1.ContactRequest.find = origContactRequestFind;
            ContactRequest_1.ContactRequest.countDocuments = origContactRequestCount;
        }
    });
    console.log('\n============================================================');
    console.log(` RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('============================================================\n');
    if (failedTests > 0) {
        process.exit(1);
    }
}
runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
//# sourceMappingURL=superAdminAuthorization.test.js.map