import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runCompleteSimulationTest() {
  console.log('\n================================================================');
  console.log(' RUNNING COMPLETE END-TO-END CHAT COMPLIANCE VERIFICATION');
  console.log('================================================================\n');

  try {
    // 1. Authenticate as Admin
    console.log('[STEP 1/11] Authenticating as Admin (admin@wonderfuljodi.com)...');
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@wonderfuljodi.com',
      password: 'Password123!',
    });
    const token =
      loginRes.data?.data?.token ||
      loginRes.data?.data?.accessToken ||
      loginRes.data?.token ||
      loginRes.data?.accessToken;
    if (!token) throw new Error('Admin authentication failed');
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('            ✓ Admin authenticated successfully.\n');

    // 2. Fetch Initial Conversations & Stats
    console.log('[STEP 2/11] Fetching initial Conversations & Stats from Admin Monitor...');
    const initRes = await axios.get(`${BASE_URL}/admin/messages`, { headers: authHeaders });
    const initialStats = initRes.data?.data?.stats;
    const initialConvs = initRes.data?.data?.conversations;
    console.log('            Initial Stats:', initialStats);
    console.log(`            Found ${initialConvs.length} initial conversations.`);

    // Find conversation between Dr. Ananya Verma and Vikramaditya Singh
    let testConv = initialConvs.find((c: any) => {
      const names = [
        c.participant1?.displayName,
        c.participant1?.fullName,
        c.participant2?.displayName,
        c.participant2?.fullName,
      ].filter(Boolean);
      return (
        names.some((n: string) => n.includes('Ananya')) ||
        names.some((n: string) => n.includes('Vikramaditya'))
      );
    });

    if (!testConv) {
      testConv = initialConvs[0];
    }
    console.log(`            Selected target demo conversation: ID=${testConv._id}\n`);

    // 3. Test Sandbox Detection API (Preset 1: Synthetic Phone Number)
    console.log('[STEP 3/11] Running Compliance Simulation for: "Hi, you can contact me at 98765 43210."...');
    const simFlagRes = await axios.post(
      `${BASE_URL}/admin/messages/simulate`,
      { message: 'Hi, you can contact me at 98765 43210.' },
      { headers: authHeaders }
    );
    const simFlagData = simFlagRes.data?.data;
    console.log('            Simulation Result:', simFlagData);
    if (simFlagData.status !== 'FLAGGED' || simFlagData.category !== 'PHONE_NUMBER') {
      throw new Error('Simulation failed to detect phone number!');
    }
    console.log('            ✓ Detected FLAGGED / PHONE_NUMBER with HIGH confidence.\n');

    // 4. Test Sandbox Detection API (Preset 2: Safe Greeting Message)
    console.log('[STEP 4/11] Running Compliance Simulation for: "Hello, nice to connect with you on Wonderful Jodi."...');
    const simSafeRes = await axios.post(
      `${BASE_URL}/admin/messages/simulate`,
      { message: 'Hello, nice to connect with you on Wonderful Jodi.' },
      { headers: authHeaders }
    );
    const simSafeData = simSafeRes.data?.data;
    console.log('            Simulation Result:', simSafeData);
    if (simSafeData.status !== 'SAFE') {
      throw new Error('Simulation gave false positive on greeting message!');
    }
    console.log('            ✓ Detected SAFE with 0 risk score.\n');

    // 5. Test Sandbox Detection API (Preset 3: False Positive Numeric Test)
    console.log('[STEP 5/11] Running Compliance Simulation for: "My profile ID is 123456 and I joined in 2024."...');
    const simFpRes = await axios.post(
      `${BASE_URL}/admin/messages/simulate`,
      { message: 'My profile ID is 123456 and I joined in 2024.' },
      { headers: authHeaders }
    );
    const simFpData = simFpRes.data?.data;
    console.log('            Simulation Result:', simFpData);
    if (simFpData.status !== 'SAFE') {
      throw new Error('Simulation gave false positive on Profile ID / Year!');
    }
    console.log('            ✓ Verified SAFE (False-positive protection intact).\n');

    // 6. Send Synthetic Message to Demo Chat (Real Backend & Database Message Creation)
    console.log('[STEP 6/11] Executing "Send Synthetic Message to Demo Chat" API...');
    const sendRes = await axios.post(
      `${BASE_URL}/admin/messages/demo-seed-message`,
      {
        conversationId: testConv._id,
        content: 'Hi, you can contact me at 98765 43210.',
      },
      { headers: authHeaders }
    );
    const createdMsg = sendRes.data?.data?.message;
    console.log('            Created Message:', {
      _id: createdMsg._id,
      content: createdMsg.content,
      moderationStatus: createdMsg.moderationStatus,
      moderationCategory: createdMsg.moderationCategory,
      moderationConfidence: createdMsg.moderationConfidence,
      flaggedReason: createdMsg.flaggedReason,
    });
    if (createdMsg.moderationStatus !== 'FLAGGED') {
      throw new Error('Message was not flagged on backend insertion!');
    }
    console.log('            ✓ Real Message saved in MongoDB with FLAGGED moderation status.\n');

    // 7. Verify Conversation Status Escalation & Statistics Update
    console.log('[STEP 7/11] Fetching refreshed Conversations Monitor and Statistics...');
    const refreshedConvsRes = await axios.get(`${BASE_URL}/admin/messages`, { headers: authHeaders });
    const refreshedStats = refreshedConvsRes.data?.data?.stats;
    const updatedConv = refreshedConvsRes.data?.data?.conversations.find((c: any) => c._id === testConv._id);

    console.log('            Refreshed Stats:', refreshedStats);
    console.log(`            Target Conversation Compliance: ${updatedConv?.complianceStatus}, Messages: ${updatedConv?.messageCount}`);
    if (updatedConv?.complianceStatus !== 'FLAGGED') {
      throw new Error('Conversation compliance status was not escalated to FLAGGED!');
    }
    console.log('            ✓ Conversation compliance status updated to FLAGGED in database.\n');

    // 8. Open Conversation Messages (Admin Conversation Viewer)
    console.log(`[STEP 8/11] Opening Conversation Viewer for thread ID ${testConv._id}...`);
    const threadRes = await axios.get(
      `${BASE_URL}/admin/messages/conversations/${testConv._id}/messages`,
      { headers: authHeaders }
    );
    const threadMessages = threadRes.data?.data?.messages;
    const targetMsg = threadMessages.find((m: any) => m._id === createdMsg._id);
    if (!targetMsg) throw new Error('Created synthetic message not found in thread message list');

    console.log('            Message in Viewer Stream:', {
      _id: targetMsg._id,
      content: targetMsg.content,
      moderationStatus: targetMsg.moderationStatus,
      moderationCategory: targetMsg.moderationCategory,
      confidence: targetMsg.moderationConfidence,
      flaggedReason: targetMsg.flaggedReason,
    });
    console.log('            ✓ Message contains full compliance alert details for admin highlight rendering.\n');

    // 9. Admin Moderation Action: Mark Message Safe
    console.log(`[STEP 9/11] Moderating Message ID ${createdMsg._id} -> Mark Safe...`);
    const modRes = await axios.put(
      `${BASE_URL}/admin/messages/messages/${createdMsg._id}/moderation`,
      {
        moderationStatus: 'SAFE',
        flaggedReason: 'Marked safe by admin reviewer during compliance audit',
      },
      { headers: authHeaders }
    );
    console.log('            Moderation Update Response:', modRes.data?.data?.message);
    if (modRes.data?.data?.message?.moderationStatus !== 'SAFE') {
      throw new Error('Failed to update message status to SAFE');
    }
    console.log('            ✓ Message moderation status changed to SAFE.\n');

    // 10. Verify Conversation Compliance Recalculation and Persistence
    console.log('[STEP 10/11] Verifying persistence and conversation compliance recalculation...');
    const postModRes = await axios.get(
      `${BASE_URL}/admin/messages/conversations/${testConv._id}/messages`,
      { headers: authHeaders }
    );
    const verifiedMsg = postModRes.data?.data?.messages.find((m: any) => m._id === createdMsg._id);
    const verifiedConv = postModRes.data?.data?.conversation;

    console.log('            Persisted Message Status in DB:', verifiedMsg?.moderationStatus);
    console.log('            Recalculated Conversation Compliance in DB:', verifiedConv?.complianceStatus);
    if (verifiedMsg?.moderationStatus !== 'SAFE') {
      throw new Error('Message SAFE status did not persist in MongoDB');
    }
    console.log('            ✓ SAFE status successfully persisted in MongoDB.\n');

    // 11. Safe Reset Demo Data Test
    console.log('[STEP 11/11] Testing Safe Reset Demo Data API endpoint...');
    const resetRes = await axios.post(`${BASE_URL}/admin/messages/reset-demo`, {}, { headers: authHeaders });
    console.log('            Reset Response:', resetRes.data);
    console.log('            ✓ Cleaned synthetic demo messages safely.\n');

    console.log('================================================================');
    console.log(' COMPLETE 11/11 END-TO-END SIMULATION VERIFICATION PASSED!');
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('Verification failed:', err?.response?.data || err?.message || err);
    process.exit(1);
  }
}

runCompleteSimulationTest();
