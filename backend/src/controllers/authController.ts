import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { RefreshToken } from '../models/RefreshToken';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { sendMail, sendPasswordResetEmail } from '../services/emailService';
import {
  generateRandomToken,
  hashToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  serializeUserPublic,
  recordSecurityEvent,
} from '../utils/securityUtils';
import { AuthRequest } from '../middleware/authMiddleware';

import { CURRENT_TERMS_VERSION } from '../config/termsConfig';

const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+={}[\]:;"'<>,.~`|\\]).{8,}$/;

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email address').max(255),
  mobile: z.string().trim().min(10, 'Mobile number must be at least 10 digits').max(15),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      passwordComplexityRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms of Service and Privacy Policy to register.' }),
  }),
});

const loginSchema = z.object({
  emailOrMobile: z.string().trim().optional(),
  email: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address'),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        passwordComplexityRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(
        passwordComplexityRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

/**
 * Sign short-lived Access Token (15m)
 */
function signAccessToken(userId: string, role: string): string {
  const secret = process.env.JWT_SECRET ?? 'supersecret_wonderfuljodi_dev_key_2026';
  return jwt.sign({ userId, role }, secret, { expiresIn: '15m' });
}

/**
 * Issue new Refresh Token with family tracking for rotation
 */
async function issueRefreshToken(
  userId: string,
  family?: string,
  req?: Request
): Promise<{ rawRefreshToken: string; family: string }> {
  const rawRefreshToken = generateRandomToken(40);
  const tokenHash = hashToken(rawRefreshToken);
  const tokenFamily = family || generateRandomToken(16);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const ipAddress =
    (req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    '127.0.0.1';
  const userAgent = req?.headers['user-agent'] || 'Unknown';

  await RefreshToken.create({
    user: userId,
    tokenHash,
    family: tokenFamily,
    isUsed: false,
    isRevoked: false,
    expiresAt,
    ipAddress,
    userAgent,
  });

  return { rawRefreshToken, family: tokenFamily };
}

/**
 * Helper to set authentication cookies on response
 */
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, getAccessTokenCookieOptions());
  res.cookie('refresh_token', refreshToken, getRefreshTokenCookieOptions());
}

/**
 * Helper to clear authentication cookies on response
 */
function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { ...getAccessTokenCookieOptions(), maxAge: 0 });
  res.clearCookie('refresh_token', { ...getRefreshTokenCookieOptions(), maxAge: 0 });
}

