import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Singleton instance of PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function getOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    // Ensure connection_limit is at most 4 to respect Hostinger's concurrent connection cap
    const currentLimit = parseInt(url.searchParams.get('connection_limit') || '10', 10);
    if (isNaN(currentLimit) || currentLimit > 4) {
      url.searchParams.set('connection_limit', '4');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '30');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const dbUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * Generate a 24-character hexadecimal ID conforming to MongoDB ObjectId format.
 * Ensures existing frontends, validation regex, and URL params remain 100% compatible.
 */
export function generateObjectId(): string {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Ensures any SQL record provides both `_id` and `id` for frontend contract compatibility.
 */
export function toClient<T extends { id?: string; _id?: string }>(record: T | null | undefined): (T & { _id: string }) | null {
  if (!record) return null;
  const id = record.id || record._id || '';
  return {
    ...record,
    _id: id,
    id: id,
  };
}

/**
 * Maps an array of records to include both `_id` and `id`.
 */
export function toClientArray<T extends { id?: string; _id?: string }>(records: T[]): (T & { _id: string })[] {
  return records.map((r) => toClient(r)!);
}

/**
 * Tests direct connection to Hostinger MySQL / MariaDB database.
 * Includes a 3-second timeout to ensure health checks never hang the process.
 */
export async function testSqlConnection(timeoutMs: number = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    const queryPromise = prisma.$queryRaw`SELECT VERSION() as version, DATABASE() as dbName;`;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database connection check timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    const result: any = await Promise.race([queryPromise, timeoutPromise]);
    const version = result?.[0]?.version || 'Unknown';
    const dbName = result?.[0]?.dbName || 'Unknown';
    return {
      success: true,
      message: `Connected successfully to database "${dbName}" (Server Version: ${version})`,
      version,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to MySQL database',
    };
  }
}
