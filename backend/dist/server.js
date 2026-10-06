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
const app_1 = __importStar(require("./app"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("./db/client");
const emailService_1 = require("./services/emailService");
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
 * Socket events
 */
io.on('connection', (socket) => {
    console.log('[Socket.IO] Connected:', socket.id);
    socket.on('joinRoom', (room) => {
        if (room) {
            socket.join(room);
        }
    });
    socket.on('sendMessage', (payload) => {
        if (!payload?.room) {
            return;
        }
        io
            .to(payload.room)
            .emit('receiveMessage', payload);
    });
    socket.on('disconnect', (reason) => {
        console.log('[Socket.IO] Disconnected:', socket.id, reason);
    });
});
/**
 * Start Server (Next.js in-process + Express)
 */
async function startServer() {
    const isProduction = process.env.NODE_ENV === 'production';
    const resolvedFrontendDir = fs_1.default.existsSync(path_1.default.resolve(__dirname, '../../frontend'))
        ? path_1.default.resolve(__dirname, '../../frontend')
        : path_1.default.resolve(process.cwd(), 'frontend');
    const nextBuildDir = path_1.default.join(resolvedFrontendDir, '.next');
    // In production or whenever prebuilt frontend exists, mount Next.js in-process
    if (isProduction || fs_1.default.existsSync(nextBuildDir)) {
        try {
            console.log('[Next.js] Preparing in-process Next.js server...');
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
    else {
        console.log('[Next.js] In-process Next.js skipped (dev mode without production build).');
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
        console.log('Unified Server:');
        console.log(`  Local: http://localhost:${PORT}`);
        console.log(`  LAN:   http://${lanIp}:${PORT}`);
        console.log('API Health:');
        console.log(`  http://localhost:${PORT}/api/health`);
        console.log('Email / SMTP:');
        try {
            const smtpStatus = await (0, emailService_1.verifyEmailTransporter)();
            if (smtpStatus.success) {
                console.log(`  Status: ACTIVE (${smtpStatus.message})`);
            }
            else {
                console.log(`  Status: NOT CONFIGURED (${smtpStatus.message})`);
            }
        }
        catch (error) {
            console.log(`  Status: NOT CONFIGURED (${error?.message || 'SMTP unavailable'})`);
        }
        console.log('==================================================');
        console.log('');
    });
}
startServer();
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