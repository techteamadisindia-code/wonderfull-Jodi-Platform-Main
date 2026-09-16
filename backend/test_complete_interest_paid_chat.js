const http = require('http');
const mongoose = require('mongoose');

const API_HOST = 'localhost';
const API_PORT = 5000;
const MONGODB_URI = 'mongodb://localhost:27017/wonderfuljodi';

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

async function runVerification() {
  console.log('======================================================================');
  console.log('  WONDERFUL JODI: INTEREST + NOTIFICATION + PAID CHAT VERIFICATION    ');
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

  // 0. Connect to MongoDB
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const timestamp = Date.now();

  // 1. Register User A (Free Member)
  console.log('\n--- 1. REGISTERING USER A (Dr. Amit Verma) ---');
  const userAEmail = `dr.amit.${timestamp}@example.com`;
  const regARes = await request('POST', '/api/auth/register', {
    fullName: 'Dr. Amit Verma',
    email: userAEmail,
    mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password123!',
    gender: 'Male',
    termsAccepted: true,
  });
  if (regARes.status !== 201) console.log('Reg A error:', regARes.body);
  assert(regARes.status === 201, 'User A registered successfully');
  const tokenA = regARes.body.data?.token || regARes.body.token;
  const userAId = regARes.body.data?.user?._id || regARes.body.data?.user?.id || regARes.body.user?._id;

  // 2. Register User B (Free Member)
  console.log('\n--- 2. REGISTERING USER B (Dr. Shreya Rao) ---');
  const userBEmail = `dr.shreya.${timestamp}@example.com`;
  const regBRes = await request('POST', '/api/auth/register', {
    fullName: 'Dr. Shreya Rao',
    email: userBEmail,
    mobile: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password123!',
    gender: 'Female',
    termsAccepted: true,
  });
  if (regBRes.status !== 201) console.log('Reg B error:', regBRes.body);
  assert(regBRes.status === 201, 'User B registered successfully');
  const tokenB = regBRes.body.data?.token || regBRes.body.token;
  const userBId = regBRes.body.data?.user?._id || regBRes.body.data?.user?.id || regBRes.body.user?._id;

  // Verify both profiles exist in DB
  const profileA = await db.collection('profiles').findOne({ user: new mongoose.Types.ObjectId(userAId) });
  const profileB = await db.collection('profiles').findOne({ user: new mongoose.Types.ObjectId(userBId) });
  assert(Boolean(profileA), 'Profile A created in MongoDB');
  assert(Boolean(profileB), 'Profile B created in MongoDB');

  // Update Doctor qualifications
  await db.collection('profiles').updateOne(
    { _id: profileA._id },
    { $set: { degree: 'MBBS, MD (Cardiology)', profession: 'Cardiologist', verificationStatus: 'APPROVED' } }
  );
  await db.collection('profiles').updateOne(
    { _id: profileB._id },
    { $set: { degree: 'MBBS, MS (General Surgery)', profession: 'Surgeon', verificationStatus: 'APPROVED' } }
  );

  // Confirm subscriptions are FREE
  const subA = await db.collection('subscriptions').findOne({ user: new mongoose.Types.ObjectId(userAId) });
  const subB = await db.collection('subscriptions').findOne({ user: new mongoose.Types.ObjectId(userBId) });
  assert(!subA || subA.planKey === 'FREE' || subA.plan === 'FREE', 'User A has FREE membership');
  assert(!subB || subB.planKey === 'FREE' || subB.plan === 'FREE', 'User B has FREE membership');

  // 3. FREE User A sends Interest to User B
  console.log('\n--- 3. FREE USER A SENDS INTEREST TO USER B ---');
  const sendInterestRes = await request(
    'POST',
    '/api/interests',
    { receiverId: userBId, profileId: profileB._id.toString() },
    tokenA
  );
  assert(
    sendInterestRes.status === 201 || sendInterestRes.status === 200,
    `Free User A sent interest successfully (HTTP ${sendInterestRes.status})`
  );
  const interestRecord = sendInterestRes.body.data || sendInterestRes.body.interest;
  const interestId = interestRecord._id || interestRecord.id;
  assert(Boolean(interestId), `Interest created in MongoDB with ID: ${interestId}`);
  assert(interestRecord.status === 'PENDING', `Interest status is PENDING`);

  // 4. Duplicate Interest Prevention
  console.log('\n--- 4. TEST DUPLICATE INTEREST PREVENTION ---');
  const dupInterestRes = await request(
    'POST',
    '/api/interests',
    { receiverId: userBId, profileId: profileB._id.toString() },
    tokenA
  );
  assert(
    dupInterestRes.status === 409,
    `Duplicate interest rejected with HTTP 409 (code: ${dupInterestRes.body.code})`
  );

  // 5. Receiver (User B) Persistent Notification
  console.log('\n--- 5. RECEIVER (USER B) NOTIFICATION CHECK ---');
  const notifsBRes = await request('GET', '/api/notifications', null, tokenB);
  assert(notifsBRes.status === 200, 'User B fetched notifications successfully');
  const notifsB = notifsBRes.body.data?.notifications || notifsBRes.body.notifications || [];
  const interestNotifB = notifsB.find(
    (n) => n.type === 'INTEREST_RECEIVED' || n.type === 'INTEREST'
  );
  assert(
    Boolean(interestNotifB),
    `User B received persistent in-app notification: "${interestNotifB?.title}"`
  );
  assert(
    interestNotifB?.metadata?.interestId === interestId || interestNotifB?.metadata?.senderName?.includes('Amit'),
    'Notification contains correct Interest & Doctor metadata'
  );

  // 6. Receiver (User B) Accepts Interest
  console.log('\n--- 6. RECEIVER (USER B) ACCEPTS INTEREST ---');
  const acceptRes = await request('PATCH', `/api/interests/${interestId}/accept`, {}, tokenB);
  assert(
    acceptRes.status === 200,
    `User B accepted interest successfully (HTTP ${acceptRes.status})`
  );
  assert(
    acceptRes.body.data?.interest?.status === 'ACCEPTED' ||
      acceptRes.body.data?.status === 'ACCEPTED' ||
      acceptRes.body.interest?.status === 'ACCEPTED',
    'Interest status changed to ACCEPTED in DB'
  );

  // 7. Sender (User A) Notification Check for Acceptance
  console.log('\n--- 7. SENDER (USER A) ACCEPTANCE NOTIFICATION CHECK ---');
  const notifsARes = await request('GET', '/api/notifications', null, tokenA);
  assert(notifsARes.status === 200, 'User A fetched notifications successfully');
  const notifsA = notifsARes.body.data?.notifications || notifsARes.body.notifications || [];
  const acceptedNotifA = notifsA.find((n) => n.type === 'INTEREST_ACCEPTED');
  assert(
    Boolean(acceptedNotifA),
    `User A received persistent ACCEPTED notification: "${acceptedNotifA?.message}"`
  );

  // 8. FREE User A Attempts Chat (Must be Blocked with PREMIUM_REQUIRED)
  console.log('\n--- 8. FREE USER A ATTEMPTS CHAT (BYPASS TEST) ---');
  const freeChatInitiateRes = await request(
    'POST',
    '/api/conversations',
    { targetUserId: userBId, profileId: profileB._id.toString() },
    tokenA
  );
  assert(
    freeChatInitiateRes.status === 403,
    `Free user starting conversation blocked with HTTP 403 (Status: ${freeChatInitiateRes.status})`
  );
  assert(
    freeChatInitiateRes.body.code === 'PREMIUM_REQUIRED',
    `Error code is correctly "PREMIUM_REQUIRED": "${freeChatInitiateRes.body.message}"`
  );

  // 9. Free User Directly Calling Messages Endpoint
  console.log('\n--- 9. FREE USER DIRECT POST /api/messages BYPASS TEST ---');
  // Find conversation if any exists
  const existingConv = await db.collection('conversations').findOne({
    participants: { $all: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
  });
  const convId = existingConv ? existingConv._id.toString() : '60c72b2f9b1e8a001f8e4caa';
  const directMessageRes = await request(
    'POST',
    '/api/messages',
    { conversationId: convId, content: 'Hey can we chat?' },
    tokenA
  );
  assert(
    directMessageRes.status === 403,
    `Free user direct message sending blocked with HTTP 403 (Status: ${directMessageRes.status})`
  );
  assert(
    directMessageRes.body.code === 'PREMIUM_REQUIRED',
    `Message block returned code "PREMIUM_REQUIRED"`
  );

  // 10. Upgrade User A to Active Paid Premium
  console.log('\n--- 10. UPGRADE USER A TO ACTIVE PAID PREMIUM ---');
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.collection('subscriptions').updateOne(
    { user: new mongoose.Types.ObjectId(userAId) },
    {
      $set: {
        planKey: 'DOCTOR_CONNECT',
        plan: 'DOCTOR_CONNECT',
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate: thirtyDaysLater,
      },
    },
    { upsert: true }
  );
  console.log('✓ User A subscription updated to ACTIVE DOCTOR_CONNECT (Expires in 30 days)');

  // 11. Paid User A Initiates Conversation with Accepted Match
  console.log('\n--- 11. PAID USER A INITIATES CONVERSATION ---');
  const paidInitRes = await request(
    'POST',
    '/api/conversations',
    { targetUserId: userBId, profileId: profileB._id.toString() },
    tokenA
  );
  assert(
    paidInitRes.status === 200 || paidInitRes.status === 201,
    `Paid User A initiated conversation successfully (HTTP ${paidInitRes.status})`
  );
  const activeConvId =
    paidInitRes.body.data?.conversation?._id ||
    paidInitRes.body.data?._id ||
    paidInitRes.body.conversationId ||
    paidInitRes.body.conversation?._id;
  assert(Boolean(activeConvId), `Active Conversation established: ${activeConvId}`);

  // 12. Paid User A Sends Message
  console.log('\n--- 12. PAID USER A SENDS VALID MESSAGE ---');
  const sendMsgRes = await request(
    'POST',
    '/api/messages',
    { conversationId: activeConvId, content: 'Namaste Dr. Shreya, glad to connect with you!' },
    tokenA
  );
  assert(
    sendMsgRes.status === 201 || sendMsgRes.status === 200,
    `Paid User A sent message successfully (HTTP ${sendMsgRes.status})`
  );
  const savedMsg = sendMsgRes.body.data?.message || sendMsgRes.body.message;
  assert(
    savedMsg?.content === 'Namaste Dr. Shreya, glad to connect with you!',
    `Message persisted correctly in MongoDB`
  );

  // 13. Free User B Attempts to Reply (Must be Blocked)
  console.log('\n--- 13. FREE USER B ATTEMPTS TO REPLY (MUST BE BLOCKED) ---');
  const freeReplyRes = await request(
    'POST',
    '/api/messages',
    { conversationId: activeConvId, content: 'Hello Dr. Amit, nice to meet you!' },
    tokenB
  );
  assert(
    freeReplyRes.status === 403,
    `Free User B reply blocked with HTTP 403 (Status: ${freeReplyRes.status})`
  );
  assert(
    freeReplyRes.body.code === 'PREMIUM_REQUIRED',
    `Free User B received "PREMIUM_REQUIRED"`
  );

  // 14. Upgrade User B to Active Paid Premium
  console.log('\n--- 14. UPGRADE USER B TO ACTIVE PAID PREMIUM ---');
  await db.collection('subscriptions').updateOne(
    { user: new mongoose.Types.ObjectId(userBId) },
    {
      $set: {
        planKey: 'PREMIUM_MATCH',
        plan: 'PREMIUM_MATCH',
        status: 'ACTIVE',
        startDate: new Date(),
        expiryDate: thirtyDaysLater,
      },
    },
    { upsert: true }
  );
  console.log('✓ User B subscription updated to ACTIVE PREMIUM_MATCH');

  // 15. Paid User B Sends Reply
  console.log('\n--- 15. PAID USER B SENDS REPLY ---');
  const paidReplyRes = await request(
    'POST',
    '/api/messages',
    { conversationId: activeConvId, content: 'Hello Dr. Amit, wonderful to connect with you as well!' },
    tokenB
  );
  assert(
    paidReplyRes.status === 201 || paidReplyRes.status === 200,
    `Paid User B replied successfully (HTTP ${paidReplyRes.status})`
  );

  // 16. Contact Information Compliance Protection
  console.log('\n--- 16. TEST CONTACT-INFO COMPLIANCE DETECTION ---');
  const compliancePhoneRes = await request(
    'POST',
    '/api/messages',
    { conversationId: activeConvId, content: 'Call my clinic at 9876543210' },
    tokenA
  );
  assert(
    compliancePhoneRes.status === 400,
    `Phone number message blocked by compliance filter (HTTP ${compliancePhoneRes.status})`
  );
  assert(
    compliancePhoneRes.body.code === 'CONTACT_INFO_BLOCKED',
    `Compliance filter returned code "CONTACT_INFO_BLOCKED"`
  );

  const complianceEmailRes = await request(
    'POST',
    '/api/messages',
    { conversationId: activeConvId, content: 'Reach me on email dr.amit@apollohospital.org' },
    tokenA
  );
  assert(
    complianceEmailRes.status === 400,
    `Email message blocked by compliance filter (HTTP ${complianceEmailRes.status})`
  );

  // 17. Membership Expiration Check
  console.log('\n--- 17. MEMBERSHIP EXPIRATION ENFORCEMENT ---');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.collection('subscriptions').updateOne(
    { user: new mongoose.Types.ObjectId(userAId) },
    { $set: { expiryDate: yesterday } }
  );
  const expiredMsgRes = await request(
    'POST',
    '/api/messages',
    { conversationId: activeConvId, content: 'Trying to chat after my plan expired' },
    tokenA
  );
  assert(
    expiredMsgRes.status === 403,
    `Expired member blocked from chatting with HTTP 403 (Status: ${expiredMsgRes.status})`
  );
  assert(
    expiredMsgRes.body.code === 'PREMIUM_REQUIRED',
    `Expired member received PREMIUM_REQUIRED`
  );

  // 18. Protection: Chat without Accepted Interest
  console.log('\n--- 18. CHAT WITHOUT ACCEPTED INTEREST TEST ---');
  const userCEmail = `dr.vikrant.${timestamp}@example.com`;
  const regCRes = await request('POST', '/api/auth/register', {
    fullName: 'Dr. Vikrant Kulkarni',
    email: userCEmail,
    mobile: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password123!',
    gender: 'Male',
    termsAccepted: true,
  });
  assert(regCRes.status === 201, 'User C registered successfully');
  const userCId = regCRes.body.data?.user?._id || regCRes.body.data?.user?.id || regCRes.body.user?._id;

  // Paid User B tries to chat with User C (no accepted interest)
  const noInterestChatRes = await request(
    'POST',
    '/api/conversations',
    { targetUserId: userCId },
    tokenB
  );
  assert(
    noInterestChatRes.status === 403,
    `Chat without accepted interest blocked with HTTP 403 (Status: ${noInterestChatRes.status})`
  );
  assert(
    noInterestChatRes.body.code === 'INTEREST_NOT_ACCEPTED',
    `Error code is "INTEREST_NOT_ACCEPTED": "${noInterestChatRes.body.message}"`
  );

  // 19. Interest Decline / Reject Notification
  console.log('\n--- 19. INTEREST REJECTION & NOTIFICATION TEST ---');
  const interestCRes = await request(
    'POST',
    '/api/interests',
    { receiverId: userBId },
    regCRes.body.data?.token || regCRes.body.token
  );
  const intCId = interestCRes.body.data?._id || interestCRes.body.interest?._id;
  assert(Boolean(intCId), `User C sent interest to User B`);

  const rejectRes = await request('PATCH', `/api/interests/${intCId}/reject`, {}, tokenB);
  assert(rejectRes.status === 200, `User B rejected interest (HTTP ${rejectRes.status})`);
  assert(
    rejectRes.body.data?.status === 'REJECTED' || rejectRes.body.interest?.status === 'REJECTED',
    `Interest marked as REJECTED`
  );

  const notifsCRes = await request('GET', '/api/notifications', null, regCRes.body.data?.token || regCRes.body.token);
  const notifsC = notifsCRes.body.data?.notifications || notifsCRes.body.notifications || [];
  const rejectedNotif = notifsC.find((n) => n.type === 'INTEREST_REJECTED' || n.type === 'INTEREST_DECLINED');
  assert(
    Boolean(rejectedNotif),
    `User C received notification: "${rejectedNotif?.message}"`
  );

  console.log('\n======================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runVerification().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
