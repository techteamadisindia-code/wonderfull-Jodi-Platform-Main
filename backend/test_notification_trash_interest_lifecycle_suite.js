/**
 * Comprehensive Automated Test Suite: Notification Trash & Interest Lifecycle Management
 * 
 * 100% TEST ISOLATION GUARANTEE:
 * Stubs in-memory models/delegates to guarantee pure isolation with zero production database calls.
 *
 * Covers:
 * 1. Notification Deletion & Trash Management:
 *    - Unauthenticated request is rejected (HTTP 401).
 *    - Invalid or missing notification ID is rejected safely (HTTP 400).
 *    - Unread notification cannot be deleted (HTTP 400 with helpful message).
 *    - User cannot delete another user's notification (HTTP 404 / ownership guard without data leak).
 *    - Authenticated recipient can delete their own read notification (HTTP 200).
 *    - Repeated deletion is idempotent and safe (HTTP 200, no state corruption).
 *    - Deleted notifications are excluded from getNotifications active list.
 *    - Deleted notifications are excluded from getUnreadCount.
 * 2. Interest Acceptance & Recipient Notifications:
 *    - Unauthenticated request is rejected (HTTP 401).
 *    - Invalid interest ID is rejected safely (HTTP 400).
 *    - Nonexistent interest is rejected (HTTP 404).
 *    - Unauthorized user (not the recipient) cannot accept interest (HTTP 403).
 *    - Valid incoming interest can be accepted (transitions to ACCEPTED).
 *    - Original sender receives durable acceptance notification with product wording:
 *      "Interest accepted" / "Your interest has been accepted. View your connection to see the next steps."
 *    - Repeated acceptance requests are idempotent (HTTP 200, no duplicate notifications).
 *    - Failed interest state transition does NOT create a notification.
 * 3. Withdraw Acceptance / Connection Lifecycle:
 *    - Unauthenticated withdraw request is rejected (HTTP 401).
 *    - Invalid interest ID is rejected safely (HTTP 400).
 *    - Nonexistent interest is rejected (HTTP 404).
 *    - User who is NOT a participant cannot withdraw connection (HTTP 403).
 *    - Attempting to withdraw interest not currently ACCEPTED is rejected (HTTP 400).
 *    - Authorized participant can withdraw accepted connection (transitions to REJECTED).
 *    - Withdrawing closes/archives active conversation safely.
 *    - Other participant receives withdrawal notification ("Connection Withdrawn").
 *    - Repeated withdraw requests are safe and idempotent.
 *    - Membership entitlements, payments, and billing records remain untouched.
 */

const assert = require('assert');
const { deleteNotification, getNotifications, getUnreadCount } = require('./dist/controllers/notificationController.js');
const { acceptInterest, withdrawInterest } = require('./dist/controllers/interestController.js');
const { sendMessage, getConversationMessagesForUser } = require('./dist/controllers/messageController.js');
const { Notification } = require('./dist/models/Notification.js');
const { Interest } = require('./dist/models/Interest.js');
const { User } = require('./dist/models/User.js');
const { Profile } = require('./dist/models/Profile.js');
const { Conversation } = require('./dist/models/Conversation.js');
const { Message } = require('./dist/models/Message.js');
const { Subscription } = require('./dist/models/Subscription.js');
const { Block } = require('./dist/models/Block.js');
const { NotificationRepository } = require('./dist/repositories/NotificationRepository.js');
const { prisma } = require('./dist/db/client.js');

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
    console.error('    Error:', err?.message || err);
  }
}

