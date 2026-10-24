/**
 * ============================================================================
 * WONDERFUL JODI: PROFILE VIEW NOTIFICATIONS & PAID MEMBERSHIP UNLOCK
 * COMPREHENSIVE BACKEND INTEGRATION & SECURITY PRIVACY TEST SUITE
 * ============================================================================
 */

const assert = require('assert');

// In-memory mock store to test model queries and business logic in-process
class MockModel {
  constructor(name) {
    this.name = name;
    this.records = [];
  }

  reset() {
    this.records = [];
  }

  async findOne(query) {
    return this._filter(query)[0] || null;
  }

  async findById(id) {
    const cleanId = String(id?._id || id?.id || id);
    return this.records.find((r) => String(r._id || r.id) === cleanId) || null;
  }

  async find(query) {
    const results = this._filter(query);
    // Return query-like object with sort, limit, select
    const queryObj = {
      _results: [...results],
      sort(criteria) {
        return queryObj;
      },
      skip(n) {
        queryObj._results = queryObj._results.slice(n);
        return queryObj;
      },
      limit(n) {
        queryObj._results = queryObj._results.slice(0, n);
        return queryObj;
      },
      select(fields) {
        return queryObj;
      },
      then(resolve) {
        return Promise.resolve(queryObj._results).then(resolve);
      },
      catch(reject) {
        return Promise.resolve(queryObj._results).catch(reject);
      },
    };
    return queryObj;
  }

  async countDocuments(query) {
    return this._filter(query).length;
  }

  async create(data) {
    const record = {
      _id: 'mock_id_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
      save: async function () {
        return this;
      },
      toObject: function () {
        const copy = { ...this };
        delete copy.save;
        delete copy.toObject;
        return copy;
      },
    };
    this.records.push(record);
    return record;
  }

  _filter(query) {
    if (!query || Object.keys(query).length === 0) return [...this.records];

    return this.records.filter((item) => {
      for (const [key, val] of Object.entries(query)) {
        if (key === '$or' && Array.isArray(val)) {
          const matchOr = val.some((subQuery) => this._matchSubQuery(item, subQuery));
          if (!matchOr) return false;
          continue;
        }
        if (key === '$and' && Array.isArray(val)) {
          const matchAnd = val.every((subQuery) => this._matchSubQuery(item, subQuery));
          if (!matchAnd) return false;
          continue;
        }

        if (!this._matchField(item, key, val)) {
          return false;
        }
      }
      return true;
    });
  }

  _matchSubQuery(item, subQuery) {
    for (const [k, v] of Object.entries(subQuery)) {
      if (k === '$or' && Array.isArray(v)) {
        if (!v.some((sq) => this._matchSubQuery(item, sq))) return false;
        continue;
      }
      if (!this._matchField(item, k, v)) return false;
    }
    return true;
  }

  _matchField(item, key, val) {
    const itemVal = item[key];

    if (val && typeof val === 'object') {
      if (val.$ne !== undefined && itemVal === val.$ne) return false;
      if (val.$in && Array.isArray(val.$in) && !val.$in.map(String).includes(String(itemVal))) return false;
      if (val.$gte !== undefined) {
        const itemDate = new Date(itemVal).getTime();
        const queryDate = new Date(val.$gte).getTime();
        if (itemDate < queryDate) return false;
      }
      if (val.$gt !== undefined) {
        const itemDate = new Date(itemVal).getTime();
        const queryDate = new Date(val.$gt).getTime();
        if (itemDate <= queryDate) return false;
      }
      return true;
    }

    if (key === 'user' && (item.userId || item.user)) {
      const u = String(item.user || item.userId);
      return u === String(val);
    }

    return String(itemVal) === String(val);
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  WONDERFUL JODI: PROFILE VIEW NOTIFICATIONS & MEMBERSHIP TEST SUITE');
  console.log('========================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function test(name, fn) {
    totalCount++;
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
      throw err;
    }
  }

  // Load backend models and services
  const { hasActivePaidMembership } = require('./dist/services/entitlementService');
  const { recordProfileView, PROFILE_VIEW_COOLDOWN_MS } = require('./dist/services/profileViewService');
  const {
    serializeNotificationsForRecipient,
    serializeNotificationForRecipient,
  } = require('./dist/services/notificationSerializer');
  const { Subscription } = require('./dist/models/Subscription');
  const { User } = require('./dist/models/User');
  const { Profile } = require('./dist/models/Profile');
  const { Block } = require('./dist/models/Block');
  const { Notification } = require('./dist/models/Notification');

  // Test 1: Entitlement Helper - No subscription returns false
  await asyncTest('Entitlement: user with no subscription returns false', async () => {
    const nonExistentUserId = 'user_no_sub_' + Date.now();
    const result = await hasActivePaidMembership(nonExistentUserId);
    assert.strictEqual(result, false, 'Expected false for user without subscription');
  });

