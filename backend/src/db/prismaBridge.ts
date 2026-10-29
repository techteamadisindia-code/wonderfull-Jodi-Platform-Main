import { Prisma } from '@prisma/client';
import { prisma, toClient, toClientArray, generateObjectId } from './client';

export interface QueryOptions {
  sort?: any;
  skip?: number;
  limit?: number;
  select?: any;
  include?: any;
  populate?: Array<{ path: string; select?: string; populate?: any }>;
}

/**
 * Whitelist of auxiliary, non-security-critical delegates where a missing table (P2021)
 * is explicitly justified to degrade gracefully to empty results without compromising
 * authentication, authorization, eligibility, billing, messaging, or security boundaries.
 */
let hasWarnedMissingParticipantsTable = false;
let isConversationParticipantsMissing = false;

export function isConversationParticipantsTableMissing(): boolean {
  return isConversationParticipantsMissing;
}

export function setConversationParticipantsTableMissing(missing: boolean): void {
  isConversationParticipantsMissing = missing;
}

export const JUSTIFIED_AUXILIARY_MISSING_TABLE_DELEGATES = new Set<string>([
  'dailyUserVisit',
  'visitLog',
  'searchHistory',
  'siteConfig',
  'testimonial',
  'faq',
  'jobApplication',
  'jobOpening',
  'award',
  'blogPost',
]);


/**
 * Unescapes regex special characters for Prisma string queries.
 */
function unescapeRegexPattern(str: string): string {
  return str.replace(/\\([\\^$.*+?()[\]{}|/])/g, '$1');
}

/**
 * Parses MongoDB regex pattern into database-compatible Prisma string filter.
 * In MySQL / MariaDB, string collations (e.g. utf8mb4_unicode_ci) are case-insensitive by default.
 * Prisma Client rejects the `mode` parameter on MySQL providers ("Unknown argument `mode`").
 * This helper maps anchors (^...$) to equals / startsWith / endsWith / contains without the unsupported `mode` arg.
 */
function parseRegexToPrismaFilter(pattern: string): Record<string, string> {
  let p = pattern;

  const startsWithAnchor = p.startsWith('^');
  const endsWithAnchor = p.endsWith('$');

  if (startsWithAnchor && endsWithAnchor) {
    p = p.slice(1, -1);
    p = unescapeRegexPattern(p);
    return { equals: p };
  } else if (startsWithAnchor) {
    p = p.slice(1);
    p = unescapeRegexPattern(p);
    return { startsWith: p };
  } else if (endsWithAnchor) {
    p = p.slice(0, -1);
    p = unescapeRegexPattern(p);
    return { endsWith: p };
  } else {
    if (p.startsWith('.*')) p = p.slice(2);
    if (p.endsWith('.*')) p = p.slice(0, -2);
    p = unescapeRegexPattern(p);
    return { contains: p };
  }
}

/**
 * Extracts dot-notation filter predicates (e.g. 'metadata.interestId': 'xyz')
 * that cannot be represented in a Prisma top-level where clause on MySQL/MariaDB JSON columns.
 */
export function extractDotNotationPredicates(filter: any): Record<string, any> {
  const predicates: Record<string, any> = {};
  if (!filter || typeof filter !== 'object') return predicates;
  for (const [k, v] of Object.entries(filter)) {
    if (k.includes('.')) {
      predicates[k] = v;
    }
  }
  return predicates;
}

/**
 * Validates whether a record satisfies extracted dot-notation predicates in memory.
 * Accurately parses JSON strings if needed and verifies exact value matches without broadening queries.
 *
 * Supported operators:
 * - Direct scalar equality (string, number, boolean)
 * - $eq: exact equality
 * - $ne: not equal
 * - $in: array membership
 * - $nin: array non-membership
 * - $exists: presence / non-null check
 *
 * Unsupported operators fail explicitly and throw an error to prevent silent query broadening.
 */
export function matchesJsonPredicates(record: any, predicates: Record<string, any>): boolean {
  if (!predicates || Object.keys(predicates).length === 0) return true;
  if (!record || typeof record !== 'object') return false;

  for (const [dotPath, expected] of Object.entries(predicates)) {
    const parts = dotPath.split('.');
    let cur = record;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof cur === 'string' && i > 0) {
        try {
          cur = JSON.parse(cur);
        } catch {
          cur = undefined;
        }
      }
      if (cur === null || cur === undefined || typeof cur !== 'object') {
        cur = undefined;
        break;
      }
      cur = cur[part];
    }

    // Handle operator objects vs primitive values
    if (
      expected !== null &&
      typeof expected === 'object' &&
      !Array.isArray(expected) &&
      !(expected instanceof Date) &&
      !(expected instanceof RegExp)
    ) {
      const opKeys = Object.keys(expected);
      const hasDollarKey = opKeys.some((k) => k.startsWith('$'));

      if (hasDollarKey) {
        for (const op of opKeys) {
          if (!['$eq', '$ne', '$in', '$nin', '$exists'].includes(op)) {
            throw new Error(
              `[PrismaBridge] Unsupported JSON predicate operator "${op}" on field "${dotPath}". Queries cannot be broadened.`
            );
          }
        }

        if ('$exists' in expected) {
          const shouldExist = Boolean(expected.$exists);
          const doesExist = cur !== undefined && cur !== null;
          if (shouldExist !== doesExist) return false;
        }

        if ('$eq' in expected) {
          if (expected.$eq === null || expected.$eq === undefined) {
            if (cur !== null && cur !== undefined) return false;
          } else {
            if (cur === undefined || cur === null) return false;
            if (String(cur) !== String(expected.$eq)) return false;
          }
        }

        if ('$ne' in expected) {
          if (expected.$ne === null || expected.$ne === undefined) {
            if (cur === null || cur === undefined) return false;
          } else {
            if (cur !== undefined && cur !== null && String(cur) === String(expected.$ne)) return false;
          }
        }

        if ('$in' in expected) {
          if (!Array.isArray(expected.$in)) {
            throw new Error(`[PrismaBridge] $in operator requires an array on field "${dotPath}"`);
          }
          if (cur === undefined || cur === null) return false;
          const allowed = expected.$in.map((v: any) => String(v?._id || v?.id || v));
          if (!allowed.includes(String(cur))) return false;
        }

        if ('$nin' in expected) {
          if (!Array.isArray(expected.$nin)) {
            throw new Error(`[PrismaBridge] $nin operator requires an array on field "${dotPath}"`);
          }
          if (cur !== undefined && cur !== null) {
            const disallowed = expected.$nin.map((v: any) => String(v?._id || v?.id || v));
            if (disallowed.includes(String(cur))) return false;
          }
        }
        continue;
      }
    }

    // Direct primitive or non-operator value comparison
    if (expected === null || expected === undefined) {
      if (cur !== null && cur !== undefined) return false;
      continue;
    }
    if (cur === undefined || cur === null) {
      return false;
    }
    const expectedStr = String(expected?._id || expected?.id || expected);
    if (String(cur) !== expectedStr) {
      return false;
    }
  }
  return true;
}

/**
 * Normalizes MongoDB filter syntax to Prisma `where` clause.
 */
export function normalizeFilter(filter: any = {}, fieldMap: Record<string, string> = {}): any {
  if (!filter || typeof filter !== 'object') return {};
  if (Array.isArray(filter)) return filter.map((f) => normalizeFilter(f, fieldMap));

  const where: any = {};

  for (const [rawKey, rawValInitial] of Object.entries(filter)) {
    let key = rawKey;
    let rawVal: any = rawValInitial;

    // Handle _id -> id mapping
    if (key === '_id') {
      key = 'id';
    } else if (fieldMap[key]) {
      key = fieldMap[key];
    }

    // In MySQL / MariaDB, Prisma does not support dot-notation filters on JSON fields (e.g. 'metadata.interestId').
    // Omit from top-level Prisma where to prevent PrismaClientValidationError;
    // PrismaQueryBuilder, countDocuments, and mutation methods apply these predicates explicitly in memory.
    if (key.includes('.') || key.startsWith('metadata.') || key.startsWith('analytics.')) {
      continue;
    }

    // Convert ObjectId instances or objects with _id/id to string
    if (rawVal && typeof rawVal === 'object') {
      if (rawVal._id) rawVal = String(rawVal._id);
      else if (rawVal.id && typeof rawVal.id === 'string' && rawVal.id.length >= 24) rawVal = String(rawVal.id);
      else if (typeof rawVal.toString === 'function' && rawVal.constructor?.name === 'ObjectId') {
        rawVal = rawVal.toString();
      }
    }

    // Participants relational filter mapping for Conversation
    if (key === 'participants') {
      if (rawVal && typeof rawVal === 'object' && ('$all' in rawVal || Array.isArray((rawVal as any).$all))) {
        const allList = (rawVal as any).$all || [];
        const normalizedIds = allList.map((v: any) =>
          v && typeof v === 'object' ? String(v._id || v.id) : String(v)
        );
        if (!where.AND) where.AND = [];
        for (const pId of normalizedIds) {
          where.AND.push({ participants: { some: { userId: pId } } });
        }
        where.AND.push({ participants: { every: { userId: { in: normalizedIds } } } });
        continue;
      }

      if (rawVal && typeof rawVal === 'object' && '$in' in rawVal) {
        const inList = (rawVal as any).$in || [];
        const normalizedIds = (Array.isArray(inList) ? inList : [inList]).map((v: any) =>
          v && typeof v === 'object' ? String(v._id || v.id) : String(v)
        );
        where.participants = { some: { userId: { in: normalizedIds } } };
        continue;
      }

      if (rawVal && typeof rawVal === 'object' && '$eq' in rawVal) {
        const eqVal = (rawVal as any).$eq;
        const targetId = eqVal && typeof eqVal === 'object' ? String(eqVal._id || eqVal.id) : String(eqVal);
        where.participants = { some: { userId: targetId } };
        continue;
      }

      if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && !(rawVal instanceof Date)) {
        if (rawVal.some || rawVal.every || rawVal.none) {
          where.participants = rawVal;
          continue;
        }
      }

      const targetId = rawVal && typeof rawVal === 'object' ? String(rawVal._id || rawVal.id || rawVal.toString()) : String(rawVal);
      where.participants = { some: { userId: targetId } };
      continue;
    }

    // Top-level MongoDB operators
    if (key.startsWith('$')) {
      if (key === '$or') {
        if (Array.isArray(rawVal)) {
          where.OR = rawVal.map((sub) => normalizeFilter(sub, fieldMap));
        }
        continue;
      }

      if (key === '$and') {
        if (Array.isArray(rawVal)) {
          where.AND = rawVal.map((sub) => normalizeFilter(sub, fieldMap));
        }
        continue;
      }

      throw new Error(`[PrismaBridge] Unsupported top-level query operator "${key}". Queries cannot be broadened.`);
    }

    // Direct RegExp
    if (rawVal instanceof RegExp) {
      where[key] = parseRegexToPrismaFilter(rawVal.source);
      continue;
    }

    // Operators in nested objects
    if (rawVal && typeof rawVal === 'object' && !(rawVal instanceof Date) && !Array.isArray(rawVal)) {
      const opObj = rawVal as any;
      const opKeys = Object.keys(opObj);
      const hasDollarKeys = opKeys.some((k) => k.startsWith('$'));

      if (hasDollarKeys) {
        for (const op of opKeys) {
          if (!['$eq', '$ne', '$in', '$nin', '$gt', '$gte', '$lt', '$lte', '$regex', '$options', '$exists'].includes(op)) {
            throw new Error(`[PrismaBridge] Unsupported operator "${op}" on field "${key}". Queries cannot be broadened.`);
          }
        }

        const parsedOps: any = {};
        let hasOp = false;

        if ('$eq' in opObj) {
          parsedOps.equals = opObj.$eq;
          hasOp = true;
        }
        if ('$ne' in opObj) {
          parsedOps.not = opObj.$ne;
          hasOp = true;
        }
        if ('$exists' in opObj) {
          if (opObj.$exists) {
            parsedOps.not = null;
          } else {
            parsedOps.equals = null;
          }
          hasOp = true;
        }
        if ('$in' in opObj) {
          parsedOps.in = (Array.isArray(opObj.$in) ? opObj.$in : [opObj.$in]).map((v: any) =>
            v && typeof v === 'object' && (v._id || v.id)
              ? String(v._id || v.id)
              : v && typeof v.toString === 'function' && v.constructor?.name === 'ObjectId'
              ? v.toString()
              : v
          );
          hasOp = true;
        }
        if ('$nin' in opObj) {
          parsedOps.notIn = (Array.isArray(opObj.$nin) ? opObj.$nin : [opObj.$nin]).map((v: any) =>
            v && typeof v === 'object' && (v._id || v.id)
              ? String(v._id || v.id)
              : v && typeof v.toString === 'function' && v.constructor?.name === 'ObjectId'
              ? v.toString()
              : v
          );
          hasOp = true;
        }
        if ('$gt' in opObj) {
          parsedOps.gt = opObj.$gt;
          hasOp = true;
        }
        if ('$gte' in opObj) {
          parsedOps.gte = opObj.$gte;
          hasOp = true;
        }
        if ('$lt' in opObj) {
          parsedOps.lt = opObj.$lt;
          hasOp = true;
        }
        if ('$lte' in opObj) {
          parsedOps.lte = opObj.$lte;
          hasOp = true;
        }
        if ('$regex' in opObj) {
          const pattern = typeof opObj.$regex === 'string' ? opObj.$regex : opObj.$regex.source;
          const parsed = parseRegexToPrismaFilter(pattern);
          Object.assign(parsedOps, parsed);
          hasOp = true;
        }

        if (hasOp) {
          where[key] = parsedOps;
          continue;
        }
      }
    }

    // Default equality
    where[key] = rawVal;
  }

  return where;
}

/**
 * Normalizes MongoDB sort syntax to Prisma `orderBy` clause.
 * Prisma Client requires an array of single-key objects when sorting by multiple fields
 * (e.g. `[{ sortOrder: 'asc' }, { name: 'asc' }]`).
 */
