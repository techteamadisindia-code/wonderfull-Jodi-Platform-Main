import app from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';

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
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
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
 * Start Express server
 */
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

  console.log('Backend:');
  console.log(
    `  Local: http://localhost:${PORT}`
  );
  console.log(
    `  LAN:   http://${lanIp}:${PORT}`
  );

  console.log('Production:');
  console.log(
    '  https://wonderfuljodi.com'
  );

  console.log('API Health:');
  console.log(
    '  https://wonderfuljodi.com/api/health'
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
