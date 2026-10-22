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
exports.parseDeviceDescription = parseDeviceDescription;
exports.sanitizeIpAddress = sanitizeIpAddress;
exports.issueRefreshToken = issueRefreshToken;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshSession = refreshSession;
exports.logoutUser = logoutUser;
exports.logoutAllDevices = logoutAllDevices;
exports.logoutOtherSessions = logoutOtherSessions;
exports.getActiveSessions = getActiveSessions;
exports.forgotPassword = forgotPassword;
exports.validateResetToken = validateResetToken;
exports.resetPassword = resetPassword;
exports.changePassword = changePassword;
exports.getCurrentUser = getCurrentUser;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwtConfig_1 = require("../config/jwtConfig");
const zod_1 = require("zod");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const Counter_1 = require("../models/Counter");
const RefreshToken_1 = require("../models/RefreshToken");
const PasswordResetToken_1 = require("../models/PasswordResetToken");
const Notification_1 = require("../models/Notification");
const emailService_1 = require("../services/emailService");
const securityUtils_1 = require("../utils/securityUtils");
const termsConfig_1 = require("../config/termsConfig");
const doctorValidation_1 = require("../utils/doctorValidation");
/**
 * Safely parse browser and OS details from user agent string
 */
function parseDeviceDescription(userAgent) {
    if (!userAgent || typeof userAgent !== 'string')
        return 'Unknown Device';
    const ua = userAgent.trim();
    let browser = 'Browser';
    let os = 'Device';
    if (/edg/i.test(ua))
        browser = 'Microsoft Edge';
    else if (/chrome/i.test(ua) && !/chromium|edg/i.test(ua))
        browser = 'Google Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua))
        browser = 'Safari';
    else if (/firefox/i.test(ua))
        browser = 'Mozilla Firefox';
    else if (/opera|opr/i.test(ua))
        browser = 'Opera';
    if (/windows/i.test(ua))
        os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua))
        os = 'macOS';
    else if (/android/i.test(ua))
        os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua))
        os = 'iOS';
    else if (/linux/i.test(ua))
        os = 'Linux';
    return `${browser} on ${os}`;
}
/**
 * Mask and sanitize IP address for user privacy
 */
function sanitizeIpAddress(ip) {
    if (!ip || typeof ip !== 'string')
        return 'Unknown IP';
    const clean = ip.split(',')[0].trim();
    if (clean === '::1' || clean === '127.0.0.1')
        return '127.0.0.1 (Localhost)';
    const parts = clean.split('.');
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.***.***`;
    }
    return clean;
}
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+={}[\]:;"'<>,.~`|\\]).{8,}$/;
const registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
    email: zod_1.z.string().trim().email('Please enter a valid email address').max(255),
    mobile: zod_1.z.string().trim().min(10, 'Mobile number must be at least 10 digits').max(15),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']).optional(),
    dob: zod_1.z
        .string()
        .trim()
        .optional()
        .refine((val) => !val || (0, doctorValidation_1.validateDateOfBirth)(val).isValid, (val) => ({ message: (val && (0, doctorValidation_1.validateDateOfBirth)(val).error) || 'Invalid date of birth' })),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(passwordComplexityRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    termsAccepted: zod_1.z.literal(true, {
        errorMap: () => ({ message: 'You must agree to the Terms of Service and Privacy Policy to register.' }),
    }),
});
const loginSchema = zod_1.z.object({
    emailOrMobile: zod_1.z.string().trim().optional(),
    email: zod_1.z.string().trim().optional(),
    mobile: zod_1.z.string().trim().optional(),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address'),
});
const resetPasswordSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(passwordComplexityRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmPassword: zod_1.z.string().min(1, 'Please confirm your password'),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
const changePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z
        .string()
        .min(8, 'New password must be at least 8 characters long')
        .regex(passwordComplexityRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmNewPassword: zod_1.z.string().min(1, 'Please confirm your new password'),
})
    .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
});
/**
 * Sign short-lived Access Token (15m)
 */
