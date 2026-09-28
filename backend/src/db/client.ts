import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Singleton instance of PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
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
 */
export async function testSqlConnection(): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    const result: any = await prisma.$queryRaw`SELECT VERSION() as version, DATABASE() as dbName;`;
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
      message: err.message || 'Failed to connect to MySQL database',
    };
  }
}