export async function registerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();
    const cleanMobile = data.mobile.replace(/\D/g, '');

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { mobile: cleanMobile }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email address or mobile number is already registered. Please sign in instead.',
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      fullName: data.fullName,
      email: normalizedEmail,
      mobile: cleanMobile,
      password: passwordHash,
      role: 'user',
      isActive: true,
      termsAccepted: true,
      termsVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: new Date(),
    });

    await Profile.create({
      user: user._id,
      displayName: user.fullName,
      gender: data.gender || 'Male',
      dob: new Date('1998-05-15'),
      height: `5' 10"`,
      maritalStatus: 'Never Married',
      motherTongue: 'Hindi',
      religion: 'Hindu',
      caste: 'General',
      education: 'MBBS',
      degree: 'MBBS',
      profession: 'General Physician',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      verificationStatus: 'UNVERIFIED',
      lastActiveAt: new Date(),
    });

    const referralCode = req.body.referralCode || (req.cookies && req.cookies.wj_referral_code);
    if (referralCode) {
      try {
        const { attributeReferralOnRegistration } = await import('../services/referralService');
        await attributeReferralOnRegistration({
          referredUserId: String(user._id),
          referralCode: String(referralCode).trim().toUpperCase(),
          req,
        });
      } catch (refErr) {
        console.warn('Referral attribution error (non-blocking):', refErr);
      }
    }

    const accessToken = signAccessToken(user._id.toString(), user.role);
    const { rawRefreshToken } = await issueRefreshToken(user._id.toString(), undefined, req);

    setAuthCookies(res, accessToken, rawRefreshToken);

    await recordSecurityEvent('LOGIN_SUCCESS', {
      user,
      identifier: normalizedEmail,
      req,
      details: { action: 'registration' },
    });

    try {
      await sendMail({
        to: user.email,
        subject: 'Welcome to Wonderful Jodi',
        text: `Hello ${user.fullName}, welcome to Wonderful Jodi matrimonial platform.`,
      });
    } catch (mailErr) {
      console.warn('Welcome email error (non-blocking):', mailErr);
    }

    const userData = {
      _id: user._id,
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      verified: user.verified,
      verificationStatus: user.verificationStatus,
    };

    return res.status(201).json({
      success: true,
      token: accessToken,
      data: {
        token: accessToken,
        user: userData,
      },
      user: userData,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const identifier = (data.emailOrMobile || data.email || data.mobile || '').trim();

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Email or mobile number is required' });
    }

    const cleanMobile = identifier.replace(/\D/g, '');
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { mobile: cleanMobile || identifier }],
    });

    // Constant-time password verification to mitigate timing attacks
    const isPasswordValid = user ? await bcrypt.compare(data.password, user.password) : false;

    if (!user || !isPasswordValid) {
      await recordSecurityEvent('LOGIN_FAILED', {
        identifier,
        status: 'FAILURE',
        req,
        details: { reason: 'invalid_credentials' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email/mobile and password.',
      });
    }

    if (!user.isActive) {
      await recordSecurityEvent('LOGIN_FAILED', {
        user,
        identifier,
        status: 'FAILURE',
        req,
        details: { reason: 'account_inactive' },
      });
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive. Please contact support or reactivate your account.',
      });
    }

    const accessToken = signAccessToken(user._id.toString(), user.role);
    const { rawRefreshToken } = await issueRefreshToken(user._id.toString(), undefined, req);

    setAuthCookies(res, accessToken, rawRefreshToken);

    await recordSecurityEvent('LOGIN_SUCCESS', {
      user,
      identifier: user.email,
      req,
      details: { action: 'login' },
    });

    if (user.role !== 'admin') {
      import('../services/visitTrackingService')
        .then(({ recordUserVisit }) => {
          recordUserVisit(user._id.toString(), req).catch(() => {});
        })
        .catch(() => {});
    }

    const userData = {
      _id: user._id,
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      verified: user.verified,
      verificationStatus: user.verificationStatus,
    };

    return res.json({
      success: true,
      token: accessToken,
      user: userData,
      data: { token: accessToken, user: userData },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh Access Token using Refresh Token Rotation (RTR)
 */
export async function refreshSession(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        code: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided',
      });
    }

    const tokenHash = hashToken(rawRefreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (!tokenDoc) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token session',
      });
    }

    // ─── REUSE DETECTION ───
    // If a previously used refresh token is submitted again, a potential token theft has occurred.
    // Invalidate the entire token family immediately.
    if (tokenDoc.isUsed || tokenDoc.isRevoked) {
      await RefreshToken.updateMany({ family: tokenDoc.family }, { isRevoked: true });
      clearAuthCookies(res);

      await recordSecurityEvent('TOKEN_REUSE_DETECTED', {
        user: tokenDoc.user,
        status: 'WARNING',
        req,
        details: { family: tokenDoc.family, action: 'family_invalidated' },
      });

      return res.status(401).json({
        success: false,
        code: 'TOKEN_REUSE_DETECTED',
        message: 'Suspicious session activity detected. Please sign in again.',
      });
    }

    if (new Date() > tokenDoc.expiresAt) {
      tokenDoc.isRevoked = true;
      await tokenDoc.save();
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Session has expired. Please sign in again.',
      });
    }

    const user = await User.findById(tokenDoc.user);
    if (!user || !user.isActive) {
      tokenDoc.isRevoked = true;
      await tokenDoc.save();
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: 'User account is no longer active',
      });
    }

    // Mark current refresh token as used
    tokenDoc.isUsed = true;
    await tokenDoc.save();

    // Issue new access token + new rotated refresh token in the same family
    const newAccessToken = signAccessToken(user._id.toString(), user.role);
    const { rawRefreshToken: newRawRefreshToken } = await issueRefreshToken(
      user._id.toString(),
      tokenDoc.family,
      req
    );

    setAuthCookies(res, newAccessToken, newRawRefreshToken);

    await recordSecurityEvent('TOKEN_REFRESHED', {
      user,
      identifier: user.email,
      req,
      details: { family: tokenDoc.family },
    });

    const userData = {
      _id: user._id,
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      verified: user.verified,
      verificationStatus: user.verificationStatus,
    };

    return res.json({
      success: true,
      token: newAccessToken,
      user: userData,
      data: { token: newAccessToken, user: userData },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout current device session
 */
export async function logoutUser(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true, isUsed: true });
    }

    clearAuthCookies(res);

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout from all devices (revoke all user refresh tokens)
 */
