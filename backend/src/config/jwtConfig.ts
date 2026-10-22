import jwt from 'jsonwebtoken';

export type TokenPurpose = 'access' | 'admin';

export interface BaseTokenPayload {
  userId?: string;
  role?: string;
  email?: string;
  sessionId?: string;
  tokenType?: string;
  purpose?: string;
  [key: string]: any;
}

export interface AdminTokenPayload extends BaseTokenPayload {
  userId: string;
  role: string;
  email: string;
  sessionId?: string;
  sub?: string;
}

export interface AccessTokenPayload extends BaseTokenPayload {
  userId: string;
  role: string;
}

export interface ValidationOptions {
  forceValidate?: boolean;
  allowDevFallback?: boolean;
}

// Minimum secret length: 32 characters (256-bit entropy equivalent for HS256)
export const MIN_SECRET_LENGTH = 32;

// Known insecure / placeholder substrings (case-insensitive)
const INSECURE_SUBSTRINGS = [
  'supersecret',
  'dev_key',
  'placeholder',
  'change_me',
  'replace_me',
  'your_actual',
  'your_secret',
  'default_key',
  'dummy_secret',
  '12345678',
  'password',
  'abcdef',
  'wonderfuljodi_dev_key',
  'wonderfuljodi_production_key',
  'wonderfuljodi_refresh_key',
  'secret123',
];

/**
 * Validates cryptographic secret strength for production and staging environments.
 * Throws a redacted, descriptive error on violation.
 * NEVER prints or logs secret contents.
 */