export function normalizeSort(sort: any): Array<Record<string, 'asc' | 'desc'>> | undefined {
  if (!sort) return undefined;

  const result: Array<Record<string, 'asc' | 'desc'>> = [];

  if (typeof sort === 'string') {
    const parts = sort.trim().split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (part.startsWith('-')) {
        const field = part.slice(1);
        result.push({ [field === '_id' ? 'id' : field]: 'desc' });
      } else {
        const field = part.startsWith('+') ? part.slice(1) : part;
        result.push({ [field === '_id' ? 'id' : field]: 'asc' });
      }
    }
    return result.length > 0 ? result : undefined;
  }

  if (Array.isArray(sort)) {
    for (const item of sort) {
      if (Array.isArray(item) && item.length >= 2) {
        const fieldKey = item[0] === '_id' ? 'id' : item[0];
        const dir = item[1] === -1 || item[1] === 'desc' || item[1] === 'DESC' ? 'desc' : 'asc';
        result.push({ [fieldKey]: dir });
      } else if (item && typeof item === 'object') {
        for (const [k, v] of Object.entries(item)) {
          const fieldKey = k === '_id' ? 'id' : k;
          const dir = v === -1 || v === 'desc' || v === 'DESC' ? 'desc' : 'asc';
          result.push({ [fieldKey]: dir });
        }
      } else if (typeof item === 'string') {
        const sub = normalizeSort(item);
        if (sub) result.push(...sub);
      }
    }
    return result.length > 0 ? result : undefined;
  }

  if (typeof sort === 'object') {
    for (const [k, v] of Object.entries(sort)) {
      const fieldKey = k === '_id' ? 'id' : k;
      const dir = v === -1 || v === 'desc' || v === 'DESC' ? 'desc' : 'asc';
      result.push({ [fieldKey]: dir });
    }
    return result.length > 0 ? result : undefined;
  }

  return undefined;
}

/**
 * Clean data to conform to Prisma expectations
 */

/**
 * Safely strips legacy Mongoose schema fields for Profile and User before Prisma calls.
 * Explicitly and narrowly scoped to avoid altering other models (e.g. Award, BlogPost, JobOpening).
 */
export function cleanUnsupportedModelFields(data: any, modelName?: string): any {
  if (!data || typeof data !== 'object') return data;
  const mName = String(modelName || '').toLowerCase();
  if (mName === 'profile') {
    delete data.deletedAt;
    delete data.deletedBy;
    delete data.deletedById;
    delete data.deletionReason;
    delete data.statusReason;
    delete data.statusChangedAt;
    delete data.statusChangedBy;
    delete data.statusChangedById;
    delete data.weight;
  } else if (mName === 'user') {
    delete data.deletedAt;
    delete data.deletedBy;
    delete data.deletionReason;
    delete data.suspendedAt;
    delete data.suspendedBy;
    delete data.suspensionReason;
  } else if (mName === 'notification') {
    delete data.isDeleted;
    delete data.deletedAt;
    delete data.trashed;
    delete data.trashedAt;
  }
  return data;
}

/**
 * Normalizes legacy relation / foreign-key field names from Prisma Client scalar fields.
 * E.g. maps senderId -> sender, receiverId -> receiver, blockerId -> blocker, etc.
 * Preserves populated objects or existing values if already present.
 */
export function normalizeDelegateRecord(rec: any, delegateName?: string, fieldMap?: Record<string, string>): any {
  if (!rec || typeof rec !== 'object') return rec;
  const dName = String(delegateName || '').toLowerCase();

  // Reverse mapping for delegates using fieldMap (e.g. user -> userId)
  if (fieldMap && typeof fieldMap === 'object') {
    for (const [mongooseKey, prismaKey] of Object.entries(fieldMap)) {
      if (rec[mongooseKey] === undefined && rec[prismaKey] !== undefined) {
        rec[mongooseKey] = rec[prismaKey];
      }
    }
  }

  if (dName === 'profile') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
  } else if (dName === 'interest') {
    if (rec.sender === undefined && rec.senderId !== undefined) {
      rec.sender = rec.senderId;
    }
    if (rec.receiver === undefined && rec.receiverId !== undefined) {
      rec.receiver = rec.receiverId;
    }
    if (rec.senderProfile === undefined && rec.senderProfileId !== undefined) {
      rec.senderProfile = rec.senderProfileId;
    }
    if (rec.receiverProfile === undefined && rec.receiverProfileId !== undefined) {
      rec.receiverProfile = rec.receiverProfileId;
    }
  } else if (dName === 'block') {
    if (rec.blocker === undefined && rec.blockerId !== undefined) {
      rec.blocker = rec.blockerId;
    }
    if (rec.blockedUser === undefined && rec.blockedUserId !== undefined) {
      rec.blockedUser = rec.blockedUserId;
    }
  } else if (dName === 'shortlist') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
    if (rec.profile === undefined && rec.profileId !== undefined) {
      rec.profile = rec.profileId;
    }
  } else if (dName === 'contactrequest') {
    if (rec.requester === undefined && rec.requesterId !== undefined) {
      rec.requester = rec.requesterId;
    }
    if (rec.recipient === undefined && rec.recipientId !== undefined) {
      rec.recipient = rec.recipientId;
    }
  } else if (dName === 'verification') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
    if (rec.reviewedBy === undefined && rec.reviewedById !== undefined) {
      rec.reviewedBy = rec.reviewedById;
    }
  } else if (dName === 'notification') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
    if (rec.user === undefined && rec.recipient !== undefined) {
      rec.user = rec.recipient;
    }
    if (rec.broadcast === undefined && rec.broadcastId !== undefined) {
      rec.broadcast = rec.broadcastId;
    }
  } else if (dName === 'contactaccesslog') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
    if (rec.profileOwner === undefined && rec.profileOwnerId !== undefined) {
      rec.profileOwner = rec.profileOwnerId;
    }
    if (rec.contactRequest === undefined && rec.contactRequestId !== undefined) {
      rec.contactRequest = rec.contactRequestId;
    }
  } else if (dName === 'biodata' || dName === 'registration') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
    if (rec.profile === undefined && rec.profileId !== undefined) {
      rec.profile = rec.profileId;
    }
  } else if (dName === 'subscription' || dName === 'admin' || dName === 'securitylog' || dName === 'refreshtoken' || dName === 'passwordresettoken') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
  } else if (dName === 'payment') {
    if (rec.user === undefined && rec.userId !== undefined) {
      rec.user = rec.userId;
    }
    if (rec.subscription === undefined && rec.subscriptionId !== undefined) {
      rec.subscription = rec.subscriptionId;
    }
  } else if (dName === 'message') {
    if (rec.conversation === undefined && rec.conversationId !== undefined) {
      rec.conversation = rec.conversationId;
    }
    if (rec.sender === undefined && rec.senderId !== undefined) {
      rec.sender = rec.senderId;
    }
    if (rec.receiver === undefined && rec.receiverId !== undefined) {
      rec.receiver = rec.receiverId;
    }
  } else if (dName === 'auditlog') {
    if (rec.adminUser === undefined && rec.adminUserId !== undefined) {
      rec.adminUser = rec.adminUserId;
    }
    if (rec.targetProfile === undefined && rec.targetProfileId !== undefined) {
      rec.targetProfile = rec.targetProfileId;
    }
    if (rec.targetUser === undefined && rec.targetUserId !== undefined) {
      rec.targetUser = rec.targetUserId;
    }
    if (rec.relatedReport === undefined && rec.relatedReportId !== undefined) {
      rec.relatedReport = rec.relatedReportId;
    }
  }
  return rec;
}

export function cleanPrismaData(data: any, fieldMap: Record<string, string> = {}): any {
  if (!data || typeof data !== 'object') return data;
  const clean: any = { ...data };

  // Remove internal artifacts
  delete clean.__v;
  delete clean.save;
  delete clean.toObject;
  delete clean.toJSON;
  delete clean.$__;
  delete clean.$isNew;

  // Remap fields from fieldMap (e.g. user -> userId)
  for (const [k, v] of Object.entries(fieldMap)) {
    if (clean[k] !== undefined) {
      const val = clean[k];
      clean[v] =
        val && typeof val === 'object' && (val._id || val.id)
          ? String(val._id || val.id)
          : val && typeof val.toString === 'function' && val.constructor?.name === 'ObjectId'
          ? val.toString()
          : val;
      delete clean[k];
    }
  }

  // Convert any remaining ObjectId values in fields to string
  for (const [key, val] of Object.entries(clean)) {
    if (val && typeof val === 'object') {
      const v = val as any;
      if (v._id) clean[key] = String(v._id);
      else if (v.id && typeof v.id === 'string' && v.id.length >= 24) clean[key] = String(v.id);
      else if (typeof v.toString === 'function' && v.constructor?.name === 'ObjectId') {
        clean[key] = v.toString();
      }
    }
  }

  return clean;
}

/**
 * Prepares data for update operation.
 * Returns normal update data; `$setOnInsert` is handled separately
 * by the upsert-aware update methods.
 */
export function prepareUpdateData(update: any, fieldMap: Record<string, string> = {}): any {
  if (!update || typeof update !== 'object') return {};

  let data: any = {};

  if (update.$set) {
    data = { ...update.$set };
  } else {
    data = { ...update };
  }

  delete data._id;
  delete data.id;
  delete data.$set;
  delete data.$unset;
  delete data.$setOnInsert;
  delete data.$inc;

  // Handle $inc
  if (update.$inc) {
    for (const [incKey, incVal] of Object.entries(update.$inc)) {
      const targetKey = fieldMap[incKey] || incKey;
      data[targetKey] = { increment: Number(incVal) };
    }
  }

  // Strip raw participants array on scalar update to avoid Prisma validation error
  if (Array.isArray(data.participants)) {
    delete data.participants;
  }

  return cleanPrismaData(data, fieldMap);
}

/**
 * Prepares fields that should only be applied when an upsert
 * creates a new record.
 */
export function prepareSetOnInsertData(update: any, fieldMap: Record<string, string> = {}): any {
  if (!update || typeof update !== 'object' || !update.$setOnInsert) {
    return {};
  }

  const data = { ...update.$setOnInsert };

  delete data._id;
  delete data.id;

  return cleanPrismaData(data, fieldMap);
}

/**
 * Prepares fields for a create operation when an upsert-aware update (e.g. findOneAndUpdate with upsert: true)
 * cannot find an existing record and must create a new one.
 *
 * Ensures:
 * 1. Fields like `$inc: { visitCount: 1 }` (which Prisma converts to `{ increment: 1 }` for updates)
 *    are converted into scalar numbers (e.g. `visitCount: 1`) so Prisma `create` does not fail with
 *    "Argument visitCount: Invalid value provided. Expected Int, provided Object."
 * 2. Values in `$setOnInsert` are merged.
 * 3. Atomic operators like `{ increment: X }`, `{ decrement: X }`, `{ set: X }` are unwrapped into scalar primitives.
 * 4. Filter values from `where` that are objects (like `{ equals: '...' }`) are unwrapped to primitive values.
 */
export function prepareCreateDataFromUpdate(
  update: any,
  where: any,
  setOnInsertData: any,
  updateData: any,
  fieldMap: Record<string, string> = {}
): any {
  const createData: any = {};

  // Extract scalar values from where
  if (where && typeof where === 'object') {
    for (const [k, v] of Object.entries(where)) {
      if (k === 'OR' || k === 'AND' || k === 'NOT') continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        if ('equals' in (v as any)) {
          createData[k] = (v as any).equals;
        } else if (!('contains' in (v as any) || 'startsWith' in (v as any) || 'endsWith' in (v as any) || 'in' in (v as any))) {
          createData[k] = v;
        }
      } else {
        createData[k] = v;
      }
    }
  }

  // Merge setOnInsertData
  if (setOnInsertData && typeof setOnInsertData === 'object') {
    Object.assign(createData, setOnInsertData);
  }

  // Merge updateData, unwrapping update operators to scalar values
  if (updateData && typeof updateData === 'object') {
    for (const [key, val] of Object.entries(updateData)) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        if ('increment' in (val as any)) {
          createData[key] = Number((val as any).increment);
        } else if ('decrement' in (val as any)) {
          createData[key] = -Number((val as any).decrement);
        } else if ('set' in (val as any)) {
          createData[key] = (val as any).set;
        } else {
          createData[key] = val;
        }
      } else {
        createData[key] = val;
      }
    }
  }

  // If $inc was present in the update object, ensure scalar numbers are initialized
  if (update?.$inc) {
    for (const [incKey, incVal] of Object.entries(update.$inc)) {
      const targetKey = fieldMap[incKey] || incKey;
      if (
        createData[targetKey] === undefined ||
        (typeof createData[targetKey] === 'object' && (createData[targetKey] as any)?.increment !== undefined)
      ) {
        createData[targetKey] = Number(incVal);
      }
    }
  }

  return cleanPrismaData(createData, fieldMap);
}

/**
 * Attaches a `.save()` method to a returned database record so it behaves like a Mongoose document.
 */
function attachSave(record: any, delegate: any, fieldMap: Record<string, string> = {}, delegateName = '') {
  if (!record || typeof record !== 'object') return record;

  Object.defineProperty(record, 'save', {
    enumerable: false,
    writable: true,
    configurable: true,
    value: async function () {
      const self = this as any;
      const id = self.id || self._id;
      const dataToSave = cleanPrismaData({ ...self }, fieldMap);
      delete dataToSave.id;
      delete dataToSave._id;
      if (Array.isArray(dataToSave.participants)) {
        delete dataToSave.participants;
      }

      for (const [key, val] of Object.entries(dataToSave)) {
        if (typeof val === 'function') {
          delete dataToSave[key];
        }
      }

      const mName = String(delegateName || delegate?.name || '').toLowerCase();
      if (mName.includes('contactinquiry')) {
        dataToSave.replies = dataToSave.replies ?? [];
        dataToSave.statusHistory = dataToSave.statusHistory ?? [];
      }

      cleanUnsupportedModelFields(dataToSave, mName);

      const currentParticipants = self.participants;

      const saved = await delegate.upsert({
        where: { id },
        create: { id, ...dataToSave },
        update: dataToSave,
      });

      Object.assign(self, normalizeDelegateRecord(toClient(saved), String(delegateName)));
      if (currentParticipants !== undefined) {
        self.participants = currentParticipants;
      }
      return self;
    },
  });

  if (!record.toObject) {
    Object.defineProperty(record, 'toObject', {
      enumerable: false,
      writable: true,
      configurable: true,
      value: function () {
        const obj = { ...this };
        delete obj.save;
        delete obj.toObject;
        delete obj.toJSON;
        return obj;
      },
    });
  }

  if (!record.toJSON) {
    Object.defineProperty(record, 'toJSON', {
      enumerable: false,
      writable: true,
      configurable: true,
      value: function () {
        return this.toObject ? this.toObject() : { ...this };
      },
    });
  }

  return record;
}

interface RelationMeta {
  targetModel: string;
  isList: boolean;
}

const prismaModelRelations: Record<string, Record<string, RelationMeta>> = {};
const prismaModelAllFields: Record<string, Set<string>> = {};

if (Prisma?.dmmf?.datamodel?.models) {
  for (const model of Prisma.dmmf.datamodel.models) {
    const mName = model.name.toLowerCase();
    prismaModelRelations[mName] = {};
    prismaModelAllFields[mName] = new Set(model.fields.map((f: any) => f.name));
    for (const field of model.fields) {
      if (field.kind === 'object') {
        prismaModelRelations[mName][field.name] = {
          targetModel: field.type.toLowerCase(),
          isList: field.isList,
        };
      }
    }
  }
}

