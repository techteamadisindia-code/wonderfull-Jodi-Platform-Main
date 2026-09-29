import { testSqlConnection } from '../db/client';

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

export async function connectDatabase(): Promise<boolean> {
  console.log('==================================================');
  console.log('[Database] Starting database connection...');
  console.log('==================================================');

  if (!DATABASE_URL) {
    const message = '[MySQL] DATABASE_URL is not configured.';
    console.error(message);
    throw new Error(message);
  }

  try {
    const sqlStatus = await testSqlConnection();

    if (!sqlStatus.success) {
      throw new Error(
        sqlStatus.message || 'Failed to connect to MySQL database'
      );
    }

    console.log('--------------------------------------------------');
    console.log(`[MySQL] ✅ ${sqlStatus.message}`);
    console.log('--------------------------------------------------');

    return true;
  } catch (error: any) {
    console.error('--------------------------------------------------');
    console.error('[MySQL] ❌ Database connection failed');
    console.error('[MySQL] Error:', error?.message || error);
    console.error('--------------------------------------------------');

    throw error;
  }
}