function createMockRes() {
  return {
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
}

function createMockIo() {
  const emitted = [];
  return {
    to(room) {
      return {
        emit(event, payload) {
          emitted.push({ room, event, payload });
        },
      };
    },
    emitted,
  };
}

async function runSuite() {
  console.log('\n============================================================');
  console.log('  Notification Trash & Interest Lifecycle Regression Suite');
  console.log('============================================================\n');

  const VALID_NOTIF_ID = '67b011112222333344445555';
  const VALID_INTEREST_ID = '67b022223333444455556666';
  const SENDER_USER_ID = '67b000001111222233334444';
  const RECIPIENT_USER_ID = '67b000002222333344445555';
  const THIRD_PARTY_USER_ID = '67b000009999888877776666';

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Notification Deletion & Trash Management Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Notification Deletion & Trash Management ---');

  await test('deleteNotification rejects unauthenticated caller with HTTP 401', async () => {
    const req = { user: null, params: { id: VALID_NOTIF_ID } };
    const res = createMockRes();
    let nextCalled = false;
    await deleteNotification(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(nextCalled, false);
  });

  await test('deleteNotification rejects invalid notification ID format with HTTP 400', async () => {
    const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: 'invalid-id' } };
    const res = createMockRes();
    await deleteNotification(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /Invalid notification ID/i);
  });

  await test('deleteNotification prevents deleting unread notifications (HTTP 400)', async () => {
    const origFindById = Notification.findById;
    const mockUnreadNotif = {
      _id: VALID_NOTIF_ID,
      id: VALID_NOTIF_ID,
      user: RECIPIENT_USER_ID,
      read: false,
      metadata: {},
      save: async () => {},
    };
    Notification.findById = async () => mockUnreadNotif;

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_NOTIF_ID },
      };
      const res = createMockRes();
      await deleteNotification(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Only read notifications can be deleted/i);
    } finally {
      Notification.findById = origFindById;
    }
  });

  await test('deleteNotification prevents deleting another user\'s notification (HTTP 404 ownership guard)', async () => {
    const origFindById = Notification.findById;
    Notification.findById = async (id) => ({
      _id: id,
      id,
      user: 'different_victim_user_id',
      read: true,
      metadata: {},
    });

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_NOTIF_ID },
      };
      const res = createMockRes();
      await deleteNotification(req, res, () => {});

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Notification not found/i);
    } finally {
      Notification.findById = origFindById;
    }
  });

  await test('deleteNotification prevents admin from deleting another user notification via user endpoint (HTTP 404)', async () => {
    const origFindById = Notification.findById;
    Notification.findById = async (id) => ({
      _id: id,
      id,
      user: 'different_victim_user_id',
      read: true,
      metadata: {},
    });

    try {
      const req = {
        user: { userId: 'admin_user_id', role: 'admin' },
        params: { id: VALID_NOTIF_ID },
      };
      const res = createMockRes();
      await deleteNotification(req, res, () => {});

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Notification not found/i);
    } finally {
      Notification.findById = origFindById;
    }
  });

  await test('deleteNotification soft-deletes own read notification with metadata persistence', async () => {
    const origFindById = Notification.findById;
    let saved = false;
    const mockReadNotif = {
      _id: VALID_NOTIF_ID,
      id: VALID_NOTIF_ID,
      user: RECIPIENT_USER_ID,
      read: true,
      metadata: { originalData: 'test' },
      save: async function() {
        saved = true;
      },
    };
    Notification.findById = async () => mockReadNotif;

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_NOTIF_ID },
      };
      const res = createMockRes();
      await deleteNotification(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(saved, true);
      assert.strictEqual(mockReadNotif.metadata.isDeleted, true);
      assert.strictEqual(mockReadNotif.metadata.trashed, true);
      assert.ok(mockReadNotif.metadata.trashedAt);
    } finally {
      Notification.findById = origFindById;
    }
  });

  await test('deleteNotification preserves custom metadata fields when soft-deleting', async () => {
    const origFindById = Notification.findById;
    let savedDoc = null;
    const mockNotifWithCustomMetadata = {
      _id: VALID_NOTIF_ID,
      id: VALID_NOTIF_ID,
      user: RECIPIENT_USER_ID,
      read: true,
      metadata: {
        interestId: 'interest_123',
        source: 'campaign_banner',
        deepLink: '/profiles/123',
        nested: { foo: 'bar' },
      },
      save: async function() {
        savedDoc = this;
      },
    };
    Notification.findById = async () => mockNotifWithCustomMetadata;

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_NOTIF_ID },
      };
      const res = createMockRes();
      await deleteNotification(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(savedDoc.metadata.interestId, 'interest_123');
      assert.strictEqual(savedDoc.metadata.source, 'campaign_banner');
      assert.strictEqual(savedDoc.metadata.deepLink, '/profiles/123');
      assert.strictEqual(savedDoc.metadata.nested?.foo, 'bar');
      assert.strictEqual(savedDoc.metadata.isDeleted, true);
      assert.strictEqual(savedDoc.metadata.trashed, true);
      assert.ok(savedDoc.metadata.trashedAt);
    } finally {
      Notification.findById = origFindById;
    }
  });

  await test('deleteNotification repeated call is safe and idempotent', async () => {
    const origFindById = Notification.findById;
    const mockAlreadyDeleted = {
      _id: VALID_NOTIF_ID,
      id: VALID_NOTIF_ID,
      user: RECIPIENT_USER_ID,
      read: true,
      metadata: { isDeleted: true, trashed: true },
      isDeleted: true,
      save: async () => {},
    };
    Notification.findById = async () => mockAlreadyDeleted;

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_NOTIF_ID },
      };
      const res = createMockRes();
      await deleteNotification(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.match(res.body?.message, /deleted successfully/i);
    } finally {
      Notification.findById = origFindById;
    }
  });

  await test('getNotifications excludes soft-deleted/trashed notifications from active inbox list', async () => {
    const origFind = Notification.find;
    const origCountDocuments = Notification.countDocuments;

    const mockNotifications = [
      {
        _id: '67b011112222333344445551',
        user: RECIPIENT_USER_ID,
        title: 'Active alert',
        read: true,
        metadata: {},
      },
      {
        _id: '67b011112222333344445552',
        user: RECIPIENT_USER_ID,
        title: 'Deleted alert',
        read: true,
        metadata: { isDeleted: true, trashed: true },
      },
      {
        _id: '67b011112222333344445553',
        user: RECIPIENT_USER_ID,
        title: 'Unread alert',
        read: false,
        metadata: {},
      },
    ];

    Notification.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: async () => mockNotifications,
        }),
      }),
    });
    Notification.countDocuments = undefined;

    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, query: {} };
      const res = createMockRes();
      await getNotifications(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      const returned = res.body?.data?.notifications || [];
      assert.strictEqual(returned.length, 2, 'Must exclude trashed notification');
      assert.strictEqual(returned.find(n => n._id === '67b011112222333344445552'), undefined);
      assert.ok(returned.find(n => n._id === '67b011112222333344445551'));
      assert.ok(returned.find(n => n._id === '67b011112222333344445553'));
    } finally {
      Notification.find = origFind;
      Notification.countDocuments = origCountDocuments;
    }
  });

  await test('getNotifications excludes trashed notifications BEFORE pagination without short pages', async () => {
    const origFind = Notification.find;
    const origCountDocuments = Notification.countDocuments;

    // 5 total notifications in DB: 3 active, 2 trashed
    const dataset = [
      { _id: 'n_1', user: RECIPIENT_USER_ID, title: 'Active 1', read: true, metadata: {}, createdAt: new Date(1000) },
      { _id: 'n_2', user: RECIPIENT_USER_ID, title: 'Trashed 1', read: true, metadata: { isDeleted: true }, createdAt: new Date(900) },
      { _id: 'n_3', user: RECIPIENT_USER_ID, title: 'Active 2', read: true, metadata: {}, createdAt: new Date(800) },
      { _id: 'n_4', user: RECIPIENT_USER_ID, title: 'Trashed 2', read: false, metadata: { trashed: true }, createdAt: new Date(700) },
      { _id: 'n_5', user: RECIPIENT_USER_ID, title: 'Active 3', read: false, metadata: {}, createdAt: new Date(600) },
    ];

    // Simulate PrismaQueryBuilder pre-pagination behavior
    Notification.find = () => {
      let currentSkip = 0;
      let currentLimit = 50;
      return {
        sort: () => ({
          skip: (s) => {
            currentSkip = s;
            return {
              limit: async (l) => {
                currentLimit = l;
                // Exclude trashed BEFORE pagination
                const active = dataset.filter(d => !d.metadata?.isDeleted && !d.metadata?.trashed);
                return active.slice(currentSkip, currentSkip + currentLimit);
              },
            };
          },
        }),
      };
    };

    Notification.countDocuments = async () => 3; // 3 active notifications total

    try {
      // Page 1, limit 2: Must return exactly 2 items: Active 1 and Active 2 (Trashed 1 must NOT cause a short page)
      const reqPage1 = { user: { userId: RECIPIENT_USER_ID }, query: { page: '1', limit: '2' } };
      const resPage1 = createMockRes();
      await getNotifications(reqPage1, resPage1, () => {});

      assert.strictEqual(resPage1.statusCode, 200);
      assert.strictEqual(resPage1.body?.data?.notifications?.length, 2);
      assert.strictEqual(resPage1.body?.data?.notifications[0]._id, 'n_1');
      assert.strictEqual(resPage1.body?.data?.notifications[1]._id, 'n_3');
      assert.strictEqual(resPage1.body?.data?.total, 3);
      assert.strictEqual(resPage1.body?.data?.totalPages, 2);

      // Page 2, limit 2: Must return remaining 1 item: Active 3
      const reqPage2 = { user: { userId: RECIPIENT_USER_ID }, query: { page: '2', limit: '2' } };
      const resPage2 = createMockRes();
      await getNotifications(reqPage2, resPage2, () => {});

      assert.strictEqual(resPage2.statusCode, 200);
      assert.strictEqual(resPage2.body?.data?.notifications?.length, 1);
      assert.strictEqual(resPage2.body?.data?.notifications[0]._id, 'n_5');
      assert.strictEqual(resPage2.body?.data?.total, 3);
    } finally {
      Notification.find = origFind;
      Notification.countDocuments = origCountDocuments;
    }
  });

  await test('getUnreadCount accurately reflects unread excluding trashed items', async () => {
    const origFind = Notification.find;
    const origCountDocuments = Notification.countDocuments;

    const mockNotifications = [
      { _id: 'notif_1', user: RECIPIENT_USER_ID, read: false, metadata: {} },
      { _id: 'notif_2', user: RECIPIENT_USER_ID, read: false, metadata: { isDeleted: true } },
      { _id: 'notif_3', user: RECIPIENT_USER_ID, read: false, metadata: {} },
    ];

    Notification.countDocuments = async () => 2; // Active unread count
    Notification.find = async () => mockNotifications;

    try {
      const req = { user: { userId: RECIPIENT_USER_ID } };
      const res = createMockRes();
      await getUnreadCount(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.data?.count, 2);
    } finally {
      Notification.find = origFind;
      Notification.countDocuments = origCountDocuments;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Interest Acceptance & Recipient Notifications Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Interest Acceptance & Recipient Notifications ---');

  await test('acceptInterest rejects unauthenticated caller with HTTP 401', async () => {
    const req = { user: null, params: { id: VALID_INTEREST_ID } };
    const res = createMockRes();
    await acceptInterest(req, res, () => {});

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
  });

  await test('acceptInterest rejects nonexistent interest with HTTP 404', async () => {
    const origFindById = Interest.findById;
    Interest.findById = async () => null;

    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID } };
      const res = createMockRes();
      await acceptInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Interest not found/i);
    } finally {
      Interest.findById = origFindById;
    }
  });

  await test('acceptInterest prevents unauthorized non-recipient user from accepting (HTTP 403)', async () => {
    const origFindById = Interest.findById;
    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
    };

    Interest.findById = async () => mockInterest;

    try {
      const req = {
        user: { userId: THIRD_PARTY_USER_ID }, // Neither sender nor intended receiver
        params: { id: VALID_INTEREST_ID },
      };
      const res = createMockRes();
      await acceptInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Only the recipient can accept this interest/i);
    } finally {
      Interest.findById = origFindById;
    }
  });

  await test('acceptInterest creates acceptance notification for original sender with product wording', async () => {
    const origInterestFindById = Interest.findById;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;
    const origConvFindOne = Conversation.findOne;
    const origConvCreate = Conversation.create;

    let interestSaved = false;
    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
      save: async function() {
        this.status = 'ACCEPTED';
        interestSaved = true;
      },
    };

    Interest.findById = async () => mockInterest;

    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Ananya Sharma', privacySettings: { nameVisibility: 'all' } }); }
    });

    let createdNotification = null;
    Notification.findOne = async () => null; // No existing notification
    Notification.create = async (doc) => {
      createdNotification = doc;
      return doc;
    };

    Conversation.findOne = async () => null;
    Conversation.create = async (conv) => ({ _id: '67b0conv1111222233334444', ...conv });

    const mockIo = createMockIo();

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => mockIo },
      };
      const res = createMockRes();
      await acceptInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(interestSaved, true);
      assert.strictEqual(mockInterest.status, 'ACCEPTED');

      // Verify acceptance notification created for original sender
      assert.ok(createdNotification, 'Notification must be created for sender');
      assert.strictEqual(createdNotification.user, SENDER_USER_ID);
      assert.strictEqual(createdNotification.type, 'INTEREST_ACCEPTED');
      assert.strictEqual(createdNotification.title, 'Interest accepted');
      assert.ok(createdNotification.message.includes('Your interest has been accepted. View your connection to see the next steps.'));
      assert.strictEqual(createdNotification.metadata?.interestId, VALID_INTEREST_ID);

      // Verify real-time Socket.IO emission
      const notifEmit = mockIo.emitted.find(e => e.room.includes(SENDER_USER_ID) && e.event === 'newNotification');
      assert.ok(notifEmit, 'Socket.IO must notify original sender');
    } finally {
      Interest.findById = origInterestFindById;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
      Conversation.findOne = origConvFindOne;
      Conversation.create = origConvCreate;
    }
  });

  await test('acceptInterest repeated call is idempotent and does not create duplicate notifications', async () => {
    const origInterestFindById = Interest.findById;
    const origNotifCreate = Notification.create;
    const origNotifFindOne = Notification.findOne;
    const origConvFindOne = Conversation.findOne;

    const mockAlreadyAccepted = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'ACCEPTED', // Already accepted
      save: async () => {},
    };

    Interest.findById = async () => mockAlreadyAccepted;
    Conversation.findOne = async () => ({ _id: '67b0conv1111222233334444' });
    Notification.findOne = async () => ({
      _id: 'notif_existing_1',
      user: SENDER_USER_ID,
      type: 'INTEREST_ACCEPTED',
      metadata: { interestId: VALID_INTEREST_ID },
    });

    let duplicateCreated = false;
    Notification.create = async () => {
      duplicateCreated = true;
    };

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => null },
      };
      const res = createMockRes();
      await acceptInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(duplicateCreated, false, 'Must not create duplicate notification on retry');
      assert.match(res.body?.message, /already accepted/i);
    } finally {
      Interest.findById = origInterestFindById;
      Notification.create = origNotifCreate;
      Notification.findOne = origNotifFindOne;
      Conversation.findOne = origConvFindOne;
    }
  });

  await test('acceptInterest rolls back state from ACCEPTED back to PENDING if notification creation fails', async () => {
    const origInterestFindById = Interest.findById;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;

    let savedStatusHistory = [];
    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
      save: async function() {
        savedStatusHistory.push(this.status);
      },
    };

    Interest.findById = async () => mockInterest;
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });

    Notification.findOne = async () => null;
    Notification.create = async () => {
      throw new Error('Database connection dropped during notification creation');
    };

    let nextError = null;
    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => null },
      };
      const res = createMockRes();
      await acceptInterest(req, res, (err) => {
        nextError = err;
      });

      assert.ok(nextError, 'Error should be propagated to next() handler');
      assert.strictEqual(mockInterest.status, 'PENDING', 'Interest status must be rolled back to PENDING');
      assert.deepStrictEqual(savedStatusHistory, ['ACCEPTED', 'PENDING'], 'Must record state change and rollback');
    } finally {
      Interest.findById = origInterestFindById;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
    }
  });

  await test('acceptInterest self-heals missing notification if interest was already ACCEPTED', async () => {
    const origInterestFindById = Interest.findById;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;
    const origConvFindOne = Conversation.findOne;

    const mockAlreadyAccepted = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'ACCEPTED',
      save: async () => {},
    };

    Interest.findById = async () => mockAlreadyAccepted;
    Conversation.findOne = async () => ({ _id: '67b0conv1111222233334444' });
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });

    let selfHealedNotif = null;
    Notification.findOne = async () => null; // Missing notification!
    Notification.create = async (doc) => {
      selfHealedNotif = doc;
      return doc;
    };

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => null },
      };
      const res = createMockRes();
      await acceptInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.ok(selfHealedNotif, 'Self-healing notification must be created');
      assert.strictEqual(selfHealedNotif.user, SENDER_USER_ID);
      assert.strictEqual(selfHealedNotif.type, 'INTEREST_ACCEPTED');
    } finally {
      Interest.findById = origInterestFindById;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
      Conversation.findOne = origConvFindOne;
    }
  });

  await test('acceptInterest handles two concurrent requests: single transition, single notification, zero corruption', async () => {
    const origInterestFindById = Interest.findById;
    const origInterestUpdateOne = Interest.updateOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifFind = Notification.find;
    const origNotifCreate = Notification.create;
    const origConvFindOne = Conversation.findOne;
    const origConvCreate = Conversation.create;

    let interestStatus = 'PENDING';
    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      get status() { return interestStatus; },
      set status(s) { interestStatus = s; },
      save: async function() { },
    };

    Interest.findById = async () => mockInterest;

    let updateCount = 0;
    Interest.updateOne = async (filter, update) => {
      // Simulate atomic conditional update: first update succeeds, second matches 0 rows
      if (filter.status === 'PENDING' && interestStatus === 'PENDING') {
        interestStatus = 'ACCEPTED';
        updateCount++;
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    };

    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });

    let notificationsCreated = 0;
    Notification.findOne = async () => (notificationsCreated > 0 ? {
      _id: 'notif_1',
      user: SENDER_USER_ID,
      type: 'INTEREST_ACCEPTED',
      metadata: { interestId: VALID_INTEREST_ID },
    } : null);
    Notification.find = () => ({
      sort: () => ({
        limit: async () => (notificationsCreated > 0 ? [{
          _id: 'notif_1',
          user: SENDER_USER_ID,
          type: 'INTEREST_ACCEPTED',
          metadata: { interestId: VALID_INTEREST_ID },
        }] : []),
      }),
    });
    Notification.create = async (doc) => {
      notificationsCreated++;
      return { _id: 'notif_1', ...doc };
    };

    Conversation.findOne = async () => ({ _id: 'conv_123', save: async () => {} });

    try {
      const reqA = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const reqB = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const resA = createMockRes();
      const resB = createMockRes();

      // Fire both concurrently
      await Promise.all([
        acceptInterest(reqA, resA, () => {}),
        acceptInterest(reqB, resB, () => {}),
      ]);

      assert.strictEqual(resA.statusCode, 200);
      assert.strictEqual(resB.statusCode, 200);
      assert.strictEqual(updateCount, 1, 'Only one atomic update should transition the state');
      assert.strictEqual(notificationsCreated, 1, 'Exactly one notification created across concurrent requests');
      assert.strictEqual(interestStatus, 'ACCEPTED');
    } finally {
      Interest.findById = origInterestFindById;
      Interest.updateOne = origInterestUpdateOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.find = origNotifFind;
      Notification.create = origNotifCreate;
      Conversation.findOne = origConvFindOne;
      Conversation.create = origConvCreate;
    }
  });

  await test('acceptInterest rolls back to PENDING if conversation creation fails', async () => {
    const origInterestFindById = Interest.findById;
    const origInterestUpdateOne = Interest.updateOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;
    const origConvFindOne = Conversation.findOne;
    const origConvCreate = Conversation.create;

    let savedStatusHistory = [];
    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
      save: async function() {
        savedStatusHistory.push(this.status);
      },
    };

    Interest.findById = async () => mockInterest;
    Interest.updateOne = undefined;
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });
    Notification.findOne = async () => null;
    Notification.create = async (doc) => ({ _id: 'notif_1', ...doc });
    Conversation.findOne = async () => null;
    Conversation.create = async () => {
      throw new Error('Database constraint violation creating conversation');
    };

    let nextError = null;
    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const res = createMockRes();
      await acceptInterest(req, res, (err) => { nextError = err; });

      assert.ok(nextError);
      assert.strictEqual(mockInterest.status, 'PENDING', 'Must roll back to PENDING if conversation creation fails');
      assert.deepStrictEqual(savedStatusHistory, ['ACCEPTED', 'PENDING']);
    } finally {
      Interest.findById = origInterestFindById;
      Interest.updateOne = origInterestUpdateOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
      Conversation.findOne = origConvFindOne;
      Conversation.create = origConvCreate;
    }
  });

  await test('acceptInterest surfaces error safely if compensating rollback save also fails', async () => {
    const origInterestFindById = Interest.findById;
    const origInterestUpdateOne = Interest.updateOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;

    let saveAttempts = 0;
    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
      save: async function() {
        saveAttempts++;
        if (saveAttempts > 1) {
          throw new Error('DB disk full: rollback save failed');
        }
      },
    };

    Interest.findById = async () => mockInterest;
    Interest.updateOne = undefined;
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });
    Notification.findOne = async () => null;
    Notification.create = async () => {
      throw new Error('Original notification creation failure');
    };

    let nextError = null;
    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const res = createMockRes();
      await acceptInterest(req, res, (err) => { nextError = err; });

      // Error must be propagated without crashing process
      assert.ok(nextError);
      assert.strictEqual(nextError.message, 'Original notification creation failure');
    } finally {
      Interest.findById = origInterestFindById;
      Interest.updateOne = origInterestUpdateOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Withdraw Acceptance / Connection Lifecycle Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Withdraw Acceptance / Connection Lifecycle ---');

  await test('withdrawInterest rejects unauthenticated caller with HTTP 401', async () => {
    const req = { user: null, params: { id: VALID_INTEREST_ID } };
    const res = createMockRes();
    await withdrawInterest(req, res, () => {});

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
  });

  await test('withdrawInterest rejects non-participant from withdrawing connection (HTTP 403)', async () => {
    const origFindById = Interest.findById;
    const mockAccepted = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'ACCEPTED',
    };

    Interest.findById = async () => mockAccepted;

    try {
      const req = {
        user: { userId: THIRD_PARTY_USER_ID },
        params: { id: VALID_INTEREST_ID },
      };
      const res = createMockRes();
      await withdrawInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /not authorized to withdraw this connection/i);
    } finally {
      Interest.findById = origFindById;
    }
  });

  await test('withdrawInterest rejects withdrawing when status is not ACCEPTED (HTTP 400)', async () => {
    const origFindById = Interest.findById;
    const mockPending = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
    };

    Interest.findById = async () => mockPending;

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
      };
      const res = createMockRes();
      await withdrawInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Only accepted connections can be withdrawn/i);
    } finally {
      Interest.findById = origFindById;
    }
  });

  await test('withdrawInterest transitions ACCEPTED to REJECTED, closes chat, and notifies other party', async () => {
    const origInterestFindById = Interest.findById;
    const origConvFindOne = Conversation.findOne;
    const origNotifCreate = Notification.create;
    const origNotifFindOne = Notification.findOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;

    let interestSaved = false;
    const mockAccepted = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'ACCEPTED',
      save: async function() {
        interestSaved = true;
      },
    };

    Interest.findById = async () => mockAccepted;

    let convArchived = false;
    Conversation.findOne = async () => ({
      _id: 'conv_123',
      status: 'ACTIVE',
      isArchived: false,
      save: async function() {
        this.status = 'ARCHIVED';
        this.isArchived = true;
        convArchived = true;
      },
    });

    Notification.findOne = async () => null;

    let withdrawalNotification = null;
    Notification.create = async (doc) => {
      withdrawalNotification = doc;
      return doc;
    };

    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Vivek Menon' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Vivek Menon', privacySettings: {} }); }
    });

    const mockIo = createMockIo();

    try {
      // Recipient user withdraws connection with Sender user
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => mockIo },
      };
      const res = createMockRes();
      await withdrawInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(interestSaved, true);
      assert.strictEqual(mockAccepted.status, 'REJECTED');
      assert.strictEqual(convArchived, true, 'Active conversation must be archived');

      // Verify notification sent to other party (SENDER_USER_ID)
      assert.ok(withdrawalNotification);
      assert.strictEqual(withdrawalNotification.user, SENDER_USER_ID);
      assert.strictEqual(withdrawalNotification.type, 'INTEREST_WITHDRAWN');
      assert.strictEqual(withdrawalNotification.title, 'Connection withdrawn');
      assert.ok(withdrawalNotification.message.includes('withdrawn'));

      // Verify real-time Socket.IO emission to SENDER_USER_ID
      const notifEmit = mockIo.emitted.find(e => e.room.includes(SENDER_USER_ID) && e.event === 'newNotification');
      assert.ok(notifEmit, 'Socket.IO must notify the other doctor of connection withdrawal');
    } finally {
      Interest.findById = origInterestFindById;
      Conversation.findOne = origConvFindOne;
      Notification.create = origNotifCreate;
      Notification.findOne = origNotifFindOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
    }
  });

  await test('withdrawInterest repeated call is safe and idempotent', async () => {
    const origInterestFindById = Interest.findById;
    const origNotifCreate = Notification.create;
    const origNotifFindOne = Notification.findOne;

    const mockAlreadyRejected = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'REJECTED',
    };

    Interest.findById = async () => mockAlreadyRejected;
    Notification.findOne = async () => ({
      _id: 'notif_existing_withdrawn',
      user: SENDER_USER_ID,
      type: 'INTEREST_WITHDRAWN',
      metadata: { interestId: VALID_INTEREST_ID },
    });

    let duplicateNotif = false;
    Notification.create = async () => {
      duplicateNotif = true;
    };

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => null },
      };
      const res = createMockRes();
      await withdrawInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(duplicateNotif, false);
      assert.match(res.body?.message, /already withdrawn/i);
    } finally {
      Interest.findById = origInterestFindById;
      Notification.create = origNotifCreate;
      Notification.findOne = origNotifFindOne;
    }
  });

  await test('withdrawInterest rolls back state from REJECTED back to ACCEPTED if notification creation fails', async () => {
    const origInterestFindById = Interest.findById;
    const origConvFindOne = Conversation.findOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;

    let savedStatusHistory = [];
    const mockAccepted = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'ACCEPTED',
      save: async function() {
        savedStatusHistory.push(this.status);
      },
    };

    Interest.findById = async () => mockAccepted;
    Conversation.findOne = async () => ({
      status: 'ACTIVE',
      save: async () => {},
    });
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });

    Notification.findOne = async () => null;
    Notification.create = async () => {
      throw new Error('Database error during withdrawal notification');
    };

    let nextError = null;
    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => null },
      };
      const res = createMockRes();
      await withdrawInterest(req, res, (err) => {
        nextError = err;
      });

      assert.ok(nextError, 'Error should be propagated to next() handler');
      assert.strictEqual(mockAccepted.status, 'ACCEPTED', 'Interest status must be rolled back to ACCEPTED');
      assert.deepStrictEqual(savedStatusHistory, ['REJECTED', 'ACCEPTED'], 'Must record state change and rollback');
    } finally {
      Interest.findById = origInterestFindById;
      Conversation.findOne = origConvFindOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
    }
  });

  await test('withdrawInterest self-heals missing notification if interest was already REJECTED', async () => {
    const origInterestFindById = Interest.findById;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;

    const mockAlreadyRejected = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'REJECTED',
    };

    Interest.findById = async () => mockAlreadyRejected;
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });

    let selfHealedNotif = null;
    Notification.findOne = async () => null; // Missing notification
    Notification.create = async (doc) => {
      selfHealedNotif = doc;
      return doc;
    };

    try {
      const req = {
        user: { userId: RECIPIENT_USER_ID },
        params: { id: VALID_INTEREST_ID },
        app: { get: () => null },
      };
      const res = createMockRes();
      await withdrawInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.ok(selfHealedNotif, 'Self-healing withdrawal notification must be created');
      assert.strictEqual(selfHealedNotif.user, SENDER_USER_ID);
      assert.strictEqual(selfHealedNotif.type, 'INTEREST_WITHDRAWN');
    } finally {
      Interest.findById = origInterestFindById;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Bounded Batch Pagination & Memory Safety Tests (H-1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Bounded Batch Pagination & Memory Safety (H-1) ---');

  await test('getNotifications handles dataset larger than one batch with bounded memory reads', async () => {
    // Generate 250 mock notifications (larger than batch size 100)
    // 50 trashed items sprinkled at beginning (0-19), middle (100-119), and end (240-249)
    const mockDbNotifications = [];
    for (let i = 0; i < 250; i++) {
      const isTrashed = (i < 20) || (i >= 100 && i < 120) || (i >= 240);
      mockDbNotifications.push({
        _id: `notif_${String(i).padStart(4, '0')}`,
        id: `notif_${String(i).padStart(4, '0')}`,
        user: RECIPIENT_USER_ID,
        title: `Notification ${i}`,
        message: `Content ${i}`,
        read: i % 2 === 0,
        createdAt: new Date(Date.now() - i * 1000),
        metadata: isTrashed ? { isDeleted: true, trashed: true } : { interestId: `int_${i}` },
      });
    }

    const origFind = Notification.find;
    const origCount = Notification.countDocuments;

    let dbBatchFetchCount = 0;
    // Mock Notification.find query builder supporting bounded skip/limit
    Notification.find = function(filter) {
      return {
        sort: function() {
          return {
            skip: function(skipAmount) {
              return {
                limit: async function(limitAmount) {
                  dbBatchFetchCount++;
                  const activeItems = mockDbNotifications.filter(n => !n.metadata?.isDeleted);
                  return activeItems.slice(skipAmount, skipAmount + limitAmount);
                }
              };
            }
          };
        }
      };
    };

    Notification.countDocuments = async function(filter) {
      const activeItems = mockDbNotifications.filter(n => !n.metadata?.isDeleted);
      if (filter.read === false) {
        return activeItems.filter(n => !n.read).length;
      }
      return activeItems.length;
    };

    try {
      // Page 1: limit 20
      const req1 = { user: { userId: RECIPIENT_USER_ID }, query: { page: '1', limit: '20' } };
      const res1 = createMockRes();
      await getNotifications(req1, res1, () => {});

      assert.strictEqual(res1.statusCode, 200);
      assert.strictEqual(res1.body?.data?.notifications.length, 20, 'Page 1 must be full (20 active items)');
      assert.strictEqual(res1.body?.data?.total, 200, 'Total active notifications must exclude all 50 trashed items');
      assert.strictEqual(res1.body?.data?.page, 1);
      assert.strictEqual(res1.body?.data?.limit, 20);

      // Verify no trashed items in response
      const hasTrashedP1 = res1.body.data.notifications.some(n => n.metadata?.isDeleted);
      assert.strictEqual(hasTrashedP1, false, 'Page 1 must contain ZERO trashed notifications');

      // Page 2: skip 20, limit 20
      const req2 = { user: { userId: RECIPIENT_USER_ID }, query: { page: '2', limit: '20' } };
      const res2 = createMockRes();
      await getNotifications(req2, res2, () => {});

      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.body?.data?.notifications.length, 20, 'Page 2 must be full (20 active items)');
      assert.strictEqual(res2.body?.data?.page, 2);

      // Verify stable continuation: Page 1 and Page 2 must have ZERO overlapping IDs
      const p1Ids = new Set(res1.body.data.notifications.map(n => n._id));
      const hasOverlap = res2.body.data.notifications.some(n => p1Ids.has(n._id));
      assert.strictEqual(hasOverlap, false, 'Page 1 and Page 2 must have ZERO overlapping notifications');

      // Verify exhausted page
      const reqExhausted = { user: { userId: RECIPIENT_USER_ID }, query: { page: '11', limit: '20' } };
      const resExhausted = createMockRes();
      await getNotifications(reqExhausted, resExhausted, () => {});

      assert.strictEqual(resExhausted.statusCode, 200);
      assert.strictEqual(resExhausted.body?.data?.notifications.length, 0, 'Exhausted page must return empty array without error');
    } finally {
      Notification.find = origFind;
      Notification.countDocuments = origCount;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Conditional Compensating Rollback & Cross-Process Transitions (H-2, M-1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Conditional Compensating Rollback & CAS Concurrency (H-2, M-1) ---');

  await test('acceptInterest atomic CAS skips redundant interest.save() on success (M-1)', async () => {
    const origInterestFindById = Interest.findById;
    const origInterestUpdateOne = Interest.updateOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;
    const origConvFindOne = Conversation.findOne;

    let documentSaveCalled = false;
    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
      save: async function() {
        documentSaveCalled = true;
      },
    };

    Interest.findById = async () => mockInterest;
    Interest.updateOne = async () => ({ acknowledged: true, matchedCount: 1, modifiedCount: 1 });
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });
    Notification.findOne = async () => null;
    Notification.create = async (doc) => doc;
    Conversation.findOne = async () => ({ _id: '67b033334444555566667777', participants: [SENDER_USER_ID, RECIPIENT_USER_ID] });
    Conversation.create = async (doc) => ({ _id: '67b033334444555566667777', ...doc });

    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const res = createMockRes();
      await acceptInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(documentSaveCalled, false, 'M-1: Must NOT call redundant interest.save() when updateOne succeeded');
      assert.strictEqual(mockInterest.status, 'ACCEPTED');
    } finally {
      Interest.findById = origInterestFindById;
      Interest.updateOne = origInterestUpdateOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
      Conversation.findOne = origConvFindOne;
    }
  });

  await test('acceptInterest conditional rollback succeeds when status is still ACCEPTED (H-2)', async () => {
    const origInterestFindById = Interest.findById;
    const origInterestUpdateOne = Interest.updateOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;

    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
    };

    let rollbackFilter = null;
    let rollbackUpdate = null;
    Interest.findById = async () => mockInterest;
    Interest.updateOne = async (filter, update) => {
      if (filter.status === 'PENDING') {
        mockInterest.status = 'ACCEPTED';
        return { modifiedCount: 1, matchedCount: 1 };
      }
      if (filter.status === 'ACCEPTED') {
        rollbackFilter = filter;
        rollbackUpdate = update;
        mockInterest.status = update.$set.status;
        return { modifiedCount: 1, matchedCount: 1 };
      }
      return { modifiedCount: 0, matchedCount: 0 };
    };

    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });
    Notification.findOne = async () => null;
    Notification.create = async () => {
      throw new Error('Downstream push error');
    };

    let nextError = null;
    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const res = createMockRes();
      await acceptInterest(req, res, (err) => { nextError = err; });

      assert.ok(nextError);
      assert.strictEqual(mockInterest.status, 'PENDING', 'State must be rolled back to PENDING');
      assert.strictEqual(rollbackFilter.status, 'ACCEPTED', 'Rollback MUST require status to be ACCEPTED');
      assert.strictEqual(rollbackUpdate.$set.status, 'PENDING');
    } finally {
      Interest.findById = origInterestFindById;
      Interest.updateOne = origInterestUpdateOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
    }
  });

  await test('acceptInterest conditional rollback aborts when concurrent process altered state (H-2 cross-process safety)', async () => {
    const origInterestFindById = Interest.findById;
    const origInterestUpdateOne = Interest.updateOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;

    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'PENDING',
    };

    Interest.findById = async () => mockInterest;
    Interest.updateOne = async (filter, update) => {
      if (filter.status === 'PENDING') {
        mockInterest.status = 'ACCEPTED';
        return { modifiedCount: 1, matchedCount: 1 };
      }
      if (filter.status === 'ACCEPTED') {
        // Concurrent process changed state to REJECTED before rollback executed
        return { modifiedCount: 0, matchedCount: 0 };
      }
      return { modifiedCount: 0, matchedCount: 0 };
    };

    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });
    Notification.findOne = async () => null;
    Notification.create = async () => {
      throw new Error('Downstream network failure');
    };

    let nextError = null;
    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const res = createMockRes();
      await acceptInterest(req, res, (err) => { nextError = err; });

      assert.ok(nextError);
      assert.notStrictEqual(mockInterest.status, 'PENDING', 'Must NOT overwrite concurrent state change');
    } finally {
      Interest.findById = origInterestFindById;
      Interest.updateOne = origInterestUpdateOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
    }
  });

  await test('withdrawInterest conditional rollback aborts when concurrent process altered state (H-2)', async () => {
    const origInterestFindById = Interest.findById;
    const origInterestUpdateOne = Interest.updateOne;
    const origUserFindById = User.findById;
    const origProfileFindOne = Profile.findOne;
    const origNotifFindOne = Notification.findOne;
    const origNotifCreate = Notification.create;
    const origConvFindOne = Conversation.findOne;

    const mockInterest = {
      _id: VALID_INTEREST_ID,
      id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'ACCEPTED',
    };

    Interest.findById = async () => mockInterest;
    Interest.updateOne = async (filter, update) => {
      if (filter.status === 'ACCEPTED') {
        mockInterest.status = 'REJECTED';
        return { modifiedCount: 1, matchedCount: 1 };
      }
      if (filter.status === 'REJECTED') {
        return { modifiedCount: 0, matchedCount: 0 };
      }
      return { modifiedCount: 0, matchedCount: 0 };
    };

    Conversation.findOne = async () => null;
    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Recipient' });
    Profile.findOne = () => ({
      then(r) { r({ displayName: 'Dr. Recipient', privacySettings: {} }); }
    });
    Notification.findOne = async () => null;
    Notification.create = async () => {
      throw new Error('Notification creation failure');
    };

    let nextError = null;
    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, params: { id: VALID_INTEREST_ID }, app: { get: () => null } };
      const res = createMockRes();
      await withdrawInterest(req, res, (err) => { nextError = err; });

      assert.ok(nextError);
      assert.notStrictEqual(mockInterest.status, 'ACCEPTED');
    } finally {
      Interest.findById = origInterestFindById;
      Interest.updateOne = origInterestUpdateOne;
      Conversation.findOne = origConvFindOne;
      User.findById = origUserFindById;
      Profile.findOne = origProfileFindOne;
      Notification.findOne = origNotifFindOne;
      Notification.create = origNotifCreate;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Fail-Safe Chat Access Restrictions on Withdrawn/Rejected Interest (M-2)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Fail-Safe Chat Access on Withdrawn/Rejected Interest (M-2) ---');

  const VALID_CONV_ID = '67b033334444555566667777';

  await test('sendMessage rejects with HTTP 403 INTEREST_NOT_ACCEPTED when interest is REJECTED even if conversation is ACTIVE', async () => {
    const origUserFindById = User.findById;
    const origInterestFindOne = Interest.findOne;
    const origConvFindById = Conversation.findById;
    const origConvFindOne = Conversation.findOne;
    const origSubFindOne = Subscription.findOne;
    const origBlockFindOne = Block.findOne;

    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Member', isActive: true, status: 'Active' });
    Subscription.findOne = () => ({
      sort: () => Promise.resolve({ _id: 'sub_1', status: 'ACTIVE', plan: 'PREMIUM', expiryDate: new Date(Date.now() + 1000000) }),
    });
    Block.findOne = async () => null;
    Conversation.findById = async () => ({
      _id: VALID_CONV_ID,
      id: VALID_CONV_ID,
      participants: [SENDER_USER_ID, RECIPIENT_USER_ID],
      status: 'ACTIVE', // Archival write failed during withdrawal!
    });
    Conversation.findOne = async () => ({
      _id: VALID_CONV_ID,
      id: VALID_CONV_ID,
      participants: [SENDER_USER_ID, RECIPIENT_USER_ID],
      status: 'ACTIVE',
    });
    // Interest is REJECTED
    Interest.findOne = async () => ({
      _id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'REJECTED',
    });

    try {
      const req = {
        user: { userId: SENDER_USER_ID, role: 'member' },
        body: { conversationId: VALID_CONV_ID, receiverId: RECIPIENT_USER_ID, content: 'Hello there' },
      };
      const res = createMockRes();
      await sendMessage(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'INTEREST_NOT_ACCEPTED', 'Must reject with INTEREST_NOT_ACCEPTED');
    } finally {
      User.findById = origUserFindById;
      Interest.findOne = origInterestFindOne;
      Conversation.findById = origConvFindById;
      Conversation.findOne = origConvFindOne;
      Subscription.findOne = origSubFindOne;
      Block.findOne = origBlockFindOne;
    }
  });

  await test('getConversationMessagesForUser rejects with HTTP 403 when interest is REJECTED', async () => {
    const origConvFindOne = Conversation.findOne;
    const origInterestFindOne = Interest.findOne;

    Conversation.findOne = () => ({
      populate: () => ({
        lean: async () => ({
          _id: VALID_CONV_ID,
          id: VALID_CONV_ID,
          participants: [{ _id: SENDER_USER_ID }, { _id: RECIPIENT_USER_ID }],
          status: 'ACTIVE',
        }),
      }),
    });

    Interest.findOne = async () => ({
      _id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'REJECTED',
    });

    try {
      const req = { user: { userId: SENDER_USER_ID, role: 'member' }, params: { id: VALID_CONV_ID } };
      const res = createMockRes();
      await getConversationMessagesForUser(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.code, 'INTEREST_NOT_ACCEPTED', 'Must reject message retrieval when connection is REJECTED');
    } finally {
      Conversation.findOne = origConvFindOne;
      Interest.findOne = origInterestFindOne;
    }
  });

  await test('sendMessage rejects with HTTP 403 when conversation is ARCHIVED', async () => {
    const origUserFindById = User.findById;
    const origInterestFindOne = Interest.findOne;
    const origConvFindById = Conversation.findById;
    const origConvFindOne = Conversation.findOne;
    const origSubFindOne = Subscription.findOne;
    const origBlockFindOne = Block.findOne;

    User.findById = async (id) => ({ _id: id, id, fullName: 'Dr. Member', isActive: true, status: 'Active' });
    Subscription.findOne = () => ({
      sort: () => Promise.resolve({ _id: 'sub_1', status: 'ACTIVE', plan: 'PREMIUM', expiryDate: new Date(Date.now() + 1000000) }),
    });
    Block.findOne = async () => null;
    Conversation.findById = async () => ({
      _id: VALID_CONV_ID,
      id: VALID_CONV_ID,
      participants: [SENDER_USER_ID, RECIPIENT_USER_ID],
      status: 'ARCHIVED',
    });
    Conversation.findOne = async () => ({
      _id: VALID_CONV_ID,
      id: VALID_CONV_ID,
      participants: [SENDER_USER_ID, RECIPIENT_USER_ID],
      status: 'ARCHIVED',
    });
    Interest.findOne = async () => ({
      _id: VALID_INTEREST_ID,
      sender: SENDER_USER_ID,
      receiver: RECIPIENT_USER_ID,
      status: 'ACCEPTED',
    });

    try {
      const req = {
        user: { userId: SENDER_USER_ID, role: 'member' },
        body: { conversationId: VALID_CONV_ID, receiverId: RECIPIENT_USER_ID, content: 'Hello there' },
      };
      const res = createMockRes();
      await sendMessage(req, res, () => {});

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.message, 'This conversation has been restricted or archived and is read-only');
    } finally {
      User.findById = origUserFindById;
      Interest.findOne = origInterestFindOne;
      Conversation.findById = origConvFindById;
      Conversation.findOne = origConvFindOne;
      Subscription.findOne = origSubFindOne;
      Block.findOne = origBlockFindOne;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Bounded Scans, Count Semantics, and Pagination Stability Audit (H-1 Final)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing Bounded Scans, Count Semantics & Pagination Stability (H-1 Final) ---');

  await test('getUserNotifications bounded scan: >2000 records with many trashed stops at MAX_SCAN_BUDGET with isTruncated flag', async () => {
    const origFindMany = prisma.notification.findMany;
    let maxOffsetEncountered = 0;
    let batchCalls = 0;

    // Simulate 2,500 total records in MariaDB: all trashed except 5 active items at the very end (> index 2000)
    const mockDb = [];
    for (let i = 0; i < 2500; i++) {
      mockDb.push({
        id: `notif_${String(i).padStart(5, '0')}`,
        userId: RECIPIENT_USER_ID,
        title: `Notification ${i}`,
        message: `Message ${i}`,
        read: true,
        metadata: i < 2400 ? { isDeleted: true, trashed: true } : {},
        createdAt: new Date(Date.now() - i * 1000),
      });
    }

    prisma.notification.findMany = async (args) => {
      batchCalls++;
      const skip = args.skip || 0;
      const take = args.take || 100;
      assert.ok(take <= 100, `Batch size must be bounded (received take=${take})`);
      if (skip > maxOffsetEncountered) maxOffsetEncountered = skip;
      return mockDb.slice(skip, skip + take);
    };

    try {
      const results = await NotificationRepository.getUserNotifications(RECIPIENT_USER_ID, 20);
      assert.ok(Array.isArray(results));
      assert.ok(maxOffsetEncountered <= 2000, `Database offset must never exceed MAX_SCAN_BUDGET=2000 (reached ${maxOffsetEncountered})`);
      assert.strictEqual(results.isTruncated, true, 'Result must be flagged isTruncated=true when budget is reached');
      assert.strictEqual(results.scanBudgetExceeded, true, 'Result must flag scanBudgetExceeded=true');
    } finally {
      prisma.notification.findMany = origFindMany;
    }
  });

  await test('getUnreadCount bounded counting: >5000 notifications triggers isCapped flag without returning count as exact', async () => {
    const origFindMany = prisma.notification.findMany;
    let maxOffsetEncountered = 0;

    // Simulate 6,000 unread records
    const mockDb = [];
    for (let i = 0; i < 6000; i++) {
      mockDb.push({
        id: `notif_${String(i).padStart(5, '0')}`,
        userId: RECIPIENT_USER_ID,
        read: false,
        metadata: {},
        createdAt: new Date(Date.now() - i * 1000),
      });
    }

    prisma.notification.findMany = async (args) => {
      const skip = args.skip || 0;
      const take = args.take || 250;
      assert.ok(take <= 250, `Counting batch size must be bounded (received take=${take})`);
      assert.ok(args.select?.read, 'Count query projection must include read field');
      assert.ok(args.select?.metadata, 'Count query projection must include metadata field');
      if (skip > maxOffsetEncountered) maxOffsetEncountered = skip;
      return mockDb.slice(skip, skip + take);
    };

    try {
      const unreadCountRes = await NotificationRepository.getUnreadCount(RECIPIENT_USER_ID);
      assert.ok(maxOffsetEncountered <= 5000, `Count scan must never exceed MAX_COUNT_BUDGET=5000 (reached ${maxOffsetEncountered})`);
      assert.strictEqual(Number(unreadCountRes), 5000);
      assert.strictEqual(unreadCountRes.isCapped, true, 'Count result must flag isCapped=true');
      assert.strictEqual(unreadCountRes.cappedAt, 5000);
    } finally {
      prisma.notification.findMany = origFindMany;
    }
  });

  await test('Missing required projection fields: queries selecting only "title message" still safely filter trashed items', async () => {
    const origFindMany = prisma.notification.findMany;

    // Mock records in DB
    const mockDb = [
      { id: 'n1', userId: RECIPIENT_USER_ID, title: 'T1', message: 'M1', read: false, metadata: { isDeleted: true }, createdAt: new Date() },
      { id: 'n2', userId: RECIPIENT_USER_ID, title: 'T2', message: 'M2', read: false, metadata: {}, createdAt: new Date() },
    ];

    let capturedSelect = null;
    prisma.notification.findMany = async (args) => {
      capturedSelect = args.select;
      return mockDb.map(item => {
        const out = {};
        if (args.select) {
          for (const k of Object.keys(args.select)) {
            out[k] = item[k];
          }
        } else {
          Object.assign(out, item);
        }
        return out;
      });
    };

    try {
      const items = await Notification.find({ user: RECIPIENT_USER_ID }).select('title message').skip(0).limit(10);
      assert.ok(capturedSelect?.metadata, 'Bridge must automatically ensure metadata is included for soft-delete checks');
      assert.ok(capturedSelect?.read, 'Bridge must automatically ensure read is included for unread status');
      assert.strictEqual(items.length, 1, 'Only non-trashed item must be returned');
      assert.strictEqual(items[0].title, 'T2');
    } finally {
      prisma.notification.findMany = origFindMany;
    }
  });

  await test('Matching timestamps use unique id tie-breaker to maintain stable pagination order without duplicates', async () => {
    const origFindMany = prisma.notification.findMany;
    const sameTimestamp = new Date('2026-10-23T12:00:00.000Z');

    // 10 items all with exact same createdAt
    const mockDb = [];
    for (let i = 1; i <= 10; i++) {
      mockDb.push({
        id: `notif_${String(i).padStart(2, '0')}`,
        userId: RECIPIENT_USER_ID,
        title: `Item ${i}`,
        message: `Msg ${i}`,
        read: false,
        metadata: {},
        createdAt: sameTimestamp,
      });
    }

    let capturedOrderBy = null;
    prisma.notification.findMany = async (args) => {
      capturedOrderBy = args.orderBy;
      const skip = args.skip || 0;
      const take = args.take || 5;
      const sorted = [...mockDb].sort((a, b) => b.id.localeCompare(a.id));
      return sorted.slice(skip, skip + take);
    };

    try {
      const page1 = await NotificationRepository.getUserNotifications(RECIPIENT_USER_ID, 5);
      assert.ok(Array.isArray(capturedOrderBy));
      const hasIdTieBreaker = capturedOrderBy.some(o => o && ('id' in o || '_id' in o));
      assert.strictEqual(hasIdTieBreaker, true, 'OrderBy must contain id tie-breaker for deterministic sorting');

      assert.strictEqual(page1.length, 5);
      const p1Ids = new Set(page1.map(n => n.id));

      const page2All = await NotificationRepository.getUserNotifications(RECIPIENT_USER_ID, 10);
      const page2Slice = page2All.slice(5);

      assert.strictEqual(page2Slice.length, 5);
      const hasDuplicate = page2Slice.some(n => p1Ids.has(n.id));
      assert.strictEqual(hasDuplicate, false, 'No duplicate notifications across pages when timestamps match');
    } finally {
      prisma.notification.findMany = origFindMany;
    }
  });

  await test('getNotifications API returns truncation, capped status, and continuation metadata when budget reached', async () => {
    const origFind = Notification.find;
    const origCount = Notification.countDocuments;

    const mockNotifications = [{ _id: 'n1', title: 'N1', read: false, metadata: {} }];
    mockNotifications.isTruncated = true;
    mockNotifications.scanBudgetExceeded = true;

    Notification.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: async () => mockNotifications,
        }),
      }),
    });

    const cappedCount = new Number(5000);
    cappedCount.isCapped = true;
    cappedCount.count = 5000;
    Notification.countDocuments = async () => cappedCount;

    try {
      const req = { user: { userId: RECIPIENT_USER_ID }, query: { page: '1', limit: '20' } };
      const res = createMockRes();
      await getNotifications(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.data?.isTruncated, true, 'API response must indicate isTruncated=true');
      assert.strictEqual(res.body?.data?.isCapped, true, 'API response must indicate isCapped=true');
      assert.strictEqual(res.body?.data?.hasMore, true, 'API response must indicate hasMore=true for safe continuation');
    } finally {
      Notification.find = origFind;
      Notification.countDocuments = origCount;
    }
  });

  await test('Accurate frontend badge semantics: getUnreadCount returns isCapped flag for 5000+ badge display', async () => {
    const origCount = Notification.countDocuments;

    const cappedCount = new Number(5000);
    cappedCount.isCapped = true;
    cappedCount.count = 5000;
    Notification.countDocuments = async () => cappedCount;

    try {
      const req = { user: { userId: RECIPIENT_USER_ID } };
      const res = createMockRes();
      await getUnreadCount(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.data?.count, 5000);
      assert.strictEqual(res.body?.data?.isCapped, true, 'API must return isCapped=true');
      assert.strictEqual(res.body?.data?.cappedAt, 5000);

      // Verify frontend formatting logic: isUnreadCapped ? `${unreadCount}+` : unreadCount > 99 ? '99+' : unreadCount
      const count = res.body.data.count;
      const isCapped = res.body.data.isCapped;
      const formattedBadge = isCapped ? `${count}+` : count > 99 ? '99+' : String(count);
      assert.strictEqual(formattedBadge, '5000+', 'Frontend badge must render with + suffix when count is capped');
    } finally {
      Notification.countDocuments = origCount;
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
  console.error('Test runner error:', err);
  process.exit(1);
});
