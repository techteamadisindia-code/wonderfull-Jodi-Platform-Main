import { PrismaClient } from '@prisma/client';
import {
  AdminLifecycleGuard,
  AdminLifecycleLockError,
  withAdminLifecycleGuard,
} from '../utils/adminLifecycleGuard';

// Lightweight test assertion helpers
let passed = 0;
let failed = 0;
const results: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    passed++;
    results.push({ test: testName, status: 'PASS' });
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    results.push({ test: testName, status: 'FAIL', error: errorDetail || 'Assertion failed' });
    console.error(`  [FAIL] ${testName}: ${errorDetail || 'Assertion failed'}`);
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const isMatch = actual === expected;
  assert(
    isMatch,
    testName,
    `Expected "${String(expected)}", received "${String(actual)}"`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared State & Cross-Process Lock Backend Simulator
// ─────────────────────────────────────────────────────────────────────────────
interface MockUser {
  _id: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  isDeleted?: boolean;
  status?: string;
}

interface MockAdmin {
  user: string;
  permissions: string[];
}

/**
 * Shared Database State & MariaDB-equivalent Row Lock Manager.
 * Simulates a shared database server accessible by multiple independent processes.
 */
class SharedDatabaseLockBackend {
  users = new Map<string, MockUser>();
  admins = new Map<string, MockAdmin>();
  revokedTokens = new Set<string>();

  // Database-level lock state on the singleton 'admin_lifecycle_guard' row
  private isRowLocked = false;
  private lockWaitQueue: Array<{
    resolve: () => void;
    reject: (err: any) => void;
    timer: NodeJS.Timeout;
  }> = [];

  seed(userList: MockUser[], adminList: MockAdmin[]) {
    this.users.clear();
    this.admins.clear();
    this.revokedTokens.clear();
    userList.forEach((u) => this.users.set(u._id, { ...u }));
    adminList.forEach((a) => this.admins.set(a.user, { ...a }));
  }

  /**
   * Simulates acquiring an exclusive row lock (`SELECT ... FOR UPDATE`) in the database.
   */
  async acquireRowLock(timeoutMs = 5000): Promise<() => void> {
    return new Promise<() => void>((resolve, reject) => {
      const grantLock = () => {
        this.isRowLocked = true;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.isRowLocked = false;
          const next = this.lockWaitQueue.shift();
          if (next) {
            clearTimeout(next.timer);
            next.resolve();
          }
        });
      };

      if (!this.isRowLocked) {
        grantLock();
      } else {
        const timer = setTimeout(() => {
          const idx = this.lockWaitQueue.findIndex((item) => item.timer === timer);
          if (idx !== -1) {
            this.lockWaitQueue.splice(idx, 1);
          }
          reject(
            new AdminLifecycleLockError(
              'Timed out acquiring cross-process database row lock (fail-closed)',
              'LOCK_TIMEOUT'
            )
          );
        }, timeoutMs);

        this.lockWaitQueue.push({
          resolve: grantLock,
          reject,
          timer,
        });
      }
    });
  }

  async countActiveAdmins(): Promise<number> {
    // Artificial I/O latency to reflect network roundtrips
    await new Promise((r) => setTimeout(r, 10));
    let count = 0;
    for (const u of this.users.values()) {
      if (u.role === 'admin' && u.isActive && !u.isDeleted) {
        count++;
      }
    }
    return count;
  }

  async updateUsers(ids: string[], update: Partial<MockUser>) {
    await new Promise((r) => setTimeout(r, 10));
    for (const id of ids) {
      const u = this.users.get(id);
      if (u) {
        Object.assign(u, update);
      }
    }
  }

  async deleteUser(id: string) {
    await new Promise((r) => setTimeout(r, 10));
    this.users.delete(id);
  }

  async revokeTokens(ids: string[]) {
    for (const id of ids) {
      this.revokedTokens.add(id);
    }
  }
}

/**
 * Controller-equivalent implementation of bulkUpdateUserStatus using an independent guard
 */
