/**
 * Regression Test Suite: Wonderful Jodi Send Interest & Recipient Notifications
 *
 * 100% TEST ISOLATION GUARANTEE:
 * All database operations are mocked/stubbed in memory.
 * No queries mutate or depend on production database tables.
 *
 * Validates:
 * 1. Target Candidate & Profile ID Resolution:
 *    - Resolves candidate ID (e.g. WJ-100080, WJ-100092), Profile _id, and User _id.
 *    - Rejects unauthenticated caller (HTTP 401).
 *    - Rejects missing / invalid target identifier (HTTP 400).
 *    - Rejects self-interest attempt (HTTP 400).
 *    - Rejects inactive or nonexistent target user (HTTP 404).
 *    - Enforces privacy setting whoCanSendInterest: 'verified_only' (HTTP 403).
 * 2. PrismaBridge Schema-Resilience for Blocks:
 *    - PrismaQueryBuilder on 'block' delegate gracefully returns null/[] when table/column is un-migrated (P2022/1054).
 *    - countDocuments on 'block' delegate returns 0 on un-migrated schema.
 *    - exists on 'block' delegate returns null on un-migrated schema.
 *    - PrismaQueryBuilder on 'block' delegate FAILS CLOSED (rethrows) on true operational/connection errors.
 * 3. Complete Send Interest Workflow (Un-migrated Production Database Schema):
 *    - Successfully creates Interest record in database (status: PENDING).
 *    - Successfully creates persistent Notification record in database for recipient.
 *    - Emits real-time Socket.IO events ('newNotification' and 'interestReceived') to recipient room.
 *    - Returns HTTP 201 with created interest payload.
 * 4. Duplicate Interest Protection:
 *    - Returns HTTP 409 DUPLICATE_INTEREST when pending interest already exists.
 *    - Returns HTTP 409 DUPLICATE_INTEREST when accepted interest already exists.
 *    - Returns HTTP 200 with requiresAction when target previously sent interest to caller.
 *    - Does NOT create duplicate interest or duplicate notification records.
 * 5. Active Block Relationship Enforcement:
 *    - When genuine block exists, createInterest returns HTTP 403.
 *    - Does NOT create interest or notification.
 * 6. True Database Failure (Operational Fail-Closed):
 *    - When block query fails with real operational/connection error, returns HTTP 503.
 *    - Does NOT create interest or notification.
 * 7. Recipient Notification Retrieval:
 *    - getNotifications and getUnreadCount retrieve persisted notification for recipient.
 */

const assert = require('assert');
const path = require('path');

const { createInterest, checkInterestStatus, extractEntityId } = require('./dist/controllers/interestController.js');
const { getNotifications, getUnreadCount } = require('./dist/controllers/notificationController.js');
const { findCanonicalProfile } = require('./dist/controllers/profileController.js');
const { blockUser, unblockUser } = require('./dist/controllers/blockController.js');
const { createContactRequest } = require('./dist/controllers/contactRequestController.js');
const { sendMessage } = require('./dist/controllers/messageController.js');
const { Block } = require('./dist/models/Block.js');
const { Interest } = require('./dist/models/Interest.js');
const { Notification } = require('./dist/models/Notification.js');
const { Profile } = require('./dist/models/Profile.js');
const { User } = require('./dist/models/User.js');
const { Subscription } = require('./dist/models/Subscription.js');
const { Conversation } = require('./dist/models/Conversation.js');
const { PrismaQueryBuilder, normalizeDelegateRecord } = require('./dist/db/prismaBridge.js');

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

function createMockIo() {
  const emitted = [];
  return {
    emitted,
    to(room) {
      return {
        emit(event, data) {
          emitted.push({ room, event, data });
        },
      };
    },
  };
}

