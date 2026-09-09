import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { Admin } from '../models/Admin';
import { RefreshToken } from '../models/RefreshToken';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { AuditLog } from '../models/AuditLog';
import { SecurityLog } from '../models/SecurityLog';
import { sendPasswordResetEmail } from '../services/emailService';
import {
  generateRandomToken,
  hashToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  recordSecurityEvent,
} from '../utils/securityUtils';
import { AuthRequest } from '../middleware/authMiddleware';

// Dummy hash to perform constant-time verification when user or admin does not exist
// This prevents timing-based email enumeration attacks.
const DUMMY_HASH = '$2b$12$e8Yk2wQ6r0g2c.yK6O5yNu9q7JpT7wH6tV1zN2l3x4y5z6a7b8c9d';

const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+={}[\]:;"'<>,.~`|\\]).{12,}$/;

const adminLoginSchema = z.object({
  email: z
    .string({ required_error: 'Admin email is required' })
    .trim()
    .min(1, 'Please enter your admin email')
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Please enter your password'),
});

const adminForgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Admin email is required' })
    .trim()
    .min(1, 'Please enter your admin email')
    .email('Please enter a valid email address'),
});

const adminResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters long')
      .regex(
        strongPasswordRegex,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const adminChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(12, 'New password must be at least 12 characters long')
      .regex(
        strongPasswordRegex,
        'New password must contain uppercase, lowercase, number, and special character'
      ),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

function signAdminAccessToken(userId: string, role: string, email: string, sessionId?: string): string {
  const secret = process.env.JWT_SECRET ?? 'supersecret_wonderfuljodi_dev_key_2026';
  // Admin access token has 15 minute lifetime
  return jwt.sign(
    {
      userId,
      role,
      email,
      sessionId,
      sub: userId,
    },
    secret,
    { expiresIn: '15m' }
  );
}

function setAdminCookies(res: Response, accessToken: string, refreshToken: string) {
  const accessOpts = getAccessTokenCookieOptions();
  const refreshOpts = getRefreshTokenCookieOptions();

  res.cookie('admin_access_token', accessToken, accessOpts);
  res.cookie('admin_refresh_token', refreshToken, refreshOpts);

  // Also set standard access_token for seamless compatibility with shared API middleware
  res.cookie('access_token', accessToken, accessOpts);
}

function clearAdminCookies(res: Response) {
  const accessOpts = { ...getAccessTokenCookieOptions(), maxAge: 0 };
  const refreshOpts = { ...getRefreshTokenCookieOptions(), maxAge: 0 };

  res.clearCookie('admin_access_token', accessOpts);
  res.clearCookie('admin_refresh_token', refreshOpts);
  res.clearCookie('access_token', accessOpts);
}

/**
 * Record an entry in the AuditLog collection
 */
async function recordAdminAudit(
  adminEmail: string,
  action: string,
  req: Request,
  details?: string,
  status: 'SUCCESS' | 'FAILED' | 'WARNING' = 'SUCCESS',
  adminUserId?: any
) {
  try {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    await AuditLog.create({
      adminUser: adminUserId,
      adminEmail,
      action,
      details,
      ipAddress,
      status,
    });
  } catch (err) {
    console.error('Failed to record AuditLog:', err);
  }
}

/**
 * 1. Admin Login (POST /api/admin/auth/login)
 */
export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid input';
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Query database for admin user
    const user = await User.findOne({ email: normalizedEmail });

    const isUserAdmin = user && user.role === 'admin';
    const passwordToCompare = isUserAdmin ? user.password : DUMMY_HASH;

    // Constant-time password comparison to prevent timing enumeration
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

    if (!user || !isUserAdmin || !isPasswordValid) {
      // Record failed audit and security logs
      await recordAdminAudit(
        normalizedEmail,
        'ADMIN_LOGIN_FAILED',
        req,
        'Invalid administrator credentials or unauthorized role',
        'FAILED',
        user?._id
      );

      await recordSecurityEvent('LOGIN_FAILED', {
        identifier: normalizedEmail,
        status: 'FAILURE',
        req,
        details: { context: 'admin_login', reason: 'invalid_credentials' },
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      await recordAdminAudit(
        normalizedEmail,
        'ADMIN_LOGIN_FAILED',
        req,
        'Account is inactive/suspended',
        'FAILED',
        user._id
      );

      return res.status(403).json({
        success: false,
        message: 'Your administrator account is currently inactive. Please contact system management.',
      });
    }

    // Issue unique session & refresh token
    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const sessionId = generateRandomToken(16);
    const sessionFamily = generateRandomToken(16);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await RefreshToken.create({
      user: user._id,
      tokenHash,
      family: sessionFamily,
      isUsed: false,
      isRevoked: false,
      expiresAt,
      ipAddress,
      userAgent,
    });

    const accessToken = signAdminAccessToken(user._id.toString(), user.role, user.email, sessionId);

    // Set secure HTTP-only cookies
    setAdminCookies(res, accessToken, rawRefreshToken);

    // Fetch extra permissions if Admin model record exists
    const adminRecord = await Admin.findOne({ user: user._id });

    // Record success audit & security log
    await recordAdminAudit(
      user.email,
      'ADMIN_LOGIN_SUCCESS',
      req,
      `Admin logged in successfully via ${userAgent.slice(0, 100)}`,
      'SUCCESS',
      user._id
    );

    await recordSecurityEvent('LOGIN_SUCCESS', {
      user,
      identifier: user.email,
      req,
      details: { context: 'admin_login' },
    });

    const adminUserData = {
      _id: user._id,
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      permissions: adminRecord?.permissions || ['all'],
      isActive: user.isActive,
    };

    return res.json({
      success: true,
      message: 'Admin authentication successful',
      token: accessToken,
      user: adminUserData,
      data: {
        token: accessToken,
        user: adminUserData,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Get Current Authenticated Admin (GET /api/admin/auth/me)
 */
export async function getAdminMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin privileges required' });
    }

    if (!user.isActive) {
      clearAdminCookies(res);
      return res.status(403).json({ success: false, message: 'Admin account is inactive' });
    }

    const adminRecord = await Admin.findOne({ user: user._id });

    return res.json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        permissions: adminRecord?.permissions || ['all'],
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Admin Logout (POST /api/admin/auth/logout)
 */
export async function adminLogout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rawRefreshToken =
      req.cookies?.admin_refresh_token || req.cookies?.refresh_token || req.body?.refreshToken;

    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true, isUsed: true });
    }

    const adminEmail = req.user?.email || 'unknown_admin';
    if (req.user?.userId) {
      await recordAdminAudit(
        adminEmail,
        'ADMIN_LOGOUT',
        req,
        'Administrator signed out of session',
        'SUCCESS',
        req.user.userId
      );
    }

    clearAdminCookies(res);

    return res.json({
      success: true,
      message: 'Admin session terminated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Admin Forgot Password (POST /api/admin/auth/forgot-password)
 */
export async function adminForgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = adminForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Please enter a valid admin email address';
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail, role: 'admin' });

    if (user && user.isActive) {
      // Invalidate existing unused reset tokens for this admin
      await PasswordResetToken.updateMany(
        { user: user._id, isUsed: false },
        { isUsed: true, usedAt: new Date() }
      );

      // Generate secure 32-byte token
      const rawToken = generateRandomToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes expiration

      await PasswordResetToken.create({
        user: user._id,
        tokenHash,
        expiresAt,
        isUsed: false,
      });

      const clientOrigin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';
      const frontendBaseUrl = clientOrigin.replace(/\/$/, '');
      const resetUrl = `${frontendBaseUrl}/admin/reset-password?token=${rawToken}`;

      await recordAdminAudit(
        user.email,
        'ADMIN_PASSWORD_RESET_REQUESTED',
        req,
        'Password reset link dispatched',
        'SUCCESS',
        user._id
      );

      try {
        await sendPasswordResetEmail(user.email, user.fullName, resetUrl);
      } catch (mailErr) {
        console.error('Failed to send admin reset email:', mailErr);
      }
    }

    // Always return generic response to prevent account enumeration
    return res.json({
      success: true,
      message: 'If an administrative account exists with this email address, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Validate Reset Token (GET/POST /api/admin/auth/validate-reset-token)
 */
export async function adminValidateResetToken(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = (req.query.token as string) || req.body?.token;

    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
      return res.status(400).json({ success: false, message: 'This reset link is invalid.' });
    }

    const tokenHash = hashToken(rawToken.trim());
    const tokenDoc = await PasswordResetToken.findOne({ tokenHash });

    if (!tokenDoc || tokenDoc.isUsed || tokenDoc.usedAt) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has already been used.',
      });
    }

    if (new Date() > tokenDoc.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has expired. Please request a new one.',
      });
    }

    return res.json({
      success: true,
      message: 'Token is valid.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. Admin Reset Password (POST /api/admin/auth/reset-password)
 */
export async function adminResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = adminResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid password reset input';
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token.trim());

    const tokenDoc = await PasswordResetToken.findOne({ tokenHash });

    if (!tokenDoc || tokenDoc.isUsed || tokenDoc.usedAt) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has already been used.',
      });
    }

    if (new Date() > tokenDoc.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This reset link has expired. Please request a new one.',
      });
    }

    const user = await User.findById(tokenDoc.user);
    if (!user || user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Administrator account not found.' });
    }

    // Hash password with bcrypt cost 12
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    await user.save();

    // Mark token as used
    tokenDoc.isUsed = true;
    tokenDoc.usedAt = new Date();
    await tokenDoc.save();

    // Invalidate all other reset tokens for this user
    await PasswordResetToken.updateMany(
      { user: user._id, isUsed: false },
      { isUsed: true, usedAt: new Date() }
    );

    // Invalidate all active sessions / refresh tokens
    await RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });
    clearAdminCookies(res);

    await recordAdminAudit(
      user.email,
      'ADMIN_PASSWORD_RESET_COMPLETED',
      req,
      'Admin password reset successfully and old sessions revoked',
      'SUCCESS',
      user._id
    );

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Admin Change Password (POST /api/admin/auth/change-password)
 */
