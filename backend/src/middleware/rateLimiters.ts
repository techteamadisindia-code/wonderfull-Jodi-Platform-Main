import rateLimit from 'express-rate-limit';

/**
 * Determines whether a given request should bypass the application-wide IP rate limiter.
 * Skips static assets, Next.js internal chunks, image optimization, client RSC navigation
 * pre-fetches on frontend pages, and health checks so normal web browsing does not trigger HTTP 429.
 *
 * STRICT SECURITY INVARIANT:
 * Requests to /api/** must NEVER bypass global rate limiting via ?_rsc=... or query trickery.
 * Static-asset exemptions are narrowly scoped. Dedicated mutation/auth limiters remain active.
 */
export function shouldSkipGlobalRateLimit(req: any): boolean {
  const p = req.path || '';

  // Health checks
  if (p === '/api/health' || p === '/health') return true;

  // Static uploaded documents and images (strictly under /uploads/)
  if (p.startsWith('/uploads/')) return true;

  // Next.js internal static assets, chunks, and image optimization
  if (p.startsWith('/_next/')) return true;

  // Static public assets and favicon
  if (p.startsWith('/images/') || p === '/favicon.ico') return true;

  // Next.js App Router client-side RSC navigation prefetch queries (?_rsc=...)
  // STRICT AUDIT REQUIREMENT: Never allow /api/** requests to bypass rate limiting via ?_rsc=...
  if (!p.startsWith('/api') && req.query && (req.query as any)._rsc !== undefined) {
    return true;
  }

  return false;
}

export const globalLimiter = rateLimit({
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

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 15 : 100, // 15 attempts in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. For your security, please try again in 15 minutes.',
  },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 6 : 50, // 6 attempts in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
});

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 attempts per IP in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin login attempts from this IP. Please try again in 15 minutes.',
  },
});

export const adminResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 3 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload attempts. Please try again later.',
  },
});

export const kundaliLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 60 : 1000, // 60 match calculations per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many Kundali match requests from this IP. Please try again in 15 minutes.',
  },
});