/**
 * Checks whether a given path chain (e.g. ['participants', 'user']) consists entirely of valid Prisma relations.
 */
function resolvePrismaRelationPath(
  startModel: string,
  pathSegments: string[]
): { isValid: boolean; leafModel?: string } {
  if (!startModel || pathSegments.length === 0) return { isValid: false };
  let currentModel = startModel.toLowerCase();
  for (const segment of pathSegments) {
    const rel = prismaModelRelations[currentModel]?.[segment];
    if (!rel) return { isValid: false };
    currentModel = rel.targetModel;
  }
  return { isValid: true, leafModel: currentModel };
}

/**
 * Merges nested path segments into a valid nested Prisma include structure without duplicate keys or dotted strings.
 * Example: ['a', 'b'] with leafValue = true -> { a: { include: { b: true } } }
 */
function addNestedInclude(
  rootInclude: Record<string, any>,
  segments: string[],
  leafValue: any
): void {
  if (!segments || segments.length === 0) return;
  if (segments.length === 1) {
    const key = segments[0];
    if (rootInclude[key] && typeof rootInclude[key] === 'object' && rootInclude[key].include) {
      if (leafValue && typeof leafValue === 'object' && leafValue.select) {
        rootInclude[key].select = { ...(rootInclude[key].select || {}), ...leafValue.select };
      }
    } else {
      rootInclude[key] = leafValue;
    }
    return;
  }

  const [head, ...tail] = segments;
  if (!rootInclude[head] || typeof rootInclude[head] !== 'object' || !rootInclude[head].include) {
    rootInclude[head] = { include: {} };
  }
  addNestedInclude(rootInclude[head].include, tail, leafValue);
}

/**
 * Parses whitespace-separated select field strings (e.g. 'name code' or '-password')
 * into Prisma select dictionary with id/_id mapped to id.
 */
function parseSelectFields(selectStr?: string): Record<string, boolean> | undefined {
  if (!selectStr || typeof selectStr !== 'string') return undefined;
  const parts = selectStr.split(/\s+/).filter(Boolean);
  if (parts.length === 0 || parts.some((p) => p.startsWith('-'))) return undefined;
  const selectObj: Record<string, boolean> = { id: true };
  for (const p of parts) {
    selectObj[p === '_id' ? 'id' : p] = true;
  }
  return selectObj;
}

interface VirtualFieldMeta {
  delegate: string;
  idKey: string;
  nameKey: string;
  isList?: boolean;
}

const VIRTUAL_FIELD_TO_MODEL: Record<string, VirtualFieldMeta> = {
  // Country
  countryId: { delegate: 'country', idKey: 'countryId', nameKey: 'country' },
  country: { delegate: 'country', idKey: 'countryId', nameKey: 'country' },
  // State
  stateId: { delegate: 'state', idKey: 'stateId', nameKey: 'state' },
  state: { delegate: 'state', idKey: 'stateId', nameKey: 'state' },
  // District
  districtId: { delegate: 'district', idKey: 'districtId', nameKey: 'district' },
  district: { delegate: 'district', idKey: 'districtId', nameKey: 'district' },
  // SubDistrict
  subDistrictId: { delegate: 'subDistrict', idKey: 'subDistrictId', nameKey: 'subDistrict' },
  subDistrict: { delegate: 'subDistrict', idKey: 'subDistrictId', nameKey: 'subDistrict' },
  // City
  cityId: { delegate: 'city', idKey: 'cityId', nameKey: 'city' },
  city: { delegate: 'city', idKey: 'cityId', nameKey: 'city' },
  // Village
  villageId: { delegate: 'village', idKey: 'villageId', nameKey: 'village' },
  village: { delegate: 'village', idKey: 'villageId', nameKey: 'village' },

  // Religion
  religionId: { delegate: 'religion', idKey: 'religionId', nameKey: 'religion' },
  religion: { delegate: 'religion', idKey: 'religionId', nameKey: 'religion' },
  // Caste
  casteId: { delegate: 'caste', idKey: 'casteId', nameKey: 'caste' },
  caste: { delegate: 'caste', idKey: 'casteId', nameKey: 'caste' },
  // SubCaste
  subCasteId: { delegate: 'subCaste', idKey: 'subCasteId', nameKey: 'subCaste' },
  subCaste: { delegate: 'subCaste', idKey: 'subCasteId', nameKey: 'subCaste' },

  // Language
  motherTongueId: { delegate: 'language', idKey: 'motherTongueId', nameKey: 'motherTongue' },
  motherTongue: { delegate: 'language', idKey: 'motherTongueId', nameKey: 'motherTongue' },
  otherLanguagesIds: { delegate: 'language', idKey: 'otherLanguagesIds', nameKey: 'otherLanguages', isList: true },
  otherLanguages: { delegate: 'language', idKey: 'otherLanguagesIds', nameKey: 'otherLanguages', isList: true },
};

/**
 * Resolves virtual and non-Prisma populates (such as Profile JSON subdocuments and Report.moderator)
 * post-query by batching database queries.
 */