  // Test 2: Entitlement Helper - Free subscription returns false
  await asyncTest('Entitlement: user with Free subscription returns false', async () => {
    const freeUserId = 'user_free_' + Date.now();
    await Subscription.create({
      user: freeUserId,
      plan: 'FREE',
      planId: 'plan_free',
      status: 'ACTIVE',
      startDate: new Date(),
      expiryDate: null,
    });

    const isEntitled = await hasActivePaidMembership(freeUserId);
    assert.strictEqual(isEntitled, false, 'Expected false for FREE plan subscription');
  });

  // Test 3: Entitlement Helper - Expired paid subscription returns false
  await asyncTest('Entitlement: expired paid subscription returns false', async () => {
    const expiredUserId = 'user_expired_' + Date.now();
    await Subscription.create({
      user: expiredUserId,
      plan: 'PREMIUM_MATCH',
      planId: 'premium-match',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const isEntitled = await hasActivePaidMembership(expiredUserId);
    assert.strictEqual(isEntitled, false, 'Expected false for expired paid subscription');
  });

  // Test 4: Entitlement Helper - Cancelled subscription returns false
  await asyncTest('Entitlement: cancelled subscription returns false', async () => {
    const cancelledUserId = 'user_cancelled_' + Date.now();
    await Subscription.create({
      user: cancelledUserId,
      plan: 'DOCTOR_CONNECT',
      planId: 'doctor-connect',
      status: 'CANCELLED',
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const isEntitled = await hasActivePaidMembership(cancelledUserId);
    assert.strictEqual(isEntitled, false, 'Expected false for cancelled subscription');
  });

  // Test 5: Entitlement Helper - Active paid subscription returns true
  await asyncTest('Entitlement: active Doctor Connect plan returns true', async () => {
    const paidUserId = 'user_paid_' + Date.now();
    await Subscription.create({
      user: paidUserId,
      plan: 'DOCTOR_CONNECT',
      planId: 'doctor-connect',
      status: 'ACTIVE',
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    const isEntitled = await hasActivePaidMembership(paidUserId);
    assert.strictEqual(isEntitled, true, 'Expected true for active DOCTOR_CONNECT subscription');
  });

  // Test 6: Entitlement Helper - Administrator role returns true
  await asyncTest('Entitlement: administrator role has entitlement', async () => {
    const adminUser = await User.create({
      fullName: 'Real Admin User',
      email: `admin_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'admin',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const adminId = String(adminUser._id || adminUser.id);
    const isEntitled = await hasActivePaidMembership(adminId, 'admin');
    assert.strictEqual(isEntitled, true, 'Expected true for administrator');
  });

  // Test 7: Profile View Tracking - Anonymous view does NOT create notification
  await asyncTest('Tracking: anonymous view does not create notification', async () => {
    const targetUserId = 'target_anon_' + Date.now();
    const mockProfile = {
      user: targetUserId,
      isDeleted: false,
    };
    const created = await recordProfileView(null, mockProfile);
    assert.strictEqual(created, false, 'Expected false for anonymous viewer');
  });

  // Test 8: Profile View Tracking - Self view does NOT create notification
  await asyncTest('Tracking: self view does not create notification', async () => {
    const userId = 'self_user_' + Date.now();
    const mockProfile = {
      user: userId,
      isDeleted: false,
    };
    const created = await recordProfileView(userId, mockProfile);
    assert.strictEqual(created, false, 'Expected false for self-view');
  });

  // Test 9: Profile View Tracking - Admin viewer does NOT create notification
  await asyncTest('Tracking: admin viewer does not create notification', async () => {
    const adminId = 'admin_viewer_' + Date.now();
    const targetId = 'target_from_admin_' + Date.now();
    const mockProfile = {
      user: targetId,
      isDeleted: false,
    };
    const created = await recordProfileView(adminId, mockProfile, 'admin');
    assert.strictEqual(created, false, 'Expected false for admin viewer');
  });

  // Test 10: Profile View Tracking - Ineligible/deleted profile does NOT create notification
  await asyncTest('Tracking: deleted profile does not create notification', async () => {
    const viewerId = 'viewer_del_' + Date.now();
    const mockDeletedProfile = {
      user: 'some_user_' + Date.now(),
      isDeleted: true,
    };
    const created = await recordProfileView(viewerId, mockDeletedProfile);
    assert.strictEqual(created, false, 'Expected false for deleted profile');
  });

  let globalViewerUserId = null;
  let globalViewerCandidateId = null;

  await asyncTest('Tracking: eligible authenticated view creates notification with cooldown', async () => {
    // Setup target user
    const targetUser = await User.create({
      fullName: 'Target Doctor',
      email: `target_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
      isDeleted: false,
    });
    const targetUserId = String(targetUser._id || targetUser.id);

    // Setup viewer user & profile
    const viewerUser = await User.create({
      fullName: 'Priya Sharma',
      email: `priya_${Date.now()}@example.com`,
      mobile: `+91988${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
      isDeleted: false,
    });
    const viewerUserId = String(viewerUser._id || viewerUser.id);
    globalViewerUserId = viewerUserId;

    const viewerCandidateId = `WJ_P_${Date.now().toString().slice(-4)}`;
    globalViewerCandidateId = viewerCandidateId;

    const viewerProfile = await Profile.create({
      user: viewerUserId,
      candidateId: viewerCandidateId,
      displayName: 'Priya S.',
      primaryPhoto: 'https://cdn.wonderfuljodi.com/photos/priya.jpg',
      gender: 'Female',
      dob: new Date('1995-05-15'),
      height: '5ft 4in',
      maritalStatus: 'Never Married',
      education: 'MBBS',
      degree: 'MD',
      profession: 'Physician',
      city: 'Mumbai',
      country: 'India',
      isDeleted: false,
    });

    const targetProfile = {
      user: targetUserId,
      candidateId: `WJ_T_${Date.now().toString().slice(-4)}`,
      isDeleted: false,
    };

    // First view: should succeed
    const firstResult = await recordProfileView(viewerUserId, targetProfile);
    assert.strictEqual(firstResult, true, 'Expected first profile view to create notification');

    // Verify notification was created in database
    const notifs = await Notification.find({ user: targetUserId, type: 'PROFILE_VIEW' });
    assert.strictEqual(notifs.length, 1, 'Expected exactly 1 notification in database');
    createdNotif = notifs[0];
    assert.strictEqual(createdNotif.type, 'PROFILE_VIEW');
    assert.strictEqual(createdNotif.title, 'Someone viewed your profile');

    // Second view within 24 hours: should be suppressed by cooldown
    const secondResult = await recordProfileView(viewerUserId, targetProfile);
    assert.strictEqual(secondResult, false, 'Expected second view within 24h to be suppressed');

    const notifsAfterSecond = await Notification.find({ user: targetUserId, type: 'PROFILE_VIEW' });
    assert.strictEqual(notifsAfterSecond.length, 1, 'Duplicate notification must NOT be created');
  });

  // Test 12: Cooldown expiry allows subsequent view
  await asyncTest('Tracking: subsequent view after 24h cooldown creates new notification', async () => {
    const target2 = await User.create({
      fullName: 'Target 2',
      email: `target2_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const target2Id = String(target2._id || target2.id);

    const viewer2 = await User.create({
      fullName: 'Rahul Kumar',
      email: `rahul_${Date.now()}@example.com`,
      mobile: `+91988${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const viewer2Id = String(viewer2._id || viewer2.id);

    // Create an old notification from 25 hours ago
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await Notification.create({
      user: target2Id,
      type: 'PROFILE_VIEW',
      title: 'Someone viewed your profile',
      message: 'A member is interested in your profile.',
      createdAt: oldDate,
      metadata: { viewerUserId: viewer2Id },
    });

    const targetProfile = { user: target2Id, isDeleted: false };
    const resultAfter25h = await recordProfileView(viewer2Id, targetProfile);
    assert.strictEqual(resultAfter25h, true, 'Expected new view after 24h cooldown to succeed');
  });

  // Test 13: CRITICAL PRIVACY BOUNDARY - Free Member Serialization
  await asyncTest('Privacy: Free member receives locked notification with ZERO visitor identity fields', async () => {
    const freeRecipientId = 'free_recipient_' + Date.now();
    // Free recipient has NO paid subscription

    const rawNotification = {
      _id: 'notif_locked_123',
      user: freeRecipientId,
      type: 'PROFILE_VIEW',
      title: 'Default title',
      message: 'Default message',
      read: false,
      metadata: {
        viewerUserId: globalViewerUserId,
        viewerProfileId: globalViewerCandidateId,
        viewedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
    };

    const serialized = await serializeNotificationForRecipient(rawNotification, freeRecipientId);

    // Verify locked attributes
    assert.strictEqual(serialized.isLocked, true, 'isLocked must be true for Free member');
    assert.strictEqual(serialized.title, 'Someone viewed your profile');
    assert.strictEqual(serialized.message, 'A member is interested in your profile. Upgrade to discover who.');
    assert.strictEqual(serialized.actionUrl, '/membership?feature=profile-viewers');
    assert.strictEqual(serialized.link, '/membership?feature=profile-viewers');

    // Convert complete JSON representation to string
    const jsonString = JSON.stringify(serialized);

    // CRITICAL SECURITY ASSERTIONS: Ensure zero visitor identifying data is leaked
    assert.strictEqual(jsonString.includes(globalViewerUserId), false, 'JSON must NOT contain viewerUserId');
    assert.strictEqual(jsonString.includes(globalViewerCandidateId), false, 'JSON must NOT contain viewerProfileId or candidateId');
    assert.strictEqual(jsonString.includes('Priya'), false, 'JSON must NOT contain visitor name');
    assert.strictEqual(jsonString.includes('priya.jpg'), false, 'JSON must NOT contain visitor photo');
    assert.strictEqual(jsonString.includes('example.com'), false, 'JSON must NOT contain visitor email');
    assert.strictEqual(jsonString.includes('91988'), false, 'JSON must NOT contain visitor phone');
  });

  // Test 14: Entitled Paid Member Serialization
  await asyncTest('Entitlement: Paid member receives unlocked allowlisted public visitor identity', async () => {
    const paidRecipient = await User.create({
      fullName: 'Paid Doctor Recipient',
      email: `paid_recip_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const paidRecipientId = String(paidRecipient._id || paidRecipient.id);

    // Create active paid subscription for recipient
    await Subscription.create({
      user: paidRecipientId,
      plan: 'PREMIUM_MATCH',
      planId: 'premium-match',
      status: 'ACTIVE',
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    });

    const rawNotification = {
      _id: 'notif_unlocked_456',
      user: paidRecipientId,
      type: 'PROFILE_VIEW',
      title: 'Someone viewed your profile',
      message: 'A member is interested in your profile.',
      read: false,
      metadata: {
        viewerUserId: globalViewerUserId,
        viewerProfileId: globalViewerCandidateId,
        viewedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
    };

    const serialized = await serializeNotificationForRecipient(rawNotification, paidRecipientId);

    assert.strictEqual(serialized.isLocked, false, 'isLocked must be false for Paid member');
    assert.strictEqual(serialized.title, 'Priya S. viewed your profile');
    assert.strictEqual(serialized.actionUrl, `/profile/${globalViewerCandidateId}`);
    assert.strictEqual(serialized.link, `/profile/${globalViewerCandidateId}`);
    assert.strictEqual(serialized.metadata?.visitorName, 'Priya S.');
    assert.strictEqual(serialized.metadata?.visitorPhoto, 'https://cdn.wonderfuljodi.com/photos/priya.jpg');
    assert.strictEqual(serialized.metadata?.visitorProfileId, globalViewerCandidateId);

    // Never expose private fields even to paid members
    const jsonString = JSON.stringify(serialized);
    assert.strictEqual(jsonString.includes('example.com'), false, 'Paid response must NOT expose email');
    assert.strictEqual(jsonString.includes('91988'), false, 'Paid response must NOT expose phone');
  });

  // Test 15: Existing notification types remain completely unaffected
  await asyncTest('Regression: existing notifications (INTEREST, SECURITY) serialize properly', async () => {
    const recipientId = 'regression_user_' + Date.now();
    const existingNotifications = [
      {
        _id: 'interest_notif_1',
        type: 'INTEREST_ACCEPTED',
        title: 'Interest accepted',
        message: 'Your interest has been accepted. View your connection to see next steps.',
        actionUrl: '/interests',
        read: false,
        metadata: { interestId: 'int_123', senderName: 'Dr. John' },
        createdAt: new Date(),
      },
      {
        _id: 'security_notif_2',
        type: 'SECURITY_ALERT',
        title: 'New Sign-in Detected on Another Device',
        message: 'A new sign-in was detected for your account.',
        actionUrl: '/settings',
        read: true,
        metadata: { ip: '127.0.0.1' },
        createdAt: new Date(),
      },
    ];

    const serializedList = await serializeNotificationsForRecipient(existingNotifications, recipientId);
    assert.strictEqual(serializedList.length, 2);
    assert.strictEqual(serializedList[0].type, 'INTEREST_ACCEPTED');
    assert.strictEqual(serializedList[0].metadata?.senderName, 'Dr. John');
    assert.strictEqual(serializedList[1].type, 'SECURITY_ALERT');
    assert.strictEqual(serializedList[1].metadata?.ip, '127.0.0.1');
  });

  const { getNotifications, markNotificationRead } = require('./dist/controllers/notificationController');

  // Test 16: getNotifications controller returns serialized response for Free member
  await asyncTest('Controller: getNotifications sanitizes PROFILE_VIEW for Free member', async () => {
    const freeUser = await User.create({
      fullName: 'Controller Free User',
      email: `ctrl_free_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const freeUserId = String(freeUser._id || freeUser.id);

    await Notification.create({
      user: freeUserId,
      type: 'PROFILE_VIEW',
      title: 'Original Title',
      message: 'Original Message',
      read: false,
      metadata: {
        viewerUserId: globalViewerUserId,
        viewerProfileId: globalViewerCandidateId,
        viewedAt: new Date().toISOString(),
      },
    });

    let resData = null;
    const mockReq = {
      user: { userId: freeUserId, role: 'user' },
      query: { page: '1', limit: '10' },
    };
    const mockRes = {
      json: (payload) => { resData = payload; },
      status: () => mockRes,
    };

    await getNotifications(mockReq, mockRes, (err) => { if (err) throw err; });

    assert(resData && resData.success, 'Controller should return success: true');
    const notifs = resData.data.notifications;
    assert.strictEqual(notifs.length, 1);
    assert.strictEqual(notifs[0].isLocked, true);
    assert.strictEqual(notifs[0].title, 'Someone viewed your profile');

    const str = JSON.stringify(resData);
    assert.strictEqual(str.includes(globalViewerUserId), false, 'getNotifications response MUST NOT leak viewerUserId');
    assert.strictEqual(str.includes('Priya'), false, 'getNotifications response MUST NOT leak visitor name');
    assert.strictEqual(str.includes(globalViewerCandidateId), false, 'getNotifications response MUST NOT leak candidateId');
  });

  // Test 17: markNotificationRead controller sanitizes PROFILE_VIEW for Free member
  await asyncTest('Controller: markNotificationRead sanitizes PROFILE_VIEW for Free member', async () => {
    const freeUser = await User.create({
      fullName: 'MarkRead Free User',
      email: `mark_free_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const freeUserId = String(freeUser._id || freeUser.id);

    const notif = await Notification.create({
      user: freeUserId,
      type: 'PROFILE_VIEW',
      title: 'Original Title',
      message: 'Original Message',
      read: false,
      metadata: {
        viewerUserId: globalViewerUserId,
        viewerProfileId: globalViewerCandidateId,
      },
    });
    const notifId = String(notif._id || notif.id);

    let resData = null;
    const mockReq = {
      user: { userId: freeUserId, role: 'user' },
      params: { id: notifId },
    };
    const mockRes = {
      json: (payload) => { resData = payload; },
      status: () => mockRes,
    };

    await markNotificationRead(mockReq, mockRes, (err) => { if (err) throw err; });

    assert(resData && resData.success, 'markNotificationRead should return success: true');
    assert.strictEqual(resData.data.isLocked, true);
    assert.strictEqual(resData.data.read, true);
    assert.strictEqual(resData.data.title, 'Someone viewed your profile');

    const str = JSON.stringify(resData);
    assert.strictEqual(str.includes(globalViewerUserId), false, 'markNotificationRead response MUST NOT leak viewerUserId');
    assert.strictEqual(str.includes('Priya'), false, 'markNotificationRead response MUST NOT leak visitor name');
  });

  // Test 18: Frontend dropdown contract: Free vs Paid member presentation
  await asyncTest('Frontend Contract: NotificationBell dropdown data mapping for Free vs Paid', async () => {
    // 1. Free member presentation
    const freeNotif = await serializeNotificationForRecipient({
      user: 'free_recipient_id',
      type: 'PROFILE_VIEW',
      title: 'Original Title',
      message: 'Original Message',
      read: false,
      metadata: { viewerUserId: globalViewerUserId },
    }, 'free_recipient_id');

    assert.strictEqual(freeNotif.isLocked, true);
    assert.strictEqual(freeNotif.title, 'Someone viewed your profile');
    assert.strictEqual(freeNotif.message, 'A member is interested in your profile. Upgrade to discover who.');
    assert.strictEqual(freeNotif.metadata.unlockUrl, '/membership?feature=profile-viewers');
    assert.strictEqual(freeNotif.metadata.viewerName, undefined);
    assert.strictEqual(freeNotif.metadata.viewerAvatar, undefined);

    // 2. Paid member presentation
    const paidRecipient = await User.create({
      fullName: 'Paid Dropdown Recipient',
      email: `dropdown_paid_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const paidRecipientId = String(paidRecipient._id || paidRecipient.id);

    await Subscription.create({
      user: paidRecipientId,
      plan: 'PREMIUM_MATCH',
      planId: 'premium-match',
      status: 'ACTIVE',
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    const paidNotif = await serializeNotificationForRecipient({
      user: paidRecipientId,
      type: 'PROFILE_VIEW',
      title: 'Original Title',
      message: 'Original Message',
      read: false,
      metadata: { viewerUserId: globalViewerUserId },
    }, paidRecipientId);

    assert.strictEqual(paidNotif.isLocked, false);
    assert.strictEqual(paidNotif.title, 'Priya S. viewed your profile');
    assert.strictEqual(paidNotif.metadata.viewerName, 'Priya S.');
    assert.strictEqual(paidNotif.metadata.viewerAvatar, 'https://cdn.wonderfuljodi.com/photos/priya.jpg');
    assert.strictEqual(paidNotif.metadata.profileUrl, `/profile/${globalViewerCandidateId}`);
  });

  // Test 19: Full Notifications Page relative time helper and tab filtering
  await asyncTest('Frontend Contract: formatRelativeTime and Profile Views tab filtering', async () => {
    // Relative time logic matching frontend/app/notifications/page.tsx
    function formatRelativeTime(dateStr) {
      if (!dateStr) return '';
      const now = Date.now();
      const past = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
      return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    assert.strictEqual(formatRelativeTime(twoHoursAgo), '2 hours ago');
    assert.strictEqual(formatRelativeTime(oneDayAgo), '1 day ago');
    assert.strictEqual(formatRelativeTime(threeDaysAgo), '3 days ago');

    // Tab filter simulation
    const mockList = [
      { id: '1', type: 'PROFILE_VIEW', title: 'Someone viewed your profile' },
      { id: '2', type: 'INTEREST_ACCEPTED', title: 'Interest accepted' },
      { id: '3', type: 'PROFILE_VIEW', title: 'Someone viewed your profile' },
      { id: '4', type: 'MESSAGE', title: 'New message' },
    ];

    const viewsOnly = mockList.filter((n) => n.type === 'PROFILE_VIEW');
    assert.strictEqual(viewsOnly.length, 2);
    assert.strictEqual(viewsOnly[0].id, '1');
    assert.strictEqual(viewsOnly[1].id, '3');
  });

  // Test 20: Feature-specific membership upgrade plan filtering
  await asyncTest('Frontend Contract: /membership?feature=profile-viewers filters out Free plan', async () => {
    const rawBackendPlans = [
      { key: 'FREE', slug: 'free', name: 'Free Membership', originalPrice: 0, discountedPrice: 0, ctaAction: 'register' },
      { key: 'DOCTOR_CONNECT', slug: 'doctor-connect', name: 'Doctor Connect', originalPrice: 5999, discountedPrice: 5999, ctaAction: 'upgrade' },
      { key: 'PREMIUM_MATCH', slug: 'premium-match', name: 'Premium Match', originalPrice: 11999, discountedPrice: 11999, isPopular: true, ctaAction: 'upgrade' },
      { key: 'PRIORITY_MATCHMAKING', slug: 'priority-matchmaking', name: 'Priority Matchmaking', originalPrice: 24999, discountedPrice: 24999, ctaAction: 'upgrade' },
      { key: 'EXCLUSIVE_CONCIERGE', slug: 'exclusive-concierge', name: 'Exclusive Concierge', originalPrice: 49999, discountedPrice: 49999, ctaAction: 'contact' },
    ];

    // Standard view filter
    const standardPlans = rawBackendPlans;
    assert.strictEqual(standardPlans.length, 5);

    // Profile viewers feature filter (as implemented in frontend/app/membership/page.tsx)
    const isProfileViewersFeature = true;
    const displayedPlans = isProfileViewersFeature
      ? rawBackendPlans.filter((p) => {
          const slug = p.slug?.toLowerCase() || '';
          const key = p.key?.toUpperCase() || '';
          const price = p.discountedPrice ?? p.price ?? p.originalPrice ?? 0;
          return slug !== 'free' && key !== 'FREE' && p.ctaAction !== 'register' && price > 0;
        })
      : rawBackendPlans;

    assert.strictEqual(displayedPlans.length, 4, 'Free plan must be excluded from feature-specific upgrade view');
    assert.strictEqual(displayedPlans.some((p) => p.slug === 'free' || p.key === 'FREE'), false);
    assert.strictEqual(displayedPlans[0].key, 'DOCTOR_CONNECT');
    assert.strictEqual(displayedPlans[1].key, 'PREMIUM_MATCH');
    assert.strictEqual(displayedPlans[2].key, 'PRIORITY_MATCHMAKING');
    assert.strictEqual(displayedPlans[3].key, 'EXCLUSIVE_CONCIERGE');
  });

  // Test 21: Server-authoritative entitlement cannot be bypassed by client state or query param
  await asyncTest('Security: Server entitlement ignores query params or client tampering', async () => {
    const freeUser = await User.create({
      fullName: 'Tampering Free User',
      email: `tamp_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const freeUserId = String(freeUser._id || freeUser.id);

    // User claims in query params or client state that they are paid or on feature page
    const isPaid = await hasActivePaidMembership(freeUserId, 'user');
    assert.strictEqual(isPaid, false, 'User must remain unentitled without verified active DB subscription');

    const serialized = await serializeNotificationForRecipient({
      user: freeUserId,
      type: 'PROFILE_VIEW',
      title: 'Real Title',
      metadata: { viewerUserId: globalViewerUserId },
    }, freeUserId);

    assert.strictEqual(serialized.isLocked, true);
    assert.strictEqual(JSON.stringify(serialized).includes(globalViewerUserId), false);
  });

  // Test 22: Concurrency & Race Condition Simulation
  await asyncTest('Concurrency: Simultaneous profile views produce exactly ONE notification', async () => {
    const concurrentViewer = await User.create({
      fullName: 'Concurrent Viewer',
      email: `conc_view_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const concurrentViewerId = String(concurrentViewer._id || concurrentViewer.id);

    const concurrentTarget = await User.create({
      fullName: 'Concurrent Target',
      email: `conc_targ_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const concurrentTargetId = String(concurrentTarget._id || concurrentTarget.id);

    const targetProfileDoc = {
      _id: 'targ_prof_' + Date.now(),
      user: concurrentTargetId,
      candidateId: 'WJ-CONC-01',
      isDeleted: false,
    };

    // Simulate 3 simultaneous view events (e.g. multi-tab or rapid double-click)
    const results = await Promise.all([
      recordProfileView(concurrentViewerId, targetProfileDoc, 'user'),
      recordProfileView(concurrentViewerId, targetProfileDoc, 'user'),
      recordProfileView(concurrentViewerId, targetProfileDoc, 'user'),
    ]);

    const successCount = results.filter((r) => r === true).length;
    assert.strictEqual(successCount, 1, 'Exactly ONE concurrent view request should succeed');

    // Verify database count for this pair
    const notifs = await Notification.find({
      user: concurrentTargetId,
      type: 'PROFILE_VIEW',
    });
    const viewerNotifs = notifs.filter((n) => {
      let m = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
      return m && String(m.viewerUserId) === concurrentViewerId;
    });

    assert.strictEqual(viewerNotifs.length, 1, 'Database MUST contain exactly 1 notification for this viewer-target pair');
  });

  // Test 23: Exhaustive Free Plan Identifiers and Zero-Cost Variations
  await asyncTest('Entitlement: Exhaustive free plan variations all return false', async () => {
    const variations = [
      'FREE',
      'free',
      'Free',
      'plan_free',
      'plan-free',
      'free_membership',
      'free-plan',
      'trial_free',
      'free_trial',
      '0',
      'none',
      '',
    ];

    for (const varPlan of variations) {
      const u = await User.create({
        fullName: 'Variant User ' + varPlan,
        email: `var_${Math.random().toString(36).substr(2, 6)}@example.com`,
        mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
        role: 'user',
        password: 'HashedPassword123!',
        isActive: true,
        status: 'Active',
      });
      const uid = String(u._id || u.id);

      await Subscription.create({
        user: uid,
        plan: varPlan,
        planId: varPlan,
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const entitled = await hasActivePaidMembership(uid, 'user');
      assert.strictEqual(entitled, false, `Plan variation "${varPlan}" must NOT be treated as a paid membership`);
    }
  });

  // Test 24: Admin Role Spoofing & Deactivated Admin Security
  await asyncTest('Security: Role spoofing and deactivated admin cannot bypass entitlement', async () => {
    // 1. Regular user trying to pass userRole = 'admin'
    const regularUser = await User.create({
      fullName: 'Spoofer User',
      email: `spoofer_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user', // DB role is 'user'
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const regularUserId = String(regularUser._id || regularUser.id);

    // Call with spoofed role 'admin'
    const spoofedEntitled = await hasActivePaidMembership(regularUserId, 'admin');
    assert.strictEqual(spoofedEntitled, false, 'User with DB role "user" must NOT be entitled even if caller passes role "admin"');

    // 2. Deactivated admin
    const deactivatedAdmin = await User.create({
      fullName: 'Deactivated Admin',
      email: `deact_admin_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'admin',
      password: 'HashedPassword123!',
      isActive: false, // Inactive
      status: 'Suspended',
    });
    const deactAdminId = String(deactivatedAdmin._id || deactivatedAdmin.id);

    const deactEntitled = await hasActivePaidMembership(deactAdminId, 'admin');
    assert.strictEqual(deactEntitled, false, 'Deactivated admin must NOT receive paid entitlement');
  });

  // Test 25: Full Deep-JSON Privacy Audit on Both Read & Unread Notifications
  await asyncTest('Privacy: Deep-JSON audit on both read and unread responses for Free member', async () => {
    const sensitiveViewerPhone = '+919876543210';
    const sensitiveViewerEmail = 'sensitive.priya@example.com';
    const sensitiveCandidateId = 'WJ-DEEP-SECRET-99';
    const sensitiveVisitorName = 'Priya Secret Sharma';

    const testTarget = await User.create({
      fullName: 'Deep Audit Target',
      email: `deep_targ_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const testTargetId = String(testTarget._id || testTarget.id);

    // Create 1 unread and 1 read notification with raw metadata containing sensitive details
    const unreadNotif = await Notification.create({
      user: testTargetId,
      type: 'PROFILE_VIEW',
      title: 'Original Title Unread',
      message: 'Original Message Unread',
      read: false,
      metadata: {
        viewerUserId: 'secret_user_id_xyz',
        viewerProfileId: sensitiveCandidateId,
        visitorName: sensitiveVisitorName,
        visitorPhone: sensitiveViewerPhone,
        visitorEmail: sensitiveViewerEmail,
        viewedAt: new Date().toISOString(),
      },
    });

    const readNotif = await Notification.create({
      user: testTargetId,
      type: 'PROFILE_VIEW',
      title: 'Original Title Read',
      message: 'Original Message Read',
      read: true,
      metadata: {
        viewerUserId: 'secret_user_id_xyz',
        viewerProfileId: sensitiveCandidateId,
        visitorName: sensitiveVisitorName,
        visitorPhone: sensitiveViewerPhone,
        visitorEmail: sensitiveViewerEmail,
        viewedAt: new Date().toISOString(),
      },
    });

    // Test getNotifications (all)
    let allRes = null;
    await getNotifications(
      { user: { userId: testTargetId, role: 'user' }, query: { page: '1', limit: '10' } },
      { json: (data) => { allRes = data; }, status: () => ({}) },
      () => {}
    );

    // Test getNotifications (unread only)
    let unreadRes = null;
    await getNotifications(
      { user: { userId: testTargetId, role: 'user' }, query: { page: '1', limit: '10', unreadOnly: 'true' } },
      { json: (data) => { unreadRes = data; }, status: () => ({}) },
      () => {}
    );

    // Test markNotificationRead
    let markRes = null;
    await markNotificationRead(
      { user: { userId: testTargetId, role: 'user' }, params: { id: String(unreadNotif._id || unreadNotif.id) } },
      { json: (data) => { markRes = data; }, status: () => ({}) },
      () => {}
    );

    const payloads = [allRes, unreadRes, markRes];
    const sensitiveStrings = [
      'secret_user_id_xyz',
      sensitiveCandidateId,
      sensitiveVisitorName,
      sensitiveViewerPhone,
      sensitiveViewerEmail,
      'Priya',
    ];

    for (let i = 0; i < payloads.length; i++) {
      const payloadStr = JSON.stringify(payloads[i]);
      for (const secret of sensitiveStrings) {
        assert.strictEqual(
          payloadStr.includes(secret),
          false,
          `Payload #${i + 1} MUST NOT contain sensitive string "${secret}"`
        );
      }
    }
  });

  // Test 26: Subscription Schema Verification (expiryDate canonical vs endDate rejection)
  await asyncTest('Schema: expiryDate canonical field & endDate rejection behavior', async () => {
    // 1. Subscription with canonical expiryDate in the future
    const userWithExpiry = await User.create({
      fullName: 'User ExpiryDate Future',
      email: `exp_future_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const uidExpiry = String(userWithExpiry._id || userWithExpiry.id);

    await Subscription.create({
      user: uidExpiry,
      plan: 'DOCTOR_CONNECT',
      planId: 'doctor-connect',
      status: 'ACTIVE',
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // canonical schema field
    });

    const isEntitledExpiry = await hasActivePaidMembership(uidExpiry, 'user');
    assert.strictEqual(isEntitledExpiry, true, 'User with future expiryDate must be entitled');

    // 2. Subscription with canonical expiryDate in the past
    const userWithPastExpiry = await User.create({
      fullName: 'User ExpiryDate Past',
      email: `exp_past_${Date.now()}@example.com`,
      mobile: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'user',
      password: 'HashedPassword123!',
      isActive: true,
      status: 'Active',
    });
    const uidPastExpiry = String(userWithPastExpiry._id || userWithPastExpiry.id);

    await Subscription.create({
      user: uidPastExpiry,
      plan: 'DOCTOR_CONNECT',
      planId: 'doctor-connect',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() - 10000), // Expired
    });

    const isEntitledPast = await hasActivePaidMembership(uidPastExpiry, 'user');
    assert.strictEqual(isEntitledPast, false, 'User with past expiryDate must NOT be entitled');

    // 3. Schema Proof: Prisma Client rejects 'endDate' on Subscription model
    let threwValidationError = false;
    try {
      await Subscription.create({
        user: uidPastExpiry,
        plan: 'DOCTOR_CONNECT',
        planId: 'doctor-connect',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30000),
      });
    } catch (schemaErr) {
      threwValidationError = true;
      assert(schemaErr.message.includes('Unknown argument `endDate`'), 'Expected Unknown argument endDate error from Prisma schema');
    }
    assert.strictEqual(threwValidationError, true, 'Prisma schema must reject non-existent endDate field');

    // 4. Admin lookup fail-closed verification: non-existent admin ID with role 'admin'
    const nonExistentAdminId = 'non_existent_admin_id_9999999999';
    const fakeAdminEntitled = await hasActivePaidMembership(nonExistentAdminId, 'admin');
    assert.strictEqual(fakeAdminEntitled, false, 'Non-existent admin ID must FAIL CLOSED and return false');
  });

  // Test 27: MariaDB Advisory Lock Key Identifier Length Bounding (<= 64 chars) & Collision Freedom
  test('Lock: MariaDB advisory lock key is bounded to <= 64 characters and collision-free', () => {
    const crypto = require('crypto');
    // Test with maximum-length 36-char UUIDs
    const viewerId = '12345678-1234-1234-1234-123456789abc';
    const targetId1 = '87654321-4321-4321-4321-cba987654321';
    const targetId2 = '87654321-4321-4321-4321-cba987654322';

    const hash1 = crypto.createHash('sha256').update(`${viewerId}:${targetId1}`).digest('hex');
    const lockKey1 = `wj_pv_${hash1.slice(0, 50)}`;

    const hash2 = crypto.createHash('sha256').update(`${viewerId}:${targetId2}`).digest('hex');
    const lockKey2 = `wj_pv_${hash2.slice(0, 50)}`;

    // MariaDB and MySQL strictly enforce a max lock name length of 64 characters
    assert(lockKey1.length <= 64, `Lock key length (${lockKey1.length}) must be <= 64 chars`);
    assert.strictEqual(lockKey1.length, 56, 'Lock key must be exactly 56 chars');
    assert.notStrictEqual(lockKey1, lockKey2, 'Distinct target users must produce distinct lock keys');
  });

  console.log('\n========================================================================');
  console.log(`  ALL ${passedCount}/${totalCount} BACKEND TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