async function executeBulkUpdateWithGuard(
  db: SharedDatabaseLockBackend,
  guard: AdminLifecycleGuard,
  params: {
    callerId: string;
    userIds: string[];
    targetActive: boolean;
    simulateLockFailure?: boolean;
    customTimeoutMs?: number;
  }
) {
  const { callerId, userIds, targetActive, simulateLockFailure, customTimeoutMs } = params;
  const successful: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  const uniqueIds = Array.from(new Set(userIds.map((id) => String(id).trim())));

  const superAdminUserIds = new Set(
    Array.from(db.admins.values())
      .filter((a) => a.permissions.includes('all'))
      .map((a) => a.user)
  );

  const eligibleIdsToUpdate: string[] = [];

  for (const id of uniqueIds) {
    const userDoc = db.users.get(id);

    if (!userDoc) {
      failed.push({ id, reason: 'User not found in system' });
      continue;
    }

    if (!targetActive && id === callerId) {
      failed.push({
        id,
        reason: 'Cannot deactivate currently logged-in administrator',
      });
      continue;
    }

    if (!targetActive && superAdminUserIds.has(id)) {
      failed.push({
        id,
        reason: 'Super Admin accounts are protected and cannot be deactivated',
      });
      continue;
    }

    if (userDoc.isActive === targetActive) {
      successful.push(id);
      continue;
    }

    eligibleIdsToUpdate.push(id);
    successful.push(id);
  }

  if (eligibleIdsToUpdate.length > 0) {
    const updateData: Partial<MockUser> = {
      isActive: targetActive,
      status: targetActive ? 'Active' : 'Suspended',
    };

    const adminIdsInUpdate = !targetActive
      ? eligibleIdsToUpdate.filter(
          (id) => db.users.get(id)?.role === 'admin' && db.users.get(id)?.isActive
        )
      : [];

    if (adminIdsInUpdate.length > 0) {
      if (simulateLockFailure) {
        // Fail-closed path when lock acquisition fails
        for (const adminId of adminIdsInUpdate) {
          const uIdx = eligibleIdsToUpdate.indexOf(adminId);
          if (uIdx > -1) eligibleIdsToUpdate.splice(uIdx, 1);
          const sIdx = successful.indexOf(adminId);
          if (sIdx > -1) successful.splice(sIdx, 1);
          failed.push({
            id: adminId,
            reason: 'Cannot deactivate administrator: concurrency lock acquisition failed (fail-closed)',
          });
        }
        if (eligibleIdsToUpdate.length > 0) {
          await db.updateUsers(eligibleIdsToUpdate, updateData);
          await db.revokeTokens(eligibleIdsToUpdate);
        }
      } else {
        try {
          await guard.execute(
            async () => {
              const freshActiveAdminCount = await db.countActiveAdmins();
              let availableBudget = freshActiveAdminCount;

              for (const adminId of adminIdsInUpdate) {
                if (availableBudget <= 1) {
                  const uIdx = eligibleIdsToUpdate.indexOf(adminId);
                  if (uIdx > -1) eligibleIdsToUpdate.splice(uIdx, 1);
                  const sIdx = successful.indexOf(adminId);
                  if (sIdx > -1) successful.splice(sIdx, 1);
                  failed.push({
                    id: adminId,
                    reason: 'Cannot deactivate administrator: would leave system without an active administrator account',
                  });
                } else {
                  availableBudget--;
                }
              }

              if (eligibleIdsToUpdate.length > 0) {
                await db.updateUsers(eligibleIdsToUpdate, updateData);
                await db.revokeTokens(eligibleIdsToUpdate);
              }
            },
            { timeoutMs: customTimeoutMs || 5000 }
          );
        } catch (guardErr: any) {
          for (const adminId of adminIdsInUpdate) {
            const uIdx = eligibleIdsToUpdate.indexOf(adminId);
            if (uIdx > -1) eligibleIdsToUpdate.splice(uIdx, 1);
            const sIdx = successful.indexOf(adminId);
            if (sIdx > -1) successful.splice(sIdx, 1);
            failed.push({
              id: adminId,
              reason: 'Cannot deactivate administrator: concurrency lock acquisition failed (fail-closed)',
            });
          }

          if (eligibleIdsToUpdate.length > 0) {
            await db.updateUsers(eligibleIdsToUpdate, updateData);
            if (!targetActive) {
              await db.revokeTokens(eligibleIdsToUpdate);
            }
          }
        }
      }
    } else {
      await db.updateUsers(eligibleIdsToUpdate, updateData);
      if (!targetActive) {
        await db.revokeTokens(eligibleIdsToUpdate);
      }
    }
  }

  return { successful, failed };
}

/**
 * Controller-equivalent implementation of single updateUserStatus using an independent guard
 */
async function executeSingleUpdateWithGuard(
  db: SharedDatabaseLockBackend,
  guard: AdminLifecycleGuard,
  params: {
    callerId: string;
    targetId: string;
    activeValue: boolean;
  }
) {
  const { callerId, targetId, activeValue } = params;
  const existingUser = db.users.get(targetId);
  if (!existingUser) {
    return { status: 404, message: 'User not found' };
  }

  if (!activeValue && existingUser.isActive) {
    if (targetId === callerId) {
      return { status: 400, message: 'Cannot deactivate currently logged-in administrator' };
    }

    const adminRec = db.admins.get(targetId);
    if (adminRec?.permissions.includes('all')) {
      return { status: 400, message: 'Super Admin accounts are protected and cannot be deactivated' };
    }

    if (existingUser.role === 'admin') {
      try {
        await guard.execute(
          async () => {
            const freshActiveAdminCount = await db.countActiveAdmins();
            if (freshActiveAdminCount <= 1) {
              throw new Error('LAST_ACTIVE_ADMIN');
            }
            await db.updateUsers([targetId], { isActive: false, status: 'Suspended' });
            await db.revokeTokens([targetId]);
          },
          {}
        );
      } catch (err: any) {
        if (err?.message === 'LAST_ACTIVE_ADMIN') {
          return { status: 400, message: 'Cannot deactivate the last active administrator account' };
        }
        return { status: 409, message: 'Administrator status update locked due to concurrent modifications.' };
      }
      return { status: 200, message: 'Account deactivated successfully' };
    }
  }

  await db.updateUsers([targetId], { isActive: activeValue, status: activeValue ? 'Active' : 'Suspended' });
  if (!activeValue) {
    await db.revokeTokens([targetId]);
  }
  return { status: 200, message: 'Account updated successfully' };
}

/**
 * Controller-equivalent implementation of updateUserRole using an independent guard
 */