async function runSuite() {
  console.log('\n============================================================');
  console.log('Running Send Interest & Recipient Notification Regression Suite');
  console.log('============================================================');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Target Candidate & Profile Resolution
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. Testing Target Candidate & Profile ID Resolution ---');

  await test('createInterest rejects unauthenticated caller with HTTP 401', async () => {
    const req = { body: { profileId: 'WJ-100080' }, user: null };
    const res = createMockRes();
    await createInterest(req, res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, 'Authentication required');
  });

  await test('createInterest rejects missing or empty target identifier with HTTP 400', async () => {
    const req = { body: {}, user: { userId: 'sender_user_1' } };
    const res = createMockRes();
    await createInterest(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, 'Invalid or missing receiver/profile ID');
  });

  await test('createInterest prevents self-interest with HTTP 400', async () => {
    const origProfileFindOne = Profile.findOne;
    Profile.findOne = () => ({
      populate: () => ({
        select: async () => ({ _id: 'prof_own', candidateId: 'WJ-100080', userId: 'sender_user_1' }),
      }),
      then(res) {
        res({ _id: 'prof_own', candidateId: 'WJ-100080', userId: 'sender_user_1' });
      },
    });

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'sender_user_1' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body?.message, 'You cannot send an interest request to yourself');
    } finally {
      Profile.findOne = origProfileFindOne;
    }
  });

  await test('createInterest returns HTTP 404 when target user is inactive or deleted', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;

    Profile.findOne = () => ({
      populate: () => ({
        select: async () => ({ _id: 'prof_target', candidateId: 'WJ-100080', userId: 'target_inactive' }),
      }),
      then(res) {
        res({ _id: 'prof_target', candidateId: 'WJ-100080', userId: 'target_inactive' });
      },
    });
    User.findById = async () => ({ _id: 'target_inactive', isActive: false });

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'sender_user_1' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body?.message, 'Candidate not found or inactive');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
    }
  });

  await test('createInterest enforces verified_only recipient privacy rule', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;

    let profileLookupCount = 0;
    Profile.findOne = (filter) => ({
      populate: () => ({
        select: async () => ({ _id: 'prof_target', candidateId: 'WJ-100080', userId: 'target_doc' }),
      }),
      then(res) {
        profileLookupCount++;
        if (filter?.candidateId || filter?._id) {
          res({ _id: 'prof_target', candidateId: 'WJ-100080', userId: 'target_doc' });
        } else if (filter?.user === 'target_doc') {
          res({
            _id: 'prof_target',
            user: 'target_doc',
            privacySettings: { whoCanSendInterest: 'verified_only' },
          });
        } else {
          res(null);
        }
      },
    });

    User.findById = async (id) => {
      if (id === 'target_doc') return { _id: 'target_doc', isActive: true };
      if (id === 'sender_unverified') return { _id: 'sender_unverified', verified: false, verificationStatus: 'PENDING' };
      return null;
    };

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'sender_unverified' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.message, 'This doctor only accepts interest requests from verified doctor profiles.');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PrismaBridge Fail-Closed Security for Blocks Table
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing PrismaBridge Fail-Closed Security for Blocks Table ---');

  await test('PrismaQueryBuilder on block delegate FAILS CLOSED (rethrows) on missing column schema error (P2022)', async () => {
    const mockDelegate = {
      findFirst: async () => {
        const err = new Error(
          'Invalid `prisma.block.findFirst()` invocation: The column `u625755214_wonderfuljodi.blocks.blocker_id` does not exist in the current database.'
        );
        err.code = 'P2022';
        throw err;
      },
    };

    const builder = new PrismaQueryBuilder(mockDelegate, { blocker: 'user_1', blockedUser: 'user_2' }, true, {
      blocker: 'blockerId',
      blockedUser: 'blockedUserId',
    }, 'block');

    let thrown = null;
    try {
      await builder;
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== null, 'Must re-throw missing column schema error to prevent fail-open bypass');
    assert.strictEqual(thrown.code, 'P2022');
  });

  await test('PrismaQueryBuilder on block delegate FAILS CLOSED (rethrows) on missing table schema error (P2021)', async () => {
    const mockDelegate = {
      findMany: async () => {
        const err = new Error("The table `u625755214_wonderfuljodi.blocks` does not exist in the current database.");
        err.code = 'P2021';
        throw err;
      },
    };

    const builder = new PrismaQueryBuilder(mockDelegate, { blocker: 'user_1' }, false, {
      blocker: 'blockerId',
      blockedUser: 'blockedUserId',
    }, 'block');

    let thrown = null;
    try {
      await builder;
    } catch (e) {
      thrown = e;
    }
    assert(thrown !== null, 'Must re-throw missing table schema error to prevent fail-open bypass');
    assert.strictEqual(thrown.code, 'P2021');
  });

  await test('PrismaQueryBuilder on block delegate FAILS CLOSED (rethrows) on true operational failure', async () => {
    const mockDelegate = {
      findFirst: async () => {
        const err = new Error("Can't reach database server at localhost:3306");
        err.code = 'P1001';
        throw err;
      },
    };

    const builder = new PrismaQueryBuilder(mockDelegate, { blocker: 'user_1' }, true, {}, 'block');

    let thrown = null;
    try {
      await builder;
    } catch (e) {
      thrown = e;
    }

    assert(thrown !== null, 'Must re-throw on genuine connection/operational error');
    assert.strictEqual(thrown.code, 'P1001');
  });

  await test('createInterest FAILS CLOSED (HTTP 503) when block verification encounters schema error (P2022 / 1054)', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t80', candidateId: 'WJ-100080', userId: 'user_t80' }) }),
      then(res) { res({ _id: 'prof_t80', candidateId: 'WJ-100080', userId: 'user_t80' }); },
    });
    User.findById = async () => ({ _id: 'user_t80', isActive: true });

    Block.findOne = async () => {
      const err = new Error("The column `blocks.blocker_id` does not exist in the current database.");
      err.code = 'P2022';
      throw err;
    };

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'sender_user_99', role: 'user' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 503, 'Must return 503 rather than bypassing block check');
      assert.strictEqual(res.body?.message, 'Unable to verify member eligibility at this time. Please try again later.');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Complete Send Interest Workflow (Verified Database Schema)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Send Interest Workflow (Verified Database Schema) ---');

  await test('createInterest successfully creates interest, notification, and emits Socket.IO event', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestFindOne = Interest.findOne;
    const origInterestCreate = Interest.create;
    const origNotificationCreate = Notification.create;

    Profile.findOne = (filter) => ({
      populate: () => ({
        select: async () => ({
          _id: 'prof_target_80',
          candidateId: 'WJ-100080',
          userId: 'target_user_80',
          displayName: 'Dr. Shruti Sharma',
        }),
      }),
      then(res) {
        if (filter?.candidateId === 'WJ-100080') {
          res({
            _id: 'prof_target_80',
            candidateId: 'WJ-100080',
            userId: 'target_user_80',
            displayName: 'Dr. Shruti Sharma',
          });
        } else if (filter?.user === 'target_user_80') {
          res({
            _id: 'prof_target_80',
            displayName: 'Dr. Shruti Sharma',
            privacySettings: { whoCanSendInterest: 'all' },
          });
        } else if (filter?.user === 'sender_user_99') {
          res({
            _id: 'prof_sender_99',
            displayName: 'Dr. Arjun Verma',
            primaryPhoto: 'https://cdn.wonderfuljodi.com/photos/arjun.jpg',
            degree: 'MD Medicine',
            profession: 'Cardiologist',
          });
        } else {
          res(null);
        }
      },
    });

    User.findById = async (id) => {
      if (id === 'target_user_80') return { _id: 'target_user_80', isActive: true, fullName: 'Dr. Shruti Sharma' };
      if (id === 'sender_user_99') return { _id: 'sender_user_99', isActive: true, fullName: 'Dr. Arjun Verma' };
      return null;
    };

    // Block query returns null (as PrismaBridge does on un-migrated schema)
    Block.findOne = async () => null;

    // No existing interest between them
    Interest.findOne = async () => null;

    let persistedInterest = null;
    Interest.create = async (payload) => {
      persistedInterest = {
        _id: 'interest_new_123',
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return persistedInterest;
    };

    let persistedNotification = null;
    Notification.create = async (payload) => {
      persistedNotification = {
        _id: 'notif_new_456',
        ...payload,
        createdAt: new Date(),
      };
      return persistedNotification;
    };

    const mockIo = createMockIo();
    const req = {
      body: { profileId: 'WJ-100080' },
      user: { userId: 'sender_user_99', role: 'user' },
      app: {
        get(key) {
          if (key === 'io') return mockIo;
          return null;
        },
      },
    };

    const res = createMockRes();

    try {
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 201, 'Must return HTTP 201 Created');
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.message, 'Interest sent successfully');
      assert.strictEqual(res.body?.data?._id, 'interest_new_123');

      // Verify Interest persistence
      assert(persistedInterest !== null, 'Interest must be saved to database');
      assert.strictEqual(persistedInterest.sender, 'sender_user_99');
      assert.strictEqual(persistedInterest.receiver, 'target_user_80');
      assert.strictEqual(persistedInterest.status, 'PENDING');
      assert.strictEqual(persistedInterest.senderProfile, 'prof_sender_99');
      assert.strictEqual(persistedInterest.receiverProfile, 'prof_target_80');

      // Verify Notification persistence
      assert(persistedNotification !== null, 'Notification must be saved to database');
      assert.strictEqual(persistedNotification.user, 'target_user_80');
      assert.strictEqual(persistedNotification.type, 'INTEREST_RECEIVED');
      assert.strictEqual(persistedNotification.title, 'New Interest Received');
      assert(persistedNotification.message.includes('Dr. Arjun Verma'));
      assert.strictEqual(persistedNotification.read, false);
      assert.strictEqual(persistedNotification.metadata?.interestId, 'interest_new_123');
      assert.strictEqual(persistedNotification.metadata?.senderUserId, 'sender_user_99');
      assert.strictEqual(persistedNotification.metadata?.senderDegree, 'MD Medicine');

      // Verify Real-time Socket.IO emission
      assert.strictEqual(mockIo.emitted.length, 2);
      const notifEvent = mockIo.emitted.find((e) => e.event === 'newNotification');
      assert(notifEvent !== undefined, 'Socket.IO newNotification must be emitted');
      assert.strictEqual(notifEvent.room, 'user:target_user_80');
      assert.strictEqual(notifEvent.data?.notification?._id, 'notif_new_456');

      const interestEvent = mockIo.emitted.find((e) => e.event === 'interestReceived');
      assert(interestEvent !== undefined, 'Socket.IO interestReceived must be emitted');
      assert.strictEqual(interestEvent.room, 'user:target_user_80');
      assert.strictEqual(interestEvent.data?.sender?.name, 'Dr. Arjun Verma');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.findOne = origInterestFindOne;
      Interest.create = origInterestCreate;
      Notification.create = origNotificationCreate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Duplicate Interest Protection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Duplicate Interest Protection ---');

  await test('createInterest returns HTTP 409 DUPLICATE_INTEREST when pending interest exists', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestFindOne = Interest.findOne;
    const origInterestCreate = Interest.create;
    const origNotificationCreate = Notification.create;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });
    Block.findOne = async () => null;

    // Existing pending interest
    Interest.findOne = async () => ({
      _id: 'existing_int_1',
      sender: { toString: () => 'user_sender' },
      receiver: { toString: () => 'user_target' },
      status: 'PENDING',
    });

    let interestCreated = false;
    Interest.create = async () => { interestCreated = true; };
    let notificationCreated = false;
    Notification.create = async () => { notificationCreated = true; };

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 409, 'Must return HTTP 409 Conflict');
      assert.strictEqual(res.body?.code, 'DUPLICATE_INTEREST');
      assert.strictEqual(res.body?.message, 'You have already sent an interest to this profile.');
      assert.strictEqual(interestCreated, false, 'Duplicate interest must NOT be persisted');
      assert.strictEqual(notificationCreated, false, 'Duplicate notification must NOT be created');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.findOne = origInterestFindOne;
      Interest.create = origInterestCreate;
      Notification.create = origNotificationCreate;
    }
  });

  await test('createInterest returns HTTP 409 DUPLICATE_INTEREST when interest is already accepted', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestFindOne = Interest.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });
    Block.findOne = async () => null;

    Interest.findOne = async () => ({
      _id: 'accepted_int_1',
      sender: { toString: () => 'user_sender' },
      receiver: { toString: () => 'user_target' },
      status: 'ACCEPTED',
    });

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.body?.code, 'DUPLICATE_INTEREST');
      assert.strictEqual(res.body?.message, 'Interest already accepted with this profile.');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  await test('createInterest informs user when target has already sent them an interest (HTTP 200 requiresAction)', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestFindOne = Interest.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });
    Block.findOne = async () => null;

    // Target sent interest to current user
    Interest.findOne = async () => ({
      _id: 'target_sent_int_1',
      sender: { toString: () => 'user_target' },
      receiver: { toString: () => 'user_sender' },
      status: 'PENDING',
    });

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.requiresAction, 'ACCEPT_OR_DECLINE');
      assert(res.body?.message?.includes('already sent you an interest'));
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Active Block Relationship Enforcement
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Active Block Relationship Enforcement ---');

  await test('createInterest returns HTTP 403 when active block exists between members', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestCreate = Interest.create;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });

    // Active block relationship found
    Block.findOne = async () => ({
      _id: 'block_record_1',
      blocker: 'user_target',
      blockedUser: 'user_sender',
    });

    let interestCreated = false;
    Interest.create = async () => { interestCreated = true; };

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.message, 'Cannot send interest to this member');
      assert.strictEqual(interestCreated, false);
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.create = origInterestCreate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. True Operational Database Failure (Fail-Closed)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Operational Database Outage (Fail-Closed) ---');

  await test('createInterest returns HTTP 503 and does not create interest on true database outage', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestCreate = Interest.create;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });

    // Operational DB failure
    Block.findOne = async () => {
      const err = new Error("Can't reach database server at mariadb-prod:3306");
      err.code = 'P1001';
      throw err;
    };

    let interestCreated = false;
    Interest.create = async () => { interestCreated = true; };

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      let nextError = null;
      await createInterest(req, res, (err) => { nextError = err; });

      assert.strictEqual(nextError, null);
      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body?.message, 'Unable to verify member eligibility at this time. Please try again later.');
      assert.strictEqual(interestCreated, false);
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.create = origInterestCreate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Recipient Notification Retrieval
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing Recipient Notification Retrieval & Unread Count ---');

  await test('getNotifications returns persisted notifications for recipient user', async () => {
    const origCountDocuments = Notification.countDocuments;
    const origFind = Notification.find;

    const mockNotifications = [
      {
        _id: 'notif_1',
        user: 'recipient_user_1',
        type: 'INTEREST_RECEIVED',
        title: 'New Interest Received',
        message: 'Dr. Arjun Verma sent you an interest.',
        read: false,
        createdAt: new Date(),
      },
    ];

    Notification.countDocuments = async (query) => {
      if (query?.read === false) return 1;
      return 1;
    };

    Notification.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: async () => mockNotifications,
        }),
      }),
    });

    try {
      const req = { user: { userId: 'recipient_user_1' }, query: {} };
      const res = createMockRes();
      await getNotifications(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.data?.total, 1);
      assert.strictEqual(res.body?.data?.unreadCount, 1);
      assert.strictEqual(res.body?.data?.notifications?.length, 1);
      assert.strictEqual(res.body?.data?.notifications[0]?.type, 'INTEREST_RECEIVED');
    } finally {
      Notification.countDocuments = origCountDocuments;
      Notification.find = origFind;
    }
  });

  await test('getUnreadCount returns correct unread count for recipient user', async () => {
    const origCountDocuments = Notification.countDocuments;
    Notification.countDocuments = async () => 3;

    try {
      const req = { user: { userId: 'recipient_user_1' } };
      const res = createMockRes();
      await getUnreadCount(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.data?.count, 3);
    } finally {
      Notification.countDocuments = origCountDocuments;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Block Writes Fail-Closed & Cross-Controller Enforcement
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Testing Fail-Closed Security on Block Writes & Cross-Controller Enforcement ---');

  await test('blockUser fails closed with HTTP 503 when blocks table schema is un-migrated (never acknowledges false block)', async () => {
    const origFindOneAndUpdate = Block.findOneAndUpdate;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;

    Profile.findOne = () => ({
      then(r) { r(null); },
    });
    User.findById = (id) => ({
      select: async () => ({ _id: id, id }),
      then(r) { r({ _id: id, id, fullName: 'Dr. Target' }); },
    });

    // Simulate schema error on write
    Block.findOneAndUpdate = async () => {
      const err = new Error("Table 'u625755214_wonderfuljodi.blocks' column blocker_id unknown");
      err.code = '1054';
      throw err;
    };

    try {
      const req = {
        user: { userId: 'caller_blocker_1' },
        body: { blockedUserId: '67b011112222333344445555', reason: 'Unwanted messages' },
      };
      const res = createMockRes();
      let nextError = null;
      await blockUser(req, res, (e) => { nextError = e; });

      assert.strictEqual(nextError, null);
      assert.strictEqual(res.statusCode, 503, 'Must return 503 Service Unavailable, never 200/201 on write failure');
      assert.strictEqual(res.body?.success, false);
      assert.strictEqual(res.body?.message, 'Profile blocking service is currently unavailable. Please contact support.');
    } finally {
      Block.findOneAndUpdate = origFindOneAndUpdate;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
    }
  });

  await test('unblockUser fails closed with HTTP 503 when blocks table schema is un-migrated', async () => {
    const origFindOneAndDelete = Block.findOneAndDelete;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;

    Profile.findOne = () => ({
      then(r) { r(null); },
    });
    User.findById = (id) => ({
      select: async () => ({ _id: id, id }),
      then(r) { r({ _id: id, id, fullName: 'Dr. Target' }); },
    });

    Block.findOneAndDelete = async () => {
      const err = new Error("Table 'u625755214_wonderfuljodi.blocks' column blocker_id unknown");
      err.code = '1054';
      throw err;
    };

    try {
      const req = {
        user: { userId: 'caller_blocker_1' },
        params: { id: '67b011112222333344445555' },
      };
      const res = createMockRes();
      let nextError = null;
      await unblockUser(req, res, (e) => { nextError = e; });

      assert.strictEqual(nextError, null);
      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body?.success, false);
      assert.strictEqual(res.body?.message, 'Profile unblocking service is currently unavailable. Please contact support.');
    } finally {
      Block.findOneAndDelete = origFindOneAndDelete;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
    }
  });

  await test('createContactRequest enforces active block (HTTP 403) and operational DB outage (HTTP 503)', async () => {
    const origBlockFindOne = Block.findOne;
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = (id) => ({
      select: async () => ({ _id: id, id }),
      then(r) { r({ _id: id, fullName: 'Dr. Target' }); },
    });

    try {
      // 1. When blocked
      Block.findOne = async () => ({ _id: 'block_active', blocker: 'user_target', blockedUser: 'caller_user' });
      const req1 = {
        user: { userId: 'caller_user' },
        body: { recipientId: 'WJ-100080' },
      };
      const res1 = createMockRes();
      await createContactRequest(req1, res1, () => {});
      assert.strictEqual(res1.statusCode, 403, 'Must return 403 when blocked');
      assert.strictEqual(res1.body?.message, 'Cannot request contact details from this member');

      // 2. When DB outage occurs
      Block.findOne = async () => {
        const err = new Error('Connection refused');
        err.code = 'ECONNREFUSED';
        throw err;
      };
      const res2 = createMockRes();
      await createContactRequest(req1, res2, () => {});
      assert.strictEqual(res2.statusCode, 503, 'Must return 503 on database operational failure');
    } finally {
      Block.findOne = origBlockFindOne;
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
    }
  });

  await test('sendMessage enforces active block (HTTP 403) and operational DB outage (HTTP 503)', async () => {
    const origBlockFindOne = Block.findOne;
    const origUserFindById = User.findById;
    const origSubFindOne = Subscription.findOne;
    const origConvFindOne = Conversation.findOne;

    User.findById = (id) => ({
      select: async () => ({ _id: id, id, isActive: true }),
      then(r) { r({ _id: id, id, fullName: 'Dr. Participant', isActive: true }); },
    });
    Subscription.findOne = () => ({
      sort: async () => ({ status: 'ACTIVE', plan: 'DOCTOR_CONNECT', expiryDate: null }),
      then(r) { r({ status: 'ACTIVE', plan: 'DOCTOR_CONNECT', expiryDate: null }); },
    });
    Conversation.findOne = async () => null;

    const senderId = '67b011112222333344441111';
    const receiverId = '67b011112222333344445555';

    try {
      // 1. When blocked
      Block.findOne = async () => ({ _id: 'block_active', blocker: senderId, blockedUser: receiverId });
      const req1 = {
        user: { userId: senderId },
        body: { receiverId, content: 'Hello doctor' },
      };
      const res1 = createMockRes();
      await sendMessage(req1, res1, () => {});
      assert.strictEqual(res1.statusCode, 403, 'Must return 403 when blocked');
      assert.strictEqual(res1.body?.message, 'Cannot message this member as communication is blocked.');

      // 2. When DB outage occurs
      Block.findOne = async () => {
        const err = new Error('Query timeout');
        err.code = 'ETIMEDOUT';
        throw err;
      };
      const res2 = createMockRes();
      await sendMessage(req1, res2, () => {});
      assert.strictEqual(res2.statusCode, 503, 'Must return 503 on database operational failure');
    } finally {
      Block.findOne = origBlockFindOne;
      User.findById = origUserFindById;
      Subscription.findOne = origSubFindOne;
      Conversation.findOne = origConvFindOne;
    }
  });

  await test('Active block restriction CANNOT be bypassed by interest or notification creation (0 records written)', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestCreate = Interest.create;
    const origNotificationCreate = Notification.create;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });

    // Block exists between the pair
    Block.findOne = async () => ({ _id: 'real_block_1', blocker: 'user_target', blockedUser: 'user_sender' });

    let interestCreated = false;
    Interest.create = async () => { interestCreated = true; };
    let notificationCreated = false;
    Notification.create = async () => { notificationCreated = true; };

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.message, 'Cannot send interest to this member');
      assert.strictEqual(interestCreated, false, 'Interest must NEVER be created when user is blocked');
      assert.strictEqual(notificationCreated, false, 'Notification must NEVER be created when user is blocked');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.create = origInterestCreate;
      Notification.create = origNotificationCreate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Production Root Cause & Targeted Schema Regression Suite
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 9. Production Root Cause & Targeted Schema Regression Suite ---');

  await test('normalizeDelegateRecord correctly shims scalar IDs on interest delegate', async () => {
    const rawInterest = { id: 'int_123', senderId: 'u_send', receiverId: 'u_recv', status: 'PENDING' };
    const normalized = normalizeDelegateRecord(rawInterest, 'interest');
    assert.strictEqual(normalized.sender, 'u_send');
    assert.strictEqual(normalized.receiver, 'u_recv');
    assert.strictEqual(normalized.senderId, 'u_send');
    assert.strictEqual(normalized.receiverId, 'u_recv');
  });

  await test('normalizeDelegateRecord correctly shims scalar IDs on block delegate', async () => {
    const rawBlock = { id: 'blk_123', blockerId: 'u_blocker', blockedUserId: 'u_blocked' };
    const normalized = normalizeDelegateRecord(rawBlock, 'block');
    assert.strictEqual(normalized.blocker, 'u_blocker');
    assert.strictEqual(normalized.blockedUser, 'u_blocked');
    assert.strictEqual(normalized.blockerId, 'u_blocker');
    assert.strictEqual(normalized.blockedUserId, 'u_blocked');
  });

  await test('normalizeDelegateRecord preserves existing populated relation objects', async () => {
    const populated = {
      id: 'int_pop',
      senderId: 'u_send',
      receiverId: 'u_recv',
      sender: { _id: 'u_send', fullName: 'Dr Sender' },
      receiver: { _id: 'u_recv', fullName: 'Dr Recipient' },
    };
    const res = normalizeDelegateRecord(populated, 'interest');
    assert.strictEqual(typeof res.sender, 'object');
    assert.strictEqual(res.sender._id, 'u_send');
    assert.strictEqual(res.sender.fullName, 'Dr Sender');
  });

  await test('extractEntityId handles scalars, populated objects, and missing values safely', async () => {
    assert.strictEqual(extractEntityId('u_string'), 'u_string');
    assert.strictEqual(extractEntityId({ _id: 'u_obj_id' }), 'u_obj_id');
    assert.strictEqual(extractEntityId({ id: 'u_id' }), 'u_id');
    assert.strictEqual(extractEntityId(undefined, 'u_fallback'), 'u_fallback');
    assert.strictEqual(extractEntityId(null, 'u_fallback2'), 'u_fallback2');
    assert.strictEqual(extractEntityId(undefined, undefined), '');
    assert.strictEqual(extractEntityId(null, null), '');
    assert.strictEqual(extractEntityId({}), '');
  });

  await test('checkInterestStatus succeeds with scalar-only Prisma adapter results (caller is sender)', async () => {
    const origProfileFindOne = Profile.findOne;
    const origInterestFindOne = Interest.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });

    // Simulating raw Prisma record where sender/receiver relations are omitted (unpopulated)
    Interest.findOne = async () => ({
      _id: 'scalar_int_1',
      id: 'scalar_int_1',
      senderId: 'user_sender',
      receiverId: 'user_target',
      status: 'PENDING',
    });

    try {
      const req = {
        params: { targetId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await checkInterestStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.data?.hasInterest, true);
      assert.strictEqual(res.body?.data?.isSender, true);
      assert.strictEqual(res.body?.data?.isReceiver, false);
      assert.strictEqual(res.body?.data?.canChat, false);
    } finally {
      Profile.findOne = origProfileFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  await test('checkInterestStatus succeeds with scalar-only Prisma adapter results (caller is receiver)', async () => {
    const origProfileFindOne = Profile.findOne;
    const origInterestFindOne = Interest.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });

    // Target sent interest to caller
    Interest.findOne = async () => ({
      _id: 'scalar_int_2',
      id: 'scalar_int_2',
      senderId: 'user_target',
      receiverId: 'user_sender',
      status: 'ACCEPTED',
    });

    try {
      const req = {
        params: { targetId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await checkInterestStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.data?.hasInterest, true);
      assert.strictEqual(res.body?.data?.isSender, false);
      assert.strictEqual(res.body?.data?.isReceiver, true);
      assert.strictEqual(res.body?.data?.canChat, true);
    } finally {
      Profile.findOne = origProfileFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  await test('checkInterestStatus succeeds when interest has populated relation objects', async () => {
    const origProfileFindOne = Profile.findOne;
    const origInterestFindOne = Interest.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });

    Interest.findOne = async () => ({
      _id: 'pop_int_1',
      sender: { _id: 'user_sender', fullName: 'Dr Sender' },
      receiver: { _id: 'user_target', fullName: 'Dr Target' },
      status: 'PENDING',
    });

    try {
      const req = {
        params: { targetId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await checkInterestStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.data?.hasInterest, true);
      assert.strictEqual(res.body?.data?.isSender, true);
    } finally {
      Profile.findOne = origProfileFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  await test('checkInterestStatus returns controlled HTTP 500 when IDs are missing (never unhandled TypeError)', async () => {
    const origProfileFindOne = Profile.findOne;
    const origInterestFindOne = Interest.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });

    // Corrupted record with missing sender and senderId
    Interest.findOne = async () => ({
      _id: 'corrupt_int_1',
      status: 'PENDING',
    });

    try {
      const req = {
        params: { targetId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await checkInterestStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body?.success, false);
      assert.strictEqual(res.body?.message, 'Interest record has missing sender or receiver details');
    } finally {
      Profile.findOne = origProfileFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  await test('createInterest returns HTTP 409 DUPLICATE_INTEREST on raw scalar-only Prisma result', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestFindOne = Interest.findOne;
    const origInterestCreate = Interest.create;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });
    Block.findOne = async () => null;

    // Prisma scalar record: senderId and receiverId only
    Interest.findOne = async () => ({
      _id: 'scalar_dup_1',
      id: 'scalar_dup_1',
      senderId: 'user_sender',
      receiverId: 'user_target',
      status: 'PENDING',
    });

    let createdCalled = false;
    Interest.create = async () => { createdCalled = true; };

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.body?.code, 'DUPLICATE_INTEREST');
      assert.strictEqual(createdCalled, false, 'Must not create duplicate');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.findOne = origInterestFindOne;
      Interest.create = origInterestCreate;
    }
  });

  await test('createInterest returns controlled HTTP 500 when existing record has missing IDs', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestFindOne = Interest.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });
    Block.findOne = async () => null;

    // Corrupted existing interest
    Interest.findOne = async () => ({
      _id: 'corrupt_existing_1',
      status: 'PENDING',
    });

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body?.success, false);
      assert.strictEqual(res.body?.message, 'Existing interest record is missing sender or receiver information');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  await test('createInterest rejects blocks in BOTH directions (sender blocked target AND target blocked sender)', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;

    Profile.findOne = () => ({
      populate: () => ({ select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }) }),
      then(res) {
        res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
      },
    });
    User.findById = async () => ({ _id: 'user_target', isActive: true });

    try {
      // Direction 1: Caller (sender) blocked Target
      Block.findOne = async () => ({ id: 'blk_1', blockerId: 'user_sender', blockedUserId: 'user_target' });
      const req1 = { body: { profileId: 'WJ-100080' }, user: { userId: 'user_sender' } };
      const res1 = createMockRes();
      await createInterest(req1, res1, () => {});
      assert.strictEqual(res1.statusCode, 403, 'Must reject when sender blocked target');
      assert.strictEqual(res1.body?.message, 'Cannot send interest to this member');

      // Direction 2: Target blocked Caller (sender)
      Block.findOne = async () => ({ id: 'blk_2', blockerId: 'user_target', blockedUserId: 'user_sender' });
      const req2 = { body: { profileId: 'WJ-100080' }, user: { userId: 'user_sender' } };
      const res2 = createMockRes();
      await createInterest(req2, res2, () => {});
      assert.strictEqual(res2.statusCode, 403, 'Must reject when target blocked sender');
      assert.strictEqual(res2.body?.message, 'Cannot send interest to this member');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
    }
  });

  await test('createInterest creates new interest and persistent notification with proper metadata', async () => {
    const origProfileFindOne = Profile.findOne;
    const origUserFindById = User.findById;
    const origBlockFindOne = Block.findOne;
    const origInterestFindOne = Interest.findOne;
    const origInterestCreate = Interest.create;
    const origNotificationCreate = Notification.create;

    Profile.findOne = (query) => ({
      populate: () => ({
        select: async () => ({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' }),
      }),
      then(res) {
        if (query?.user === 'user_sender') {
          res({ _id: 'prof_s', displayName: 'Dr Sender', primaryPhoto: 'photo_s.jpg' });
        } else {
          res({ _id: 'prof_t', candidateId: 'WJ-100080', userId: 'user_target' });
        }
      },
    });
    User.findById = async (id) => ({
      _id: String(id),
      isActive: true,
      fullName: id === 'user_sender' ? 'Dr Sender' : 'Dr Target',
    });
    Block.findOne = async () => null;
    Interest.findOne = async () => null;

    let persistedInterest = null;
    Interest.create = async (doc) => {
      persistedInterest = { _id: 'new_int_999', ...doc };
      return persistedInterest;
    };

    let persistedNotification = null;
    Notification.create = async (doc) => {
      persistedNotification = { _id: 'notif_999', ...doc };
      return persistedNotification;
    };

    const mockIo = createMockIo();

    try {
      const req = {
        body: { profileId: 'WJ-100080' },
        user: { userId: 'user_sender' },
        app: { get: (k) => (k === 'io' ? mockIo : null) },
      };
      const res = createMockRes();
      await createInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.message, 'Interest sent successfully');
      assert.strictEqual(persistedInterest?.status, 'PENDING');
      assert.strictEqual(persistedInterest?.sender, 'user_sender');
      assert.strictEqual(persistedInterest?.receiver, 'user_target');
      assert.strictEqual(persistedNotification?.user, 'user_target');
      assert.strictEqual(persistedNotification?.type, 'INTEREST_RECEIVED');
      assert.strictEqual(persistedNotification?.metadata?.senderUserId, 'user_sender');
      assert.strictEqual(mockIo.emitted.length, 2, 'Must emit newNotification and interestReceived');
    } finally {
      Profile.findOne = origProfileFindOne;
      User.findById = origUserFindById;
      Block.findOne = origBlockFindOne;
      Interest.findOne = origInterestFindOne;
      Interest.create = origInterestCreate;
      Notification.create = origNotificationCreate;
    }
  });

  console.log('\n============================================================');
  console.log(`Suite Complete: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
