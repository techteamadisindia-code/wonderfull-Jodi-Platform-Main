/**
 * audit_profile_data_integrity.ts
 *
 * READ-ONLY audit script. It does NOT write, update, or delete any record.
 *
 * Purpose: Identify Profile documents whose sensitive fields may have been set
 * by former misleading model defaults rather than genuine user-provided data.
 *
 * Affected defaults removed in fix/admin-profile-data-integrity:
 *   - horoscope.manglik         was default: 'Non-Manglik'
 *   - currentlyPracticing       was default: true
 *   - partnerPreferences.preferredAgeMin   was default: 24
 *   - partnerPreferences.preferredAgeMax   was default: 36
 *   - partnerPreferences.preferredLocation was default: 'Anywhere in India'
 *   - partnerPreferences.preferredQualification was default: 'MBBS / MD / MS / Medical Specialist'
 *   - partnerPreferences.preferredSpecialization was default: 'Any Medical Specialization'
 *   - partnerPreferences.preferredMaritalStatus  was default: 'Never Married'
 *
 * Classification:
 *   LIKELY_DEFAULT  - value exactly matches the former default AND no corroborating
 *                     data suggests the user provided it explicitly.
 *   REVIEW_REQUIRED - value matches former default but some corroborating context exists.
 *   CLEAN           - value does not match any former default, or field is absent.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/src/scripts/audit_profile_data_integrity.ts
 *
 * Output:
 *   backend/src/scripts/audit_report_<timestamp>.json
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Former defaults that should never have been silently applied ---
const FORMER_DEFAULTS = {
  manglik: 'Non-Manglik',
  currentlyPracticing: true,
  preferredAgeMin: 24,
  preferredAgeMax: 36,
  preferredLocation: 'Anywhere in India',
  preferredQualification: 'MBBS / MD / MS / Medical Specialist',
  preferredSpecialization: 'Any Medical Specialization',
  preferredMaritalStatus: 'Never Married',
} as const;

// --- Known demo-seed emails: skip these records ---
const DEMO_EMAILS = new Set([
  'priya.sharma@example.com',
  'rohan.mehta@example.com',
  'ananya.verma@example.com',
  'vikram.singh@example.com',
  'kavya.iyer@example.com',
  'siddharth.nair@example.com',
  'rajesh.kulkarni@example.com',
  'sneha.patil@example.com',
  'arjun.nambiar@example.com',
  'meera.deshmukh@example.com',
  'alok.mathur@example.com',
  'pooja.hegde@example.com',
  'admin@wonderfuljodi.com',
]);

type Classification = 'LIKELY_DEFAULT' | 'REVIEW_REQUIRED' | 'CLEAN' | 'ABSENT';

interface FieldResult {
  value: unknown;
  classification: Classification;
  note?: string;
}

interface ProfileAuditEntry {
  profileId: string;
  candidateId?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
  fields: Record<string, FieldResult>;
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

function classifyField(
  value: unknown,
  formerDefault: unknown,
  corroborating: boolean
): FieldResult {
  if (value === undefined || value === null || value === '') {
    return { value, classification: 'ABSENT' };
  }
  if (value === formerDefault) {
    if (corroborating) {
      return {
        value,
        classification: 'REVIEW_REQUIRED',
        note: 'Matches former default but corroborating context exists — verify with candidate',
      };
    }
    return {
      value,
      classification: 'LIKELY_DEFAULT',
      note: 'Exactly matches former schema default — may have been auto-populated, not entered by candidate',
    };
  }
  return { value, classification: 'CLEAN' };
}

function computeRisk(fields: Record<string, FieldResult>): ProfileAuditEntry['overallRisk'] {
  const values = Object.values(fields).map((f) => f.classification);
  if (values.includes('LIKELY_DEFAULT')) return 'HIGH';
  if (values.includes('REVIEW_REQUIRED')) return 'MEDIUM';
  return 'NONE';
}

async function runAudit() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI or DATABASE_URL not set in environment. Aborting.');
    process.exit(1);
  }

  console.log('Connecting to database (read-only audit)...');
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection not established');

  const collection = db.collection('profiles');
  const usersCollection = db.collection('users');

  const cursor = collection.find(
    {},
    {
      projection: {
        _id: 1,
        candidateId: 1,
        user: 1,
        horoscope: 1,
        currentlyPracticing: 1,
        partnerPreferences: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    }
  );

  const results: ProfileAuditEntry[] = [];
  let totalProcessed = 0;
  let totalSkippedDemo = 0;

  for await (const doc of cursor) {
    totalProcessed++;

    let userEmail: string | undefined;
    if (doc.user) {
      const userDoc = await usersCollection.findOne(
        { _id: doc.user },
        { projection: { email: 1 } }
      );
      userEmail = userDoc?.email;
    }

    const isDemo = userEmail ? DEMO_EMAILS.has(userEmail) : false;
    if (isDemo) {
      totalSkippedDemo++;
      continue;
    }

    const horoscope = doc.horoscope as Record<string, unknown> | undefined;
    const pp = doc.partnerPreferences as Record<string, unknown> | undefined;

    // Corroborating checks
    const hasOtherHoroscopeData =
      horoscope &&
      (horoscope.rashi || horoscope.nakshatra || horoscope.lagna || horoscope.timeOfBirth);

    const hasCustomPref =
      pp &&
      (pp.otherPreferences ||
        (typeof pp.preferredAgeMin === 'number' && pp.preferredAgeMin !== FORMER_DEFAULTS.preferredAgeMin) ||
        (typeof pp.preferredAgeMax === 'number' && pp.preferredAgeMax !== FORMER_DEFAULTS.preferredAgeMax));

    const fields: Record<string, FieldResult> = {
      manglik: classifyField(horoscope?.manglik, FORMER_DEFAULTS.manglik, !!hasOtherHoroscopeData),
      currentlyPracticing: classifyField(doc.currentlyPracticing, FORMER_DEFAULTS.currentlyPracticing, false),
      preferredAgeMin: classifyField(pp?.preferredAgeMin, FORMER_DEFAULTS.preferredAgeMin, !!hasCustomPref),
      preferredAgeMax: classifyField(pp?.preferredAgeMax, FORMER_DEFAULTS.preferredAgeMax, !!hasCustomPref),
      preferredLocation: classifyField(pp?.preferredLocation, FORMER_DEFAULTS.preferredLocation, !!hasCustomPref),
      preferredQualification: classifyField(pp?.preferredQualification, FORMER_DEFAULTS.preferredQualification, !!hasCustomPref),
      preferredSpecialization: classifyField(pp?.preferredSpecialization, FORMER_DEFAULTS.preferredSpecialization, !!hasCustomPref),
      preferredMaritalStatus: classifyField(pp?.preferredMaritalStatus, FORMER_DEFAULTS.preferredMaritalStatus, !!hasCustomPref),
    };

    results.push({
      profileId: String(doc._id),
      candidateId: doc.candidateId,
      userEmail,
      createdAt: doc.createdAt?.toISOString?.() ?? String(doc.createdAt),
      updatedAt: doc.updatedAt?.toISOString?.() ?? String(doc.updatedAt),
      fields,
      overallRisk: computeRisk(fields),
    });
  }

  await mongoose.disconnect();

  const summary = {
    totalProfilesScanned: totalProcessed,
    demoRecordsSkipped: totalSkippedDemo,
    realProfilesAudited: results.length,
    highRisk: results.filter((r) => r.overallRisk === 'HIGH').length,
    mediumRisk: results.filter((r) => r.overallRisk === 'MEDIUM').length,
    noRisk: results.filter((r) => r.overallRisk === 'NONE').length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    note: 'READ-ONLY report. No records were modified.',
    summary,
    formerDefaultsChecked: FORMER_DEFAULTS,
    findings: results.sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
      return (order[a.overallRisk] ?? 3) - (order[b.overallRisk] ?? 3);
    }),
  };

  const outFile = path.resolve(
    __dirname,
    `audit_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log('\nAudit Complete');
  console.log(`  Total scanned     : ${totalProcessed}`);
  console.log(`  Demo skipped      : ${totalSkippedDemo}`);
  console.log(`  Real audited      : ${results.length}`);
  console.log(`  HIGH risk         : ${summary.highRisk}`);
  console.log(`  MEDIUM risk       : ${summary.mediumRisk}`);
  console.log(`  No risk           : ${summary.noRisk}`);
  console.log(`\nReport: ${outFile}`);

  if (summary.highRisk > 0) {
    console.warn(
      `\nWARNING: ${summary.highRisk} HIGH-risk profile(s) found. ` +
        `Review the report and confirm with candidates before any correction writes.`
    );
  } else {
    console.log('\nNo HIGH-risk records found.');
  }
}

runAudit().catch((err) => {
  console.error('Audit script error:', err);
  process.exit(1);
});
