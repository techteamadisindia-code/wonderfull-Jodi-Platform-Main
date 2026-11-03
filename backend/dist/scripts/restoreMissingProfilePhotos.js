"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../config/env");
const client_1 = require("../db/client");
const profilePhotoRecoveryService_1 = require("../services/profilePhotoRecoveryService");
async function main() {
    console.log('========================================================================');
    console.log('  WONDERFUL JODI — PROFILE PHOTO RECOVERY & PERSISTENCE SCRIPT');
    console.log('========================================================================\n');
    console.log('Starting scan of all database profiles for missing photos...');
    const startTime = Date.now();
    const result = await (0, profilePhotoRecoveryService_1.restoreAllMissingProfilePhotos)();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n--- SCAN & RECOVERY SUMMARY ---');
    console.log(`  Total profiles checked:  ${result.totalProfilesChecked}`);
    console.log(`  Photos auto-restored:    ${result.restoredCount}`);
    console.log(`  Missing without backup:  ${result.skippedCount}`);
    console.log(`  Duration:                ${duration}s`);
    if (result.restoredFiles.length > 0) {
        console.log('\nRestored files written to canonical persistent storage:');
        for (const f of result.restoredFiles) {
            console.log(`  + ${f}`);
        }
    }
    console.log('\n========================================================================\n');
}
main()
    .catch((err) => {
    console.error('Fatal error during photo recovery:', err);
    process.exit(1);
})
    .finally(async () => {
    await client_1.prisma.$disconnect();
});
//# sourceMappingURL=restoreMissingProfilePhotos.js.map