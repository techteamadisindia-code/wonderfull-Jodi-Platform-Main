"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedMaintenanceConfig = getCachedMaintenanceConfig;
exports.invalidateMaintenanceCache = invalidateMaintenanceCache;
exports.checkMaintenanceMode = checkMaintenanceMode;
const jwtConfig_1 = require("../config/jwtConfig");
const Setting_1 = require("../models/Setting");
// In-memory cache with 10-second TTL to avoid hitting MongoDB on every API request
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
        };
        cachedConfig = {
            data,
            timestamp: now,
        };
        return data;
    }
    catch (error) {
        console.error('Failed to read maintenance config from database:', error);
        // Safe fallback: maintenance disabled
        return (cachedConfig?.data || {
            enabled: false,
            banner: false,
            title: "We'll Be Back Soon",
            message: 'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
            estimatedEndTime: null,
            allowAdminAccess: true,
        });
    }
}
function invalidateMaintenanceCache() {
    cachedConfig = null;
}
/**
 * Express middleware to enforce platform-level maintenance mode on API requests.
 */
async function checkMaintenanceMode(req, res, next) {
    const path = req.path || req.url;
    // Always allow health checks, public maintenance config, and admin routes
    if (path === '/health' ||
        path === '/api/health' ||
        path === '/api/config/maintenance' ||
        path.startsWith('/api/admin')) {
        return next();
    }
    const config = await getCachedMaintenanceConfig();
    // If maintenance mode is not enabled, continue normally
    if (!config.enabled) {
        return next();
    }
    // Check if request is from an authenticated Administrator
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token && req.cookies) {
        token = req.cookies.admin_access_token || req.cookies.access_token;
    }
    if (token && config.allowAdminAccess) {
        try {
            const payload = (0, jwtConfig_1.verifyAdminToken)(token);
            if (payload && payload.role === 'admin') {
                return next();
            }
        }
        catch {
            // Invalid, expired, or non-administrator token - proceed to maintenance block
        }
    }
    // Allow admin login attempts during maintenance
    if (path === '/api/auth/login' && req.body?.emailOrMobile) {
        // We let the login route process, and if not admin, authController or middleware will enforce
        return next();
    }
    // Block normal users and public visitors with HTTP 503
    return res.status(503).json({
        success: false,
        maintenance: true,
        title: config.title,
        message: config.message,
        estimatedEndTime: config.estimatedEndTime,
    });
}
//# sourceMappingURL=maintenanceMiddleware.js.map