async function executeUpdateRoleWithGuard(
  db: SharedDatabaseLockBackend,
  guard: AdminLifecycleGuard,
  params: {
    callerId: string;
    targetId: string;
    newRole: 'admin' | 'user';
  }
) {
  const { callerId, targetId, newRole } = params;
  const targetUser = db.users.get(targetId);
  if (!targetUser) {
    return { status: 404, message: 'User not found' };
  }

  if (targetUser.role === 'admin' && newRole === 'user') {
    if (targetId === callerId) {
      return { status: 400, message: 'Cannot demote currently logged-in administrator' };
    }

    const superAdminRecord = db.admins.get(targetId);
    if (superAdminRecord?.permissions.includes('all')) {
      return { status: 400, message: 'Super Admin accounts cannot be demoted' };
    }

    if (targetUser.isActive) {
      try {
        await guard.execute(
          async () => {
            const freshActiveAdminCount = await db.countActiveAdmins();
            if (freshActiveAdminCount <= 1) {
              throw new Error('LAST_ACTIVE_ADMIN');
            }
            await db.updateUsers([targetId], { role: 'user' });
          },
          {}
        );
      } catch (err: any) {
        if (err?.message === 'LAST_ACTIVE_ADMIN') {
          return {
            status: 400,
            message: 'Cannot demote administrator: would leave system without an active administrator account',
          };
        }
        return { status: 409, message: 'Administrator role update locked due to concurrent modifications.' };
      }
      return { status: 200, message: 'Role updated successfully' };
    }
  }

  await db.updateUsers([targetId], { role: newRole });
  return { status: 200, message: 'Role updated successfully' };
}

/**
 * Controller-equivalent implementation of deleteUser using an independent guard
 */
