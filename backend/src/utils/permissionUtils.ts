/**
 * Administrator Permission Utilities
 * Provides strict, authoritative normalization and evaluation of administrator permissions.
 * Matches Prisma schema and Mongoose model expectations.
 * Fails closed on malformed, unexpected, or missing data.
 */

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
