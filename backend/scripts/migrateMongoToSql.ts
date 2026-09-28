/**
 * Wonderful Jodi Doctor Matrimony Platform
 * Standalone MongoDB to MySQL/MariaDB Migration Tool
 *
 * Usage:
 *   npx ts-node scripts/migrateMongoToSql.ts [--dry-run] [--batch-size=500]
 *
 * Environment variables:
 *   MONGODB_URI - Source MongoDB connection string (e.g. mongodb://localhost:27017/wonderfuljodi)
 *   DATABASE_URL - Target MySQL / MariaDB connection string (e.g. mysql://user:pass@host:3306/db)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { prisma } from '../src/db/client';

// Load environment variables
dotenv.config();

// CLI Arguments
const isDryRun = process.argv.includes('--dry-run');
const batchSizeArg = process.argv.find((a) => a.startsWith('--batch-size='));
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 250;

// Import all Mongoose Models
import { User } from '../src/models/User';
import { Admin } from '../src/models/Admin';
import { Profile } from '../src/models/Profile';
import { Registration } from '../src/models/Registration';
import { MembershipPlan } from '../src/models/MembershipPlan';
import { Subscription } from '../src/models/Subscription';
import { Payment } from '../src/models/Payment';
import { Interest } from '../src/models/Interest';
import { Shortlist } from '../src/models/Shortlist';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { Notification } from '../src/models/Notification';
import { Verification } from '../src/models/Verification';
import { PasswordResetToken } from '../src/models/PasswordResetToken';
import { RefreshToken } from '../src/models/RefreshToken';
import { AuditLog } from '../src/models/AuditLog';
import { SecurityLog } from '../src/models/SecurityLog';
import { Block } from '../src/models/Block';
import { Report } from '../src/models/Report';
import { ContactInquiry } from '../src/models/ContactInquiry';
import { ContactRequest } from '../src/models/ContactRequest';
import { ContactAccessLog } from '../src/models/ContactAccessLog';
import { Campaign } from '../src/models/Campaign';
import { Coupon } from '../src/models/Coupon';
import { CouponRedemption } from '../src/models/CouponRedemption';
import { Referral } from '../src/models/Referral';
import { ReferralRewardConfig } from '../src/models/ReferralRewardConfig';
import { ReferralRewardRecord } from '../src/models/ReferralRewardRecord';
import { Setting } from '../src/models/Setting';
import { Broadcast } from '../src/models/Broadcast';
import { DailyUserVisit } from '../src/models/DailyUserVisit';
import { Award } from '../src/models/Award';
import { BlogPost } from '../src/models/BlogPost';
import { JobOpening } from '../src/models/JobOpening';
import { JobApplication } from '../src/models/JobApplication';
import { Biodata } from '../src/models/Biodata';
import { Institution } from '../src/models/Institution';
import { KundaliReport } from '../src/models/KundaliReport';
import { Country, State, District, SubDistrict, City, Village } from '../src/models/Location';
import { LocationImport } from '../src/models/LocationImport';
import { Language, Religion, Caste, SubCaste } from '../src/models/CommunityMaster';
import { Counter } from '../src/models/Counter';

interface CollectionMigrationStats {
  collection: string;
  sourceCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'SKIPPED';
}

const statsReport: CollectionMigrationStats[] = [];

function getId(doc: any): string {
  if (!doc) return '';
  if (typeof doc === 'string') return doc;
  if (doc._id) return String(doc._id);
  if (doc.id) return String(doc.id);
  return String(doc);
}

function safeDate(val: any, fallback: Date = new Date()): Date {
  if (!val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d;
}

function safeJson(val: any): any {
  if (val === undefined || val === null) return null;
  return JSON.parse(JSON.stringify(val));
}

async function migrateCollection<T>(
  name: string,
  fetchFn: () => Promise<T[]>,
  importFn: (doc: T) => Promise<void>
) {
  process.stdout.write(`Migrating [${name}]... `);
  const stats: CollectionMigrationStats = {
    collection: name,
    sourceCount: 0,
    importedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    status: 'SUCCESS',
  };

  try {
    const docs = await fetchFn();
    stats.sourceCount = docs.length;

    if (docs.length === 0) {
      console.log(`0 records found. Skipped.`);
      stats.status = 'SKIPPED';
      statsReport.push(stats);
      return;
    }

    if (isDryRun) {
      console.log(`[DRY-RUN] ${docs.length} records verified.`);
      stats.importedCount = docs.length;
      statsReport.push(stats);
      return;
    }

    // Process in batches
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      for (const doc of batch) {
        try {
          await importFn(doc);
          stats.importedCount++;
        } catch (err: any) {
          stats.failedCount++;
          // Never log sensitive data
          console.error(`\n  ✗ Error importing record in ${name}:`, err.message || err);
        }
      }
    }

    if (stats.failedCount > 0) {
      stats.status = stats.importedCount > 0 ? 'WARNING' : 'FAILED';
    }

    console.log(`Done (${stats.importedCount}/${stats.sourceCount} imported, ${stats.failedCount} errors)`);
  } catch (err: any) {
    stats.status = 'FAILED';
    stats.failedCount = stats.sourceCount;
    console.log(`FAILED: ${err.message || err}`);
  }

  statsReport.push(stats);
}

export async function runMigration() {
  console.log('================================================================');
  console.log('  WONDERFUL JODI: MONGODB TO HOSTINGER MYSQL MIGRATION TOOL     ');
  console.log('================================================================');
  console.log(`Mode:        ${isDryRun ? 'DRY-RUN (Validation only)' : 'LIVE IMPORT'}`);
  console.log(`Batch Size:  ${BATCH_SIZE}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'MISSING'}`);
  console.log(`MySQL URL:   ${process.env.DATABASE_URL ? 'Configured' : 'MISSING'}`);
  console.log('----------------------------------------------------------------\n');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required.');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  // 1. Connect to MongoDB
  console.log('Connecting to source MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB.\n');

  // 2. Verify Target SQL Connection
  console.log('Verifying target MySQL / MariaDB connection...');
  if (!isDryRun) {
    await prisma.$queryRaw`SELECT 1;`;
    console.log('✓ Connected to MySQL database.\n');
  } else {
    console.log('✓ [DRY-RUN] Target connection verification skipped.\n');
  }

  const startTime = Date.now();

  // ─────────────────────────────────────────────────────────────
  // STAGE 1: INDEPENDENT & SYSTEM MASTER DATA
  // ─────────────────────────────────────────────────────────────
  console.log('--- STAGE 1: SYSTEM & CONFIGURATION ---');

  await migrateCollection('Counters', () => Counter.find().lean(), async (doc: any) => {
    await prisma.counter.upsert({
      where: { id: getId(doc) },
      update: { seq: doc.seq || 100000 },
      create: { id: getId(doc), seq: doc.seq || 100000 },
    });
  });

  await migrateCollection('Settings', () => Setting.find().lean(), async (doc: any) => {
    await prisma.setting.upsert({
      where: { id: getId(doc) },
      update: {
        siteName: doc.siteName || 'Wonderful Jodi',
        supportEmail: doc.supportEmail || 'support@wonderfuljodi.com',
        supportPhone: doc.supportPhone || '+91 096075 59547',
        tollFreeNumber: doc.tollFreeNumber || '+91 096075 59547',
        officeAddress: doc.officeAddress || '',
        maintenanceMode: !!doc.maintenanceMode,
        maintenanceBanner: !!doc.maintenanceBanner,
        maintenanceTitle: doc.maintenanceTitle || "We'll Be Back Soon",
        maintenanceMessage: doc.maintenanceMessage || '',
        maintenanceEstimatedEndTime: doc.maintenanceEstimatedEndTime ? new Date(doc.maintenanceEstimatedEndTime) : null,
        allowAdminAccess: doc.allowAdminAccess !== false,
        maintenanceUpdatedBy: doc.maintenanceUpdatedBy || '',
        allowNewRegistrations: doc.allowNewRegistrations !== false,
        requireEmailVerification: !!doc.requireEmailVerification,
        requireManualProfileApproval: doc.requireManualProfileApproval !== false,
        currency: doc.currency || 'INR',
        razorpayLiveMode: !!doc.razorpayLiveMode,
        minAgeMale: doc.minAgeMale || 21,
        minAgeFemale: doc.minAgeFemale || 18,
        maxPhotoUploadLimit: doc.maxPhotoUploadLimit || 6,
      },
      create: {
        id: getId(doc),
        siteName: doc.siteName || 'Wonderful Jodi',
        supportEmail: doc.supportEmail || 'support@wonderfuljodi.com',
        supportPhone: doc.supportPhone || '+91 096075 59547',
        tollFreeNumber: doc.tollFreeNumber || '+91 096075 59547',
        officeAddress: doc.officeAddress || '',
        maintenanceMode: !!doc.maintenanceMode,
        maintenanceBanner: !!doc.maintenanceBanner,
        maintenanceTitle: doc.maintenanceTitle || "We'll Be Back Soon",
        maintenanceMessage: doc.maintenanceMessage || '',
        maintenanceEstimatedEndTime: doc.maintenanceEstimatedEndTime ? new Date(doc.maintenanceEstimatedEndTime) : null,
        allowAdminAccess: doc.allowAdminAccess !== false,
        maintenanceUpdatedBy: doc.maintenanceUpdatedBy || '',
        allowNewRegistrations: doc.allowNewRegistrations !== false,
        requireEmailVerification: !!doc.requireEmailVerification,
        requireManualProfileApproval: doc.requireManualProfileApproval !== false,
        currency: doc.currency || 'INR',
        razorpayLiveMode: !!doc.razorpayLiveMode,
        minAgeMale: doc.minAgeMale || 21,
        minAgeFemale: doc.minAgeFemale || 18,
        maxPhotoUploadLimit: doc.maxPhotoUploadLimit || 6,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 2: GEOGRAPHIC & COMMUNITY MASTER DATA
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STAGE 2: GEOGRAPHIC & COMMUNITY DATA ---');

  await migrateCollection('Countries', () => Country.find().lean(), async (doc: any) => {
    await prisma.country.upsert({
      where: { id: getId(doc) },
      update: {
        name: doc.name,
        code: doc.code,
        isoCode: doc.isoCode || doc.code,
        phoneCode: doc.phoneCode || '',
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'ISO-3166',
      },
      create: {
        id: getId(doc),
        name: doc.name,
        code: doc.code,
        isoCode: doc.isoCode || doc.code,
        phoneCode: doc.phoneCode || '',
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'ISO-3166',
      },
    });
  });

  await migrateCollection('States', () => State.find().lean(), async (doc: any) => {
    await prisma.state.upsert({
      where: { id: getId(doc) },
      update: {
        countryId: getId(doc.countryId),
        name: doc.name,
        code: doc.code,
        type: doc.type || 'State',
        lgdCode: doc.lgdCode || null,
        censusCode: doc.censusCode || null,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'LGD',
      },
      create: {
        id: getId(doc),
        countryId: getId(doc.countryId),
        name: doc.name,
        code: doc.code,
        type: doc.type || 'State',
        lgdCode: doc.lgdCode || null,
        censusCode: doc.censusCode || null,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'LGD',
      },
    });
  });

  await migrateCollection('Districts', () => District.find().lean(), async (doc: any) => {
    await prisma.district.upsert({
      where: { id: getId(doc) },
      update: {
        stateId: getId(doc.stateId),
        countryId: getId(doc.countryId),
        name: doc.name,
        code: doc.code || null,
        lgdCode: doc.lgdCode || null,
        censusCode: doc.censusCode || null,
        headquarters: doc.headquarters || null,
        isActive: doc.isActive !== false,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'LGD',
      },
      create: {
        id: getId(doc),
        stateId: getId(doc.stateId),
        countryId: getId(doc.countryId),
        name: doc.name,
        code: doc.code || null,
        lgdCode: doc.lgdCode || null,
        censusCode: doc.censusCode || null,
        headquarters: doc.headquarters || null,
        isActive: doc.isActive !== false,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'LGD',
      },
    });
  });

  await migrateCollection('Cities', () => City.find().lean(), async (doc: any) => {
    await prisma.city.upsert({
      where: { id: getId(doc) },
      update: {
        districtId: getId(doc.districtId),
        stateId: getId(doc.stateId),
        subDistrictId: doc.subDistrictId ? getId(doc.subDistrictId) : null,
        name: doc.name,
        code: doc.code || null,
        type: doc.type || 'City',
        pincode: doc.pincode || null,
        lgdCode: doc.lgdCode || null,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'LGD',
      },
      create: {
        id: getId(doc),
        districtId: getId(doc.districtId),
        stateId: getId(doc.stateId),
        subDistrictId: doc.subDistrictId ? getId(doc.subDistrictId) : null,
        name: doc.name,
        code: doc.code || null,
        type: doc.type || 'City',
        pincode: doc.pincode || null,
        lgdCode: doc.lgdCode || null,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
        sourceType: doc.sourceType || 'GOVERNMENT',
        source: doc.source || 'LGD',
      },
    });
  });

  await migrateCollection('Languages', () => Language.find().lean(), async (doc: any) => {
    await prisma.language.upsert({
      where: { id: getId(doc) },
      update: {
        name: doc.name,
        code: doc.code,
        nativeNames: safeJson(doc.nativeNames),
        isScheduled: !!doc.isScheduled,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
      },
      create: {
        id: getId(doc),
        name: doc.name,
        code: doc.code,
        nativeNames: safeJson(doc.nativeNames),
        isScheduled: !!doc.isScheduled,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
      },
    });
  });

  await migrateCollection('Religions', () => Religion.find().lean(), async (doc: any) => {
    await prisma.religion.upsert({
      where: { id: getId(doc) },
      update: {
        name: doc.name,
        code: doc.code,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
      },
      create: {
        id: getId(doc),
        name: doc.name,
        code: doc.code,
        isActive: doc.isActive !== false,
        sortOrder: doc.sortOrder ?? 999,
      },
    });
  });

  await migrateCollection('Castes', () => Caste.find().lean(), async (doc: any) => {
    await prisma.caste.upsert({
      where: { id: getId(doc) },
      update: {
        religionId: getId(doc.religionId),
        name: doc.name,
        category: doc.category || 'Not Specified',
        aliases: safeJson(doc.aliases),
        source: doc.source || 'Community Master',
        sourceType: doc.sourceType || 'COMMUNITY_MASTER',
        isActive: doc.isActive !== false,
      },
      create: {
        id: getId(doc),
        religionId: getId(doc.religionId),
        name: doc.name,
        category: doc.category || 'Not Specified',
        aliases: safeJson(doc.aliases),
        source: doc.source || 'Community Master',
        sourceType: doc.sourceType || 'COMMUNITY_MASTER',
        isActive: doc.isActive !== false,
      },
    });
  });

  await migrateCollection('MembershipPlans', () => MembershipPlan.find().lean(), async (doc: any) => {
    await prisma.membershipPlan.upsert({
      where: { id: getId(doc) },
      update: {
        name: doc.name,
        slug: doc.slug,
        key: doc.key || doc.slug?.toUpperCase(),
        planId: doc.planId || `plan_${doc.slug}`,
        description: doc.description || '',
        originalPrice: doc.originalPrice || doc.price || 0,
        discountedPrice: doc.discountedPrice || doc.price || 0,
        price: doc.price || 0,
        currency: doc.currency || 'INR',
        billingPeriod: doc.billingPeriod || 'Monthly',
        durationDays: doc.durationDays || 30,
        durationMonths: doc.durationMonths || null,
        features: safeJson(doc.features),
        isActive: doc.isActive !== false,
        isPopular: !!doc.isPopular,
        displayOrder: doc.displayOrder ?? 1,
        seasonalLabel: doc.seasonalLabel || '',
        seasonalDiscount: doc.seasonalDiscount || 0,
        isSeasonalOffer: !!doc.isSeasonalOffer,
        badge: doc.badge || '',
        bestFor: doc.bestFor || '',
        profileViewLimit: doc.profileViewLimit || 'limited',
        contactRequestLimit: doc.contactRequestLimit || 0,
        isUnlimitedContact: !!doc.isUnlimitedContact,
        fairUsageEnabled: !!doc.fairUsageEnabled,
        ctaText: doc.ctaText || 'Select Plan',
        ctaAction: doc.ctaAction || 'order',
        disclaimer: doc.disclaimer || '',
      },
      create: {
        id: getId(doc),
        name: doc.name,
        slug: doc.slug,
        key: doc.key || doc.slug?.toUpperCase(),
        planId: doc.planId || `plan_${doc.slug}`,
        description: doc.description || '',
        originalPrice: doc.originalPrice || doc.price || 0,
        discountedPrice: doc.discountedPrice || doc.price || 0,
        price: doc.price || 0,
        currency: doc.currency || 'INR',
        billingPeriod: doc.billingPeriod || 'Monthly',
        durationDays: doc.durationDays || 30,
        durationMonths: doc.durationMonths || null,
        features: safeJson(doc.features),
        isActive: doc.isActive !== false,
        isPopular: !!doc.isPopular,
        displayOrder: doc.displayOrder ?? 1,
        seasonalLabel: doc.seasonalLabel || '',
        seasonalDiscount: doc.seasonalDiscount || 0,
        isSeasonalOffer: !!doc.isSeasonalOffer,
        badge: doc.badge || '',
        bestFor: doc.bestFor || '',
        profileViewLimit: doc.profileViewLimit || 'limited',
        contactRequestLimit: doc.contactRequestLimit || 0,
        isUnlimitedContact: !!doc.isUnlimitedContact,
        fairUsageEnabled: !!doc.fairUsageEnabled,
        ctaText: doc.ctaText || 'Select Plan',
        ctaAction: doc.ctaAction || 'order',
        disclaimer: doc.disclaimer || '',
      },
    });
  });

  await migrateCollection('Institutions', () => Institution.find().lean(), async (doc: any) => {
    await prisma.institution.upsert({
      where: { id: getId(doc) },
      update: {
        name: doc.name,
        normalizedName: doc.normalizedName || doc.name.toLowerCase().trim(),
        type: doc.type || 'COLLEGE',
        city: doc.city || '',
        state: doc.state || '',
        country: doc.country || 'India',
        usageCount: doc.usageCount || 1,
        isVerified: !!doc.isVerified,
      },
      create: {
        id: getId(doc),
        name: doc.name,
        normalizedName: doc.normalizedName || doc.name.toLowerCase().trim(),
        type: doc.type || 'COLLEGE',
        city: doc.city || '',
        state: doc.state || '',
        country: doc.country || 'India',
        usageCount: doc.usageCount || 1,
        isVerified: !!doc.isVerified,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 3: CORE USERS & CREDENTIALS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STAGE 3: USERS & AUTHENTICATION ---');

  await migrateCollection('Users', () => User.find().lean(), async (doc: any) => {
    await prisma.user.upsert({
      where: { id: getId(doc) },
      update: {
        fullName: doc.fullName || '',
        email: doc.email.toLowerCase().trim(),
        mobile: doc.mobile.trim(),
        password: doc.password, // Preserve exact bcrypt hash!
        role: doc.role || 'user',
        verified: !!doc.verified,
        verificationStatus: doc.verificationStatus || 'UNVERIFIED',
        isActive: doc.isActive !== false,
        status: doc.status || 'Active',
        isDeleted: !!doc.isDeleted,
        deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
        deletedById: doc.deletedBy ? getId(doc.deletedBy) : null,
        deletionReason: doc.deletionReason || null,
        suspensionReason: doc.suspensionReason || null,
        suspendedAt: doc.suspendedAt ? new Date(doc.suspendedAt) : null,
        suspendedById: doc.suspendedBy ? getId(doc.suspendedBy) : null,
        termsAccepted: !!doc.termsAccepted,
        termsVersion: doc.termsVersion || '2026-09-V1',
        termsAcceptedAt: doc.termsAcceptedAt ? new Date(doc.termsAcceptedAt) : null,
        createdAt: safeDate(doc.createdAt),
        updatedAt: safeDate(doc.updatedAt),
      },
      create: {
        id: getId(doc),
        fullName: doc.fullName || '',
        email: doc.email.toLowerCase().trim(),
        mobile: doc.mobile.trim(),
        password: doc.password, // Preserve exact bcrypt hash!
        role: doc.role || 'user',
        verified: !!doc.verified,
        verificationStatus: doc.verificationStatus || 'UNVERIFIED',
        isActive: doc.isActive !== false,
        status: doc.status || 'Active',
        isDeleted: !!doc.isDeleted,
        deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
        deletedById: doc.deletedBy ? getId(doc.deletedBy) : null,
        deletionReason: doc.deletionReason || null,
        suspensionReason: doc.suspensionReason || null,
        suspendedAt: doc.suspendedAt ? new Date(doc.suspendedAt) : null,
        suspendedById: doc.suspendedBy ? getId(doc.suspendedBy) : null,
        termsAccepted: !!doc.termsAccepted,
        termsVersion: doc.termsVersion || '2026-09-V1',
        termsAcceptedAt: doc.termsAcceptedAt ? new Date(doc.termsAcceptedAt) : null,
        createdAt: safeDate(doc.createdAt),
        updatedAt: safeDate(doc.updatedAt),
      },
    });
  });

  await migrateCollection('Admins', () => Admin.find().lean(), async (doc: any) => {
    await prisma.admin.upsert({
      where: { id: getId(doc) },
      update: {
        userId: getId(doc.user),
        permissions: safeJson(doc.permissions || []),
      },
      create: {
        id: getId(doc),
        userId: getId(doc.user),
        permissions: safeJson(doc.permissions || []),
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 4: PROFILES & CANDIDATES
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STAGE 4: PROFILES & CANDIDATES ---');

  await migrateCollection('Profiles', () => Profile.find().lean(), async (doc: any) => {
    await prisma.profile.upsert({
      where: { id: getId(doc) },
      update: {
        userId: getId(doc.user),
        candidateId: doc.candidateId || null,
        displayName: doc.displayName || '',
        gender: doc.gender || 'Male',
        dob: safeDate(doc.dob),
        height: doc.height || `5' 6"`,
        maritalStatus: doc.maritalStatus || 'Never Married',
        motherTongue: doc.motherTongue || '',
        religion: doc.religion || '',
        caste: doc.caste || '',
        subCaste: doc.subCaste || null,
        education: doc.education || '',
        degree: doc.degree || '',
        profession: doc.profession || '',
        company: doc.company || null,
        workLocation: doc.workLocation || null,
        annualIncome: doc.annualIncome || null,
        country: doc.country || 'India',
        state: doc.state || '',
        city: doc.city || '',
        fatherOccupation: doc.fatherOccupation || null,
        motherOccupation: doc.motherOccupation || null,
        siblings: doc.siblings || null,
        familyType: doc.familyType || null,
        foodPreference: doc.foodPreference || null,
        smoking: doc.smoking || null,
        drinking: doc.drinking || null,
        hobbies: safeJson(doc.hobbies),
        about: doc.about || null,
        photos: safeJson(doc.photos || []),
        primaryPhoto: doc.primaryPhoto || null,
        medicalRegistrationNumber: doc.medicalRegistrationNumber || null,
        medicalCouncil: doc.medicalCouncil || null,
        registrationState: doc.registrationState || null,
        registrationYear: doc.registrationYear || null,
        medicalExperience: doc.medicalExperience || null,
        currentHospital: doc.currentHospital || null,
        medicalCollege: doc.medicalCollege || null,
        medicalUniversity: doc.medicalUniversity || null,
        graduationYear: doc.graduationYear || null,
        additionalQualification: doc.additionalQualification || null,
        currentRole: doc.currentRole || null,
        workType: doc.workType || null,
        currentlyPracticing: doc.currentlyPracticing !== false,
        familyStatus: doc.familyStatus || null,
        familyValues: doc.familyValues || null,
        nativePlace: doc.nativePlace || null,
        familyLocation: doc.familyLocation || null,
        profileManagedBy: doc.profileManagedBy || 'Self',
        currentLocation: safeJson(doc.currentLocation),
        nativePlaceDetails: safeJson(doc.nativePlaceDetails),
        communityDetails: safeJson(doc.communityDetails),
        languageDetails: safeJson(doc.languageDetails),
        horoscope: safeJson(doc.horoscope),
        lifestyleInterests: safeJson(doc.lifestyleInterests),
        partnerExpectations: safeJson(doc.partnerExpectations),
        partnerPreferences: safeJson(doc.partnerPreferences),
        aboutMe: doc.aboutMe || null,
        personalityValues: doc.personalityValues || null,
        hobbiesInterests: doc.hobbiesInterests || null,
        careerGoals: doc.careerGoals || null,
        familyBackground: safeJson(doc.familyBackground),
        siblingsDetails: safeJson(doc.siblingsDetails),
        medicalQualifications: safeJson(doc.medicalQualifications),
        privacySettings: safeJson(doc.privacySettings),
        verificationStatus: doc.verificationStatus || 'UNVERIFIED',
        status: doc.status || 'Active',
        statusReason: doc.statusReason || null,
        statusChangedAt: doc.statusChangedAt ? new Date(doc.statusChangedAt) : null,
        statusChangedById: doc.statusChangedBy ? getId(doc.statusChangedBy) : null,
        isDeleted: !!doc.isDeleted,
        deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
        deletedById: doc.deletedBy ? getId(doc.deletedBy) : null,
        deletionReason: doc.deletionReason || null,
        lastActiveAt: safeDate(doc.lastActiveAt),
        adminNotes: safeJson(doc.adminNotes),
        createdAt: safeDate(doc.createdAt),
        updatedAt: safeDate(doc.updatedAt),
      },
      create: {
        id: getId(doc),
        userId: getId(doc.user),
        candidateId: doc.candidateId || null,
        displayName: doc.displayName || '',
        gender: doc.gender || 'Male',
        dob: safeDate(doc.dob),
        height: doc.height || `5' 6"`,
        maritalStatus: doc.maritalStatus || 'Never Married',
        motherTongue: doc.motherTongue || '',
        religion: doc.religion || '',
        caste: doc.caste || '',
        subCaste: doc.subCaste || null,
        education: doc.education || '',
        degree: doc.degree || '',
        profession: doc.profession || '',
        company: doc.company || null,
        workLocation: doc.workLocation || null,
        annualIncome: doc.annualIncome || null,
        country: doc.country || 'India',
        state: doc.state || '',
        city: doc.city || '',
        fatherOccupation: doc.fatherOccupation || null,
        motherOccupation: doc.motherOccupation || null,
        siblings: doc.siblings || null,
        familyType: doc.familyType || null,
        foodPreference: doc.foodPreference || null,
        smoking: doc.smoking || null,
        drinking: doc.drinking || null,
        hobbies: safeJson(doc.hobbies),
        about: doc.about || null,
        photos: safeJson(doc.photos || []),
        primaryPhoto: doc.primaryPhoto || null,
        medicalRegistrationNumber: doc.medicalRegistrationNumber || null,
        medicalCouncil: doc.medicalCouncil || null,
        registrationState: doc.registrationState || null,
        registrationYear: doc.registrationYear || null,
        medicalExperience: doc.medicalExperience || null,
        currentHospital: doc.currentHospital || null,
        medicalCollege: doc.medicalCollege || null,
        medicalUniversity: doc.medicalUniversity || null,
        graduationYear: doc.graduationYear || null,
        additionalQualification: doc.additionalQualification || null,
        currentRole: doc.currentRole || null,
        workType: doc.workType || null,
        currentlyPracticing: doc.currentlyPracticing !== false,
        familyStatus: doc.familyStatus || null,
        familyValues: doc.familyValues || null,
        nativePlace: doc.nativePlace || null,
        familyLocation: doc.familyLocation || null,
        profileManagedBy: doc.profileManagedBy || 'Self',
        currentLocation: safeJson(doc.currentLocation),
        nativePlaceDetails: safeJson(doc.nativePlaceDetails),
        communityDetails: safeJson(doc.communityDetails),
        languageDetails: safeJson(doc.languageDetails),
        horoscope: safeJson(doc.horoscope),
        lifestyleInterests: safeJson(doc.lifestyleInterests),
        partnerExpectations: safeJson(doc.partnerExpectations),
        partnerPreferences: safeJson(doc.partnerPreferences),
        aboutMe: doc.aboutMe || null,
        personalityValues: doc.personalityValues || null,
        hobbiesInterests: doc.hobbiesInterests || null,
        careerGoals: doc.careerGoals || null,
        familyBackground: safeJson(doc.familyBackground),
        siblingsDetails: safeJson(doc.siblingsDetails),
        medicalQualifications: safeJson(doc.medicalQualifications),
        privacySettings: safeJson(doc.privacySettings),
        verificationStatus: doc.verificationStatus || 'UNVERIFIED',
        status: doc.status || 'Active',
        statusReason: doc.statusReason || null,
        statusChangedAt: doc.statusChangedAt ? new Date(doc.statusChangedAt) : null,
        statusChangedById: doc.statusChangedBy ? getId(doc.statusChangedBy) : null,
        isDeleted: !!doc.isDeleted,
        deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
        deletedById: doc.deletedBy ? getId(doc.deletedBy) : null,
        deletionReason: doc.deletionReason || null,
        lastActiveAt: safeDate(doc.lastActiveAt),
        adminNotes: safeJson(doc.adminNotes),
        createdAt: safeDate(doc.createdAt),
        updatedAt: safeDate(doc.updatedAt),
      },
    });
  });

  await migrateCollection('Registrations', () => Registration.find().lean(), async (doc: any) => {
    await prisma.registration.upsert({
      where: { id: getId(doc) },
      update: {
        registrationId: doc.registrationId,
        status: doc.status || 'IN_PROGRESS',
        currentStep: doc.currentStep || 1,
        totalSteps: doc.totalSteps || 4,
        completionPercentage: doc.completionPercentage || 0,
        candidateName: doc.candidateName || '',
        email: doc.email || null,
        mobile: doc.mobile || null,
        gender: doc.gender || null,
        stepData: safeJson(doc.stepData || {}),
        userId: doc.user ? getId(doc.user) : null,
        profileId: doc.profile ? getId(doc.profile) : null,
        resumeToken: doc.resumeToken || null,
        startedAt: safeDate(doc.startedAt),
        lastActiveAt: safeDate(doc.lastActiveAt),
        completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
        abandonedAt: doc.abandonedAt ? new Date(doc.abandonedAt) : null,
        ipAddress: doc.ipAddress || null,
        userAgent: doc.userAgent || null,
        isDeleted: !!doc.isDeleted,
      },
      create: {
        id: getId(doc),
        registrationId: doc.registrationId,
        status: doc.status || 'IN_PROGRESS',
        currentStep: doc.currentStep || 1,
        totalSteps: doc.totalSteps || 4,
        completionPercentage: doc.completionPercentage || 0,
        candidateName: doc.candidateName || '',
        email: doc.email || null,
        mobile: doc.mobile || null,
        gender: doc.gender || null,
        stepData: safeJson(doc.stepData || {}),
        userId: doc.user ? getId(doc.user) : null,
        profileId: doc.profile ? getId(doc.profile) : null,
        resumeToken: doc.resumeToken || null,
        startedAt: safeDate(doc.startedAt),
        lastActiveAt: safeDate(doc.lastActiveAt),
        completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
        abandonedAt: doc.abandonedAt ? new Date(doc.abandonedAt) : null,
        ipAddress: doc.ipAddress || null,
        userAgent: doc.userAgent || null,
        isDeleted: !!doc.isDeleted,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 5: SUBSCRIPTIONS & PAYMENTS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STAGE 5: SUBSCRIPTIONS & FINANCIAL LEDGER ---');

  await migrateCollection('Subscriptions', () => Subscription.find().lean(), async (doc: any) => {
    await prisma.subscription.upsert({
      where: { id: getId(doc) },
      update: {
        userId: getId(doc.user),
        plan: doc.plan,
        planId: doc.planId || null,
        status: doc.status || 'ACTIVE',
        startDate: safeDate(doc.startDate),
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
        contactRequestsUsed: doc.contactRequestsUsed || 0,
        contactRequestsRemaining: doc.contactRequestsRemaining || 0,
        paymentReference: doc.paymentReference || null,
      },
      create: {
        id: getId(doc),
        userId: getId(doc.user),
        plan: doc.plan,
        planId: doc.planId || null,
        status: doc.status || 'ACTIVE',
        startDate: safeDate(doc.startDate),
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
        contactRequestsUsed: doc.contactRequestsUsed || 0,
        contactRequestsRemaining: doc.contactRequestsRemaining || 0,
        paymentReference: doc.paymentReference || null,
      },
    });
  });

  await migrateCollection('Payments', () => Payment.find().lean(), async (doc: any) => {
    await prisma.payment.upsert({
      where: { id: getId(doc) },
      update: {
        userId: getId(doc.user),
        subscriptionId: doc.subscription ? getId(doc.subscription) : null,
        orderId: doc.orderId || null,
        paymentId: doc.paymentId || null,
        provider: doc.provider || 'razorpay',
        providerPaymentId: doc.providerPaymentId || `pay_${getId(doc)}`,
        amount: doc.amount || 0,
        currency: doc.currency || 'INR',
        planId: doc.planId || null,
        planName: doc.planName || null,
        paymentMethod: doc.paymentMethod || 'UPI',
        status: doc.status || 'PENDING',
        receipt: doc.receipt || null,
        razorpaySignature: doc.razorpaySignature || null,
        failureReason: doc.failureReason || null,
        refundId: doc.refundId || null,
        refundAmount: doc.refundAmount || 0,
        refundStatus: doc.refundStatus || 'NONE',
        refundReason: doc.refundReason || null,
        refundedAt: doc.refundedAt ? new Date(doc.refundedAt) : null,
        isSimulated: !!doc.isSimulated,
        metadata: safeJson(doc.metadata),
      },
      create: {
        id: getId(doc),
        userId: getId(doc.user),
        subscriptionId: doc.subscription ? getId(doc.subscription) : null,
        orderId: doc.orderId || null,
        paymentId: doc.paymentId || null,
        provider: doc.provider || 'razorpay',
        providerPaymentId: doc.providerPaymentId || `pay_${getId(doc)}`,
        amount: doc.amount || 0,
        currency: doc.currency || 'INR',
        planId: doc.planId || null,
        planName: doc.planName || null,
        paymentMethod: doc.paymentMethod || 'UPI',
        status: doc.status || 'PENDING',
        receipt: doc.receipt || null,
        razorpaySignature: doc.razorpaySignature || null,
        failureReason: doc.failureReason || null,
        refundId: doc.refundId || null,
        refundAmount: doc.refundAmount || 0,
        refundStatus: doc.refundStatus || 'NONE',
        refundReason: doc.refundReason || null,
        refundedAt: doc.refundedAt ? new Date(doc.refundedAt) : null,
        isSimulated: !!doc.isSimulated,
        metadata: safeJson(doc.metadata),
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STAGE 6: INTERACTIONS, CHAT & NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- STAGE 6: MATCHMAKING, CHAT & NOTIFICATIONS ---');

  await migrateCollection('Interests', () => Interest.find().lean(), async (doc: any) => {
    await prisma.interest.upsert({
      where: { id: getId(doc) },
      update: {
        senderId: getId(doc.sender),
        receiverId: getId(doc.receiver),
        senderProfileId: doc.senderProfile ? getId(doc.senderProfile) : null,
        receiverProfileId: doc.receiverProfile ? getId(doc.receiverProfile) : null,
        status: doc.status || 'PENDING',
      },
      create: {
        id: getId(doc),
        senderId: getId(doc.sender),
        receiverId: getId(doc.receiver),
        senderProfileId: doc.senderProfile ? getId(doc.senderProfile) : null,
        receiverProfileId: doc.receiverProfile ? getId(doc.receiverProfile) : null,
        status: doc.status || 'PENDING',
      },
    });
  });

  await migrateCollection('Shortlists', () => Shortlist.find().lean(), async (doc: any) => {
    await prisma.shortlist.upsert({
      where: { id: getId(doc) },
      update: {
        userId: getId(doc.user),
        profileId: getId(doc.profile),
      },
      create: {
        id: getId(doc),
        userId: getId(doc.user),
        profileId: getId(doc.profile),
      },
    });
  });

  await migrateCollection('Conversations', () => Conversation.find().lean(), async (doc: any) => {
    const convId = getId(doc);
    await prisma.conversation.upsert({
      where: { id: convId },
      update: {
        interestId: doc.interest ? getId(doc.interest) : null,
        lastMessage: doc.lastMessage || null,
        messageCount: doc.messageCount || 0,
        status: doc.status || 'ACTIVE',
        complianceStatus: doc.complianceStatus || 'SAFE',
        lastActivityAt: safeDate(doc.lastActivityAt),
      },
      create: {
        id: convId,
        interestId: doc.interest ? getId(doc.interest) : null,
        lastMessage: doc.lastMessage || null,
        messageCount: doc.messageCount || 0,
        status: doc.status || 'ACTIVE',
        complianceStatus: doc.complianceStatus || 'SAFE',
        lastActivityAt: safeDate(doc.lastActivityAt),
      },
    });

    // Populate conversation participants junction table
    if (Array.isArray(doc.participants)) {
      for (const p of doc.participants) {
        const uId = getId(p);
        await prisma.conversationParticipant.upsert({
          where: {
            conversationId_userId: { conversationId: convId, userId: uId },
          },
          update: {},
          create: { conversationId: convId, userId: uId },
        });
      }
    }
  });

  await migrateCollection('Messages', () => Message.find().lean(), async (doc: any) => {
    await prisma.message.upsert({
      where: { id: getId(doc) },
      update: {
        conversationId: getId(doc.conversation),
        senderId: getId(doc.sender),
        receiverId: getId(doc.receiver),
        content: doc.content || '',
        read: !!doc.read,
        moderationStatus: doc.moderationStatus || 'SAFE',
        moderationCategory: doc.moderationCategory || 'NONE',
        moderationConfidence: doc.moderationConfidence || 'NONE',
        moderationScore: doc.moderationScore || 0,
        flaggedReason: doc.flaggedReason || null,
        moderatedAt: doc.moderatedAt ? new Date(doc.moderatedAt) : null,
        createdAt: safeDate(doc.createdAt),
      },
      create: {
        id: getId(doc),
        conversationId: getId(doc.conversation),
        senderId: getId(doc.sender),
        receiverId: getId(doc.receiver),
        content: doc.content || '',
        read: !!doc.read,
        moderationStatus: doc.moderationStatus || 'SAFE',
        moderationCategory: doc.moderationCategory || 'NONE',
        moderationConfidence: doc.moderationConfidence || 'NONE',
        moderationScore: doc.moderationScore || 0,
        flaggedReason: doc.flaggedReason || null,
        moderatedAt: doc.moderatedAt ? new Date(doc.moderatedAt) : null,
        createdAt: safeDate(doc.createdAt),
      },
    });
  });

  await migrateCollection('Notifications', () => Notification.find().lean(), async (doc: any) => {
    await prisma.notification.upsert({
      where: { id: getId(doc) },
      update: {
        userId: getId(doc.user),
        broadcastId: doc.broadcast ? getId(doc.broadcast) : null,
        type: doc.type || 'SYSTEM',
        title: doc.title || 'Notification',
        message: doc.message || '',
        actionUrl: doc.actionUrl || null,
        link: doc.link || null,
        read: !!doc.read,
        readAt: doc.readAt ? new Date(doc.readAt) : null,
        metadata: safeJson(doc.metadata),
        createdAt: safeDate(doc.createdAt),
      },
      create: {
        id: getId(doc),
        userId: getId(doc.user),
        broadcastId: doc.broadcast ? getId(doc.broadcast) : null,
        type: doc.type || 'SYSTEM',
        title: doc.title || 'Notification',
        message: doc.message || '',
        actionUrl: doc.actionUrl || null,
        link: doc.link || null,
        read: !!doc.read,
        readAt: doc.readAt ? new Date(doc.readAt) : null,
        metadata: safeJson(doc.metadata),
        createdAt: safeDate(doc.createdAt),
      },
    });
  });

  await migrateCollection('Verifications', () => Verification.find().lean(), async (doc: any) => {
    await prisma.verification.upsert({
      where: { id: getId(doc) },
      update: {
        userId: getId(doc.user),
        documentType: doc.documentType,
        documentName: doc.documentName || 'Verification Document',
        documentUrl: doc.documentUrl,
        storageKey: doc.storageKey || null,
        fileType: doc.fileType || 'application/pdf',
        fileSize: doc.fileSize || 0,
        status: doc.status || 'PENDING',
        submittedAt: safeDate(doc.submittedAt),
        reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt) : null,
        reviewedById: doc.reviewedBy ? getId(doc.reviewedBy) : null,
        reviewedByEmail: doc.reviewedByEmail || null,
        adminNotes: doc.adminNotes || null,
        rejectionReason: doc.rejectionReason || null,
        attemptNumber: doc.attemptNumber || 1,
        metadata: safeJson(doc.metadata),
      },
      create: {
        id: getId(doc),
        userId: getId(doc.user),
        documentType: doc.documentType,
        documentName: doc.documentName || 'Verification Document',
        documentUrl: doc.documentUrl,
        storageKey: doc.storageKey || null,
        fileType: doc.fileType || 'application/pdf',
        fileSize: doc.fileSize || 0,
        status: doc.status || 'PENDING',
        submittedAt: safeDate(doc.submittedAt),
        reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt) : null,
        reviewedById: doc.reviewedBy ? getId(doc.reviewedBy) : null,
        reviewedByEmail: doc.reviewedByEmail || null,
        adminNotes: doc.adminNotes || null,
        rejectionReason: doc.rejectionReason || null,
        attemptNumber: doc.attemptNumber || 1,
        metadata: safeJson(doc.metadata),
      },
    });
  });

  await migrateCollection('ContactInquiries', () => ContactInquiry.find().lean(), async (doc: any) => {
    await prisma.contactInquiry.upsert({
      where: { id: getId(doc) },
      update: {
        inquiryId: doc.inquiryId || `WJ-CON-${getId(doc).slice(-6)}`,
        name: doc.name || '',
        mobileNumber: doc.mobileNumber || doc.mobile || '',
        email: doc.email || '',
        message: doc.message || '',
        userId: doc.userId ? getId(doc.userId) : null,
        userType: doc.userType || 'GUEST',
        status: doc.status || 'NEW',
        priority: doc.priority || 'NORMAL',
        category: doc.category || 'GENERAL',
        notificationCreated: !!doc.notificationCreated,
        assignedTo: doc.assignedTo ? getId(doc.assignedTo) : null,
        internalNotes: safeJson(doc.internalNotes),
        ipAddress: doc.ipAddress || null,
        userAgent: doc.userAgent || null,
        replies: safeJson(doc.replies),
      },
      create: {
        id: getId(doc),
        inquiryId: doc.inquiryId || `WJ-CON-${getId(doc).slice(-6)}`,
        name: doc.name || '',
        mobileNumber: doc.mobileNumber || doc.mobile || '',
        email: doc.email || '',
        message: doc.message || '',
        userId: doc.userId ? getId(doc.userId) : null,
        userType: doc.userType || 'GUEST',
        status: doc.status || 'NEW',
        priority: doc.priority || 'NORMAL',
        category: doc.category || 'GENERAL',
        notificationCreated: !!doc.notificationCreated,
        assignedTo: doc.assignedTo ? getId(doc.assignedTo) : null,
        internalNotes: safeJson(doc.internalNotes),
        ipAddress: doc.ipAddress || null,
        userAgent: doc.userAgent || null,
        replies: safeJson(doc.replies),
      },
    });
  });

  await migrateCollection('Awards', () => Award.find().lean(), async (doc: any) => {
    await prisma.award.upsert({
      where: { id: getId(doc) },
      update: {
        name: doc.name,
        slug: doc.slug,
        logo: doc.logo,
        shortDescription: doc.shortDescription || '',
        fullDescription: doc.fullDescription || '',
        awardYear: doc.awardYear || 2026,
        category: doc.category || 'Excellence in Matrimony',
        organization: doc.organization || '',
        galleryImages: safeJson(doc.galleryImages || []),
        websiteUrl: doc.websiteUrl || null,
        displayOrder: doc.displayOrder ?? 0,
        isActive: doc.isActive !== false,
        isFeatured: doc.isFeatured !== false,
        isDeleted: !!doc.isDeleted,
      },
      create: {
        id: getId(doc),
        name: doc.name,
        slug: doc.slug,
        logo: doc.logo,
        shortDescription: doc.shortDescription || '',
        fullDescription: doc.fullDescription || '',
        awardYear: doc.awardYear || 2026,
        category: doc.category || 'Excellence in Matrimony',
        organization: doc.organization || '',
        galleryImages: safeJson(doc.galleryImages || []),
        websiteUrl: doc.websiteUrl || null,
        displayOrder: doc.displayOrder ?? 0,
        isActive: doc.isActive !== false,
        isFeatured: doc.isFeatured !== false,
        isDeleted: !!doc.isDeleted,
      },
    });
  });

  await migrateCollection('BlogPosts', () => BlogPost.find().lean(), async (doc: any) => {
    await prisma.blogPost.upsert({
      where: { id: getId(doc) },
      update: {
        title: doc.title,
        slug: doc.slug,
        category: doc.category || 'Doctor Matrimony',
        excerpt: doc.excerpt || '',
        content: doc.content || '',
        featuredImageUrl: doc.featuredImageUrl || null,
        authorName: doc.authorName || 'Wonderful Jodi Team',
        authorRole: doc.authorRole || 'Consultant',
        readingTime: doc.readingTime || '5 min read',
        status: doc.status || 'DRAFT',
        isFeatured: !!doc.isFeatured,
        tags: safeJson(doc.tags || []),
        viewCount: doc.viewCount || 0,
        publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
        isDeleted: !!doc.isDeleted,
      },
      create: {
        id: getId(doc),
        title: doc.title,
        slug: doc.slug,
        category: doc.category || 'Doctor Matrimony',
        excerpt: doc.excerpt || '',
        content: doc.content || '',
        featuredImageUrl: doc.featuredImageUrl || null,
        authorName: doc.authorName || 'Wonderful Jodi Team',
        authorRole: doc.authorRole || 'Consultant',
        readingTime: doc.readingTime || '5 min read',
        status: doc.status || 'DRAFT',
        isFeatured: !!doc.isFeatured,
        tags: safeJson(doc.tags || []),
        viewCount: doc.viewCount || 0,
        publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
        isDeleted: !!doc.isDeleted,
      },
    });
  });

  await migrateCollection('JobOpenings', () => JobOpening.find().lean(), async (doc: any) => {
    await prisma.jobOpening.upsert({
      where: { id: getId(doc) },
      update: {
        title: doc.title,
        slug: doc.slug,
        department: doc.department || 'Operations',
        location: doc.location || 'Pune, India',
        workMode: doc.workMode || 'On-site',
        employmentType: doc.employmentType || 'Full-time',
        experience: doc.experience || '',
        salaryRange: doc.salaryRange || '',
        shortDescription: doc.shortDescription || '',
        fullDescription: doc.fullDescription || '',
        responsibilities: safeJson(doc.responsibilities || []),
        requirements: safeJson(doc.requirements || []),
        qualifications: safeJson(doc.qualifications || []),
        skills: safeJson(doc.skills || []),
        benefits: safeJson(doc.benefits || []),
        applicationEmail: doc.applicationEmail || 'careers@wonderfuljodi.com',
        status: doc.status || 'OPEN',
        isPublished: doc.isPublished !== false,
        displayOrder: doc.displayOrder ?? 0,
        isDeleted: !!doc.isDeleted,
      },
      create: {
        id: getId(doc),
        title: doc.title,
        slug: doc.slug,
        department: doc.department || 'Operations',
        location: doc.location || 'Pune, India',
        workMode: doc.workMode || 'On-site',
        employmentType: doc.employmentType || 'Full-time',
        experience: doc.experience || '',
        salaryRange: doc.salaryRange || '',
        shortDescription: doc.shortDescription || '',
        fullDescription: doc.fullDescription || '',
        responsibilities: safeJson(doc.responsibilities || []),
        requirements: safeJson(doc.requirements || []),
        qualifications: safeJson(doc.qualifications || []),
        skills: safeJson(doc.skills || []),
        benefits: safeJson(doc.benefits || []),
        applicationEmail: doc.applicationEmail || 'careers@wonderfuljodi.com',
        status: doc.status || 'OPEN',
        isPublished: doc.isPublished !== false,
        displayOrder: doc.displayOrder ?? 0,
        isDeleted: !!doc.isDeleted,
      },
    });
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // ─────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('                 MIGRATION EXECUTION REPORT                     ');
  console.log('================================================================');
  console.log(`Execution Time: ${durationSec} seconds\n`);
  console.log(
    'Collection'.padEnd(25) +
      'Source'.padStart(8) +
      'Imported'.padStart(10) +
      'Failed'.padStart(8) +
      'Status'.padStart(12)
  );
  console.log('-'.repeat(63));

  let totalSource = 0;
  let totalImported = 0;
  let totalFailed = 0;

  for (const s of statsReport) {
    totalSource += s.sourceCount;
    totalImported += s.importedCount;
    totalFailed += s.failedCount;

    console.log(
      s.collection.padEnd(25) +
        String(s.sourceCount).padStart(8) +
        String(s.importedCount).padStart(10) +
        String(s.failedCount).padStart(8) +
        s.status.padStart(12)
    );
  }

  console.log('-'.repeat(63));
  console.log(
    'TOTAL'.padEnd(25) +
      String(totalSource).padStart(8) +
      String(totalImported).padStart(10) +
      String(totalFailed).padStart(8) +
      (totalFailed === 0 ? 'SUCCESS' : 'WARNING').padStart(12)
  );
  console.log('================================================================\n');

  await mongoose.disconnect();
  await prisma.$disconnect();
}

// Execute if run directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration process completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
