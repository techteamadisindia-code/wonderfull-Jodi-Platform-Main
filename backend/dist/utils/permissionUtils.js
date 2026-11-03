"use strict";
/**
 * Administrator Permission Utilities
 * Provides strict, authoritative normalization and evaluation of administrator permissions.
 * Matches Prisma schema and Mongoose model expectations.
 * Fails closed on malformed, unexpected, or missing data.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_ADMIN_PERMISSIONS = exports.PRIMARY_SUPER_ADMIN_EMAIL = void 0;
exports.isPrimarySuperAdminEmail = isPrimarySuperAdminEmail;
exports.normalizeAdminPermissions = normalizeAdminPermissions;
exports.hasSuperAdminPermission = hasSuperAdminPermission;
exports.getSafeJwtSecret = getSafeJwtSecret;
exports.getJwtSecret = getJwtSecret;
exports.verifyPrimarySuperAdminInDatabase = verifyPrimarySuperAdminInDatabase;
/**
 * The permanent protected Primary Super Admin identity.
 * Immutable and protected against deletion, demotion, deactivation, or permission revocation.
 */
exports.PRIMARY_SUPER_ADMIN_EMAIL = 'shubhamchaudante@gmail.com';
/**
 * Case-insensitively checks if an email matches the protected Primary Super Admin identity.
 * Trims leading/trailing whitespace and fails closed on empty or invalid inputs.
 */
function isPrimarySuperAdminEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    return email.trim().toLowerCase() === exports.PRIMARY_SUPER_ADMIN_EMAIL;
}
/**
 * Authoritative set of permissible administrator module keys.
 */
exports.ALLOWED_ADMIN_PERMISSIONS = [
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
];
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
function normalizeAdminPermissions(raw) {
    if (raw === null || raw === undefined) {
        return [];
    }
    let candidates = raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
            return [];
        }
        // Must be a valid JSON-encoded array
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                candidates = JSON.parse(trimmed);
            }
            catch {
                // Malformed JSON: fail closed
                return [];
            }
        }
        else {
            // Unsupported format (e.g. raw text, comma-separated string): fail closed
            return [];
        }
    }
    if (!Array.isArray(candidates)) {
        return [];
    }
    const normalized = [];
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
function hasSuperAdminPermission(permissions) {
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
function getSafeJwtSecret() {
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
function getJwtSecret() {
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
async function verifyPrimarySuperAdminInDatabase(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        return false;
    }
    try {
        const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
        const userDoc = await User.findById(userId.trim());
        if (!userDoc) {
            return false;
        }
        if (userDoc.isDeleted ||
            userDoc.isActive === false ||
            userDoc.status === 'Deleted' ||
            userDoc.status === 'Suspended' ||
            userDoc.status === 'Blocked' ||
            userDoc.isBlocked) {
            return false;
        }
        if (!isPrimarySuperAdminEmail(userDoc.email)) {
            return false;
        }
        if (userDoc.role !== 'admin') {
            return false;
        }
        const { Admin } = await Promise.resolve().then(() => __importStar(require('../models/Admin')));
        const adminDoc = await Admin.findOne({ user: userDoc._id || userDoc.id });
        if (!adminDoc || !hasSuperAdminPermission(adminDoc.permissions)) {
            return false;
        }
        return true;
    }
    catch (error) {
        console.error('[Security] Failed to verify Primary Super Admin in database:', error);
        return false;
    }
}
//# sourceMappingURL=permissionUtils.js.map