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
exports.getHostLanIp = getHostLanIp;
exports.parseSocketCookies = parseSocketCookies;
exports.extractSocketToken = extractSocketToken;
exports.verifySocketAuthentication = verifySocketAuthentication;
require("./config/env");
const app_1 = __importStar(require("./app"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("./db/client");
const emailService_1 = require("./services/emailService");
const profilePhotoRecoveryService_1 = require("./services/profilePhotoRecoveryService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const permissionUtils_1 = require("./utils/permissionUtils");
const securityUtils_1 = require("./utils/securityUtils");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const server = (0, http_1.createServer)(app_1.default);
/**
 * Helper to detect host machine LAN IPv4 address.
 * Used only for development/local logging.
 */
function getHostLanIp() {
    const interfaces = os_1.default.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const netList = interfaces[name] || [];
        for (const net of netList) {
            if (net.family === 'IPv4' &&
                !net.internal) {
                if (net.address.startsWith('192.168.') ||
                    net.address.startsWith('10.') ||
                    /^172\.(1[6-9]|2\d|3[0-1])\./.test(net.address)) {
                    return net.address;
                }
            }
        }
    }
    return '127.0.0.1';
}
/**
 * Socket.IO allowed origins
 */
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://wonderfuljodi.com',
    'https://www.wonderfuljodi.com',
    // Development
    'http://localhost:3000',
    'http://127.0.0.1:3000',
].filter(Boolean);
/**
 * Socket.IO
 */
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow server-to-server / tools without Origin
            if (!origin) {
                return callback(null, true);
            }
            const isAllowedExplicit = allowedOrigins.includes(origin);
            const isLocalNetworkDev = process.env.NODE_ENV !== 'production' &&
                /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
            if (isAllowedExplicit ||
                isLocalNetworkDev) {
                return callback(null, true);
            }
            return callback(new Error(`CORS Not Allowed by Socket.IO: ${origin}`));
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
app_1.default.set('io', io);
/**
 * Cookie Parser for Socket.IO Handshake Headers
 */
function parseSocketCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader || typeof cookieHeader !== 'string')
        return cookies;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
        const idx = pair.indexOf('=');
        if (idx > 0) {
            const key = pair.substring(0, idx).trim();
            const val = pair.substring(idx + 1).trim();
            try {
                cookies[key] = decodeURIComponent(val);
            }
            catch {
                cookies[key] = val;
            }
        }
    }
    return cookies;
}
/**
 * Extracts JWT authentication token from Socket.IO handshake auth, headers, or cookies
 */
function extractSocketToken(socket) {
    // 1. Explicit auth payload (from socket.io-client auth: { token })
    if (socket?.handshake?.auth?.token && typeof socket.handshake.auth.token === 'string') {
        const t = socket.handshake.auth.token.trim();
        if (t)
            return t;
    }
    if (socket?.handshake?.auth?.accessToken && typeof socket.handshake.auth.accessToken === 'string') {
        const t = socket.handshake.auth.accessToken.trim();
        if (t)
            return t;
    }
    // 2. Authorization Header (Bearer <token>)
    const authHeader = socket?.handshake?.headers?.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const t = authHeader.substring(7).trim();
        if (t)
            return t;
    }
    // 3. Fallback to HttpOnly cookies
    const cookieHeader = socket?.handshake?.headers?.cookie;
    if (cookieHeader) {
        const cookies = parseSocketCookies(cookieHeader);
        const cookieToken = cookies.access_token || cookies.admin_access_token || cookies.wonderfuljodi_token;
        if (cookieToken && typeof cookieToken === 'string' && cookieToken.trim()) {
            return cookieToken.trim();
        }
    }
    return null;
}
/**
 * Verifies a token and authenticates a Socket.IO connection attempt.
 * Returns verified user payload or throws an Error with a safe message.
 */
