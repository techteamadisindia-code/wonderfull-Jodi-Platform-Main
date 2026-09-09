import app from './app';
<<<<<<< HEAD
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const server = createServer(app);

// Helper to detect host machine's active LAN IPv4 address
export function getHostLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name] || [];
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        // Prioritize Wi-Fi or Ethernet LAN ranges
        if (
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(net.address)
        ) {
          return net.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://wonderfuljodi.com',
  'https://www.wonderfuljodi.com',
].filter(Boolean) as string[];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowedExplicit = allowedOrigins.includes(origin);
      const isLocalNetworkDev =
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        );

      if (isAllowedExplicit || isLocalNetworkDev) {
        return callback(null, true);
      }
      return callback(new Error('CORS Not Allowed by Socket.IO'));
    },
=======
import http from 'http';
import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 5000;
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

<<<<<<< HEAD
app.set('io', io);

=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinRoom', (room) => {
    socket.join(room);
  });

  socket.on('sendMessage', (payload) => {
    io.to(payload.room).emit('receiveMessage', payload);
  });
});

<<<<<<< HEAD
import { verifyEmailTransporter } from './services/emailService';

server.listen(PORT, HOST, async () => {
  const lanIp = getHostLanIp();
  console.log('\n==================================================');
  console.log('       WONDERFUL JODI FULLSTACK PLATFORM          ');
  console.log('==================================================');
  console.log('Frontend:');
  console.log(`  Local: http://localhost:3000`);
  console.log(`  LAN:   http://${lanIp}:3000`);
  console.log('Backend:');
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  LAN:   http://${lanIp}:${PORT}`);
  console.log('Email / SMTP:');
  const smtpStatus = await verifyEmailTransporter();
  if (smtpStatus.success) {
    console.log(`  Status: ACTIVE (${smtpStatus.message})`);
  } else {
    console.log(`  Status: NOT CONFIGURED (${smtpStatus.message})`);
  }
  console.log('==================================================\n');
});

=======
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
