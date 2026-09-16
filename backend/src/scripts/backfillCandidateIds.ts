import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { Profile } from '../models/Profile';
import { Counter } from '../models/Counter';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/wonderfuljodi';

async function backfill() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // Find all profiles
  const allProfiles = await Profile.find({}).sort({ createdAt: 1 });
  console.log(`Total profiles in database: ${allProfiles.length}`);

  let currentSeq = 100000;

  for (const profile of allProfiles) {
    if (!profile.candidateId) {
      currentSeq += 1;
      const newCandidateId = `WJ-${currentSeq}`;
      const updates: any = { candidateId: newCandidateId };
      if ((profile.verificationStatus as string) === 'APPROVED') {
        updates.verificationStatus = 'VERIFIED';
      }
      await Profile.updateOne({ _id: profile._id }, { $set: updates });
      console.log(`Assigned ${newCandidateId} to profile ${profile._id} (${profile.displayName})`);
    } else {
      console.log(`Profile ${profile._id} already has ${profile.candidateId} (${profile.displayName})`);
      // parse seq if matching WJ-XXXXXX
      const match = profile.candidateId.match(/WJ-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > currentSeq) currentSeq = num;
      }
    }
  }

  // Update counter in DB
  await Counter.findByIdAndUpdate(
    'candidateId',
    { seq: currentSeq },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Backfill complete. Counter updated to ${currentSeq}.`);

  const updatedProfiles = await Profile.find({}).select('_id candidateId displayName');
  for (const p of updatedProfiles) {
    console.log(`- ${p.candidateId}: ${p.displayName} (_id: ${p._id})`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

backfill().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
