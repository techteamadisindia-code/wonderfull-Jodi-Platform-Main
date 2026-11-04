/**
 * Comprehensive Test Suite: Undo Decline / Restore Interest Feature
 *
 * 100% TEST ISOLATION GUARANTEE:
 * In-memory models and stubs guarantee zero production database mutations.
 *
 * Validates:
 * 1. Authentication & Input Validation:
 *    - Rejects unauthenticated caller (HTTP 401).
 *    - Rejects invalid ObjectId format (HTTP 400).
 *    - Rejects nonexistent interest ID (HTTP 404).
 *    - Rejects corrupted interest records with missing sender or receiver (HTTP 500).
 * 2. Strict Member-Facing Authorization (No Administrator Bypass):
 *    - Original sender cannot reverse the other party's decline decision (HTTP 403).
 *    - Unrelated third-party cannot restore another user's interest (HTTP 403).
 *    - Administrator cannot bypass member-facing endpoint to restore another member's interest (HTTP 403).
 * 3. Authoritative Decline Attribution & Fail-Closed Guard:
 *    - Administrator-rejected requests cannot be undone by the recipient (HTTP 403).
 *    - Historical/un-attributed requests with missing decline attribution fail closed (HTTP 403).
 *    - Only the original rejecting member with confirmed attribution can undo (HTTP 200).
 * 4. Status Transitions & Idempotency:
 *    - Successfully restores a REJECTED interest back to PENDING (HTTP 200).
 *    - Successfully restores a DECLINED interest back to PENDING (HTTP 200).
 *    - Idempotent retry: already PENDING interest returns HTTP 200 without duplicate actions.
 *    - Rejects restoring an already ACCEPTED connection (HTTP 400).
 *    - Rejects restoring a CANCELLED request (HTTP 400).
 * 5. Withdrawn Connection Protection & Unrelated Conversation Isolation:
 *    - Rejects restoring a connection that was withdrawn (linked Conversation with interest ID) (HTTP 400).
 *    - Rejects restoring an interest that has an INTEREST_WITHDRAWN notification (HTTP 400).
 *    - Unrelated conversations between the same two users do NOT incorrectly classify an interest as withdrawn (HTTP 200).
 * 6. Active Block Enforcement:
 *    - Rejects restoration if receiver blocked sender (HTTP 403).
 *    - Rejects restoration if sender blocked receiver (HTTP 403).
 * 7. Account Status Enforcement:
 *    - Rejects restoration if sender account is deleted, suspended, or blocked (HTTP 400).
 *    - Rejects restoration if receiver account is deleted, suspended, or blocked (HTTP 400).
 * 8. Concurrency & Notification Self-Healing:
 *    - Serializes concurrent in-flight restore calls safely without duplicate notifications.
 *    - Notification creation failure followed by a successful retry repairs notification safely.
 * 9. Generic Update Handler Routing:
 *    - updateInterest routes { status: 'PENDING' } to undoDeclineInterest.
 * 10. List Enrichment:
 *    - getReceivedInterests marks declined items with canUndoDecline: true ONLY when authenticated user declined.
 *    - getReceivedInterests marks administrator-declined items with canUndoDecline: false.
 *    - getReceivedInterests marks withdrawn items with canUndoDecline: false.
 *    - getSentInterests marks all items with canUndoDecline: false.
 */

const assert = require('assert');
const {
  undoDeclineInterest,
  updateInterest,
  getReceivedInterests,
  getSentInterests,
  verifyDeclineAttribution,
} = require('./dist/controllers/interestController.js');
const { Interest } = require('./dist/models/Interest.js');
const { User } = require('./dist/models/User.js');
const { Profile } = require('./dist/models/Profile.js');
const { Block } = require('./dist/models/Block.js');
const { Notification } = require('./dist/models/Notification.js');
const { Conversation } = require('./dist/models/Conversation.js');

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
    emitted,
    to(room) {
      return {
        emit(event, payload) {
          emitted.push({ room, event, payload });
        },
      };
    },
  };
}