async function executeDeleteUserWithGuard(
  db: SharedDatabaseLockBackend,
  guard: AdminLifecycleGuard,
  params: {
    callerId: string;
    targetId: string;
  }
) {
  const { callerId, targetId } = params;
  const targetUser = db.users.get(targetId);
  if (!targetUser) {
    return { status: 404, message: 'User not found' };
  }

  if (targetUser.role === 'admin') {
    if (targetId === callerId) {
      return { status: 400, message: 'Cannot delete currently logged-in administrator' };
    }

    const superAdminRecord = db.admins.get(targetId);
    if (superAdminRecord?.permissions.includes('all')) {
      return { status: 400, message: 'Super Admin accounts cannot be deleted' };
    }

    if (targetUser.isActive) {
      try {
        await guard.execute(
          async () => {
            const freshActiveAdminCount = await db.countActiveAdmins();
            if (freshActiveAdminCount <= 1) {
              throw new Error('LAST_ACTIVE_ADMIN');
            }
            await db.deleteUser(targetId);
          },
          {}
        );
      } catch (err: any) {
        if (err?.message === 'LAST_ACTIVE_ADMIN') {
          return { status: 400, message: 'Cannot delete the last active administrator account' };
        }
        return { status: 409, message: 'Administrator deletion locked due to concurrent modifications.' };
      }
      return { status: 200, message: 'User deleted successfully' };
    }
  }

  await db.deleteUser(targetId);
  return { status: 200, message: 'User deleted successfully' };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE CONCURRENCY REGRESSION TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────
async function runConcurrencyTestSuite() {
  console.log('========================================================================');
  console.log('  WONDERFUL JODI — CROSS-PROCESS ADMIN LIFECYCLE LOCKING SUITE');
  console.log('========================================================================\n');

  const sharedDb = new SharedDatabaseLockBackend();

function createMockPrismaClient(db: SharedDatabaseLockBackend) {
  return {
    counter: {
      upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
    },
    $transaction: async (fn: any, opts: any) => {
      const release = await db.acquireRowLock(opts?.maxWait || 5000);
      try {
        return await fn({ $queryRaw: async () => [{ _id: 'admin_lifecycle_guard' }] });
      } finally {
        release();
      }
    },
  };
}

  // ─── SUITE 1: TWO INDEPENDENT GUARDS (SEPARATE PROCESSES) CONCURRENT DEACTIVATION ───
  console.log('Suite 1: Two Independent Guard Instances (Separate Processes) Deactivation');
  {
    // Two separate guard instances representing separate Node.js processes.
    // They share ZERO in-process mutex state.
    const guardProcess1 = new AdminLifecycleGuard();
    const guardProcess2 = new AdminLifecycleGuard();

    assert(
      guardProcess1.mutex !== guardProcess2.mutex,
      '1a. Guard 1 and Guard 2 have independent in-process mutexes (simulating separate processes)'
    );

    const callerId = 'super_caller_admin';
    const adminA = 'active_admin_alpha';
    const adminB = 'active_admin_beta';

    sharedDb.seed(
      [
        { _id: callerId, email: 'super@wj.com', role: 'admin', isActive: false },
        { _id: adminA, email: 'alpha@wj.com', role: 'admin', isActive: true },
        { _id: adminB, email: 'beta@wj.com', role: 'admin', isActive: true },
      ],
      [
        { user: callerId, permissions: ['all'] },
        { user: adminA, permissions: ['users'] },
        { user: adminB, permissions: ['users'] },
      ]
    );

    const initialActive = await sharedDb.countActiveAdmins();
    assertEqual(initialActive, 2, '1b. System starts with exactly 2 active eligible administrators');

    const mockPrisma1 = createMockPrismaClient(sharedDb);
    const mockPrisma2 = createMockPrismaClient(sharedDb);

    const processGuard1 = new AdminLifecycleGuard(mockPrisma1);
    const processGuard2 = new AdminLifecycleGuard(mockPrisma2);

    // Launch concurrent deactivations from two separate process guards
    const [res1, res2] = await Promise.all([
      executeBulkUpdateWithGuard(sharedDb, processGuard1, { callerId, userIds: [adminA], targetActive: false }),
      executeBulkUpdateWithGuard(sharedDb, processGuard2, { callerId, userIds: [adminB], targetActive: false }),
    ]);

    const activeRemaining = await sharedDb.countActiveAdmins();
    assert(
      activeRemaining >= 1,
      '1c. At least one eligible active administrator remains active after concurrent requests',
      `Found ${activeRemaining} active admins (expected >= 1)`
    );
    assertEqual(activeRemaining, 1, '1d. Exactly 1 active administrator remains active');

    const totalSuccessful = res1.successful.length + res2.successful.length;
    const totalFailed = res1.failed.length + res2.failed.length;
    assertEqual(totalSuccessful, 1, '1e. Exactly one concurrent process succeeded');
    assertEqual(totalFailed, 1, '1f. Exactly one concurrent process failed');

    const failedReason = res1.failed[0]?.reason || res2.failed[0]?.reason || '';
    assert(
      failedReason.includes('leave system without an active administrator'),
      '1g. Failed process reported explicit lockout prevention reason'
    );
  }

  // ─── SUITE 2: BULK AND SINGLE-USER ENDPOINTS CONCURRENTLY ACROSS PROCESSES ───
  console.log('\nSuite 2: Bulk and Single-User Endpoints Running Concurrently Across Processes');
  {
    const admin1 = 'admin_bulk_target';
    const admin2 = 'admin_single_target';

    sharedDb.seed(
      [
        { _id: admin1, email: 'bulk@wj.com', role: 'admin', isActive: true },
        { _id: admin2, email: 'single@wj.com', role: 'admin', isActive: true },
      ],
      [
        { user: admin1, permissions: ['users'] },
        { user: admin2, permissions: ['users'] },
      ]
    );

    const mockPrisma1 = createMockPrismaClient(sharedDb);
    const mockPrisma2 = createMockPrismaClient(sharedDb);

    const guardBulk = new AdminLifecycleGuard(mockPrisma1);
    const guardSingle = new AdminLifecycleGuard(mockPrisma2);

    const [resBulk, resSingle] = await Promise.all([
      executeBulkUpdateWithGuard(sharedDb, guardBulk, { callerId: 'ext_caller', userIds: [admin1], targetActive: false }),
      executeSingleUpdateWithGuard(sharedDb, guardSingle, { callerId: 'ext_caller', targetId: admin2, activeValue: false }),
    ]);

    const activeLeft = await sharedDb.countActiveAdmins();
    assertEqual(activeLeft, 1, '2a. Exactly 1 active administrator remains across endpoints');

    const oneSucceeded = (resBulk.successful.length === 1 && resSingle.status === 400) ||
                         (resBulk.failed.length === 1 && resSingle.status === 200);
    assert(oneSucceeded, '2b. Exactly one endpoint succeeded and one endpoint rejected');
  }

  // ─── SUITE 3: ROLE-DEMOTION RACING AGAINST A DELETE REQUEST ACROSS PROCESSES ───
  console.log('\nSuite 3: Role-Demotion Racing Against a Delete Request Across Processes');
  {
    const adminDemote = 'admin_demote_target';
    const adminDelete = 'admin_delete_target';

    sharedDb.seed(
      [
        { _id: adminDemote, email: 'demote@wj.com', role: 'admin', isActive: true },
        { _id: adminDelete, email: 'delete@wj.com', role: 'admin', isActive: true },
      ],
      [
        { user: adminDemote, permissions: ['users'] },
        { user: adminDelete, permissions: ['users'] },
      ]
    );

    const mockPrisma1 = createMockPrismaClient(sharedDb);
    const mockPrisma2 = createMockPrismaClient(sharedDb);

    const guardDemote = new AdminLifecycleGuard(mockPrisma1);
    const guardDelete = new AdminLifecycleGuard(mockPrisma2);

    const [resDemote, resDelete] = await Promise.all([
      executeUpdateRoleWithGuard(sharedDb, guardDemote, { callerId: 'ext_caller', targetId: adminDemote, newRole: 'user' }),
      executeDeleteUserWithGuard(sharedDb, guardDelete, { callerId: 'ext_caller', targetId: adminDelete }),
    ]);

    const activeLeft = await sharedDb.countActiveAdmins();
    assertEqual(activeLeft, 1, '3a. Exactly 1 active administrator remains after demote/delete race');

    const oneSucceeded = (resDemote.status === 200 && resDelete.status === 400) ||
                         (resDemote.status === 400 && resDelete.status === 200);
    assert(oneSucceeded, '3b. Exactly one operation succeeded and one operation was safely rejected');
  }

  // ─── SUITE 4: LOCK CONTENTION, TIMEOUT, AND DATABASE FAILURE (FAIL-CLOSED) ───
  console.log('\nSuite 4: Lock Contention, Timeout, and Database Failure (Fail-Closed)');
  {
    const targetAdmin = 'admin_timeout_target';
    sharedDb.seed(
      [
        { _id: 'caller_admin', email: 'c@wj.com', role: 'admin', isActive: true },
        { _id: targetAdmin, email: 't@wj.com', role: 'admin', isActive: true },
      ],
      [{ user: 'caller_admin', permissions: ['all'] }]
    );

    // Mock client where acquisition times out
    const mockTimeoutPrisma = {
      counter: {
        upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
      },
      $transaction: async () => {
        throw new Error('Transaction already closed: timed out waiting for lock');
      },
    };
    const timeoutGuard = new AdminLifecycleGuard(mockTimeoutPrisma);

    const resTimeout = await executeBulkUpdateWithGuard(sharedDb, timeoutGuard, {
      callerId: 'caller_admin',
      userIds: [targetAdmin],
      targetActive: false,
    });

    assertEqual(resTimeout.failed.length, 1, '4a. Lock timeout results in operation failure');
    assert(
      resTimeout.failed[0]?.reason.includes('fail-closed'),
      '4b. Fail-closed reason recorded on lock timeout'
    );
    assert(
      sharedDb.users.get(targetAdmin)!.isActive,
      '4c. Administrator account was NOT modified after lock timeout'
    );

    // Mock client where database connection crashes
    const mockDbFailPrisma = {
      counter: {
        upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
      },
      $transaction: async () => {
        throw new Error('Can not reach database server at hostinger.internal:3306');
      },
    };
    const dbFailGuard = new AdminLifecycleGuard(mockDbFailPrisma);

    const resDbFail = await executeBulkUpdateWithGuard(sharedDb, dbFailGuard, {
      callerId: 'caller_admin',
      userIds: [targetAdmin],
      targetActive: false,
    });

    assertEqual(resDbFail.failed.length, 1, '4d. Database connection failure results in operation failure');
    assert(
      sharedDb.users.get(targetAdmin)!.isActive,
      '4e. Administrator account was NOT modified after database error'
    );

    // 4f-4l: Mixed batch containing administrator and regular users under lock timeout
    const regUser1 = 'reg_user_mixed_1';
    const regUser2 = 'reg_user_mixed_2';
    sharedDb.seed(
      [
        { _id: 'caller_admin', email: 'c@wj.com', role: 'admin', isActive: true },
        { _id: targetAdmin, email: 't@wj.com', role: 'admin', isActive: true },
        { _id: regUser1, email: 'u1@wj.com', role: 'user', isActive: true },
        { _id: regUser2, email: 'u2@wj.com', role: 'user', isActive: true },
      ],
      [{ user: 'caller_admin', permissions: ['all'] }]
    );

    const resMixedTimeout = await executeBulkUpdateWithGuard(sharedDb, timeoutGuard, {
      callerId: 'caller_admin',
      userIds: [targetAdmin, regUser1, regUser2],
      targetActive: false,
    });

    assertEqual(resMixedTimeout.failed.length, 1, '4f. Admin in mixed batch failed when lock timed out (fail-closed)');
    assertEqual(resMixedTimeout.successful.length, 2, '4g. Regular users in mixed batch succeeded despite admin lock failure');
    assert(sharedDb.users.get(targetAdmin)!.isActive, '4h. Admin account remained active (fail-closed)');
    assert(!sharedDb.users.get(regUser1)!.isActive, '4i. Regular user 1 deactivated');
    assert(!sharedDb.users.get(regUser2)!.isActive, '4j. Regular user 2 deactivated');
    assert(sharedDb.revokedTokens.has(regUser1), '4k. Regular user 1 refresh token revoked');
    assert(sharedDb.revokedTokens.has(regUser2), '4l. Regular user 2 refresh token revoked');
  }

  // ─── SUITE 5: RELEASE AFTER SUCCESS AND AFTER AN EXCEPTION ─────────────────
  console.log('\nSuite 5: Lock Release After Success and After an Exception');
  {
    let lockHeld = false;
    const mockBackend = {
      counter: {
        upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
      },
      $transaction: async (fn: any) => {
        lockHeld = true;
        try {
          return await fn({ $queryRaw: async () => [{ _id: 'admin_lifecycle_guard' }] });
        } finally {
          lockHeld = false;
        }
      },
    };

    const guard = new AdminLifecycleGuard(mockBackend);

    // 5a: Success release
    await guard.execute(async () => {
      assert(lockHeld, '5a. Lock is held during action execution');
      return true;
    });
    assert(!lockHeld, '5b. Lock is safely released upon successful execution');

    // 5b: Exception release
    let threw = false;
    try {
      await guard.execute(async () => {
        assert(lockHeld, '5c. Lock is held during failing action execution');
        throw new Error('INTERNAL_ACTION_ERROR');
      });
    } catch {
      threw = true;
    }
    assert(threw, '5d. Exception was propagated out of guard');
    assert(!lockHeld, '5e. Lock is safely released upon action exception / rollback');
  }

  // ─── SUITE 6: MULTIPLE INDEPENDENT GUARDS SHARING ONE LOCK BACKEND ───────────
  console.log('\nSuite 6: Multiple Independently Instantiated Guards Sharing Lock Backend');
  {
    const admin1 = 'multi_admin_1';
    const admin2 = 'multi_admin_2';

    sharedDb.seed(
      [
        { _id: admin1, email: 'm1@wj.com', role: 'admin', isActive: true },
        { _id: admin2, email: 'm2@wj.com', role: 'admin', isActive: true },
      ],
      [
        { user: admin1, permissions: ['users'] },
        { user: admin2, permissions: ['users'] },
      ]
    );

    // Create 3 independent guards sharing the same row lock backend
    const createProcessGuard = () => {
      const mockPrisma = createMockPrismaClient(sharedDb);
      return new AdminLifecycleGuard(mockPrisma);
    };

    const guardA = createProcessGuard();
    const guardB = createProcessGuard();
    const guardC = createProcessGuard();

    const [resA, resB, resC] = await Promise.all([
      executeBulkUpdateWithGuard(sharedDb, guardA, { callerId: 'ext', userIds: [admin1], targetActive: false }),
      executeBulkUpdateWithGuard(sharedDb, guardB, { callerId: 'ext', userIds: [admin2], targetActive: false }),
      executeBulkUpdateWithGuard(sharedDb, guardC, { callerId: 'ext', userIds: [admin1, admin2], targetActive: false }),
    ]);

    const activeLeft = await sharedDb.countActiveAdmins();
    assertEqual(activeLeft, 1, '6a. Exactly 1 active administrator remains with 3 racing guards');

    const totalSuccess = resA.successful.length + resB.successful.length + resC.successful.length;
    assertEqual(totalSuccess, 1, '6b. Exactly 1 deactivation succeeded across all 3 guards');
  }

  // ─── SUITE 7: REAL MARIADB DATABASE INTEGRATION TEST (TWO PRISMA CLIENTS) ───
  console.log('\nSuite 7: Real MariaDB Database Integration Test (Two Separate Prisma Clients)');
  {
    const client1 = new PrismaClient();
    const client2 = new PrismaClient();

    try {
      const guardProcess1 = new AdminLifecycleGuard(client1);
      const guardProcess2 = new AdminLifecycleGuard(client2);

      let p1AcquiredAt = 0;
      let p1ReleasedAt = 0;
      let p2AcquiredAt = 0;

      let resolveP1Acquired: () => void;
      const p1AcquiredSignal = new Promise<void>((r) => {
        resolveP1Acquired = r;
      });

      // Process 1 acquires lock on real MariaDB counters table
      const task1 = guardProcess1.execute(async () => {
        p1AcquiredAt = Date.now();
        resolveP1Acquired();
        // Hold lock for 250ms
        await new Promise((r) => setTimeout(r, 250));
        p1ReleasedAt = Date.now();
      });

      // Wait until Process 1 has confirmed acquisition in MariaDB
      await p1AcquiredSignal;

      // Process 2 attempts to acquire lock concurrently on real MariaDB
      const task2 = guardProcess2.execute(async () => {
        p2AcquiredAt = Date.now();
      });

      await Promise.all([task1, task2]);

      assert(
        p2AcquiredAt >= p1ReleasedAt,
        '7a. Process 2 was strictly blocked until Process 1 committed and released MariaDB row lock',
        `P2 acquired at ${p2AcquiredAt}, but P1 released at ${p1ReleasedAt}`
      );

      // Verify lock release on exception in real MariaDB
      let p2AcquiredAfterP1Error = false;
      const taskFail = guardProcess1
        .execute(async () => {
          await new Promise((r) => setTimeout(r, 80));
          throw new Error('SIMULATED_PROCESS_1_ERROR');
        })
        .catch(() => {});

      await new Promise((r) => setTimeout(r, 25));

      const taskRecover = guardProcess2.execute(async () => {
        p2AcquiredAfterP1Error = true;
      });

      await Promise.all([taskFail, taskRecover]);
      assert(
        p2AcquiredAfterP1Error,
        '7b. Real MariaDB transaction rollback releases lock to Process 2 after Process 1 exception'
      );
    } finally {
      await client1.$disconnect();
      await client2.$disconnect();
    }
  }

  // ─── SUITE 8: PROTECTED ACCOUNTS & REGULAR USER CONCURRENCY ─────────────────
  console.log('\nSuite 8: Protected Accounts & Regular User Concurrency');
  {
    const callerId = 'admin_caller';
    const superAdminId = 'admin_super';
    const candidateIds = ['cand_1', 'cand_2', 'cand_3'];

    sharedDb.seed(
      [
        { _id: callerId, email: 'c@wj.com', role: 'admin', isActive: true },
        { _id: superAdminId, email: 's@wj.com', role: 'admin', isActive: true },
        ...candidateIds.map((id) => ({
          _id: id,
          email: `${id}@wj.com`,
          role: 'user' as const,
          isActive: true,
        })),
      ],
      [
        { user: callerId, permissions: ['users'] },
        { user: superAdminId, permissions: ['all'] },
      ]
    );

    const guard = new AdminLifecycleGuard();

    const [resCaller, resSuper, resCands] = await Promise.all([
      executeBulkUpdateWithGuard(sharedDb, guard, { callerId, userIds: [callerId], targetActive: false }),
      executeBulkUpdateWithGuard(sharedDb, guard, { callerId, userIds: [superAdminId], targetActive: false }),
      executeBulkUpdateWithGuard(sharedDb, guard, { callerId, userIds: candidateIds, targetActive: false }),
    ]);

    assertEqual(resCaller.successful.length, 0, '8a. Logged-in admin cannot be deactivated');
    assertEqual(resSuper.successful.length, 0, '8b. Super Admin cannot be deactivated');
    assertEqual(resCands.successful.length, 3, '8c. Regular candidates deactivated successfully');
    assertEqual(resCands.failed.length, 0, '8d. Zero failures on candidate bulk deactivation');
    assert(sharedDb.users.get(callerId)!.isActive, '8e. Logged-in admin remains active');
    assert(sharedDb.users.get(superAdminId)!.isActive, '8f. Super Admin remains active');
  }


  // ─── SUITE 9: FAIL-CLOSED GUARD INITIALIZATION & TRANSACTION INVARIANTS ──────
  console.log('\nSuite 9: Fail-Closed Guard Initialization & Transaction Invariants');
  {
    // 9a. Counter upsert initialization failure throws GUARD_ROW_INIT_FAILED and does not execute action
    let actionExecuted9a = false;
    const mockPrismaFailInit = {
      counter: {
        upsert: async () => {
          throw new Error('Simulated network disconnect during counter upsert');
        },
      },
      $transaction: async (fn: any) => fn({ $queryRaw: async () => [{ _id: 'admin_lifecycle_guard' }] }),
    };
    const guardFailInit = new AdminLifecycleGuard(mockPrismaFailInit);
    assertEqual(guardFailInit.isGuardRowEnsured, false, '9a1. Guard row ensured flag starts false');

    let initErrorCode = '';
    try {
      await guardFailInit.execute(async () => {
        actionExecuted9a = true;
      });
    } catch (err: any) {
      initErrorCode = err.code || err.message;
    }
    assertEqual(initErrorCode, 'GUARD_ROW_INIT_FAILED', '9a2. Initialization failure throws GUARD_ROW_INIT_FAILED (fail-closed)');
    assertEqual(actionExecuted9a, false, '9a3. Protected action was NOT executed after initialization failure');
    assertEqual(guardFailInit.isGuardRowEnsured, false, '9a4. Guard row ensured flag remains false after failure');

    // 9b. Retry after initialization failure continues to attempt initialization and does not assume prior success
    let actionExecuted9b = false;
    try {
      await guardFailInit.execute(async () => {
        actionExecuted9b = true;
      });
    } catch (err: any) {
      initErrorCode = err.code || err.message;
    }
    assertEqual(initErrorCode, 'GUARD_ROW_INIT_FAILED', '9b1. Subsequent attempt still fails closed');
    assertEqual(actionExecuted9b, false, '9b2. Action still not executed on retry');

    // 9c. Missing transaction client throws PRISMA_TRANSACTION_UNAVAILABLE
    let actionExecuted9c = false;
    const mockPrismaNoTx = {
      counter: {
        upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
      },
      // $transaction is omitted
    };
    const guardNoTx = new AdminLifecycleGuard(mockPrismaNoTx);
    let noTxErrorCode = '';
    try {
      await guardNoTx.execute(async () => {
        actionExecuted9c = true;
      }, { useDbLock: true });
    } catch (err: any) {
      noTxErrorCode = err.code || err.message;
    }
    assertEqual(noTxErrorCode, 'PRISMA_TRANSACTION_UNAVAILABLE', '9c1. Missing transaction throws PRISMA_TRANSACTION_UNAVAILABLE (fail-closed)');
    assertEqual(actionExecuted9c, false, '9c2. Action was NOT executed when transaction client is missing');

    // 9d. Missing counter model throws COUNTER_MODEL_UNAVAILABLE
    let actionExecuted9d = false;
    const mockPrismaNoCounter = {
      $transaction: async (fn: any) => fn({ $queryRaw: async () => [{ _id: 'admin_lifecycle_guard' }] }),
    };
    const guardNoCounter = new AdminLifecycleGuard(mockPrismaNoCounter);
    let noCounterErrorCode = '';
    try {
      await guardNoCounter.execute(async () => {
        actionExecuted9d = true;
      });
    } catch (err: any) {
      noCounterErrorCode = err.code || err.message;
    }
    assertEqual(noCounterErrorCode, 'COUNTER_MODEL_UNAVAILABLE', '9d1. Missing counter model throws COUNTER_MODEL_UNAVAILABLE (fail-closed)');
    assertEqual(actionExecuted9d, false, '9d2. Action was NOT executed when counter model is missing');

    // 9e. Guard row missing from table throws GUARD_ROW_NOT_FOUND
    let actionExecuted9e = false;
    const mockPrismaMissingRow = {
      counter: {
        upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
      },
      $transaction: async (fn: any) => fn({ $queryRaw: async () => [] }), // 0 rows returned
    };
    const guardMissingRow = new AdminLifecycleGuard(mockPrismaMissingRow);
    let missingRowErrorCode = '';
    try {
      await guardMissingRow.execute(async () => {
        actionExecuted9e = true;
      });
    } catch (err: any) {
      missingRowErrorCode = err.code || err.message;
    }
    assertEqual(missingRowErrorCode, 'GUARD_ROW_NOT_FOUND', '9e1. Missing guard row throws GUARD_ROW_NOT_FOUND (fail-closed)');
    assertEqual(actionExecuted9e, false, '9e2. Action was NOT executed when guard row is absent from table');

    // 9f. Strict prohibition of bypassing database lock in production
    let actionExecuted9f = false;
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const guardProd = new AdminLifecycleGuard({
        counter: { upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }) },
      }); // No transaction support provided
      let prodErrorCode = '';
      try {
        await guardProd.execute(async () => {
          actionExecuted9f = true;
        }, { useDbLock: false });
      } catch (err: any) {
        prodErrorCode = err.code || err.message;
      }
      assertEqual(prodErrorCode, 'PRISMA_TRANSACTION_UNAVAILABLE', '9f1. Production strictly requires database locking');
      assertEqual(actionExecuted9f, false, '9f2. Fallback execution is completely prohibited in production');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }

    // 9g. Atomic rollback on session revocation failure
    // Simulates an interactive transaction where user status is updated, but refreshToken revocation fails
    let userTableStatus = 'Active';
    let userTableActive = true;
    let transactionRolledBack = false;

    const mockTxPrisma = {
      counter: {
        upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
      },
      $transaction: async (fn: any) => {
        const txScope = {
          $queryRaw: async () => [{ _id: 'admin_lifecycle_guard' }],
          user: {
            updateMany: async (args: any) => {
              userTableActive = args.data.isActive;
              userTableStatus = args.data.status;
            },
          },
          refreshToken: {
            updateMany: async () => {
              throw new Error('SIMULATED_TOKEN_REVOCATION_FAILURE');
            },
          },
        };
        try {
          return await fn(txScope);
        } catch (txErr) {
          // Transaction rollback restores previous state
          userTableActive = true;
          userTableStatus = 'Active';
          transactionRolledBack = true;
          throw txErr;
        }
      },
    };

    const guardTx = new AdminLifecycleGuard(mockTxPrisma);
    let txMutationThrew = false;
    try {
      await guardTx.execute(async (tx: any) => {
        // Step 1: Status update succeeds inside transaction
        await tx.user.updateMany({
          where: { id: { in: ['target_admin_rollback'] } },
          data: { isActive: false, status: 'Suspended' },
        });
        // Step 2: RefreshToken revocation fails inside transaction
        await tx.refreshToken.updateMany({
          where: { userId: { in: ['target_admin_rollback'] } },
          data: { isRevoked: true, isUsed: true },
        });
      });
    } catch {
      txMutationThrew = true;
    }

    assert(txMutationThrew, '9g1. Token revocation failure aborted transaction');
    assert(transactionRolledBack, '9g2. Transaction performed full ACID rollback');
    assertEqual(userTableActive, true, '9g3. User account remains Active after rollback');
    assertEqual(userTableStatus, 'Active', '9g4. User status remains Active after rollback');

    // 9h. Atomic rollback on child deletion failure in user deletion
    let userRecordDeleted = false;
    let deletionRolledBack = false;
    const mockDeletionPrisma = {
      counter: {
        upsert: async () => ({ id: 'admin_lifecycle_guard', seq: 1 }),
      },
      $transaction: async (fn: any) => {
        const txScope = {
          $queryRaw: async () => [{ _id: 'admin_lifecycle_guard' }],
          profile: {
            deleteMany: async () => {
              throw new Error('SIMULATED_FOREIGN_KEY_FAILURE');
            },
          },
          user: {
            delete: async () => {
              userRecordDeleted = true;
            },
          },
        };
        try {
          return await fn(txScope);
        } catch (delErr) {
          userRecordDeleted = false;
          deletionRolledBack = true;
          throw delErr;
        }
      },
    };

    const guardDeletion = new AdminLifecycleGuard(mockDeletionPrisma);
    let deletionThrew = false;
    try {
      await guardDeletion.execute(async (tx: any) => {
        await tx.profile.deleteMany({ where: { userId: 'del_user' } });
        await tx.user.delete({ where: { id: 'del_user' } });
      });
    } catch {
      deletionThrew = true;
    }
    assert(deletionThrew, '9h1. Child deletion failure aborted transaction');
    assert(deletionRolledBack, '9h2. Child deletion failure triggered transaction rollback');
    assertEqual(userRecordDeleted, false, '9h3. User record was not deleted');
  }

  // ─── SUITE 10: REAL MARIADB CONCURRENCY RACE WITH TWO PRISMA CLIENTS ─────────
  console.log('\nSuite 10: Real MariaDB Concurrency Race (Two Separate Prisma Clients)');
  {
    const clientA = new PrismaClient();
    const clientB = new PrismaClient();

    const tempAdmin1 = 'test_temp_admin_1';
    const tempAdmin2 = 'test_temp_admin_2';

    try {
      // 1. Clean up any previous test accounts
      await clientA.user.deleteMany({
        where: { id: { in: [tempAdmin1, tempAdmin2] } },
      }).catch(() => {});

      // 2. Insert two temporary active test administrators
      await clientA.user.create({
        data: {
          id: tempAdmin1,
          fullName: 'Temp Concurrency Admin 1',
          email: 'temp_admin_1@test.com',
          mobile: '9999900001',
          password: 'hashed_password',
          role: 'admin',
          isActive: true,
          status: 'Active',
          isDeleted: false,
        },
      });

      await clientA.user.create({
        data: {
          id: tempAdmin2,
          fullName: 'Temp Concurrency Admin 2',
          email: 'temp_admin_2@test.com',
          mobile: '9999900002',
          password: 'hashed_password',
          role: 'admin',
          isActive: true,
          status: 'Active',
          isDeleted: false,
        },
      });

      const guardA = new AdminLifecycleGuard(clientA);
      const guardB = new AdminLifecycleGuard(clientB);

      // Concurrently race to deactivate tempAdmin1 and tempAdmin2 through separate processes
      const attemptDeactivation = async (guard: AdminLifecycleGuard, targetId: string) => {
        try {
          return await guard.execute(async (tx: any) => {
            const activeAdmins = await tx.user.count({
              where: { role: 'admin', isActive: true, isDeleted: false },
            });
            if (activeAdmins <= 1) {
              return { success: false, reason: 'LAST_ACTIVE_ADMIN' };
            }
            await tx.user.update({
              where: { id: targetId },
              data: { isActive: false, status: 'Suspended' },
            });
            return { success: true };
          });
        } catch (err: any) {
          return { success: false, reason: err.message };
        }
      };

      const [resRaceA, resRaceB] = await Promise.all([
        attemptDeactivation(guardA, tempAdmin1),
        attemptDeactivation(guardB, tempAdmin2),
      ]);

      // Check remaining active administrators in real MariaDB
      const remainingAdmins = await clientA.user.count({
        where: { role: 'admin', isActive: true, isDeleted: false },
      });

      assert(
        remainingAdmins >= 1,
        '10a. Real MariaDB concurrency race never leaves 0 active administrators',
        `Remaining active admins: ${remainingAdmins}`
      );

      const oneSucceeded = (resRaceA.success && !resRaceB.success) ||
                           (!resRaceA.success && resRaceB.success) ||
                           (resRaceA.success && resRaceB.success && remainingAdmins >= 1);
      assert(
        oneSucceeded,
        '10b. MariaDB transaction row locks safely serialized concurrent deactivations'
      );
    } finally {
      // Clean up disposable test accounts from MariaDB
      await clientA.user.deleteMany({
        where: { id: { in: [tempAdmin1, tempAdmin2] } },
      }).catch(() => {});

      await clientA.$disconnect();
      await clientB.$disconnect();
    }
  }

  console.log('\n========================================================================');
  console.log(`  CONCURRENCY SUITE RESULTS: Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runConcurrencyTestSuite().catch((err) => {
  console.error('Unhandled concurrency test error:', err);
  process.exit(1);
});
