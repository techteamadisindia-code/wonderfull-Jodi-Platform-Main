import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import { connectDatabase } from './config/database';
import { testSqlConnection } from './db/client';

import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import searchRoutes from './routes/searchRoutes';
import interestRoutes from './routes/interestRoutes';
import shortlistRoutes from './routes/shortlistRoutes';
import notificationRoutes from './routes/notificationRoutes';
import membershipRoutes from './routes/membershipRoutes';
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
import campaignRoutes from './routes/campaignRoutes';
import couponRoutes from './routes/couponRoutes';
import referralRoutes from './routes/referralRoutes';
import adminContactInquiryRoutes from './routes/adminContactInquiryRoutes';
import verificationRoutes from './routes/verificationRoutes';

import {
  publicCareerRouter,
  adminCareerRouter,
} from './routes/careerRoutes';

import {
  seedDefaultCareersIfEmpty,
} from './controllers/careerController';

import {
  publicBlogRouter,
  adminBlogRouter,
} from './routes/blogRoutes';

import {
  seedDefaultBlogsIfEmpty,
} from './controllers/blogController';

import {
  publicAwardRouter,
  adminAwardRouter,
} from './routes/awardRoutes';

import {
  seedDefaultAwardsIfEmpty,
} from './controllers/awardController';

import institutionRoutes from './routes/institutionRoutes';

import {
  seedDefaultInstitutionsIfEmpty,
} from './controllers/institutionController';

import { ensureAdminUserExists } from './config/seed';

import { globalLimiter } from './middleware/rateLimiters';
import { errorHandler } from './middleware/errorHandler';
import { checkMaintenanceMode } from './middleware/maintenanceMiddleware';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const app = express();

/*
|--------------------------------------------------------------------------
| TRUST PROXY (HOSTINGER REVERSE PROXY)
|--------------------------------------------------------------------------
|
| In Hostinger production, traffic passes through a reverse proxy/load balancer
| which sets the X-Forwarded-For header. Trusting the first proxy hop ensures
| express-rate-limit and req.ip accurately reflect real client IP addresses.
|--------------------------------------------------------------------------
*/

app.set('trust proxy', 1);

/*
|--------------------------------------------------------------------------
| SECURITY HEADERS
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },

    frameguard: {
      action: 'sameorigin',
    },

    noSniff: true,

    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    hidePoweredBy: true,
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  process.env.FRONTEND_URL,

  'https://wonderfuljodi.com',
  'https://www.wonderfuljodi.com',

  // Development
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Requests without Origin:
       * curl, server-to-server, health checks, etc.
       */
      if (!origin) {
        return callback(null, true);
      }

      /*
       * Explicitly allowed domains
       */
      const isAllowedExplicit =
        allowedOrigins.includes(origin);

      /*
       * Local development network
       */
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

      /*
       * Reject unknown browser origins
       */
      return callback(
        new Error(
          `CORS origin not allowed: ${origin}`
        )
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Cache-Control',
      'Pragma',
    ],
  })
);

/*
|--------------------------------------------------------------------------
| BODY PARSERS
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

app.use(cookieParser());

app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : 'dev'
  )
);

/*
|--------------------------------------------------------------------------
| STATIC UPLOADS
|--------------------------------------------------------------------------
*/

app.use(
  '/uploads/profiles',
  express.static(
    path.join(
      process.cwd(),
      'uploads',
      'profiles'
    )
  )
);

app.use(
  '/uploads/blogs',
  express.static(
    path.join(
      process.cwd(),
      'uploads',
      'blogs'
    )
  )
);

app.use(
  '/uploads/awards',
  express.static(
    path.join(
      process.cwd(),
      'uploads',
      'awards'
    )
  )
);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This route is BEFORE maintenance middleware and
| before the global application routes.
|
| URL:
| https://wonderfuljodi.com/api/health
|
*/