async function verifySocketAuthentication(socket) {
    const secret = (0, permissionUtils_1.getSafeJwtSecret)();
    if (!secret) {
        console.error('[Socket.IO] CRITICAL: JWT_SECRET environment variable is missing in production. Failing closed.');
        throw new Error('Authentication service configuration error');
    }
    const token = extractSocketToken(socket);
    if (!token) {
        throw new Error('Authentication required');
    }
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(token, secret);
    }
    catch (err) {
        if (err?.name === 'TokenExpiredError') {
            throw new Error('Authentication token expired');
        }
        throw new Error('Invalid or expired authentication token');
    }
    const userId = String(payload?.userId || payload?.id || payload?._id || payload?.sub || '').trim();
    if (!userId) {
        throw new Error('Invalid token claims: missing user ID');
    }
    // Check account status if database is available
    try {
        const { User } = await Promise.resolve().then(() => __importStar(require('./models/User')));
        const userDoc = await User.findById(userId);
        if (userDoc) {
            if (userDoc.isDeleted ||
                userDoc.isActive === false ||
                userDoc.status === 'Deleted' ||
                userDoc.status === 'Suspended' ||
                userDoc.status === 'Blocked') {
                throw new Error('Account is deactivated, suspended, or deleted');
            }
        }
    }
    catch (dbErr) {
        if (dbErr?.message === 'Account is deactivated, suspended, or deleted') {
            throw dbErr;
        }
        // In testing/mock environments without full DB, proceed if token signature is cryptographically valid
    }
    return {
        userId,
        role: String(payload?.role || 'user').trim(),
        email: payload?.email ? String(payload.email).trim() : undefined,
        fullName: payload?.fullName ? String(payload.fullName).trim() : undefined,
    };
}
/**
 * Authoritative Socket.IO Connection Authentication Middleware
 * Enforces valid JWT token, active account status, and populates socket.data.
 * Unauthenticated connections are strictly rejected.
 */
io.use(async (socket, next) => {
    try {
        const authData = await verifySocketAuthentication(socket);
        socket.data = socket.data || {};
        socket.data.userId = authData.userId;
        socket.data.role = authData.role;
        socket.data.email = authData.email;
        socket.data.fullName = authData.fullName;
        next();
    }
    catch (err) {
        next(err);
    }
});
/**
 * Socket events with Authoritative Server-Controlled Room Membership
 */
