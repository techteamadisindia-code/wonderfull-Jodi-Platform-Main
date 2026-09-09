const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 5000;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        host: API_HOST,
        port: API_PORT,
        path,
        method,
        headers,
        timeout: 10000,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log('    WONDERFUL JODI: MEMBERSHIP & ORDER CREATION VERIFICATION TEST     ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Unauthenticated Order Creation Test
  console.log('1. Testing Unauthenticated Request');
  const unauthRes = await request('POST', '/api/memberships/create-order', { planKey: 'PREMIUM' });
  assert(
    unauthRes.status === 401,
    `Unauthenticated order creation returned HTTP 401 (Not 500): ${unauthRes.body.message}`
  );

  // 2. Register fresh doctor candidate
  console.log('\n2. Registering test candidate');
  const testEmail = `doctor.member.${Date.now()}@example.com`;
  const regRes = await request('POST', '/api/auth/register', {
    fullName: 'Dr. Neha Patel',
    email: testEmail,
    mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password123!',
    gender: 'Female',
  });
  assert(regRes.status === 201, 'Test candidate registered successfully');
  const userToken = regRes.body.data?.token || regRes.body.token;

  // 3. Test Invalid Plan Key
  console.log('\n3. Testing Invalid Plan Key Handling');
  const invalidPlanRes = await request(
    'POST',
    '/api/memberships/create-order',
    { planKey: 'UNKNOWN_PLAN_999' },
    userToken
  );
  assert(
    invalidPlanRes.status === 400,
    `Invalid plan returned HTTP 400 (Not 500): ${invalidPlanRes.body.message}`
  );

  // 4. Test "Start Connecting" (₹4,999 / 3 Months "PREMIUM" Plan)
  console.log('\n4. Testing "Start Connecting" (PREMIUM ₹4,999 Order Creation)');
  const createOrderRes = await request(
    'POST',
    '/api/memberships/create-order',
    { planKey: 'PREMIUM' },
    userToken
  );

  assert(
    createOrderRes.status === 200,
    `"Start Connecting" returned HTTP 200: Order ID = ${createOrderRes.body.data?.order?.id}`
  );
  assert(
    createOrderRes.body.data?.order?.amount === 499900,
    `Order amount is correct: ₹${createOrderRes.body.data?.order?.amount / 100}`
  );
  assert(
    createOrderRes.body.data?.plan?.name === 'Premium',
    `Plan name is Premium (3 Months)`
  );

  const orderId = createOrderRes.body.data?.order?.id;
  const subscriptionId = createOrderRes.body.data?.subscriptionId;

  // 5. Test Payment Verification & Activation
  console.log('\n5. Testing Payment Verification & Subscription Activation');
  const verifyRes = await request(
    'POST',
    '/api/memberships/verify',
    {
      orderId,
      paymentId: `pay_test_${Date.now()}`,
      planKey: 'PREMIUM',
      subscriptionId,
    },
    userToken
  );

  assert(
    verifyRes.status === 200,
    `Payment verification returned HTTP 200: ${verifyRes.body.message}`
  );
  assert(
    verifyRes.body.data?.subscription?.status === 'ACTIVE',
    `Subscription status is ACTIVE`
  );
  assert(
    verifyRes.body.data?.subscription?.plan === 'PREMIUM',
    `Subscription plan is PREMIUM`
  );

  // 6. Test Duplicate Click / Already Active Prevention
  console.log('\n6. Testing Duplicate Click / Already Active Subscription Handling');
  const duplicateOrderRes = await request(
    'POST',
    '/api/memberships/create-order',
    { planKey: 'PREMIUM' },
    userToken
  );

  assert(
    duplicateOrderRes.status === 409 || duplicateOrderRes.body.alreadyActive,
    `Duplicate click returned already active notice (No 500): ${duplicateOrderRes.body.message}`
  );

  // 7. Test Membership Status API
  console.log('\n7. Testing /api/memberships/my-status');
  const statusRes = await request('GET', '/api/memberships/my-status', null, userToken);
  assert(
    statusRes.status === 200 && statusRes.body.data?.isPremium === true,
    `User membership status is confirmed as isPremium=true (${statusRes.body.data?.plan})`
  );

  // 8. Test Premium VIP Order Creation for a fresh candidate
  console.log('\n8. Testing Premium VIP (₹9,999 / 6 Months Order Creation)');
  const vipUserEmail = `dr.vip.${Date.now()}@example.com`;
  const vipReg = await request('POST', '/api/auth/register', {
    fullName: 'Dr. Vikramaditya',
    email: vipUserEmail,
    mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password123!',
    gender: 'Male',
  });
  const vipToken = vipReg.body.data?.token || vipReg.body.token;

  const vipOrderRes = await request(
    'POST',
    '/api/memberships/create-order',
    { planKey: 'PREMIUM_VIP' },
    vipToken
  );
  assert(
    vipOrderRes.status === 200,
    `Premium VIP order returned HTTP 200: Order ID = ${vipOrderRes.body.data?.order?.id}`
  );
  assert(
    vipOrderRes.body.data?.order?.amount === 999900,
    `VIP Order amount is ₹9,999`
  );

  console.log('\n======================================================================');
  console.log(`  FINAL RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
