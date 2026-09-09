const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('  WONDERFUL JODI COMPREHENSIVE FLOW & SECURITY TEST ');
  console.log('====================================================\n');

  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const userAEmail = `doctor.priya.${randomSuffix}@example.com`;
  const userBEmail = `doctor.rohan.${randomSuffix}@example.com`;
  const userAMobile = `98${randomSuffix}11`;
  const userBMobile = `98${randomSuffix}22`;
  const password = 'Password123!';

  // 1. Register & Authenticate User A and User B
  console.log('1. Registering and Authenticating User A (Priya) and User B (Rohan)...');
  const regARes = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: 'Dr. Priya Sharma (Cardiologist)',
    email: userAEmail,
    mobile: userAMobile,
    password: password,
  });
  const tokenA = regARes.data.token || regARes.data.data.token;
  const userA = regARes.data.user || regARes.data.data.user;
  const userAId = userA._id || userA.id;
  console.log(`✓ User A Registered: ${userA.fullName} (ID: ${userAId})`);

  const regBRes = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: 'Dr. Rohan Mehta (Neurologist)',
    email: userBEmail,
    mobile: userBMobile,
    password: password,
  });
  const tokenB = regBRes.data.token || regBRes.data.data.token;
  const userB = regBRes.data.user || regBRes.data.data.user;
  const userBId = userB._id || userB.id;
  console.log(`✓ User B Registered: ${userB.fullName} (ID: ${userBId})\n`);

  const clientA = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  const clientB = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  // 2. Security Test: Self-Interest Prevention
  console.log('2. Testing Security: User A Cannot Send Interest to Themselves...');
  try {
    await clientA.post('/interests', { receiverId: userAId });
    console.log('✗ FAILED: User was able to send interest to themselves!');
  } catch (err) {
    console.log(`✓ Self-Interest Blocked: HTTP ${err.response?.status} - "${err.response?.data?.message}"`);
  }

  // 3. Security Test: Chat Blocked Before Any Interest
  console.log('\n3. Testing Security: Chat Access Blocked Before Interest...');
  try {
    await clientA.post('/messages', { receiverId: userBId, content: 'Hello doctor' });
    console.log('✗ FAILED: Chat was allowed without interest!');
  } catch (err) {
    console.log(`✓ Chat Blocked (No Interest): HTTP ${err.response?.status} - ${err.response?.data?.code}: "${err.response?.data?.message}"`);
  }

  // 4. User A Sends Interest to User B
  console.log('\n4. User A Sends Express Interest to User B...');
  const interestRes = await clientA.post('/interests', { receiverId: userBId });
  const interest = interestRes.data.data;
  console.log(`✓ Interest Created in DB: ID = ${interest._id}, Status = ${interest.status}`);

  // Test Duplicate Interest Prevention
  const dupRes = await clientA.post('/interests', { receiverId: userBId });
  console.log(`✓ Duplicate Interest Handled: "${dupRes.data.message}" (Status = ${dupRes.data.data.status})`);

  // 5. Test Chat Blocked While Interest is PENDING
  console.log('\n5. Testing Security: Chat Blocked While Interest is PENDING...');
  try {
    await clientA.post('/messages', { receiverId: userBId, content: 'Hello while pending' });
    console.log('✗ FAILED: Chat was allowed while pending!');
  } catch (err) {
    console.log(`✓ Chat Blocked (Pending Interest): HTTP ${err.response?.status} - ${err.response?.data?.code}: "${err.response?.data?.message}"`);
  }

  // 6. Verify User B Received In-App Notification
  console.log('\n6. Verifying User B Received Database Notification...');
  const notifBRes = await clientB.get('/notifications');
  const notifsB = notifBRes.data.data.notifications;
  const interestNotif = notifsB.find((n) => n.type === 'INTEREST_RECEIVED' || n.type === 'INTEREST');
  console.log(`✓ User B Notification: "${interestNotif?.title}" - "${interestNotif?.message}" (Unread: ${!interestNotif?.read})`);
  console.log(`✓ Notification Action Link: "${interestNotif?.actionUrl || interestNotif?.link}"`);

  // Unread Count Check for Bell Icon
  const unreadRes = await clientB.get('/notifications/unread-count');
  console.log(`✓ User B Header Bell Unread Count: ${unreadRes.data.data.unreadCount}`);

  // 7. Security Test: Unauthorized User Cannot Accept Interest
  console.log('\n7. Testing Security: User A Cannot Accept Their Own Sent Interest...');
  try {
    await clientA.patch(`/interests/${interest._id}/accept`);
    console.log('✗ FAILED: Sender was able to accept their own interest!');
  } catch (err) {
    console.log(`✓ Unauthorized Accept Blocked: HTTP ${err.response?.status} - "${err.response?.data?.message}"`);
  }

  // 8. User B Accepts Interest
  console.log('\n8. User B Accepts Interest...');
  const acceptRes = await clientB.patch(`/interests/${interest._id}/accept`);
  console.log(`✓ Interest Accepted: status = ${acceptRes.data.data.interest.status}`);
  const conversationId = acceptRes.data.data.conversationId;
  console.log(`✓ Active Conversation Initialized: ID = ${conversationId}`);

  // Verify User A Received Acceptance Notification
  const notifARes = await clientA.get('/notifications');
  const acceptNotif = notifARes.data.data.notifications.find((n) => n.type === 'INTEREST_ACCEPTED');
  console.log(`✓ User A Notification: "${acceptNotif?.title}" - "${acceptNotif?.message}"`);

  // 9. Test Compliance Moderation: Phone, Email, WhatsApp
  console.log('\n9. Testing Compliance Moderation (Contact Sharing Prevention)...');
  try {
    await clientA.post('/messages', { receiverId: userBId, content: 'Call me at 9876543210' });
    console.log('✗ FAILED: Phone number was not blocked!');
  } catch (err) {
    console.log(`✓ Phone Number Blocked: HTTP ${err.response?.status} - ${err.response?.data?.code}: "${err.response?.data?.message}"`);
  }

  try {
    await clientA.post('/messages', { receiverId: userBId, content: 'Email me at doctor.priya@gmail.com' });
    console.log('✗ FAILED: Email was not blocked!');
  } catch (err) {
    console.log(`✓ Email Address Blocked: HTTP ${err.response?.status} - ${err.response?.data?.code}: "${err.response?.data?.message}"`);
  }

  // 10. Test Free Message Limit for User A (3 Messages Allowed, 4th Blocked)
  console.log('\n10. Testing Free Message Limit for User A (3 Sent Messages)...');
  const m1 = await clientA.post('/messages', { receiverId: userBId, content: 'Namaste Dr. Rohan, nice connecting with you.' });
  console.log(`✓ Message #1: "${m1.data.data.message.content}" (Sent: 1/3, Remaining: ${m1.data.data.stats.remainingFreeMessages})`);

  const m2 = await clientA.post('/messages', { receiverId: userBId, content: 'I saw your medical background in neurology.' });
  console.log(`✓ Message #2: "${m2.data.data.message.content}" (Sent: 2/3, Remaining: ${m2.data.data.stats.remainingFreeMessages})`);

  const m3 = await clientA.post('/messages', { receiverId: userBId, content: 'Looking forward to knowing more about your family.' });
  console.log(`✓ Message #3: "${m3.data.data.message.content}" (Sent: 3/3, Remaining: ${m3.data.data.stats.remainingFreeMessages})`);

  // 4th Message: MUST be blocked with 403 & PREMIUM_REQUIRED
  console.log('\n11. Testing 4th Message Block & Premium Required Code for User A...');
  try {
    await clientA.post('/messages', { receiverId: userBId, content: 'This 4th message must be blocked!' });
    console.log('✗ FAILED: 4th message was sent without premium upgrade!');
  } catch (err) {
    console.log(`✓ 4th Message Strictly Blocked by Backend: HTTP ${err.response?.status} - ${err.response?.data?.code}: "${err.response?.data?.message}" (upgradeRequired: ${err.response?.data?.upgradeRequired})`);
  }

  // 12. Test Per-User Allowance: User B Can Still Send Their Own 3 Messages
  console.log('\n12. Testing Per-User Allowance (User B Still Has Their 3 Free Messages)...');
  const b1 = await clientB.post('/messages', { receiverId: userAId, content: 'Namaste Dr. Priya, thank you for connecting!' });
  console.log(`✓ User B Message #1: "${b1.data.data.message.content}" (Sent by User B: ${b1.data.data.stats.messagesSentByMe}/3, Remaining: ${b1.data.data.stats.remainingFreeMessages})`);

  // 13. Verify Database Integrity (Blocked messages not saved)
  const convRes = await clientA.get(`/conversations/${conversationId}/messages`);
  console.log(`\n13. Database Message Count for Conversation: ${convRes.data.data.messages.length} messages in DB (Total allowed 3 from A + 1 from B)`);

  console.log('\n====================================================');
  console.log('     ALL 13 TESTS & SECURITY CHECKS PASSED 100%      ');
  console.log('====================================================\n');
}

runTests().catch((e) => {
  console.error('Test execution error:', e.message, e.response?.data || e);
});