function signAccessToken(userId, role) {
    return (0, jwtConfig_1.signJwtToken)({ userId, role }, { expiresIn: '15m', purpose: 'access' });
}
/**
 * Issue new Refresh Token with family tracking for rotation
 */
async function issueRefreshToken(userId, family, req) {
    const rawRefreshToken = (0, securityUtils_1.generateRandomToken)(40);
    const tokenHash = (0, securityUtils_1.hashToken)(rawRefreshToken);
    const tokenFamily = family || (0, securityUtils_1.generateRandomToken)(16);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const ipAddress = req?.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req?.socket?.remoteAddress ||
        '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'Unknown';
    await RefreshToken_1.RefreshToken.create({
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
function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie('access_token', accessToken, (0, securityUtils_1.getAccessTokenCookieOptions)());
    res.cookie('refresh_token', refreshToken, (0, securityUtils_1.getRefreshTokenCookieOptions)());
}
/**
 * Helper to clear authentication cookies on response
 */
function clearAuthCookies(res) {
    res.clearCookie('access_token', { ...(0, securityUtils_1.getAccessTokenCookieOptions)(), maxAge: 0 });
    res.clearCookie('refresh_token', { ...(0, securityUtils_1.getRefreshTokenCookieOptions)(), maxAge: 0 });
}
async function registerUser(req, res, next) {
    try {
        const data = registerSchema.parse(req.body);
        const normalizedEmail = data.email.toLowerCase().trim();
        const cleanMobile = data.mobile.replace(/\D/g, '');
        const existingUser = await User_1.User.findOne({
            $or: [{ email: normalizedEmail }, { mobile: cleanMobile }],
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'This email address or mobile number is already registered. Please sign in instead.',
            });
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, 12);
        const user = await User_1.User.create({
            fullName: data.fullName,
            email: normalizedEmail,
            mobile: cleanMobile,
            password: passwordHash,
            role: 'user',
            isActive: true,
            termsAccepted: true,
            termsVersion: termsConfig_1.CURRENT_TERMS_VERSION,
            termsAcceptedAt: new Date(),
        });
        let userDob = new Date('1998-05-15');
        if (data.dob) {
            const v = (0, doctorValidation_1.validateDateOfBirth)(data.dob, data.gender);
            if (v.isValid && v.parsedDate) {
                userDob = v.parsedDate;
            }
        }
        const candidateId = await (0, Counter_1.getNextCandidateId)();
        await Profile_1.Profile.create({
            user: user._id,
            candidateId,
            displayName: user.fullName,
            gender: data.gender || 'Male',
            dob: userDob,
            height: `5' 10"`,
            maritalStatus: 'Never Married',
            motherTongue: data.motherTongue || '',
            religion: data.religion || '',
            caste: data.caste || '',
            education: 'MBBS',
            degree: 'MBBS',
            profession: 'General Physician',
            country: 'India',
            state: data.state || '',
            city: 'Mumbai',
            verificationStatus: 'UNVERIFIED',
            lastActiveAt: new Date(),
        });
        const referralCode = req.body.referralCode || (req.cookies && req.cookies.wj_referral_code);
        if (referralCode) {
            try {
                const { attributeReferralOnRegistration } = await Promise.resolve().then(() => __importStar(require('../services/referralService')));
                await attributeReferralOnRegistration({
                    referredUserId: String(user._id),
                    referralCode: String(referralCode).trim().toUpperCase(),
                    req,
                });
            }
            catch (refErr) {
                console.warn('Referral attribution error (non-blocking):', refErr);
            }
        }
        const accessToken = signAccessToken(user._id.toString(), user.role);
        const { rawRefreshToken } = await issueRefreshToken(user._id.toString(), undefined, req);
        setAuthCookies(res, accessToken, rawRefreshToken);
        await (0, securityUtils_1.recordSecurityEvent)('LOGIN_SUCCESS', {
            user,
            identifier: normalizedEmail,
            req,
            details: { action: 'registration' },
        });
        try {
            await (0, emailService_1.sendMail)({
                to: user.email,
                subject: 'Welcome to Wonderful Jodi',
                text: `Hello ${user.fullName}, welcome to Wonderful Jodi matrimonial platform.`,
            });
        }
        catch (mailErr) {
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
    }
    catch (error) {
        next(error);
    }
}
async function loginUser(req, res, next) {
    try {
        const data = loginSchema.parse(req.body);
        const identifier = (data.emailOrMobile || data.email || data.mobile || '').trim();
        if (!identifier) {
            return res.status(400).json({ success: false, message: 'Email or mobile number is required' });
        }
        const cleanMobile = identifier.replace(/\D/g, '');
        const user = await User_1.User.findOne({
            $or: [{ email: identifier.toLowerCase() }, { mobile: cleanMobile || identifier }],
        });
        // Constant-time password verification to mitigate timing attacks
        const isPasswordValid = user ? await bcrypt_1.default.compare(data.password, user.password) : false;
        if (!user || !isPasswordValid) {
            await (0, securityUtils_1.recordSecurityEvent)('LOGIN_FAILED', {
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
            await (0, securityUtils_1.recordSecurityEvent)('LOGIN_FAILED', {
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
        // Check for prior active sessions belonging to this user before generating the new session
        const priorActiveSessions = await RefreshToken_1.RefreshToken.find({
            user: user._id,
            isRevoked: false,
            expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });
        const accessToken = signAccessToken(user._id.toString(), user.role);
        const { rawRefreshToken, family: newFamily } = await issueRefreshToken(user._id.toString(), undefined, req);
        setAuthCookies(res, accessToken, rawRefreshToken);
        await (0, securityUtils_1.recordSecurityEvent)('LOGIN_SUCCESS', {
            user,
            identifier: user.email,
            req,
            details: { action: 'login', family: newFamily },
        });
        // Notify user if a new sign-in occurred while another active session exists
        if (priorActiveSessions && priorActiveSessions.length > 0) {
            try {
                const prior = priorActiveSessions[0];
                const priorDevice = parseDeviceDescription(prior.userAgent);
                const priorIp = sanitizeIpAddress(prior.ipAddress);
                const currentUa = req.headers['user-agent'] || '';
                const currentDevice = parseDeviceDescription(currentUa);
                const currentRawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
                const currentIp = sanitizeIpAddress(currentRawIp);
                const recordedTime = new Date().toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                });
                await Notification_1.Notification.create({
                    user: user._id,
                    type: 'SECURITY_ALERT',
                    title: 'New Sign-in Detected on Another Device',
                    message: `A new sign-in was detected for your account on ${recordedTime} from ${currentDevice} (IP: ${currentIp}). A previous active session was recorded from ${priorDevice} (IP: ${priorIp}). Note: Device descriptions and IP addresses are unverified HTTP request headers and not proof of physical identity. If this was not you, please log out of other sessions immediately.`,
                    actionUrl: '/profile#device-sessions',
                    link: '/profile#device-sessions',
                    metadata: {
                        eventType: 'NEW_DEVICE_SIGNIN',
                        hasOtherActiveSessions: true,
                        isIdentityVerified: false,
                        priorActiveSessionsCount: priorActiveSessions.length,
                        previousSession: {
                            device: priorDevice,
                            ip: priorIp,
                            recordedAt: prior.createdAt,
                        },
                        currentSession: {
                            device: currentDevice,
                            ip: currentIp,
                            recordedAt: new Date(),
                        },
                        disclaimer: 'Recorded user-agent and IP addresses are request metadata and do not constitute verified physical identity.',
                    },
                });
            }
            catch (notifErr) {
                console.warn('Security sign-in notification warning (non-blocking):', notifErr);
            }
        }
        if (user.role !== 'admin') {
            Promise.resolve().then(() => __importStar(require('../services/visitTrackingService'))).then(({ recordUserVisit }) => {
                recordUserVisit(user._id.toString(), req).catch(() => { });
            })
                .catch(() => { });
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
    }
    catch (error) {
        next(error);
    }
}
/**
 * Refresh Access Token using Refresh Token Rotation (RTR)
 */
async function refreshSession(req, res, next) {
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
        const tokenHash = (0, securityUtils_1.hashToken)(rawRefreshToken);
        const tokenDoc = await RefreshToken_1.RefreshToken.findOne({ tokenHash });
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
            await RefreshToken_1.RefreshToken.updateMany({ family: tokenDoc.family }, { isRevoked: true });
            clearAuthCookies(res);
            await (0, securityUtils_1.recordSecurityEvent)('TOKEN_REUSE_DETECTED', {
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
        const targetUserId = tokenDoc.user || tokenDoc.userId;
        const user = await User_1.User.findById(targetUserId);
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
        const currentUserIdStr = (user._id || user.id).toString();
        const newAccessToken = signAccessToken(currentUserIdStr, user.role);
        const { rawRefreshToken: newRawRefreshToken } = await issueRefreshToken(currentUserIdStr, tokenDoc.family, req);
        setAuthCookies(res, newAccessToken, newRawRefreshToken);
        await (0, securityUtils_1.recordSecurityEvent)('TOKEN_REFRESHED', {
            user,
            identifier: user.email,
            req,
            details: { family: tokenDoc.family },
        });
        const userData = {
            _id: user._id || user.id,
            id: user._id || user.id,
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
    }
    catch (error) {
        next(error);
    }
}
/**
 * Logout current device session
 */
async function logoutUser(req, res, next) {
    try {
        const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
        if (rawRefreshToken && typeof rawRefreshToken === 'string') {
            const tokenHash = (0, securityUtils_1.hashToken)(rawRefreshToken);
            await RefreshToken_1.RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true, isUsed: true });
        }
        clearAuthCookies(res);
        return res.json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Logout from all devices (revoke all user refresh tokens)
 */
async function logoutAllDevices(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (userId) {
            await RefreshToken_1.RefreshToken.updateMany({ user: userId }, { isRevoked: true, isUsed: true });
            await (0, securityUtils_1.recordSecurityEvent)('LOGOUT_ALL', {
                user: userId,
                req,
            });
        }
        clearAuthCookies(res);
        return res.json({
            success: true,
            message: 'Successfully logged out from all devices',
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Logout all other device sessions for the authenticated user while preserving current session
 * POST /api/auth/logout-other-sessions
 */
async function logoutOtherSessions(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        // 1. Resolve current session family from current refresh token or request parameter
        const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
        let currentFamily = null;
        if (rawRefreshToken && typeof rawRefreshToken === 'string') {
            const tokenHash = (0, securityUtils_1.hashToken)(rawRefreshToken);
            const currentTokenDoc = await RefreshToken_1.RefreshToken.findOne({
                tokenHash,
                user: userId,
                isRevoked: false,
                expiresAt: { $gt: new Date() },
            });
            if (currentTokenDoc) {
                currentFamily = currentTokenDoc.family;
            }
        }
        if (!currentFamily && req.user?.sessionId) {
            const sessionDoc = await RefreshToken_1.RefreshToken.findOne({
                _id: req.user.sessionId,
                user: userId,
                isRevoked: false,
                expiresAt: { $gt: new Date() },
            });
            if (sessionDoc) {
                currentFamily = sessionDoc.family;
            }
        }
        // Fallback: If not explicitly found via cookie/body, find the most recently created or updated active token for this user
        if (!currentFamily) {
            const latestActive = await RefreshToken_1.RefreshToken.findOne({
                user: userId,
                isRevoked: false,
                expiresAt: { $gt: new Date() },
            }).sort({ updatedAt: -1 });
            if (latestActive) {
                currentFamily = latestActive.family;
            }
        }
        // 2. Revoke other active sessions belonging exclusively to this user
        // Safe against cross-account revocation because query strictly filters by { user: userId }
        const filter = {
            user: userId,
            isRevoked: false,
        };
        if (currentFamily) {
            filter.family = { $ne: currentFamily };
        }
        const result = await RefreshToken_1.RefreshToken.updateMany(filter, { isRevoked: true, isUsed: true });
        const count = typeof result?.modifiedCount === 'number'
            ? result.modifiedCount
            : (typeof result?.count === 'number' ? result.count : 0);
        await (0, securityUtils_1.recordSecurityEvent)('LOGOUT_ALL', {
            user: userId,
            req,
            details: {
                action: 'logout_other_sessions',
                preservedFamily: currentFamily,
                revokedSessionsCount: count,
            },
        });
        return res.json({
            success: true,
            message: 'All other active device sessions have been securely logged out.',
            data: {
                revokedCount: count,
                revokedSessionsCount: count,
                currentSessionPreserved: !!currentFamily,
                statelessJwtNotice: 'Refresh tokens for other devices are immediately revoked. Existing stateless access tokens expire naturally within up to 15 minutes (15m).',
                note: 'Refresh tokens for other devices are immediately revoked. Existing stateless access tokens expire naturally within up to 15 minutes.',
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * List active device sessions for the authenticated user
 * GET /api/auth/active-sessions
 */
async function getActiveSessions(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const rawRefreshToken = req.cookies?.refresh_token || req.query?.refreshToken;
        let currentFamily = null;
        if (rawRefreshToken && typeof rawRefreshToken === 'string') {
            const tokenHash = (0, securityUtils_1.hashToken)(rawRefreshToken);
            const currentDoc = await RefreshToken_1.RefreshToken.findOne({ tokenHash, user: userId });
            if (currentDoc)
                currentFamily = currentDoc.family;
        }
        const activeTokens = await RefreshToken_1.RefreshToken.find({
            user: userId,
            isRevoked: false,
            expiresAt: { $gt: new Date() },
        }).sort({ updatedAt: -1 });
        // Group by family to represent unique device sessions
        const familyMap = new Map();
        for (const token of activeTokens) {
            if (!familyMap.has(token.family)) {
                familyMap.set(token.family, token);
            }
        }
        const sessions = Array.from(familyMap.values()).map((doc, idx) => {
            const isCurrent = currentFamily ? doc.family === currentFamily : idx === 0;
            return {
                id: doc._id,
                family: doc.family,
                device: parseDeviceDescription(doc.userAgent),
                userAgent: doc.userAgent ? doc.userAgent.slice(0, 150) : 'Unknown',
                ipAddress: sanitizeIpAddress(doc.ipAddress),
                createdAt: doc.createdAt,
                lastActiveAt: doc.updatedAt || doc.createdAt,
                isCurrent,
            };
        });
        return res.json({
            success: true,
            data: {
                sessions,
                totalActiveSessions: sessions.length,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function forgotPassword(req, res, next) {
    try {
        const data = forgotPasswordSchema.parse(req.body);
        const normalizedEmail = data.email.toLowerCase().trim();
        const user = await User_1.User.findOne({ email: normalizedEmail });
        if (user) {
            // Invalidate any existing unused reset tokens for this user
            await PasswordResetToken_1.PasswordResetToken.updateMany({ user: user._id, isUsed: false }, { isUsed: true, usedAt: new Date() });
            // Generate cryptographically secure random 32-byte token
            const rawToken = (0, securityUtils_1.generateRandomToken)(32);
            const tokenHash = (0, securityUtils_1.hashToken)(rawToken);
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
            await PasswordResetToken_1.PasswordResetToken.create({
                user: user._id,
                tokenHash,
                expiresAt,
                isUsed: false,
            });
            const clientOrigin = req.get('origin') ||
                process.env.FRONTEND_URL ||
                (process.env.NODE_ENV === 'production'
                    ? 'https://wonderfuljodi.com'
                    : 'http://localhost:3000');
            const frontendBaseUrl = clientOrigin.replace(/\/$/, '');
            const resetUrl = `${frontendBaseUrl}/reset-password?token=${rawToken}`;
            await (0, securityUtils_1.recordSecurityEvent)('PASSWORD_RESET_REQUESTED', {
                user,
                identifier: normalizedEmail,
                req,
            });
            try {
                await (0, emailService_1.sendPasswordResetEmail)(user.email, user.fullName, resetUrl);
            }
            catch (mailError) {
                console.error('Failed to send password reset email:', mailError);
            }
        }
        // Always return generic response to prevent account enumeration
        return res.json({
            success: true,
            message: 'If an account exists with this email address, a password reset link has been sent.',
        });
    }
    catch (error) {
        next(error);
    }
}
async function validateResetToken(req, res, next) {
    try {
        const rawToken = req.query.token || req.body?.token;
        if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
            return res.status(400).json({ success: false, message: 'This reset link is invalid.' });
        }
        const tokenHash = (0, securityUtils_1.hashToken)(rawToken.trim());
        const tokenDoc = await PasswordResetToken_1.PasswordResetToken.findOne({ tokenHash });
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
    }
    catch (error) {
        next(error);
    }
}
async function resetPassword(req, res, next) {
    try {
        const data = resetPasswordSchema.parse(req.body);
        const rawToken = data.token.trim();
        const tokenHash = (0, securityUtils_1.hashToken)(rawToken);
        const tokenDoc = await PasswordResetToken_1.PasswordResetToken.findOne({ tokenHash });
        if (!tokenDoc || tokenDoc.isUsed || tokenDoc.usedAt) {
            return res.status(400).json({ success: false, message: 'This reset link is invalid or has already been used.' });
        }
        if (new Date() > tokenDoc.expiresAt) {
            return res
                .status(400)
                .json({ success: false, message: 'This reset link has expired. Please request a new one.' });
        }
        const user = await User_1.User.findById(tokenDoc.user);
        if (!user) {
            return res.status(400).json({ success: false, message: 'User account not found.' });
        }
        // Hash the new password with bcrypt
        const hashedPassword = await bcrypt_1.default.hash(data.password, 12);
        user.password = hashedPassword;
        await user.save();
        // Mark current reset token as used
        tokenDoc.isUsed = true;
        tokenDoc.usedAt = new Date();
        await tokenDoc.save();
        // Invalidate all other reset tokens for this user
        await PasswordResetToken_1.PasswordResetToken.updateMany({ user: user._id, isUsed: false }, { isUsed: true, usedAt: new Date() });
        // ─── SESSION INVALIDATION ───
        // Revoke all active refresh tokens/sessions across all devices upon password reset
        await RefreshToken_1.RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });
        clearAuthCookies(res);
        await (0, securityUtils_1.recordSecurityEvent)('PASSWORD_RESET_SUCCESS', {
            user,
            identifier: user.email,
            req,
        });
        return res.json({
            success: true,
            message: 'Password reset successfully. Please sign in with your new password.',
        });
    }
    catch (error) {
        next(error);
    }
}
async function changePassword(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const data = changePasswordSchema.parse(req.body);
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found' });
        }
        const isCurrentPasswordValid = await bcrypt_1.default.compare(data.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }
        const newHashedPassword = await bcrypt_1.default.hash(data.newPassword, 12);
        user.password = newHashedPassword;
        await user.save();
        // Revoke all other sessions, issue fresh token for current session
        await RefreshToken_1.RefreshToken.updateMany({ user: user._id }, { isRevoked: true, isUsed: true });
        const newAccessToken = signAccessToken(user._id.toString(), user.role);
        const { rawRefreshToken } = await issueRefreshToken(user._id.toString(), undefined, req);
        setAuthCookies(res, newAccessToken, rawRefreshToken);
        await (0, securityUtils_1.recordSecurityEvent)('PASSWORD_CHANGE', {
            user,
            identifier: user.email,
            req,
        });
        return res.json({
            success: true,
            message: 'Password changed successfully',
            token: newAccessToken,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getCurrentUser(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const user = await User_1.User.findById(userId).select('-password');
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
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=authController.js.map