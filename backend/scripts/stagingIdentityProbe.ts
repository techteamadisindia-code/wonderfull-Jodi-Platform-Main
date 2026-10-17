/**
 * Wonderful Jodi — Read-Only Staging Identity Probe
 *
 * PURPOSE:
 * Performs an explicit, manually approved read-only identity verification of
 * the provisioned staging database BEFORE running migrations or integration tests.
 *
 * SAFETY GUARDS:
 * 1. Requires developer confirmation flag: `--confirm-staging-preflight`.
 * 2. Runs validateStagingDatabaseUrl() pre-flight guard before any socket opens.
 * 3. Never mutates, locks, drops, or alters any database objects.
 * 4. Strictly queries read-only session identity (@@hostname, DATABASE(), CURRENT_USER(), VERSION()).
 * 5. Compares live server identity against developer-approved allowlist and expected staging names.
 * 6. Never displays passwords, tokens, or raw secrets.
 *
 * USAGE (Manual execution ONLY after staging database is provisioned):
 *   npx dotenv -e backend/.env.staging -- ts-node backend/scripts/stagingIdentityProbe.ts --confirm-staging-preflight
 */

import {
  validateStagingDatabaseUrl,
  verifyServerIdentity,
  ServerIdentityInfo,
  IdentityVerificationResult,
} from '../src/utils/stagingGuard';

export {
  verifyServerIdentity,
  ServerIdentityInfo,
  IdentityVerificationResult,
};

async function runStagingIdentityProbe() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  WONDERFUL JODI — STAGING DATABASE IDENTITY PROBE');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Step 1: Explicit Developer Confirmation Guard
  const hasConfirmation =
    process.argv.includes('--confirm-staging-preflight') ||
    process.env.STAGING_PREFLIGHT_CONFIRMED === 'true';
  if (!hasConfirmation) {
    console.error('❌ SAFETY HALT: Manual developer confirmation flag is required.');
    console.error('Run this probe only after provisioning your staging database with:');
    console.error('  npx dotenv -e backend/.env.staging -- ts-node backend/scripts/stagingIdentityProbe.ts --confirm-staging-preflight\n');
    process.exit(1);
  }

  // Step 2: Validate Staging Connection URL (Fail-Closed)
  const dbUrl = process.env.DATABASE_URL;
  const validation = validateStagingDatabaseUrl(dbUrl);

  if (!validation.isValid) {
    console.error(`❌ STAGING GUARD REJECTED: ${validation.error}\n`);
    if (validation.sanitizedDetails) {
      console.error('  Configured Protocol:', validation.sanitizedDetails.protocol);
      console.error('  Configured Host:    ', validation.sanitizedDetails.hostname);
      console.error('  Configured Port:    ', validation.sanitizedDetails.port);
      console.error('  Configured DB:      ', validation.sanitizedDetails.database);
    }
    process.exit(1);
  }

  console.log('Step 1: Connection URL preflight passed isolation checks:');
  console.log(`  Protocol: ${validation.sanitizedDetails?.protocol}`);
  console.log(`  Host:     ${validation.sanitizedDetails?.hostname}`);
  console.log(`  Port:     ${validation.sanitizedDetails?.port}`);
  console.log(`  Database: ${validation.sanitizedDetails?.database}`);
  console.log(`  User:     ${validation.sanitizedDetails?.username}\n`);

  // Step 3: Connect using bounded timeout and query read-only server identity
  console.log('Step 2: Connecting to probe server identity...');

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: ['error'],
  });

  try {
    const probeTimeoutMs = 5000;
    let timerId: NodeJS.Timeout | undefined;
    const queryPromise = prisma.$queryRaw<Array<ServerIdentityInfo>>`SELECT @@hostname as server_host, DATABASE() as db_name, CURRENT_USER() as db_user, VERSION() as db_version;`;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(
        () => reject(new Error(`Connection probe timed out after ${probeTimeoutMs}ms`)),
        probeTimeoutMs
      );
    });

    let result: Array<ServerIdentityInfo>;
    try {
      result = await Promise.race([queryPromise, timeoutPromise]);
    } finally {
      if (timerId) clearTimeout(timerId);
    }

    const info = result?.[0];

    if (!info) {
      throw new Error('Server returned an empty identity response.');
    }

    console.log('Step 3: Live database identity received:');
    console.log(`  Server Hostname:  ${info.server_host}`);
    console.log(`  Active Database:  ${info.db_name}`);
    console.log(`  Connected User:   ${info.db_user}`);
    console.log(`  Database Version: ${info.db_version}\n`);

    // Step 4: Validate live server responses against staging constraints
    const verification = verifyServerIdentity(info);
    if (!verification.isValid) {
      console.error(`❌ IDENTITY MISMATCH: ${verification.error}`);
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('════════════════════════════════════════════════════════════════');
    console.log('  ✅ STAGING DATABASE IDENTITY POSITIVELY VERIFIED & ISOLATED');
    console.log('════════════════════════════════════════════════════════════════\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Probe connection failed: ${err?.message || err}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

// Only execute when run directly from command line
if (require.main === module) {
  runStagingIdentityProbe().catch((err) => {
    console.error('Fatal probe error:', err);
    process.exit(1);
  });
}
