import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
<<<<<<< HEAD
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
=======
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
import { connectDatabase } from './config/database';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import searchRoutes from './routes/searchRoutes';
import interestRoutes from './routes/interestRoutes';
import shortlistRoutes from './routes/shortlistRoutes';
import notificationRoutes from './routes/notificationRoutes';
import membershipRoutes from './routes/membershipRoutes';
<<<<<<< HEAD
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminRoutes from './routes/adminRoutes';
import contactRoutes from './routes/contactRoutes';
import uploadRoutes from './routes/uploadRoutes';
import messageRoutes from './routes/messageRoutes';
import blockRoutes from './routes/blockRoutes';
import reportRoutes from './routes/reportRoutes';
import configRoutes from './routes/configRoutes';
import paymentRoutes from './routes/paymentRoutes';
import registrationRoutes from './routes/registrationRoutes';
import kundaliRoutes from './routes/kundaliRoutes';
import locationRoutes from './routes/locationRoutes';
import communityMasterRoutes from './routes/communityMasterRoutes';
import adminMasterDataRoutes from './routes/adminMasterDataRoutes';
import biodataRoutes from './routes/biodataRoutes';
import membershipPlanRoutes from './routes/membershipPlanRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import contactRequestRoutes from './routes/contactRequestRoutes';
import contactAccessRoutes from './routes/contactAccessRoutes';
import { globalLimiter } from './middleware/rateLimiters';
import { errorHandler } from './middleware/errorHandler';
import { checkMaintenanceMode } from './middleware/maintenanceMiddleware';
=======
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './middleware/errorHandler';
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1

dotenv.config();

const app = express();

<<<<<<< HEAD
// ─── SECURITY HTTP HEADERS ───
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    hidePoweredBy: true,
  })
);

// ─── CORS CONFIGURATION ───
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://wonderfuljodi.com',
  'https://www.wonderfuljodi.com',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      
      // Allow configured origins or local LAN IP pattern for dev
      const isAllowedExplicit = allowedOrigins.includes(origin);
      const isLocalNetworkDev =
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        );

      if (isAllowedExplicit || isLocalNetworkDev) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

import verificationRoutes from './routes/verificationRoutes';

// Serve uploaded profile photos statically (verifications are stored privately and streamed via /api/verifications/document/:filename)
app.use('/uploads/profiles', express.static(path.join(process.cwd(), 'uploads', 'profiles')));

// Health check endpoints
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global Rate Limiter
app.use(globalLimiter);

// Public Config Endpoints (e.g. maintenance status)
app.use('/api/config', configRoutes);

// Maintenance Mode Gatekeeper
app.use(checkMaintenanceMode);

// ─── APPLICATION ROUTES ───
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/matches', searchRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/shortlists', shortlistRoutes);
app.use('/api/shortlist', shortlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/membership-plans', membershipPlanRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/contact-requests', contactRequestRoutes);
app.use('/api/contact-access', contactAccessRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/kundali', kundaliRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/community', communityMasterRoutes);
app.use('/api/admin/master-data', adminMasterDataRoutes);
app.use('/api/biodata', biodataRoutes);

// Centralized Error Handler
=======
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('tiny'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/shortlists', shortlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/admin', adminRoutes);

>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
app.use(errorHandler);

connectDatabase()
  .then(() => console.log('MongoDB connected'))
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

export default app;
