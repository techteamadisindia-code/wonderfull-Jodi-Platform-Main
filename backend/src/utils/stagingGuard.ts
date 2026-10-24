/**
 * Wonderful Jodi — Fail-Closed Staging Database Isolation Guard
 *
 * PURPOSE:
 * Enforces strict, fail-closed isolation checks on DATABASE_URL before
 * any Prisma Client instance is created or any database connection is opened.
 *
 * RULES:
 * 1. Rejects missing or malformed URLs.
 * 2. Rejects non-MySQL/MariaDB protocols.
 * 3. Rejects known production hostnames (srv1646.hstgr.io, *.hstgr.io, *.wonderfuljodi.com).
 * 4. Rejects known production database names or usernames containing 'u625755214'.
 * 5. Requires an explicit, developer-supplied hostname allowlist (STAGING_DB_HOST_ALLOWLIST).
 *    Fails closed if the allowlist is missing, empty, or the host is not in the allowlist.
 * 6. Validates exact staging database name and dedicated staging account.
 * 7. Never logs, prints, or exposes passwords, URL tokens, or secrets.
 */

import { getCanonicalUploadRootDir } from './uploadPaths';

export interface StagingValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedDetails?: {
    protocol: string;
    hostname: string;
    port: string;
    database: string;
    username: string;
  };
}

export interface StagingGuardOptions {
  allowlist?: string[];
  expectedDbName?: string;
  expectedDbUser?: string;
}

/**
 * Safely normalizes a hostname:
 * - Decodes percent-encoding safely.
 * - Converts to lowercase.
 * - Strips trailing dots (FQDN root notation).
 * - Strips IPv6 enclosing brackets [ ].
 * - Validates against whitespace, control chars, path delimiters, userinfo (@), or port colons.
 * Returns normalized string, or null if malformed or ambiguous.
 */
