import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';

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

import { globalLimiter } from './middleware/rateLimiters';
import { errorHandler } from './middleware/errorHandler';
import { checkMaintenanceMode } from './middleware/maintenanceMiddleware';

dotenv.config();

const app = express();

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
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
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
| NEXT.JS FRONTEND PROXY
|--------------------------------------------------------------------------
|
| Express = public server
|
| Express PORT:
|     3000
|
| Next.js:
|     3001
|
| API requests remain inside Express.
|
| Everything else is forwarded to Next.js.
|--------------------------------------------------------------------------
*/

const FRONTEND_PORT =
  Number(
    process.env.FRONTEND_PORT
  ) || 3001;

app.use(
  (req, res, next) => {

    /*
     * Do NOT proxy API/upload/socket/health.
     */
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io') ||
      req.path === '/health'
    ) {
      return next();
    }

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',

      port: FRONTEND_PORT,

      path:
        req.originalUrl ||
        req.url,

      method: req.method,

      headers: {
        ...req.headers,

        host:
          `127.0.0.1:${FRONTEND_PORT}`,

        'x-forwarded-for':
          (req.headers[
            'x-forwarded-for'
          ] as string) ||
          req.ip ||
          req.socket.remoteAddress ||
          '',

        'x-forwarded-proto':
          process.env.NODE_ENV ===
          'production'
            ? 'https'
            : 'http',

        'x-forwarded-host':
          req.headers.host ||
          'wonderfuljodi.com',
      },
    };

    const proxyReq =
      http.request(
        options,
        (proxyRes) => {

          res.writeHead(
            proxyRes.statusCode ||
              200,
            proxyRes.headers
          );

          proxyRes.pipe(
            res,
            {
              end: true,
            }
          );
        }
      );

    proxyReq.on(
      'error',
      (error) => {

        console.error(
          '[Next.js Proxy] Error:',
          error.message
        );

        if (
          !res.headersSent
        ) {
          res
            .status(503)
            .send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width,initial-scale=1">
  <title>Wonderful Jodi</title>

  <style>
    body {
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        sans-serif;

      display: flex;
      align-items: center;
      justify-content: center;

      min-height: 100vh;

      margin: 0;

      background: #fff5f7;

      color: #333;
    }

    .card {
      background: white;

      padding: 40px 50px;

      border-radius: 16px;

      box-shadow:
        0 10px 30px
        rgba(0,0,0,0.08);

      text-align: center;

      max-width: 480px;
    }

    h1 {
      color: #e11d48;

      margin-bottom: 12px;

      font-size: 24px;

      font-weight: 700;
    }

    p {
      color: #666;

      line-height: 1.6;

      margin-bottom: 20px;

      font-size: 15px;
    }

    .spinner {
      width: 36px;
      height: 36px;

      border: 4px solid #fecdd3;

      border-top-color: #e11d48;

      border-radius: 50%;

      animation:
        spin 1s infinite linear;

      margin:
        0 auto 20px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }

      100% {
        transform: rotate(360deg);
      }
    }
  </style>
</head>

<body>

  <div class="card">

    <div class="spinner"></div>

    <h1>Wonderful Jodi</h1>

    <p>
      The platform services are
      initializing.
      Please try again in a few seconds.
    </p>

  </div>

</body>
</html>
            `);
        }
      }
    );

    req.pipe(
      proxyReq,
      {
        end: true,
      }
    );
  }
);

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

    /*
     * IMPORTANT:
     * Do not silently continue with a broken
     * production database.
     */
    if (
      process.env.NODE_ENV ===
      'production'
    ) {
      process.nextTick(() => {
        process.exit(1);
      });
    }
  });

export default app;
