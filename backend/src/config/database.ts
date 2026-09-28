import mongoose from 'mongoose';
import { seedInitialData } from './seed';
import { testSqlConnection, prisma } from '../db/client';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/wonderfuljodi';
const DATABASE_URL = process.env.DATABASE_URL;

export async function connectDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Verify SQL Connection if DATABASE_URL is configured
  if (DATABASE_URL) {
    try {
      const sqlStatus = await testSqlConnection();
      if (sqlStatus.success) {
        console.log(`[SQL Database] ${sqlStatus.message}`);
      } else {
        console.warn(`[SQL Database] Warning: ${sqlStatus.message}`);
        if (isProduction) {
          throw new Error(`Production SQL Database unavailable: ${sqlStatus.message}`);
        }
      }
    } catch (sqlErr: any) {
      console.error('[SQL Database] Connection error:', sqlErr.message);
      if (isProduction) {
        throw sqlErr;
      }
    }
  }

  // 2. Connect to MongoDB (Source / Transition Layer)
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2500,
    });
    console.log('[MongoDB] Connected successfully');
    await seedInitialData();
    return conn;
  } catch (err: any) {
    if (isProduction) {
      console.error('[Database Error] Production database connection failed:', err.message);
      // Safety Rule: Production must fail cleanly without in-memory fallback!
      throw new Error(`Production database connection failed: ${err.message}`);
    }

    console.warn('[MongoDB] Local MongoDB connection failed. Initializing development in-memory server...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri, { autoIndex: true });
      console.log(`[MongoDB] In-memory MongoDB started and connected at ${uri}`);
      await seedInitialData();
      return conn;
    } catch (fallbackErr) {
      console.error('Failed to start in-memory MongoDB:', fallbackErr);
      throw fallbackErr;
    }
  }
}
