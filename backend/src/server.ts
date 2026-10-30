import './config/env';
import app, { registerNextHandler } from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { prisma } from './db/client';
import { verifyEmailTransporter, getEmailConfigDiagnostics } from './services/emailService';
import { restoreAllMissingProfilePhotos } from './services/profilePhotoRecoveryService';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer(app);

/**
 * Helper to detect host machine LAN IPv4 address.
 * Used only for development/local logging.
 */
export function getHostLanIp(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name] || [];

    for (const net of netList) {
      if (
        net.family === 'IPv4' &&
        !net.internal
      ) {
        if (
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(
            net.address
          )
        ) {
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
].filter(Boolean) as string[];

/**
 * Socket.IO
 */
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow server-to-server / tools without Origin
      if (!origin) {
        return callback(null, true);
      }

      const isAllowedExplicit =
        allowedOrigins.includes(origin);

      const isLocalNetworkDev =
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        );

      if (
        isAllowedExplicit ||
        isLocalNetworkDev
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS Not Allowed by Socket.IO: ${origin}`
        )
      );
    },

    methods: ['GET', 'POST'],

    credentials: true,
  },
});

app.set('io', io);

/**
 * Socket events
 */
io.on('connection', (socket) => {
  console.log(
    '[Socket.IO] Connected:',
    socket.id
  );

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
      .emit(
        'receiveMessage',
        payload
      );
  });

  socket.on('disconnect', (reason) => {
    console.log(
      '[Socket.IO] Disconnected:',
      socket.id,
      reason
    );
  });
});

/**
 * Start Server (Next.js in-process + Express)
 */
async function startServer() {
  const isDevProcess = Boolean(process.env.TS_NODE_DEV) || process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production' && !isDevProcess;
  const resolvedFrontendDir = fs.existsSync(path.resolve(__dirname, '../../frontend'))
    ? path.resolve(__dirname, '../../frontend')
    : path.resolve(process.cwd(), 'frontend');
  const nextBuildDir = path.join(resolvedFrontendDir, '.next');
  const hasProductionBuild = fs.existsSync(path.join(nextBuildDir, 'BUILD_ID'));

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
      registerNextHandler(nextApp.getRequestHandler());
      console.log('[Next.js] ✅ Next.js app prepared and integrated into Express server.');
    } catch (err: any) {
      console.error('[Next.js] ❌ Failed to initialize Next.js in-process:', err.message || err);
    }
  } else if (isProduction && !hasProductionBuild) {
    console.log('[Next.js] In-process Next.js skipped: No production build found in frontend/.next (run "npm run build" to generate).');
  } else {
    console.log('[Next.js] In-process Next.js skipped (development mode: frontend runs standalone via "next dev" on port 3000).');
  }

  server.listen(PORT, HOST, async () => {
    const lanIp = getHostLanIp();

    console.log('');
    console.log(
      '=================================================='
    );
    console.log(
      '       WONDERFUL JODI FULLSTACK PLATFORM'
    );
    console.log(
      '=================================================='
    );

    console.log('Environment:');
    console.log(
      `  NODE_ENV: ${process.env.NODE_ENV || 'development'}`
    );

    console.log('Server:');
    console.log(
      `  Host: ${HOST}`
    );
    console.log(
      `  Port: ${PORT}`
    );

    if (isProduction && hasProductionBuild) {
      console.log('Unified Server:');
      console.log(
        `  Local: http://localhost:${PORT}`
      );
      console.log(
        `  LAN:   http://${lanIp}:${PORT}`
      );
    } else {
      console.log('Backend API Server:');
      console.log(
        `  Local: http://localhost:${PORT}`
      );
      console.log(
        `  LAN:   http://${lanIp}:${PORT}`
      );
    }

    console.log('API Health:');
    console.log(
      `  http://localhost:${PORT}/api/health`
    );

    console.log('Email / SMTP Diagnostics:');

    try {
      const diag = getEmailConfigDiagnostics();
      console.log(`  EMAIL_HOST:    ${diag.hostPresent ? '[CONFIGURED]' : '[MISSING]'}`);
      console.log(`  EMAIL_PORT:    ${diag.port} (secure: ${diag.secure})`);
      console.log(`  EMAIL_USER:    ${diag.userPresent ? '[CONFIGURED]' : '[MISSING]'}`);
      console.log(`  EMAIL_PASS:    ${diag.passPresent ? '[CONFIGURED]' : '[MISSING]'}`);
      console.log(`  EMAIL_FROM:    ${diag.senderStatus}`);

      const smtpStatus = await verifyEmailTransporter();

      if (smtpStatus.success) {
        console.log(`  Status:        ACTIVE (${smtpStatus.message})`);
      } else {
        console.log(`  Status:        NOT CONFIGURED / FAILED (${smtpStatus.message})`);
      }
    } catch (error: any) {
      console.log(
        `  Status:        ERROR (${error?.message || 'SMTP unavailable'})`
      );
    }

    console.log(
      '=================================================='
    );
    console.log('');

    // Asynchronously self-heal missing profile photos to canonical persistent storage
    restoreAllMissingProfilePhotos()
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

startServer();

/**
 * Graceful process cleanup
 */
function handleShutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('[Shutdown] HTTP server closed cleanly.');
    try {
      await prisma.$disconnect();
      console.log('[Shutdown] Database connection disconnected.');
    } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => {
    console.warn('[Shutdown] Forcing shutdown after timeout.');
    process.exit(0);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  console.error('[Process] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('[Process] Uncaught Exception:', error?.message || error);
});
