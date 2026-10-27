/**
 * audit_profile_data_integrity.ts
 *
 * READ-ONLY data integrity audit utility.
 *
 * STRICT SAFETY GUARANTEES:
 * 1. ZERO write, update, delete, or bulk-update operations are performed.
 * 2. Uses the repository's active MySQL / Prisma database client.
 * 3. Never prints database credentials, passwords, or connection strings.
 * 4. Masks all personal contact details (email: p***@domain.com, mobile: +91*****1234).
 * 5. Does NOT classify a value as false solely because it matches a plausible name.
 *    Uses provenance, fixture identities, and corroborating context.
 * 6. Where provenance cannot be established, classifies records as REVIEW_REQUIRED, not FAKE.
 *
 * Checks Performed:
 * - Exact matches to known UI / demo placeholders (e.g. MCI-REG-847291, AIIMS, Apollo Hospitals).
 * - Former schema defaults (horoscope.manglik = 'Non-Manglik', currentlyPracticing = true).
 * - Conflicts between flat legacy fields and structured nested fields (familyBackground, medicalQualifications).
 * - Flagging records associated with known demo fixtures.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/src/scripts/audit_profile_data_integrity.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Synthetic test fixture identifiers that are impossible in real life
export const SYNTHETIC_TEST_IDENTIFIERS = {
  medicalRegistrationNumber: ['MCI-REG-847291', 'KMC-2019-74892'],
} as const;

// Plausible real-world names that were mistakenly used as hardcoded UI fallback defaults
export const PLAUSIBLE_UI_FALLBACKS = {
  medicalCouncil: ['Medical Council of India (MCI)', 'Karnataka Medical Council / MCI'],
  medicalCollege: ['AIIMS', 'AIIMS New Delhi'],
  medicalUniversity: ['All India Institute of Medical Sciences'],
  currentHospital: ['Apollo Hospitals', 'Apollo Hospitals, Bengaluru'],
  additionalQualification: ['Fellowship in Aesthetic Med', 'Fellowship in Dermatosurgery, 2021'],
  experience: ['7+ Years Experience', '6+ Years Experience'],
  workType: ['Full-time Specialist', 'Full-Time Consultant'],
  fatherOccupation: ['Retired Government Officer', 'Senior Administrative Officer (Retd.)'],
  motherOccupation: ['Homemaker', 'College Professor'],
  siblings: ['1 Brother (Married), 1 Sister', '1 Younger Brother (Radiologist)'],
  familyStatus: ['Upper Middle Class'],
  familyValues: ['Moderate / Traditional', 'Moderate'],
  manglik: ['Non-Manglik'],
} as const;

// Former schema defaults
export const FORMER_SCHEMA_DEFAULTS = {
  manglik: 'Non-Manglik',
  currentlyPracticing: true,
  preferredAgeMin: 24,
  preferredAgeMax: 36,
  preferredLocation: 'Anywhere in India',
  preferredQualification: 'MBBS / MD / MS / Medical Specialist',
  preferredSpecialization: 'Any Medical Specialization',
  preferredMaritalStatus: 'Never Married',
} as const;

// Known demo-seed emails to identify sample test fixtures
export const DEMO_FIXTURE_EMAILS = new Set([
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
  'rahul.sharma99@example.com',
  'neha.kulkarni@example.com',
  'aditya.kapoor@example.com',
  'admin@wonderfuljodi.com',
]);

export type FindingClassification =
  | 'DEMO_FIXTURE'
  | 'EXACT_PLACEHOLDER_MATCH'
  | 'LIKELY_SCHEMA_DEFAULT'
  | 'CONFLICT_FLAT_VS_NESTED'
  | 'REVIEW_REQUIRED'
  | 'CLEAN';

export interface AuditFinding {
  field: string;
  sourceLocation: string;
  currentValue: unknown;
  conflictingValue?: unknown;
  classification: FindingClassification;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ProfileAuditResult {
  profileId: string;
  candidateId: string | null;
  maskedUserEmail: string | null;
  isDemoFixture: boolean;
  overallClassification: FindingClassification;
  classificationReasons: string[];
  triggeringFields: string[];
  practiceStatusFinding?: 'REVIEW_REQUIRED' | 'LIKELY_SCHEMA_DEFAULT' | 'NONE';
  astrologyStatusFinding?: 'LIKELY_SCHEMA_DEFAULT' | 'NONE';
  findings: AuditFinding[];
}

export interface AuditSummaryReport {
  generatedAt: string;
  environment: string;
  isReadOnly: true;
  targetDatabase: {
    host: string;
    databaseName: string;
  };
  totalProfilesScanned: number;
  demoFixturesFound: number;
  realProfilesAudited: number;
  classifiedClean: number;
  classifiedLikelyDefault: number;
  classifiedExactPlaceholder: number;
  classifiedConflicts: number;
  classifiedReviewRequired: number;
  practiceStatusFindingsCount: {
    reviewRequiredWithContext: number;
    likelyDefaultWithoutContext: number;
  };
  astrologyFindingsCount: {
    suspectedManglikDefault: number;
  };
  results: ProfileAuditResult[];
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}`;
  return `${maskedName}@${domain}`;
}

export function maskRegistrationNumber(regNum: unknown): string | null {
  if (!regNum || typeof regNum !== 'string') return null;
  const s = regNum.trim();
  if (s.length <= 4) return '***';
  if (s.length <= 8) return `${s.slice(0, 2)}***${s.slice(-2)}`;
  return `${s.slice(0, 3)}-***-${s.slice(-3)}`;
}

export function getSafeDatabaseTargetInfo(urlStr?: string): {
  targetHost: string;
  targetDatabase: string;
  maskedUrl: string;
} {
  const rawUrl = urlStr || process.env.AUDIT_DATABASE_URL || process.env.DATABASE_URL || '';
  try {
    const u = new URL(rawUrl);
    const targetHost = `${u.hostname}${u.port ? `:${u.port}` : ''}`;
    const targetDatabase = u.pathname.replace(/^\//, '');
    const maskedUrl = `${u.protocol}//***:***@${targetHost}/${targetDatabase}${u.search ? '?...' : ''}`;
    return { targetHost, targetDatabase, maskedUrl };
  } catch {
    return { targetHost: 'unknown', targetDatabase: 'unknown', maskedUrl: '[INVALID_OR_EMPTY_DATABASE_URL]' };
  }
}

/**
 * Evaluates whether a candidate profile contains relevant employment,
 * clinical practice, company, role, profession, or qualification context.
 */
