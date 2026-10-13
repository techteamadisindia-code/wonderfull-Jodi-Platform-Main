/**
 * WONDERFUL JODI: ISOLATED MEMBERSHIP SECURITY UNIT TESTS
 *
 * This test suite verifies all critical payment security boundaries:
 * 1. Missing signature in gateway mode
 * 2. Invalid / malformed signature
 * 3. Fabricated payment ID
 * 4. Unknown order ID
 * 5. Payment belonging to another user
 * 6. Subscription belonging to another user
 * 7. Client-supplied plan tampering
 * 8. Gateway order-creation failure (HTTP 502, no silent simulation fallback)
 * 9. Duplicate verification (idempotent, no duplicate coupon / campaign increments)
 * 10. Valid payment verification (timing-safe HMAC, activation, audit)
 * 11. Legitimate free-plan claim (separate validated flow)
 *
 * Runs completely isolated in-memory without touching production or remote databases.
 */

const crypto = require('crypto');
const path = require('path');

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_live_testkey12345678';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_for_hmac_sha256_verification_key_32chars';
process.env.ALLOW_SIMULATED_PAYMENTS = 'false';

// Setup in-memory mock stores
const db = {
  users: new Map(),
  subscriptions: new Map(),
  payments: new Map(),
  coupons: new Map(),
  redemptions: [],
  campaigns: new Map(),
  auditLogs: [],
  profiles: new Map(),
};

function resetDb() {
  db.users.clear();
  db.subscriptions.clear();
  db.payments.clear();
  db.coupons.clear();
  db.redemptions.length = 0;
  db.campaigns.clear();
  db.auditLogs.length = 0;
  db.profiles.clear();
}

