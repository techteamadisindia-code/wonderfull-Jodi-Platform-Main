import app, { registerNextHandler } from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { prisma } from './db/client';
import { verifyEmailTransporter } from './services/emailService';

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
  const isProduction = process.env.NODE_ENV === 'production';
  const resolvedFrontendDir = fs.existsSync(path.resolve(__dirname, '../../frontend'))
    ? path.resolve(__dirname, '../../frontend')
    : path.resolve(process.cwd(), 'frontend');
  const nextBuildDir = path.join(resolvedFrontendDir, '.next');

  // In production or whenever prebuilt frontend exists, mount Next.js in-process
  if (isProduction || fs.existsSync(nextBuildDir)) {
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
      registerNextHandler(nextApp.getRequestHandler());
      console.log('[Next.js] ✅ Next.js app prepared and integrated into Express server.');
    } catch (err: any) {
      console.error('[Next.js] ❌ Failed to initialize Next.js in-process:', err.message || err);
    }
  } else {
    console.log('[Next.js] In-process Next.js skipped (dev mode without production build).');
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

    console.log('Unified Server:');
    console.log(
      `  Local: http://localhost:${PORT}`
    );
    console.log(
      `  LAN:   http://${lanIp}:${PORT}`
    );

    console.log('API Health:');
    console.log(
      `  http://localhost:${PORT}/api/health`
    );

    console.log('Email / SMTP:');

    try {
      const smtpStatus =
        await verifyEmailTransporter();

      if (smtpStatus.success) {
        console.log(
          `  Status: ACTIVE (${smtpStatus.message})`
        );
      } else {
        console.log(
          `  Status: NOT CONFIGURED (${smtpStatus.message})`
        );
      }
    } catch (error: any) {
      console.log(
        `  Status: NOT CONFIGURED (${error?.message || 'SMTP unavailable'})`
      );
    }

    console.log(
      '=================================================='
    );
    console.log('');
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
