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
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireAuth(req, res, next) {
    // 1. Check Bearer Authorization Header
    const authHeader = req.headers.authorization;
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
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
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