app.get(
  '/api/health',
  async (_req, res) => {
    try {
      const sqlStatus =
        await testSqlConnection();

      return res.status(
        sqlStatus.success ? 200 : 503
      ).json({
        status: sqlStatus.success
          ? 'ok'
          : 'degraded',

        timestamp:
          new Date().toISOString(),

        database: {
          mysql: sqlStatus.success
            ? 'connected'
            : 'disconnected',

          message: sqlStatus.message,

          version:
            sqlStatus.version || null,
        },
      });
    } catch (error: any) {
      return res.status(503).json({
        status: 'degraded',

        timestamp:
          new Date().toISOString(),

        database: {
          mysql: 'disconnected',

          message:
            error?.message ||
            'Database connection failed',

          version: null,
        },
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| SIMPLE SERVER HEALTH
|--------------------------------------------------------------------------
*/

app.get(
  '/health',
  async (_req, res) => {
    try {
      const sqlStatus =
        await testSqlConnection();

      return res.status(
        sqlStatus.success ? 200 : 503
      ).json({
        status: sqlStatus.success
          ? 'ok'
          : 'degraded',

        timestamp:
          new Date().toISOString(),

        database: {
          mysql: sqlStatus.success
            ? 'connected'
            : 'disconnected',

          message: sqlStatus.message,
        },
      });
    } catch (error: any) {
      return res.status(503).json({
        status: 'degraded',

        database: {
          mysql: 'disconnected',

          message:
            error?.message ||
            'Database connection failed',
        },
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GLOBAL RATE LIMITER
|--------------------------------------------------------------------------
*/

app.use(globalLimiter);

/*
|--------------------------------------------------------------------------
| PUBLIC CONFIG
|--------------------------------------------------------------------------
*/

app.use(
  '/api/config',
  configRoutes
);

/*
|--------------------------------------------------------------------------
| MAINTENANCE MODE
|--------------------------------------------------------------------------
*/

app.use(checkMaintenanceMode);

/*
|--------------------------------------------------------------------------
| APPLICATION API ROUTES
|--------------------------------------------------------------------------
*/

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/admin/auth',
  adminAuthRoutes
);

app.use(
  '/api/profiles',
  profileRoutes
);

app.use(
  '/api/profile',
  profileRoutes
);

app.use(
  '/api/messages',
  messageRoutes
);

app.use(
  '/api/conversations',
  messageRoutes
);

app.use(
  '/api/upload',
  uploadRoutes
);

app.use(
  '/api/verifications',
  verificationRoutes
);

app.use(
  '/api/search',
  searchRoutes
);

app.use(
  '/api/matches',
  searchRoutes
);

app.use(
  '/api/interests',
  interestRoutes
);

app.use(
  '/api/shortlists',
  shortlistRoutes
);

app.use(
  '/api/shortlist',
  shortlistRoutes
);

app.use(
  '/api/notifications',
  notificationRoutes
);

app.use(
  '/api/memberships',
  membershipRoutes
);

app.use(
  '/api/membership-plans',
  membershipPlanRoutes
);

app.use(
  '/api/campaigns',
  campaignRoutes
);

app.use(
  '/api/coupons',
  couponRoutes
);

app.use(
  '/api/referrals',
  referralRoutes
);

app.use(
  '/api/subscription',
  subscriptionRoutes
);

app.use(
  '/api/contact-requests',
  contactRequestRoutes
);

app.use(
  '/api/contact-access',
  contactAccessRoutes
);

app.use(
  '/api/payments',
  paymentRoutes
);

app.use(
  '/api/registration',
  registrationRoutes
);

app.use(
  '/api/registrations',
  registrationRoutes
);

app.use(
  '/api/institutions',
  institutionRoutes
);

app.use(
  '/api/admin',
  adminRoutes
);

app.use(
  '/api/contact',
  contactRoutes
);

app.use(
  '/api/blocks',
  blockRoutes
);

app.use(
  '/api/reports',
  reportRoutes
);

app.use(
  '/api/report',
  reportRoutes
);

app.use(
  '/api/kundali',
  kundaliRoutes
);

app.use(
  '/api/locations',
  locationRoutes
);

app.use(
  '/api/master-data',
  locationRoutes
);

app.use(
  '/api/community',
  communityMasterRoutes
);

app.use(
  '/api/admin/master-data',
  adminMasterDataRoutes
);

app.use(
  '/api/biodata',
  biodataRoutes
);

app.use(
  '/api/careers',
  publicCareerRouter
);

app.use(
  '/api/admin/careers',
  adminCareerRouter
);

app.use(
  '/api/blogs',
  publicBlogRouter
);

app.use(
  '/api/admin/blogs',
  adminBlogRouter
);

app.use(
  '/api/awards',
  publicAwardRouter
);

app.use(
  '/api/admin/contact-inquiries',
  adminContactInquiryRoutes
);

app.use(
  '/api/admin/awards',
  adminAwardRouter
);

/*
|--------------------------------------------------------------------------
| NEXT.JS IN-PROCESS DELEGATION
|--------------------------------------------------------------------------
*/

type NextRequestHandler = (req: any, res: any) => Promise<any> | any;
let nextHandler: NextRequestHandler | null = null;

export function registerNextHandler(handler: NextRequestHandler) {
  nextHandler = handler;
}

// Serve precompiled Next.js static chunks directly with immutable cache
const resolvedFrontendDir = fs.existsSync(path.resolve(__dirname, '../../frontend'))
  ? path.resolve(__dirname, '../../frontend')
  : path.resolve(process.cwd(), 'frontend');
const nextStaticDir = path.join(resolvedFrontendDir, '.next', 'static');
if (fs.existsSync(nextStaticDir)) {
  app.use('/_next/static', express.static(nextStaticDir, { maxAge: '365d', immutable: true }));
}

// Unmatched /api/* routes return 404 JSON directly from Express, never falling through to Next.js
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Next.js fallback for SSR pages, dynamic routes, and assets
app.use((req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/socket.io') ||
    req.path === '/health'
  ) {
    return next();
  }

  if (nextHandler) {
    return nextHandler(req, res);
  }

  return next();
});

/*
|--------------------------------------------------------------------------
| CENTRAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| DATABASE INITIALIZATION
|--------------------------------------------------------------------------
|
| MySQL / Prisma only.
|--------------------------------------------------------------------------
*/

connectDatabase()
  .then(async () => {

    console.log(
      '[Database] ✅ MySQL/Prisma initialized successfully'
    );

    /*
     * Default application data.
     *
     * These functions must use Prisma/MySQL.
     */
    try {
      await ensureAdminUserExists();

      await seedDefaultCareersIfEmpty();

      await seedDefaultBlogsIfEmpty();

      await seedDefaultAwardsIfEmpty();

      await seedDefaultInstitutionsIfEmpty();

      console.log(
        '[Seed] Default data initialization completed'
      );
    } catch (seedError: any) {

      console.error(
        '[Seed] Default data initialization failed:',
        seedError?.message ||
          seedError
      );
    }
  })
  .catch((error) => {

    console.error(
      '[Database] ❌ Production database initialization failed:',
      error?.message ||
        error
    );

    console.warn(
      '[Database] ⚠️ Server will remain running in degraded mode to serve health/error statuses. Please update DATABASE_URL with valid credentials.'
    );
  });

export default app;