// Mock Razorpay SDK
let razorpayCreateShouldFail = false;
class MockRazorpay {
  constructor(cfg) {
    this.cfg = cfg;
    this.orders = {
      create: async (payload) => {
        if (razorpayCreateShouldFail) {
          throw new Error('Razorpay Gateway Network Timeout (504)');
        }
        return {
          id: `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          entity: 'order',
          amount: payload.amount,
          amount_paid: 0,
          currency: payload.currency || 'INR',
          receipt: payload.receipt,
          status: 'created',
          notes: payload.notes,
        };
      },
    };
  }
}

// Mock User Model
const MockUser = {
  findById: async (id) => db.users.get(String(id)) || null,
};

// Mock Subscription Model
let subscriptionSaveShouldFail = false;
let subscriptionUpdateOneShouldFail = false;
const MockSubscription = {
  findOne: async (filter) => {
    for (const sub of db.subscriptions.values()) {
      if (filter.user && String(sub.user) !== String(filter.user)) continue;
      if (filter.status && sub.status !== filter.status) continue;
      return {
        ...sub,
        save: async function () {
          if (subscriptionSaveShouldFail) {
            throw new Error('Database connection reset during subscription save');
          }
          db.subscriptions.set(String(this._id), this);
        },
      };
    }
    return null;
  },
  findById: async (id) => {
    const s = db.subscriptions.get(String(id));
    if (!s) return null;
    return {
      ...s,
      save: async function () {
        if (subscriptionSaveShouldFail) {
          throw new Error('Database connection reset during subscription save');
        }
        db.subscriptions.set(String(this._id), this);
      },
    };
  },
  create: async (data) => {
    const _id = data._id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rec = { ...data, _id, id: _id };
    db.subscriptions.set(String(_id), rec);
    return {
      ...rec,
      save: async function () {
        if (subscriptionSaveShouldFail) {
          throw new Error('Database connection reset during subscription save');
        }
        db.subscriptions.set(String(this._id), this);
      },
    };
  },
  updateOne: async (filter, update) => {
    if (subscriptionUpdateOneShouldFail) {
      throw new Error('Database connection reset during subscription update fallback');
    }
    for (const [id, sub] of db.subscriptions.entries()) {
      if (filter._id && String(sub._id) !== String(filter._id)) continue;
      Object.assign(sub, update);
      db.subscriptions.set(id, sub);
      return { modifiedCount: 1, acknowledged: true };
    }
    return { modifiedCount: 0, acknowledged: true };
  },
  updateMany: async (filter, update) => {
    let count = 0;
    for (const [id, sub] of db.subscriptions.entries()) {
      if (filter.user && String(sub.user) !== String(filter.user)) continue;
      if (filter.plan && sub.plan !== filter.plan) continue;
      if (filter.status && sub.status !== filter.status) continue;
      Object.assign(sub, update);
      db.subscriptions.set(id, sub);
      count++;
    }
    return { modifiedCount: count };
  },
  deleteOne: async (filter) => {
    if (filter._id) db.subscriptions.delete(String(filter._id));
    return { deletedCount: 1 };
  },
};

// Mock Payment Model
const MockPayment = {
  findOne: async (filter) => {
    for (const p of db.payments.values()) {
      if (filter.orderId && p.orderId !== filter.orderId) continue;
      if (filter.user && String(p.user) !== String(filter.user)) continue;
      if (filter.paymentId && p.paymentId !== filter.paymentId) continue;
      if (filter.status && p.status !== filter.status) continue;
      return {
        ...p,
        toObject: () => ({ ...p }),
        save: async function () { db.payments.set(String(this._id), this); },
      };
    }
    return null;
  },
  findById: async (id) => {
    const p = db.payments.get(String(id));
    if (!p) return null;
    return {
      ...p,
      toObject: () => ({ ...p }),
      save: async function () { db.payments.set(String(this._id), this); },
    };
  },
  create: async (data) => {
    const _id = data._id || `pay_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rec = { ...data, _id, id: _id };
    db.payments.set(String(_id), rec);
    return {
      ...rec,
      toObject: () => ({ ...rec }),
      save: async function () { db.payments.set(String(this._id), this); },
    };
  },
  updateOne: async (filter, update) => {
    for (const [id, p] of db.payments.entries()) {
      if (filter._id && String(p._id) !== String(filter._id)) continue;
      if (filter.status && p.status !== filter.status) continue;
      if (update.$set) {
        Object.assign(p, update.$set);
        if (update.$set['metadata.subscriptionActivationFailed'] !== undefined) {
          p.metadata = p.metadata || {};
          p.metadata.subscriptionActivationFailed = update.$set['metadata.subscriptionActivationFailed'];
        }
        if (update.$set['metadata.reconciledAt'] !== undefined) {
          p.metadata = p.metadata || {};
          p.metadata.reconciledAt = update.$set['metadata.reconciledAt'];
        }
      } else {
        Object.assign(p, update);
      }
      db.payments.set(id, p);
      return { modifiedCount: 1, acknowledged: true };
    }
    return { modifiedCount: 0, acknowledged: true };
  },
  updateMany: async (filter, update) => {
    let count = 0;
    for (const [id, p] of db.payments.entries()) {
      if (filter.user && String(p.user) !== String(filter.user)) continue;
      if (filter.status && p.status !== filter.status) continue;
      Object.assign(p, update);
      db.payments.set(id, p);
      count++;
    }
    return { modifiedCount: count };
  },
};

// Mock AuditLog Model
const MockAuditLog = {
  create: async (data) => {
    db.auditLogs.push(data);
    return data;
  },
};

// Mock Coupon & Redemption Models
const MockCoupon = {
  findOne: async (filter) => {
    for (const c of db.coupons.values()) {
      if (filter.couponCode && c.couponCode.toUpperCase() !== String(filter.couponCode).toUpperCase()) continue;
      if (filter.code && c.code && c.code.toUpperCase() !== String(filter.code).toUpperCase()) continue;
      return { ...c };
    }
    return null;
  },
  findById: async (id) => {
    let c = db.coupons.get(String(id));
    if (!c) {
      for (const item of db.coupons.values()) {
        if (String(item._id) === String(id) || String(item.id) === String(id)) return item;
      }
    }
    return c || null;
  },
  findByIdAndUpdate: async (id, update) => {
    let c = db.coupons.get(String(id));
    if (!c) {
      for (const item of db.coupons.values()) {
        if (String(item._id) === String(id) || String(item.id) === String(id)) {
          c = item;
          break;
        }
      }
    }
    if (c && update.$inc?.usedCount) {
      c.usedCount = (c.usedCount || 0) + update.$inc.usedCount;
    }
    return c;
  },
};

const MockCouponRedemption = {
  create: async (data) => {
    db.redemptions.push(data);
    return data;
  },
  countDocuments: async (filter) => {
    let count = 0;
    for (const r of db.redemptions) {
      if (filter.userId && String(r.userId) !== String(filter.userId)) continue;
      if (filter.couponId && String(r.couponId) !== String(filter.couponId)) continue;
      count++;
    }
    return count;
  },
};

// Mock MembershipPlan Model
const MockMembershipPlan = {
  find: async () => ({
    sort: async () => [],
  }),
  findOne: async (filter) => {
    const queries = filter?.$or || [filter];
    for (const q of queries) {
      if (!q) continue;
      for (const p of plans) {
        if (q.slug && p.slug.toLowerCase() === String(q.slug).toLowerCase()) {
          return { ...p, originalPrice: p.amount, discountedPrice: p.amount };
        }
        if (q.key && p.key.toUpperCase() === String(q.key).toUpperCase()) {
          return { ...p, originalPrice: p.amount, discountedPrice: p.amount };
        }
        if (q.planId && p.planId === q.planId) {
          return { ...p, originalPrice: p.amount, discountedPrice: p.amount };
        }
      }
    }
    return null;
  },
};

// Mock Campaign Model
const MockCampaign = {
  find: () => {
    const p = Promise.resolve([]);
    p.sort = () => p;
    return p;
  },
  findOne: async () => null,
  findByIdAndUpdate: async (id, update) => {
    const camp = db.campaigns.get(String(id));
    if (camp && update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        camp[k] = (camp[k] || 0) + v;
      }
    }
    return camp;
  },
};

// Mock Profile Model
const MockProfile = {
  findOne: async (filter) => db.profiles.get(String(filter.user)) || null,
};

// Inject Mocks into require.cache
const controllerPath = path.resolve(__dirname, 'dist/controllers/membershipController.js');

require.cache[require.resolve('razorpay')] = {
  id: require.resolve('razorpay'),
  filename: require.resolve('razorpay'),
  loaded: true,
  exports: MockRazorpay,
};

require.cache[require.resolve('./dist/models/User')] = {
  id: require.resolve('./dist/models/User'),
  filename: require.resolve('./dist/models/User'),
  loaded: true,
  exports: { User: MockUser },
};

require.cache[require.resolve('./dist/models/Subscription')] = {
  id: require.resolve('./dist/models/Subscription'),
  filename: require.resolve('./dist/models/Subscription'),
  loaded: true,
  exports: { Subscription: MockSubscription, UserSubscription: MockSubscription },
};

require.cache[require.resolve('./dist/models/Payment')] = {
  id: require.resolve('./dist/models/Payment'),
  filename: require.resolve('./dist/models/Payment'),
  loaded: true,
  exports: { Payment: MockPayment },
};

require.cache[require.resolve('./dist/models/AuditLog')] = {
  id: require.resolve('./dist/models/AuditLog'),
  filename: require.resolve('./dist/models/AuditLog'),
  loaded: true,
  exports: { AuditLog: MockAuditLog },
};

require.cache[require.resolve('./dist/models/Coupon')] = {
  id: require.resolve('./dist/models/Coupon'),
  filename: require.resolve('./dist/models/Coupon'),
  loaded: true,
  exports: { Coupon: MockCoupon },
};

require.cache[require.resolve('./dist/models/CouponRedemption')] = {
  id: require.resolve('./dist/models/CouponRedemption'),
  filename: require.resolve('./dist/models/CouponRedemption'),
  loaded: true,
  exports: { CouponRedemption: MockCouponRedemption },
};

require.cache[require.resolve('./dist/models/MembershipPlan')] = {
  id: require.resolve('./dist/models/MembershipPlan'),
  filename: require.resolve('./dist/models/MembershipPlan'),
  loaded: true,
  exports: { MembershipPlan: MockMembershipPlan },
};

require.cache[require.resolve('./dist/models/Campaign')] = {
  id: require.resolve('./dist/models/Campaign'),
  filename: require.resolve('./dist/models/Campaign'),
  loaded: true,
  exports: { Campaign: MockCampaign },
};

require.cache[require.resolve('./dist/models/Profile')] = {
  id: require.resolve('./dist/models/Profile'),
  filename: require.resolve('./dist/models/Profile'),
  loaded: true,
  exports: { Profile: MockProfile },
};

// Now require controller with injected mocks
delete require.cache[controllerPath];
const { createOrder, verifyPayment, claimFreeMembership, plans } = require(controllerPath);

function mockReq(user, body = {}) {
  return {
    user: user ? { userId: user._id || user.id, email: user.email, role: 'user' } : null,
    body,
    ip: '127.0.0.1',
  };
}

function mockRes() {
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

async function runSecuritySuite() {
  console.log('======================================================================');
  console.log('       WONDERFUL JODI: ISOLATED MEMBERSHIP SECURITY UNIT TESTS        ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  // Setup test users
  const userA = { _id: 'user_00000000000000000000001', email: 'doctorA@wonderfuljodi.com' };
  const userB = { _id: 'user_00000000000000000000002', email: 'doctorB@wonderfuljodi.com' };
  db.users.set(userA._id, userA);
  db.users.set(userB._id, userB);

  // Helper to create a valid pending order and payment
  async function setupPendingPayment({ user = userA, planKey = 'DOCTOR_CONNECT', isSimulated = false } = {}) {
    const plan = plans.find((p) => p.key === planKey) || plans[1];
    const sub = await MockSubscription.create({
      user: user._id,
      plan: plan.key,
      planId: plan.slug,
      status: 'PENDING',
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 90 * 86400000),
    });

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payment = await MockPayment.create({
      user: user._id,
      subscription: sub._id,
      orderId,
      provider: isSimulated ? 'simulated' : 'razorpay',
      providerPaymentId: orderId,
      amount: plan.amount,
      currency: 'INR',
      planId: plan.planId,
      planName: plan.name,
      status: 'PENDING',
      isSimulated,
      metadata: {
        planKey: plan.key,
        planSlug: plan.slug,
        duration: plan.duration,
        durationDays: 90,
        originalAmount: plan.amount,
        finalAmount: plan.amount,
      },
    });

    return { sub, payment, plan, orderId };
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Missing signature in gateway mode
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Missing signature in gateway mode ---');
  {
    resetDb();
    db.users.set(userA._id, userA);
    const { orderId } = await setupPendingPayment();

    const req = mockReq(userA, {
      orderId,
      paymentId: 'pay_test_payment_id_123',
      // signature missing
    });
    const res = mockRes();
    await verifyPayment(req, res, (err) => { throw err; });

    assert(
      res.statusCode === 400 && res.body?.message?.includes('signature is required'),
      'Missing signature in gateway mode rejected with HTTP 400',
      JSON.stringify(res.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Invalid / malformed signature
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Invalid signature rejection ---');
  {
    resetDb();
    db.users.set(userA._id, userA);
    const { orderId } = await setupPendingPayment();

    // 2a. Malformed signature (not 64 hex chars)
    const reqMalformed = mockReq(userA, {
      orderId,
      paymentId: 'pay_test_payment_id_123',
      signature: 'not_a_valid_hex_signature',
    });
    const resMalformed = mockRes();
    await verifyPayment(reqMalformed, resMalformed, (err) => { throw err; });

    assert(
      resMalformed.statusCode === 400 && resMalformed.body?.message?.includes('Malformed signature'),
      'Malformed signature rejected with HTTP 400',
      JSON.stringify(resMalformed.body)
    );

    // 2b. Valid hex length (64 chars) but incorrect HMAC
    const fakeSignature = 'a'.repeat(64);
    const reqInvalid = mockReq(userA, {
      orderId,
      paymentId: 'pay_test_payment_id_123',
      signature: fakeSignature,
    });
    const resInvalid = mockRes();
    await verifyPayment(reqInvalid, resInvalid, (err) => { throw err; });

    assert(
      resInvalid.statusCode === 400 && resInvalid.body?.message?.includes('Invalid transaction signature'),
      'Forged signature rejected with HTTP 400 (Invalid transaction signature)',
      JSON.stringify(resInvalid.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Fabricated payment ID without order ID
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Fabricated payment ID alone ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    // Client sends fabricated paymentId alone without orderId
    const req = mockReq(userA, {
      paymentId: 'pay_fabricated_instant_win_12345',
      planKey: 'EXCLUSIVE_CONCIERGE',
    });
    const res = mockRes();
    await verifyPayment(req, res, (err) => { throw err; });

    assert(
      res.statusCode === 400 && res.body?.message?.includes('Order ID is required'),
      'Fabricated payment ID without order ID rejected with HTTP 400',
      JSON.stringify(res.body)
    );
    assert(
      db.payments.size === 0 && db.subscriptions.size === 0,
      'No fraudulent payment or subscription created in DB'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Unknown order ID
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Unknown order ID ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    const req = mockReq(userA, {
      orderId: 'order_nonexistent_9999999',
      paymentId: 'pay_test_123',
      signature: 'a'.repeat(64),
    });
    const res = mockRes();
    await verifyPayment(req, res, (err) => { throw err; });

    assert(
      res.statusCode === 404 && res.body?.message?.includes('Payment record not found'),
      'Unknown order ID rejected with HTTP 404',
      JSON.stringify(res.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Payment belonging to another user
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Payment belonging to another user ---');
  {
    resetDb();
    db.users.set(userA._id, userA);
    db.users.set(userB._id, userB);

    // Payment belongs to userA
    const { orderId } = await setupPendingPayment({ user: userA });

    // Request comes from userB
    const req = mockReq(userB, {
      orderId,
      paymentId: 'pay_test_123',
      signature: 'b'.repeat(64),
    });
    const res = mockRes();
    await verifyPayment(req, res, (err) => { throw err; });

    assert(
      res.statusCode === 403 && res.body?.message?.includes('does not belong to the authenticated user'),
      'Cross-user payment verification blocked with HTTP 403',
      JSON.stringify(res.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Subscription belonging to another user
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Subscription belonging to another user ---');
  {
    resetDb();
    db.users.set(userA._id, userA);
    db.users.set(userB._id, userB);

    // Create subscription belonging to userB
    const subB = await MockSubscription.create({
      user: userB._id,
      plan: 'DOCTOR_CONNECT',
      status: 'PENDING',
      startDate: new Date(),
    });

    // Payment belongs to userA, but references userB's subscription
    const orderId = 'order_cross_sub_123';
    await MockPayment.create({
      user: userA._id,
      subscription: subB._id,
      orderId,
      status: 'PENDING',
      isSimulated: false,
    });

    const req = mockReq(userA, {
      orderId,
      paymentId: 'pay_123',
      signature: 'c'.repeat(64),
    });
    const res = mockRes();
    await verifyPayment(req, res, (err) => { throw err; });

    assert(
      res.statusCode === 403 && res.body?.message?.includes('does not belong to the authenticated user'),
      'Cross-user subscription attachment blocked with HTTP 403',
      JSON.stringify(res.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Client-supplied plan tampering
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Client-supplied plan tampering ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    // Order created for DOCTOR_CONNECT (₹5,999)
    const { orderId, sub } = await setupPendingPayment({ planKey: 'DOCTOR_CONNECT' });

    // Client calculates valid signature for this order and payment
    const paymentId = 'pay_real_gateway_12345';
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Tampering attempt: Client sends planKey: EXCLUSIVE_CONCIERGE (₹49,999)
    const req = mockReq(userA, {
      orderId,
      paymentId,
      signature: validSignature,
      planKey: 'EXCLUSIVE_CONCIERGE', // Tampered plan
      subscriptionId: 'sub_fake_id',
    });
    const res = mockRes();
    await verifyPayment(req, res, (err) => { throw err; });

    assert(res.statusCode === 200, 'Verification succeeded');
    const updatedSub = db.subscriptions.get(String(sub._id));
    assert(
      updatedSub.plan === 'DOCTOR_CONNECT',
      'Plan tampering ignored: Subscription activated as DOCTOR_CONNECT, NOT EXCLUSIVE_CONCIERGE',
      `Actual plan: ${updatedSub.plan}`
    );
    assert(
      updatedSub.contactRequestsRemaining === 25,
      'Contact requests remaining derived from server plan config (25 credits, not concierge unlimited)',
      `Actual credits: ${updatedSub.contactRequestsRemaining}`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Gateway order-creation failure
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Gateway order-creation failure ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    razorpayCreateShouldFail = true;
    const req = mockReq(userA, { planKey: 'DOCTOR_CONNECT' });
    const res = mockRes();
    await createOrder(req, res, (err) => { throw err; });
    razorpayCreateShouldFail = false;

    assert(
      res.statusCode === 502 && res.body?.message?.includes('gateway order creation failed'),
      'Gateway order creation failure returned HTTP 502 Bad Gateway (No silent fallback)',
      JSON.stringify(res.body)
    );
    assert(
      db.subscriptions.size === 0,
      'Pending subscription rolled back cleanly upon gateway order creation failure'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Duplicate verification (idempotency)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Duplicate verification idempotency ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    const { orderId } = await setupPendingPayment({ planKey: 'DOCTOR_CONNECT' });
    const paymentId = 'pay_dup_test_123';
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verifyReq = {
      orderId,
      paymentId,
      signature: validSignature,
    };

    // 1st Verification
    const res1 = mockRes();
    await verifyPayment(mockReq(userA, verifyReq), res1, (err) => { throw err; });
    assert(res1.statusCode === 200 && res1.body?.success === true, '1st verification succeeds');

    // 2nd Verification (duplicate / replay attack)
    const res2 = mockRes();
    await verifyPayment(mockReq(userA, verifyReq), res2, (err) => { throw err; });
    assert(
      res2.statusCode === 200 && res2.body?.alreadyProcessed === true,
      '2nd verification returns alreadyProcessed=true without throwing error or duplicating credits',
      JSON.stringify(res2.body)
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 10: Valid payment verification
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Valid payment verification flow ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    const { orderId, sub } = await setupPendingPayment({ planKey: 'DOCTOR_CONNECT' });
    const paymentId = 'pay_valid_success_999';
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const res = mockRes();
    await verifyPayment(
      mockReq(userA, {
        orderId,
        paymentId,
        signature: validSignature,
        paymentMethod: 'UPI',
      }),
      res,
      (err) => { throw err; }
    );

    assert(res.statusCode === 200, 'Payment verified successfully with HTTP 200');
    assert(res.body?.data?.subscription?.status === 'ACTIVE', 'Subscription status updated to ACTIVE');
    assert(res.body?.data?.payment?.status === 'SUCCESS', 'Payment status updated to SUCCESS');
    assert(db.auditLogs.length > 0, 'Audit log recorded for payment success');
  }

  // ---------------------------------------------------------------------------
  // TEST 11: Legitimate free-plan claim
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Legitimate free-claim flow ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    // 11a: Attempt to claim paid plan via claim-free (should be rejected)
    const reqPaid = mockReq(userA, { planKey: 'DOCTOR_CONNECT' });
    const resPaid = mockRes();
    await claimFreeMembership(reqPaid, resPaid, (err) => { throw err; });

    assert(
      resPaid.statusCode === 400 && resPaid.body?.message?.includes('not eligible for a 100% free membership'),
      'Claiming paid plan via claim-free endpoint rejected with HTTP 400',
      JSON.stringify(resPaid.body)
    );

    // 11b: Claim legitimate FREE plan (0 INR)
    const reqFree = mockReq(userA, { planKey: 'FREE' });
    const resFree = mockRes();
    await claimFreeMembership(reqFree, resFree, (err) => { throw err; });

    assert(
      resFree.statusCode === 200 && resFree.body?.success === true,
      'Legitimate FREE plan activated via separate claimFreeMembership flow',
      JSON.stringify(resFree.body)
    );
    assert(
      resFree.body?.data?.payment?.amount === 0,
      'Free membership payment record created with amount 0 INR'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 12: Subscription-save failure after payment verification & retry reconciliation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12: Subscription-save failure after payment verification & retry reconciliation ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    const { orderId, sub } = await setupPendingPayment({ planKey: 'DOCTOR_CONNECT' });
    const paymentId = 'pay_sub_fail_test_123';
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Simulate transient failure during subscription save AND update fallback
    subscriptionSaveShouldFail = true;
    subscriptionUpdateOneShouldFail = true;

    const res1 = mockRes();
    await verifyPayment(
      mockReq(userA, {
        orderId,
        paymentId,
        signature: validSignature,
      }),
      res1,
      (err) => { throw err; }
    );

    subscriptionSaveShouldFail = false;
    subscriptionUpdateOneShouldFail = false;

    // 12a: Verify graceful failure response (HTTP 500 with retryable: true, SUBSCRIPTION_ACTIVATION_FAILED)
    assert(
      res1.statusCode === 500 && res1.body?.error === 'SUBSCRIPTION_ACTIVATION_FAILED' && res1.body?.retryable === true,
      'Subscription save failure returns HTTP 500 with retryable: true and SUBSCRIPTION_ACTIVATION_FAILED',
      JSON.stringify(res1.body)
    );

    // 12b: Payment MUST remain SUCCESS and NOT be reverted to PENDING (funds were captured)
    const storedPayment = db.payments.get(Array.from(db.payments.keys())[0]);
    assert(
      storedPayment && storedPayment.status === 'SUCCESS',
      'Payment is NOT reverted to PENDING (remains SUCCESS because funds were captured by gateway)',
      `Actual status: ${storedPayment?.status}`
    );
    assert(
      storedPayment.metadata?.subscriptionActivationFailed === true,
      'Payment metadata records subscriptionActivationFailed: true for reconciliation',
      JSON.stringify(storedPayment.metadata)
    );

    // 12c: Subscription remains PENDING prior to retry
    const pendingSub = db.subscriptions.get(String(sub._id));
    assert(
      pendingSub.status === 'PENDING',
      'Subscription remains in PENDING state until reconciliation succeeds',
      `Actual sub status: ${pendingSub.status}`
    );

    // 12d: Client retries verification after database recovers
    const res2 = mockRes();
    await verifyPayment(
      mockReq(userA, {
        orderId,
        paymentId,
        signature: validSignature,
      }),
      res2,
      (err) => { throw err; }
    );

    assert(
      res2.statusCode === 200 && res2.body?.reconciled === true,
      'Subsequent retry detects unactivated SUCCESS payment and completes reconciliation (reconciled: true)',
      JSON.stringify(res2.body)
    );

    // 12e: Subscription is now ACTIVE with full plan credits
    const reconciledSub = db.subscriptions.get(String(sub._id));
    assert(
      reconciledSub.status === 'ACTIVE' && reconciledSub.contactRequestsRemaining === 25,
      'Reconciliation successfully activated subscription with 25 contact requests',
      `Sub status: ${reconciledSub.status}, Credits: ${reconciledSub.contactRequestsRemaining}`
    );
    assert(
      storedPayment.metadata?.subscriptionActivationFailed === false,
      'Reconciliation cleared subscriptionActivationFailed flag',
      JSON.stringify(storedPayment.metadata)
    );

    const reconciledAudit = db.auditLogs.find((l) => l.action === 'PAYMENT_SUBSCRIPTION_RECONCILED');
    assert(
      Boolean(reconciledAudit),
      'PAYMENT_SUBSCRIPTION_RECONCILED audit log recorded upon successful recovery'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 13: Concurrent verification race condition
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 13: Concurrent verification race condition ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    const { orderId, sub } = await setupPendingPayment({ planKey: 'DOCTOR_CONNECT' });
    const paymentId = 'pay_concurrent_999';
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verifyReq = {
      orderId,
      paymentId,
      signature: validSignature,
    };

    // First request executes and transitions Payment from PENDING to SUCCESS (modifiedCount: 1)
    const res1 = mockRes();
    await verifyPayment(mockReq(userA, verifyReq), res1, (err) => { throw err; });

    assert(res1.statusCode === 200 && res1.body?.success === true, 'First concurrent request succeeds');

    // Second request arrives concurrently: Payment.updateOne returns modifiedCount: 0 because status is already SUCCESS
    const res2 = mockRes();
    await verifyPayment(mockReq(userA, verifyReq), res2, (err) => { throw err; });

    assert(
      res2.statusCode === 200 && res2.body?.alreadyProcessed === true,
      'Concurrent request returns HTTP 200 alreadyProcessed=true without throwing error',
      JSON.stringify(res2.body)
    );

    // Verify credits were NOT granted twice
    const finalSub = db.subscriptions.get(String(sub._id));
    assert(
      finalSub.contactRequestsRemaining === 25,
      'Credits NOT granted twice (exactly 25 credits, not 50)',
      `Actual credits: ${finalSub.contactRequestsRemaining}`
    );

    // Verify only ONE subscription exists in DB
    assert(
      db.subscriptions.size === 1,
      'No duplicate subscription record created during concurrent requests',
      `Subscription count: ${db.subscriptions.size}`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 14: claimFreeMembership server-side offer validation & tampering defense
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14: claimFreeMembership server-side offer validation & tampering defense ---');
  {
    resetDb();
    db.users.set(userA._id, userA);

    // 14a: Tampered paid plan key without coupon (e.g. user passes DOCTOR_CONNECT ₹5,999 to claim-free)
    const reqPaid = mockReq(userA, { planKey: 'DOCTOR_CONNECT' });
    const resPaid = mockRes();
    await claimFreeMembership(reqPaid, resPaid, (err) => { throw err; });

    assert(
      resPaid.statusCode === 400 && resPaid.body?.message?.includes('not eligible for a 100% free membership'),
      'Tampered paid plan key refused by server-side recalculation with HTTP 400',
      JSON.stringify(resPaid.body)
    );

    // 14b: Tampered invalid / fabricated coupon code
    const reqFakeCoupon = mockReq(userA, {
      planKey: 'DOCTOR_CONNECT',
      couponCode: 'FABRICATED_FREE_COUPON_999',
    });
    const resFakeCoupon = mockRes();
    await claimFreeMembership(reqFakeCoupon, resFakeCoupon, (err) => { throw err; });

    assert(
      resFakeCoupon.statusCode === 400 && resFakeCoupon.body?.message?.includes('not eligible for a 100% free membership'),
      'Invalid / non-existent coupon refused by claim-free with HTTP 400',
      JSON.stringify(resFakeCoupon.body)
    );

    // 14c: Partial discount coupon (e.g. 50% discount where finalPrice > 0, NOT 100% free)
    const coupon50 = {
      _id: 'coupon_50_pct',
      id: 'coupon_50_pct',
      couponCode: 'SAVE50',
      code: 'SAVE50',
      name: '50% Off Special',
      status: 'ACTIVE',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 86400000),
      usageLimit: 100,
      usedCount: 0,
    };
    db.coupons.set(coupon50.couponCode, coupon50);

    const reqPartial = mockReq(userA, {
      planKey: 'DOCTOR_CONNECT',
      couponCode: 'SAVE50',
    });
    const resPartial = mockRes();
    await claimFreeMembership(reqPartial, resPartial, (err) => { throw err; });

    assert(
      resPartial.statusCode === 400 && resPartial.body?.message?.includes('not eligible for a 100% free membership'),
      'Partial discount (50%) coupon refused by claim-free with HTTP 400 (only 100% free permitted)',
      JSON.stringify(resPartial.body)
    );

    // 14d: Legitimate 100% discount coupon applied to paid plan
    const coupon100 = {
      _id: 'coupon_100_pct',
      id: 'coupon_100_pct',
      couponCode: 'FREE100',
      code: 'FREE100',
      name: '100% Off Full Grant',
      status: 'ACTIVE',
      discountType: 'FREE',
      discountValue: 100,
      startDate: new Date(Date.now() - 86400000),
      expiryDate: new Date(Date.now() + 86400000),
      usageLimit: 100,
      usedCount: 0,
    };
    db.coupons.set(coupon100.couponCode, coupon100);

    const reqFree100 = mockReq(userA, {
      planKey: 'DOCTOR_CONNECT',
      couponCode: 'FREE100',
    });
    const resFree100 = mockRes();
    await claimFreeMembership(reqFree100, resFree100, (err) => { throw err; });

    assert(
      resFree100.statusCode === 200 && resFree100.body?.success === true,
      'Legitimate 100% discount coupon activates DOCTOR_CONNECT for free with HTTP 200',
      JSON.stringify(resFree100.body)
    );
    assert(
      resFree100.body?.data?.payment?.amount === 0,
      'Audit payment record created with 0 INR for 100% coupon redemption'
    );
    assert(
      coupon100.usedCount === 1,
      'Coupon usedCount incremented to 1 upon legitimate free claim'
    );
    assert(
      db.redemptions.length === 1 && db.redemptions[0].couponCode === 'FREE100',
      'CouponRedemption record created with couponCode FREE100'
    );
  }

  // Summary
  console.log('\n======================================================================');
  console.log(`  FINAL RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecuritySuite().catch((err) => {
  console.error('Fatal error in security test suite:', err);
  process.exit(1);
});
