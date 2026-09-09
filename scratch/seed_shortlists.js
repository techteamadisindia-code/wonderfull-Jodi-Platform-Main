const mongoose = require('mongoose');

async function seedShortlists() {
  await mongoose.connect('mongodb://localhost:27017/wonderfuljodi');
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({ role: 'user' }).toArray();
  const profiles = await db.collection('profiles').find().toArray();

  console.log(`Found ${users.length} users and ${profiles.length} profiles.`);

  // Create unique pairs
  let createdCount = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    // Bookmark 1-3 profiles for each user (avoiding their own profile)
    for (let j = 0; j < profiles.length; j++) {
      const profile = profiles[j];
      if (String(profile.user) === String(user._id)) continue;

      // Check if already exists
      const existing = await db.collection('shortlists').findOne({ user: user._id, profile: profile._id });
      if (!existing) {
        // Create with realistic varied dates over the past 30 days
        const daysAgo = (i * 2 + j * 3) % 25;
        const bookmarkDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - (j * 3600000));

        await db.collection('shortlists').insertOne({
          user: user._id,
          profile: profile._id,
          createdAt: bookmarkDate,
          updatedAt: bookmarkDate,
        });
        createdCount++;
      }
    }
  }

  const total = await db.collection('shortlists').countDocuments();
  console.log(`Successfully created ${createdCount} new shortlists. Total shortlists in DB now: ${total}`);

  await mongoose.disconnect();
}

seedShortlists().catch(console.error);
