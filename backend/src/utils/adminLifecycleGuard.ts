import { prisma } from '../db/client';

/**
 * Custom error thrown when administrator lifecycle lock acquisition fails or times out.
 */
export class AdminLifecycleLockError extends Error {
  code: string;

  constructor(message: string, code = 'ADMIN_LIFECYCLE_LOCK_ERROR') {
    super(message);
    this.name = 'AdminLifecycleLockError';
    this.code = code;
  }
}

/**
 * Asynchronous In-Process Mutex Queue.
 * Serializes critical administrator lifecycle operations within a single process
 * so local concurrent requests do not compete for multiple database pool connections.
 */
export class AdminLifecycleMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(timeoutMs = 10000): Promise<() => void> {
    return new Promise<() => void>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const enter = () => {
        if (timer) clearTimeout(timer);
        this.locked = true;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.locked = false;
          const next = this.queue.shift();
          if (next) {
            next();
          }
        });
      };

      if (!this.locked) {
        enter();
      } else {
        timer = setTimeout(() => {
          const idx = this.queue.indexOf(enter);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
          }
          reject(
            new AdminLifecycleLockError(
              'Timed out acquiring in-process administrator lifecycle mutex (fail-closed)',
              'LOCK_TIMEOUT'
            )
          );
        }, timeoutMs);

        this.queue.push(enter);
      }
    });
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get queueLength(): number {
    return this.queue.length;
  }
}

export interface AdminLifecycleGuardOptions {
  timeoutMs?: number;
  maxWaitMs?: number;
  useDbLock?: boolean;
}

/**
 * Cross-Process Administrator Lifecycle Guard.
 *
 * Combines:
 * 1. An in-process FIFO mutex to sequence concurrent requests inside the same Node.js instance.
 * 2. A database-level transaction row lock (`SELECT _id FROM counters WHERE _id = 'admin_lifecycle_guard' FOR UPDATE`)
 *    in MariaDB/MySQL. This lock is held across all connections and separate Node.js processes for the
 *    ENTIRE duration of the count-check-and-mutation critical section.
 * 3. Passes the active transaction `tx` to the guarded action so child mutations can participate
 *    in the same atomic ACID transaction.
 * 4. Automatic lock release on transaction commit, rollback on error, timeout, or process disconnect.
 * 5. Strict fail-closed semantics: if the database lock cannot be acquired or initialized,
 *    no administrators are modified.
 */
export class AdminLifecycleGuard {
  private inProcessMutex: AdminLifecycleMutex;
  private prismaInstance: any;
  private guardRowEnsured = false;

  constructor(prismaClient?: any) {
    this.inProcessMutex = new AdminLifecycleMutex();
    this.prismaInstance = prismaClient;
  }

  private getPrisma() {
    return this.prismaInstance || prisma;
  }

  /**
   * Fail-closed guard initialization.
   * Ensures the singleton guard row exists in the physical 'counters' table.
   * Never swallows errors and never sets guardRowEnsured = true on failure.
   */
  async ensureGuardRow(client: any): Promise<void> {
    if (this.guardRowEnsured) return;

    if (!client?.counter || typeof client.counter.upsert !== 'function') {
      throw new AdminLifecycleLockError(
        'Database lock initialization failed: Counter model is unavailable in Prisma client (fail-closed)',
        'COUNTER_MODEL_UNAVAILABLE'
      );
    }

    try {
      await client.counter.upsert({
        where: { id: 'admin_lifecycle_guard' },
        update: {},
        create: { id: 'admin_lifecycle_guard', seq: 1 },
      });
      this.guardRowEnsured = true;
    } catch (err: any) {
      this.guardRowEnsured = false;
      throw new AdminLifecycleLockError(
        `Database lock initialization failed: unable to ensure guard row in counters table (fail-closed): ${err?.message || ''}`,
        'GUARD_ROW_INIT_FAILED'
      );
    }
  }

  get isGuardRowEnsured(): boolean {
    return this.guardRowEnsured;
  }

  async execute<T>(
    action: (tx?: any) => Promise<T>,
    options: AdminLifecycleGuardOptions = {}
  ): Promise<T> {
    const { timeoutMs = 10000, maxWaitMs = 5000, useDbLock = true } = options;
    const client = this.getPrisma();

    // In production or when useDbLock is true, database locking is STRICTLY REQUIRED
    const isProduction = process.env.NODE_ENV === 'production';
    const requireDatabaseLock = useDbLock || isProduction;

    if (requireDatabaseLock) {
      if (!client || typeof client.$transaction !== 'function') {
        throw new AdminLifecycleLockError(
          'Database locking is required for administrator lifecycle operations, but Prisma transaction client is unavailable (fail-closed)',
          'PRISMA_TRANSACTION_UNAVAILABLE'
        );
      }
    }

    // 1. Acquire in-process mutex to sequence local requests within this process instance
    let releaseLocalMutex: (() => void) | null = null;
    try {
      releaseLocalMutex = await this.inProcessMutex.acquire(timeoutMs);

      // 2. Acquire cross-process database transaction lock (MariaDB InnoDB row lock)
      if (requireDatabaseLock && client && typeof client.$transaction === 'function') {
        await this.ensureGuardRow(client);

        return await client.$transaction(
          async (tx: any) => {
            // Take exclusive X-lock on the singleton guard row across all database connections and processes
            const rows: any[] = await tx.$queryRaw`SELECT _id FROM counters WHERE _id = 'admin_lifecycle_guard' FOR UPDATE`;
            if (!rows || rows.length === 0) {
              throw new AdminLifecycleLockError(
                'Cross-process database lock failed: guard row "admin_lifecycle_guard" not found in counters table (fail-closed)',
                'GUARD_ROW_NOT_FOUND'
              );
            }

            // Execute the protected administrator count-check-and-mutation, passing active transaction tx
            return await action(tx);
          },
          {
            timeout: timeoutMs,
            maxWait: maxWaitMs,
          }
        );
      } else {
        // Fallback for mocked unit tests (STRICTLY PROHIBITED in production)
        if (isProduction) {
          throw new AdminLifecycleLockError(
            'Bypassing database locking is strictly prohibited in production environments (fail-closed)',
            'PRODUCTION_LOCK_BYPASS_PROHIBITED'
          );
        }
        return await action();
      }
    } catch (err: any) {
      if (err instanceof AdminLifecycleLockError) {
        throw err;
      }
      if (
        err?.code === 'P2028' ||
        err?.message?.includes('Transaction already closed') ||
        err?.message?.includes('timed out') ||
        err?.message?.includes('Lock wait timeout')
      ) {
        throw new AdminLifecycleLockError(
          `Timed out acquiring cross-process administrator lifecycle lock (fail-closed): ${err?.message || ''}`,
          'LOCK_TIMEOUT'
        );
      }
      throw err;
    } finally {
      if (releaseLocalMutex) {
        releaseLocalMutex();
      }
    }
  }

  get mutex(): AdminLifecycleMutex {
    return this.inProcessMutex;
  }
}

export const defaultAdminLifecycleGuard = new AdminLifecycleGuard();
export const adminLifecycleMutex = defaultAdminLifecycleGuard.mutex;

export async function withAdminLifecycleGuard<T>(
  action: (tx?: any) => Promise<T>,
  options: AdminLifecycleGuardOptions = {}
): Promise<T> {
  return defaultAdminLifecycleGuard.execute(action, options);
}