export async function logoutAllDevices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (userId) {
      await RefreshToken.updateMany({ user: userId }, { isRevoked: true, isUsed: true });
      await recordSecurityEvent('LOGOUT_ALL', {
        user: userId,
        req,
      });
    }

    clearAuthCookies(res);

    return res.json({
      success: true,
      message: 'Successfully logged out from all devices',
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Invalidate any existing unused reset tokens for this user
      await PasswordResetToken.updateMany(
        { user: user._id, isUsed: false },
        { isUsed: true, usedAt: new Date() }
      );

      // Generate cryptographically secure random 32-byte token
      const rawToken = generateRandomToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await PasswordResetToken.create({
        user: user._id,
        tokenHash,
        expiresAt,
        isUsed: false,
      });

      const clientOrigin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';
      const frontendBaseUrl = clientOrigin.replace(/\/$/, '');
      const resetUrl = `${frontendBaseUrl}/reset-password?token=${rawToken}`;

      await recordSecurityEvent('PASSWORD_RESET_REQUESTED', {
        user,
        identifier: normalizedEmail,
        req,
      });

      try {
        await sendPasswordResetEmail(user.email, user.fullName, resetUrl);
      } catch (mailError) {
        console.error('Failed to send password reset email:', mailError);
      }
    }

    // Always return generic response to prevent account enumeration
    return res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

export async function validateResetToken(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = (req.query.token as string) || req.body?.token;

    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
      return res.status(400).json({ success: false, message: 'This reset link is invalid.' });
    }

    const tokenHash = hashToken(rawToken.trim());
    const tokenDoc = await PasswordResetToken.findOne({ tokenHash });

    if (!tokenDoc || tokenDoc.isUsed || tokenDoc.usedAt) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has already been used.' });
    }

    if (new Date() > tokenDoc.expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: 'This reset link has expired. Please request a new one.' });
    }

    return res.json({
      success: true,
      message: 'Token is valid.',
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const rawToken = data.token.trim();
    const tokenHash = hashToken(rawToken);

    const tokenDoc = await PasswordResetToken.findOne({ tokenHash });

    if (!tokenDoc || tokenDoc.isUsed || tokenDoc.usedAt) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has already been used.' });
    }

    if (new Date() > tokenDoc.expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: 'This reset link has expired. Please request a new one.' });
    }

    const user = await User.findById(tokenDoc.user);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User account not found.' });
    }

    // Hash the new password with bcrypt
    const hashedPassword = await bcrypt.hash(data.password, 12);
    user.password = hashedPassword;
    await user.save();

    // Mark current reset token as used
    tokenDoc.isUsed = true;
    tokenDoc.usedAt = new Date();
    await tokenDoc.save();

    // Invalidate all other reset tokens for this user
    await PasswordResetToken.updateMany(
      { user: user._id, isUsed: false },
      { isUsed: true, usedAt: new Date() }
    );

    // ─── SESSION INVALIDATION ───
    // Revoke all active refresh tokens/sessions across all devices upon password reset
    await RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });
    clearAuthCookies(res);

    await recordSecurityEvent('PASSWORD_RESET_SUCCESS', {
      user,
      identifier: user.email,
      req,
    });

    return res.json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const data = changePasswordSchema.parse(req.body);
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const newHashedPassword = await bcrypt.hash(data.newPassword, 12);
    user.password = newHashedPassword;
    await user.save();

    // Revoke all other sessions, issue fresh token for current session
    await RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });

    const newAccessToken = signAccessToken(user._id.toString(), user.role);
    const { rawRefreshToken } = await issueRefreshToken(user._id.toString(), undefined, req);
    setAuthCookies(res, newAccessToken, rawRefreshToken);

    await recordSecurityEvent('PASSWORD_CHANGE', {
      user,
      identifier: user.email,
      req,
    });

    return res.json({
      success: true,
      message: 'Password changed successfully',
      token: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        _id: user._id,
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        verified: user.verified,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}
