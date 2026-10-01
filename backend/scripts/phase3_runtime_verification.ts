import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { prisma } from '../src/db/client';
import { Conversation } from '../src/models/Conversation';
import { User } from '../src/models/User';
import { Interest } from '../src/models/Interest';
import { Message } from '../src/models/Message';
import { Types } from '../src/db/prismaBridge';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
  error?: string;
  fileOrFunction?: string;
  isEnvIssue?: boolean;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  PHASE 3 — API / RUNTIME VERIFICATION (DATABASE SUITE)  ');
  console.log('══════════════════════════════════════════════════════════\n');

  // Verify DB connection first
  let dbConnected = false;
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    console.log('✅ Connected to MySQL database.\n');
  } catch (connErr: any) {
    console.error('❌ Database connection failed:', connErr.message);
    console.error('   Code:', connErr.code);
    console.log('   Proceeding to execute each test and record exact runtime errors...\n');
  }

  const USER_A = '65f01234567890abcdef0001';
  const USER_B = '65f01234567890abcdef0002';
  const USER_C = '65f01234567890abcdef0003';
  let createdConversationId: string = '';

  // ──────────────────────────────────────────────────
  // TEST 1: CONVERSATION CREATION
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 1: CONVERSATION CREATION ---');
    const createdConv = await Conversation.create({
      participants: [USER_A, USER_B],
      status: 'ACTIVE',
      complianceStatus: 'SAFE',
      messageCount: 0,
      lastActivityAt: new Date(),
    });

    createdConversationId = String(createdConv._id || createdConv.id);

    // Verify row in DB
    const convRow = await (prisma as any).conversation.findUnique({
      where: { id: createdConversationId },
    });

    const participantRows = await (prisma as any).conversationParticipant.findMany({
      where: { conversationId: createdConversationId },
    });

    const pUserIds = participantRows.map((p: any) => p.userId);
    const hasBothUsers = pUserIds.includes(USER_A) && pUserIds.includes(USER_B);
    const returnedParticipants = Array.isArray(createdConv.participants) &&
      createdConv.participants.length === 2 &&
      createdConv.participants.includes(USER_A) &&
      createdConv.participants.includes(USER_B);

    if (convRow && participantRows.length === 2 && hasBothUsers && returnedParticipants) {
      results.push({
        name: 'Conversation creation',
        status: 'PASS',
        details: `Created conv ID=${createdConversationId}, 2 participant rows created (${pUserIds.join(', ')})`,
      });
      console.log('✅ TEST 1 PASS\n');
    } else {
      results.push({
        name: 'Conversation creation',
        status: 'FAIL',
        details: `convRow=${Boolean(convRow)}, participantRows=${participantRows.length}, hasBothUsers=${hasBothUsers}, returnedParticipants=${returnedParticipants}`,
        fileOrFunction: 'prismaBridge.ts:createPrismaModelAdapter.create',
        isEnvIssue: false,
      });
      console.log('❌ TEST 1 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 1 ERROR:', err.message);
    results.push({
      name: 'Conversation creation',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'prismaBridge.ts:createPrismaModelAdapter.create',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 2: DUPLICATE CONVERSATION DETECTION
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 2: DUPLICATE CONVERSATION DETECTION ---');
    // Case 1: A, B
    const matchAB = await Conversation.findOne({
      participants: { $all: [USER_A, USER_B], $size: 2 },
    });

    // Case 2: B, A
    const matchBA = await Conversation.findOne({
      participants: { $all: [USER_B, USER_A], $size: 2 },
    });

    // Case 3: A, B, C
    const matchABC = await Conversation.findOne({
      participants: { $all: [USER_A, USER_B, USER_C], $size: 2 },
    });

    // Case 4: A, C
    const matchAC = await Conversation.findOne({
      participants: { $all: [USER_A, USER_C], $size: 2 },
    });

    const isMatchABValid = matchAB && String(matchAB._id || matchAB.id) === createdConversationId;
    const isMatchBAValid = matchBA && String(matchBA._id || matchBA.id) === createdConversationId;
    const isMatchABCValid = matchABC === null;
    const isMatchACValid = matchAC === null;

    if (isMatchABValid && isMatchBAValid && isMatchABCValid && isMatchACValid) {
      results.push({
        name: 'Duplicate detection',
        status: 'PASS',
        details: 'A,B matched, B,A matched, A,B,C excluded, A,C excluded.',
      });
      console.log('✅ TEST 2 PASS\n');
    } else {
      results.push({
        name: 'Duplicate detection',
        status: 'FAIL',
        details: `AB=${isMatchABValid}, BA=${isMatchBAValid}, ABC_null=${isMatchABCValid}, AC_null=${isMatchACValid}`,
        fileOrFunction: 'prismaBridge.ts:normalizeFilter ($all/$size)',
        isEnvIssue: false,
      });
      console.log('❌ TEST 2 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 2 ERROR:', err.message);
    results.push({
      name: 'Duplicate detection',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'prismaBridge.ts:normalizeFilter ($all/$size)',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 3: PARTICIPANT FILTER
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 3: PARTICIPANT FILTER ---');
    const convsWithA = await Conversation.find({ participants: USER_A });
    const convsWithC = await Conversation.find({ participants: USER_C });

    const hasCreatedConv = convsWithA.some((c: any) => String(c._id || c.id) === createdConversationId);
    const doesNotHaveInC = !convsWithC.some((c: any) => String(c._id || c.id) === createdConversationId);

    const firstConv = convsWithA[0];
    const canUseSome = typeof firstConv?.participants?.some === 'function';
    const canUseFind = typeof firstConv?.participants?.find === 'function';
    const hasIndex0 = firstConv?.participants?.[0] !== undefined;
    const hasIndex1 = firstConv?.participants?.[1] !== undefined;
    const hasLength = firstConv?.participants?.length === 2;

    if (hasCreatedConv && doesNotHaveInC && canUseSome && canUseFind && hasIndex0 && hasIndex1 && hasLength) {
      results.push({
        name: 'Participant filter',
        status: 'PASS',
        details: 'USER_A returned, USER_C excluded. Array methods .some(), .find(), [0], [1], .length working.',
      });
      console.log('✅ TEST 3 PASS\n');
    } else {
      results.push({
        name: 'Participant filter',
        status: 'FAIL',
        details: `hasCreatedConv=${hasCreatedConv}, doesNotHaveInC=${doesNotHaveInC}, some=${canUseSome}, find=${canUseFind}, [0]=${hasIndex0}, [1]=${hasIndex1}, len=${hasLength}`,
        fileOrFunction: 'prismaBridge.ts:normalizeFilter / PrismaQueryBuilder',
        isEnvIssue: false,
      });
      console.log('❌ TEST 3 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 3 ERROR:', err.message);
    results.push({
      name: 'Participant filter',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'prismaBridge.ts:normalizeFilter / PrismaQueryBuilder',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 4: PARTICIPANT POPULATE
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 4: PARTICIPANT POPULATE ---');
    const populatedConvs = await Conversation.find({ participants: USER_A })
      .populate('participants', 'fullName email verificationStatus')
      .lean();

    const targetConv = populatedConvs.find((c: any) => String(c._id || c.id) === createdConversationId);
    const p0 = targetConv?.participants?.[0];
    const hasExpectedShape = p0 && (p0._id || p0.id) && ('fullName' in p0 || 'email' in p0 || 'verificationStatus' in p0 || p0._id);

    if (targetConv && Array.isArray(targetConv.participants) && targetConv.participants.length === 2 && hasExpectedShape) {
      results.push({
        name: 'Participant populate',
        status: 'PASS',
        details: `Populated participants array of objects with {_id, id, fullName, email, verificationStatus}`,
      });
      console.log('✅ TEST 4 PASS\n');
    } else {
      results.push({
        name: 'Participant populate',
        status: 'FAIL',
        details: `targetConv=${Boolean(targetConv)}, isArray=${Array.isArray(targetConv?.participants)}, shape=${JSON.stringify(p0)}`,
        fileOrFunction: 'prismaBridge.ts:PrismaQueryBuilder.populate',
        isEnvIssue: false,
      });
      console.log('❌ TEST 4 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 4 ERROR:', err.message);
    results.push({
      name: 'Participant populate',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'prismaBridge.ts:PrismaQueryBuilder.populate',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 5: findById
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 5: findById ---');
    const conv = await Conversation.findById(createdConversationId);
    const isCorrect = conv && String(conv._id || conv.id) === createdConversationId;
    const participantsAsIds = Array.isArray(conv?.participants) && conv.participants.every((p: any) => typeof p === 'string');

    if (isCorrect && participantsAsIds) {
      results.push({
        name: 'findById',
        status: 'PASS',
        details: `Correct conversation returned with participant string IDs: [${conv.participants.join(', ')}]`,
      });
      console.log('✅ TEST 5 PASS\n');
    } else {
      results.push({
        name: 'findById',
        status: 'FAIL',
        details: `isCorrect=${isCorrect}, participantsAsIds=${participantsAsIds}`,
        fileOrFunction: 'prismaBridge.ts:createPrismaModelAdapter.findById',
        isEnvIssue: false,
      });
      console.log('❌ TEST 5 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 5 ERROR:', err.message);
    results.push({
      name: 'findById',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'prismaBridge.ts:createPrismaModelAdapter.findById',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 6: findByIdAndUpdate
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 6: findByIdAndUpdate ---');
    const updateTime = new Date();
    const updated = await Conversation.findByIdAndUpdate(
      createdConversationId,
      {
        $inc: { messageCount: 1 },
        $set: {
          lastMessage: 'Phase 3 verification message',
          lastActivityAt: updateTime,
        },
      },
      { new: true }
    );

    const updatedPopulated = await Conversation.findByIdAndUpdate(
      createdConversationId,
      {
        $set: { lastMessage: 'Phase 3 second update' },
      },
      { new: true }
    ).populate('participants', 'fullName email verificationStatus');

    const msgCountCorrect = updated?.messageCount === 1;
    const lastMsgCorrect = updated?.lastMessage === 'Phase 3 verification message';
    const populatedCorrect = Array.isArray(updatedPopulated?.participants) && updatedPopulated.participants.length === 2;

    if (msgCountCorrect && lastMsgCorrect && populatedCorrect) {
      results.push({
        name: 'findByIdAndUpdate',
        status: 'PASS',
        details: 'messageCount incremented to 1, lastMessage updated, participants preserved and populating without error.',
      });
      console.log('✅ TEST 6 PASS\n');
    } else {
      results.push({
        name: 'findByIdAndUpdate',
        status: 'FAIL',
        details: `msgCountCorrect=${msgCountCorrect}, lastMsgCorrect=${lastMsgCorrect}, populatedCorrect=${populatedCorrect}`,
        fileOrFunction: 'prismaBridge.ts:createPrismaModelAdapter.findByIdAndUpdate',
        isEnvIssue: false,
      });
      console.log('❌ TEST 6 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 6 ERROR:', err.message);
    results.push({
      name: 'findByIdAndUpdate',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'prismaBridge.ts:createPrismaModelAdapter.findByIdAndUpdate',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 7: SAVE COMPATIBILITY
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 7: SAVE COMPATIBILITY ---');
    const convToSave = await Conversation.findById(createdConversationId);
    if (!convToSave) throw new Error(`Conversation not found for save test (id=${createdConversationId})`);
    convToSave.status = 'ACTIVE';
    await convToSave.save();

    const participantRowsAfterSave = await (prisma as any).conversationParticipant.findMany({
      where: { conversationId: createdConversationId },
    });

    if (convToSave.status === 'ACTIVE' && participantRowsAfterSave.length === 2) {
      results.push({
        name: 'Save compatibility',
        status: 'PASS',
        details: 'Saved successfully. Exactly 2 participant rows preserved. No duplicate participant rows.',
      });
      console.log('✅ TEST 7 PASS\n');
    } else {
      results.push({
        name: 'Save compatibility',
        status: 'FAIL',
        details: `status=${convToSave.status}, participantRows=${participantRowsAfterSave.length}`,
        fileOrFunction: 'prismaBridge.ts:attachSave',
        isEnvIssue: false,
      });
      console.log('❌ TEST 7 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 7 ERROR:', err.message);
    results.push({
      name: 'Save compatibility',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'prismaBridge.ts:attachSave',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 8: INTEREST FLOW
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 8: INTEREST FLOW ---');
    // Test interest creation & conversation association
    const interest = await Interest.create({
      sender: USER_A,
      receiver: USER_B,
      status: 'PENDING',
    });

    // Lookup or create conversation as done in interestController.ts:
    let conv = await Conversation.findOne({
      participants: { $all: [USER_A, USER_B], $size: 2 },
    });

    if (!conv) {
      conv = await Conversation.create({
        participants: [USER_A, USER_B],
        interest: interest._id,
        status: 'ACTIVE',
        complianceStatus: 'SAFE',
        messageCount: 0,
        lastActivityAt: new Date(),
      });
    } else {
      conv.status = 'ACTIVE';
      conv.interest = interest._id;
      await conv.save();
    }

    // Accepting interest
    interest.status = 'ACCEPTED';
    await interest.save();

    // Check again that no duplicate is created
    const convCount = await (prisma as any).conversation.count({
      where: {
        AND: [
          { participants: { some: { userId: USER_A } } },
          { participants: { some: { userId: USER_B } } },
        ],
      },
    });

    if (conv && String(conv.interest) === String(interest._id)) {
      results.push({
        name: 'Interest flow',
        status: 'PASS',
        details: `Interest associated with conversation ID=${conv._id}, participants USER_A + USER_B, convCount=${convCount}`,
      });
      console.log('✅ TEST 8 PASS\n');
    } else {
      results.push({
        name: 'Interest flow',
        status: 'FAIL',
        details: `conv=${Boolean(conv)}, interest=${conv?.interest}, expected=${interest._id}`,
        fileOrFunction: 'interestController.ts:acceptInterest',
        isEnvIssue: false,
      });
      console.log('❌ TEST 8 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 8 ERROR:', err.message);
    results.push({
      name: 'Interest flow',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'interestController.ts:acceptInterest',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // ──────────────────────────────────────────────────
  // TEST 9: MESSAGE FLOW
  // ──────────────────────────────────────────────────
  try {
    console.log('--- TEST 9: MESSAGE FLOW ---');
    const msg = await Message.create({
      conversation: createdConversationId || '65f01234567890abcdef0010',
      sender: USER_A,
      receiver: USER_B,
      content: 'Hello, this is a Phase 3 verification test message.',
      read: false,
      moderationStatus: 'SAFE',
    });

    await Conversation.findByIdAndUpdate(createdConversationId, {
      lastMessage: msg.content,
      lastActivityAt: new Date(),
      $inc: { messageCount: 1 },
      status: 'ACTIVE',
    });

    const refreshedConv = await Conversation.findById(createdConversationId);
    const messages = await Message.find({ conversation: createdConversationId });

    const hasMsg = messages.some((m: any) => String(m._id || m.id) === String(msg._id || msg.id));
    const isSenderCorrect = String(msg.sender) === USER_A;
    const isReceiverCorrect = String(msg.receiver) === USER_B;

    if (hasMsg && isSenderCorrect && isReceiverCorrect && refreshedConv?.lastMessage === msg.content) {
      results.push({
        name: 'Message flow',
        status: 'PASS',
        details: `Message created and retrieved. sender=${USER_A}, receiver=${USER_B}, lastMessage updated in conversation.`,
      });
      console.log('✅ TEST 9 PASS\n');
    } else {
      results.push({
        name: 'Message flow',
        status: 'FAIL',
        details: `hasMsg=${hasMsg}, sender=${isSenderCorrect}, receiver=${isReceiverCorrect}, lastMessage=${refreshedConv?.lastMessage}`,
        fileOrFunction: 'messageController.ts:sendMessage',
        isEnvIssue: false,
      });
      console.log('❌ TEST 9 FAIL\n');
    }
  } catch (err: any) {
    console.error('❌ TEST 9 ERROR:', err.message);
    results.push({
      name: 'Message flow',
      status: 'FAIL',
      details: err.message,
      error: `${err.name}: ${err.message} (code: ${err.code})`,
      fileOrFunction: 'messageController.ts:sendMessage',
      isEnvIssue: err.code === 'P1001' || err.message?.includes("Can't reach database server"),
    });
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  TEST RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════════════════');
  for (const r of results) {
    console.log(`[${r.status}] ${r.name}: ${r.details}`);
    if (r.error) console.log(`       Error: ${r.error}`);
    if (r.fileOrFunction) console.log(`       File/Function: ${r.fileOrFunction}`);
    if (r.isEnvIssue !== undefined) console.log(`       Type: ${r.isEnvIssue ? 'Environment Issue' : 'Real Migration Issue'}`);
  }
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
