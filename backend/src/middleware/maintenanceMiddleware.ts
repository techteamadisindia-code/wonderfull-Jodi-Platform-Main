import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Setting } from '../models/Setting';
import { isPrimarySuperAdminEmail, verifyPrimarySuperAdminInDatabase, getSafeJwtSecret } from '../utils/permissionUtils';

export interface MaintenanceStatusData {
  enabled: boolean;
  banner: boolean;
  title: string;
  message: string;
  estimatedEndTime: string | null;
  allowAdminAccess: boolean;
  allowNewRegistrations: boolean;
}

interface CachedConfig {
  data: MaintenanceStatusData;
  timestamp: number;
}

// In-memory cache with 10-second TTL to avoid hitting database on every API request
let cachedConfig: CachedConfig | null = null;
const CACHE_TTL_MS = 10000;

export async function getCachedMaintenanceConfig(): Promise<MaintenanceStatusData> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.timestamp < CACHE_TTL_MS) {
    return cachedConfig.data;
  }

  try {
    const setting = (await Setting.findOne().lean()) as any;
    const data: MaintenanceStatusData = {
      enabled: Boolean(setting?.maintenanceMode),
      banner: Boolean(setting?.maintenanceBanner),
      title: setting?.maintenanceTitle || "We'll Be Back Soon",
      message:
        setting?.maintenanceMessage ||
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
  } catch (error) {
    console.error('[MaintenanceMiddleware] Failed to read maintenance config from database:', error);
    // Safe fallback: maintenance disabled
    return (
      cachedConfig?.data || {
        enabled: false,
        banner: false,
        title: "We'll Be Back Soon",
        message:
          'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
        estimatedEndTime: null,
        allowAdminAccess: true,
        allowNewRegistrations: true,
      }
    );
  }
}

export function invalidateMaintenanceCache(): void {
  cachedConfig = null;
}

/**
 * Extracts and strictly verifies bearer or cookie auth token.
 * Fails closed in production if JWT_SECRET is unset or invalid.
 */
function extractAndVerifyToken(req: Request): { userId?: string; role?: string; email?: string } | null {
  const authHeader = req.headers?.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && req.cookies) {
    token = req.cookies.admin_access_token || req.cookies.access_token;
  }

  if (!token) {
    return null;
  }

  try {
    const secret = getSafeJwtSecret();
    if (!secret) {
      return null;
    }
    return jwt.verify(token, secret) as any;
  } catch {
    return null;
  }
}

/**
 * Express middleware to enforce platform-level maintenance mode on API requests.
 */
export async function checkMaintenanceMode(req: Request, res: Response, next: NextFunction) {
  let rawPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path || '';
  if (!rawPath.startsWith('/api') && req.baseUrl === '/api') {
    rawPath = '/api' + rawPath;
  }
  const path = rawPath.toLowerCase();

  // Non-API routes (e.g. document/page requests or Next.js SSR/assets) bypass API maintenance block
  if (!path.startsWith('/api') && path !== '/health') {
    return next();
  }

  // 1. Always allowed health, status, and static assets
  if (
    path === '/health' ||
    path === '/api/health' ||
    path === '/api/config/maintenance' ||
    path === '/config/maintenance' ||
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.startsWith('/images') ||
    path === '/favicon.ico'
  ) {
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
      const { User } = await import('../models/User');
      const adminUser = await User.findById(payload.userId);
      if (
        adminUser &&
        adminUser.role === 'admin' &&
        !adminUser.isDeleted &&
        adminUser.isActive !== false &&
        adminUser.status !== 'Deleted' &&
        adminUser.status !== 'Suspended' &&
        adminUser.status !== 'Blocked' &&
        !adminUser.isBlocked
      ) {
        isCallerActiveAdmin = true;
      }
    } catch (err) {
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
    const isPrimary = await verifyPrimarySuperAdminInDatabase(payload.userId);
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
export async function checkRegistrationEnabled(req: Request, res: Response, next: NextFunction) {
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
  } catch (error) {
    next(error);
  }
}
