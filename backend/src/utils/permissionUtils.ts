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
