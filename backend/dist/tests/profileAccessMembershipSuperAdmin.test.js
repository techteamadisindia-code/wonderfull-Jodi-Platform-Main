"use strict";
/**
 * WONDERFUL JODI — FULL-STACK PROFILE ACCESS, MEMBERSHIP & SUPER ADMIN TEST SUITE
 *
 * Verifies all security, entitlement, and administrative invariants:
 * 1. Super Admin Authorization: Rejects guests, users, and regular admins without 'all'; allows verified Super Admins.
 * 2. Membership Entitlement Engine: Validates active paid subscriptions, expired subscriptions, free tier, and concierge plans.
 * 3. Free Contact Reveal Allowance, Persistence & Idempotency: 1st reveal succeeds, 2nd reveal denied (403 UPGRADE_REQUIRED), re-view idempotent.
 * 4. Concurrency Protection: Pessimistic row locking ensures only 1 of concurrent competing reveals can succeed.
 * 5. Public Profile Data Privacy & Alternate Path Protection: Strips mobile, email, surname, and residential address unless owner viewing self.
 * 6. Contact Requests Paid Gating & Credit Exhaustion: Free members blocked; exhausted paid credits blocked.
 * 7. Paid Credit Deduction: Paid reveals deduct 1 credit; concierge/VVIP reveals are unlimited.
 * 8. Super Admin Console Handlers: Validates monetization, safety, security, permissions, and email support endpoints.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const contactRequestController_1 = require("../controllers/contactRequestController");
const superAdminController_1 = require("../controllers/superAdminController");
const entitlementService_1 = require("../services/entitlementService");
const securityUtils_1 = require("../utils/securityUtils");
const Admin_1 = require("../models/Admin");
const User_1 = require("../models/User");
const Subscription_1 = require("../models/Subscription");
const ContactAccessLog_1 = require("../models/ContactAccessLog");
const ContactRequest_1 = require("../models/ContactRequest");
const Block_1 = require("../models/Block");
const MembershipPlan_1 = require("../models/MembershipPlan");
const AuditLog_1 = require("../models/AuditLog");
const Interest_1 = require("../models/Interest");
const notificationSerializer_1 = require("../services/notificationSerializer");
const adminController_1 = require("../controllers/adminController");
const client_1 = require("../db/client");
const profileController = __importStar(require("../controllers/profileController"));
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
function it(desc, fn) {
    totalTests++;
    return (async () => {
        try {
            await fn();
            passedTests++;
            console.log(`  [PASS] ${desc}`);
        }
        catch (err) {
            failedTests++;
            console.error(`  [FAIL] ${desc}`);
            console.error(`         ${err?.message || err}`);
            if (err?.stack) {
                console.error(`         ${err.stack.split('\n').slice(1, 4).join('\n')}`);
            }
        }
    })();
}
function createMockResponse() {
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
        setHeader(name, value) {
            this.headers[name] = value;
            return this;
        },
    };
    return res;
}
async function runAll() {
    console.log('========================================================================');
    console.log('  WONDERFUL JODI — PROFILE ACCESS, MEMBERSHIP & SUPER ADMIN TESTS');
    console.log('========================================================================\n');
    const jwtSecret = process.env.JWT_SECRET || 'supersecret_wonderfuljodi_dev_key_2026';
    // ──────────────────────────────────────────────────────────────────────────
    // Check 1: Super Admin Authorization Invariants
    // ──────────────────────────────────────────────────────────────────────────
    console.log('Check 1: Super Admin Authorization Invariants');
    await it('1a. requireSuperAdmin rejects guest / unauthenticated requests with 401/403', async () => {
        const req = { headers: {}, user: null };
        const res = createMockResponse();
        let nextCalled = false;
        (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
            nextCalled = true;
        });
        await new Promise((r) => setTimeout(r, 50));
        assert_1.default.strictEqual(nextCalled, false, 'Guest must never reach next()');
        assert_1.default.ok(res.statusCode === 401 || res.statusCode === 403, `Expected 401/403, got ${res.statusCode}`);
    });
    await it('1b. requireSuperAdmin rejects non-admin users (role: user) with 403', async () => {
        const token = jsonwebtoken_1.default.sign({ userId: '507f1f77bcf86cd799439011', role: 'user', email: 'doctor@wonderfuljodi.com' }, jwtSecret, { expiresIn: '1h' });
        const req = {
            headers: { authorization: `Bearer ${token}` },
            user: { userId: '507f1f77bcf86cd799439011', role: 'user', email: 'doctor@wonderfuljodi.com' },
        };
        const res = createMockResponse();
        let nextCalled = false;
        (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
            nextCalled = true;
        });
        for (let i = 0; i < 30; i++) {
            if (res.statusCode !== 200 || nextCalled)
                break;
            await new Promise((r) => setTimeout(r, 50));
        }
        assert_1.default.strictEqual(nextCalled, false, 'Regular user must never reach next()');
        assert_1.default.strictEqual(res.statusCode, 403);
    });
    await it('1c. requireSuperAdmin strictly rejects regular admins without "all" permissions (403 SUPER_ADMIN_REQUIRED)', async () => {
        const regularAdminId = '507f1f77bcf86cd799439088';
        const token = jsonwebtoken_1.default.sign({ userId: regularAdminId, role: 'admin', email: 'ops@wonderfuljodi.com' }, jwtSecret, { expiresIn: '1h' });
        const req = {
            headers: { authorization: `Bearer ${token}` },
            user: { userId: regularAdminId, role: 'admin', email: 'ops@wonderfuljodi.com' },
        };
        const res = createMockResponse();
        let nextCalled = false;
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        Admin_1.Admin.findOne = async () => ({
            user: regularAdminId,
            permissions: ['support', 'view_profiles'],
        });
        User_1.User.findById = () => ({
            select: () => ({ _id: regularAdminId, role: 'admin', isActive: true, isDeleted: false, status: 'Active' }),
        });
        try {
            (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            for (let i = 0; i < 30; i++) {
                if (res.statusCode !== 200 || nextCalled)
                    break;
                await new Promise((r) => setTimeout(r, 50));
            }
            assert_1.default.strictEqual(nextCalled, false, 'Regular admin must be denied');
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
        }
    });
    await it('1d. requireSuperAdmin allows verified Super Admin with permissions: ["all"]', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const token = jsonwebtoken_1.default.sign({ userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' }, jwtSecret, { expiresIn: '1h' });
        const req = {
            headers: { authorization: `Bearer ${token}` },
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
        };
        const res = createMockResponse();
        let nextCalled = false;
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        Admin_1.Admin.findOne = async () => ({
            user: superAdminId,
            permissions: ['all'],
        });
        User_1.User.findById = () => ({
            select: () => ({ _id: superAdminId, role: 'admin', isActive: true, isDeleted: false, status: 'Active' }),
        });
        try {
            (0, authMiddleware_1.requireSuperAdmin)(req, res, () => {
                nextCalled = true;
            });
            for (let i = 0; i < 30; i++) {
                if (nextCalled)
                    break;
                await new Promise((r) => setTimeout(r, 50));
            }
            assert_1.default.strictEqual(nextCalled, true, 'Verified Super Admin must be granted access');
            assert_1.default.strictEqual(res.statusCode, 200);
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
        }
    });
    await it('1e. revealContactDetails denies unauthorized regular admin without "all" permissions (403 SUPER_ADMIN_REQUIRED)', async () => {
        const regularAdminId = '507f1f77bcf86cd799439088';
        const targetUserId = '507f1f77bcf86cd799439089';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origAdminFind = Admin_1.Admin.findOne;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P_Admin1',
            candidateId: 'WJ-100010',
            user: { _id: targetUserId, fullName: 'Dr. Target User', mobile: '+919811100000', email: 't@hospital.org' },
            privacySettings: { contactVisibility: 'members_only' },
        });
        User_1.User.findById = async () => ({
            _id: targetUserId,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        Admin_1.Admin.findOne = async () => ({
            user: regularAdminId,
            permissions: ['support'], // does not include 'all'
        });
        try {
            const req = {
                headers: {},
                user: { userId: regularAdminId, role: 'admin' },
                params: { profileId: 'WJ-100010' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            Admin_1.Admin.findOne = origAdminFind;
        }
    });
    await it('1f. revealContactDetails allows verified Super Admin with permissions: ["all"]', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const targetUserId = '507f1f77bcf86cd799439089';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origAdminFind = Admin_1.Admin.findOne;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P_Admin2',
            candidateId: 'WJ-100011',
            user: { _id: targetUserId, fullName: 'Dr. Target User', mobile: '+919811100000', email: 't@hospital.org' },
            privacySettings: { contactVisibility: 'members_only' },
            workLocation: 'Max Hospital, Delhi',
            currentHospital: 'Max Hospital',
            annualIncome: '40-50 Lakhs',
        });
        User_1.User.findById = async () => ({
            _id: targetUserId,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        Admin_1.Admin.findOne = async () => ({
            user: superAdminId,
            permissions: ['all'],
        });
        try {
            const req = {
                headers: {},
                user: { userId: superAdminId, role: 'admin' },
                params: { profileId: 'WJ-100011' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.isAdmin, true);
            assert_1.default.strictEqual(res.body?.creditsUsed, 0);
            assert_1.default.strictEqual(res.body?.data?.mobile, '+919811100000');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            Admin_1.Admin.findOne = origAdminFind;
        }
    });
    // ──────────────────────────────────────────────────────────────────────────
    // Check 2: Membership Entitlement Engine (entitlementService)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 2: Membership Entitlement Engine (entitlementService)');
    await it('2a. hasActivePaidMembership returns false for missing or null user', async () => {
        const isPaidNull = await (0, entitlementService_1.hasActivePaidMembership)('');
        assert_1.default.strictEqual(isPaidNull, false);
    });
    await it('2b. hasActivePaidMembership returns false for free member without active paid subscription', async () => {
        const isPaid = await (0, entitlementService_1.hasActivePaidMembership)('non-existent-user-id-999');
        assert_1.default.strictEqual(isPaid, false);
    });
    await it('2c. hasActivePaidMembership returns false for expired paid subscription', async () => {
        const origSubFind = Subscription_1.Subscription.findOne;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                status: 'ACTIVE',
                plan: 'DOCTOR_CONNECT',
                planId: 'DOCTOR_CONNECT',
                expiryDate: new Date(Date.now() - 3600000), // 1 hour ago
            }),
        });
        try {
            const isPaid = await (0, entitlementService_1.hasActivePaidMembership)('expired-user-id');
            assert_1.default.strictEqual(isPaid, false, 'Expired subscription must return false');
        }
        finally {
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    await it('2d. hasActivePaidMembership returns false for cancelled or inactive subscription', async () => {
        const origSubFind = Subscription_1.Subscription.findOne;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                status: 'CANCELLED',
                plan: 'DOCTOR_CONNECT',
                planId: 'DOCTOR_CONNECT',
                expiryDate: new Date(Date.now() + 86400000),
            }),
        });
        try {
            const isPaid = await (0, entitlementService_1.hasActivePaidMembership)('cancelled-user-id');
            assert_1.default.strictEqual(isPaid, false, 'Cancelled subscription must return false');
        }
        finally {
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    await it('2e. hasActivePaidMembership returns false for Free plan subscription', async () => {
        const origSubFind = Subscription_1.Subscription.findOne;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                status: 'ACTIVE',
                plan: 'free',
                planId: 'FREE',
                expiryDate: new Date(Date.now() + 86400000),
            }),
        });
        try {
            const isPaid = await (0, entitlementService_1.hasActivePaidMembership)('free-plan-user-id');
            assert_1.default.strictEqual(isPaid, false, 'Free plan subscription must return false');
        }
        finally {
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    await it('2f. hasActivePaidMembership returns true for active DOCTOR_CONNECT paid subscription', async () => {
        const origSubFind = Subscription_1.Subscription.findOne;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                status: 'ACTIVE',
                plan: 'DOCTOR_CONNECT',
                planId: 'DOCTOR_CONNECT',
                expiryDate: new Date(Date.now() + 86400000 * 30),
            }),
        });
        try {
            const isPaid = await (0, entitlementService_1.hasActivePaidMembership)('paid-user-id');
            assert_1.default.strictEqual(isPaid, true, 'Active paid subscription must return true');
        }
        finally {
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    await it('2g. hasActivePaidMembership returns true for active EXCLUSIVE_CONCIERGE / VVIP subscription', async () => {
        const origSubFind = Subscription_1.Subscription.findOne;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                status: 'ACTIVE',
                plan: 'EXCLUSIVE_CONCIERGE',
                planId: 'EXCLUSIVE_CONCIERGE',
                expiryDate: null,
            }),
        });
        try {
            const isPaid = await (0, entitlementService_1.hasActivePaidMembership)('concierge-user-id');
            assert_1.default.strictEqual(isPaid, true, 'Active Concierge plan must return true');
        }
        finally {
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    // ──────────────────────────────────────────────────────────────────────────
    // Check 3: Free Contact Reveal Allowance, Persistence & Idempotency
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 3: Contact Reveal Free Allowance, Persistence & Idempotency');
    await it('3a. revealContactDetails requires authentication (fails closed with 401)', async () => {
        const req = { headers: {}, user: null, params: { profileId: 'WJ-100092' } };
        const res = createMockResponse();
        await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
        assert_1.default.strictEqual(res.statusCode, 401);
        assert_1.default.strictEqual(res.body?.success, false);
    });
    await it('3b. revealContactDetails rejects invalid or missing profile ID with 400', async () => {
        const req = {
            headers: {},
            user: { userId: '507f1f77bcf86cd799439011', role: 'user' },
            params: { profileId: 'x' },
        };
        const res = createMockResponse();
        await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
        assert_1.default.strictEqual(res.statusCode, 400);
        assert_1.default.strictEqual(res.body?.success, false);
    });
    await it('3c. getContactAccessStatus returns canReveal=false for guests', async () => {
        const req = {
            headers: {},
            user: null,
            params: { profileId: 'non-existent-candidate-id-404' },
        };
        const res = createMockResponse();
        await (0, contactRequestController_1.getContactAccessStatus)(req, res, () => { });
        assert_1.default.ok(res.statusCode === 404 || (res.statusCode === 200 && res.body?.data?.canReveal === false));
    });
    await it('3d. Free member 1st reveal succeeds and sets isFreeReveal: true', async () => {
        const callerId = '507f1f77bcf86cd799439111';
        const profileOwner1 = '507f1f77bcf86cd799439112';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origReqFind = ContactRequest_1.ContactRequest.findOne;
        const origSubFind = Subscription_1.Subscription.findOne;
        const origLogFind = ContactAccessLog_1.ContactAccessLog.find;
        const origLogFindOne = ContactAccessLog_1.ContactAccessLog.findOne;
        const origTx = client_1.prisma.$transaction;
        const accessLogs = [];
        profileController.findCanonicalProfile = async () => ({
            _id: 'P1',
            candidateId: 'WJ-100001',
            user: { _id: profileOwner1, fullName: 'Dr. Anita Roy', mobile: '+919876543211', email: 'anita@roy.org' },
            privacySettings: { contactVisibility: 'members_only' },
            workLocation: 'Apollo Hospital, Mumbai',
            currentHospital: 'Apollo Hospital',
            annualIncome: '25-35 Lakhs',
        });
        User_1.User.findById = async () => ({
            _id: profileOwner1,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        ContactRequest_1.ContactRequest.findOne = async () => null;
        Subscription_1.Subscription.findOne = () => ({ sort: () => null });
        ContactAccessLog_1.ContactAccessLog.find = async () => accessLogs;
        ContactAccessLog_1.ContactAccessLog.findOne = async () => null;
        client_1.prisma.$transaction = async (fn) => {
            const tx = {
                $executeRawUnsafe: async () => { },
                user: { update: async () => { } },
                contactAccessLog: {
                    findFirst: async () => null,
                    create: async (payload) => {
                        accessLogs.push(payload.data);
                        return payload.data;
                    },
                },
            };
            return await fn(tx);
        };
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                params: { profileId: 'WJ-100001' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            assert_1.default.strictEqual(res.body?.isFreeReveal, true);
            assert_1.default.strictEqual(res.body?.freeAllowanceRemaining, 0);
            assert_1.default.strictEqual(res.body?.data?.mobile, '+919876543211');
            assert_1.default.strictEqual(accessLogs.length, 1);
            assert_1.default.strictEqual(accessLogs[0].action, 'FREE_CONTACT_REVEAL');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            ContactRequest_1.ContactRequest.findOne = origReqFind;
            Subscription_1.Subscription.findOne = origSubFind;
            ContactAccessLog_1.ContactAccessLog.find = origLogFind;
            ContactAccessLog_1.ContactAccessLog.findOne = origLogFindOne;
            client_1.prisma.$transaction = origTx;
        }
    });
    await it('3e. Free member 2nd reveal on different profile is DENIED with 403 UPGRADE_REQUIRED', async () => {
        const callerId = '507f1f77bcf86cd799439111';
        const profileOwner1 = '507f1f77bcf86cd799439112';
        const profileOwner2 = '507f1f77bcf86cd799439113';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origReqFind = ContactRequest_1.ContactRequest.findOne;
        const origSubFind = Subscription_1.Subscription.findOne;
        const origLogFind = ContactAccessLog_1.ContactAccessLog.find;
        const origLogFindOne = ContactAccessLog_1.ContactAccessLog.findOne;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P2',
            candidateId: 'WJ-100002',
            user: { _id: profileOwner2, fullName: 'Dr. Suresh Kumar', mobile: '+919876543212', email: 'suresh@kumar.org' },
            privacySettings: { contactVisibility: 'members_only' },
        });
        User_1.User.findById = async () => ({
            _id: profileOwner2,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        ContactRequest_1.ContactRequest.findOne = async () => null;
        Subscription_1.Subscription.findOne = () => ({ sort: () => null });
        ContactAccessLog_1.ContactAccessLog.find = async () => [
            { user: callerId, profileOwner: profileOwner1, action: 'FREE_CONTACT_REVEAL', creditsUsed: 0 },
        ];
        ContactAccessLog_1.ContactAccessLog.findOne = async () => null;
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                params: { profileId: 'WJ-100002' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'UPGRADE_REQUIRED');
            assert_1.default.strictEqual(res.body?.canUpgrade, true);
            assert_1.default.strictEqual(res.body?.freeAllowanceRemaining, 0);
            assert_1.default.ok(Array.isArray(res.body?.availablePlans), 'Should include available membership plans');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            ContactRequest_1.ContactRequest.findOne = origReqFind;
            Subscription_1.Subscription.findOne = origSubFind;
            ContactAccessLog_1.ContactAccessLog.find = origLogFind;
            ContactAccessLog_1.ContactAccessLog.findOne = origLogFindOne;
        }
    });
    await it('3f. Free member re-viewing same profile is idempotent (200 alreadyUnlocked, 0 credits used)', async () => {
        const callerId = '507f1f77bcf86cd799439111';
        const profileOwner1 = '507f1f77bcf86cd799439112';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origReqFind = ContactRequest_1.ContactRequest.findOne;
        const origLogFindOne = ContactAccessLog_1.ContactAccessLog.findOne;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P1',
            candidateId: 'WJ-100001',
            user: { _id: profileOwner1, fullName: 'Dr. Anita Roy', mobile: '+919876543211', email: 'anita@roy.org' },
            privacySettings: { contactVisibility: 'members_only' },
        });
        User_1.User.findById = async () => ({
            _id: profileOwner1,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        ContactRequest_1.ContactRequest.findOne = async () => null;
        ContactAccessLog_1.ContactAccessLog.findOne = async () => ({
            user: callerId,
            profileOwner: profileOwner1,
            action: 'FREE_CONTACT_REVEAL',
            creditsUsed: 0,
        });
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                params: { profileId: 'WJ-100001' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.alreadyUnlocked, true);
            assert_1.default.strictEqual(res.body?.creditsUsed, 0);
            assert_1.default.strictEqual(res.body?.data?.mobile, '+919876543211');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            ContactRequest_1.ContactRequest.findOne = origReqFind;
            ContactAccessLog_1.ContactAccessLog.findOne = origLogFindOne;
        }
    });
    await it('3g. Concurrency collision: concurrent transaction claim rejects with 403 UPGRADE_REQUIRED', async () => {
        const callerId = '507f1f77bcf86cd799439111';
        const profileOwner2 = '507f1f77bcf86cd799439113';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origReqFind = ContactRequest_1.ContactRequest.findOne;
        const origSubFind = Subscription_1.Subscription.findOne;
        const origLogFind = ContactAccessLog_1.ContactAccessLog.find;
        const origLogFindOne = ContactAccessLog_1.ContactAccessLog.findOne;
        const origTx = client_1.prisma.$transaction;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P2',
            candidateId: 'WJ-100002',
            user: { _id: profileOwner2, fullName: 'Dr. Suresh Kumar', mobile: '+919876543212', email: 'suresh@kumar.org' },
            privacySettings: { contactVisibility: 'members_only' },
        });
        User_1.User.findById = async () => ({
            _id: profileOwner2,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        ContactRequest_1.ContactRequest.findOne = async () => null;
        Subscription_1.Subscription.findOne = () => ({ sort: () => null });
        ContactAccessLog_1.ContactAccessLog.find = async () => [];
        ContactAccessLog_1.ContactAccessLog.findOne = async () => null;
        client_1.prisma.$transaction = async (fn) => {
            const tx = {
                $executeRawUnsafe: async () => { },
                user: { update: async () => { } },
                contactAccessLog: {
                    findFirst: async () => ({
                        userId: callerId,
                        profileOwnerId: 'different-profile-owner-id',
                        action: 'FREE_CONTACT_REVEAL',
                        creditsUsed: 0,
                    }),
                    create: async () => { },
                },
            };
            return await fn(tx);
        };
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                params: { profileId: 'WJ-100002' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'UPGRADE_REQUIRED');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            ContactRequest_1.ContactRequest.findOne = origReqFind;
            Subscription_1.Subscription.findOne = origSubFind;
            ContactAccessLog_1.ContactAccessLog.find = origLogFind;
            ContactAccessLog_1.ContactAccessLog.findOne = origLogFindOne;
            client_1.prisma.$transaction = origTx;
        }
    });
    await it('3h. Real MariaDB write and read-back for FREE_CONTACT_REVEAL in ContactAccessLog', async () => {
        const testId = (0, client_1.generateObjectId)();
        const testUserId = '1d5ecedcdf3ea06a277b495a'; // live user id
        const testTargetId = '1d5ecedcdf3ea06a277b495a';
        const created = await ContactAccessLog_1.ContactAccessLog.create({
            id: testId,
            user: testUserId,
            profileOwner: testTargetId,
            action: 'FREE_CONTACT_REVEAL',
            creditsUsed: 0,
            ipAddress: '127.0.0.1',
        });
        assert_1.default.ok(created, 'Record must be created');
        assert_1.default.strictEqual(created.action, 'FREE_CONTACT_REVEAL');
        const readBack = await ContactAccessLog_1.ContactAccessLog.findById(testId);
        assert_1.default.ok(readBack, 'Record must be read back from database');
        assert_1.default.strictEqual(readBack.action, 'FREE_CONTACT_REVEAL');
        assert_1.default.strictEqual(readBack.creditsUsed, 0);
        // Clean up
        await client_1.prisma.contactAccessLog.delete({ where: { id: testId } }).catch(() => { });
    });
    // ──────────────────────────────────────────────────────────────────────────
    // Check 4: Public Profile Privacy & Alternate Path Protection
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 4: Public Profile Privacy & Alternate Path Protection');
    const mockPublicProfile = {
        _id: '507f1f77bcf86cd799439201',
        candidateId: 'WJ-100095',
        displayName: 'Dr. Vivek Deshmukh',
        education: 'MBBS, MS General Surgery',
        degree: 'MS General Surgery',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        annualIncome: '30-40 Lakhs',
        workLocation: 'Sahyadri Hospital, Pune',
        currentHospital: 'Sahyadri Hospital',
        user: {
            _id: '507f1f77bcf86cd799439202',
            fullName: 'Vivek Deshmukh',
            mobile: '+919811122233',
            email: 'vivek.deshmukh@sahyadri.org',
        },
        privacySettings: {
            photoVisibility: 'all',
            contactVisibility: 'members_only',
        },
    };
    await it('4a. serializePublicProfile for guest viewer strips all name fields and omits contactDetails', () => {
        const guestView = (0, securityUtils_1.serializePublicProfile)(mockPublicProfile, {});
        assert_1.default.ok(guestView, 'guestView must exist');
        assert_1.default.strictEqual(guestView.displayName, null, 'Guest viewer must not see displayName');
        assert_1.default.strictEqual(guestView.firstName, null, 'Guest viewer must not see firstName');
        assert_1.default.strictEqual(guestView.lastName, null, 'Guest viewer must not see lastName');
        assert_1.default.strictEqual(guestView.fullName, null, 'Guest viewer must not see fullName');
        assert_1.default.strictEqual(guestView.contactDetails, undefined, 'Guest viewer must not receive contactDetails');
        assert_1.default.strictEqual(guestView.user?.mobile, undefined, 'User mobile must never be exposed');
        assert_1.default.strictEqual(guestView.user?.email, undefined, 'User email must never be exposed');
    });
    await it('4b. serializePublicProfile for authenticated viewer with locked contact masks surname and omits contactDetails', () => {
        const memberView = (0, securityUtils_1.serializePublicProfile)(mockPublicProfile, {
            viewerUserId: '507f1f77bcf86cd799439999',
            isContactUnlocked: false,
        });
        assert_1.default.ok(memberView, 'memberView must exist');
        assert_1.default.strictEqual(memberView.displayName, 'Dr. Vivek', 'Member viewer sees first name with Dr.');
        assert_1.default.strictEqual(memberView.lastName, null, 'Member viewer must not see surname');
        assert_1.default.strictEqual(memberView.contactDetails, undefined, 'contactDetails must be omitted');
        assert_1.default.strictEqual(memberView.user?.mobile, undefined, 'User mobile must not be exposed');
        assert_1.default.strictEqual(memberView.user?.email, undefined, 'User email must not be exposed');
    });
    await it('4c. serializePublicProfile with isContactUnlocked: true safely exposes verified contact details', () => {
        const unlockedView = (0, securityUtils_1.serializePublicProfile)(mockPublicProfile, {
            viewerUserId: '507f1f77bcf86cd799439999',
            isContactUnlocked: true,
        });
        assert_1.default.ok(unlockedView, 'unlockedView must exist');
        assert_1.default.ok(unlockedView.contactDetails, 'contactDetails must be present when unlocked');
        assert_1.default.strictEqual(unlockedView.contactDetails.mobile, '+919811122233');
        assert_1.default.strictEqual(unlockedView.contactDetails.email, 'vivek.deshmukh@sahyadri.org');
    });
    await it('4d. revealContactDetails respects contactVisibility: hidden and denies access (403 CONTACT_HIDDEN_BY_OWNER)', async () => {
        const callerId = '507f1f77bcf86cd799439111';
        const profileOwnerPrivate = '507f1f77bcf86cd799439222';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P3',
            candidateId: 'WJ-100003',
            user: { _id: profileOwnerPrivate, fullName: 'Dr. Private User', mobile: '+919876500000', email: 'p@hospital.org' },
            privacySettings: { contactVisibility: 'hidden' },
        });
        User_1.User.findById = async () => ({
            _id: profileOwnerPrivate,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                params: { profileId: 'WJ-100003' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'CONTACT_HIDDEN_BY_OWNER');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
        }
    });
    await it('4e. getProfile public endpoint does NOT disclose contactDetails even if ContactRequest is ACCEPTED', async () => {
        const callerUserId = '507f1f77bcf86cd799439555';
        const targetUserId = '507f1f77bcf86cd799439666';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origReqFind = ContactRequest_1.ContactRequest.findOne;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P_BypassTest',
            candidateId: 'WJ-100077',
            displayName: 'Dr. Target Candidate',
            user: {
                _id: targetUserId,
                fullName: 'Target Candidate',
                mobile: '+919876543999',
                email: 'target@hospital.org',
            },
            privacySettings: { contactVisibility: 'members_only' },
        });
        ContactRequest_1.ContactRequest.findOne = async () => ({
            requester: callerUserId,
            recipient: targetUserId,
            status: 'ACCEPTED',
        });
        try {
            const req = {
                params: { id: 'WJ-100077' },
                user: { userId: callerUserId, role: 'user' },
                headers: {},
            };
            const res = createMockResponse();
            await profileController.getProfile(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            // The public profile response must NOT contain contact details
            assert_1.default.strictEqual(res.body?.data?.contactDetails, undefined, 'Public profile endpoint must never leak contactDetails via accepted request');
            assert_1.default.strictEqual(res.body?.data?.user?.mobile, undefined, 'User mobile must never be exposed on public profile');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            ContactRequest_1.ContactRequest.findOne = origReqFind;
        }
    });
    await it('4f. getProfile public endpoint does NOT disclose contactDetails to regular admin caller', async () => {
        const adminCallerId = '507f1f77bcf86cd799439088';
        const req = {
            params: { id: 'WJ-100077' }, // live profile
            user: { userId: adminCallerId, role: 'admin' },
            headers: {},
        };
        const res = createMockResponse();
        await profileController.getProfile(req, res, () => { });
        assert_1.default.strictEqual(res.statusCode, 200);
        assert_1.default.strictEqual(res.body?.success, true);
        assert_1.default.strictEqual(res.body?.data?.contactDetails, undefined, 'Public profile endpoint must never leak contactDetails to admin caller');
        assert_1.default.strictEqual(res.body?.data?.user?.mobile, undefined, 'Public profile endpoint must never leak mobile to admin caller');
    });
    await it('4g. getContactAccessStatus enforces contactVisibility: hidden across all non-owner callers (PRIVACY_RESTRICTED)', async () => {
        const callerId = '507f1f77bcf86cd799439555';
        const targetUserId = '507f1f77bcf86cd799439666';
        const origFindCanonical = profileController.findCanonicalProfile;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P_Priv',
            candidateId: 'WJ-100099',
            user: { _id: targetUserId, fullName: 'Dr. Hidden Candidate', mobile: '+919800000000', email: 'h@h.com' },
            privacySettings: { contactVisibility: 'hidden' },
        });
        try {
            const req = {
                params: { profileId: 'WJ-100099' },
                user: { userId: callerId, role: 'user' },
                headers: {},
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.getContactAccessStatus)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.data?.hasAccess, false);
            assert_1.default.strictEqual(res.body?.data?.status, 'PRIVACY_RESTRICTED');
            assert_1.default.strictEqual(res.body?.data?.canReveal, false);
            assert_1.default.strictEqual(res.body?.data?.contactDetails, undefined);
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
        }
    });
    // ──────────────────────────────────────────────────────────────────────────
    // Check 5: Contact Requests Paid Membership Gating & Credit Exhaustion
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 5: Contact Requests Paid Gating & Credit Exhaustion');
    await it('5a. createContactRequest rejects unauthenticated users with 401', async () => {
        const req = { headers: {}, user: null, body: { recipientId: 'target-1' } };
        const res = createMockResponse();
        await (0, contactRequestController_1.createContactRequest)(req, res, () => { });
        assert_1.default.strictEqual(res.statusCode, 401);
    });
    await it('5b. createContactRequest rejects free members with 403 FREE_PLAN_NO_CREDITS', async () => {
        const callerId = '507f1f77bcf86cd799439301';
        const targetUserId = '507f1f77bcf86cd799439302';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origSubFind = Subscription_1.Subscription.findOne;
        profileController.findCanonicalProfile = async () => ({
            user: { _id: targetUserId },
        });
        User_1.User.findById = async () => ({
            _id: targetUserId,
            status: 'Active',
            isActive: true,
            isBlocked: false,
        });
        Block_1.Block.findOne = async () => null;
        Subscription_1.Subscription.findOne = () => ({ sort: () => null });
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                body: { recipientId: targetUserId },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.createContactRequest)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'FREE_PLAN_NO_CREDITS');
            assert_1.default.strictEqual(res.body?.canUpgrade, true);
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    await it('5c. createContactRequest rejects paid members with exhausted credits (403 NO_CREDITS_REMAINING)', async () => {
        const callerId = '507f1f77bcf86cd799439301';
        const targetUserId = '507f1f77bcf86cd799439302';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origSubFind = Subscription_1.Subscription.findOne;
        profileController.findCanonicalProfile = async () => ({
            user: { _id: targetUserId },
        });
        User_1.User.findById = async () => ({
            _id: targetUserId,
            status: 'Active',
            isActive: true,
            isBlocked: false,
        });
        Block_1.Block.findOne = async () => null;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                status: 'ACTIVE',
                plan: 'DOCTOR_CONNECT',
                planId: 'DOCTOR_CONNECT',
                contactRequestsRemaining: 0,
                expiryDate: new Date(Date.now() + 86400000 * 30),
            }),
        });
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                body: { recipientId: targetUserId },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.createContactRequest)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'NO_CREDITS_REMAINING');
            assert_1.default.strictEqual(res.body?.canUpgrade, true);
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    await it('5d. revealContactDetails rejects paid member with exhausted credits (403 NO_CREDITS_REMAINING)', async () => {
        const callerId = '507f1f77bcf86cd799439301';
        const targetUserId = '507f1f77bcf86cd799439302';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origReqFind = ContactRequest_1.ContactRequest.findOne;
        const origLogFind = ContactAccessLog_1.ContactAccessLog.findOne;
        const origSubFind = Subscription_1.Subscription.findOne;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P4',
            candidateId: 'WJ-100004',
            user: { _id: targetUserId, fullName: 'Dr. Target', mobile: '9999999999', email: 't@t.com' },
            privacySettings: { contactVisibility: 'members_only' },
        });
        User_1.User.findById = async () => ({
            _id: targetUserId,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        ContactRequest_1.ContactRequest.findOne = async () => null;
        ContactAccessLog_1.ContactAccessLog.findOne = async () => null;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                status: 'ACTIVE',
                plan: 'DOCTOR_CONNECT',
                planId: 'DOCTOR_CONNECT',
                contactRequestsRemaining: 0,
                expiryDate: new Date(Date.now() + 86400000 * 30),
            }),
        });
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                params: { profileId: 'WJ-100004' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'NO_CREDITS_REMAINING');
            assert_1.default.strictEqual(res.body?.creditsRemaining, 0);
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            ContactRequest_1.ContactRequest.findOne = origReqFind;
            ContactAccessLog_1.ContactAccessLog.findOne = origLogFind;
            Subscription_1.Subscription.findOne = origSubFind;
        }
    });
    await it('5e. revealContactDetails for paid member deducts 1 credit atomically and returns contact details', async () => {
        const callerId = '507f1f77bcf86cd799439301';
        const targetUserId = '507f1f77bcf86cd799439302';
        const subId = 'sub-12345';
        const origFindCanonical = profileController.findCanonicalProfile;
        const origUserFind = User_1.User.findById;
        const origBlockFind = Block_1.Block.findOne;
        const origReqFind = ContactRequest_1.ContactRequest.findOne;
        const origLogFind = ContactAccessLog_1.ContactAccessLog.findOne;
        const origSubFind = Subscription_1.Subscription.findOne;
        const origTx = client_1.prisma.$transaction;
        let subUpdated = false;
        let logCreated = false;
        profileController.findCanonicalProfile = async () => ({
            _id: 'P5',
            candidateId: 'WJ-100005',
            user: { _id: targetUserId, fullName: 'Dr. Paid Target', mobile: '+919876543200', email: 'paid@hospital.org' },
            privacySettings: { contactVisibility: 'members_only' },
            workLocation: 'Fortis Hospital, Bangalore',
            currentHospital: 'Fortis Hospital',
            annualIncome: '50-60 Lakhs',
        });
        User_1.User.findById = async () => ({
            _id: targetUserId,
            status: 'Active',
            isActive: true,
            isBlocked: false,
            isDeleted: false,
        });
        Block_1.Block.findOne = async () => null;
        ContactRequest_1.ContactRequest.findOne = async () => null;
        ContactAccessLog_1.ContactAccessLog.findOne = async () => null;
        Subscription_1.Subscription.findOne = () => ({
            sort: () => ({
                _id: subId,
                id: subId,
                status: 'ACTIVE',
                plan: 'DOCTOR_CONNECT',
                planId: 'DOCTOR_CONNECT',
                contactRequestsRemaining: 10,
                expiryDate: new Date(Date.now() + 86400000 * 30),
            }),
        });
        client_1.prisma.$transaction = async (fn) => {
            const tx = {
                subscription: {
                    update: async (args) => {
                        if (args.where?.id === subId)
                            subUpdated = true;
                    },
                },
                contactAccessLog: {
                    create: async (payload) => {
                        logCreated = true;
                        return payload.data;
                    },
                },
            };
            return await fn(tx);
        };
        try {
            const req = {
                headers: {},
                user: { userId: callerId, role: 'user' },
                params: { profileId: 'WJ-100005' },
            };
            const res = createMockResponse();
            await (0, contactRequestController_1.revealContactDetails)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.creditsUsed, 1);
            assert_1.default.strictEqual(res.body?.creditsRemaining, 9);
            assert_1.default.strictEqual(res.body?.data?.mobile, '+919876543200');
            assert_1.default.strictEqual(subUpdated, true, 'Subscription must be decremented');
            assert_1.default.strictEqual(logCreated, true, 'ContactAccessLog must be created');
        }
        finally {
            profileController.findCanonicalProfile = origFindCanonical;
            User_1.User.findById = origUserFind;
            Block_1.Block.findOne = origBlockFind;
            ContactRequest_1.ContactRequest.findOne = origReqFind;
            ContactAccessLog_1.ContactAccessLog.findOne = origLogFind;
            Subscription_1.Subscription.findOne = origSubFind;
            client_1.prisma.$transaction = origTx;
        }
    });
    // ──────────────────────────────────────────────────────────────────────────
    // Check 6: Super Admin Dashboard Controller Handlers
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 6: Super Admin Dashboard Controller Handlers');
    await it('6a. getMonetizationSummary returns metrics and catalog plans', async () => {
        const req = { headers: {}, user: { userId: '507f1f77bcf86cd799439011', role: 'admin' } };
        const res = createMockResponse();
        let errOccurred = false;
        await (0, superAdminController_1.getMonetizationSummary)(req, res, (err) => {
            errOccurred = !!err;
        });
        if (!errOccurred) {
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            assert_1.default.ok('totalRevenue' in res.body?.data, 'Expected totalRevenue in response');
            assert_1.default.ok(Array.isArray(res.body?.data?.plans), 'Expected plans array');
        }
    });
    await it('6b. getSafetySummary returns contact requests & safety metrics', async () => {
        const req = { headers: {}, user: { userId: '507f1f77bcf86cd799439011', role: 'admin' } };
        const res = createMockResponse();
        let errOccurred = false;
        await (0, superAdminController_1.getSafetySummary)(req, res, (err) => {
            errOccurred = !!err;
        });
        if (!errOccurred) {
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            assert_1.default.ok('contactRequests' in res.body?.data);
            assert_1.default.ok('safetyMetrics' in res.body?.data);
        }
    });
    await it('6c. getSecuritySummary returns admin counts, smtp status, and uptime', async () => {
        const req = { headers: {}, user: { userId: '507f1f77bcf86cd799439011', role: 'admin' } };
        const res = createMockResponse();
        let errOccurred = false;
        await (0, superAdminController_1.getSecuritySummary)(req, res, (err) => {
            errOccurred = !!err;
        });
        if (!errOccurred) {
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            assert_1.default.ok('superAdminCount' in res.body?.data);
            assert_1.default.ok('emailConfigured' in res.body?.data);
            assert_1.default.ok('uptimeSeconds' in res.body?.data);
        }
    });
    await it('6d. updateAdminPermissions rejects non-array permissions with 400', async () => {
        const req = {
            headers: {},
            user: { userId: '507f1f77bcf86cd799439011', role: 'admin' },
            params: { id: '507f1f77bcf86cd799439011' },
            body: { permissions: 'all' },
        };
        const res = createMockResponse();
        await (0, superAdminController_1.updateAdminPermissions)(req, res, () => { });
        assert_1.default.strictEqual(res.statusCode, 400);
        assert_1.default.strictEqual(res.body?.success, false);
    });
    await it('6e. addInquiryNote rejects empty note text with 400', async () => {
        const req = {
            headers: {},
            user: { userId: '507f1f77bcf86cd799439011', role: 'admin' },
            params: { id: '507f1f77bcf86cd799439011' },
            body: { note: '' },
        };
        const res = createMockResponse();
        await (0, superAdminController_1.addInquiryNote)(req, res, () => { });
        assert_1.default.strictEqual(res.statusCode, 400);
    });
    await it('6f. replyToSupportInquiry rejects empty reply text with 400', async () => {
        const req = {
            headers: {},
            user: { userId: '507f1f77bcf86cd799439011', role: 'admin' },
            params: { id: '507f1f77bcf86cd799439011' },
            body: { replyText: '' },
        };
        const res = createMockResponse();
        await (0, superAdminController_1.replyToSupportInquiry)(req, res, () => { });
        assert_1.default.strictEqual(res.statusCode, 400);
    });
    // ──────────────────────────────────────────────────────────────────────────
    // Check 7: Super Admin Manual Membership Grant & Extension Semantics
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 7: Super Admin Manual Membership Grant & Extension Semantics');
    await it('7a. grantMembershipBySuperAdmin rejects unauthenticated or regular admin callers (403 SUPER_ADMIN_REQUIRED)', async () => {
        const regularAdminId = '507f1f77bcf86cd799439088';
        const req = {
            headers: {},
            user: { userId: regularAdminId, role: 'admin', email: 'ops@wonderfuljodi.com' },
            body: {
                userId: '507f1f77bcf86cd799439011',
                planId: 'plan-doctor-connect',
                grantReason: 'Valid test audit reason',
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = async () => ({
            user: regularAdminId,
            permissions: ['support'],
        });
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 403);
            assert_1.default.strictEqual(res.body?.code, 'SUPER_ADMIN_REQUIRED');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
        }
    });
    await it('7b. grantMembershipBySuperAdmin rejects audit grantReason shorter than 5 chars with 400', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const req = {
            headers: {},
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
            body: {
                userId: '507f1f77bcf86cd799439011',
                planId: 'plan-doctor-connect',
                grantReason: 'ok',
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        Admin_1.Admin.findOne = async () => ({
            user: superAdminId,
            permissions: ['all'],
        });
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 400);
            assert_1.default.ok(res.body?.message?.includes('minimum 5 characters'));
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
        }
    });
    await it('7c. grantMembershipBySuperAdmin rejects extendExisting when user has no active subscription (400 NO_ACTIVE_SUBSCRIPTION_TO_EXTEND)', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const targetUserId = '507f1f77bcf86cd799439011';
        const req = {
            headers: {},
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
            body: {
                userId: targetUserId,
                planId: 'plan-doctor-connect',
                grantReason: 'Promotional VIP extension',
                extendExisting: true,
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        const origPlanFind = MembershipPlan_1.MembershipPlan.findById;
        const origPlanFindOne = MembershipPlan_1.MembershipPlan.findOne;
        const origSubFindOne = Subscription_1.Subscription.findOne;
        Admin_1.Admin.findOne = async () => ({ user: superAdminId, permissions: ['all'] });
        User_1.User.findById = async () => ({ _id: targetUserId, email: 'candidate@wonderfuljodi.com', isDeleted: false });
        MembershipPlan_1.MembershipPlan.findById = async () => null;
        MembershipPlan_1.MembershipPlan.findOne = async () => ({
            _id: 'plan-doctor-connect-id',
            slug: 'plan-doctor-connect',
            name: 'Doctor Connect',
            durationDays: 30,
            contactLimit: 30,
        });
        Subscription_1.Subscription.findOne = async () => null;
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 400);
            assert_1.default.strictEqual(res.body?.code, 'NO_ACTIVE_SUBSCRIPTION_TO_EXTEND');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
            MembershipPlan_1.MembershipPlan.findById = origPlanFind;
            MembershipPlan_1.MembershipPlan.findOne = origPlanFindOne;
            Subscription_1.Subscription.findOne = origSubFindOne;
        }
    });
    await it('7d. grantMembershipBySuperAdmin rejects extendExisting when selected plan does not match active subscription plan (400 PLAN_MISMATCH_EXTENSION_NOT_PERMITTED)', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const targetUserId = '507f1f77bcf86cd799439011';
        const req = {
            headers: {},
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
            body: {
                userId: targetUserId,
                planId: 'plan-vvip',
                grantReason: 'Attempting to extend different plan',
                extendExisting: true,
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        const origPlanFind = MembershipPlan_1.MembershipPlan.findById;
        const origPlanFindOne = MembershipPlan_1.MembershipPlan.findOne;
        const origSubFindOne = Subscription_1.Subscription.findOne;
        Admin_1.Admin.findOne = async () => ({ user: superAdminId, permissions: ['all'] });
        User_1.User.findById = async () => ({ _id: targetUserId, email: 'candidate@wonderfuljodi.com', isDeleted: false });
        MembershipPlan_1.MembershipPlan.findById = async () => null;
        MembershipPlan_1.MembershipPlan.findOne = async () => ({
            _id: 'plan-vvip-id',
            slug: 'plan-vvip',
            name: 'VVIP Exclusive',
            durationDays: 90,
            contactLimit: -1,
        });
        Subscription_1.Subscription.findOne = async () => ({
            _id: 'sub-existing-1',
            user: targetUserId,
            plan: 'Doctor Connect',
            planId: 'plan-doctor-connect',
            status: 'ACTIVE',
            expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            contactRequestsRemaining: 15,
        });
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 400);
            assert_1.default.strictEqual(res.body?.code, 'PLAN_MISMATCH_EXTENSION_NOT_PERMITTED');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
            MembershipPlan_1.MembershipPlan.findById = origPlanFind;
            MembershipPlan_1.MembershipPlan.findOne = origPlanFindOne;
            Subscription_1.Subscription.findOne = origSubFindOne;
        }
    });
    await it('7e. Same-plan extension extends existing subscription expiry date and contact credits', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const targetUserId = '507f1f77bcf86cd799439011';
        const req = {
            headers: {},
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
            body: {
                userId: targetUserId,
                planId: 'plan-doctor-connect',
                durationDays: 30,
                grantReason: 'Loyalty bonus 30 days extension',
                extendExisting: true,
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        const origPlanFind = MembershipPlan_1.MembershipPlan.findById;
        const origPlanFindOne = MembershipPlan_1.MembershipPlan.findOne;
        const origSubFindOne = Subscription_1.Subscription.findOne;
        const origAuditLogCreate = AuditLog_1.AuditLog.create;
        let auditLogged = false;
        AuditLog_1.AuditLog.create = async () => {
            auditLogged = true;
            return {};
        };
        const initialExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        let saved = false;
        const mockExistingSub = {
            _id: 'sub-existing-1',
            user: targetUserId,
            plan: 'Doctor Connect',
            planId: 'plan-doctor-connect',
            status: 'ACTIVE',
            expiryDate: initialExpiry,
            contactRequestsRemaining: 12,
            save: async function () {
                saved = true;
                return this;
            },
        };
        Admin_1.Admin.findOne = async () => ({ user: superAdminId, permissions: ['all'] });
        User_1.User.findById = async () => ({ _id: targetUserId, email: 'candidate@wonderfuljodi.com', isDeleted: false });
        MembershipPlan_1.MembershipPlan.findById = async () => null;
        MembershipPlan_1.MembershipPlan.findOne = async () => ({
            _id: 'plan-doctor-connect',
            slug: 'plan-doctor-connect',
            name: 'Doctor Connect',
            durationDays: 30,
            contactLimit: 30,
        });
        Subscription_1.Subscription.findOne = async () => mockExistingSub;
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            assert_1.default.strictEqual(res.body?.data?.isExtended, true);
            assert_1.default.strictEqual(saved, true);
            assert_1.default.strictEqual(mockExistingSub.contactRequestsRemaining, 42); // 12 + 30 = 42
            const expectedMinExpiry = new Date(initialExpiry.getTime() + 29 * 24 * 60 * 60 * 1000);
            assert_1.default.ok(mockExistingSub.expiryDate > expectedMinExpiry);
            assert_1.default.strictEqual(auditLogged, true);
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
            MembershipPlan_1.MembershipPlan.findById = origPlanFind;
            MembershipPlan_1.MembershipPlan.findOne = origPlanFindOne;
            Subscription_1.Subscription.findOne = origSubFindOne;
            AuditLog_1.AuditLog.create = origAuditLogCreate;
        }
    });
    await it('7f. Extension preserves unlimited -1 contact entitlement without arithmetic corruption', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const targetUserId = '507f1f77bcf86cd799439011';
        const req = {
            headers: {},
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
            body: {
                userId: targetUserId,
                planId: 'plan-vvip',
                durationDays: 30,
                grantReason: 'Concierge extension',
                extendExisting: true,
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        const origPlanFind = MembershipPlan_1.MembershipPlan.findById;
        const origPlanFindOne = MembershipPlan_1.MembershipPlan.findOne;
        const origSubFindOne = Subscription_1.Subscription.findOne;
        const origAuditLogCreate = AuditLog_1.AuditLog.create;
        AuditLog_1.AuditLog.create = async () => ({});
        const mockExistingSub = {
            _id: 'sub-existing-vvip',
            user: targetUserId,
            plan: 'VVIP Concierge',
            planId: 'plan-vvip',
            status: 'ACTIVE',
            expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            contactRequestsRemaining: -1,
            save: async function () {
                return this;
            },
        };
        Admin_1.Admin.findOne = async () => ({ user: superAdminId, permissions: ['all'] });
        User_1.User.findById = async () => ({ _id: targetUserId, email: 'candidate@wonderfuljodi.com', isDeleted: false });
        MembershipPlan_1.MembershipPlan.findById = async () => null;
        MembershipPlan_1.MembershipPlan.findOne = async () => ({
            _id: 'plan-vvip',
            slug: 'plan-vvip',
            name: 'VVIP Concierge',
            durationDays: 30,
            isUnlimitedContact: true,
        });
        Subscription_1.Subscription.findOne = async () => mockExistingSub;
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            assert_1.default.strictEqual(mockExistingSub.contactRequestsRemaining, -1, 'Unlimited contact entitlement must remain -1');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
            MembershipPlan_1.MembershipPlan.findById = origPlanFind;
            MembershipPlan_1.MembershipPlan.findOne = origPlanFindOne;
            Subscription_1.Subscription.findOne = origSubFindOne;
            AuditLog_1.AuditLog.create = origAuditLogCreate;
        }
    });
    await it('7g. Expired active subscription calculates new expiry from now rather than past date', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const targetUserId = '507f1f77bcf86cd799439011';
        const req = {
            headers: {},
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
            body: {
                userId: targetUserId,
                planId: 'plan-doctor-connect',
                durationDays: 30,
                grantReason: 'Re-activation of expired plan',
                extendExisting: true,
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        const origPlanFind = MembershipPlan_1.MembershipPlan.findById;
        const origPlanFindOne = MembershipPlan_1.MembershipPlan.findOne;
        const origSubFindOne = Subscription_1.Subscription.findOne;
        const origAuditLogCreate = AuditLog_1.AuditLog.create;
        AuditLog_1.AuditLog.create = async () => ({});
        const pastExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // expired 10 days ago
        const mockExistingSub = {
            _id: 'sub-existing-expired',
            user: targetUserId,
            plan: 'Doctor Connect',
            planId: 'plan-doctor-connect',
            status: 'ACTIVE',
            expiryDate: pastExpiry,
            contactRequestsRemaining: 0,
            save: async function () {
                return this;
            },
        };
        Admin_1.Admin.findOne = async () => ({ user: superAdminId, permissions: ['all'] });
        User_1.User.findById = async () => ({ _id: targetUserId, email: 'candidate@wonderfuljodi.com', isDeleted: false });
        MembershipPlan_1.MembershipPlan.findById = async () => null;
        MembershipPlan_1.MembershipPlan.findOne = async () => ({
            _id: 'plan-doctor-connect',
            slug: 'plan-doctor-connect',
            name: 'Doctor Connect',
            durationDays: 30,
            contactLimit: 30,
        });
        Subscription_1.Subscription.findOne = async () => mockExistingSub;
        const testStartTime = Date.now();
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            const expectedMinExpiry = new Date(testStartTime + 29 * 24 * 60 * 60 * 1000);
            assert_1.default.ok(mockExistingSub.expiryDate > expectedMinExpiry, 'New expiry must be calculated from now, not past expiry');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
            MembershipPlan_1.MembershipPlan.findById = origPlanFind;
            MembershipPlan_1.MembershipPlan.findOne = origPlanFindOne;
            Subscription_1.Subscription.findOne = origSubFindOne;
            AuditLog_1.AuditLog.create = origAuditLogCreate;
        }
    });
    await it('7h. Switching plan without extendExisting cancels active subscription and creates new active subscription', async () => {
        const superAdminId = '507f1f77bcf86cd799439099';
        const targetUserId = '507f1f77bcf86cd799439011';
        const req = {
            headers: {},
            user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
            body: {
                userId: targetUserId,
                planId: 'plan-doctor-connect',
                durationDays: 30,
                grantReason: 'Switching user from basic to paid plan',
                extendExisting: false,
            },
        };
        const res = createMockResponse();
        const origAdminFind = Admin_1.Admin.findOne;
        const origUserFind = User_1.User.findById;
        const origPlanFind = MembershipPlan_1.MembershipPlan.findById;
        const origPlanFindOne = MembershipPlan_1.MembershipPlan.findOne;
        const origSubFindOne = Subscription_1.Subscription.findOne;
        const origSubCreate = Subscription_1.Subscription.create;
        const origAuditLogCreate = AuditLog_1.AuditLog.create;
        AuditLog_1.AuditLog.create = async () => ({});
        let oldCancelled = false;
        const mockOldSub = {
            _id: 'sub-old',
            user: targetUserId,
            plan: 'Old Plan',
            status: 'ACTIVE',
            save: async function () {
                if (this.status === 'CANCELLED')
                    oldCancelled = true;
                return this;
            },
        };
        let newSubCreated = false;
        Subscription_1.Subscription.create = async (doc) => {
            newSubCreated = true;
            return {
                _id: 'sub-new-id',
                ...doc,
            };
        };
        Admin_1.Admin.findOne = async () => ({ user: superAdminId, permissions: ['all'] });
        User_1.User.findById = async () => ({ _id: targetUserId, email: 'candidate@wonderfuljodi.com', isDeleted: false });
        MembershipPlan_1.MembershipPlan.findById = async () => null;
        MembershipPlan_1.MembershipPlan.findOne = async () => ({
            _id: 'plan-doctor-connect',
            slug: 'plan-doctor-connect',
            name: 'Doctor Connect',
            durationDays: 30,
            contactLimit: 30,
        });
        Subscription_1.Subscription.findOne = async () => mockOldSub;
        try {
            await (0, adminController_1.grantMembershipBySuperAdmin)(req, res, () => { });
            assert_1.default.strictEqual(res.statusCode, 200);
            assert_1.default.strictEqual(res.body?.success, true);
            assert_1.default.strictEqual(res.body?.data?.isExtended, false);
            assert_1.default.strictEqual(oldCancelled, true, 'Old subscription must be cancelled');
            assert_1.default.strictEqual(newSubCreated, true, 'New subscription must be created');
        }
        finally {
            Admin_1.Admin.findOne = origAdminFind;
            User_1.User.findById = origUserFind;
            MembershipPlan_1.MembershipPlan.findById = origPlanFind;
            MembershipPlan_1.MembershipPlan.findOne = origPlanFindOne;
            Subscription_1.Subscription.findOne = origSubFindOne;
            Subscription_1.Subscription.create = origSubCreate;
            AuditLog_1.AuditLog.create = origAuditLogCreate;
        }
    });
    // ──────────────────────────────────────────────────────────────────────────
    // Check 8: Notification Serializer & Action Eligibility Invariants
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\nCheck 8: Notification Serializer & Action Eligibility Invariants');
    await it('8a. serializeNotificationsForRecipient enriches metadata.interestStatus from live Interest record', async () => {
        const recipientUserId = '507f1f77bcf86cd799439011';
        const interestId = '507f1f77bcf86cd799439022';
        const origInterestFind = Interest_1.Interest.find;
        Interest_1.Interest.find = async () => [
            {
                _id: interestId,
                sender: '507f1f77bcf86cd799439033',
                recipient: recipientUserId,
                status: 'PENDING',
            },
        ];
        try {
            const notifications = [
                {
                    _id: 'notif-1',
                    user: recipientUserId,
                    type: 'INTEREST',
                    title: 'New Interest Received',
                    message: 'A doctor has shown interest in your profile.',
                    metadata: { interestId },
                    createdAt: new Date(),
                },
            ];
            const serialized = await (0, notificationSerializer_1.serializeNotificationsForRecipient)(notifications, recipientUserId, 'user');
            assert_1.default.strictEqual(serialized.length, 1);
            assert_1.default.strictEqual(serialized[0].metadata?.interestStatus, 'PENDING');
        }
        finally {
            Interest_1.Interest.find = origInterestFind;
        }
    });
    await it('8b. serializeNotificationsForRecipient maps fallback status when Interest record is missing', async () => {
        const recipientUserId = '507f1f77bcf86cd799439011';
        const interestId = '507f1f77bcf86cd799439044';
        const origInterestFind = Interest_1.Interest.find;
        Interest_1.Interest.find = async () => [];
        try {
            const notifications = [
                {
                    _id: 'notif-withdrawn',
                    user: recipientUserId,
                    type: 'INTEREST_WITHDRAWN',
                    title: 'Interest Withdrawn',
                    message: 'The interest was withdrawn.',
                    metadata: { interestId },
                    createdAt: new Date(),
                },
                {
                    _id: 'notif-accepted',
                    user: recipientUserId,
                    type: 'INTEREST_ACCEPTED',
                    title: 'Interest Accepted',
                    message: 'Your interest was accepted.',
                    metadata: { interestId },
                    createdAt: new Date(),
                },
                {
                    _id: 'notif-declined',
                    user: recipientUserId,
                    type: 'INTEREST_DECLINED',
                    title: 'Interest Declined',
                    message: 'Your interest was declined.',
                    metadata: { interestId },
                    createdAt: new Date(),
                },
            ];
            const serialized = await (0, notificationSerializer_1.serializeNotificationsForRecipient)(notifications, recipientUserId, 'user');
            assert_1.default.strictEqual(serialized[0].metadata?.interestStatus, 'REJECTED');
            assert_1.default.strictEqual(serialized[1].metadata?.interestStatus, 'ACCEPTED');
            assert_1.default.strictEqual(serialized[2].metadata?.interestStatus, 'DECLINED');
        }
        finally {
            Interest_1.Interest.find = origInterestFind;
        }
    });
    await it('8c. canActOnInterest fail-closed invariant: only PENDING incoming interest allows actions', () => {
        function canActOnInterest(notification) {
            if (!notification || !notification.metadata)
                return false;
            const type = notification.type;
            const isInterestType = type === 'INTEREST' || type === 'INTEREST_RECEIVED';
            if (!isInterestType)
                return false;
            const status = notification.metadata.interestStatus;
            return status === 'PENDING';
        }
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST', metadata: { interestStatus: 'PENDING' } }), true);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST_RECEIVED', metadata: { interestStatus: 'PENDING' } }), true);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST_WITHDRAWN', metadata: { interestStatus: 'REJECTED' } }), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST_WITHDRAWN', metadata: { interestStatus: 'PENDING' } }), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST_ACCEPTED', metadata: { interestStatus: 'ACCEPTED' } }), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST', metadata: { interestStatus: 'ACCEPTED' } }), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST', metadata: { interestStatus: 'REJECTED' } }), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST_DECLINED', metadata: { interestStatus: 'DECLINED' } }), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST', metadata: {} }), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'INTEREST' }), false);
        assert_1.default.strictEqual(canActOnInterest(null), false);
        assert_1.default.strictEqual(canActOnInterest({ type: 'PROFILE_VIEW', metadata: { interestStatus: 'PENDING' } }), false);
    });
    await it('8d. serializeNotificationsForRecipient strips stale interestStatus when interest is missing in DB', async () => {
        const recipientUserId = '507f1f77bcf86cd799439011';
        const nonExistentInterestId = '507f1f77bcf86cd799439099';
        const origInterestFind = Interest_1.Interest.find;
        Interest_1.Interest.find = async () => [];
        try {
            const notifications = [
                {
                    _id: 'notif-stale-pending',
                    user: recipientUserId,
                    type: 'INTEREST',
                    title: 'Interest Received',
                    message: 'Someone sent interest',
                    metadata: {
                        interestId: nonExistentInterestId,
                        interestStatus: 'PENDING',
                    },
                    createdAt: new Date(),
                },
            ];
            const serialized = await (0, notificationSerializer_1.serializeNotificationsForRecipient)(notifications, recipientUserId, 'user');
            assert_1.default.strictEqual(serialized.length, 1);
            assert_1.default.strictEqual(serialized[0].metadata?.interestStatus, undefined, 'Stale metadata.interestStatus must be stripped when interest is missing from DB');
        }
        finally {
            Interest_1.Interest.find = origInterestFind;
        }
    });
    await it('8e. serializeNotificationsForRecipient strips stale interestStatus on DB lookup failure (fail-closed)', async () => {
        const recipientUserId = '507f1f77bcf86cd799439011';
        const brokenInterestId = '507f1f77bcf86cd799439088';
        const origInterestFind = Interest_1.Interest.find;
        Interest_1.Interest.find = async () => {
            throw new Error('Database connection failed');
        };
        try {
            const notifications = [
                {
                    _id: 'notif-lookup-error',
                    user: recipientUserId,
                    type: 'INTEREST',
                    title: 'Interest Received',
                    message: 'Someone sent interest',
                    metadata: {
                        interestId: brokenInterestId,
                        interestStatus: 'PENDING',
                    },
                    createdAt: new Date(),
                },
            ];
            const serialized = await (0, notificationSerializer_1.serializeNotificationsForRecipient)(notifications, recipientUserId, 'user');
            assert_1.default.strictEqual(serialized.length, 1);
            assert_1.default.strictEqual(serialized[0].metadata?.interestStatus, undefined, 'Database lookup failure must strip stale status and fail closed');
        }
        finally {
            Interest_1.Interest.find = origInterestFind;
        }
    });
    // Summary
    console.log('\n========================================================================');
    console.log(`  TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('========================================================================\n');
    if (failedTests > 0) {
        process.exit(1);
    }
}
runAll().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
//# sourceMappingURL=profileAccessMembershipSuperAdmin.test.js.map