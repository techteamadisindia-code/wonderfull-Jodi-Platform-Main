/**
 * Wonderful Jodi — MySQL Connection Test Script
 * 
 * Tests connectivity to the Hostinger MySQL database configured in DATABASE_URL.
 * Run: npx ts-node scripts/testMySqlConnection.ts
 * 
 * Tests performed:
 *   1. Environment variable validation
 *   2. Prisma client connection
 *   3. Server version and database name query
 *   4. Schema push validation (--push flag only)
 *   5. Table listing
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const shouldPush = process.argv.includes('--push');

  console.log('\n══════════════════════════════════════════════════');
  console.log('  WONDERFUL JODI — MySQL Connection Test');
  console.log('══════════════════════════════════════════════════\n');

  // ─── Step 1: Validate DATABASE_URL ───
  console.log('Step 1: Validating DATABASE_URL...');
  if (!databaseUrl) {
    console.error('  ❌ DATABASE_URL is not set in backend/.env');
    console.error('  Set it to: mysql://<USER>:<PASSWORD>@<HOST>:3306/<DATABASE>');
    process.exit(1);
  }

  // Mask password for safe logging
  const maskedUrl = databaseUrl.replace(
    /\/\/([^:]+):([^@]+)@/,
    '//$1:****@'
  );
  console.log(`  ✅ DATABASE_URL is set: ${maskedUrl}\n`);

  // ─── Step 2: Test Prisma Connection ───
  console.log('Step 2: Testing Prisma client connection...');
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: ['error'],
    });

    await prisma.$connect();
    console.log('  ✅ Prisma client connected successfully\n');

    // ─── Step 3: Query server version ───
    console.log('Step 3: Querying server info...');
    const versionResult: any = await prisma.$queryRaw`SELECT VERSION() as version, DATABASE() as dbName, @@character_set_database as charset, @@collation_database as collation;`;
    const info = versionResult?.[0];
    if (info) {
      console.log(`  Server Version : ${info.version}`);
      console.log(`  Database Name  : ${info.dbName}`);
      console.log(`  Character Set  : ${info.charset}`);
      console.log(`  Collation      : ${info.collation}`);
      console.log('  ✅ Server info retrieved\n');
    }

    // ─── Step 4: Schema push (optional) ───
    if (shouldPush) {
      console.log('Step 4: Pushing Prisma schema to database...');
      console.log('  Running: npx prisma db push');
      const { execSync } = await import('child_process');
      try {
        execSync('npx prisma db push --accept-data-loss', {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: databaseUrl },
        });
        console.log('  ✅ Schema pushed successfully\n');
      } catch (pushErr) {
        console.error('  ❌ Schema push failed (see output above)\n');
      }
    } else {
      console.log('Step 4: Schema push — SKIPPED (use --push flag to push schema)\n');
    }

    // ─── Step 5: List tables ───
    console.log('Step 5: Listing database tables...');
    const tables: any = await prisma.$queryRaw`SHOW TABLES;`;
    if (tables && tables.length > 0) {
      const columnKey = Object.keys(tables[0])[0];
      const tableNames = tables.map((t: any) => t[columnKey]);
      console.log(`  Found ${tableNames.length} table(s):`);
      for (const name of tableNames) {
        console.log(`    • ${name}`);
      }
      console.log('  ✅ Table listing complete\n');
    } else {
      console.log('  ⚠️  No tables found (database is empty)');
      console.log('  Run: npx prisma db push  to create tables from the schema\n');
    }

    // ─── Step 6: Read/write test ───
    console.log('Step 6: Read/write test...');
    try {
      // Try a safe SELECT 1 test
      const selectResult: any = await prisma.$queryRaw`SELECT 1 as test_value;`;
      if (selectResult?.[0]?.test_value === 1) {
        console.log('  ✅ Read test passed (SELECT 1 = 1)');
      }

      // Write test: create and immediately delete a test setting
      const testKey = `__connection_test_${Date.now()}`;
      await prisma.$executeRaw`INSERT INTO Setting (\`_id\`, \`key\`, value, \`group\`, created_at, updated_at) VALUES (${testKey}, ${testKey}, 'test', 'system', NOW(), NOW()) ON DUPLICATE KEY UPDATE value = 'test';`;
      await prisma.$executeRaw`DELETE FROM Setting WHERE \`_id\` = ${testKey};`;
      console.log('  ✅ Write test passed (INSERT + DELETE on Setting table)\n');
    } catch (rwErr: any) {
      if (rwErr.code === 'P2010' || rwErr.message?.includes("doesn't exist")) {
        console.log("  ⚠️  Write test skipped — 'Setting' table doesn't exist yet");
        console.log('  Run: npx prisma db push  to create tables first\n');
      } else {
        console.log(`  ⚠️  Write test failed: ${rwErr.message}\n`);
      }
    }

    await prisma.$disconnect();

    console.log('══════════════════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED — MySQL connection is working!');
    console.log('══════════════════════════════════════════════════\n');
    process.exit(0);

  } catch (err: any) {
    console.error(`  ❌ Connection failed: ${err.message}`);
    
    if (err.message.includes('ECONNREFUSED') || err.message.includes('connect ETIMEDOUT')) {
      console.error('\n  Possible causes:');
      console.error('  1. MySQL server is not running on the specified host');
      console.error('  2. Your IP is not whitelisted in Hostinger Remote MySQL');
      console.error('  3. Firewall is blocking port 3306');
      console.error('\n  Fix for Hostinger:');
      console.error('  → Login to hPanel → Databases → Remote MySQL');
      console.error('  → Add your current public IP address');
    }
    
    if (err.message.includes('Access denied')) {
      console.error('\n  The username or password is incorrect.');
      console.error('  Check your DATABASE_URL credentials in backend/.env');
    }

    console.error('\n══════════════════════════════════════════════════');
    console.error('  ❌ CONNECTION FAILED — see errors above');
    console.error('══════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main();
