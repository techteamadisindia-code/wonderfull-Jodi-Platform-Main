import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
<<<<<<< HEAD
import { seedInitialData } from './seed';
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/wonderfuljodi';

export async function connectDatabase() {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2000,
    });
    console.log('MongoDB connected successfully');
<<<<<<< HEAD
    await seedInitialData();
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    return conn;
  } catch (err) {
    console.warn('Local MongoDB connection failed. Falling back to MongoMemoryServer...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri, { autoIndex: true });
      console.log(`In-memory MongoDB started and connected at ${uri}`);
<<<<<<< HEAD
      await seedInitialData();
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
      return conn;
    } catch (fallbackErr) {
      console.error('Failed to start in-memory MongoDB:', fallbackErr);
      throw fallbackErr;
    }
  }
}

<<<<<<< HEAD

=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