export function extractEmploymentContext(profile: Record<string, any>): {
  hasEmploymentContext: boolean;
  populatedFields: string[];
} {
  const populatedFields: string[] = [];

  const flatFieldDefs: Array<{ name: string; val: unknown }> = [
    { name: 'currentHospital', val: profile.currentHospital },
    { name: 'currentRole', val: profile.currentRole },
    { name: 'workType', val: profile.workType },
    { name: 'medicalExperience', val: profile.medicalExperience },
    { name: 'company', val: profile.company },
    { name: 'profession', val: profile.profession },
    { name: 'workLocation', val: profile.workLocation },
  ];

  for (const { name, val } of flatFieldDefs) {
    if (typeof val === 'string' && val.trim().length > 0) {
      populatedFields.push(name);
    }
  }

  // Check structured medical qualification fields in schema
  const medQuals = profile.medicalQualifications;
  if (medQuals && typeof medQuals === 'object') {
    const ug = Array.isArray(medQuals.undergraduate) ? medQuals.undergraduate : [];
    const pg = Array.isArray(medQuals.postgraduate) ? medQuals.postgraduate : [];
    const doc = Array.isArray(medQuals.doctorate) ? medQuals.doctorate : [];
    if (ug.length > 0 || pg.length > 0 || doc.length > 0) {
      populatedFields.push('medicalQualifications');
    }
  }

  return {
    hasEmploymentContext: populatedFields.length > 0,
    populatedFields,
  };
}