export async function adminChangePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const parsed = adminChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid password inputs';
      return res.status(400).json({ success: false, message: errorMsg });
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await User.findById(userId);

    if (!user || user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      await recordAdminAudit(
        user.email,
        'ADMIN_PASSWORD_CHANGED',
        req,
        'Failed password change: current password incorrect',
        'FAILED',
        user._id
      );
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    user.password = newHash;
    await user.save();

    // Revoke other sessions
    await RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });

    // Issue fresh access & refresh tokens for the current session
    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const sessionId = generateRandomToken(16);
    const sessionFamily = generateRandomToken(16);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await RefreshToken.create({
      user: user._id,
      tokenHash,
      family: sessionFamily,
      isUsed: false,
      isRevoked: false,
      expiresAt,
      ipAddress,
      userAgent,
    });

    const newAccessToken = signAdminAccessToken(user._id.toString(), user.role, user.email, sessionId);
    setAdminCookies(res, newAccessToken, rawRefreshToken);

    await recordAdminAudit(
      user.email,
      'ADMIN_PASSWORD_CHANGED',
      req,
      'Password changed successfully and other sessions revoked',
      'SUCCESS',
      user._id
    );

    return res.json({
      success: true,
      message: 'Password changed successfully',
      token: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. Get Active Admin Sessions (GET /api/admin/auth/sessions)
 */
export async function getAdminSessions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const currentToken = req.cookies?.admin_refresh_token || req.cookies?.refresh_token;
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;

    const sessions = await RefreshToken.find({
      user: userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedSessions = sessions.map((s) => ({
      _id: s._id,
      id: s._id,
      ipAddress: s.ipAddress ? s.ipAddress.replace(/::ffff:/, '') : '127.0.0.1',
      userAgent: s.userAgent || 'Web Browser',
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: currentTokenHash ? s.tokenHash === currentTokenHash : false,
    }));

    return res.json({
      success: true,
      data: formattedSessions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 9. Revoke Other Admin Sessions (POST /api/admin/auth/revoke-other-sessions)
 */
export async function revokeAdminOtherSessions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const currentToken = req.cookies?.admin_refresh_token || req.cookies?.refresh_token;
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;

    if (currentTokenHash) {
      await RefreshToken.updateMany(
        { user: userId, tokenHash: { $ne: currentTokenHash } },
        { isRevoked: true, isUsed: true }
      );
    } else {
      await RefreshToken.updateMany({ user: userId }, { isRevoked: true, isUsed: true });
    }

    const user = await User.findById(userId);
    if (user) {
      await recordAdminAudit(
        user.email,
        'ADMIN_SESSION_REVOKED',
        req,
        'Revoked all other active administrator sessions',
        'SUCCESS',
        user._id
      );
    }

    return res.json({
      success: true,
      message: 'All other administrator sessions have been signed out.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 10. Get Recent Admin Security Activity (GET /api/admin/auth/recent-activity)
 */
export async function getAdminRecentActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin privileges required' });
    }

    const logs = await AuditLog.find({ adminEmail: user.email })
      .sort({ createdAt: -1 })
      .limit(15);

    return res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}