async function resolveVirtualPopulates(
  records: any[],
  populates: Array<{ path: string; select?: string }>,
  delegateName: string
): Promise<void> {
  if (!records || records.length === 0 || !populates || populates.length === 0) return;

  for (const pop of populates) {
    const rawPath = typeof pop === 'string' ? pop : pop.path;
    const selectStr = typeof pop === 'object' ? pop.select : undefined;
    const selectObj = parseSelectFields(selectStr);

    // Generic user populate (for Profile, Admin, Payment, Subscription, etc.)
    if (rawPath === 'user') {
      const userIds = new Set<string>();
      for (const rec of records) {
        if (!rec) continue;
        const val =
          rec.userId ||
          rec.user_id ||
          (typeof rec.user === 'string' ? rec.user : rec.user?.id || rec.user?._id);
        if (val && typeof val === 'string') userIds.add(val);
      }
      if (userIds.size > 0) {
        const users = await (prisma as any).user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: selectObj ? { id: true, ...selectObj } : undefined,
        });
        const userMap = new Map(users.map((u: any) => [u.id, toClient(u)]));
        for (const rec of records) {
          if (!rec) continue;
          const val =
            rec.userId ||
            rec.user_id ||
            (typeof rec.user === 'string' ? rec.user : rec.user?.id || rec.user?._id);
          rec.user = (val && userMap.get(val)) || null;
        }
      } else {
        for (const rec of records) {
          if (!rec) continue;
          rec.user = null;
        }
      }
      continue;
    }

    // 1. Report relations (reporter, reportedUser, reportedProfile, moderator, handledByAdminId)
    // Handled virtually to safely tolerate orphaned foreign keys without Prisma Inconsistent query result crash
    if (delegateName === 'report' && (rawPath === 'reporter' || rawPath === 'reportedUser')) {
      const fieldId = rawPath === 'reporter' ? 'reporterId' : 'reportedUserId';
      const userIds = new Set<string>();
      for (const rec of records) {
        if (!rec) continue;
        const val =
          rec[fieldId] ||
          (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
        if (val && typeof val === 'string') userIds.add(val);
      }
      if (userIds.size > 0) {
        const users = await (prisma as any).user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: selectObj ? { id: true, ...selectObj } : undefined,
        });
        const userMap = new Map(users.map((u: any) => [u.id, toClient(u)]));
        for (const rec of records) {
          if (!rec) continue;
          const val =
            rec[fieldId] ||
            (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
          rec[rawPath] = (val && userMap.get(val)) || null;
        }
      } else {
        for (const rec of records) {
          if (!rec) continue;
          rec[rawPath] = null;
        }
      }
      continue;
    }

    // 1b. Interest relations (sender, receiver, senderProfile, receiverProfile)
    // Handled virtually to safely tolerate orphaned foreign keys without Prisma Inconsistent query result crash
    if (delegateName === 'interest' && (rawPath === 'sender' || rawPath === 'receiver')) {
      const fieldId = rawPath === 'sender' ? 'senderId' : 'receiverId';
      const userIds = new Set<string>();
      for (const rec of records) {
        if (!rec) continue;
        const val =
          rec[fieldId] ||
          (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
        if (val && typeof val === 'string') userIds.add(val);
      }
      if (userIds.size > 0) {
        const users = await (prisma as any).user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: selectObj ? { id: true, ...selectObj } : undefined,
        });
        const userMap = new Map(users.map((u: any) => [u.id, toClient(u)]));
        for (const rec of records) {
          if (!rec) continue;
          const val =
            rec[fieldId] ||
            (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
          rec[rawPath] = (val && userMap.get(val)) || null;
        }
      } else {
        for (const rec of records) {
          if (!rec) continue;
          rec[rawPath] = null;
        }
      }
      continue;
    }

    if (delegateName === 'interest' && (rawPath === 'senderProfile' || rawPath === 'receiverProfile')) {
      const fieldId = rawPath === 'senderProfile' ? 'senderProfileId' : 'receiverProfileId';
      const profileIds = new Set<string>();
      for (const rec of records) {
        if (!rec) continue;
        const val =
          rec[fieldId] ||
          (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
        if (val && typeof val === 'string') profileIds.add(val);
      }
      if (profileIds.size > 0) {
        const profiles = await (prisma as any).profile.findMany({
          where: { id: { in: Array.from(profileIds) } },
          select: selectObj ? { id: true, ...selectObj } : undefined,
        });
        const profMap = new Map(profiles.map((p: any) => [p.id, toClient(p)]));
        for (const rec of records) {
          if (!rec) continue;
          const val =
            rec[fieldId] ||
            (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
          rec[rawPath] = (val && profMap.get(val)) || null;
        }
      } else {
        for (const rec of records) {
          if (!rec) continue;
          rec[rawPath] = null;
        }
      }
      continue;
    }

    if (delegateName === 'report' && rawPath === 'reportedProfile') {
      const profileIds = new Set<string>();
      for (const rec of records) {
        if (!rec) continue;
        const val =
          rec.reportedProfileId ||
          (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
        if (val && typeof val === 'string') profileIds.add(val);
      }
      if (profileIds.size > 0) {
        const profiles = await (prisma as any).profile.findMany({
          where: { id: { in: Array.from(profileIds) } },
          select: selectObj ? { id: true, ...selectObj } : undefined,
        });
        const profMap = new Map(profiles.map((p: any) => [p.id, toClient(p)]));
        for (const rec of records) {
          if (!rec) continue;
          const val =
            rec.reportedProfileId ||
            (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
          rec[rawPath] = (val && profMap.get(val)) || null;
        }
      } else {
        for (const rec of records) {
          if (!rec) continue;
          rec[rawPath] = null;
        }
      }
      continue;
    }

    // 2. Moderator / HandledByAdmin (Report or other admin models)
    if (rawPath === 'moderator' || rawPath === 'handledByAdminId') {
      const fieldId = rawPath === 'moderator' ? 'moderatorId' : 'handledByAdminId';
      const userIds = new Set<string>();
      for (const rec of records) {
        if (!rec) continue;
        const val =
          rec[fieldId] ||
          (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
        if (val && typeof val === 'string') userIds.add(val);
      }

      if (userIds.size > 0) {
        const users = await (prisma as any).user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: selectObj ? { id: true, ...selectObj } : undefined,
        });
        const userMap = new Map(users.map((u: any) => [u.id, toClient(u)]));
        for (const rec of records) {
          if (!rec) continue;
          const val =
            rec[fieldId] ||
            (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
          if (val && userMap.has(val)) {
            rec[rawPath] = userMap.get(val);
          } else {
            rec[rawPath] = null;
          }
        }
      } else {
        for (const rec of records) {
          if (!rec) continue;
          if (!rec[rawPath] || typeof rec[rawPath] === 'string') {
            rec[rawPath] = null;
          }
        }
      }
      continue;
    }

    // 2. Generic createdBy / updatedBy / deletedBy scalar user IDs
    if (rawPath === 'createdBy' || rawPath === 'updatedBy' || rawPath === 'deletedBy') {
      const fieldId = rawPath + 'Id';
      const userIds = new Set<string>();
      for (const rec of records) {
        if (!rec) continue;
        const val =
          rec[fieldId] ||
          (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
        if (val && typeof val === 'string') userIds.add(val);
      }
      if (userIds.size > 0) {
        const users = await (prisma as any).user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: selectObj ? { id: true, ...selectObj } : undefined,
        });
        const userMap = new Map(users.map((u: any) => [u.id, toClient(u)]));
        for (const rec of records) {
          if (!rec) continue;
          const val =
            rec[fieldId] ||
            (typeof rec[rawPath] === 'string' ? rec[rawPath] : rec[rawPath]?.id || rec[rawPath]?._id);
          if (val && userMap.has(val)) {
            rec[rawPath] = userMap.get(val);
          }
        }
      }
      continue;
    }

    // 3. Dotted paths on JSON subdocuments (e.g. currentLocation.countryId, nativePlaceDetails.stateId, communityDetails.religionId, languageDetails.motherTongueId)
    const parts = rawPath.split('.');
    if (parts.length === 2) {
      const [subDocKey, fieldKey] = parts;
      const mapping = VIRTUAL_FIELD_TO_MODEL[fieldKey];
      if (mapping && (prisma as any)[mapping.delegate]) {
        const idSet = new Set<string>();
        for (const rec of records) {
          if (!rec) continue;
          let subDoc = rec[subDocKey];
          if (typeof subDoc === 'string') {
            try {
              subDoc = JSON.parse(subDoc);
              rec[subDocKey] = subDoc;
            } catch (_) {}
          }
          if (subDoc && typeof subDoc === 'object') {
            const rawVal = subDoc[mapping.idKey] || subDoc[mapping.nameKey];
            if (mapping.isList) {
              const list = Array.isArray(rawVal) ? rawVal : rawVal ? [rawVal] : [];
              for (const item of list) {
                const id = typeof item === 'object' && item ? item.id || item._id : item;
                if (id && typeof id === 'string') idSet.add(id);
              }
            } else {
              const id = typeof rawVal === 'object' && rawVal ? rawVal.id || rawVal._id : rawVal;
              if (id && typeof id === 'string') idSet.add(id);
            }
          }
        }

        if (idSet.size > 0) {
          const entities = await (prisma as any)[mapping.delegate].findMany({
            where: { id: { in: Array.from(idSet) } },
            select: selectObj ? { id: true, ...selectObj } : undefined,
          });
          const entityMap = new Map(entities.map((e: any) => [e.id, toClient(e)]));

          for (const rec of records) {
            if (!rec) continue;
            let subDoc = rec[subDocKey];
            if (typeof subDoc === 'string') {
              try {
                subDoc = JSON.parse(subDoc);
                rec[subDocKey] = subDoc;
              } catch (_) {}
            }
            if (subDoc && typeof subDoc === 'object') {
              const rawVal = subDoc[mapping.idKey] || subDoc[mapping.nameKey];
              if (mapping.isList) {
                const list = Array.isArray(rawVal) ? rawVal : rawVal ? [rawVal] : [];
                const populated = list.map((item: any) => {
                  const id = typeof item === 'object' && item ? item.id || item._id : item;
                  return entityMap.get(id) || item;
                });
                subDoc[mapping.idKey] = populated;
                subDoc[mapping.nameKey] = populated;
              } else {
                const id = typeof rawVal === 'object' && rawVal ? rawVal.id || rawVal._id : rawVal;
                if (id && entityMap.has(id)) {
                  const populated = entityMap.get(id);
                  subDoc[mapping.idKey] = populated;
                  subDoc[mapping.nameKey] = populated;
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Safely parses JSON-encoded participants array from MariaDB conversations table.
 */
function parseParticipantsJson(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item: any) => (typeof item === 'string' ? item : String(item?.$oid || item?.id || item?._id || '')))
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => (typeof item === 'string' ? item : String(item?.$oid || item?.id || item?._id || '')))
          .filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Evaluates whether an actual conversation status string matches a status filter
 * (which may be a direct string or operator object like { $ne: 'ARCHIVED' }, { $in: [...] }, { $nin: [...] }).
 */
export function matchesStatusFilter(actualStatus: any, filter: any): boolean {
  if (filter === undefined) return true;
  const actualStr = actualStatus !== null && actualStatus !== undefined ? String(actualStatus) : null;
  if (typeof filter === 'string') {
    return actualStr === filter;
  }
  if (filter && typeof filter === 'object') {
    if ('$eq' in filter) {
      const eqVal = filter.$eq !== null && filter.$eq !== undefined ? String(filter.$eq) : null;
      if (actualStr !== eqVal) return false;
    }
    if ('$ne' in filter) {
      const neVal = filter.$ne !== null && filter.$ne !== undefined ? String(filter.$ne) : null;
      if (actualStr === neVal) return false;
    }
    if ('$in' in filter) {
      if (!Array.isArray(filter.$in)) {
        throw new Error(`[PrismaBridge] $in operator requires an array in status filter`);
      }
      const allowed = filter.$in.map((v: any) => (v !== null && v !== undefined ? String(v) : null));
      if (!allowed.includes(actualStr)) return false;
    }
    if ('$nin' in filter) {
      if (!Array.isArray(filter.$nin)) {
        throw new Error(`[PrismaBridge] $nin operator requires an array in status filter`);
      }
      const disallowed = filter.$nin.map((v: any) => (v !== null && v !== undefined ? String(v) : null));
      if (disallowed.includes(actualStr)) return false;
    }
    return true;
  }
  return false;
}

/**
 * Extracts participant IDs, size constraint, interest ID, and status criteria from a conversation filter.
 */
export function extractConversationCriteria(filter: any = {}): {
  requiredParticipants: string[];
  requiredSize?: number;
  interestId?: string;
  isOrWithInterest: boolean;
  status?: string;
  statusFilter?: any;
  complianceStatus?: string;
  id?: string;
} {
  const result = {
    requiredParticipants: [] as string[],
    requiredSize: undefined as number | undefined,
    interestId: undefined as string | undefined,
    isOrWithInterest: false,
    status: undefined as string | undefined,
    statusFilter: undefined as any,
    complianceStatus: undefined as string | undefined,
    id: undefined as string | undefined,
  };

  if (!filter || typeof filter !== 'object') return result;

  if (filter._id || filter.id) {
    result.id = String(filter.id || filter._id);
  }
  if (filter.interest || filter.interestId) {
    result.interestId = String(filter.interest || filter.interestId);
  }
  if (filter.status !== undefined) {
    if (typeof filter.status === 'string') {
      result.status = filter.status;
      result.statusFilter = filter.status;
    } else if (filter.status && typeof filter.status === 'object') {
      const ops = Object.keys(filter.status);
      const supportedOps = ['$eq', '$ne', '$in', '$nin'];
      for (const op of ops) {
        if (!supportedOps.includes(op)) {
          throw new Error(
            `[PrismaBridge] Unsupported operator "${op}" in conversation status filter. Queries cannot be broadened.`
          );
        }
      }
      result.statusFilter = filter.status;
      if (typeof filter.status.$eq === 'string') {
        result.status = filter.status.$eq;
      }
    } else {
      throw new Error(`[PrismaBridge] Invalid status filter type: ${typeof filter.status}`);
    }
  }
  if (filter.complianceStatus && typeof filter.complianceStatus === 'string') {
    result.complianceStatus = filter.complianceStatus;
  }

  const parsePartFilter = (p: any) => {
    if (!p) return;
    if (typeof p === 'object') {
      if (Array.isArray(p.$all)) {
        result.requiredParticipants = p.$all.map((item: any) =>
          item && typeof item === 'object' ? String(item._id || item.id) : String(item)
        );
      } else if (Array.isArray(p.$in)) {
        result.requiredParticipants = p.$in.map((item: any) =>
          item && typeof item === 'object' ? String(item._id || item.id) : String(item)
        );
      } else if (p.$eq) {
        result.requiredParticipants = [String(p.$eq._id || p.$eq.id || p.$eq)];
      }
      if (p.$size !== undefined) {
        result.requiredSize = Number(p.$size);
      }
    } else if (typeof p === 'string') {
      result.requiredParticipants = [p];
    }
  };

  if (filter.participants) {
    parsePartFilter(filter.participants);
  }

  if (Array.isArray(filter.$or)) {
    for (const sub of filter.$or) {
      if (sub && typeof sub === 'object') {
        if (sub.interest || sub.interestId) {
          result.interestId = String(sub.interest || sub.interestId);
          result.isOrWithInterest = true;
        }
        if (sub.participants) {
          result.isOrWithInterest = true;
          parsePartFilter(sub.participants);
        }
      }
    }
  }

  return result;
}

/**
 * Recursively strips relational 'participants' conditions from Prisma where objects
 * to prevent Prisma from executing joins against the missing conversation_participants table.
 */
function stripRelationalParticipants(where: any): any {
  if (!where || typeof where !== 'object') return where;
  if (Array.isArray(where)) {
    return where.map(stripRelationalParticipants).filter((item) => item && Object.keys(item).length > 0);
  }

  const clean: any = {};
  for (const [k, v] of Object.entries(where)) {
    if (k === 'participants') continue;
    if (k === 'AND' && Array.isArray(v)) {
      const stripped = v.map(stripRelationalParticipants).filter((item) => item && Object.keys(item).length > 0);
      if (stripped.length > 0) clean.AND = stripped;
      continue;
    }
    if (k === 'OR' && Array.isArray(v)) {
      const stripped = v.map(stripRelationalParticipants).filter((item) => item && Object.keys(item).length > 0);
      if (stripped.length > 0) clean.OR = stripped;
      continue;
    }
    if (k === 'NOT' && Array.isArray(v)) {
      const stripped = v.map(stripRelationalParticipants).filter((item) => item && Object.keys(item).length > 0);
      if (stripped.length > 0) clean.NOT = stripped;
      continue;
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      clean[k] = stripRelationalParticipants(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Chainable query builder simulating Mongoose Query API on top of Prisma.
 */
export class PrismaQueryBuilder<T = any> implements PromiseLike<T> {
  private prismaDelegate: any;
  private rawFilter: any;
  private where: any;
  private jsonPredicates: Record<string, any>;
  private fieldMap: Record<string, string>;
  private isFindOne: boolean;
  private delegateName: string;
  private queryOptions: QueryOptions = {};
  private populateParticipants = false;
  private populatedRelations: Array<{ path: string; relationName: string }> = [];
  private virtualPopulates: Array<{ path: string; select?: string }> = [];

  constructor(
    prismaDelegate: any,
    filter: any = {},
    isFindOne = false,
    fieldMap: Record<string, string> = {},
    delegateName = ''
  ) {
    this.prismaDelegate = prismaDelegate;
    this.rawFilter = filter;
    this.jsonPredicates = extractDotNotationPredicates(filter);
    this.fieldMap = fieldMap;
    this.where = normalizeFilter(filter, fieldMap);
    this.isFindOne = isFindOne;
    this.delegateName = delegateName;
  }

  sort(sortObj: any): this {
    this.queryOptions.sort = normalizeSort(sortObj);
    return this;
  }

  skip(n: number): this {
    this.queryOptions.skip = n;
    return this;
  }

  limit(n: number): this {
    this.queryOptions.limit = n;
    return this;
  }

  select(fields: string | Record<string, number>): this {
    if (typeof fields === 'string') {
      const parts = fields.split(/\s+/).filter(Boolean);
      const isExclusion = parts.some((p) => p.startsWith('-'));
      if (!isExclusion) {
        const selectObj: any = { id: true };
        for (const p of parts) {
          selectObj[p === '_id' ? 'id' : p] = true;
        }
        this.queryOptions.select = selectObj;
      }
    }
    return this;
  }

  populate<P = any>(path: string | { path: string; select?: string; populate?: any }, selectFields?: string): this {
    const targetPath = typeof path === 'string' ? path : path.path;
    const targetSelect = typeof path === 'object' && path.select ? path.select : selectFields;

    if (!this.queryOptions.include) {
      this.queryOptions.include = {};
    }

    if (this.delegateName === 'conversation' && targetPath === 'participants') {
      const selectFieldsObj = parseSelectFields(targetSelect);
      this.queryOptions.include.participants = {
        include: {
          user: selectFieldsObj ? { select: selectFieldsObj } : true,
        },
      };
      this.populateParticipants = true;
      return this;
    }

    // Map Mongoose FK paths (e.g. districtId, stateId, religionId) to Prisma relation field names
    const POPULATE_RELATION_MAP: Record<string, string> = {
      districtId: 'district',
      stateId: 'state',
      subDistrictId: 'subDistrict',
      religionId: 'religion',
      casteId: 'caste',
      subCasteId: 'subCaste',
      countryId: 'country',
      userId: 'user',
      createdBy: 'createdBy',
      updatedBy: 'updatedBy',
      deletedBy: 'deletedBy',
    };

    const isDotted = targetPath.includes('.');
    const selectObj = parseSelectFields(targetSelect);
    const leafValue = selectObj ? { select: selectObj } : true;

    if (!isDotted) {
      if (
        (this.delegateName === 'report' &&
          ['reporter', 'reportedUser', 'reportedProfile', 'moderator', 'handledByAdminId'].includes(targetPath)) ||
        ((this.delegateName === 'profile' || this.delegateName === 'admin' || this.delegateName === 'payment' || this.delegateName === 'subscription') && targetPath === 'user') ||
        (this.delegateName === 'interest' && ['sender', 'receiver', 'senderProfile', 'receiverProfile'].includes(targetPath))
      ) {
        this.virtualPopulates.push({ path: targetPath, select: targetSelect });
        return this;
      }

      const relationName =
        POPULATE_RELATION_MAP[targetPath] ||
        (targetPath.endsWith('Id') ? targetPath.slice(0, -2) : targetPath);
      const isRealRelation = resolvePrismaRelationPath(this.delegateName, [relationName]).isValid;

      if (isRealRelation) {
        this.populatedRelations.push({ path: targetPath, relationName });
        addNestedInclude(this.queryOptions.include, [relationName], leafValue);
      } else {
        // Scalar / virtual populate (e.g. moderator, createdBy, etc.)
        this.virtualPopulates.push({ path: targetPath, select: targetSelect });
      }
      return this;
    }

    // Dotted path (e.g. currentLocation.countryId or nested relations)
    const rawSegments = targetPath.split('.');
    const normalizedSegments = rawSegments.map(
      (seg) => POPULATE_RELATION_MAP[seg] || (seg.endsWith('Id') ? seg.slice(0, -2) : seg)
    );

    const isRealNestedRelation = resolvePrismaRelationPath(this.delegateName, normalizedSegments).isValid;
    if (isRealNestedRelation) {
      addNestedInclude(this.queryOptions.include, normalizedSegments, leafValue);
      this.populatedRelations.push({
        path: targetPath,
        relationName: normalizedSegments[normalizedSegments.length - 1],
      });
    } else {
      // JSON subdocument or virtual dotted populate
      this.virtualPopulates.push({ path: targetPath, select: targetSelect });
    }
    return this;
  }

  lean(): this {
    return this;
  }

  private async executeConversationFallback(args: any, formatRecord: (rec: any) => any): Promise<any> {
    const criteria = extractConversationCriteria(this.rawFilter);
    let candidateRows: any[] = [];

    try {
      if (criteria.requiredParticipants.length > 0) {
        const p1 = criteria.requiredParticipants[0];
        const p2 = criteria.requiredParticipants.length > 1 ? criteria.requiredParticipants[1] : undefined;
        const p1Pattern = `%"${p1}"%`;
        const p2Pattern = p2 ? `%"${p2}"%` : undefined;

        let statusSql = Prisma.empty;
        if (criteria.statusFilter !== undefined) {
          if (typeof criteria.statusFilter === 'string') {
            statusSql = Prisma.sql`AND \`status\` = ${criteria.statusFilter}`;
          } else if (criteria.statusFilter && typeof criteria.statusFilter === 'object') {
            if ('$ne' in criteria.statusFilter) {
              statusSql = Prisma.sql`AND (\`status\` != ${criteria.statusFilter.$ne} OR \`status\` IS NULL)`;
            } else if ('$eq' in criteria.statusFilter) {
              statusSql = Prisma.sql`AND \`status\` = ${criteria.statusFilter.$eq}`;
            } else if ('$in' in criteria.statusFilter && Array.isArray(criteria.statusFilter.$in)) {
              statusSql = Prisma.sql`AND \`status\` IN (${Prisma.join(criteria.statusFilter.$in)})`;
            } else if ('$nin' in criteria.statusFilter && Array.isArray(criteria.statusFilter.$nin)) {
              statusSql = Prisma.sql`AND (\`status\` NOT IN (${Prisma.join(criteria.statusFilter.$nin)}) OR \`status\` IS NULL)`;
            }
          }
        }

        if (criteria.isOrWithInterest && criteria.interestId) {
          if (p2Pattern) {
            candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
              SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
              FROM \`conversations\`
              WHERE (\`interest\` = ${criteria.interestId} OR (\`participants\` LIKE ${p1Pattern} AND \`participants\` LIKE ${p2Pattern}))
              ${statusSql}
              ORDER BY \`lastActivityAt\` DESC
              LIMIT 50
            `);
          } else {
            candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
              SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
              FROM \`conversations\`
              WHERE (\`interest\` = ${criteria.interestId} OR \`participants\` LIKE ${p1Pattern})
              ${statusSql}
              ORDER BY \`lastActivityAt\` DESC
              LIMIT 50
            `);
          }
        } else {
          if (p2Pattern) {
            candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
              SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
              FROM \`conversations\`
              WHERE (\`participants\` LIKE ${p1Pattern} AND \`participants\` LIKE ${p2Pattern})
              ${statusSql}
              ORDER BY \`lastActivityAt\` DESC
              LIMIT 50
            `);
          } else {
            candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
              SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
              FROM \`conversations\`
              WHERE \`participants\` LIKE ${p1Pattern}
              ${statusSql}
              ORDER BY \`lastActivityAt\` DESC
              LIMIT 100
            `);
          }
        }
      } else {
        const fallbackArgs = { ...args };
        delete fallbackArgs.include;
        if (fallbackArgs.select && fallbackArgs.select.participants) {
          delete fallbackArgs.select.participants;
        }
        fallbackArgs.where = stripRelationalParticipants(fallbackArgs.where);

        const records = this.isFindOne
          ? await this.prismaDelegate.findFirst(fallbackArgs).then((r: any) => (r ? [r] : []))
          : await this.prismaDelegate.findMany(fallbackArgs);

        if (records.length > 0) {
          const idList = records.map((r: any) => String(r.id || r._id)).filter(Boolean);
          if (idList.length > 0) {
            const rawRows: any = await (prisma as any).$queryRaw(Prisma.sql`
              SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
              FROM \`conversations\`
              WHERE \`_id\` IN (${Prisma.join(idList)})
            `);
            candidateRows = rawRows || [];
          }
        }
      }
    } catch (rawSqlErr: any) {
      console.warn('[PrismaBridge] SQL fallback query on conversations table failed:', rawSqlErr?.message || rawSqlErr);
      return this.isFindOne ? null : [];
    }

    const matchedRecords: any[] = [];
    for (const row of candidateRows || []) {
      const rowPartIds = parseParticipantsJson(row.participants);

      let matches = true;
      if (criteria.requiredParticipants.length > 0) {
        const hasAll = criteria.requiredParticipants.every((pid) => rowPartIds.includes(pid));
        const hasOrInterest =
          criteria.isOrWithInterest && criteria.interestId && String(row.interest) === String(criteria.interestId);
        if (!hasAll && !hasOrInterest) {
          matches = false;
        }
        if (
          matches &&
          !hasOrInterest &&
          criteria.requiredSize !== undefined &&
          rowPartIds.length !== criteria.requiredSize
        ) {
          matches = false;
        }
      }
      if (criteria.statusFilter !== undefined && !matchesStatusFilter(row.status, criteria.statusFilter)) {
        matches = false;
      }
      if (criteria.complianceStatus && row.complianceStatus !== criteria.complianceStatus) {
        matches = false;
      }

      if (matches) {
        const rec: any = {
          id: row._id,
          _id: row._id,
          interestId: row.interest,
          interest: row.interest,
          lastMessage: row.lastMessage,
          messageCount: Number(row.messageCount || 0),
          status: row.status || 'ACTIVE',
          complianceStatus: row.complianceStatus || 'SAFE',
          lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt) : new Date(),
          createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
          updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
          participants: rowPartIds,
        };
        matchedRecords.push(rec);
        if (this.isFindOne) break;
      }
    }

    if (this.isFindOne) {
      const first = matchedRecords[0] || null;
      if (!first) return null;
      if (this.virtualPopulates.length > 0) {
        await resolveVirtualPopulates([first], this.virtualPopulates, this.delegateName);
      }
      const clientRecord = formatRecord(toClient(first));
      return attachSave(clientRecord, this.prismaDelegate, this.fieldMap, this.delegateName);
    } else {
      if (matchedRecords.length > 0 && this.virtualPopulates.length > 0) {
        await resolveVirtualPopulates(matchedRecords, this.virtualPopulates, this.delegateName);
      }
      const clientRecords = toClientArray(matchedRecords).map((r) =>
        attachSave(formatRecord(r), this.prismaDelegate, this.fieldMap, this.delegateName)
      );
      return clientRecords;
    }
  }

  async exec(): Promise<T> {
    const args: any = { where: this.where };

    if (
      this.delegateName === 'conversation' &&
      !this.queryOptions.select &&
      !this.queryOptions.include?.participants
    ) {
      if (!this.queryOptions.include) this.queryOptions.include = {};
      this.queryOptions.include.participants = true;
    }

    if (this.queryOptions.sort) args.orderBy = this.queryOptions.sort;
    if (this.queryOptions.skip !== undefined) args.skip = this.queryOptions.skip;
    if (this.queryOptions.limit !== undefined) args.take = this.queryOptions.limit;

    // Sanitize and normalize includes
    let cleanInclude: any = undefined;
    if (this.queryOptions.include && Object.keys(this.queryOptions.include).length > 0) {
      cleanInclude = {};
      for (const [k, v] of Object.entries(this.queryOptions.include)) {
        if (
          this.delegateName === 'report' &&
          ['reporter', 'reportedUser', 'reportedProfile', 'moderator', 'handledByAdminId'].includes(k)
        ) {
          const selectStr = (v as any)?.select ? Object.keys((v as any).select).join(' ') : undefined;
          this.virtualPopulates.push({ path: k, select: selectStr });
          continue;
        }

        if (k.includes('.')) {
          const segs = k.split('.');
          if (resolvePrismaRelationPath(this.delegateName, segs).isValid) {
            addNestedInclude(cleanInclude, segs, v);
          } else {
            this.virtualPopulates.push({ path: k });
          }
        } else if (resolvePrismaRelationPath(this.delegateName, [k]).isValid) {
          cleanInclude[k] = v;
        } else {
          // Not a valid Prisma relation on this model -> route to virtual populate
          this.virtualPopulates.push({ path: k });
        }
      }
      if (Object.keys(cleanInclude).length === 0) {
        cleanInclude = undefined;
      }
    }

    if (this.queryOptions.select) {
      args.select = { ...this.queryOptions.select };
      if (cleanInclude) {
        for (const [k, v] of Object.entries(cleanInclude)) {
          args.select[k] = v;
        }
      }
      const known = prismaModelAllFields[this.delegateName?.toLowerCase()];
      if (known) {
        for (const k of Object.keys(args.select)) {
          if (!known.has(k)) {
            delete args.select[k];
          }
        }
      }
    } else if (cleanInclude) {
      args.include = cleanInclude;
    }

    const formatRecord = (rec: any) => {
      if (!rec) return rec;
      normalizeDelegateRecord(rec, this.delegateName);
      if (this.delegateName === 'conversation' && Array.isArray(rec.participants)) {
        if (this.populateParticipants) {
          rec.participants = rec.participants.map((cp: any) =>
            toClient(cp.user ? { ...cp.user, _id: cp.user.id } : { _id: cp.userId, id: cp.userId })
          );
        } else {
          rec.participants = rec.participants.map((cp: any) =>
            cp.userId ? cp.userId : String(cp._id || cp.id || cp)
          );
        }
      }
      for (const { path: pPath, relationName } of this.populatedRelations) {
        if (rec[relationName] !== undefined && rec[relationName] !== null) {
          rec[pPath] = toClient(rec[relationName]);
        }
      }
      return rec;
    };

    try {
      if (this.delegateName === 'conversation' && isConversationParticipantsMissing) {
        return (await this.executeConversationFallback(args, formatRecord)) as unknown as T;
      }

      if (this.isFindOne) {
        let record = await this.prismaDelegate.findFirst(args);
        if (record && Object.keys(this.jsonPredicates).length > 0) {
          if (!matchesJsonPredicates(record, this.jsonPredicates)) {
            // First candidate did not match dot-notation JSON filter, fetch candidate batch to find exact matching item
            const candidates = await this.prismaDelegate.findMany({ ...args, take: 50 });
            record = candidates.find((c: any) => matchesJsonPredicates(c, this.jsonPredicates)) || null;
          }
        }
        if (!record) return null as unknown as T;
        if (this.virtualPopulates.length > 0) {
          await resolveVirtualPopulates([record], this.virtualPopulates, this.delegateName);
        }
        const clientRecord = formatRecord(toClient(record));
        return attachSave(clientRecord, this.prismaDelegate, this.fieldMap, this.delegateName) as unknown as T;
      } else {
        let records: any[];
        if (this.delegateName === 'notification') {
          // Stable ordering: MariaDB requires a deterministic tie-breaker (id desc) when timestamps can match
          if (!args.orderBy) {
            args.orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
          } else if (Array.isArray(args.orderBy)) {
            const hasId = args.orderBy.some((o: any) => o && ('id' in o || '_id' in o));
            if (!hasId) {
              args.orderBy = [...args.orderBy, { id: 'desc' }];
            }
          } else if (typeof args.orderBy === 'object') {
            if (!('id' in args.orderBy) && !('_id' in args.orderBy)) {
              args.orderBy = [args.orderBy, { id: 'desc' }];
            }
          }

          // Bounded batch pagination for notifications:
          // Soft-deleted/trashed notifications stored in JSON metadata must be excluded before pagination.
          // To prevent unbounded in-memory collection and protect Node.js heap memory, records are scanned
          // in bounded batches of 100 from MariaDB until the requested active page is fulfilled, data is
          // exhausted, or a documented safety scan budget is reached.
          const hasPagination = args.skip !== undefined || args.take !== undefined;
          const reqSkip = args.skip || 0;
          const reqTake = args.take;

          if (hasPagination) {
            const BATCH_SIZE = 100;
            const MAX_SCAN_BUDGET = 2000;
            const activeCollected: any[] = [];
            let activeSkipped = 0;
            let dbOffset = 0;
            let isTruncated = false;
            const baseArgs = { ...args };
            delete baseArgs.skip;
            delete baseArgs.take;

            // Projection safety: Ensure required fields for soft-delete & read state are always fetched
            if (baseArgs.select) {
              baseArgs.select = {
                ...baseArgs.select,
                id: true,
                metadata: true,
                read: true,
              };
            }

            while (dbOffset < MAX_SCAN_BUDGET) {
              const batch = await this.prismaDelegate.findMany({
                ...baseArgs,
                skip: dbOffset,
                take: BATCH_SIZE,
              });
              if (!batch || batch.length === 0) break;

              for (const r of batch) {
                let meta = r?.metadata;
                if (typeof meta === 'string') {
                  try { meta = JSON.parse(meta); } catch { meta = {}; }
                }
                const isTrashed = Boolean(meta?.isDeleted || meta?.trashed);
                if (!isTrashed) {
                  if (activeSkipped < reqSkip) {
                    activeSkipped++;
                  } else if (reqTake === undefined || activeCollected.length < reqTake) {
                    activeCollected.push(r);
                    if (reqTake !== undefined && activeCollected.length === reqTake) {
                      break;
                    }
                  }
                }
              }

              dbOffset += batch.length;
              if ((reqTake !== undefined && activeCollected.length === reqTake) || batch.length < BATCH_SIZE) {
                break;
              }
            }

            if (dbOffset >= MAX_SCAN_BUDGET && (reqTake === undefined || activeCollected.length < reqTake)) {
              isTruncated = true;
            }

            records = activeCollected;
            (records as any).isTruncated = isTruncated;
            (records as any).scanBudgetExceeded = isTruncated;
            (records as any).totalScanned = dbOffset;
          } else {
            // When no pagination is specified, scan in bounded batches up to a documented safety budget
            const BATCH_SIZE = 100;
            const MAX_UNPAGINATED_BUDGET = 500;
            const activeCollected: any[] = [];
            let dbOffset = 0;
            let isTruncated = false;
            const queryArgs = { ...args };

            if (queryArgs.select) {
              queryArgs.select = {
                ...queryArgs.select,
                id: true,
                metadata: true,
                read: true,
              };
            }

            while (dbOffset < MAX_UNPAGINATED_BUDGET) {
              const batch = await this.prismaDelegate.findMany({
                ...queryArgs,
                skip: dbOffset,
                take: BATCH_SIZE,
              });
              if (!batch || batch.length === 0) break;

              for (const r of batch) {
                let meta = r?.metadata;
                if (typeof meta === 'string') {
                  try { meta = JSON.parse(meta); } catch { meta = {}; }
                }
                if (!(meta?.isDeleted || meta?.trashed)) {
                  activeCollected.push(r);
                }
              }

              dbOffset += batch.length;
              if (batch.length < BATCH_SIZE) break;
            }

            if (dbOffset >= MAX_UNPAGINATED_BUDGET) {
              isTruncated = true;
            }

            records = activeCollected;
            (records as any).isTruncated = isTruncated;
            (records as any).scanBudgetExceeded = isTruncated;
            (records as any).totalScanned = dbOffset;
          }
        } else {
          records = await this.prismaDelegate.findMany(args);
        }
        if (Object.keys(this.jsonPredicates).length > 0) {
          records = records.filter((r: any) => matchesJsonPredicates(r, this.jsonPredicates));
        }
        if (records.length > 0 && this.virtualPopulates.length > 0) {
          await resolveVirtualPopulates(records, this.virtualPopulates, this.delegateName);
        }
        const clientRecords = toClientArray(records).map((r) =>
          attachSave(formatRecord(r), this.prismaDelegate, this.fieldMap, this.delegateName)
        );
        (clientRecords as any).isTruncated = Boolean((records as any)?.isTruncated);
        (clientRecords as any).scanBudgetExceeded = Boolean((records as any)?.scanBudgetExceeded);
        (clientRecords as any).totalScanned = (records as any)?.totalScanned;
        return clientRecords as unknown as T;
      }
    } catch (err: any) {
      // 1. Security-critical delegate 'block' must ALWAYS fail closed (never swallow errors or return empty results)
      if (this.delegateName === 'block') {
        console.error(
          `[PrismaBridge] CRITICAL: Schema error on security-critical delegate 'block'. Failing closed to protect block boundaries:`,
          err.message
        );
        throw err;
      }

      // 2. Only strictly allow missing-table (P2021) fallbacks for explicitly justified auxiliary delegates.
      // Do NOT swallow P2022 (unknown column), 'Unknown column', or 'Unknown arg' for ANY delegate.
      // Propagate unexpected schema errors so controllers can handle them safely.
      const isMissingTable =
        err.code === 'P2021' ||
        (err.message && err.message.includes('does not exist in the current database') && !err.message.includes('column'));

      if (isMissingTable && JUSTIFIED_AUXILIARY_MISSING_TABLE_DELEGATES.has(this.delegateName)) {
        console.warn(
          `[PrismaBridge] Missing auxiliary table for delegate '${this.delegateName}' (P2021). Returning empty fallback result.`
        );
        return (this.isFindOne ? null : []) as unknown as T;
      }

      if (
        this.delegateName === 'conversation' &&
        err.message &&
        err.message.includes('conversation_participants')
      ) {
        isConversationParticipantsMissing = true;
        if (!hasWarnedMissingParticipantsTable) {
          hasWarnedMissingParticipantsTable = true;
          console.warn(
            `[PrismaBridge] conversation_participants table missing. Caching detection and falling back to scalar conversation query and JSON participants.`
          );
        }
        return (await this.executeConversationFallback(args, formatRecord)) as unknown as T;

        const criteria = extractConversationCriteria(this.rawFilter);
        let candidateRows: any[] = [];

        try {
          // Parameterized SQL query when participant requirements exist
          if (criteria.requiredParticipants.length > 0) {
            const p1 = criteria.requiredParticipants[0];
            const p2 = criteria.requiredParticipants.length > 1 ? criteria.requiredParticipants[1] : undefined;
            const p1Pattern = `%"${p1}"%`;
            const p2Pattern = p2 ? `%"${p2}"%` : undefined;

            let statusSql = Prisma.empty;
            if (criteria.statusFilter !== undefined) {
              if (typeof criteria.statusFilter === 'string') {
                statusSql = Prisma.sql`AND \`status\` = ${criteria.statusFilter}`;
              } else if (criteria.statusFilter && typeof criteria.statusFilter === 'object') {
                if ('$ne' in criteria.statusFilter) {
                  statusSql = Prisma.sql`AND (\`status\` != ${criteria.statusFilter.$ne} OR \`status\` IS NULL)`;
                } else if ('$eq' in criteria.statusFilter) {
                  statusSql = Prisma.sql`AND \`status\` = ${criteria.statusFilter.$eq}`;
                } else if ('$in' in criteria.statusFilter && Array.isArray(criteria.statusFilter.$in)) {
                  statusSql = Prisma.sql`AND \`status\` IN (${Prisma.join(criteria.statusFilter.$in)})`;
                } else if ('$nin' in criteria.statusFilter && Array.isArray(criteria.statusFilter.$nin)) {
                  statusSql = Prisma.sql`AND (\`status\` NOT IN (${Prisma.join(criteria.statusFilter.$nin)}) OR \`status\` IS NULL)`;
                }
              }
            }

            if (criteria.isOrWithInterest && criteria.interestId) {
              if (p2Pattern) {
                candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
                  SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
                  FROM \`conversations\`
                  WHERE (\`interest\` = ${criteria.interestId} OR (\`participants\` LIKE ${p1Pattern} AND \`participants\` LIKE ${p2Pattern}))
                  ${statusSql}
                  ORDER BY \`lastActivityAt\` DESC
                  LIMIT 50
                `);
              } else {
                candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
                  SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
                  FROM \`conversations\`
                  WHERE (\`interest\` = ${criteria.interestId} OR \`participants\` LIKE ${p1Pattern})
                  ${statusSql}
                  ORDER BY \`lastActivityAt\` DESC
                  LIMIT 50
                `);
              }
            } else {
              if (p2Pattern) {
                candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
                  SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
                  FROM \`conversations\`
                  WHERE (\`participants\` LIKE ${p1Pattern} AND \`participants\` LIKE ${p2Pattern})
                  ${statusSql}
                  ORDER BY \`lastActivityAt\` DESC
                  LIMIT 50
                `);
              } else {
                candidateRows = await (prisma as any).$queryRaw(Prisma.sql`
                  SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
                  FROM \`conversations\`
                  WHERE \`participants\` LIKE ${p1Pattern}
                  ${statusSql}
                  ORDER BY \`lastActivityAt\` DESC
                  LIMIT 100
                `);
              }
            }
          } else {
            // No participant filters; query scalar conversation fields safely without relational joins
            const fallbackArgs = { ...args };
            delete fallbackArgs.include;
            if (fallbackArgs.select && fallbackArgs.select.participants) {
              delete fallbackArgs.select.participants;
            }
            fallbackArgs.where = stripRelationalParticipants(fallbackArgs.where);

            const records = this.isFindOne
              ? await this.prismaDelegate.findFirst(fallbackArgs).then((r: any) => (r ? [r] : []))
              : await this.prismaDelegate.findMany(fallbackArgs);

            if (records.length > 0) {
              const idList = records.map((r: any) => String(r.id || r._id)).filter(Boolean);
              if (idList.length > 0) {
                const rawRows: any = await (prisma as any).$queryRaw(Prisma.sql`
                  SELECT _id, interest, lastMessage, messageCount, status, complianceStatus, lastActivityAt, createdAt, updatedAt, participants
                  FROM \`conversations\`
                  WHERE \`_id\` IN (${Prisma.join(idList)})
                `);
                candidateRows = rawRows || [];
              }
            }
          }
        } catch (rawSqlErr: any) {
          console.warn('[PrismaBridge] SQL fallback query on conversations table failed:', rawSqlErr?.message || rawSqlErr);
          return (this.isFindOne ? null : []) as unknown as T;
        }

        const matchedRecords: any[] = [];
        for (const row of candidateRows || []) {
          const rowPartIds = parseParticipantsJson(row.participants);

          let matches = true;
          if (criteria.requiredParticipants.length > 0) {
            const hasAll = criteria.requiredParticipants.every((pid) => rowPartIds.includes(pid));
            const hasOrInterest =
              criteria.isOrWithInterest && criteria.interestId && String(row.interest) === String(criteria.interestId);
            if (!hasAll && !hasOrInterest) {
              matches = false;
            }
            if (
              matches &&
              !hasOrInterest &&
              criteria.requiredSize !== undefined &&
              rowPartIds.length !== criteria.requiredSize
            ) {
              matches = false;
            }
          }
          if (criteria.statusFilter !== undefined && !matchesStatusFilter(row.status, criteria.statusFilter)) {
            matches = false;
          }
          if (criteria.complianceStatus && row.complianceStatus !== criteria.complianceStatus) {
            matches = false;
          }

          if (matches) {
            const rec: any = {
              id: row._id,
              _id: row._id,
              interestId: row.interest,
              interest: row.interest,
              lastMessage: row.lastMessage,
              messageCount: Number(row.messageCount || 0),
              status: row.status || 'ACTIVE',
              complianceStatus: row.complianceStatus || 'SAFE',
              lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt) : new Date(),
              createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
              updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
              participants: rowPartIds,
            };
            matchedRecords.push(rec);
            if (this.isFindOne) break;
          }
        }

        if (this.isFindOne) {
          const first = matchedRecords[0] || null;
          if (!first) return null as unknown as T;
          if (this.virtualPopulates.length > 0) {
            await resolveVirtualPopulates([first], this.virtualPopulates, this.delegateName);
          }
          const clientRecord = formatRecord(toClient(first));
          return attachSave(clientRecord, this.prismaDelegate, this.fieldMap, this.delegateName) as unknown as T;
        } else {
          if (matchedRecords.length > 0 && this.virtualPopulates.length > 0) {
            await resolveVirtualPopulates(matchedRecords, this.virtualPopulates, this.delegateName);
          }
          const clientRecords = toClientArray(matchedRecords).map((r) =>
            attachSave(formatRecord(r), this.prismaDelegate, this.fieldMap, this.delegateName)
          );
          return clientRecords as unknown as T;
        }
      }

      if (
        this.delegateName === 'award' &&
        err.message &&
        err.message.includes('created_by')
      ) {
        console.warn(
          `[PrismaBridge] awards.created_by column missing. Falling back to explicit select omitting created_by.`
        );
        const awardSelect: any = {
          id: true,
          name: true,
          slug: true,
          logo: true,
          shortDescription: true,
          fullDescription: true,
          awardYear: true,
          category: true,
          organization: true,
          galleryImages: true,
          websiteUrl: true,
          displayOrder: true,
          isActive: true,
          isFeatured: true,
          isDeleted: true,
          deletedAt: true,
          deletedById: true,
          updatedById: true,
          createdAt: true,
          updatedAt: true,
        };
        const fallbackArgs = { ...args, select: awardSelect };
        delete fallbackArgs.include;
        if (this.isFindOne) {
          const rec = await this.prismaDelegate.findFirst(fallbackArgs);
          if (!rec) return null as unknown as T;
          rec.createdById = null;
          return attachSave(formatRecord(toClient(rec)), this.prismaDelegate, this.fieldMap, this.delegateName) as unknown as T;
        } else {
          const recs = await this.prismaDelegate.findMany(fallbackArgs);
          return recs.map((r: any) => {
            r.createdById = null;
            return attachSave(formatRecord(toClient(r)), this.prismaDelegate, this.fieldMap, this.delegateName);
          }) as unknown as T;
        }
      }

      if (
        (err.message &&
          (err.message.includes('Inconsistent query result') ||
            err.message.includes('is required to return data') ||
            err.message.includes('Field user is required') ||
            err.message.includes('Field sender is required'))) ||
        err.code === 'P2025'
      ) {
        if (cleanInclude) {
          const fallbackArgs = { ...args };
          delete fallbackArgs.include;
          if (fallbackArgs.select) {
            for (const k of Object.keys(cleanInclude)) {
              delete fallbackArgs.select[k];
            }
          }
          const allPopulates = this.populatedRelations.map((r) => ({ path: r.path })).concat(this.virtualPopulates);

          if (this.isFindOne) {
            const record = await this.prismaDelegate.findFirst(fallbackArgs);
            if (!record) return null as unknown as T;
            if (allPopulates.length > 0) {
              await resolveVirtualPopulates([record], allPopulates, this.delegateName);
            }
            const clientRecord = formatRecord(toClient(record));
            return attachSave(clientRecord, this.prismaDelegate, this.fieldMap, this.delegateName) as unknown as T;
          } else {
            const records = await this.prismaDelegate.findMany(fallbackArgs);
            if (records.length > 0 && allPopulates.length > 0) {
              await resolveVirtualPopulates(records, allPopulates, this.delegateName);
            }
            const clientRecords = toClientArray(records).map((r) =>
              attachSave(formatRecord(r), this.prismaDelegate, this.fieldMap, this.delegateName)
            );
            return clientRecords as unknown as T;
          }
        }
      }
      throw err;
    }
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.exec().catch(onrejected);
  }
}

export class PrismaUpdateQuery<T> {
  private updateFn: (opts?: any) => Promise<T>;
  private populateList: Array<{ path: string; select?: string }> = [];

  constructor(updateFn: (opts?: any) => Promise<T>) {
    this.updateFn = updateFn;
  }
  select(...args: any[]): this {
    return this;
  }
  populate<P = any>(path: string | { path: string; select?: string }, selectFields?: string): this {
    const targetPath = typeof path === 'string' ? path : path.path;
    const targetSelect = typeof path === 'object' && path.select ? path.select : selectFields;
    this.populateList.push({ path: targetPath, select: targetSelect });
    return this;
  }
  lean(): this {
    return this;
  }
  exec(): Promise<T> {
    return this.updateFn({ populate: this.populateList });
  }
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.exec().catch(onrejected);
  }
}

/**
 * Robust in-memory aggregation runner for MongoDB pipelines over MySQL/Prisma records.
 */
export async function runPrismaAggregate(
  delegate: any,
  pipeline: any[] = [],
  fieldMap: Record<string, string> = {}
): Promise<any[]> {
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    return [];
  }

  let initialWhere: any = {};
  let startIndex = 0;
  if (pipeline[0] && pipeline[0].$match) {
    initialWhere = normalizeFilter(pipeline[0].$match, fieldMap);
    startIndex = 1;
  }

  const rawRecords = await delegate.findMany({ where: initialWhere });
  let current: any[] = toClientArray(rawRecords);

  for (let i = startIndex; i < pipeline.length; i++) {
    const stage = pipeline[i];
    const stageType = Object.keys(stage)[0];
    const stageVal = stage[stageType];

    switch (stageType) {
      case '$match': {
        const filter = stageVal;
        current = current.filter((item) => {
          for (const [k, v] of Object.entries(filter)) {
            const itemKey = k === '_id' ? 'id' : k;
            if (typeof v === 'object' && v !== null) {
              if ('$gt' in v && !(item[itemKey] > (v as any).$gt)) return false;
              if ('$gte' in v && !(item[itemKey] >= (v as any).$gte)) return false;
              if ('$lt' in v && !(item[itemKey] < (v as any).$lt)) return false;
              if ('$lte' in v && !(item[itemKey] <= (v as any).$lte)) return false;
              if ('$ne' in v && item[itemKey] === (v as any).$ne) return false;
              if ('$in' in v && !((v as any).$in.includes(item[itemKey]))) return false;
            } else if (item[itemKey] !== v) {
              return false;
            }
          }
          return true;
        });
        break;
      }
      case '$group': {
        const groups = new Map<any, any[]>();
        const idExpr = stageVal._id;

        for (const doc of current) {
          let key: any = null;
          if (idExpr === null) {
            key = '__null__';
          } else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
            const field = idExpr.slice(1);
            key = doc[field];
          } else {
            key = idExpr;
          }
          const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
          if (!groups.has(keyStr)) {
            groups.set(keyStr, []);
          }
          groups.get(keyStr)!.push(doc);
        }

        const results: any[] = [];
        for (const [, docs] of groups.entries()) {
          const groupResult: any = {};
          const first = docs[0];
          if (idExpr === null) {
            groupResult._id = null;
          } else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
            const field = idExpr.slice(1);
            groupResult._id = first[field];
          } else {
            groupResult._id = idExpr;
          }

          for (const [prop, acc] of Object.entries(stageVal)) {
            if (prop === '_id') continue;
            if (typeof acc === 'object' && acc !== null) {
              if ('$sum' in acc) {
                const sumExpr = (acc as any).$sum;
                let sum = 0;
                for (const d of docs) {
                  if (typeof sumExpr === 'number') {
                    sum += sumExpr;
                  } else if (typeof sumExpr === 'string' && sumExpr.startsWith('$')) {
                    sum += Number(d[sumExpr.slice(1)]) || 0;
                  } else if (typeof sumExpr === 'object' && sumExpr.$cond) {
                    const [cond, trueVal, falseVal] = sumExpr.$cond;
                    let isTrue = false;
                    if (cond?.$in) {
                      const [targetField, targetList] = cond.$in;
                      const val =
                        typeof targetField === 'string' && targetField.startsWith('$')
                          ? d[targetField.slice(1)]
                          : targetField;
                      isTrue = Array.isArray(targetList) && targetList.includes(val);
                    }
                    const valToAdd = isTrue
                      ? typeof trueVal === 'string' && trueVal.startsWith('$')
                        ? Number(d[trueVal.slice(1)]) || 0
                        : Number(trueVal) || 0
                      : typeof falseVal === 'string' && falseVal.startsWith('$')
                      ? Number(d[falseVal.slice(1)]) || 0
                      : Number(falseVal) || 0;
                    sum += valToAdd;
                  }
                }
                groupResult[prop] = sum;
              } else if ('$addToSet' in acc) {
                const field = (acc as any).$addToSet;
                const set = new Set();
                for (const d of docs) {
                  const val = typeof field === 'string' && field.startsWith('$') ? d[field.slice(1)] : field;
                  if (val !== undefined && val !== null) set.add(val);
                }
                groupResult[prop] = Array.from(set);
              } else if ('$push' in acc) {
                const field = (acc as any).$push;
                groupResult[prop] = docs.map((d) =>
                  typeof field === 'string' && field.startsWith('$') ? d[field.slice(1)] : field
                );
              }
            }
          }
          results.push(groupResult);
        }
        current = results;
        break;
      }
      case '$project': {
        current = current.map((doc) => {
          const res: any = {};
          for (const [field, spec] of Object.entries(stageVal)) {
            if (spec === 1 || spec === true) {
              res[field] = doc[field];
            } else if (typeof spec === 'string' && spec.startsWith('$')) {
              res[field] = doc[spec.slice(1)];
            } else if (typeof spec === 'object' && spec !== null) {
              if ('$size' in spec) {
                const target = (spec as any).$size;
                const arr = typeof target === 'string' && target.startsWith('$') ? doc[target.slice(1)] : target;
                res[field] = Array.isArray(arr) ? arr.length : 0;
              }
            }
          }
          return res;
        });
        break;
      }
      case '$sort': {
        const norm = normalizeSort(stageVal);
        if (norm && norm.length > 0) {
          current = [...current].sort((a, b) => {
            for (const sortItem of norm) {
              const [field, dir] = Object.entries(sortItem)[0];
              const valA = a[field];
              const valB = b[field];
              if (valA < valB) return dir === 'desc' ? 1 : -1;
              if (valA > valB) return dir === 'desc' ? -1 : 1;
            }
            return 0;
          });
        }
        break;
      }
      case '$skip': {
        current = current.slice(Number(stageVal) || 0);
        break;
      }
      case '$limit': {
        current = current.slice(0, Number(stageVal) || 0);
        break;
      }
      case '$count': {
        current = [{ [stageVal]: current.length }];
        break;
      }
      default:
        break;
    }
  }

  return current;
}

