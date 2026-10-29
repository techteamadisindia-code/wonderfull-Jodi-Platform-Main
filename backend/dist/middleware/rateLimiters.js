"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kundaliLimiter = exports.uploadLimiter = exports.adminResetLimiter = exports.adminLoginLimiter = exports.passwordResetLimiter = exports.authLimiter = exports.globalLimiter = void 0;
exports.shouldSkipGlobalRateLimit = shouldSkipGlobalRateLimit;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Determines whether a given request should bypass the application-wide IP rate limiter.
 * Skips static assets, Next.js internal chunks, image optimization, client RSC navigation
 * pre-fetches on frontend pages, and health checks so normal web browsing does not trigger HTTP 429.
 *
 * STRICT SECURITY INVARIANT:
 * Requests to /api/** must NEVER bypass global rate limiting via ?_rsc=... or query trickery.
 * Static-asset exemptions are narrowly scoped. Dedicated mutation/auth limiters remain active.
 */
function shouldSkipGlobalRateLimit(req) {
    const p = req.path || '';
    // Health checks
    if (p === '/api/health' || p === '/health')
        return true;
    // Static uploaded documents and images (strictly under /uploads/)
    if (p.startsWith('/uploads/'))
        return true;
    // Next.js internal static assets, chunks, and image optimization
    if (p.startsWith('/_next/'))
        return true;
    // Static public assets and favicon
    if (p.startsWith('/images/') || p === '/favicon.ico')
        return true;
    // Next.js App Router client-side RSC navigation prefetch queries (?_rsc=...)
    // STRICT AUDIT REQUIREMENT: Never allow /api/** requests to bypass rate limiting via ?_rsc=...
    if (!p.startsWith('/api') && req.query && req.query._rsc !== undefined) {
        return true;
    }
    return false;
}
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 3000 : 10000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkipGlobalRateLimit,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
    },
});
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 15 : 100, // 15 attempts in production
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. For your security, please try again in 15 minutes.',
    },
});
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 6 : 50, // 6 attempts in production
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many password reset requests. Please try again in 15 minutes.',
    },
});
exports.adminLoginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 attempts per IP in production
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many admin login attempts from this IP. Please try again in 15 minutes.',
    },
});
exports.adminResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 3 : 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many password reset requests. Please try again in 15 minutes.',
    },
});
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 30 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many upload attempts. Please try again later.',
    },
});
exports.kundaliLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 60 : 1000, // 60 match calculations per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many Kundali match requests from this IP. Please try again in 15 minutes.',
    },
});
//# sourceMappingURL=rateLimiters.js.map