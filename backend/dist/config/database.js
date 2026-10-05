"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
const client_1 = require("../db/client");
/**
 * Production database connection
 *
 * Production:
 *   MySQL / MariaDB through Prisma only
 *
 * MongoDB is no longer required for application startup.
 * Legacy MongoDB migration code can remain elsewhere.
 */
const DATABASE_URL = process.env.DATABASE_URL;
async function connectDatabase() {
    console.log('==================================================');
    console.log('[Database] Starting database connection...');
    console.log('==================================================');
    if (!DATABASE_URL) {
        const message = '[MySQL] DATABASE_URL is not configured.';
        console.error(message);
        throw new Error(message);
    }
    try {
        const sqlStatus = await (0, client_1.testSqlConnection)();
        if (!sqlStatus.success) {
            throw new Error(sqlStatus.message || 'Failed to connect to MySQL database');
        }
        console.log('--------------------------------------------------');
        console.log(`[MySQL] ✅ ${sqlStatus.message}`);
        console.log('--------------------------------------------------');
        return true;
    }
    catch (error) {
        console.error('--------------------------------------------------');
        console.error('[MySQL] ❌ Database connection failed');
        console.error('[MySQL] Error:', error?.message || error);
        console.error('--------------------------------------------------');
        throw error;
    }
}
//# sourceMappingURL=database.js.map