export function auditSingleProfile(profile: any, userEmail?: string | null): ProfileAuditResult {
  const findings: AuditFinding[] = [];
  const isDemoFixture = Boolean(userEmail && DEMO_FIXTURE_EMAILS.has(userEmail.toLowerCase()));

  if (isDemoFixture) {
    findings.push({
      field: 'user.email',
      sourceLocation: 'users.email',
      currentValue: maskEmail(userEmail),
      classification: 'DEMO_FIXTURE',
      reason: 'Belongs to known sample seed fixture dataset.',
      confidence: 'HIGH',
    });
  }

  // 1. Horoscope Manglik audit
  let astrologyStatusFinding: 'LIKELY_SCHEMA_DEFAULT' | 'NONE' = 'NONE';
  const horoscope = (profile.horoscope || {}) as Record<string, any>;
  const manglikVal = horoscope.manglik;
  const hasCorroboratingHoroscope = Boolean(
    horoscope.rashi || horoscope.nakshatra || horoscope.lagna || horoscope.timeOfBirth || horoscope.placeOfBirth
  );

  if (manglikVal === FORMER_SCHEMA_DEFAULTS.manglik) {
    if (!hasCorroboratingHoroscope) {
      // Non-Manglik with zero astrological corroboration -> suspected former schema default
      astrologyStatusFinding = 'LIKELY_SCHEMA_DEFAULT';
      findings.push({
        field: 'horoscope.manglik',
        sourceLocation: 'profiles.horoscope.manglik',
        currentValue: manglikVal,
        classification: 'LIKELY_SCHEMA_DEFAULT',
        reason: 'Value is "Non-Manglik" with zero other astrological context; suspected former schema default. Requires manual verification before concluding data is inaccurate.',
        confidence: 'MEDIUM',
      });
    }
  }

  // 2. Currently Practicing audit
  let practiceStatusFinding: 'REVIEW_REQUIRED' | 'LIKELY_SCHEMA_DEFAULT' | 'NONE' = 'NONE';
  if (profile.currentlyPracticing === true) {
    const { hasEmploymentContext, populatedFields } = extractEmploymentContext(profile);
    if (hasEmploymentContext) {
      // Relevant employment context exists (e.g. currentHospital, currentRole, workType,
      // medicalExperience, company, profession, workLocation, or medicalQualifications).
      // Classify the record for manual review rather than implying that the value is a schema-default artifact.
      // Do NOT classify the profile as verified merely because its fields are populated.
      practiceStatusFinding = 'REVIEW_REQUIRED';
      findings.push({
        field: 'currentlyPracticing',
        sourceLocation: 'profiles.currentlyPracticing',
        currentValue: true,
        classification: 'REVIEW_REQUIRED',
        reason: `Practice status is true with associated employment/professional context present (${populatedFields.join(', ')}). Manual verification recommended to confirm active clinical practice.`,
        confidence: 'LOW',
      });
    } else {
      // Practice status is true and all relevant employment, role, company, and qualification context is absent.
      // Reserve likely-default classification for this case, describing it as a suspicion, not proof that the candidate's data is false.
      practiceStatusFinding = 'LIKELY_SCHEMA_DEFAULT';
      findings.push({
        field: 'currentlyPracticing',
        sourceLocation: 'profiles.currentlyPracticing',
        currentValue: true,
        classification: 'LIKELY_SCHEMA_DEFAULT',
        reason: 'Practice status is true while all relevant employment, hospital, role, company, profession, and qualification context is absent; suspected former schema default. Requires manual verification before concluding data is inaccurate.',
        confidence: 'MEDIUM',
      });
    }
  }

  // 3. Synthetic placeholder check (e.g. MCI-REG-847291)
  if (typeof profile.medicalRegistrationNumber === 'string') {
    const reg = profile.medicalRegistrationNumber.trim().toUpperCase();
    if (SYNTHETIC_TEST_IDENTIFIERS.medicalRegistrationNumber.some((syn) => syn.toUpperCase() === reg)) {
      findings.push({
        field: 'medicalRegistrationNumber',
        sourceLocation: 'profiles.medicalRegistrationNumber',
        currentValue: maskRegistrationNumber(profile.medicalRegistrationNumber),
        classification: 'EXACT_PLACEHOLDER_MATCH',
        reason: `Value matches synthetic test placeholder ID "${maskRegistrationNumber(profile.medicalRegistrationNumber)}".`,
        confidence: 'HIGH',
      });
    }
  }

  // 4. Plausible real-world names that match former UI fallbacks
  // If confirmed demo fixture: classify as DEMO_FIXTURE / EXACT_PLACEHOLDER_MATCH.
  // If real candidate: classify as REVIEW_REQUIRED (never presume fake solely for plausible hospital/college names).
  const checkPlausibleFallback = (
    field: string,
    sourceLocation: string,
    val: unknown,
    fallbackList: readonly string[]
  ) => {
    if (typeof val === 'string' && fallbackList.some((p) => p.toLowerCase() === val.trim().toLowerCase())) {
      if (isDemoFixture) {
        findings.push({
          field,
          sourceLocation,
          currentValue: val,
          classification: 'DEMO_FIXTURE',
          reason: `Demo fixture value matches known template placeholder "${val}".`,
          confidence: 'HIGH',
        });
      } else {
        // Genuine candidates may legitimately work at Apollo Hospitals or graduate from AIIMS
        findings.push({
          field,
          sourceLocation,
          currentValue: val,
          classification: 'REVIEW_REQUIRED',
          reason: `Value "${val}" matches former UI default fallback, but is a plausible real-world name. Candidate verification required.`,
          confidence: 'LOW',
        });
      }
    }
  };

  checkPlausibleFallback('medicalCouncil', 'profiles.medicalCouncil', profile.medicalCouncil, PLAUSIBLE_UI_FALLBACKS.medicalCouncil);
  checkPlausibleFallback('medicalCollege', 'profiles.medicalCollege', profile.medicalCollege, PLAUSIBLE_UI_FALLBACKS.medicalCollege);
  checkPlausibleFallback('medicalUniversity', 'profiles.medicalUniversity', profile.medicalUniversity, PLAUSIBLE_UI_FALLBACKS.medicalUniversity);
  checkPlausibleFallback('currentHospital', 'profiles.currentHospital', profile.currentHospital, PLAUSIBLE_UI_FALLBACKS.currentHospital);
  checkPlausibleFallback('additionalQualification', 'profiles.additionalQualification', profile.additionalQualification, PLAUSIBLE_UI_FALLBACKS.additionalQualification);
  checkPlausibleFallback('workType', 'profiles.workType', profile.workType, PLAUSIBLE_UI_FALLBACKS.workType);
  checkPlausibleFallback('medicalExperience', 'profiles.medicalExperience', profile.medicalExperience, PLAUSIBLE_UI_FALLBACKS.experience);
  checkPlausibleFallback('fatherOccupation', 'profiles.fatherOccupation', profile.fatherOccupation, PLAUSIBLE_UI_FALLBACKS.fatherOccupation);
  checkPlausibleFallback('motherOccupation', 'profiles.motherOccupation', profile.motherOccupation, PLAUSIBLE_UI_FALLBACKS.motherOccupation);
  checkPlausibleFallback('siblings', 'profiles.siblings', profile.siblings, PLAUSIBLE_UI_FALLBACKS.siblings);

  // 5. Conflicts between Flat and Nested Legacy Fields
  const famBg = (profile.familyBackground || {}) as Record<string, any>;
  if (profile.fatherOccupation && famBg.fatherProfession && profile.fatherOccupation.trim().toLowerCase() !== famBg.fatherProfession.trim().toLowerCase()) {
    findings.push({
      field: 'fatherOccupation',
      sourceLocation: 'profiles.fatherOccupation vs profiles.familyBackground.fatherProfession',
      currentValue: profile.fatherOccupation,
      conflictingValue: famBg.fatherProfession,
      classification: 'CONFLICT_FLAT_VS_NESTED',
      reason: 'Discrepancy between flat fatherOccupation and nested familyBackground.fatherProfession.',
      confidence: 'HIGH',
    });
  }

  if (profile.motherOccupation && famBg.motherProfession && profile.motherOccupation.trim().toLowerCase() !== famBg.motherProfession.trim().toLowerCase()) {
    findings.push({
      field: 'motherOccupation',
      sourceLocation: 'profiles.motherOccupation vs profiles.familyBackground.motherProfession',
      currentValue: profile.motherOccupation,
      conflictingValue: famBg.motherProfession,
      classification: 'CONFLICT_FLAT_VS_NESTED',
      reason: 'Discrepancy between flat motherOccupation and nested familyBackground.motherProfession.',
      confidence: 'HIGH',
    });
  }

  if (profile.familyType && famBg.familyType && profile.familyType.trim().toLowerCase() !== famBg.familyType.trim().toLowerCase()) {
    findings.push({
      field: 'familyType',
      sourceLocation: 'profiles.familyType vs profiles.familyBackground.familyType',
      currentValue: profile.familyType,
      conflictingValue: famBg.familyType,
      classification: 'CONFLICT_FLAT_VS_NESTED',
      reason: 'Discrepancy between flat familyType and nested familyBackground.familyType.',
      confidence: 'HIGH',
    });
  }

  const medQuals = (profile.medicalQualifications || {}) as Record<string, any>;
  const nestedUgCollege = medQuals.undergraduate?.[0]?.college;
  if (profile.medicalCollege && nestedUgCollege && profile.medicalCollege.trim().toLowerCase() !== nestedUgCollege.trim().toLowerCase()) {
    findings.push({
      field: 'medicalCollege',
      sourceLocation: 'profiles.medicalCollege vs profiles.medicalQualifications.undergraduate[0].college',
      currentValue: profile.medicalCollege,
      conflictingValue: nestedUgCollege,
      classification: 'CONFLICT_FLAT_VS_NESTED',
      reason: 'Discrepancy between flat medicalCollege and nested medicalQualifications undergraduate college.',
      confidence: 'HIGH',
    });
  }

  // Determine overall classification and identify triggering fields/reasons
  const { hasEmploymentContext } = extractEmploymentContext(profile);
  let overallClassification: FindingClassification = 'CLEAN';
  const triggeringFields: string[] = [];
  const classificationReasons: string[] = [];

  if (isDemoFixture) {
    overallClassification = 'DEMO_FIXTURE';
    triggeringFields.push('user.email');
    classificationReasons.push('user.email: Belongs to known sample seed fixture dataset.');
  } else if (findings.some((f) => f.classification === 'EXACT_PLACEHOLDER_MATCH')) {
    overallClassification = 'EXACT_PLACEHOLDER_MATCH';
    const matches = findings.filter((f) => f.classification === 'EXACT_PLACEHOLDER_MATCH');
    for (const m of matches) {
      triggeringFields.push(m.field);
      classificationReasons.push(`${m.field}: ${m.reason}`);
    }
  } else if (findings.some((f) => f.classification === 'CONFLICT_FLAT_VS_NESTED')) {
    overallClassification = 'CONFLICT_FLAT_VS_NESTED';
    const conflicts = findings.filter((f) => f.classification === 'CONFLICT_FLAT_VS_NESTED');
    for (const c of conflicts) {
      triggeringFields.push(c.field);
      classificationReasons.push(`${c.field}: ${c.reason}`);
    }
  } else if (findings.some((f) => f.classification === 'LIKELY_SCHEMA_DEFAULT')) {
    // There are suspected former schema default findings (e.g. horoscope.manglik or uncorroborated currentlyPracticing).
    // SEPARATION OF PRACTICE AND ASTROLOGICAL CONTEXTS:
    // If the candidate has populated employment/professional context (e.g. profession, company, role, location),
    // missing hospital or uncorroborated astrological information must NOT cause an unrelated populated
    // profession to be interpreted as false or label the overall candidate profile as a schema default artifact.
    if (hasEmploymentContext) {
      overallClassification = 'REVIEW_REQUIRED';
      for (const f of findings) {
        triggeringFields.push(f.field);
        classificationReasons.push(`${f.field}: ${f.reason}`);
      }
    } else {
      // Genuinely empty employment context with suspected schema defaults
      overallClassification = 'LIKELY_SCHEMA_DEFAULT';
      for (const f of findings) {
        triggeringFields.push(f.field);
        classificationReasons.push(`${f.field}: ${f.reason}`);
      }
    }
  } else if (findings.some((f) => f.classification === 'REVIEW_REQUIRED')) {
    overallClassification = 'REVIEW_REQUIRED';
    for (const f of findings) {
      triggeringFields.push(f.field);
      classificationReasons.push(`${f.field}: ${f.reason}`);
    }
  } else {
    overallClassification = 'CLEAN';
    classificationReasons.push('No integrity anomalies or former schema defaults detected. Note: Populated fields alone do not guarantee candidate authenticity.');
  }

  return {
    profileId: profile.id,
    candidateId: profile.candidateId || null,
    maskedUserEmail: maskEmail(userEmail),
    isDemoFixture,
    overallClassification,
    classificationReasons,
    triggeringFields,
    practiceStatusFinding,
    astrologyStatusFinding,
    findings,
  };
}

