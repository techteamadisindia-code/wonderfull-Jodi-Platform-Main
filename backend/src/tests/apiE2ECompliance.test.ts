import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runE2ETests() {
  console.log('\n======================================================');
  console.log(' RUNNING END-TO-END CHAT COMPLIANCE & API TEST SUITE');
  console.log('======================================================\n');

  try {
    // 1. Authenticate as Admin
    console.log('[1/7] Authenticating as admin (admin@wonderfuljodi.com)...');
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    });
    const token =
      loginRes.data?.data?.token ||
      loginRes.data?.data?.accessToken ||
      loginRes.data?.token ||
      loginRes.data?.accessToken;
    if (!token) {
      throw new Error('Admin login failed: No access token returned');
    }
    console.log('      Admin authenticated successfully.\n');

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test Simulation API with Synthetic Phone Number
    console.log('[2/7] Testing POST /admin/messages/simulate with synthetic phone number: "Call me at 98765 43210"...');
    const simFlagRes = await axios.post(
      `${BASE_URL}/admin/messages/simulate`,
      { message: 'Call me at 98765 43210' },
      { headers: authHeaders }
    );
    console.log('      Simulation Response:', simFlagRes.data?.data);
    if (
      simFlagRes.data?.data?.status !== 'FLAGGED' ||
      simFlagRes.data?.data?.category !== 'PHONE_NUMBER'
    ) {
      throw new Error('Simulation failed to detect synthetic phone number!');
    }
    console.log('      [PASS] Successfully detected FLAGGED / PHONE_NUMBER.\n');

    // 3. Test Simulation API with Safe Message
    console.log('[3/7] Testing POST /admin/messages/simulate with safe message: "Hi, nice to connect with you!"...');
    const simSafeRes = await axios.post(
      `${BASE_URL}/admin/messages/simulate`,
      { message: 'Hi, nice to connect with you!' },
      { headers: authHeaders }
    );
    console.log('      Simulation Response:', simSafeRes.data?.data);
    if (simSafeRes.data?.data?.status !== 'SAFE') {
      throw new Error('Simulation false positive on safe message!');
    }
    console.log('      [PASS] Successfully verified SAFE status.\n');

    // 4. Fetch Conversations Monitor
    console.log('[4/7] Testing GET /admin/messages (Conversations Monitor & Stats)...');
    const convsRes = await axios.get(`${BASE_URL}/admin/messages`, { headers: authHeaders });
    const { conversations, stats } = convsRes.data?.data;
    console.log(`      Total Threads: ${stats.totalThreads}, Total Messages: ${stats.totalMessages}, Flagged Threads: ${stats.flaggedThreads}`);
    if (!conversations || conversations.length === 0) {
      throw new Error('No conversations found in admin monitor!');
    }
    console.log(`      [PASS] Retrieved ${conversations.length} conversations.\n`);

    const targetConv = conversations[0];

    // 5. Test Live Message Injection with Synthetic Contact
    console.log(`[5/7] Testing POST /admin/messages/demo-seed-message on conversation ${targetConv._id}...`);
    const injectRes = await axios.post(
      `${BASE_URL}/admin/messages/demo-seed-message`,
      {
        conversationId: targetConv._id,
        content: 'Hi, you can reach me at 98765 43210.',
      },
      { headers: authHeaders }
    );
    const createdMsg = injectRes.data?.data?.message;
    console.log('      Injected Message Result:', {
      id: createdMsg._id,
      content: createdMsg.content,
      moderationStatus: createdMsg.moderationStatus,
      moderationCategory: createdMsg.moderationCategory,
      flaggedReason: createdMsg.flaggedReason,
    });
    if (createdMsg.moderationStatus !== 'FLAGGED') {
      throw new Error('Injected message was not flagged by detector pipeline!');
    }
    console.log('      [PASS] Live message created and FLAGGED in database.\n');

    // 6. Test Fetching Conversation Messages Details
    console.log(`[6/7] Testing GET /admin/messages/conversations/${targetConv._id}/messages...`);
    const detailsRes = await axios.get(
      `${BASE_URL}/admin/messages/conversations/${targetConv._id}/messages`,
      { headers: authHeaders }
    );
    const messages = detailsRes.data?.data?.messages;
    const flaggedMsg = messages.find((m: any) => m._id === createdMsg._id);
    if (!flaggedMsg || flaggedMsg.moderationStatus !== 'FLAGGED') {
      throw new Error('Flagged message not found in conversation details!');
    }
    console.log(`      [PASS] Flagged message verified in thread stream (${messages.length} messages total).\n`);

    // 7. Test Admin Moderation Action: Mark Message Safe
    console.log(`[7/7] Testing PUT /admin/messages/messages/${createdMsg._id}/moderation (Mark Safe)...`);
    const modRes = await axios.put(
      `${BASE_URL}/admin/messages/messages/${createdMsg._id}/moderation`,
      { moderationStatus: 'SAFE' },
      { headers: authHeaders }
    );
    console.log('      Moderation update response:', modRes.data?.message);
    if (modRes.data?.data?.message?.moderationStatus !== 'SAFE') {
      throw new Error('Failed to update message moderation status to SAFE!');
    }
    console.log('      [PASS] Message successfully marked as SAFE in database.\n');

    console.log('======================================================');
    console.log(' ALL 7/7 END-TO-END COMPLIANCE TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('Test execution failed:', err?.response?.data || err?.message || err);
    process.exit(1);
  }
}

runE2ETests();