export interface IModelAdapter<T = any> {
  new (data?: Partial<T> | any): T & { save(): Promise<T>; toObject(): T; toJSON(): T };
  find(filter?: any): PrismaQueryBuilder<T[]>;
  findOne(filter?: any): PrismaQueryBuilder<T | null>;
  findById(id: any): PrismaQueryBuilder<T | null>;
  exists(filter?: any): Promise<{ _id: any } | null>;
  create(data: Partial<T> | any): Promise<T>;
  create(data: Partial<T>[] | any[]): Promise<T[]>;
  insertMany(data: any[], options?: any): Promise<T[]>;
  updateOne(filter: any, update: any, options?: any): Promise<any>;
  updateMany(filter: any, update: any, options?: any): Promise<any>;
  findByIdAndUpdate(id: any, update: any, options?: any): PrismaUpdateQuery<T | null>;
  findOneAndUpdate(filter: any, update: any, options?: any): PrismaUpdateQuery<T | null>;
  deleteOne(filter: any): Promise<any>;
  deleteMany(filter: any): Promise<any>;
  findByIdAndDelete(id: any): Promise<T | null>;
  findOneAndDelete(filter: any): Promise<T | null>;
  countDocuments(filter?: any): Promise<number>;
  estimatedDocumentCount(): Promise<number>;
  distinct(field: string, filter?: any): Promise<any[]>;
  aggregate(pipeline?: any[]): Promise<any[]>;
  [key: string]: any;
}