/**
 * Resolves and strictly validates the database URL for the integrity audit.
 *
 * FAIL-CLOSED PRECEDENCE:
 * 1. If explicitDbUrl is passed, it is strictly validated. If invalid, fails closed (never falls back).
 * 2. If AUDIT_DATABASE_URL environment variable is set, it is strictly validated. If invalid, fails closed.
 * 3. Falls back to DATABASE_URL. If missing or invalid, fails closed.
 */
export function resolveAuditTargetUrl(explicitDbUrl?: string): string {
  if (explicitDbUrl !== undefined && explicitDbUrl !== null && explicitDbUrl.trim() !== '') {
    const trimmed = explicitDbUrl.trim();
    try {
      const u = new URL(trimmed);
      if (!u.hostname) {
        throw new Error('Missing hostname in explicit database URL');
      }
      return trimmed;
    } catch (err: any) {
      throw new Error(`[Audit] FAIL-CLOSED: Explicit audit database URL was provided but is invalid (${err.message || err}). Refusing to fall back to default DATABASE_URL.`);
    }
  }

  if (process.env.AUDIT_DATABASE_URL && process.env.AUDIT_DATABASE_URL.trim() !== '') {
    const trimmed = process.env.AUDIT_DATABASE_URL.trim();
    try {
      const u = new URL(trimmed);
      if (!u.hostname) {
        throw new Error('Missing hostname in AUDIT_DATABASE_URL');
      }
      return trimmed;
    } catch (err: any) {
      throw new Error(`[Audit] FAIL-CLOSED: AUDIT_DATABASE_URL environment variable was provided but is invalid (${err.message || err}). Refusing to fall back to default DATABASE_URL.`);
    }
  }

  const defaultUrl = process.env.DATABASE_URL;
  if (!defaultUrl || defaultUrl.trim() === '') {
    throw new Error('[Audit] FAIL-CLOSED: No database connection URL available. Neither explicitDbUrl, AUDIT_DATABASE_URL, nor DATABASE_URL is configured.');
  }

  try {
    const u = new URL(defaultUrl.trim());
    if (!u.hostname) {
      throw new Error('Missing hostname in DATABASE_URL');
    }
    return defaultUrl.trim();
  } catch (err: any) {
    throw new Error(`[Audit] FAIL-CLOSED: Default DATABASE_URL is invalid (${err.message || err}).`);
  }
}

export function getOptimizedAuditDatabaseUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    // Audit is strictly read-only: restrict pool connection_limit to max 2 connections
    const curLimit = parseInt(u.searchParams.get('connection_limit') || '2', 10);
    if (isNaN(curLimit) || curLimit > 2) {
      u.searchParams.set('connection_limit', '2');
    }
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '30');
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set('pool_timeout', '30');
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export interface AuditClientContext {
  client: PrismaClient;
  targetInfo: {
    targetHost: string;
    targetDatabase: string;
    maskedUrl: string;
  };
  isDedicatedClient: boolean;
}

export function createAuditPrismaClient(
  explicitDbUrl?: string,
  customPrismaClient?: PrismaClient
): AuditClientContext {
  const effectiveUrl = resolveAuditTargetUrl(explicitDbUrl);
  const targetInfo = getSafeDatabaseTargetInfo(effectiveUrl);

  if (customPrismaClient) {
    return {
      client: customPrismaClient,
      targetInfo,
      isDedicatedClient: false,
    };
  }

  const optimizedUrl = getOptimizedAuditDatabaseUrl(effectiveUrl);
  const client = new PrismaClient({
    datasources: {
      db: {
        url: optimizedUrl,
      },
    },
    log: ['error'],
  });

  return {
    client,
    targetInfo,
    isDedicatedClient: true,
  };
}

