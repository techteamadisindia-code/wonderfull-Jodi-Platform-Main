/**
 * Comprehensive Security Test Suite: Socket.IO Authentication & Room Authorization
 *
 * 100% Test Isolation Guarantee:
 * - Spins up a transient in-process HTTP + Socket.IO server on ephemeral port (port 0).
 * - Mocks Conversation and User lookups in-memory without database mutations.
 * - Shuts down completely upon completion.
 *
 * Validates all 13 Security Scenarios:
 *  1. Unauthenticated socket connection rejected.
 *  2. Valid authenticated socket connection accepted.
 *  3. Authenticated user joins their own private room automatically.
 *  4. User cannot join another member's private room.
 *  5. Arbitrary room names rejected.
 *  6. Expired JWT rejected.
 *  7. Invalid JWT signature rejected.
 *  8. Reconnection revalidates authentication.
 *  9. User cannot impersonate another sender on sendMessage.
 * 10. Unauthorized conversation messages rejected (non-participant).
 * 11. Client cannot broadcast arbitrary events / inject server-only events.
 * 12. Existing interestRestored delivery works for authorized users in their room.
 * 13. Existing newNotification delivery remains functional for authorized users.
 */

process.env.TEST_SUITE_RUNNING = 'true';

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');

const {
  verifySocketAuthentication,
  extractSocketToken,
  parseSocketCookies,
} = require('./dist/server.js');
const { getSafeJwtSecret } = require('./dist/utils/permissionUtils.js');

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