io.on('connection', (socket) => {
    const verifiedUserId = socket.data?.userId;
    if (!verifiedUserId) {
        console.warn('[Socket.IO] Disconnecting unauthenticated socket:', socket.id);
        socket.disconnect(true);
        return;
    }
    // 1. Authoritative Automatic Room Joining:
    // The server automatically places the socket in the user's private room.
    // Clients never control their own user room name.
    const personalRoom = `user:${verifiedUserId}`;
    socket.join(personalRoom);
    console.log(`[Socket.IO] Authenticated user ${verifiedUserId} joined personal room ${personalRoom}`);
    // 2. Controlled Room Joining Handler:
    socket.on('joinRoom', async (room, callback) => {
        const respond = (success, message) => {
            if (!success)
                socket.emit('error', message);
            if (typeof callback === 'function')
                callback({ success, message, room: success ? room : undefined });
        };
        if (!room || typeof room !== 'string') {
            return respond(false, 'Invalid room identifier');
        }
        const cleanRoom = room.trim();
        // Own personal room is permitted (idempotent)
        if (cleanRoom === personalRoom) {
            socket.join(cleanRoom);
            return respond(true, 'Joined personal room');
        }
        // Strictly reject joining any other member's private room
        if (cleanRoom.startsWith('user:')) {
            console.warn(`[Socket.IO] Security violation: User ${verifiedUserId} attempted to join unauthorized room ${cleanRoom}`);
            return respond(false, 'Unauthorized: cannot join another member private room');
        }
        // Administrative rooms require admin role
        if (cleanRoom.startsWith('admin') || cleanRoom.startsWith('internal:')) {
            if (socket.data.role !== 'admin') {
                console.warn(`[Socket.IO] Security violation: Non-admin user ${verifiedUserId} attempted to join admin room ${cleanRoom}`);
                return respond(false, 'Unauthorized: administrative room access denied');
            }
            socket.join(cleanRoom);
            return respond(true, 'Joined administrative room');
        }
        // Conversation rooms: verify authenticated user is an active participant
        const convId = cleanRoom.startsWith('conv:') ? cleanRoom.slice(5) : cleanRoom;
        if ((0, securityUtils_1.isValidObjectId)(convId)) {
            try {
                const { Conversation } = await Promise.resolve().then(() => __importStar(require('./models/Conversation')));
                const conv = await Conversation.findById(convId);
                if (!conv) {
                    return respond(false, 'Conversation not found');
                }
                const isParticipant = Array.isArray(conv.participants) &&
                    conv.participants.some((p) => {
                        const pId = typeof p === 'object' && p !== null ? (p._id || p.id || p.userId) : p;
                        return String(pId) === String(verifiedUserId);
                    });
                if (!isParticipant && socket.data.role !== 'admin') {
                    console.warn(`[Socket.IO] Security violation: User ${verifiedUserId} attempted to join conversation ${convId} without participation`);
                    return respond(false, 'Unauthorized: not a participant of this conversation');
                }
                socket.join(cleanRoom);
                return respond(true, 'Joined conversation room');
            }
            catch (err) {
                return respond(false, 'Failed to verify conversation access');
            }
        }
        // Reject all other arbitrary room names
        return respond(false, 'Unauthorized: arbitrary room names are not allowed');
    });
    // 3. Authorized Message Relay Handler (Anti-Impersonation & Room Protection):
    socket.on('sendMessage', async (payload, callback) => {
        const respond = (success, message) => {
            if (!success)
                socket.emit('error', message);
            if (typeof callback === 'function')
                callback({ success, message });
        };
        if (!payload || typeof payload !== 'object') {
            return respond(false, 'Invalid message payload');
        }
        const targetRoom = typeof payload.room === 'string' ? payload.room.trim() : '';
        if (!targetRoom) {
            return respond(false, 'Room identifier is required');
        }
        // Disallow broadcasting directly to user, admin, or arbitrary rooms
        if (targetRoom.startsWith('user:') || targetRoom.startsWith('admin') || targetRoom.startsWith('internal:')) {
            console.warn(`[Socket.IO] Security violation: User ${verifiedUserId} attempted to broadcast to restricted room ${targetRoom}`);
            return respond(false, 'Unauthorized: cannot broadcast messages to private or administrative rooms');
        }
        const convId = targetRoom.startsWith('conv:') ? targetRoom.slice(5) : targetRoom;
        if (!(0, securityUtils_1.isValidObjectId)(convId)) {
            return respond(false, 'Unauthorized: target room must be a valid conversation ID');
        }
        try {
            const { Conversation } = await Promise.resolve().then(() => __importStar(require('./models/Conversation')));
            const conv = await Conversation.findById(convId);
            if (!conv) {
                return respond(false, 'Conversation not found');
            }
            const isParticipant = Array.isArray(conv.participants) &&
                conv.participants.some((p) => {
                    const pId = typeof p === 'object' && p !== null ? (p._id || p.id || p.userId) : p;
                    return String(pId) === String(verifiedUserId);
                });
            if (!isParticipant && socket.data.role !== 'admin') {
                console.warn(`[Socket.IO] Security violation: User ${verifiedUserId} attempted to broadcast to conversation ${convId} without participation`);
                return respond(false, 'Unauthorized: not a participant of this conversation');
            }
            // Authoritatively overwrite sender to prevent user impersonation
            const sanitizedPayload = {
                ...payload,
                sender: verifiedUserId,
                senderId: verifiedUserId,
                room: targetRoom,
                verifiedAt: new Date().toISOString(),
            };
            io.to(targetRoom).emit('receiveMessage', sanitizedPayload);
            return respond(true, 'Message delivered');
        }
        catch (err) {
            return respond(false, 'Failed to process message broadcast');
        }
    });
    // 4. Server-Only Event Protection: Block client injection of server lifecycle events
    const SERVER_ONLY_EVENTS = [
        'interestRestored',
        'interestReceived',
        'interestAccepted',
        'interestDeclined',
        'interestRejected',
        'interestWithdrawn',
        'newNotification',
        'new_notification',
        'newChatMessage',
    ];
    for (const eventName of SERVER_ONLY_EVENTS) {
        socket.on(eventName, () => {
            console.warn(`[Socket.IO] Security violation: User ${verifiedUserId} attempted to inject server-only event '${eventName}'`);
            socket.emit('error', `Unauthorized: '${eventName}' is a server-originated event`);
        });
    }
    socket.on('disconnect', (reason) => {
        console.log('[Socket.IO] Disconnected:', socket.id, reason);
    });
});
/**
 * Start Server (Next.js in-process + Express)
 */