/**
 * Creates a Model Adapter wrapping a Prisma Delegate.
 * Provides a 100% MySQL/Prisma backed drop-in replacement for Mongoose models.
 */
export function createPrismaModelAdapter<T = any>(
  delegateName: keyof typeof prisma | string,
  fieldMap: Record<string, string> = {}
): IModelAdapter<T> {
  const getDelegate = () => (prisma as any)[delegateName];

  function ModelConstructor(this: any, data: any = {}) {
    if (!(this instanceof ModelConstructor)) {
      return new (ModelConstructor as any)(data);
    }
    const clean = cleanPrismaData(data, fieldMap);
    Object.assign(this, clean);
    const self = this as any;
    if (!self.id && !self._id) {
      const newId = generateObjectId();
      self.id = newId;
      self._id = newId;
    } else if (self.id && !self._id) {
      self._id = self.id;
    } else if (self._id && !self.id) {
      self.id = self._id;
    }
    normalizeDelegateRecord(self, String(delegateName));
    attachSave(this, getDelegate(), fieldMap, String(delegateName));
  }

  ModelConstructor.prototype.toObject = function () {
    const obj = { ...this };
    delete obj.save;
    delete obj.toObject;
    delete obj.toJSON;
    return obj;
  };

  ModelConstructor.prototype.toJSON = function () {
    return this.toObject();
  };

  ModelConstructor.find = function (filter: any = {}) {
    return new PrismaQueryBuilder(getDelegate(), filter, false, fieldMap, String(delegateName));
  };

  ModelConstructor.findOne = function (filter: any = {}) {
    return new PrismaQueryBuilder(getDelegate(), filter, true, fieldMap, String(delegateName));
  };

  ModelConstructor.findById = function (id: any) {
    const stringId = id?._id ? String(id._id) : id?.id ? String(id.id) : String(id);
    return new PrismaQueryBuilder(getDelegate(), { id: stringId }, true, fieldMap, String(delegateName));
  };

  ModelConstructor.create = async function (data: any | any[]): Promise<any> {
    const delegate = getDelegate();
    if (Array.isArray(data)) {
      const results: any[] = [];
      for (const item of data) {
        const res: any = await ModelConstructor.create(item);
        results.push(res);
      }
      return results;
    }

    const id = data.id || data._id || generateObjectId();

    if (delegateName === 'conversation' && data.participants && Array.isArray(data.participants)) {
      const participantIds = data.participants.map((p: any) =>
        p && typeof p === 'object' ? String(p._id || p.id) : String(p)
      );
      const cleanData = cleanUnsupportedModelFields(cleanPrismaData({ ...data, id }, fieldMap), String(delegateName));
      delete cleanData.participants;

      if (isConversationParticipantsMissing) {
        const createdScalar = await delegate.create({
          data: cleanData,
        });
        const jsonVal = JSON.stringify(participantIds);
        await (prisma as any).$executeRaw(
          Prisma.sql`UPDATE \`conversations\` SET \`participants\` = ${jsonVal} WHERE \`_id\` = ${cleanData.id || id}`
        ).catch((e: any) => {
          console.warn('[PrismaBridge] Could not update participants JSON column:', e?.message || e);
        });
        const clientObj = toClient(createdScalar);
        clientObj.participants = participantIds;
        return attachSave(clientObj, delegate, fieldMap, String(delegateName));
      }

      try {
        const created = await delegate.create({
          data: {
            ...cleanData,
            participants: {
              create: participantIds.map((uId: string) => ({ userId: uId })),
            },
          },
          include: {
            participants: true,
          },
        });

        const clientObj = toClient(created);
        clientObj.participants = participantIds;
        return attachSave(clientObj, delegate, fieldMap, String(delegateName));
      } catch (createErr: any) {
        if (createErr?.message && createErr.message.includes('conversation_participants')) {
          isConversationParticipantsMissing = true;
          if (!hasWarnedMissingParticipantsTable) {
            hasWarnedMissingParticipantsTable = true;
            console.warn('[PrismaBridge] conversation_participants table missing on create. Storing participants in JSON column.');
          }
          const createdScalar = await delegate.create({
            data: cleanData,
          });
          const jsonVal = JSON.stringify(participantIds);
          await (prisma as any).$executeRaw(
            Prisma.sql`UPDATE \`conversations\` SET \`participants\` = ${jsonVal} WHERE \`_id\` = ${cleanData.id || id}`
          ).catch((e: any) => {
            console.warn('[PrismaBridge] Could not update participants JSON column:', e?.message || e);
          });
          const clientObj = toClient(createdScalar);
          clientObj.participants = participantIds;
          return attachSave(clientObj, delegate, fieldMap, String(delegateName));
        }
        throw createErr;
      }
    }

    const cleanData = cleanPrismaData({ ...data, id }, fieldMap);
    const mName = String(delegateName).toLowerCase();
    if (mName === 'contactinquiry') {
      cleanData.replies = cleanData.replies ?? [];
      cleanData.statusHistory = cleanData.statusHistory ?? [];
    }
    const created = await delegate.create({ data: cleanData });
    const clientObj = normalizeDelegateRecord(toClient(created), String(delegateName));
    return attachSave(clientObj, delegate, fieldMap, String(delegateName));
  };

  ModelConstructor.insertMany = async function (data: any[], options?: any) {
    return ModelConstructor.create(data);
  };

  ModelConstructor.updateOne = async function (filter: any, update: any, options: any = {}) {
    const delegate = getDelegate();
    const where = normalizeFilter(filter, fieldMap);
    const updateData = cleanUnsupportedModelFields(prepareUpdateData(update, fieldMap), String(delegateName));

    const jsonPreds = extractDotNotationPredicates(filter);
    if (Object.keys(jsonPreds).length > 0) {
      const SCAN_LIMIT = 500;
      const candidates = await delegate.findMany({ where, take: SCAN_LIMIT + 1 });
      if (options?.multi && candidates.length > SCAN_LIMIT) {
        throw new Error(
          `[PrismaBridge] updateMany with JSON predicates matched more than safety scan budget (${SCAN_LIMIT}). Failing closed to prevent partial updates.`
        );
      }
      const matched = candidates.filter((r: any) => matchesJsonPredicates(r, jsonPreds));
      if (matched.length === 0) {
        return {
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedId: null,
        };
      }
      if (!options?.multi) {
        const target = matched[0];
        const updated = await (prisma as any).$transaction(async (tx: any) => {
          const fresh = await tx[delegateName].findUnique({ where: { id: target.id } });
          if (!fresh || !matchesJsonPredicates(fresh, jsonPreds)) {
            return null;
          }
          return tx[delegateName].update({
            where: { id: target.id },
            data: updateData,
          });
        });
        return {
          acknowledged: true,
          matchedCount: updated ? 1 : 0,
          modifiedCount: updated ? 1 : 0,
          upsertedId: null,
        };
      }
      const targetIds = matched.map((r: any) => r.id);
      const result = await delegate.updateMany({
        where: { id: { in: targetIds } },
        data: updateData,
      });
      return {
        acknowledged: true,
        matchedCount: result.count,
        modifiedCount: result.count,
        upsertedId: null,
      };
    }

    const result = await delegate.updateMany({
      where,
      data: updateData,
    });

    return {
      acknowledged: true,
      matchedCount: result.count,
      modifiedCount: result.count,
      upsertedId: null,
    };
  };

  ModelConstructor.updateMany = async function (filter: any, update: any, options: any = {}) {
    return ModelConstructor.updateOne(filter, update, { ...options, multi: true });
  };

  ModelConstructor.findByIdAndUpdate = function (id: any, update: any, options: any = {}) {
    return new PrismaUpdateQuery(async (opts?: any) => {
      const delegate = getDelegate();
      const stringId = id?._id ? String(id._id) : id?.id ? String(id.id) : String(id);
      const updateData = cleanUnsupportedModelFields(prepareUpdateData(update, fieldMap), String(delegateName));

      try {
        const updated = await delegate.update({
          where: { id: stringId },
          data: updateData,
        });

        const clientObj = normalizeDelegateRecord(toClient(updated), String(delegateName));

        if (delegateName === 'conversation') {
          const populateParticipantsOpt = opts?.populate?.find((p: any) => p.path === 'participants');
          try {
            const pRows = await (prisma as any).conversationParticipant.findMany({
              where: { conversationId: stringId },
              include: populateParticipantsOpt ? { user: true } : undefined,
            });

            if (populateParticipantsOpt) {
              clientObj.participants = pRows.map((cp: any) =>
                toClient(cp.user ? { ...cp.user, _id: cp.user.id } : { _id: cp.userId, id: cp.userId })
              );
            } else {
              clientObj.participants = pRows.map((cp: any) => cp.userId);
            }
          } catch (partErr: any) {
            if (partErr?.message && partErr.message.includes('conversation_participants')) {
              const rawRow = await (prisma as any).$queryRaw(
                Prisma.sql`SELECT \`participants\` FROM \`conversations\` WHERE \`_id\` = ${stringId} LIMIT 1`
              ).catch(() => null);
              const pIds = parseParticipantsJson(rawRow && rawRow[0]?.participants);
              clientObj.participants = pIds;
            } else {
              throw partErr;
            }
          }
        }

        if (opts?.populate && opts.populate.length > 0) {
          await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
        }

        return attachSave(clientObj, delegate, fieldMap, String(delegateName));
      } catch (err: any) {
        if (err.code === 'P2025') {
          if (options?.upsert) {
            const setOnInsertData = prepareSetOnInsertData(update, fieldMap);
            const createData = prepareCreateDataFromUpdate(update, { id: stringId }, setOnInsertData, updateData, fieldMap);
            const created = await delegate.create({
              data: {
                id: stringId,
                ...createData,
              },
            });
            const clientObj = normalizeDelegateRecord(toClient(created), String(delegateName));
            if (opts?.populate && opts.populate.length > 0) {
              await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
            }
            return attachSave(clientObj, delegate, fieldMap, String(delegateName));
          }
          return null;
        }
        throw err;
      }
    });
  };

  ModelConstructor.findOneAndUpdate = function (filter: any, update: any, options: any = {}) {
    return new PrismaUpdateQuery(async (opts?: any) => {
      const delegate = getDelegate();
      const where = normalizeFilter(filter, fieldMap);
      const updateData = cleanUnsupportedModelFields(prepareUpdateData(update, fieldMap), String(delegateName));
      const jsonPreds = extractDotNotationPredicates(filter);

      let existing: any = null;
      if (Object.keys(jsonPreds).length > 0) {
        const candidates = await delegate.findMany({ where, take: 50 });
        existing = candidates.find((c: any) => matchesJsonPredicates(c, jsonPreds)) || null;
      } else {
        existing = await delegate.findFirst({ where });
      }

      if (!existing) {
        if (options?.upsert) {
          const id = generateObjectId();
          const setOnInsertData = prepareSetOnInsertData(update, fieldMap);
          const createData = prepareCreateDataFromUpdate(update, where, setOnInsertData, updateData, fieldMap);
          try {
            const created = await delegate.create({
              data: {
                id,
                ...createData,
              },
            });
            const clientObj = normalizeDelegateRecord(toClient(created), String(delegateName));
            if (opts?.populate && opts.populate.length > 0) {
              await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
            }
            return attachSave(clientObj, delegate, fieldMap, String(delegateName));
          } catch (createErr: any) {
            if (createErr.code === 'P2002') {
              // Concurrency collision: another process created the record with unique constraints
              let existingRecord: any = null;
              if (Object.keys(jsonPreds).length > 0) {
                const candidates = await delegate.findMany({ where, take: 50 });
                existingRecord = candidates.find((c: any) => matchesJsonPredicates(c, jsonPreds)) || null;
              } else {
                existingRecord = await delegate.findFirst({ where });
              }
              if (existingRecord) {
                const updated = await delegate.update({
                  where: { id: existingRecord.id },
                  data: updateData,
                });
                const clientObj = normalizeDelegateRecord(toClient(updated), String(delegateName));
                if (opts?.populate && opts.populate.length > 0) {
                  await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
                }
                return attachSave(clientObj, delegate, fieldMap);
              }
            }
            throw createErr;
          }
        }
        return null;
      }

      let updated: any = null;
      if (Object.keys(jsonPreds).length > 0) {
        updated = await (prisma as any).$transaction(async (tx: any) => {
          const fresh = await tx[delegateName].findUnique({ where: { id: existing.id } });
          if (!fresh || !matchesJsonPredicates(fresh, jsonPreds)) {
            return null;
          }
          return tx[delegateName].update({
            where: { id: existing.id },
            data: updateData,
          });
        });
        if (!updated) return null;
      } else {
        updated = await delegate.update({
          where: { id: existing.id },
          data: updateData,
        });
      }

      const clientObj = normalizeDelegateRecord(toClient(updated), String(delegateName));

      if (delegateName === 'conversation') {
        const populateParticipantsOpt = opts?.populate?.find((p: any) => p.path === 'participants');
        try {
          const pRows = await (prisma as any).conversationParticipant.findMany({
            where: { conversationId: existing.id },
            include: populateParticipantsOpt ? { user: true } : undefined,
          });

          if (populateParticipantsOpt) {
            clientObj.participants = pRows.map((cp: any) =>
              toClient(cp.user ? { ...cp.user, _id: cp.user.id } : { _id: cp.userId, id: cp.userId })
            );
          } else {
            clientObj.participants = pRows.map((cp: any) => cp.userId);
          }
        } catch (partErr: any) {
          if (partErr?.message && partErr.message.includes('conversation_participants')) {
            const rawRow = await (prisma as any).$queryRaw(
              Prisma.sql`SELECT \`participants\` FROM \`conversations\` WHERE \`_id\` = ${existing.id} LIMIT 1`
            ).catch(() => null);
            const pIds = parseParticipantsJson(rawRow && rawRow[0]?.participants);
            clientObj.participants = pIds;
          } else {
            throw partErr;
          }
        }
      }

      if (opts?.populate && opts.populate.length > 0) {
        await resolveVirtualPopulates([clientObj], opts.populate, String(delegateName));
      }

      return attachSave(clientObj, delegate, fieldMap);
    });
  };

  ModelConstructor.deleteOne = async function (filter: any) {
    const delegate = getDelegate();
    const where = normalizeFilter(filter, fieldMap);
    const jsonPreds = extractDotNotationPredicates(filter);
    if (Object.keys(jsonPreds).length > 0) {
      const candidates = await delegate.findMany({ where, take: 100 });
      const target = candidates.find((r: any) => matchesJsonPredicates(r, jsonPreds));
      if (!target) return { acknowledged: true, deletedCount: 0 };
      const deleted = await (prisma as any).$transaction(async (tx: any) => {
        const fresh = await tx[delegateName].findUnique({ where: { id: target.id } });
        if (!fresh || !matchesJsonPredicates(fresh, jsonPreds)) {
          return null;
        }
        return tx[delegateName].delete({ where: { id: target.id } });
      });
      return { acknowledged: true, deletedCount: deleted ? 1 : 0 };
    }
    const result = await delegate.deleteMany({ where });
    return { acknowledged: true, deletedCount: result.count };
  };

  ModelConstructor.deleteMany = async function (filter: any) {
    const delegate = getDelegate();
    const where = normalizeFilter(filter, fieldMap);
    const jsonPreds = extractDotNotationPredicates(filter);
    if (Object.keys(jsonPreds).length > 0) {
      const SCAN_LIMIT = 500;
      const candidates = await delegate.findMany({ where, take: SCAN_LIMIT + 1 });
      if (candidates.length > SCAN_LIMIT) {
        throw new Error(
          `[PrismaBridge] deleteMany with JSON predicates matched more than safety scan budget (${SCAN_LIMIT}). Failing closed to prevent partial deletes.`
        );
      }
      const targets = candidates.filter((r: any) => matchesJsonPredicates(r, jsonPreds));
      if (targets.length === 0) return { acknowledged: true, deletedCount: 0 };
      const targetIds = targets.map((r: any) => r.id);
      const result = await delegate.deleteMany({ where: { id: { in: targetIds } } });
      return { acknowledged: true, deletedCount: result.count };
    }
    const result = await delegate.deleteMany({ where });
    return { acknowledged: true, deletedCount: result.count };
  };

  ModelConstructor.findByIdAndDelete = async function (id: any) {
    const delegate = getDelegate();
    const stringId = id?._id ? String(id._id) : id?.id ? String(id.id) : String(id);
    try {
      const deleted = await delegate.delete({ where: { id: stringId } });
      return normalizeDelegateRecord(toClient(deleted), String(delegateName));
    } catch (err: any) {
      if (err.code === 'P2025') return null;
      throw err;
    }
  };

  ModelConstructor.findOneAndDelete = async function (filter: any) {
    const delegate = getDelegate();
    if (!delegate) return null;
    const where = normalizeFilter(filter, fieldMap);
    const jsonPreds = extractDotNotationPredicates(filter);
    try {
      let record: any = null;
      if (Object.keys(jsonPreds).length > 0) {
        const candidates = await delegate.findMany({ where, take: 50 });
        record = candidates.find((r: any) => matchesJsonPredicates(r, jsonPreds)) || null;
        if (!record) return null;
        const deleted = await (prisma as any).$transaction(async (tx: any) => {
          const fresh = await tx[delegateName].findUnique({ where: { id: record.id } });
          if (!fresh || !matchesJsonPredicates(fresh, jsonPreds)) {
            return null;
          }
          return tx[delegateName].delete({ where: { id: record.id } });
        });
        if (!deleted) return null;
        return normalizeDelegateRecord(toClient(deleted), String(delegateName));
      } else {
        record = await delegate.findFirst({ where });
        if (!record) return null;
        await delegate.delete({ where: { id: record.id } });
        return normalizeDelegateRecord(toClient(record), String(delegateName));
      }
    } catch (err: any) {
      if (err.code === 'P2025') return null;
      throw err;
    }
  };

  ModelConstructor.countDocuments = async function (filter: any = {}) {
    try {
      const delegate = getDelegate();
      if (!delegate) return 0;
      const where = normalizeFilter(filter, fieldMap);
      const jsonPreds = extractDotNotationPredicates(filter);
      const hasJsonPreds = Object.keys(jsonPreds).length > 0;

      if (String(delegateName) === 'notification' || hasJsonPreds) {
        const BATCH_SIZE = 250;
        const MAX_COUNT_BUDGET = 5000;
        let count = 0;
        let dbOffset = 0;
        let isCapped = false;

        while (dbOffset < MAX_COUNT_BUDGET) {
          const batch = await delegate.findMany({
            where,
            select: { id: true, read: true, metadata: true },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: dbOffset,
            take: BATCH_SIZE,
          });
          if (!batch || batch.length === 0) break;

          for (const r of batch) {
            // Defense-in-depth: If filter specified read status, verify field matches projection
            if (where.read !== undefined && r.read !== undefined && r.read !== where.read) {
              continue;
            }
            if (hasJsonPreds && !matchesJsonPredicates(r, jsonPreds)) {
              continue;
            }
            let meta = r?.metadata;
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta); } catch { count++; continue; }
            }
            if (!(meta?.isDeleted || meta?.trashed)) {
              count++;
            }
          }

          dbOffset += batch.length;
          if (batch.length < BATCH_SIZE) break;
        }

        if (dbOffset >= MAX_COUNT_BUDGET) {
          isCapped = true;
        }

        const countNum = new Number(count) as any;
        countNum.count = count;
        countNum.isCapped = isCapped;
        countNum.cappedAt = isCapped ? MAX_COUNT_BUDGET : undefined;
        return countNum;
      }
      return await delegate.count({ where });
    } catch (err: any) {
      if (String(delegateName) === 'block') {
        throw err;
      }
      const isMissingTable =
        err.code === 'P2021' ||
        (err.message && err.message.includes('does not exist in the current database') && !err.message.includes('column'));
      if (isMissingTable && JUSTIFIED_AUXILIARY_MISSING_TABLE_DELEGATES.has(String(delegateName))) {
        console.warn(`[PrismaBridge] Table for auxiliary delegate '${String(delegateName)}' does not exist yet. Returning 0 count.`);
        return 0;
      }
      throw err;
    }
  };

  ModelConstructor.exists = async function (filter: any = {}) {
    try {
      const count = await this.countDocuments(filter);
      return count > 0 ? { _id: true } : null;
    } catch (err: any) {
      if (String(delegateName) === 'block') {
        throw err;
      }
      const isMissingTable =
        err.code === 'P2021' ||
        (err.message && err.message.includes('does not exist in the current database') && !err.message.includes('column'));
      if (isMissingTable && JUSTIFIED_AUXILIARY_MISSING_TABLE_DELEGATES.has(String(delegateName))) {
        console.warn(`[PrismaBridge] Table for auxiliary delegate '${String(delegateName)}' does not exist yet. Returning null for exists.`);
        return null;
      }
      throw err;
    }
  };

  ModelConstructor.estimatedDocumentCount = async function () {
    return getDelegate().count();
  };

  ModelConstructor.distinct = async function (field: string, filter: any = {}) {
    const delegate = getDelegate();
    const where = normalizeFilter(filter, fieldMap);
    const prismaField = fieldMap[field] || (field === '_id' ? 'id' : field);
    const jsonPreds = extractDotNotationPredicates(filter);
    const hasJsonPreds = Object.keys(jsonPreds).length > 0;

    if (hasJsonPreds || String(delegateName) === 'notification') {
      const BATCH_SIZE = 250;
      const MAX_SCAN_BUDGET = 5000;
      let dbOffset = 0;
      const uniqueValues = new Set<any>();

      while (dbOffset < MAX_SCAN_BUDGET) {
        const batch = await delegate.findMany({
          where,
          skip: dbOffset,
          take: BATCH_SIZE,
          select: {
            id: true,
            [prismaField]: true,
            metadata: true,
          },
        });
        if (!batch || batch.length === 0) break;

        for (const r of batch) {
          if (String(delegateName) === 'notification') {
            let meta = r?.metadata;
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta); } catch { meta = {}; }
            }
            if (meta?.isDeleted || meta?.trashed) {
              continue;
            }
          }
          if (hasJsonPreds && !matchesJsonPredicates(r, jsonPreds)) {
            continue;
          }
          const val = r[prismaField];
          if (val !== null && val !== undefined) {
            uniqueValues.add(val);
          }
        }

        dbOffset += batch.length;
        if (batch.length < BATCH_SIZE) break;
      }

      return Array.from(uniqueValues);
    }

    const records = await delegate.findMany({
      where,
      select: { [prismaField]: true },
      distinct: [prismaField],
    });
    return records.map((r: any) => r[prismaField]).filter((v: any) => v !== null && v !== undefined);
  };

  ModelConstructor.aggregate = async function (pipeline: any[] = []) {
    return runPrismaAggregate(getDelegate(), pipeline, fieldMap);
  };

  return ModelConstructor as any;
}

