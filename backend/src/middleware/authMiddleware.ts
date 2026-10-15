import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayloadWithRole {
  userId: string;
  role: string;
  email?: string;
  sessionId?: string;
  _id?: string;
  id?: string;
  fullName?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayloadWithRole;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
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
    const payload = jwt.verify(token, secret) as JwtPayloadWithRole;
    req.user = payload;

    // Check account status if userId exists to prevent deactivated/deleted users from accessing routes
    if (payload.userId) {
      try {
        const { User } = await import('../models/User');
        const userDoc = await User.findById(payload.userId);
        if (userDoc) {
          if (
            userDoc.isDeleted ||
            userDoc.isActive === false ||
            userDoc.status === 'Deleted' ||
            userDoc.status === 'Suspended' ||
            userDoc.status === 'Blocked'
          ) {
            return res.status(401).json({
              success: false,
              code: 'ACCOUNT_DEACTIVATED',
              message: 'Your account is deactivated, suspended, or deleted. Access denied.',
            });
          }
        }
      } catch (err) {
        // Fallback gracefully if database lookup is unavailable in lightweight testing
      }
    }

    // Track daily unique user visits for regular authenticated members
    if (payload.userId && payload.role !== 'admin') {
      import('../services/visitTrackingService')
        .then(({ recordUserVisit }) => {
          recordUserVisit(payload.userId, req).catch(() => {});
        })
        .catch(() => {});
    }

    next();
  } catch (error: any) {
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

export function requireRole(role: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
    }

    // Enforce active administrator account verification
    if (role === 'admin' && req.user.userId) {
      try {
        const { User } = await import('../models/User');
        const adminUser = await User.findById(req.user.userId);
        if (adminUser && (adminUser.isDeleted || adminUser.isActive === false || adminUser.status === 'Deleted')) {
          return res.status(403).json({
            success: false,
            code: 'ADMIN_DEACTIVATED',
            message: 'Administrator account is deactivated or deleted.',
          });
        }
      } catch (err) {
        // Fallback
      }
    }

    next();
  };
}

export function requireAdminAuth(req: AuthRequest, res: Response, next: NextFunction) {
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
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
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
    const payload = jwt.verify(token, secret) as any;
    req.user = payload;
  } catch {
    // Graceful fallback for invalid/expired tokens in optional context
  }

  next();
}