export function validateSecretStrength(secret: string | undefined, secretName: string): void {
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error(
      `[FATAL] JWT Configuration Error: Required secret "${secretName}" is missing or empty. Application startup aborted.`
    );
  }

  const trimmed = secret.trim();

  if (trimmed.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[FATAL] JWT Configuration Error: Secret "${secretName}" is insufficiently strong (length: ${trimmed.length} chars, minimum required: ${MIN_SECRET_LENGTH} chars). Application startup aborted.`
    );
  }

  const lower = trimmed.toLowerCase();
  for (const pattern of INSECURE_SUBSTRINGS) {
    if (lower.includes(pattern)) {
      throw new Error(
        `[FATAL] JWT Configuration Error: Secret "${secretName}" contains insecure placeholder pattern. Application startup aborted.`
      );
    }
  }

  // Check entropy / diversity (reject repetitive patterns such as 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
  const uniqueChars = new Set(trimmed).size;
  if (uniqueChars < 8) {
    throw new Error(
      `[FATAL] JWT Configuration Error: Secret "${secretName}" has insufficient character entropy. Application startup aborted.`
    );
  }
}

/**
 * Check whether the active environment is production or staging.
 */
export function isProductionOrStaging(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'staging' ||
    process.env.STAGING_MODE === 'true'
  );
}

/**
 * Validates JWT environment configuration centrally.
 * Both JWT_SECRET and JWT_ADMIN_SECRET are MANDATORY in production and staging.
 * Refresh tokens are opaque, database-backed tokens (stored in MariaDB RefreshToken table),
 * so they do not require a separate JWT signing secret.
 * Must be executed before the application binds to ports or accepts traffic.
 */
export function validateJwtEnvironment(options?: ValidationOptions): void {
  const isStrict = isProductionOrStaging() || Boolean(options?.forceValidate);

  if (isStrict) {
    // 1. Mandatory member access token secret
    const jwtSecret = process.env.JWT_SECRET;
    validateSecretStrength(jwtSecret, 'JWT_SECRET');

    // 2. Mandatory administrator token secret (Strict Separation)
    const jwtAdminSecret = process.env.JWT_ADMIN_SECRET;
    validateSecretStrength(jwtAdminSecret, 'JWT_ADMIN_SECRET');
  } else if (process.env.NODE_ENV === 'test') {
    // In test environment, if secrets are explicitly provided, validate them if forceValidate is requested
    if (options?.forceValidate) {
      if (process.env.JWT_SECRET) {
        validateSecretStrength(process.env.JWT_SECRET, 'JWT_SECRET');
      }
      if (process.env.JWT_ADMIN_SECRET) {
        validateSecretStrength(process.env.JWT_ADMIN_SECRET, 'JWT_ADMIN_SECRET');
      }
    }
  } else {
    // Development mode
    if (process.env.JWT_SECRET) {
      try {
        validateSecretStrength(process.env.JWT_SECRET, 'JWT_SECRET');
      } catch (warnErr: any) {
        console.warn(`[JWT Config Warning] ${warnErr?.message || warnErr}`);
      }
    }
    if (process.env.JWT_ADMIN_SECRET) {
      try {
        validateSecretStrength(process.env.JWT_ADMIN_SECRET, 'JWT_ADMIN_SECRET');
      } catch (warnErr: any) {
        console.warn(`[JWT Config Warning] ${warnErr?.message || warnErr}`);
      }
    }
  }
}

/**
 * Safe test fallback secrets (used strictly and exclusively in NODE_ENV === 'test').
 * Distinct secrets ensure token boundaries are preserved even during local unit testing.
 */
const ISOLATED_TEST_SECRET = 'wj_isolated_unit_test_secret_32_characters_minimum_entropy_ok';
const ISOLATED_TEST_ADMIN_SECRET = 'wj_isolated_admin_test_secret_32_characters_entropy_distinct_ok';

/**
 * Retrieves the cryptographic secret for a given token purpose.
 * Fails closed if missing in production/staging.
 * Strict token separation: Administrator tokens NEVER fall back to JWT_SECRET.
 */
export function getJwtSecret(purpose: TokenPurpose = 'access'): string {
  const isStrict = isProductionOrStaging();

  if (purpose === 'admin') {
    const adminSecret = process.env.JWT_ADMIN_SECRET;
    if (isStrict) {
      validateSecretStrength(adminSecret, 'JWT_ADMIN_SECRET');
      return adminSecret!;
    }
    if (adminSecret) return adminSecret;
    if (process.env.NODE_ENV === 'test') return ISOLATED_TEST_ADMIN_SECRET;
    throw new Error('[FATAL] JWT Configuration Error: Required secret "JWT_ADMIN_SECRET" is missing or unconfigured.');
  }

  // Default: 'access'
  const accessSecret = process.env.JWT_SECRET;
  if (isStrict) {
    validateSecretStrength(accessSecret, 'JWT_SECRET');
    return accessSecret!;
  }
  if (accessSecret) return accessSecret;
  if (process.env.NODE_ENV === 'test') return ISOLATED_TEST_SECRET;
  throw new Error('[FATAL] JWT Configuration Error: Required secret "JWT_SECRET" is missing or unconfigured.');
}

/**
 * Sign standard JWT token using standardized HMAC-SHA256 and centralized secret.
 */
export function signJwtToken(
  payload: BaseTokenPayload,
  options: {
    expiresIn?: string | number;
    purpose?: TokenPurpose;
    subject?: string;
  } = {}
): string {
  const purpose = options.purpose || 'access';
  const secret = getJwtSecret(purpose);

  const tokenPayload: BaseTokenPayload = {
    ...payload,
    tokenType: payload.tokenType || (purpose === 'admin' ? 'admin_access' : 'access'),
    purpose: payload.purpose || purpose,
  };

  const signOptions: jwt.SignOptions = {
    algorithm: 'HS256',
    expiresIn: (options.expiresIn ?? (purpose === 'admin' ? '15m' : '15m')) as any,
  };

  if (options.subject && !payload.sub) {
    signOptions.subject = options.subject;
  }

  return jwt.sign(tokenPayload, secret, signOptions);
}

/**
 * Cryptographically verify an access token.
 * Rejects tokens signed with wrong secrets, unexpected algorithms, expired tokens,
 * or tokens marked as refresh tokens or administrator tokens.
 */
export function verifyAccessToken<T = AccessTokenPayload>(token: string): T {
  if (!token || typeof token !== 'string') {
    const err = new jwt.JsonWebTokenError('Authentication token is required');
    throw err;
  }

  const secret = getJwtSecret('access');

  // Strict algorithm enforcement to prevent algorithm confusion attacks ('none', RSA-HMAC, etc.)
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
  }) as any;

  // Enforce token type boundaries: refresh tokens must never be accepted as access tokens
  if (payload.tokenType === 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid token: refresh token cannot be used as an access token');
  }

  // Enforce boundary separation: administrator tokens must not be treated as member access tokens
  if (payload.tokenType === 'admin_access' || payload.purpose === 'admin') {
    throw new jwt.JsonWebTokenError('Invalid token: administrator token cannot be used as a member access token');
  }

  return payload as T;
}

/**
 * Cryptographically verify an administrator token.
 * Verifies STRICTLY against JWT_ADMIN_SECRET, enforces 'HS256',
 * and verifies that the payload represents an administrator role with admin_access tokenType.
 * Member access tokens (even with injected role: admin) strictly fail signature check and purpose check.
 */
export function verifyAdminToken<T = AdminTokenPayload>(token: string): T {
  if (!token || typeof token !== 'string') {
    const err = new jwt.JsonWebTokenError('Administrator token is required');
    throw err;
  }

  const secret = getJwtSecret('admin');

  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
  }) as any;

  // Enforce token type and role boundaries
  if (payload.tokenType === 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid token: refresh token cannot be used as an administrator token');
  }

  if (payload.tokenType === 'access' || payload.purpose === 'access') {
    throw new jwt.JsonWebTokenError('Access denied: member access token cannot be used as an administrator token');
  }

  if (payload.tokenType !== 'admin_access' && payload.purpose !== 'admin') {
    throw new jwt.JsonWebTokenError('Access denied: token is not an administrator token');
  }

  if (payload.role !== 'admin' && payload.role !== 'superadmin') {
    throw new jwt.JsonWebTokenError('Access denied: token is not an administrator token');
  }

  return payload as T;
}
