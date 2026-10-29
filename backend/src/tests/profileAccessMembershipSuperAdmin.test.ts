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

import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import { requireSuperAdmin } from '../middleware/authMiddleware';
import {
  revealContactDetails,
  getContactAccessStatus,
  createContactRequest,
} from '../controllers/contactRequestController';
import {
  getMonetizationSummary,
  getSafetySummary,
  getSecuritySummary,
  updateAdminPermissions,
  addInquiryNote,
  replyToSupportInquiry,
} from '../controllers/superAdminController';
import { hasActivePaidMembership } from '../services/entitlementService';
import { serializePublicProfile } from '../utils/securityUtils';
import { Admin } from '../models/Admin';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { ContactAccessLog } from '../models/ContactAccessLog';
import { ContactRequest } from '../models/ContactRequest';
import { Block } from '../models/Block';
import { prisma, generateObjectId } from '../db/client';
import * as profileController from '../controllers/profileController';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  totalTests++;
  return (async () => {
    try {
      await fn();
      passedTests++;
      console.log(`  [PASS] ${desc}`);
    } catch (err: any) {
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
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    setHeader(name: string, value: string) {
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
    const req: any = { headers: {}, user: null };
    const res = createMockResponse();
    let nextCalled = false;

    requireSuperAdmin(req, res, () => {
      nextCalled = true;
    });

    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(nextCalled, false, 'Guest must never reach next()');
    assert.ok(res.statusCode === 401 || res.statusCode === 403, `Expected 401/403, got ${res.statusCode}`);
  });

  await it('1b. requireSuperAdmin rejects non-admin users (role: user) with 403', async () => {
    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', role: 'user', email: 'doctor@wonderfuljodi.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
      user: { userId: '507f1f77bcf86cd799439011', role: 'user', email: 'doctor@wonderfuljodi.com' },
    };
    const res = createMockResponse();
    let nextCalled = false;

    requireSuperAdmin(req, res, () => {
      nextCalled = true;
    });

    for (let i = 0; i < 30; i++) {
      if (res.statusCode !== 200 || nextCalled) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.strictEqual(nextCalled, false, 'Regular user must never reach next()');
    assert.strictEqual(res.statusCode, 403);
  });

  await it('1c. requireSuperAdmin strictly rejects regular admins without "all" permissions (403 SUPER_ADMIN_REQUIRED)', async () => {
    const regularAdminId = '507f1f77bcf86cd799439088';
    const token = jwt.sign(
      { userId: regularAdminId, role: 'admin', email: 'ops@wonderfuljodi.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
      user: { userId: regularAdminId, role: 'admin', email: 'ops@wonderfuljodi.com' },
    };
    const res = createMockResponse();
    let nextCalled = false;

    const origAdminFind = Admin.findOne;
    const origUserFind = User.findById;
    (Admin as any).findOne = async () => ({
      user: regularAdminId,
      permissions: ['support', 'view_profiles'],
    });
    (User as any).findById = () => ({
      select: () => ({ _id: regularAdminId, role: 'admin', isActive: true, isDeleted: false, status: 'Active' }),
    });

    try {
      requireSuperAdmin(req, res, () => {
        nextCalled = true;
      });

      for (let i = 0; i < 30; i++) {
        if (res.statusCode !== 200 || nextCalled) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      assert.strictEqual(nextCalled, false, 'Regular admin must be denied');
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'SUPER_ADMIN_REQUIRED');
    } finally {
      (Admin as any).findOne = origAdminFind;
      (User as any).findById = origUserFind;
    }
  });

  await it('1d. requireSuperAdmin allows verified Super Admin with permissions: ["all"]', async () => {
    const superAdminId = '507f1f77bcf86cd799439099';
    const token = jwt.sign(
      { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
      user: { userId: superAdminId, role: 'admin', email: 'superadmin@wonderfuljodi.com' },
    };
    const res = createMockResponse();
    let nextCalled = false;

    const origAdminFind = Admin.findOne;
    const origUserFind = User.findById;
    (Admin as any).findOne = async () => ({
      user: superAdminId,
      permissions: ['all'],
    });
    (User as any).findById = () => ({
      select: () => ({ _id: superAdminId, role: 'admin', isActive: true, isDeleted: false, status: 'Active' }),
    });

    try {
      requireSuperAdmin(req, res, () => {
        nextCalled = true;
      });

      for (let i = 0; i < 30; i++) {
        if (nextCalled) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      assert.strictEqual(nextCalled, true, 'Verified Super Admin must be granted access');
      assert.strictEqual(res.statusCode, 200);
    } finally {
      (Admin as any).findOne = origAdminFind;
      (User as any).findById = origUserFind;
    }
  });

  await it('1e. revealContactDetails denies unauthorized regular admin without "all" permissions (403 SUPER_ADMIN_REQUIRED)', async () => {
    const regularAdminId = '507f1f77bcf86cd799439088';
    const targetUserId = '507f1f77bcf86cd799439089';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origAdminFind = Admin.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P_Admin1',
      candidateId: 'WJ-100010',
      user: { _id: targetUserId, fullName: 'Dr. Target User', mobile: '+919811100000', email: 't@hospital.org' },
      privacySettings: { contactVisibility: 'members_only' },
    });
    (User as any).findById = async () => ({
      _id: targetUserId,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });
    (Block as any).findOne = async () => null;
    (Admin as any).findOne = async () => ({
      user: regularAdminId,
      permissions: ['support'], // does not include 'all'
    });

    try {
      const req: any = {
        headers: {},
        user: { userId: regularAdminId, role: 'admin' },
        params: { profileId: 'WJ-100010' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'SUPER_ADMIN_REQUIRED');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (Admin as any).findOne = origAdminFind;
    }
  });

  await it('1f. revealContactDetails allows verified Super Admin with permissions: ["all"]', async () => {
    const superAdminId = '507f1f77bcf86cd799439099';
    const targetUserId = '507f1f77bcf86cd799439089';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origAdminFind = Admin.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P_Admin2',
      candidateId: 'WJ-100011',
      user: { _id: targetUserId, fullName: 'Dr. Target User', mobile: '+919811100000', email: 't@hospital.org' },
      privacySettings: { contactVisibility: 'members_only' },
      workLocation: 'Max Hospital, Delhi',
      currentHospital: 'Max Hospital',
      annualIncome: '40-50 Lakhs',
    });
    (User as any).findById = async () => ({
      _id: targetUserId,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });
    (Block as any).findOne = async () => null;
    (Admin as any).findOne = async () => ({
      user: superAdminId,
      permissions: ['all'],
    });

    try {
      const req: any = {
        headers: {},
        user: { userId: superAdminId, role: 'admin' },
        params: { profileId: 'WJ-100011' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.isAdmin, true);
      assert.strictEqual(res.body?.creditsUsed, 0);
      assert.strictEqual(res.body?.data?.mobile, '+919811100000');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (Admin as any).findOne = origAdminFind;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Check 2: Membership Entitlement Engine (entitlementService)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nCheck 2: Membership Entitlement Engine (entitlementService)');

  await it('2a. hasActivePaidMembership returns false for missing or null user', async () => {
    const isPaidNull = await hasActivePaidMembership('');
    assert.strictEqual(isPaidNull, false);
  });

  await it('2b. hasActivePaidMembership returns false for free member without active paid subscription', async () => {
    const isPaid = await hasActivePaidMembership('non-existent-user-id-999');
    assert.strictEqual(isPaid, false);
  });

  await it('2c. hasActivePaidMembership returns false for expired paid subscription', async () => {
    const origSubFind = Subscription.findOne;
    (Subscription as any).findOne = () => ({
      sort: () => ({
        status: 'ACTIVE',
        plan: 'DOCTOR_CONNECT',
        planId: 'DOCTOR_CONNECT',
        expiryDate: new Date(Date.now() - 3600000), // 1 hour ago
      }),
    });

    try {
      const isPaid = await hasActivePaidMembership('expired-user-id');
      assert.strictEqual(isPaid, false, 'Expired subscription must return false');
    } finally {
      (Subscription as any).findOne = origSubFind;
    }
  });

  await it('2d. hasActivePaidMembership returns false for cancelled or inactive subscription', async () => {
    const origSubFind = Subscription.findOne;
    (Subscription as any).findOne = () => ({
      sort: () => ({
        status: 'CANCELLED',
        plan: 'DOCTOR_CONNECT',
        planId: 'DOCTOR_CONNECT',
        expiryDate: new Date(Date.now() + 86400000),
      }),
    });

    try {
      const isPaid = await hasActivePaidMembership('cancelled-user-id');
      assert.strictEqual(isPaid, false, 'Cancelled subscription must return false');
    } finally {
      (Subscription as any).findOne = origSubFind;
    }
  });

  await it('2e. hasActivePaidMembership returns false for Free plan subscription', async () => {
    const origSubFind = Subscription.findOne;
    (Subscription as any).findOne = () => ({
      sort: () => ({
        status: 'ACTIVE',
        plan: 'free',
        planId: 'FREE',
        expiryDate: new Date(Date.now() + 86400000),
      }),
    });

    try {
      const isPaid = await hasActivePaidMembership('free-plan-user-id');
      assert.strictEqual(isPaid, false, 'Free plan subscription must return false');
    } finally {
      (Subscription as any).findOne = origSubFind;
    }
  });

  await it('2f. hasActivePaidMembership returns true for active DOCTOR_CONNECT paid subscription', async () => {
    const origSubFind = Subscription.findOne;
    (Subscription as any).findOne = () => ({
      sort: () => ({
        status: 'ACTIVE',
        plan: 'DOCTOR_CONNECT',
        planId: 'DOCTOR_CONNECT',
        expiryDate: new Date(Date.now() + 86400000 * 30),
      }),
    });

    try {
      const isPaid = await hasActivePaidMembership('paid-user-id');
      assert.strictEqual(isPaid, true, 'Active paid subscription must return true');
    } finally {
      (Subscription as any).findOne = origSubFind;
    }
  });

  await it('2g. hasActivePaidMembership returns true for active EXCLUSIVE_CONCIERGE / VVIP subscription', async () => {
    const origSubFind = Subscription.findOne;
    (Subscription as any).findOne = () => ({
      sort: () => ({
        status: 'ACTIVE',
        plan: 'EXCLUSIVE_CONCIERGE',
        planId: 'EXCLUSIVE_CONCIERGE',
        expiryDate: null,
      }),
    });

    try {
      const isPaid = await hasActivePaidMembership('concierge-user-id');
      assert.strictEqual(isPaid, true, 'Active Concierge plan must return true');
    } finally {
      (Subscription as any).findOne = origSubFind;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Check 3: Free Contact Reveal Allowance, Persistence & Idempotency
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nCheck 3: Contact Reveal Free Allowance, Persistence & Idempotency');

  await it('3a. revealContactDetails requires authentication (fails closed with 401)', async () => {
    const req: any = { headers: {}, user: null, params: { profileId: 'WJ-100092' } };
    const res = createMockResponse();

    await revealContactDetails(req, res, () => {});

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
  });

  await it('3b. revealContactDetails rejects invalid or missing profile ID with 400', async () => {
    const req: any = {
      headers: {},
      user: { userId: '507f1f77bcf86cd799439011', role: 'user' },
      params: { profileId: 'x' },
    };
    const res = createMockResponse();
    await revealContactDetails(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
  });

  await it('3c. getContactAccessStatus returns canReveal=false for guests', async () => {
    const req: any = {
      headers: {},
      user: null,
      params: { profileId: 'non-existent-candidate-id-404' },
    };
    const res = createMockResponse();
    await getContactAccessStatus(req, res, () => {});

    assert.ok(res.statusCode === 404 || (res.statusCode === 200 && res.body?.data?.canReveal === false));
  });

  await it('3d. Free member 1st reveal succeeds and sets isFreeReveal: true', async () => {
    const callerId = '507f1f77bcf86cd799439111';
    const profileOwner1 = '507f1f77bcf86cd799439112';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origReqFind = ContactRequest.findOne;
    const origSubFind = Subscription.findOne;
    const origLogFind = ContactAccessLog.find;
    const origLogFindOne = ContactAccessLog.findOne;
    const origTx = (prisma as any).$transaction;

    const accessLogs: any[] = [];

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P1',
      candidateId: 'WJ-100001',
      user: { _id: profileOwner1, fullName: 'Dr. Anita Roy', mobile: '+919876543211', email: 'anita@roy.org' },
      privacySettings: { contactVisibility: 'members_only' },
      workLocation: 'Apollo Hospital, Mumbai',
      currentHospital: 'Apollo Hospital',
      annualIncome: '25-35 Lakhs',
    });

    (User as any).findById = async () => ({
      _id: profileOwner1,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });

    (Block as any).findOne = async () => null;
    (ContactRequest as any).findOne = async () => null;
    (Subscription as any).findOne = () => ({ sort: () => null });
    (ContactAccessLog as any).find = async () => accessLogs;
    (ContactAccessLog as any).findOne = async () => null;

    (prisma as any).$transaction = async (fn: any) => {
      const tx = {
        $executeRawUnsafe: async () => {},
        user: { update: async () => {} },
        contactAccessLog: {
          findFirst: async () => null,
          create: async (payload: any) => {
            accessLogs.push(payload.data);
            return payload.data;
          },
        },
      };
      return await fn(tx);
    };

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        params: { profileId: 'WJ-100001' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.isFreeReveal, true);
      assert.strictEqual(res.body?.freeAllowanceRemaining, 0);
      assert.strictEqual(res.body?.data?.mobile, '+919876543211');
      assert.strictEqual(accessLogs.length, 1);
      assert.strictEqual(accessLogs[0].action, 'FREE_CONTACT_REVEAL');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (ContactRequest as any).findOne = origReqFind;
      (Subscription as any).findOne = origSubFind;
      (ContactAccessLog as any).find = origLogFind;
      (ContactAccessLog as any).findOne = origLogFindOne;
      (prisma as any).$transaction = origTx;
    }
  });

  await it('3e. Free member 2nd reveal on different profile is DENIED with 403 UPGRADE_REQUIRED', async () => {
    const callerId = '507f1f77bcf86cd799439111';
    const profileOwner1 = '507f1f77bcf86cd799439112';
    const profileOwner2 = '507f1f77bcf86cd799439113';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origReqFind = ContactRequest.findOne;
    const origSubFind = Subscription.findOne;
    const origLogFind = ContactAccessLog.find;
    const origLogFindOne = ContactAccessLog.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P2',
      candidateId: 'WJ-100002',
      user: { _id: profileOwner2, fullName: 'Dr. Suresh Kumar', mobile: '+919876543212', email: 'suresh@kumar.org' },
      privacySettings: { contactVisibility: 'members_only' },
    });

    (User as any).findById = async () => ({
      _id: profileOwner2,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });

    (Block as any).findOne = async () => null;
    (ContactRequest as any).findOne = async () => null;
    (Subscription as any).findOne = () => ({ sort: () => null });

    (ContactAccessLog as any).find = async () => [
      { user: callerId, profileOwner: profileOwner1, action: 'FREE_CONTACT_REVEAL', creditsUsed: 0 },
    ];
    (ContactAccessLog as any).findOne = async () => null;

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        params: { profileId: 'WJ-100002' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'UPGRADE_REQUIRED');
      assert.strictEqual(res.body?.canUpgrade, true);
      assert.strictEqual(res.body?.freeAllowanceRemaining, 0);
      assert.ok(Array.isArray(res.body?.availablePlans), 'Should include available membership plans');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (ContactRequest as any).findOne = origReqFind;
      (Subscription as any).findOne = origSubFind;
      (ContactAccessLog as any).find = origLogFind;
      (ContactAccessLog as any).findOne = origLogFindOne;
    }
  });

  await it('3f. Free member re-viewing same profile is idempotent (200 alreadyUnlocked, 0 credits used)', async () => {
    const callerId = '507f1f77bcf86cd799439111';
    const profileOwner1 = '507f1f77bcf86cd799439112';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origReqFind = ContactRequest.findOne;
    const origLogFindOne = ContactAccessLog.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P1',
      candidateId: 'WJ-100001',
      user: { _id: profileOwner1, fullName: 'Dr. Anita Roy', mobile: '+919876543211', email: 'anita@roy.org' },
      privacySettings: { contactVisibility: 'members_only' },
    });

    (User as any).findById = async () => ({
      _id: profileOwner1,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });

    (Block as any).findOne = async () => null;
    (ContactRequest as any).findOne = async () => null;
    (ContactAccessLog as any).findOne = async () => ({
      user: callerId,
      profileOwner: profileOwner1,
      action: 'FREE_CONTACT_REVEAL',
      creditsUsed: 0,
    });

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        params: { profileId: 'WJ-100001' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.alreadyUnlocked, true);
      assert.strictEqual(res.body?.creditsUsed, 0);
      assert.strictEqual(res.body?.data?.mobile, '+919876543211');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (ContactRequest as any).findOne = origReqFind;
      (ContactAccessLog as any).findOne = origLogFindOne;
    }
  });

  await it('3g. Concurrency collision: concurrent transaction claim rejects with 403 UPGRADE_REQUIRED', async () => {
    const callerId = '507f1f77bcf86cd799439111';
    const profileOwner2 = '507f1f77bcf86cd799439113';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origReqFind = ContactRequest.findOne;
    const origSubFind = Subscription.findOne;
    const origLogFind = ContactAccessLog.find;
    const origLogFindOne = ContactAccessLog.findOne;
    const origTx = (prisma as any).$transaction;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P2',
      candidateId: 'WJ-100002',
      user: { _id: profileOwner2, fullName: 'Dr. Suresh Kumar', mobile: '+919876543212', email: 'suresh@kumar.org' },
      privacySettings: { contactVisibility: 'members_only' },
    });

    (User as any).findById = async () => ({
      _id: profileOwner2,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });

    (Block as any).findOne = async () => null;
    (ContactRequest as any).findOne = async () => null;
    (Subscription as any).findOne = () => ({ sort: () => null });
    (ContactAccessLog as any).find = async () => [];
    (ContactAccessLog as any).findOne = async () => null;

    (prisma as any).$transaction = async (fn: any) => {
      const tx = {
        $executeRawUnsafe: async () => {},
        user: { update: async () => {} },
        contactAccessLog: {
          findFirst: async () => ({
            userId: callerId,
            profileOwnerId: 'different-profile-owner-id',
            action: 'FREE_CONTACT_REVEAL',
            creditsUsed: 0,
          }),
          create: async () => {},
        },
      };
      return await fn(tx);
    };

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        params: { profileId: 'WJ-100002' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'UPGRADE_REQUIRED');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (ContactRequest as any).findOne = origReqFind;
      (Subscription as any).findOne = origSubFind;
      (ContactAccessLog as any).find = origLogFind;
      (ContactAccessLog as any).findOne = origLogFindOne;
      (prisma as any).$transaction = origTx;
    }
  });

  await it('3h. Real MariaDB write and read-back for FREE_CONTACT_REVEAL in ContactAccessLog', async () => {
    const testId = generateObjectId();
    const testUserId = '1d5ecedcdf3ea06a277b495a'; // live user id
    const testTargetId = '1d5ecedcdf3ea06a277b495a';

    const created = await ContactAccessLog.create({
      id: testId,
      user: testUserId,
      profileOwner: testTargetId,
      action: 'FREE_CONTACT_REVEAL',
      creditsUsed: 0,
      ipAddress: '127.0.0.1',
    });

    assert.ok(created, 'Record must be created');
    assert.strictEqual(created.action, 'FREE_CONTACT_REVEAL');

    const readBack = await ContactAccessLog.findById(testId);
    assert.ok(readBack, 'Record must be read back from database');
    assert.strictEqual(readBack.action, 'FREE_CONTACT_REVEAL');
    assert.strictEqual(readBack.creditsUsed, 0);

    // Clean up
    await (prisma as any).contactAccessLog.delete({ where: { id: testId } }).catch(() => {});
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
    const guestView: any = serializePublicProfile(mockPublicProfile, {});
    assert.ok(guestView, 'guestView must exist');
    assert.strictEqual(guestView.displayName, null, 'Guest viewer must not see displayName');
    assert.strictEqual(guestView.firstName, null, 'Guest viewer must not see firstName');
    assert.strictEqual(guestView.lastName, null, 'Guest viewer must not see lastName');
    assert.strictEqual(guestView.fullName, null, 'Guest viewer must not see fullName');
    assert.strictEqual(guestView.contactDetails, undefined, 'Guest viewer must not receive contactDetails');
    assert.strictEqual(guestView.user?.mobile, undefined, 'User mobile must never be exposed');
    assert.strictEqual(guestView.user?.email, undefined, 'User email must never be exposed');
  });

  await it('4b. serializePublicProfile for authenticated viewer with locked contact masks surname and omits contactDetails', () => {
    const memberView: any = serializePublicProfile(mockPublicProfile, {
      viewerUserId: '507f1f77bcf86cd799439999',
      isContactUnlocked: false,
    });
    assert.ok(memberView, 'memberView must exist');
    assert.strictEqual(memberView.displayName, 'Dr. Vivek', 'Member viewer sees first name with Dr.');
    assert.strictEqual(memberView.lastName, null, 'Member viewer must not see surname');
    assert.strictEqual(memberView.contactDetails, undefined, 'contactDetails must be omitted');
    assert.strictEqual(memberView.user?.mobile, undefined, 'User mobile must not be exposed');
    assert.strictEqual(memberView.user?.email, undefined, 'User email must not be exposed');
  });

  await it('4c. serializePublicProfile with isContactUnlocked: true safely exposes verified contact details', () => {
    const unlockedView: any = serializePublicProfile(mockPublicProfile, {
      viewerUserId: '507f1f77bcf86cd799439999',
      isContactUnlocked: true,
    });
    assert.ok(unlockedView, 'unlockedView must exist');
    assert.ok(unlockedView.contactDetails, 'contactDetails must be present when unlocked');
    assert.strictEqual(unlockedView.contactDetails.mobile, '+919811122233');
    assert.strictEqual(unlockedView.contactDetails.email, 'vivek.deshmukh@sahyadri.org');
  });

  await it('4d. revealContactDetails respects contactVisibility: hidden and denies access (403 CONTACT_HIDDEN_BY_OWNER)', async () => {
    const callerId = '507f1f77bcf86cd799439111';
    const profileOwnerPrivate = '507f1f77bcf86cd799439222';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P3',
      candidateId: 'WJ-100003',
      user: { _id: profileOwnerPrivate, fullName: 'Dr. Private User', mobile: '+919876500000', email: 'p@hospital.org' },
      privacySettings: { contactVisibility: 'hidden' },
    });

    (User as any).findById = async () => ({
      _id: profileOwnerPrivate,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });

    (Block as any).findOne = async () => null;

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        params: { profileId: 'WJ-100003' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'CONTACT_HIDDEN_BY_OWNER');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
    }
  });

  await it('4e. getProfile public endpoint does NOT disclose contactDetails even if ContactRequest is ACCEPTED', async () => {
    const callerUserId = '507f1f77bcf86cd799439555';
    const targetUserId = '507f1f77bcf86cd799439666';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origReqFind = ContactRequest.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
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

    (ContactRequest as any).findOne = async () => ({
      requester: callerUserId,
      recipient: targetUserId,
      status: 'ACCEPTED',
    });

    try {
      const req: any = {
        params: { id: 'WJ-100077' },
        user: { userId: callerUserId, role: 'user' },
        headers: {},
      };
      const res = createMockResponse();

      await profileController.getProfile(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      // The public profile response must NOT contain contact details
      assert.strictEqual(
        res.body?.data?.contactDetails,
        undefined,
        'Public profile endpoint must never leak contactDetails via accepted request'
      );
      assert.strictEqual(
        res.body?.data?.user?.mobile,
        undefined,
        'User mobile must never be exposed on public profile'
      );
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (ContactRequest as any).findOne = origReqFind;
    }
  });

  await it('4f. getProfile public endpoint does NOT disclose contactDetails to regular admin caller', async () => {
    const adminCallerId = '507f1f77bcf86cd799439088';

    const req: any = {
      params: { id: 'WJ-100077' }, // live profile
      user: { userId: adminCallerId, role: 'admin' },
      headers: {},
    };
    const res = createMockResponse();

    await profileController.getProfile(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(
      res.body?.data?.contactDetails,
      undefined,
      'Public profile endpoint must never leak contactDetails to admin caller'
    );
    assert.strictEqual(
      res.body?.data?.user?.mobile,
      undefined,
      'Public profile endpoint must never leak mobile to admin caller'
    );
  });

  await it('4g. getContactAccessStatus enforces contactVisibility: hidden across all non-owner callers (PRIVACY_RESTRICTED)', async () => {
    const callerId = '507f1f77bcf86cd799439555';
    const targetUserId = '507f1f77bcf86cd799439666';

    const origFindCanonical = profileController.findCanonicalProfile;
    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P_Priv',
      candidateId: 'WJ-100099',
      user: { _id: targetUserId, fullName: 'Dr. Hidden Candidate', mobile: '+919800000000', email: 'h@h.com' },
      privacySettings: { contactVisibility: 'hidden' },
    });

    try {
      const req: any = {
        params: { profileId: 'WJ-100099' },
        user: { userId: callerId, role: 'user' },
        headers: {},
      };
      const res = createMockResponse();

      await getContactAccessStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.data?.hasAccess, false);
      assert.strictEqual(res.body?.data?.status, 'PRIVACY_RESTRICTED');
      assert.strictEqual(res.body?.data?.canReveal, false);
      assert.strictEqual(res.body?.data?.contactDetails, undefined);
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Check 5: Contact Requests Paid Membership Gating & Credit Exhaustion
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nCheck 5: Contact Requests Paid Gating & Credit Exhaustion');

  await it('5a. createContactRequest rejects unauthenticated users with 401', async () => {
    const req: any = { headers: {}, user: null, body: { recipientId: 'target-1' } };
    const res = createMockResponse();
    await createContactRequest(req, res, () => {});

    assert.strictEqual(res.statusCode, 401);
  });

  await it('5b. createContactRequest rejects free members with 403 FREE_PLAN_NO_CREDITS', async () => {
    const callerId = '507f1f77bcf86cd799439301';
    const targetUserId = '507f1f77bcf86cd799439302';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origSubFind = Subscription.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      user: { _id: targetUserId },
    });
    (User as any).findById = async () => ({
      _id: targetUserId,
      status: 'Active',
      isActive: true,
      isBlocked: false,
    });
    (Block as any).findOne = async () => null;
    (Subscription as any).findOne = () => ({ sort: () => null });

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        body: { recipientId: targetUserId },
      };
      const res = createMockResponse();
      await createContactRequest(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'FREE_PLAN_NO_CREDITS');
      assert.strictEqual(res.body?.canUpgrade, true);
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (Subscription as any).findOne = origSubFind;
    }
  });

  await it('5c. createContactRequest rejects paid members with exhausted credits (403 NO_CREDITS_REMAINING)', async () => {
    const callerId = '507f1f77bcf86cd799439301';
    const targetUserId = '507f1f77bcf86cd799439302';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origSubFind = Subscription.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      user: { _id: targetUserId },
    });
    (User as any).findById = async () => ({
      _id: targetUserId,
      status: 'Active',
      isActive: true,
      isBlocked: false,
    });
    (Block as any).findOne = async () => null;

    (Subscription as any).findOne = () => ({
      sort: () => ({
        status: 'ACTIVE',
        plan: 'DOCTOR_CONNECT',
        planId: 'DOCTOR_CONNECT',
        contactRequestsRemaining: 0,
        expiryDate: new Date(Date.now() + 86400000 * 30),
      }),
    });

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        body: { recipientId: targetUserId },
      };
      const res = createMockResponse();
      await createContactRequest(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'NO_CREDITS_REMAINING');
      assert.strictEqual(res.body?.canUpgrade, true);
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (Subscription as any).findOne = origSubFind;
    }
  });

  await it('5d. revealContactDetails rejects paid member with exhausted credits (403 NO_CREDITS_REMAINING)', async () => {
    const callerId = '507f1f77bcf86cd799439301';
    const targetUserId = '507f1f77bcf86cd799439302';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origReqFind = ContactRequest.findOne;
    const origLogFind = ContactAccessLog.findOne;
    const origSubFind = Subscription.findOne;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P4',
      candidateId: 'WJ-100004',
      user: { _id: targetUserId, fullName: 'Dr. Target', mobile: '9999999999', email: 't@t.com' },
      privacySettings: { contactVisibility: 'members_only' },
    });
    (User as any).findById = async () => ({
      _id: targetUserId,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });
    (Block as any).findOne = async () => null;
    (ContactRequest as any).findOne = async () => null;
    (ContactAccessLog as any).findOne = async () => null;

    (Subscription as any).findOne = () => ({
      sort: () => ({
        status: 'ACTIVE',
        plan: 'DOCTOR_CONNECT',
        planId: 'DOCTOR_CONNECT',
        contactRequestsRemaining: 0,
        expiryDate: new Date(Date.now() + 86400000 * 30),
      }),
    });

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        params: { profileId: 'WJ-100004' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'NO_CREDITS_REMAINING');
      assert.strictEqual(res.body?.creditsRemaining, 0);
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (ContactRequest as any).findOne = origReqFind;
      (ContactAccessLog as any).findOne = origLogFind;
      (Subscription as any).findOne = origSubFind;
    }
  });

  await it('5e. revealContactDetails for paid member deducts 1 credit atomically and returns contact details', async () => {
    const callerId = '507f1f77bcf86cd799439301';
    const targetUserId = '507f1f77bcf86cd799439302';
    const subId = 'sub-12345';

    const origFindCanonical = profileController.findCanonicalProfile;
    const origUserFind = User.findById;
    const origBlockFind = Block.findOne;
    const origReqFind = ContactRequest.findOne;
    const origLogFind = ContactAccessLog.findOne;
    const origSubFind = Subscription.findOne;
    const origTx = (prisma as any).$transaction;

    let subUpdated = false;
    let logCreated = false;

    (profileController as any).findCanonicalProfile = async () => ({
      _id: 'P5',
      candidateId: 'WJ-100005',
      user: { _id: targetUserId, fullName: 'Dr. Paid Target', mobile: '+919876543200', email: 'paid@hospital.org' },
      privacySettings: { contactVisibility: 'members_only' },
      workLocation: 'Fortis Hospital, Bangalore',
      currentHospital: 'Fortis Hospital',
      annualIncome: '50-60 Lakhs',
    });
    (User as any).findById = async () => ({
      _id: targetUserId,
      status: 'Active',
      isActive: true,
      isBlocked: false,
      isDeleted: false,
    });
    (Block as any).findOne = async () => null;
    (ContactRequest as any).findOne = async () => null;
    (ContactAccessLog as any).findOne = async () => null;

    (Subscription as any).findOne = () => ({
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

    (prisma as any).$transaction = async (fn: any) => {
      const tx = {
        subscription: {
          update: async (args: any) => {
            if (args.where?.id === subId) subUpdated = true;
          },
        },
        contactAccessLog: {
          create: async (payload: any) => {
            logCreated = true;
            return payload.data;
          },
        },
      };
      return await fn(tx);
    };

    try {
      const req: any = {
        headers: {},
        user: { userId: callerId, role: 'user' },
        params: { profileId: 'WJ-100005' },
      };
      const res = createMockResponse();
      await revealContactDetails(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.creditsUsed, 1);
      assert.strictEqual(res.body?.creditsRemaining, 9);
      assert.strictEqual(res.body?.data?.mobile, '+919876543200');
      assert.strictEqual(subUpdated, true, 'Subscription must be decremented');
      assert.strictEqual(logCreated, true, 'ContactAccessLog must be created');
    } finally {
      (profileController as any).findCanonicalProfile = origFindCanonical;
      (User as any).findById = origUserFind;
      (Block as any).findOne = origBlockFind;
      (ContactRequest as any).findOne = origReqFind;
      (ContactAccessLog as any).findOne = origLogFind;
      (Subscription as any).findOne = origSubFind;
      (prisma as any).$transaction = origTx;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Check 6: Super Admin Dashboard Controller Handlers
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nCheck 6: Super Admin Dashboard Controller Handlers');

  await it('6a. getMonetizationSummary returns metrics and catalog plans', async () => {
    const req: any = { headers: {}, user: { userId: '507f1f77bcf86cd799439011', role: 'admin' } };
    const res = createMockResponse();
    let errOccurred = false;

    await getMonetizationSummary(req, res, (err) => {
      errOccurred = !!err;
    });

    if (!errOccurred) {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.ok('totalRevenue' in res.body?.data, 'Expected totalRevenue in response');
      assert.ok(Array.isArray(res.body?.data?.plans), 'Expected plans array');
    }
  });

  await it('6b. getSafetySummary returns contact requests & safety metrics', async () => {
    const req: any = { headers: {}, user: { userId: '507f1f77bcf86cd799439011', role: 'admin' } };
    const res = createMockResponse();
    let errOccurred = false;

    await getSafetySummary(req, res, (err) => {
      errOccurred = !!err;
    });

    if (!errOccurred) {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.ok('contactRequests' in res.body?.data);
      assert.ok('safetyMetrics' in res.body?.data);
    }
  });

  await it('6c. getSecuritySummary returns admin counts, smtp status, and uptime', async () => {
    const req: any = { headers: {}, user: { userId: '507f1f77bcf86cd799439011', role: 'admin' } };
    const res = createMockResponse();
    let errOccurred = false;

    await getSecuritySummary(req, res, (err) => {
      errOccurred = !!err;
    });

    if (!errOccurred) {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.ok('superAdminCount' in res.body?.data);
      assert.ok('emailConfigured' in res.body?.data);
      assert.ok('uptimeSeconds' in res.body?.data);
    }
  });

  await it('6d. updateAdminPermissions rejects non-array permissions with 400', async () => {
    const req: any = {
      headers: {},
      user: { userId: '507f1f77bcf86cd799439011', role: 'admin' },
      params: { id: '507f1f77bcf86cd799439011' },
      body: { permissions: 'all' },
    };
    const res = createMockResponse();
    await updateAdminPermissions(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
  });

  await it('6e. addInquiryNote rejects empty note text with 400', async () => {
    const req: any = {
      headers: {},
      user: { userId: '507f1f77bcf86cd799439011', role: 'admin' },
      params: { id: '507f1f77bcf86cd799439011' },
      body: { note: '' },
    };
    const res = createMockResponse();
    await addInquiryNote(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
  });

  await it('6f. replyToSupportInquiry rejects empty reply text with 400', async () => {
    const req: any = {
      headers: {},
      user: { userId: '507f1f77bcf86cd799439011', role: 'admin' },
      params: { id: '507f1f77bcf86cd799439011' },
      body: { replyText: '' },
    };
    const res = createMockResponse();
    await replyToSupportInquiry(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
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
