"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHostLanIp = getHostLanIp;
const app_1 = __importDefault(require("./app"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const os_1 = __importDefault(require("os"));
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
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
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
 * Start Express server
 */
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
    console.log('Backend:');
    console.log(`  Local: http://localhost:${PORT}`);
    console.log(`  LAN:   http://${lanIp}:${PORT}`);
    console.log('Production:');
    console.log('  https://wonderfuljodi.com');
    console.log('API Health:');
    console.log('  https://wonderfuljodi.com/api/health');
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
process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (error) => {
    console.error('[Process] Uncaught Exception:', error?.message || error);
});
//# sourceMappingURL=server.js.map