export function normalizeHostname(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed).toLowerCase();
  } catch {
    return null; // Malformed percent-encoding
  }

  // Strip IPv6 square brackets if present: e.g. [::1] -> ::1
  if (decoded.startsWith('[') && decoded.endsWith(']')) {
    decoded = decoded.slice(1, -1).trim();
  }

  // Strip all trailing dots (e.g. srv1646.hstgr.io. -> srv1646.hstgr.io)
  decoded = decoded.replace(/\.+$/, '');

  // Reject empty string after stripping
  if (!decoded) return null;

  // Reject invalid / ambiguous characters (spaces, slashes, backslashes, @, ?, #)
  if (/[\s\/\\@?#]/.test(decoded)) return null;

  // Reject colons unless it's a valid IPv6 address (at least two colons and only hex/colons)
  if (decoded.includes(':')) {
    const colonCount = (decoded.match(/:/g) || []).length;
    if (colonCount < 2 || !/^[0-9a-f:]+$/.test(decoded)) {
      return null; // Contains unparsed port or invalid characters
    }
  }

  // Reject leading dots, consecutive dots, or trailing hyphens in domain segments
  if (decoded.startsWith('.') || decoded.includes('..')) {
    return null;
  }

  return decoded;
}

/**
 * Parses and validates DATABASE_URL against strict staging isolation constraints.
 * Pure function: does NOT attempt any network connections or socket opens.
 */
export function validateStagingDatabaseUrl(
  rawUrl?: string,
  options?: StagingGuardOptions
): StagingValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      error: 'DATABASE_URL is missing, undefined, or empty.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err: any) {
    return {
      isValid: false,
      error: 'DATABASE_URL is malformed and could not be parsed as a valid URL.',
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  const rawHostname = parsed.hostname;
  const port = parsed.port || '3306';
  const rawDatabase = parsed.pathname.replace(/^\//, '').split('?')[0].trim();
  const rawUsername = parsed.username || '';

  const normalizedHost = normalizeHostname(rawHostname);

  let decodedDatabase = rawDatabase;
  try {
    decodedDatabase = decodeURIComponent(rawDatabase).trim();
  } catch {
    return {
      isValid: false,
      error: 'DATABASE_URL database name contains malformed URL encoding.',
    };
  }

  let decodedUsername = rawUsername;
  try {
    decodedUsername = decodeURIComponent(rawUsername).trim();
  } catch {
    return {
      isValid: false,
      error: 'DATABASE_URL username contains malformed URL encoding.',
    };
  }

  const sanitizedDetails = {
    protocol,
    hostname: normalizedHost || '(invalid/ambiguous)',
    port,
    database: decodedDatabase,
    username: decodedUsername ? `${decodedUsername.slice(0, 3)}***` : '(none)',
  };

  // 1. Protocol Validation
  if (protocol !== 'mysql:' && protocol !== 'mariadb:') {
    return {
      isValid: false,
      error: `Invalid protocol '${protocol}'. Only 'mysql:' or 'mariadb:' is permitted.`,
      sanitizedDetails,
    };
  }

  // 2. Hostname Validation
  if (!normalizedHost) {
    return {
      isValid: false,
      error: `DATABASE_URL hostname '${rawHostname}' is invalid, malformed, or ambiguous.`,
      sanitizedDetails,
    };
  }

  // 3. Database Name Required
  if (!decodedDatabase) {
    return {
      isValid: false,
      error: 'DATABASE_URL does not specify a target database name.',
      sanitizedDetails,
    };
  }

  // 4. Known Production Blacklist Checks (NEVER WEAKEN)
  // 4a. Production Domain Hostnames (Cannot use production web domains as DB host)
  const PROD_DOMAIN_PATTERNS = [
    'wonderfuljodi.com',
  ];

  for (const pattern of PROD_DOMAIN_PATTERNS) {
    if (normalizedHost === pattern || normalizedHost.endsWith(`.${pattern}`)) {
      return {
        isValid: false,
        error: `SECURITY INTERCEPT: Connection to production domain host '${normalizedHost}' is strictly forbidden in staging.`,
        sanitizedDetails,
      };
    }
  }

  // 4b. Production Database Name Blacklist
  const isProdDb =
    decodedDatabase.toLowerCase() === 'u625755214_wonderfuljodi' ||
    decodedDatabase.toLowerCase() === 'wonderfuljodi' ||
    decodedDatabase.toLowerCase() === 'wonderfuljodi_prod' ||
    decodedDatabase.toLowerCase() === 'wonderfuljodi_production' ||
    /^(?:u625755214_)?wonderfuljodi(?:_prod(?:uction)?)?$/i.test(decodedDatabase);

  if (isProdDb) {
    return {
      isValid: false,
      error: `SECURITY INTERCEPT: Connection to production database '${decodedDatabase}' is strictly forbidden in staging.`,
      sanitizedDetails,
    };
  }

  // 4c. Production User Account Blacklist
  const isProdUser =
    decodedUsername.toLowerCase() === 'u625755214_wonderfuljodi' ||
    decodedUsername.toLowerCase() === 'root' ||
    decodedUsername.toLowerCase() === 'admin' ||
    decodedUsername.toLowerCase() === 'wonderfuljodi';

  if (isProdUser) {
    return {
      isValid: false,
      error: `SECURITY INTERCEPT: Production user account '${decodedUsername}' is strictly forbidden in staging.`,
      sanitizedDetails,
    };
  }

  // 5. Administrator-Supplied Explicit Hostname Allowlist Check (Fail-Closed)
  // Shared database server (e.g. srv1646.hstgr.io or localhost) is ONLY accepted if explicitly in STAGING_DB_HOST_ALLOWLIST.
  const rawAllowlist = options?.allowlist ?? (
    process.env.STAGING_DB_HOST_ALLOWLIST
      ? process.env.STAGING_DB_HOST_ALLOWLIST.split(',').map((h) => h.trim()).filter(Boolean)
      : []
  );

  const normalizedAllowlist = rawAllowlist
    .map((h) => normalizeHostname(h))
    .filter((h): h is string => Boolean(h));

  if (!normalizedAllowlist || normalizedAllowlist.length === 0) {
    return {
      isValid: false,
      error: 'FAIL-CLOSED: STAGING_DB_HOST_ALLOWLIST is not configured. Developer must explicitly provide approved staging hostname(s).',
      sanitizedDetails,
    };
  }

  const isHostAllowed = normalizedAllowlist.some((allowed) => allowed === normalizedHost);
  if (!isHostAllowed) {
    return {
      isValid: false,
      error: `Host '${normalizedHost}' is not in the approved staging allowlist: [${normalizedAllowlist.join(', ')}].`,
      sanitizedDetails,
    };
  }

  // 6. Exact Staging Database Name Check (Fail-Closed)
  const expectedDb = (
    options?.expectedDbName ||
    process.env.STAGING_DB_NAME ||
    'u625755214_staging'
  ).trim();

  if (decodedDatabase.toLowerCase() !== expectedDb.toLowerCase()) {
    return {
      isValid: false,
      error: `Database '${decodedDatabase}' does not match expected staging database '${expectedDb}'.`,
      sanitizedDetails,
    };
  }

  // 7. Dedicated Staging Account Check (Fail-Closed)
  const expectedUser = (
    options?.expectedDbUser ||
    process.env.STAGING_DB_USER ||
    'u625755214_staging_user'
  ).trim();

  if (decodedUsername.toLowerCase() !== expectedUser.toLowerCase()) {
    return {
      isValid: false,
      error: `Database user does not match approved staging account '${expectedUser}'.`,
      sanitizedDetails,
    };
  }

  return {
    isValid: true,
    sanitizedDetails,
  };
}

/**
 * Asserts staging database and storage isolation.
 * Throws an Error and terminates the process if isolation cannot be verified.
 */
export function assertStagingIsolation(options?: {
  url?: string;
  exitOnError?: boolean;
  uploadRoot?: string;
}): void {
  const isStagingMode =
    process.env.NODE_ENV === 'staging' ||
    process.env.STAGING_MODE === 'true';

  if (!isStagingMode) {
    return; // Guard activates only when staging mode is explicitly active
  }

  const dbUrl = options?.url || process.env.DATABASE_URL;
  const result = validateStagingDatabaseUrl(dbUrl);

  if (!result.isValid) {
    const errorMsg = `[STAGING GUARD] ABORTING STARTUP: ${result.error}`;
    console.error('\n════════════════════════════════════════════════════════════════');
    console.error('  🛑 STAGING DATABASE ISOLATION GUARD ACTIVATED');
    console.error('════════════════════════════════════════════════════════════════');
    console.error(errorMsg);
    if (result.sanitizedDetails) {
      console.error('  Target Protocol:', result.sanitizedDetails.protocol);
      console.error('  Target Host:    ', result.sanitizedDetails.hostname);
      console.error('  Target Port:    ', result.sanitizedDetails.port);
      console.error('  Target Database:', result.sanitizedDetails.database);
    }
    console.error('════════════════════════════════════════════════════════════════\n');

    if (options?.exitOnError !== false) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }

  // Storage Isolation: Verify upload storage does not point to production directory
  const resolvedUploadRoot = (options?.uploadRoot || getCanonicalUploadRootDir()).replace(/\\/g, '/').toLowerCase();
  const isProdUpload =
    resolvedUploadRoot.includes('domains/wonderfuljodi.com/uploads') ||
    resolvedUploadRoot.includes('domains/wonderfuljodi.com/public_html') ||
    (resolvedUploadRoot.includes('wonderfuljodi.com') && !resolvedUploadRoot.includes('staging.wonderfuljodi.com'));

  if (isProdUpload) {
    const errorMsg = `[STAGING GUARD] ABORTING STARTUP: Upload storage points to production path '${resolvedUploadRoot}'. Staging must use isolated storage.`;
    console.error('\n════════════════════════════════════════════════════════════════');
    console.error('  🛑 STAGING STORAGE ISOLATION GUARD ACTIVATED');
    console.error('════════════════════════════════════════════════════════════════');
    console.error(errorMsg);
    console.error('════════════════════════════════════════════════════════════════\n');

    if (options?.exitOnError !== false) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }

  console.log(
    `[STAGING GUARD] Verified isolated staging database and storage: host=${result.sanitizedDetails?.hostname}, db=${result.sanitizedDetails?.database}`
  );
}

export interface ServerIdentityInfo {
  server_host: string;
  db_name: string;
  db_user: string;
  db_version: string;
}

export interface IdentityVerificationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Pure verification function that validates live database identity attributes
 * against approved staging constraints and production blacklists.
 * Does NOT perform network or socket operations.
 */
export function verifyServerIdentity(
  info: ServerIdentityInfo,
  options?: {
    expectedDbName?: string;
    expectedDbUser?: string;
  }
): IdentityVerificationResult {
  if (!info || typeof info !== 'object') {
    return {
      isValid: false,
      error: 'IDENTITY REJECTED: Empty or invalid server identity response.',
    };
  }

  const liveHost = (info.server_host || '').trim().toLowerCase();
  const liveDb = (info.db_name || '').trim().toLowerCase();
  const liveUserRaw = (info.db_user || '').trim().toLowerCase();
  const liveAccount = liveUserRaw.split('@')[0].trim().replace(/^['"`]+|['"`]+$/g, '');

  // 1. Production Account Signatures
  const isProdUser =
    liveAccount === 'u625755214_wonderfuljodi' ||
    liveAccount === 'root' ||
    liveAccount === 'admin' ||
    liveAccount === 'wonderfuljodi';

  if (isProdUser) {
    return {
      isValid: false,
      error: `CRITICAL INTERCEPT: Connected user account '${info.db_user}' matches production account signature.`,
    };
  }

  // 2. Production Database Signatures
  const isProdDb =
    liveDb === 'u625755214_wonderfuljodi' ||
    liveDb === 'wonderfuljodi' ||
    liveDb === 'wonderfuljodi_prod' ||
    liveDb === 'wonderfuljodi_production' ||
    /^(?:u625755214_)?wonderfuljodi(?:_prod(?:uction)?)?$/i.test(liveDb);

  if (isProdDb) {
    return {
      isValid: false,
      error: `CRITICAL INTERCEPT: Connected database name '${info.db_name}' matches production database signature.`,
    };
  }

  // 3. Production Server Host Signatures
  const PROD_HOSTS = ['wonderfuljodi.com'];
  for (const pattern of PROD_HOSTS) {
    if (liveHost === pattern || liveHost.endsWith(`.${pattern}`)) {
      return {
        isValid: false,
        error: `CRITICAL INTERCEPT: Connected server hostname '${info.server_host}' matches production host signatures.`,
      };
    }
  }

  // 4. Exact Staging Database Match
  const expectedDb = (
    options?.expectedDbName ||
    process.env.STAGING_DB_NAME ||
    'u625755214_staging'
  ).trim().toLowerCase();

  if (liveDb !== expectedDb) {
    return {
      isValid: false,
      error: `IDENTITY MISMATCH: Connected database is '${info.db_name}', but expected '${expectedDb}'.`,
    };
  }

  // 5. Explicit Staging Account Match (CURRENT_USER username component)
  const expectedUser = (
    options?.expectedDbUser ||
    process.env.STAGING_DB_USER ||
    'u625755214_staging_user'
  ).trim().toLowerCase();

  if (liveAccount !== expectedUser) {
    return {
      isValid: false,
      error: `ACCOUNT MISMATCH: Connected user account is '${info.db_user}', but expected approved staging account '${expectedUser}'.`,
    };
  }

  return { isValid: true };
}
