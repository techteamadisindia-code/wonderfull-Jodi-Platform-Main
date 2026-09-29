import { testSqlConnection } from '../db/client';

const DATABASE_URL = process.env.DATABASE_URL;

export async function connectDatabase() {
  console.log('==================================================');
  console.log('[Database] Starting database connection...');
  console.log('==================================================');

  if (!DATABASE_URL) {
    throw new Error(
      '[MySQL] DATABASE_URL is not configured.'
    );
  }

  try {
    const sqlStatus = await testSqlConnection();

    if (!sqlStatus.success) {
      throw new Error(
        `MySQL connection failed: ${sqlStatus.message}`
      );
    }

    console.log('──────────────────────────────────────────────────');
    console.log(`[MySQL] ✅ ${sqlStatus.message}`);
    console.log('──────────────────────────────────────────────────');

    return true;

  } catch (error: any) {

    console.error('──────────────────────────────────────────────────');
    console.error('[MySQL] ❌ Database connection failed');
    console.error('[MySQL] Error:', error.message);
    console.error('──────────────────────────────────────────────────');

    throw error;
  }
}