export async function runProfileIntegrityAudit(
  explicitDbUrl?: string,
  customPrismaClient?: PrismaClient
): Promise<AuditSummaryReport> {
  const { client, targetInfo, isDedicatedClient } = createAuditPrismaClient(explicitDbUrl, customPrismaClient);

  try {
    console.log('[Audit] Starting read-only candidate profile data integrity audit...');
    console.log(`[Audit] Target Database Host:     ${targetInfo.targetHost}`);
    console.log(`[Audit] Target Database Name:     ${targetInfo.targetDatabase}`);
    console.log(`[Audit] Target Connection:        ${targetInfo.maskedUrl}`);
    console.log(`[Audit] Safety Guarantee:         READ-ONLY (0 mutations executed)`);

    const profiles = await client.profile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`[Audit] Total candidate profiles scanned: ${profiles.length}`);

    const results: ProfileAuditResult[] = [];
    for (const prof of profiles) {
      const res = auditSingleProfile(prof, prof.user?.email);
      results.push(res);
    }

    const summaryReport: AuditSummaryReport = {
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      isReadOnly: true,
      targetDatabase: {
        host: targetInfo.targetHost,
        databaseName: targetInfo.targetDatabase,
      },
      totalProfilesScanned: profiles.length,
      demoFixturesFound: results.filter((r) => r.isDemoFixture).length,
      realProfilesAudited: results.filter((r) => !r.isDemoFixture).length,
      classifiedClean: results.filter((r) => !r.isDemoFixture && r.overallClassification === 'CLEAN').length,
      classifiedLikelyDefault: results.filter((r) => !r.isDemoFixture && r.overallClassification === 'LIKELY_SCHEMA_DEFAULT').length,
      classifiedExactPlaceholder: results.filter((r) => !r.isDemoFixture && r.overallClassification === 'EXACT_PLACEHOLDER_MATCH').length,
      classifiedConflicts: results.filter((r) => !r.isDemoFixture && r.overallClassification === 'CONFLICT_FLAT_VS_NESTED').length,
      classifiedReviewRequired: results.filter((r) => !r.isDemoFixture && r.overallClassification === 'REVIEW_REQUIRED').length,
      practiceStatusFindingsCount: {
        reviewRequiredWithContext: results.filter((r) => !r.isDemoFixture && r.practiceStatusFinding === 'REVIEW_REQUIRED').length,
        likelyDefaultWithoutContext: results.filter((r) => !r.isDemoFixture && r.practiceStatusFinding === 'LIKELY_SCHEMA_DEFAULT').length,
      },
      astrologyFindingsCount: {
        suspectedManglikDefault: results.filter((r) => !r.isDemoFixture && r.astrologyStatusFinding === 'LIKELY_SCHEMA_DEFAULT').length,
      },
      results,
    };

    return summaryReport;
  } finally {
    if (isDedicatedClient) {
      await client.$disconnect().catch(() => {});
    }
  }
}

