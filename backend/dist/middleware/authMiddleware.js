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
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireAdminAuth = requireAdminAuth;
exports.requireSuperAdmin = requireSuperAdmin;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function requireAuth(req, res, next) {
    // 1. Check Bearer Authorization Header
    const authHeader = req.headers?.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    // 2. Fallback to HttpOnly cookie (admin_access_token or access_token)
    if (!token && req.cookies) {
        token = req.cookies.admin_access_token || req.cookies.access_token;
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    try {
        const secret = process.env.JWT_SECRET ?? 'supersecret_wonderfuljodi_dev_key_2026';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = payload;
        // Check account status if userId exists to prevent deactivated/deleted users from accessing routes
        if (payload.userId) {
            try {
                const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
                const userDoc = await User.findById(payload.userId);
                if (userDoc) {
                    if (userDoc.isDeleted ||
                        userDoc.isActive === false ||
                        userDoc.status === 'Deleted' ||
                        userDoc.status === 'Suspended' ||
                        userDoc.status === 'Blocked') {
                        return res.status(401).json({
                            success: false,
                            code: 'ACCOUNT_DEACTIVATED',
                            message: 'Your account is deactivated, suspended, or deleted. Access denied.',
                        });
                    }
                }
            }
            catch (err) {
                // Fallback gracefully if database lookup is unavailable in lightweight testing
            }
        }
        // Track daily unique user visits for regular authenticated members
        if (payload.userId && payload.role !== 'admin') {
            Promise.resolve().then(() => __importStar(require('../services/visitTrackingService'))).then(({ recordUserVisit }) => {
                recordUserVisit(payload.userId, req).catch(() => { });
            })
                .catch(() => { });
        }
        next();
    }
    catch (error) {
        if (error?.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                code: 'TOKEN_EXPIRED',
                message: 'Your session has expired. Please sign in again.',
            });
        }
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
    }
}
function requireRole(role) {
    return async (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
        }
        // Enforce active administrator account verification
        if (role === 'admin' && req.user.userId) {
            try {
                const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
                const adminUser = await User.findById(req.user.userId);
                if (adminUser && (adminUser.isDeleted || adminUser.isActive === false || adminUser.status === 'Deleted')) {
                    return res.status(403).json({
                        success: false,
                        code: 'ADMIN_DEACTIVATED',
                        message: 'Administrator account is deactivated or deleted.',
                    });
                }
            }
            catch (err) {
                // Fallback
            }
        }
        next();
    };
}
function requireAdminAuth(req, res, next) {
    requireAuth(req, res, () => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Administrator privileges required.',
            });
        }
        next();
    });
}
/**
 * Super Administrator Authorization Middleware
 * Strictly enforces that caller has authenticated role === 'admin'
 * AND a verified record in the 'admins' table with permissions containing 'all'.
 * Fails closed on missing permissions, deactivated status, or database errors.
 */
function requireSuperAdmin(req, res, next) {
    requireAdminAuth(req, res, async () => {
        const callerId = req.user?.userId || req.user?._id || req.user?.id;
        if (!callerId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Super Administrator privileges required.',
            });
        }
        try {
            const { Admin } = await Promise.resolve().then(() => __importStar(require('../models/Admin')));
            const adminRecord = await Admin.findOne({ user: callerId });
            let permissions = [];
            if (Array.isArray(adminRecord?.permissions)) {
                permissions = adminRecord.permissions;
            }
            else if (typeof adminRecord?.permissions === 'string') {
                try {
                    permissions = JSON.parse(adminRecord.permissions);
                }
                catch {
                    permissions = [];
                }
            }
            if (!permissions.includes('all')) {
                return res.status(403).json({
                    success: false,
                    code: 'SUPER_ADMIN_REQUIRED',
                    message: 'Access denied: Super Administrator privileges required.',
                });
            }
            next();
        }
        catch (err) {
            console.error('[AuthMiddleware] Super Admin verification error:', err?.message || err);
            return res.status(500).json({
                success: false,
                message: 'Security authorization check failed. Access denied.',
            });
        }
    });
}
/**
 * Optional Authentication Middleware
 * Attaches user identity if token is present and valid, but does not block guests
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token && req.cookies) {
        token = req.cookies.admin_access_token || req.cookies.access_token;
    }
    if (!token) {
        return next();
    }
    try {
        const secret = process.env.JWT_SECRET ?? 'supersecret_wonderfuljodi_dev_key_2026';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = payload;
    }
    catch {
        // Graceful fallback for invalid/expired tokens in optional context
    }
    next();
}
//# sourceMappingURL=authMiddleware.js.map