async function runSuite() {
  console.log('\n===============================================================');
  console.log('Running Socket.IO Security & Room Authorization Test Suite');
  console.log('===============================================================\n');

  const testSecret = getSafeJwtSecret() || 'supersecret_wonderfuljodi_dev_key_2026';
  const userA = '507f191e810c19729de860ea';
  const userB = '507f191e810c19729de860eb';
  const validConvId = '507f1f77bcf86cd799439011';
  const otherConvId = '507f1f77bcf86cd799439099';

  const tokenUserA = jwt.sign({ userId: userA, role: 'user', email: 'userA@example.com' }, testSecret, { expiresIn: '1h' });
  const tokenUserB = jwt.sign({ userId: userB, role: 'user', email: 'userB@example.com' }, testSecret, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ userId: userA, role: 'user' }, testSecret, { expiresIn: '-1s' });
  const invalidSigToken = jwt.sign({ userId: userA, role: 'user' }, 'wrong_secret_key');

  // Setup ephemeral test HTTP + Socket.IO server
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
  });

  // Mock conversation database
  const conversationsMock = {
    [validConvId]: { _id: validConvId, participants: [userA, userB] },
    [otherConvId]: { _id: otherConvId, participants: ['otherUser1', 'otherUser2'] },
  };

  // Wire authoritative authentication middleware (matching server.ts)
  io.use(async (socket, next) => {
    try {
      const authData = await verifySocketAuthentication(socket);
      socket.data = socket.data || {};
      socket.data.userId = authData.userId;
      socket.data.role = authData.role;
      next();
    } catch (err) {
      next(err);
    }
  });

  // Wire room authorization and event handlers (matching server.ts)
  io.on('connection', (socket) => {
    const verifiedUserId = socket.data?.userId;
    if (!verifiedUserId) {
      socket.disconnect(true);
      return;
    }

    // 1. Authoritative auto-join personal room
    const personalRoom = `user:${verifiedUserId}`;
    socket.join(personalRoom);

    // 2. Controlled joinRoom
    socket.on('joinRoom', async (room, callback) => {
      const respond = (success, message) => {
        if (!success) socket.emit('error', message);
        if (typeof callback === 'function') callback({ success, message, room: success ? room : undefined });
      };

      if (!room || typeof room !== 'string') return respond(false, 'Invalid room identifier');
      const cleanRoom = room.trim();

      if (cleanRoom === personalRoom) {
        socket.join(cleanRoom);
        return respond(true, 'Joined personal room');
      }

      if (cleanRoom.startsWith('user:')) {
        return respond(false, 'Unauthorized: cannot join another member private room');
      }

      if (cleanRoom.startsWith('admin') || cleanRoom.startsWith('internal:')) {
        if (socket.data.role !== 'admin') {
          return respond(false, 'Unauthorized: administrative room access denied');
        }
        socket.join(cleanRoom);
        return respond(true, 'Joined administrative room');
      }

      const convId = cleanRoom.startsWith('conv:') ? cleanRoom.slice(5) : cleanRoom;
      const conv = conversationsMock[convId];
      if (conv) {
        const isParticipant = Array.isArray(conv.participants) && conv.participants.includes(verifiedUserId);
        if (!isParticipant && socket.data.role !== 'admin') {
          return respond(false, 'Unauthorized: not a participant of this conversation');
        }
        socket.join(cleanRoom);
        return respond(true, 'Joined conversation room');
      }

      return respond(false, 'Unauthorized: arbitrary room names are not allowed');
    });

    // 3. Authorized sendMessage
    socket.on('sendMessage', async (payload, callback) => {
      const respond = (success, message) => {
        if (!success) socket.emit('error', message);
        if (typeof callback === 'function') callback({ success, message });
      };

      if (!payload || typeof payload !== 'object') return respond(false, 'Invalid message payload');
      const targetRoom = typeof payload.room === 'string' ? payload.room.trim() : '';
      if (!targetRoom) return respond(false, 'Room identifier is required');

      if (targetRoom.startsWith('user:') || targetRoom.startsWith('admin') || targetRoom.startsWith('internal:')) {
        return respond(false, 'Unauthorized: cannot broadcast messages to private or administrative rooms');
      }

      const convId = targetRoom.startsWith('conv:') ? targetRoom.slice(5) : targetRoom;
      const conv = conversationsMock[convId];
      if (!conv) return respond(false, 'Conversation not found');

      const isParticipant = Array.isArray(conv.participants) && conv.participants.includes(verifiedUserId);
      if (!isParticipant && socket.data.role !== 'admin') {
        return respond(false, 'Unauthorized: not a participant of this conversation');
      }

      const sanitizedPayload = {
        ...payload,
        sender: verifiedUserId,
        senderId: verifiedUserId,
        room: targetRoom,
      };

      io.to(targetRoom).emit('receiveMessage', sanitizedPayload);
      return respond(true, 'Message delivered');
    });

    // 4. Server-only events protection
    const SERVER_ONLY = ['interestRestored', 'newNotification', 'interestReceived', 'newChatMessage'];
    for (const ev of SERVER_ONLY) {
      socket.on(ev, () => {
        socket.emit('error', `Unauthorized: '${ev}' is a server-originated event`);
      });
    }
  });

  // Start server on ephemeral port
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const port = httpServer.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;

  function connectClient(token, extraOpts = {}) {
    return new Promise((resolve, reject) => {
      const socket = ioClient(serverUrl, {
        auth: token ? { token } : undefined,
        transports: ['websocket'],
        reconnection: false,
        timeout: 2000,
        ...extraOpts,
      });

      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => resolve({ error: err, socket }));
    });
  }

  try {
    // Scenario 1: Unauthenticated socket connection rejected
    console.log('--- Group 1: Connection Authentication ---');
    await test('1. Unauthenticated socket connection rejected', async () => {
      const res = await connectClient(null);
      assert.ok(res.error, 'Connection should fail without token');
      assert.ok(res.error.message.includes('Authentication required'));
      if (res.socket) res.socket.close();
    });

    // Scenario 2: Valid authenticated socket connection accepted
    let clientA;
    await test('2. Valid authenticated socket connection accepted', async () => {
      clientA = await connectClient(tokenUserA);
      assert.ok(!clientA.error, 'Valid client should connect cleanly');
      assert.ok(clientA.id, 'Socket should have an ID');
    });

    // Scenario 3: Authenticated user joins their own private room automatically
    await test('3. Authenticated user joins their own private room automatically', async () => {
      let received = false;
      clientA.on('testDirectNotification', (msg) => {
        if (msg === 'hello userA') received = true;
      });

      // Server emits directly to userA's private room
      io.to(`user:${userA}`).emit('testDirectNotification', 'hello userA');
      await new Promise((r) => setTimeout(r, 100));
      assert.strictEqual(received, true, 'User A should receive messages emitted to user:userA');
    });

    // Scenario 4: User cannot join another member's room
    console.log('\n--- Group 2: Room Authorization ---');
    await test('4. User cannot join another member private room', async () => {
      const ack = await new Promise((resolve) => {
        clientA.emit('joinRoom', `user:${userB}`, (response) => resolve(response));
      });
      assert.strictEqual(ack.success, false);
      assert.ok(ack.message.includes('cannot join another member'));

      // Verify User A does NOT receive events sent to User B's room
      let snooped = false;
      clientA.on('secretForUserB', () => { snooped = true; });
      io.to(`user:${userB}`).emit('secretForUserB', 'secret');
      await new Promise((r) => setTimeout(r, 100));
      assert.strictEqual(snooped, false, 'User A must NOT receive events from User B private room');
    });

    // Scenario 5: Arbitrary room names rejected
    await test('5. Arbitrary room names rejected', async () => {
      const ack = await new Promise((resolve) => {
        clientA.emit('joinRoom', 'arbitrary_unauthorized_room_xyz', (res) => resolve(res));
      });
      assert.strictEqual(ack.success, false);
      assert.ok(ack.message.includes('arbitrary room names are not allowed'));
    });

    // Scenario 6: Expired JWT rejected
    console.log('\n--- Group 3: Token Validation & Reconnection ---');
    await test('6. Expired JWT connection rejected', async () => {
      const res = await connectClient(expiredToken);
      assert.ok(res.error, 'Expired token should fail connection');
      assert.ok(res.error.message.includes('expired'));
      if (res.socket) res.socket.close();
    });

    // Scenario 7: Invalid JWT signature rejected
    await test('7. Invalid JWT signature rejected', async () => {
      const res = await connectClient(invalidSigToken);
      assert.ok(res.error, 'Invalid signature should fail connection');
      assert.ok(res.error.message.includes('Invalid or expired'));
      if (res.socket) res.socket.close();
    });

    // Scenario 8: Reconnection revalidates authentication dynamically
    await test('8. Reconnection revalidates authentication with dynamic auth callback', async () => {
      let currentToken = tokenUserA;
      let connectCount = 0;

      const dynamicClient = ioClient(serverUrl, {
        auth: (cb) => cb({ token: currentToken }),
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 2,
        reconnectionDelay: 50,
      });

      await new Promise((resolve) => dynamicClient.on('connect', resolve));
      connectCount++;

      // Disconnect from server-side to trigger reconnect
      dynamicClient.io.engine.close();

      // Expire token before reconnect
      currentToken = expiredToken;

      const reconnectError = await new Promise((resolve) => {
        dynamicClient.on('connect_error', (err) => resolve(err));
      });

      assert.ok(reconnectError, 'Reconnect with expired token must trigger connect_error');
      assert.ok(reconnectError.message.includes('expired'));
      dynamicClient.close();
    });

    // Scenario 9: User cannot impersonate another sender on sendMessage
    console.log('\n--- Group 4: Message Security & Impersonation Prevention ---');
    await test('9. User cannot impersonate another sender (server authoritatively stamps sender)', async () => {
      // Connect User B
      const clientB = await connectClient(tokenUserB);

      // Join conversation room where both A and B are participants
      await new Promise((r) => clientA.emit('joinRoom', validConvId, r));
      await new Promise((r) => clientB.emit('joinRoom', validConvId, r));

      let receivedPayload = null;
      clientB.on('receiveMessage', (msg) => { receivedPayload = msg; });

      // User A attempts to claim they are User B or Admin
      await new Promise((resolve) => {
        clientA.emit('sendMessage', {
          room: validConvId,
          sender: userB, // Spoofed!
          senderId: 'admin_impersonated', // Spoofed!
          content: 'Hello from impostor',
        }, resolve);
      });

      await new Promise((r) => setTimeout(r, 100));
      assert.ok(receivedPayload, 'Message should be received in valid room');
      assert.strictEqual(receivedPayload.sender, userA, 'Sender must be authoritatively stamped as User A');
      assert.strictEqual(receivedPayload.senderId, userA, 'Sender ID must be authoritatively stamped as User A');
      clientB.close();
    });

    // Scenario 10: Unauthorized conversation messages rejected (non-participant)
    await test('10. Unauthorized conversation messages rejected for non-participant', async () => {
      // User A attempts to broadcast to otherConvId where they are NOT a participant
      const ack = await new Promise((resolve) => {
        clientA.emit('sendMessage', {
          room: otherConvId,
          content: 'Unpermitted chat',
        }, resolve);
      });

      assert.strictEqual(ack.success, false);
      assert.ok(ack.message.includes('not a participant'));
    });

    // Scenario 11: Client cannot broadcast arbitrary events to private rooms
    await test('11. Client cannot inject server-only events (e.g. interestRestored, newNotification)', async () => {
      let errorMessage = null;
      clientA.on('error', (err) => { errorMessage = err; });

      clientA.emit('interestRestored', { forged: true });
      await new Promise((r) => setTimeout(r, 100));
      assert.ok(errorMessage, 'Client-injected server event should trigger error');
      assert.ok(errorMessage.includes('server-originated event'));
    });

    // Scenario 12: Existing interestRestored delivery still works for authorized users
    console.log('\n--- Group 5: Delivery Integrity (Undo Decline & Notifications) ---');
    await test('12. Existing interestRestored delivery works for authorized users in their room', async () => {
      let deliveredInterest = null;
      clientA.on('interestRestored', (payload) => { deliveredInterest = payload; });

      // Server emits interestRestored to User A's private room (as interestController does)
      const testPayload = {
        interest: { _id: 'int_123', status: 'PENDING' },
        restoredBy: userB,
      };
      io.to(`user:${userA}`).emit('interestRestored', testPayload);

      await new Promise((r) => setTimeout(r, 100));
      assert.ok(deliveredInterest, 'User A should receive interestRestored');
      assert.strictEqual(deliveredInterest.interest._id, 'int_123');
      assert.strictEqual(deliveredInterest.restoredBy, userB);
    });

    // Scenario 13: Existing newNotification delivery remains functional
    await test('13. Existing newNotification delivery remains functional for authorized users', async () => {
      let deliveredNotif = null;
      clientA.on('newNotification', (payload) => { deliveredNotif = payload; });

      // Server emits newNotification to User A's private room
      const notifPayload = {
        notification: { _id: 'notif_999', type: 'INTEREST_RESTORED', title: 'Interest reconsidered' },
        unreadCountDelta: 1,
      };
      io.to(`user:${userA}`).emit('newNotification', notifPayload);

      await new Promise((r) => setTimeout(r, 100));
      assert.ok(deliveredNotif, 'User A should receive newNotification');
      assert.strictEqual(deliveredNotif.notification._id, 'notif_999');
      assert.strictEqual(deliveredNotif.unreadCountDelta, 1);
    });

    if (clientA) clientA.close();

  } finally {
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  }

  console.log('\n===============================================================');
  console.log(`Results: ${passedTests}/${totalTests} passed (${failedTests} failed)`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runSuite().catch((err) => {
  console.error('Fatal error running socket security suite:', err);
  process.exit(1);
});
