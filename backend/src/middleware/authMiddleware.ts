import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayloadWithRole {
  userId: string;
  role: string;
<<<<<<< HEAD
  email?: string;
  sessionId?: string;
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
}

export interface AuthRequest extends Request {
  user?: JwtPayloadWithRole;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
<<<<<<< HEAD
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
=======
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const secret = process.env.JWT_SECRET ?? 'secret';
    const payload = jwt.verify(token, secret) as JwtPayloadWithRole;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
<<<<<<< HEAD
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
=======
      return res.status(403).json({ success: false, message: 'Forbidden' });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    }
    next();
  };
}
<<<<<<< HEAD

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

=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
