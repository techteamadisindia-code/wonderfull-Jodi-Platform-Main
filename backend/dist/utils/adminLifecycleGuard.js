"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLifecycleMutex = exports.defaultAdminLifecycleGuard = exports.AdminLifecycleGuard = exports.AdminLifecycleMutex = exports.AdminLifecycleLockError = void 0;
exports.withAdminLifecycleGuard = withAdminLifecycleGuard;
const client_1 = require("../db/client");
/**
 * Custom error thrown when administrator lifecycle lock acquisition fails or times out.
 */
class AdminLifecycleLockError extends Error {
    constructor(message, code = 'ADMIN_LIFECYCLE_LOCK_ERROR') {
        super(message);
        this.name = 'AdminLifecycleLockError';
        this.code = code;
    }
}
exports.AdminLifecycleLockError = AdminLifecycleLockError;
/**
 * Asynchronous In-Process Mutex Queue.
 * Serializes critical administrator lifecycle operations within a single process
 * so local concurrent requests do not compete for multiple database pool connections.
 */
class AdminLifecycleMutex {
    constructor() {
        this.queue = [];
        this.locked = false;
    }
    async acquire(timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            let timer = null;
            const enter = () => {
                if (timer)
                    clearTimeout(timer);
                this.locked = true;
                let released = false;
                resolve(() => {
                    if (released)
                        return;
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
            }
            else {
                timer = setTimeout(() => {
                    const idx = this.queue.indexOf(enter);
                    if (idx !== -1) {
                        this.queue.splice(idx, 1);
                    }
                    reject(new AdminLifecycleLockError('Timed out acquiring in-process administrator lifecycle mutex (fail-closed)', 'LOCK_TIMEOUT'));
                }, timeoutMs);
                this.queue.push(enter);
            }
        });
    }
    get isLocked() {
        return this.locked;
    }
    get queueLength() {
        return this.queue.length;
    }
}
exports.AdminLifecycleMutex = AdminLifecycleMutex;
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
class AdminLifecycleGuard {
    constructor(prismaClient) {
        this.guardRowEnsured = false;
        this.inProcessMutex = new AdminLifecycleMutex();
        this.prismaInstance = prismaClient;
    }
    getPrisma() {
        return this.prismaInstance || client_1.prisma;
    }
    /**
     * Fail-closed guard initialization.
     * Ensures the singleton guard row exists in the physical 'counters' table.
     * Never swallows errors and never sets guardRowEnsured = true on failure.
     */
    async ensureGuardRow(client) {
        if (this.guardRowEnsured)
            return;
        if (!client?.counter || typeof client.counter.upsert !== 'function') {
            throw new AdminLifecycleLockError('Database lock initialization failed: Counter model is unavailable in Prisma client (fail-closed)', 'COUNTER_MODEL_UNAVAILABLE');
        }
        try {
            await client.counter.upsert({
                where: { id: 'admin_lifecycle_guard' },
                update: {},
                create: { id: 'admin_lifecycle_guard', seq: 1 },
            });
            this.guardRowEnsured = true;
        }
        catch (err) {
            this.guardRowEnsured = false;
            throw new AdminLifecycleLockError(`Database lock initialization failed: unable to ensure guard row in counters table (fail-closed): ${err?.message || ''}`, 'GUARD_ROW_INIT_FAILED');
        }
    }
    get isGuardRowEnsured() {
        return this.guardRowEnsured;
    }
    async execute(action, options = {}) {
        const { timeoutMs = 10000, maxWaitMs = 5000, useDbLock = true } = options;
        const client = this.getPrisma();
        // In production or when useDbLock is true, database locking is STRICTLY REQUIRED
        const isProduction = process.env.NODE_ENV === 'production';
        const requireDatabaseLock = useDbLock || isProduction;
        if (requireDatabaseLock) {
            if (!client || typeof client.$transaction !== 'function') {
                throw new AdminLifecycleLockError('Database locking is required for administrator lifecycle operations, but Prisma transaction client is unavailable (fail-closed)', 'PRISMA_TRANSACTION_UNAVAILABLE');
            }
        }
        // 1. Acquire in-process mutex to sequence local requests within this process instance
        let releaseLocalMutex = null;
        try {
            releaseLocalMutex = await this.inProcessMutex.acquire(timeoutMs);
            // 2. Acquire cross-process database transaction lock (MariaDB InnoDB row lock)
            if (requireDatabaseLock && client && typeof client.$transaction === 'function') {
                await this.ensureGuardRow(client);
                return await client.$transaction(async (tx) => {
                    // Take exclusive X-lock on the singleton guard row across all database connections and processes
                    const rows = await tx.$queryRaw `SELECT _id FROM counters WHERE _id = 'admin_lifecycle_guard' FOR UPDATE`;
                    if (!rows || rows.length === 0) {
                        throw new AdminLifecycleLockError('Cross-process database lock failed: guard row "admin_lifecycle_guard" not found in counters table (fail-closed)', 'GUARD_ROW_NOT_FOUND');
                    }
                    // Execute the protected administrator count-check-and-mutation, passing active transaction tx
                    return await action(tx);
                }, {
                    timeout: timeoutMs,
                    maxWait: maxWaitMs,
                });
            }
            else {
                // Fallback for mocked unit tests (STRICTLY PROHIBITED in production)
                if (isProduction) {
                    throw new AdminLifecycleLockError('Bypassing database locking is strictly prohibited in production environments (fail-closed)', 'PRODUCTION_LOCK_BYPASS_PROHIBITED');
                }
                return await action();
            }
        }
        catch (err) {
            if (err instanceof AdminLifecycleLockError) {
                throw err;
            }
            if (err?.code === 'P2028' ||
                err?.message?.includes('Transaction already closed') ||
                err?.message?.includes('timed out') ||
                err?.message?.includes('Lock wait timeout')) {
                throw new AdminLifecycleLockError(`Timed out acquiring cross-process administrator lifecycle lock (fail-closed): ${err?.message || ''}`, 'LOCK_TIMEOUT');
            }
            throw err;
        }
        finally {
            if (releaseLocalMutex) {
                releaseLocalMutex();
            }
        }
    }
    get mutex() {
        return this.inProcessMutex;
    }
}
exports.AdminLifecycleGuard = AdminLifecycleGuard;
exports.defaultAdminLifecycleGuard = new AdminLifecycleGuard();
exports.adminLifecycleMutex = exports.defaultAdminLifecycleGuard.mutex;
async function withAdminLifecycleGuard(action, options = {}) {
    return exports.defaultAdminLifecycleGuard.execute(action, options);
}
//# sourceMappingURL=adminLifecycleGuard.js.map