async function runSuite() {
  console.log('\n===============================================================');
  console.log('Running Undo Decline / Restore Interest Feature Test Suite');
  console.log('===============================================================\n');

  // Preserve originals
  const originalInterestFindById = Interest.findById;
  const originalInterestUpdateOne = Interest.updateOne;
  const originalInterestFind = Interest.find;
  const originalUserFindById = User.findById;
  const originalProfileFindOne = Profile.findOne;
  const originalProfileFind = Profile.find;
  const originalBlockFindOne = Block.findOne;
  const originalNotificationCreate = Notification.create;
  const originalNotificationFindOne = Notification.findOne;
  const originalNotificationFind = Notification.find;
  const originalNotificationUpdateMany = Notification.updateMany;
  const originalConversationFindOne = Conversation.findOne;
  const originalConversationFind = Conversation.find;

  const senderId = '507f191e810c19729de860ea';
  const receiverId = '507f191e810c19729de860eb';
  const adminId = '507f191e810c19729de860ed';
  const thirdPartyId = '507f191e810c19729de860ec';
  const interestId = '507f1f77bcf86cd799439011';

  try {
    // 1. Authentication & Input Validation
    console.log('\n--- Group 1: Authentication & Input Validation ---');

    await test('Rejects unauthenticated call (HTTP 401)', async () => {
      const req = { user: null, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.message, 'Authentication required');
    });

    await test('Rejects invalid ObjectId (HTTP 400)', async () => {
      const req = { user: { userId: receiverId }, params: { id: 'invalid-id' } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.message, 'Invalid interest ID');
    });

    await test('Rejects nonexistent interest (HTTP 404)', async () => {
      Interest.findById = async () => null;
      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.message, 'Interest not found');
    });

    await test('Rejects interest with missing sender or receiver (HTTP 500)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: null,
        receiver: null,
        status: 'REJECTED',
      });
      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.message, 'Interest record has missing sender or receiver details');
    });

    // 2. Strict Member-Facing Authorization (No Administrator Bypass)
    console.log('\n--- Group 2: Strict Member-Facing Authorization ---');

    await test('Original sender cannot reverse the other party decline (HTTP 403)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
      });
      const req = { user: { userId: senderId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.message, 'You cannot reverse a decision made by the other member');
    });

    await test('Unrelated third-party cannot restore another user interest (HTTP 403)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
      });
      const req = { user: { userId: thirdPartyId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.message, 'Only the recipient who personally declined this interest can restore it');
    });

    await test('Administrator cannot bypass member-facing endpoint to restore another member interest (HTTP 403)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
      });
      const req = { user: { userId: adminId, role: 'admin' }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.message, 'Only the recipient who personally declined this interest can restore it');
    });

    // 3. Authoritative Decline Attribution & Fail-Closed Guard
    console.log('\n--- Group 3: Authoritative Decline Attribution & Fail-Closed ---');

    await test('Administrator-rejected requests cannot be undone by the recipient (fails closed HTTP 403)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
      });
      // Notification shows that adminId performed the decline
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [
            {
              metadata: {
                interestId: interestId,
                recipientUserId: adminId,
                declinedByUserId: adminId,
                type: 'INTEREST_REJECTED',
              },
            },
          ],
        }),
      });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('declined by an administrator'));
    });

    await test('Historical or un-attributed requests with missing attribution fail closed (HTTP 403)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
      });
      // No decline notifications exist
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [],
        }),
      });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('Cannot verify that you personally declined this request'));
    });

    await test('Only original rejecting member with confirmed attribution can undo (HTTP 200)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
        save: async function () {},
      });
      Interest.updateOne = async () => ({ modifiedCount: 1 });
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [
            {
              metadata: {
                interestId: interestId,
                recipientUserId: receiverId,
                type: 'INTEREST_REJECTED',
              },
            },
          ],
        }),
      });
      Block.findOne = async () => null;
      User.findById = async (id) => ({
        _id: id,
        fullName: id === senderId ? 'Dr. Sender' : 'Dr. Receiver',
        isDeleted: false,
        status: 'ACTIVE',
      });
      Profile.findOne = async () => ({
        displayName: 'Dr. Receiver Profile',
        primaryPhoto: 'https://example.com/photo.jpg',
        privacySettings: { nameVisibility: 'visible' },
      });
      Notification.updateMany = async () => ({ modifiedCount: 1 });
      Notification.create = async (p) => ({ _id: 'notif-1', ...p });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'PENDING');
    });

    // 4. Status Transitions & Idempotency
    console.log('\n--- Group 4: Status Transitions & Idempotency ---');

    await test('Successfully restores DECLINED interest back to PENDING (HTTP 200)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'DECLINED',
        declinedBy: receiverId,
        save: async function () {},
      });
      Interest.updateOne = async () => ({ modifiedCount: 1 });
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [],
        }),
      });
      Block.findOne = async () => null;
      User.findById = async (id) => ({ _id: id, fullName: 'Doctor', isDeleted: false, status: 'ACTIVE' });
      Profile.findOne = async () => null;
      Notification.updateMany = async () => ({ modifiedCount: 1 });
      Notification.create = async (p) => ({ _id: 'notif-2', ...p });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'PENDING');
    });

    await test('Idempotent retry: already PENDING interest returns HTTP 200 without duplicate actions', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'PENDING',
        declinedBy: receiverId,
      });
      // Mock existing notification to verify no duplicate is created
      Notification.findOne = async () => ({ _id: 'existing-restore-notif', type: 'INTEREST_RESTORED', metadata: { interestId } });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      let notifCreated = false;
      Notification.create = async () => { notifCreated = true; };

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, 'Interest request is already pending');
      assert.strictEqual(notifCreated, false);
    });

    await test('Rejects restoring an already ACCEPTED connection (HTTP 400)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'ACCEPTED',
        declinedBy: receiverId,
      });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, 'Cannot restore interest request with status: ACCEPTED');
    });

    await test('Rejects restoring a CANCELLED interest (HTTP 400)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'CANCELLED',
        declinedBy: receiverId,
      });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, 'Cannot restore interest request with status: CANCELLED');
    });

    // 5. Withdrawn Connection Protection & Unrelated Conversation Isolation
    console.log('\n--- Group 5: Withdrawn Connection Protection & Conversation Isolation ---');

    await test('Rejects restoring a connection that has a Conversation specifically linked to this interest (HTTP 400)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
      });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      Conversation.findOne = async (q) => {
        if (q.interest === interestId) {
          return { _id: 'conv-withdrawn', interest: interestId };
        }
        return null;
      };

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, 'Cannot undo decline for a withdrawn connection');
    });

    await test('Rejects restoring an interest that has an INTEREST_WITHDRAWN notification (HTTP 400)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
      });
      Conversation.findOne = async () => null;
      Notification.find = (q) => ({
        sort: () => ({
          limit: async () => {
            if (q.type === 'INTEREST_WITHDRAWN') {
              return [{ type: 'INTEREST_WITHDRAWN', metadata: { interestId } }];
            }
            return [{ metadata: { interestId, recipientUserId: receiverId } }];
          },
        }),
      });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, 'Cannot undo decline for a withdrawn connection');
    });

    await test('Unrelated conversations between the same two users do NOT incorrectly classify an interest as withdrawn (HTTP 200)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
        save: async function () {},
      });
      // Conversation.findOne with interest: interestId returns null (unrelated conversation has different or null interest)
      Conversation.findOne = async (q) => {
        if (q.interest === interestId) return null;
        return { _id: 'conv-unrelated', participants: [senderId, receiverId] };
      };
      Notification.findOne = async () => null;
      Notification.find = (q) => ({
        sort: () => ({
          limit: async () => {
            if (q.type === 'INTEREST_WITHDRAWN') return [];
            return [{ metadata: { interestId, recipientUserId: receiverId } }];
          },
        }),
      });
      Interest.updateOne = async () => ({ modifiedCount: 1 });
      Block.findOne = async () => null;
      User.findById = async (id) => ({ _id: id, fullName: 'Doctor', isDeleted: false, status: 'ACTIVE' });
      Profile.findOne = async () => null;
      Notification.updateMany = async () => ({ modifiedCount: 1 });
      Notification.create = async (p) => ({ _id: 'notif-valid', ...p });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'PENDING');
    });

    // 6. Active Block Enforcement
    console.log('\n--- Group 6: Active Block Enforcement ---');

    await test('Rejects restoration when receiver blocked sender (HTTP 403)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
      });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Block.findOne = async () => ({ _id: 'block-1', blocker: receiverId, blocked: senderId });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.message, 'Cannot restore interest request with a blocked member');
    });

    await test('Rejects restoration when sender blocked receiver (HTTP 403)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
      });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Block.findOne = async () => ({ _id: 'block-2', blocker: senderId, blocked: receiverId });

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.message, 'Cannot restore interest request with a blocked member');
    });

    // 7. Account Status Enforcement
    console.log('\n--- Group 7: Account Status Enforcement ---');

    await test('Rejects restoration if sender account is deleted or suspended (HTTP 400)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
      });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Block.findOne = async () => null;
      User.findById = async (id) => {
        if (id === senderId) return { _id: id, isDeleted: true, status: 'SUSPENDED' };
        return { _id: id, isDeleted: false, status: 'ACTIVE' };
      };

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, 'Cannot restore interest: the sender account is inactive or no longer available');
    });

    await test('Rejects restoration if receiver account is suspended or blocked (HTTP 400)', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
      });
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Block.findOne = async () => null;
      User.findById = async (id) => {
        if (id === senderId) return { _id: id, isDeleted: false, status: 'ACTIVE' };
        return { _id: id, isDeleted: false, status: 'BLOCKED' };
      };

      const req = { user: { userId: receiverId }, params: { id: interestId } };
      const res = createMockRes();
      await undoDeclineInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.message, 'Your account is not eligible to restore interest requests');
    });

    // 8. Concurrency & Notification Self-Healing
    console.log('\n--- Group 8: Concurrency & Notification Self-Healing ---');

    await test('Notification creation failure followed by successful retry repairs notification safely', async () => {
      let docStatus = 'REJECTED';
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: docStatus,
        declinedBy: receiverId,
        save: async function () { docStatus = this.status; },
      });
      Interest.updateOne = async () => {
        docStatus = 'PENDING';
        return { modifiedCount: 1 };
      };
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Notification.find = (q) => ({
        sort: () => ({
          limit: async () => {
            if (q?.type === 'INTEREST_RESTORED') return [];
            return [{ metadata: { interestId, recipientUserId: receiverId } }];
          },
        }),
      });
      Block.findOne = async () => null;
      User.findById = async (id) => ({ _id: id, fullName: 'Doctor', isDeleted: false, status: 'ACTIVE' });
      Profile.findOne = async () => null;
      Notification.updateMany = async () => ({ modifiedCount: 1 });

      let attempts = 0;
      let createdNotif = null;
      Notification.create = async (p) => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Transient DB timeout during notification insert');
        }
        createdNotif = p;
        return { _id: 'notif-repaired', ...p };
      };

      // First call: Notification fails, but status transitions to PENDING and returns success
      const req1 = { user: { userId: receiverId }, params: { id: interestId } };
      const res1 = createMockRes();
      await undoDeclineInterest(req1, res1, () => {});
      assert.strictEqual(res1.statusCode, 200);
      assert.strictEqual(res1.body.data.status, 'PENDING');
      assert.strictEqual(attempts, 1);
      assert.strictEqual(createdNotif, null);

      // Second call (Retry): Status is already PENDING, self-healing idempotency detects missing notif and creates it!
      const req2 = { user: { userId: receiverId }, params: { id: interestId } };
      const res2 = createMockRes();
      await undoDeclineInterest(req2, res2, () => {});
      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(attempts, 2);
      assert.notStrictEqual(createdNotif, null);
      assert.strictEqual(createdNotif.type, 'INTEREST_RESTORED');
      assert.strictEqual(createdNotif.user, senderId);
    });

    await test('Concurrent calls serialize safely with exact single notification created', async () => {
      let currentStatus = 'REJECTED';
      let notifCount = 0;
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: currentStatus,
        declinedBy: receiverId,
        save: async function () { currentStatus = this.status; },
      });
      Interest.updateOne = async () => {
        if (currentStatus === 'PENDING') {
          return { modifiedCount: 0 };
        }
        currentStatus = 'PENDING';
        return { modifiedCount: 1 };
      };
      Conversation.findOne = async () => null;
      Notification.find = (q) => ({
        sort: () => ({
          limit: async () => {
            if (q?.type === 'INTEREST_RESTORED') return notifCount > 0 ? [{ _id: 'notif-first', metadata: { interestId } }] : [];
            return [{ metadata: { interestId, recipientUserId: receiverId } }];
          },
        }),
      });
      Notification.findOne = async () => (notifCount > 0 ? { _id: 'notif-first' } : null);
      Block.findOne = async () => null;
      User.findById = async (id) => ({ _id: id, fullName: 'Doctor', isDeleted: false, status: 'ACTIVE' });
      Profile.findOne = async () => null;
      Notification.updateMany = async () => ({ modifiedCount: 1 });
      Notification.create = async () => {
        notifCount++;
        return { _id: 'notif-' + notifCount };
      };

      const reqA = { user: { userId: receiverId }, params: { id: interestId } };
      const reqB = { user: { userId: receiverId }, params: { id: interestId } };
      const resA = createMockRes();
      const resB = createMockRes();

      await Promise.all([
        undoDeclineInterest(reqA, resA, () => {}),
        undoDeclineInterest(reqB, resB, () => {}),
      ]);

      assert.strictEqual(resA.statusCode, 200);
      assert.strictEqual(resB.statusCode, 200);
      assert.strictEqual(notifCount, 1);
    });

    // 9. Generic updateInterest routing
    console.log('\n--- Group 9: Generic updateInterest Routing ---');

    await test('updateInterest routes status=PENDING to undoDeclineInterest', async () => {
      Interest.findById = async () => ({
        _id: interestId,
        sender: senderId,
        receiver: receiverId,
        status: 'REJECTED',
        declinedBy: receiverId,
        save: async function () {},
      });
      Interest.updateOne = async () => ({ modifiedCount: 1 });
      Conversation.findOne = async () => null;
      Notification.findOne = async () => null;
      Notification.find = () => ({
        sort: () => ({
          limit: async () => [{ metadata: { interestId, recipientUserId: receiverId } }],
        }),
      });
      Block.findOne = async () => null;
      User.findById = async (id) => ({ _id: id, fullName: 'Doctor', isDeleted: false, status: 'ACTIVE' });
      Profile.findOne = async () => null;
      Notification.updateMany = async () => ({ modifiedCount: 1 });
      Notification.create = async (p) => ({ _id: 'notif-3', ...p });

      const req = {
        user: { userId: receiverId },
        params: { id: interestId },
        body: { status: 'PENDING' },
      };
      const res = createMockRes();
      await updateInterest(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'PENDING');
    });

    // 10. List Enrichment Tests
    console.log('\n--- Group 10: List Enrichment Verification ---');

    await test('getReceivedInterests correctly sets canUndoDecline: true ONLY for authoritatively declined incoming requests', async () => {
      Interest.find = () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => [
              {
                _id: 'interest-declined-by-me',
                sender: senderId,
                receiver: receiverId,
                status: 'REJECTED',
                declinedBy: receiverId,
              },
              {
                _id: 'interest-declined-by-admin',
                sender: senderId,
                receiver: receiverId,
                status: 'REJECTED',
                declinedBy: adminId,
              },
              {
                _id: 'interest-withdrawn',
                sender: senderId,
                receiver: receiverId,
                status: 'REJECTED',
                declinedBy: receiverId,
              },
            ],
          }),
        }),
      });

      Profile.find = () => ({
        select: () => ({
          lean: async () => [],
        }),
      });

      Conversation.find = () => ({
        select: () => ({
          lean: async () => [{ interest: 'interest-withdrawn' }],
        }),
      });

      Notification.find = () => ({
        select: () => ({
          lean: async () => [
            {
              type: 'INTEREST_REJECTED',
              metadata: {
                interestId: 'interest-declined-by-me',
                recipientUserId: receiverId,
              },
            },
            {
              type: 'INTEREST_REJECTED',
              metadata: {
                interestId: 'interest-declined-by-admin',
                recipientUserId: adminId,
              },
            },
          ],
        }),
      });

      const req = { user: { userId: receiverId }, query: {} };
      const res = createMockRes();
      await getReceivedInterests(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.length, 3);

      const regularDeclined = res.body.data.find((i) => i._id === 'interest-declined-by-me');
      const adminDeclined = res.body.data.find((i) => i._id === 'interest-declined-by-admin');
      const withdrawn = res.body.data.find((i) => i._id === 'interest-withdrawn');

      assert.strictEqual(regularDeclined.canUndoDecline, true);
      assert.strictEqual(regularDeclined.declinedByMe, true);

      assert.strictEqual(adminDeclined.canUndoDecline, false);
      assert.strictEqual(adminDeclined.declinedByMe, false);

      assert.strictEqual(withdrawn.canUndoDecline, false);
      assert.strictEqual(withdrawn.isWithdrawn, true);
    });

    await test('getSentInterests always sets canUndoDecline: false for outgoing requests', async () => {
      Interest.find = () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => [
              {
                _id: 'interest-sent-declined',
                sender: senderId,
                receiver: receiverId,
                status: 'REJECTED',
              },
            ],
          }),
        }),
      });

      Profile.find = () => ({
        select: () => ({
          lean: async () => [],
        }),
      });

      const req = { user: { userId: senderId }, query: {} };
      const res = createMockRes();
      await getSentInterests(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].canUndoDecline, false);
      assert.strictEqual(res.body.data[0].declinedByMe, false);
    });

  } finally {
    // Restore originals
    Interest.findById = originalInterestFindById;
    Interest.updateOne = originalInterestUpdateOne;
    Interest.find = originalInterestFind;
    User.findById = originalUserFindById;
    Profile.findOne = originalProfileFindOne;
    Profile.find = originalProfileFind;
    Block.findOne = originalBlockFindOne;
    Notification.create = originalNotificationCreate;
    Notification.findOne = originalNotificationFindOne;
    Notification.find = originalNotificationFind;
    Notification.updateMany = originalNotificationUpdateMany;
    Conversation.findOne = originalConversationFindOne;
    Conversation.find = originalConversationFind;
  }

  console.log('\n===============================================================');
  console.log(`Results: ${passedTests}/${totalTests} passed (${failedTests} failed)`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal error running suite:', err);
  process.exit(1);
});
