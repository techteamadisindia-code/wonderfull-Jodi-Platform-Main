const mongoose = require('mongoose');

async function seedReports() {
  await mongoose.connect('mongodb://localhost:27017/wonderfuljodi');
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({ role: 'user' }).toArray();
  const profiles = await db.collection('profiles').find().toArray();
  const admin = await db.collection('users').findOne({ role: 'admin' });

  console.log(`Found ${users.length} users, ${profiles.length} profiles, and admin: ${admin?.email}`);

  const reportReasons = [
    {
      reason: 'Inappropriate behavior',
      details: 'User used abusive and unprofessional language during chat conversation.',
      targetType: 'MESSAGE',
      snippet: 'Hey call me right now at 9876543210 or I will report you.',
      status: 'PENDING',
    },
    {
      reason: 'Fake profile',
      details: 'Profile photos and credentials appear to be copied from a public influencer account.',
      targetType: 'PROFILE',
      status: 'PENDING',
    },
    {
      reason: 'Contact information sharing',
      details: 'User attempted to bypass contact unlock mechanism by obfuscating phone number in bio.',
      targetType: 'PROFILE',
      status: 'PENDING',
    },
    {
      reason: 'Harassment',
      details: 'Continued to send unsolicited messages after express decline.',
      targetType: 'USER',
      status: 'PENDING',
    },
    {
      reason: 'Spam / Commercial advertising',
      details: 'Promoting external matrimonial agent services inside direct messages.',
      targetType: 'MESSAGE',
      snippet: 'Contact our marriage bureau for guaranteed match within 7 days!',
      status: 'RESOLVED',
      resolutionNotes: 'Issued formal warning to user and purged offending commercial messages.',
      actionTaken: 'RESOLVED',
    },
    {
      reason: 'Photo violation',
      details: 'Profile photo contains third party watermarks and low quality scenery instead of candidate.',
      targetType: 'PROFILE',
      status: 'RESOLVED',
      resolutionNotes: 'Candidate uploaded new government ID verified portrait photo.',
      actionTaken: 'RESOLVED',
    },
    {
      reason: 'Inappropriate messages',
      details: 'User asked inappropriate financial questions regarding dowry.',
      targetType: 'MESSAGE',
      status: 'DISMISSED',
      resolutionNotes: 'Reviewed conversation logs; dialogue was mutual discussion on lifestyle expectations without explicit violation.',
      actionTaken: 'DISMISSED',
    },
    {
      reason: 'Impersonation',
      details: 'Claiming to work as a Senior VP at a firm where they are not employed.',
      targetType: 'PROFILE',
      status: 'DISMISSED',
      resolutionNotes: 'Candidate provided verified LinkedIn credentials and corporate email confirmation.',
      actionTaken: 'DISMISSED',
    },
  ];

  let createdCount = 0;
  for (let i = 0; i < reportReasons.length; i++) {
    const item = reportReasons[i];
    const reporter = users[i % users.length];
    const reportedUser = users[(i + 1) % users.length];
    const reportedProfile = profiles.find((p) => String(p.user) === String(reportedUser._id)) || profiles[0];

    const daysAgo = (i * 3 + 1);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const doc = {
      reporter: reporter._id,
      reportedUser: reportedUser._id,
      reportedProfile: reportedProfile?._id,
      reason: item.reason,
      details: item.details,
      description: item.details,
      status: item.status,
      targetType: item.targetType,
      messageSnippet: item.snippet,
      moderator: item.status !== 'PENDING' ? admin?._id : undefined,
      resolutionNotes: item.resolutionNotes,
      actionTaken: item.actionTaken || 'NONE',
      resolvedAt: item.status !== 'PENDING' ? new Date(createdAt.getTime() + 3600000) : undefined,
      createdAt: createdAt,
      updatedAt: createdAt,
    };

    await db.collection('reports').insertOne(doc);
    createdCount++;
  }

  const total = await db.collection('reports').countDocuments();
  console.log(`Seeded ${createdCount} diverse reports. Total reports in DB now: ${total}`);

  await mongoose.disconnect();
}

seedReports().catch(console.error);
