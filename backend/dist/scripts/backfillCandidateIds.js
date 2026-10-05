"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const Profile_1 = require("../models/Profile");
const Counter_1 = require("../models/Counter");
async function backfill() {
    console.log('Running backfill on database...');
    // Find all profiles
    const allProfiles = await Profile_1.Profile.find({}).sort({ createdAt: 1 });
    console.log(`Total profiles in database: ${allProfiles.length}`);
    let currentSeq = 100000;
    for (const profile of allProfiles) {
        if (!profile.candidateId) {
            currentSeq += 1;
            const newCandidateId = `WJ-${currentSeq}`;
            const updates = { candidateId: newCandidateId };
            if (profile.verificationStatus === 'APPROVED') {
                updates.verificationStatus = 'VERIFIED';
            }
            await Profile_1.Profile.updateOne({ _id: profile._id }, { $set: updates });
            console.log(`Assigned ${newCandidateId} to profile ${profile._id} (${profile.displayName})`);
        }
        else {
            console.log(`Profile ${profile._id} already has ${profile.candidateId} (${profile.displayName})`);
            // parse seq if matching WJ-XXXXXX
            const match = profile.candidateId.match(/WJ-(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > currentSeq)
                    currentSeq = num;
            }
        }
    }
    // Update counter in DB
    await Counter_1.Counter.findByIdAndUpdate('candidateId', { seq: currentSeq }, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`Backfill complete. Counter updated to ${currentSeq}.`);
    const updatedProfiles = await Profile_1.Profile.find({}).select('_id candidateId displayName');
    for (const p of updatedProfiles) {
        console.log(`- ${p.candidateId}: ${p.displayName} (_id: ${p._id})`);
    }
    console.log('Finished.');
}
backfill().catch((err) => {
    console.error('Backfill error:', err);
    process.exit(1);
});
//# sourceMappingURL=backfillCandidateIds.js.map