async function startServer() {
    const isDevProcess = Boolean(process.env.TS_NODE_DEV) || process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production' && !isDevProcess;
    const resolvedFrontendDir = fs_1.default.existsSync(path_1.default.resolve(__dirname, '../../frontend'))
        ? path_1.default.resolve(__dirname, '../../frontend')
        : path_1.default.resolve(process.cwd(), 'frontend');
    const nextBuildDir = path_1.default.join(resolvedFrontendDir, '.next');
    const hasProductionBuild = fs_1.default.existsSync(path_1.default.join(nextBuildDir, 'BUILD_ID'));
    // In production with a verified prebuilt frontend, mount Next.js in-process for unified single-port hosting.
    // In development mode, Next.js runs standalone via `next dev` on port 3000 to prevent filesystem conflicts over `.next`.
    if (isProduction && hasProductionBuild) {
        try {
            console.log('[Next.js] Preparing in-process Next.js production server...');
            const nextModulePath = require.resolve('next', { paths: [resolvedFrontendDir, process.cwd()] });
            const nextModule = require(nextModulePath);
            const next = typeof nextModule === 'function' ? nextModule : (nextModule.default || nextModule);
            const nextApp = next({
                dev: false,
                dir: resolvedFrontendDir,
            });
            await nextApp.prepare();
            (0, app_1.registerNextHandler)(nextApp.getRequestHandler());
            console.log('[Next.js] ✅ Next.js app prepared and integrated into Express server.');
        }
        catch (err) {
            console.error('[Next.js] ❌ Failed to initialize Next.js in-process:', err.message || err);
        }
    }
    else if (isProduction && !hasProductionBuild) {
        console.log('[Next.js] In-process Next.js skipped: No production build found in frontend/.next (run "npm run build" to generate).');
    }
    else {
        console.log('[Next.js] In-process Next.js skipped (development mode: frontend runs standalone via "next dev" on port 3000).');
    }
    server.listen(PORT, HOST, async () => {
        const lanIp = getHostLanIp();
        console.log('');
        console.log('==================================================');
        console.log('       WONDERFUL JODI FULLSTACK PLATFORM');
        console.log('==================================================');
        console.log('Environment:');
        console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
        console.log('Server:');
        console.log(`  Host: ${HOST}`);
        console.log(`  Port: ${PORT}`);
        if (isProduction && hasProductionBuild) {
            console.log('Unified Server:');
            console.log(`  Local: http://localhost:${PORT}`);
            console.log(`  LAN:   http://${lanIp}:${PORT}`);
        }
        else {
            console.log('Backend API Server:');
            console.log(`  Local: http://localhost:${PORT}`);
            console.log(`  LAN:   http://${lanIp}:${PORT}`);
        }
        console.log('API Health:');
        console.log(`  http://localhost:${PORT}/api/health`);
        console.log('Email / SMTP Diagnostics:');
        try {
            const diag = (0, emailService_1.getEmailConfigDiagnostics)();
            console.log(`  EMAIL_HOST:    ${diag.hostPresent ? '[CONFIGURED]' : '[MISSING]'}`);
            console.log(`  EMAIL_PORT:    ${diag.port} (secure: ${diag.secure})`);
            console.log(`  EMAIL_USER:    ${diag.userPresent ? '[CONFIGURED]' : '[MISSING]'}`);
            console.log(`  EMAIL_PASS:    ${diag.passPresent ? '[CONFIGURED]' : '[MISSING]'}`);
            console.log(`  EMAIL_FROM:    ${diag.senderStatus}`);
            const smtpStatus = await (0, emailService_1.verifyEmailTransporter)();
            if (smtpStatus.success) {
                console.log(`  Status:        ACTIVE (${smtpStatus.message})`);
            }
            else {
                console.log(`  Status:        NOT CONFIGURED / FAILED (${smtpStatus.message})`);
            }
        }
        catch (error) {
            console.log(`  Status:        ERROR (${error?.message || 'SMTP unavailable'})`);
        }
        console.log('==================================================');
        console.log('');
        // Asynchronously self-heal missing profile photos to canonical persistent storage
        (0, profilePhotoRecoveryService_1.restoreAllMissingProfilePhotos)()
            .then((res) => {
            if (res.restoredCount > 0) {
                console.log(`[Startup] Self-healed ${res.restoredCount} missing profile photos to persistent storage.`);
            }
        })
            .catch((err) => {
            console.error('[Startup] Profile photo self-healing encountered an error:', err);
        });
    });
}
if (!process.env.TEST_SUITE_RUNNING) {
    startServer();
}
/**
 * Graceful process cleanup
 */
function handleShutdown(signal) {
    console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        console.log('[Shutdown] HTTP server closed cleanly.');
        try {
            await client_1.prisma.$disconnect();
            console.log('[Shutdown] Database connection disconnected.');
        }
        catch (_) { }
        process.exit(0);
    });
    setTimeout(() => {
        console.warn('[Shutdown] Forcing shutdown after timeout.');
        process.exit(0);
    }, 10000).unref();
}
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (error) => {
    console.error('[Process] Uncaught Exception:', error?.message || error);
});
//# sourceMappingURL=server.js.map