/**
 * Types & ObjectId compatibility helper to replace mongoose.Types without needing MongoDB.
 */
export const Types = {
  ObjectId: class ObjectId {
    private id: string;
    constructor(id?: string | any) {
      if (id && typeof id === 'object' && (id._id || id.id)) {
        this.id = String(id._id || id.id);
      } else {
        this.id = id ? String(id) : generateObjectId();
      }
    }
    toString() {
      return this.id;
    }
    valueOf() {
      return this.id;
    }
    toJSON() {
      return this.id;
    }
    equals(other: any) {
      return this.id === String(other?._id || other?.id || other);
    }
    static isValid(id: any) {
      return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
    }
  },
};

export interface SchemaConstructor {
  new <T = any>(def?: any, options?: any): any;
  <T = any>(def?: any, options?: any): any;
  Types: {
    ObjectId: any;
    Mixed: any;
    String: any;
    Number: any;
    Boolean: any;
    Date: any;
    Array: any;
  };
}

export const Schema: SchemaConstructor = Object.assign(
  function Schema(this: any, def: any = {}, options: any = {}) {
    const virtualObj: any = {
      get: function (..._args: any[]) {
        return virtualObj;
      },
      set: function (..._args: any[]) {
        return virtualObj;
      },
    };

    const schemaObj: any = {
      def,
      options,
      methods: {},
      statics: {},
      index: function (..._args: any[]) {
        return schemaObj;
      },
      virtual: function (..._args: any[]) {
        return virtualObj;
      },
      pre: function (..._args: any[]) {
        return schemaObj;
      },
      post: function (..._args: any[]) {
        return schemaObj;
      },
      plugin: function (..._args: any[]) {
        return schemaObj;
      },
      set: function (..._args: any[]) {
        return schemaObj;
      },
      path: function (..._args: any[]) {
        return {};
      },
    };

    return schemaObj;
  } as any,
  {
    Types: {
      ObjectId: Types.ObjectId,
      Mixed: 'Mixed',
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date,
      Array: Array,
    },
  }
);

export type Document = any;
export type SchemaType = any;
export type Model<T> = any;
export type FilterQuery<T> = any;
export type UpdateQuery<T> = any;

export const mongoose = {
  Types,
  Schema,
  models: {} as Record<string, any>,
  model: (name: string, schema?: any) => {
    const delegate = name.charAt(0).toLowerCase() + name.slice(1);
    return createPrismaModelAdapter(delegate);
  },
  isValidObjectId: (id: any) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id),
};

export namespace mongoose {
  export namespace Types {
    export type ObjectId = string | any;
  }
}
export default mongoose;