// Direct CLI invocation
if (require.main === module) {
  // Support optional explicit env file flag: --env-file=<path>
  const envFileArg = process.argv.find((a) => a.startsWith('--env-file='));
  if (envFileArg) {
    const envFilePath = path.resolve(process.cwd(), envFileArg.split('=')[1]);
    if (fs.existsSync(envFilePath)) {
      console.log(`[Audit] Loading explicit environment configuration from: ${envFilePath}`);
      dotenv.config({ path: envFilePath, override: true });
    } else {
      console.error(`[Audit] ERROR: Specified --env-file not found: ${envFilePath}`);
      process.exit(1);
    }
  }

  runProfileIntegrityAudit(process.env.AUDIT_DATABASE_URL)
    .then((report) => {
      const outDir = path.resolve(__dirname, 'reports');
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outPath = path.join(outDir, `profile_integrity_audit_${timestamp}.json`);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

      console.log('\n===============================================================');
      console.log('       WONDERFUL JODI — DATA INTEGRITY AUDIT REPORT');
      console.log('===============================================================');
      console.log(`Mode:                     READ-ONLY (0 mutations executed)`);
      console.log(`Timestamp:                ${report.generatedAt}`);
      console.log(`Environment:              ${report.environment}`);
      console.log(`Target Host:              ${report.targetDatabase.host}`);
      console.log(`Target Database:          ${report.targetDatabase.databaseName}`);
      console.log(`Total Profiles Scanned:   ${report.totalProfilesScanned}`);
      console.log(`Demo Fixtures Identified: ${report.demoFixturesFound}`);
      console.log(`Real Candidate Profiles:  ${report.realProfilesAudited}`);
      console.log(`---------------------------------------------------------------`);
      console.log(`Overall Candidate Profile Classifications:`);
      console.log(`  CLEAN:                  ${report.classifiedClean}`);
      console.log(`  REVIEW_REQUIRED:        ${report.classifiedReviewRequired}`);
      console.log(`  LIKELY_SCHEMA_DEFAULT:  ${report.classifiedLikelyDefault}`);
      console.log(`  CONFLICT_FLAT_VS_NESTED:${report.classifiedConflicts}`);
      console.log(`  EXACT_PLACEHOLDER_MATCH:${report.classifiedExactPlaceholder}`);
      console.log(`---------------------------------------------------------------`);
      console.log(`Separated Domain Findings:`);
      console.log(`  Practice Status:`);
      console.log(`    - Review Required (context present): ${report.practiceStatusFindingsCount.reviewRequiredWithContext}`);
      console.log(`    - Suspected Default (no context):    ${report.practiceStatusFindingsCount.likelyDefaultWithoutContext}`);
      console.log(`  Astrological Status:`);
      console.log(`    - Suspected Manglik Default:         ${report.astrologyFindingsCount.suspectedManglikDefault}`);
      console.log(`---------------------------------------------------------------`);
      console.log(`Privacy-safe JSON written to:`);
      console.log(`  ${outPath}`);
      console.log('===============================================================\n');

      process.exit(0);
    })
    .catch((err) => {
      console.error('[Audit] Fatal audit execution error:', err.message || err);
      process.exit(1);
    });
}
