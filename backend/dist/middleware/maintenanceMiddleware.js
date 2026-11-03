"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedMaintenanceConfig = getCachedMaintenanceConfig;
exports.invalidateMaintenanceCache = invalidateMaintenanceCache;
exports.checkMaintenanceMode = checkMaintenanceMode;
exports.checkRegistrationEnabled = checkRegistrationEnabled;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Setting_1 = require("../models/Setting");
const permissionUtils_1 = require("../utils/permissionUtils");
// In-memory cache with 10-second TTL to avoid hitting database on every API request
let cachedConfig = null;
const CACHE_TTL_MS = 10000;
async function getCachedMaintenanceConfig() {
    const now = Date.now();
    if (cachedConfig && now - cachedConfig.timestamp < CACHE_TTL_MS) {
        return cachedConfig.data;
    }
    try {
        const setting = (await Setting_1.Setting.findOne().lean());
        const data = {
            enabled: Boolean(setting?.maintenanceMode),
            banner: Boolean(setting?.maintenanceBanner),
            title: setting?.maintenanceTitle || "We'll Be Back Soon",
            message: setting?.maintenanceMessage ||
                'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
            estimatedEndTime: setting?.maintenanceEstimatedEndTime
                ? new Date(setting.maintenanceEstimatedEndTime).toISOString()
                : null,
            allowAdminAccess: setting?.allowAdminAccess !== false,
            allowNewRegistrations: setting?.allowNewRegistrations !== false,
        };
        cachedConfig = {
            data,
            timestamp: now,
        };
        return data;
    }
    catch (error) {
        console.error('[MaintenanceMiddleware] Failed to read maintenance config from database:', error);
        // Safe fallback: maintenance disabled
        return (cachedConfig?.data || {
            enabled: false,
            banner: false,
            title: "We'll Be Back Soon",
            message: 'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
            estimatedEndTime: null,
            allowAdminAccess: true,
            allowNewRegistrations: true,
        });
    }
}
function invalidateMaintenanceCache() {
    cachedConfig = null;
}
/**
 * Extracts and strictly verifies bearer or cookie auth token.
 * Fails closed in production if JWT_SECRET is unset or invalid.
 */
function extractAndVerifyToken(req) {
    const authHeader = req.headers?.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token && req.cookies) {
        token = req.cookies.admin_access_token || req.cookies.access_token;
    }
    if (!token) {
        return null;
    }
    try {
        const secret = (0, permissionUtils_1.getSafeJwtSecret)();
        if (!secret) {
            return null;
        }
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch {
        return null;
    }
}
/**
 * Express middleware to enforce platform-level maintenance mode on API requests.
 */
async function checkMaintenanceMode(req, res, next) {
    const rawPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path || '';
    const path = rawPath.toLowerCase();
    // 1. Always allowed health, status, and static assets
    if (path === '/health' ||
        path === '/api/health' ||
        path === '/api/config/maintenance' ||
        path === '/config/maintenance' ||
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.startsWith('/images') ||
        path === '/favicon.ico') {
        return next();
    }
    const config = await getCachedMaintenanceConfig();
    // 2. If maintenance mode is not enabled, continue normally
    if (!config.enabled) {
        return next();
    }
    // 3. Admin routes handling
    if (path.startsWith('/api/admin')) {
        // 3a. Public admin authentication and recovery endpoints are ALWAYS permitted
        const PUBLIC_ADMIN_AUTH_PATHS = [
            '/api/admin/auth/login',
            '/api/admin/auth/forgot-password',
            '/api/admin/auth/validate-reset-token',
            '/api/admin/auth/reset-password',
        ];
        if (PUBLIC_ADMIN_AUTH_PATHS.includes(path)) {
            return next();
        }
        // 3b. Authenticated admin APIs (including /api/admin/auth/me, /sessions, etc.) require verified admin token
        const payload = extractAndVerifyToken(req);
        if (!payload || payload.role !== 'admin' || !payload.userId) {
            return res.status(503).json({
                success: false,
                maintenance: true,
                title: config.title,
                message: config.message,
                estimatedEndTime: config.estimatedEndTime,
            });
        }
        // 3c. Confirm administrator account exists in database and is active
        let isCallerActiveAdmin = false;
        try {
            const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
            const adminUser = await User.findById(payload.userId);
            if (adminUser &&
                adminUser.role === 'admin' &&
                !adminUser.isDeleted &&
                adminUser.isActive !== false &&
                adminUser.status !== 'Deleted' &&
                adminUser.status !== 'Suspended' &&
                adminUser.status !== 'Blocked' &&
                !adminUser.isBlocked) {
                isCallerActiveAdmin = true;
            }
        }
        catch (err) {
            console.error('[MaintenanceMiddleware] Error verifying admin account in database:', err);
        }
        if (!isCallerActiveAdmin) {
            return res.status(503).json({
                success: false,
                maintenance: true,
                title: config.title,
                message: config.message,
                estimatedEndTime: config.estimatedEndTime,
            });
        }
        // 3d. When allowAdminAccess is TRUE: Allow all authenticated, active administrators
        if (config.allowAdminAccess) {
            return next();
        }
        // 3e. When allowAdminAccess is FALSE: Restrict ordinary admins; preserve Primary Super Admin emergency access
        const isPrimary = await (0, permissionUtils_1.verifyPrimarySuperAdminInDatabase)(payload.userId);
        if (isPrimary) {
            return next();
        }
        // Ordinary administrators are denied access with HTTP 503
        return res.status(503).json({
            success: false,
            maintenance: true,
            code: 'ADMIN_ACCESS_RESTRICTED',
            title: config.title,
            message: 'Platform maintenance is active and administrator access is currently restricted.',
            estimatedEndTime: config.estimatedEndTime,
        });
    }
    // 4. All other public API routes (including regular user login /api/auth/login) return HTTP 503
    return res.status(503).json({
        success: false,
        maintenance: true,
        title: config.title,
        message: config.message,
        estimatedEndTime: config.estimatedEndTime,
    });
}
/**
 * Express middleware to enforce candidate registration availability.
 * Rejects new registration submissions when allowNewRegistrations is false.
 */
async function checkRegistrationEnabled(req, res, next) {
    try {
        const config = await getCachedMaintenanceConfig();
        if (!config.allowNewRegistrations) {
            return res.status(403).json({
                success: false,
                code: 'REGISTRATIONS_PAUSED',
                message: 'New candidate registrations are temporarily paused. Please check back shortly or contact support.',
            });
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=maintenanceMiddleware.js.map