import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/wonderfuljodi';

export async function connectDatabase() {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2000,
    });
    console.log('MongoDB connected successfully');
    return conn;
  } catch (err) {
    console.warn('Local MongoDB connection failed. Falling back to MongoMemoryServer...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri, { autoIndex: true });
      console.log(`In-memory MongoDB started and connected at ${uri}`);
      return conn;
    } catch (fallbackErr) {
      console.error('Failed to start in-memory MongoDB:', fallbackErr);
      throw fallbackErr;
    }
  }
}

