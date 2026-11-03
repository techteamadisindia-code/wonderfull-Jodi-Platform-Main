/**
 * Administrator Permission Utilities
 * Provides strict, authoritative normalization and evaluation of administrator permissions.
 * Matches Prisma schema and Mongoose model expectations.
 * Fails closed on malformed, unexpected, or missing data.
 */

/**
 * The permanent protected Primary Super Admin identity.
 * Immutable and protected against deletion, demotion, deactivation, or permission revocation.
 */
export const PRIMARY_SUPER_ADMIN_EMAIL = 'shubhamchaudante@gmail.com';

/**
 * Case-insensitively checks if an email matches the protected Primary Super Admin identity.
 * Trims leading/trailing whitespace and fails closed on empty or invalid inputs.
 */
export function isPrimarySuperAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return email.trim().toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL;
}

/**
 * Authoritative set of permissible administrator module keys.
 */
export const ALLOWED_ADMIN_PERMISSIONS = [
  'all',
  'users',
  'profiles',
  'privateInfo.view',
  'privateInfo.edit',
  'verifications',
  'memberships',
  'payments',
  'reports',
  'settings',
] as const;

export type AdminPermission = (typeof ALLOWED_ADMIN_PERMISSIONS)[number];

/**
 * Normalizes unknown permission input into a clean string array.
 * Accepts:
 * - string[] (e.g. from Prisma Json or Mongoose)
 * - JSON-encoded string array (e.g. '["all", "users"]')
 *
 * Rejects (fails closed by returning []):
 * - null, undefined, boolean, numbers, objects
 * - Malformed JSON strings
 * - Arrays containing non-string items (e.g. numbers, objects, booleans)
 * - Unsupported formats
 */
export function normalizeAdminPermissions(raw: unknown): string[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  let candidates: unknown = raw;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }

    // Must be a valid JSON-encoded array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        candidates = JSON.parse(trimmed);
      } catch {
        // Malformed JSON: fail closed
        return [];
      }
    } else {
      // Unsupported format (e.g. raw text, comma-separated string): fail closed
      return [];
    }
  }

  if (!Array.isArray(candidates)) {
    return [];
  }

  const normalized: string[] = [];
  for (const item of candidates) {
    if (typeof item !== 'string') {
      // Array contains unexpected non-string type: fail closed
      return [];
    }
    const val = item.trim();
    if (val) {
      normalized.push(val);
    }
  }

  return normalized;
}

/**
 * Checks if normalized permissions grant Super Administrator status.
 * Strictly recognizes exact 'all' permission value.
 * Never infers permissions from roles, emails, or display names.
 */
export function hasSuperAdminPermission(permissions: unknown): boolean {
  const normalized = normalizeAdminPermissions(permissions);
  return normalized.includes('all');
}


/**
 * Authoritatively resolves the JWT secret for token creation and cryptographic verification.
 *
 * Production Rules:
 * - In production (process.env.NODE_ENV === 'production'):
 *   process.env.JWT_SECRET MUST be set and non-empty.
 *   If missing or whitespace-only, fails closed and returns null.
 *   Never falls back to development secrets in production.
 *
 * Non-Production Rules:
 * - In development, test, or local inspection:
 *   Falls back to 'supersecret_wonderfuljodi_dev_key_2026' only when process.env.JWT_SECRET is unset.
 */
export function getSafeJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    return 'supersecret_wonderfuljodi_dev_key_2026';
  }
  return secret.trim();
}

/**
 * Throws an explicit error in production if JWT_SECRET is unconfigured.
 */
export function getJwtSecret(): string {
  const secret = getSafeJwtSecret();
  if (!secret) {
    throw new Error('[Security] CRITICAL: JWT_SECRET environment variable is missing or empty in production.');
  }
  return secret;
}

/**
 * Cryptographically and authoritatively verifies whether a user ID belongs to the active,
 * genuine Primary Super Admin in the database.
 *
 * Strict 6-Point Verification:
 * 1. Requires valid non-empty user ID from a cryptographically verified token.
 * 2. Resolves the user record from the database.
 * 3. Confirms the user record exists.
 * 4. Confirms the account is active, not deleted, suspended, or blocked:
 *    (!user.isDeleted && user.isActive !== false && user.status !== 'Deleted' && user.status !== 'Suspended' && user.status !== 'Blocked' && !user.isBlocked)
 * 5. Confirms the database email strictly matches PRIMARY_SUPER_ADMIN_EMAIL ('shubhamchaudante@gmail.com').
 * 6. Confirms user.role === 'admin' and Admin record has super-admin authorization (permissions include 'all').
 *
 * Fails closed on any failure, mismatch, or database error.
 */
export async function verifyPrimarySuperAdminInDatabase(userId?: string | null): Promise<boolean> {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return false;
  }

  try {
    const { User } = await import('../models/User');
    const userDoc = await User.findById(userId.trim());
    if (!userDoc) {
      return false;
    }

    if (
      userDoc.isDeleted ||
      userDoc.isActive === false ||
      userDoc.status === 'Deleted' ||
      userDoc.status === 'Suspended' ||
      userDoc.status === 'Blocked' ||
      userDoc.isBlocked
    ) {
      return false;
    }

    if (!isPrimarySuperAdminEmail(userDoc.email)) {
      return false;
    }

    if (userDoc.role !== 'admin') {
      return false;
    }

    const { Admin } = await import('../models/Admin');
    const adminDoc = await Admin.findOne({ user: userDoc._id || userDoc.id });
    if (!adminDoc || !hasSuperAdminPermission(adminDoc.permissions)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Security] Failed to verify Primary Super Admin in database:', error);
    return false;
  }
}
