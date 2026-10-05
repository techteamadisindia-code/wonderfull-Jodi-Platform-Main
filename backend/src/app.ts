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
| NEXT.JS FRONTEND PROXY WITH STARTUP RETRY
|--------------------------------------------------------------------------
|
| Express = public server (port 3000)
| Next.js = internal standalone server (port 3001)
|
| API, uploads, socket.io, and health check requests remain in Express.
| Everything else is forwarded to Next.js.
|
| When Express starts immediately (to satisfy Hostinger's 3s listen limit),
| Next.js standalone process takes ~0.5–2 seconds to become ready.
| During this startup race, if Next.js returns ECONNREFUSED, the proxy
| retries every 200ms up to 4000ms instead of immediately failing with 503.
|--------------------------------------------------------------------------
*/

const FRONTEND_PORT =
  Number(process.env.FRONTEND_PORT) || 3001;

const PROXY_RETRY_INTERVAL_MS = 200;
const PROXY_MAX_WAIT_MS = 4000;

app.use(async (req, res, next) => {
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

  // Extract or buffer request body if present (for POST/PUT requests)
  let bodyBuffer: Buffer | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      if (req.is('application/json')) {
        bodyBuffer = Buffer.from(JSON.stringify(req.body));
      } else if (req.is('application/x-www-form-urlencoded')) {
        bodyBuffer = Buffer.from(new URLSearchParams(req.body as any).toString());
      }
    }
    // If body was not parsed by body-parser, buffer any unconsumed stream data with safety timeout
    if (!bodyBuffer && req.readable && !req.readableEnded) {
      bodyBuffer = await new Promise<Buffer | null>((resolve) => {
        const chunks: Buffer[] = [];
        const timer = setTimeout(() => resolve(chunks.length > 0 ? Buffer.concat(chunks) : null), 2000);
        req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.once('end', () => {
          clearTimeout(timer);
          resolve(chunks.length > 0 ? Buffer.concat(chunks) : null);
        });
        req.once('error', () => {
          clearTimeout(timer);
          resolve(null);
        });
      });
    }
  }

  const startTime = Date.now();
  let retryTimer: NodeJS.Timeout | null = null;
  let activeProxyReq: http.ClientRequest | null = null;
  let isDone = false;

  const cleanup = () => {
    isDone = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (activeProxyReq && !activeProxyReq.destroyed) {
      try {
        activeProxyReq.destroy();
      } catch (_) {}
      activeProxyReq = null;
    }
  };

  // Only cleanup if the client disconnected prematurely before response finished
  res.once('close', () => {
    if (!res.writableFinished) {
      cleanup();
    }
  });

  const send503Fallback = () => {
    if (res.headersSent || isDone) {
      return;
    }
    cleanup();

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(503).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="2">
  <title>Wonderful Jodi</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
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
      animation: spin 1s infinite linear;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
  <script>
    setTimeout(function() {
      window.location.reload();
    }, 2000);
  </script>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Wonderful Jodi</h1>
    <p>
      The platform services are initializing.
      Please try again in a few seconds.
    </p>
  </div>
</body>
</html>
    `);
  };

  const attempt = () => {
    if (isDone || res.writableEnded) {
      return;
    }

    const headers: http.OutgoingHttpHeaders = {
      ...req.headers,
      host: `127.0.0.1:${FRONTEND_PORT}`,
      'x-forwarded-for':
        (req.headers['x-forwarded-for'] as string) ||
        req.ip ||
        req.socket.remoteAddress ||
        '',
      'x-forwarded-proto':
        process.env.NODE_ENV === 'production' ? 'https' : 'http',
      'x-forwarded-host': req.headers.host || 'wonderfuljodi.com',
    };

    if (bodyBuffer) {
      headers['content-length'] = Buffer.byteLength(bodyBuffer);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      delete headers['content-length'];
    }

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: FRONTEND_PORT,
      path: req.originalUrl || req.url,
      method: req.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      isDone = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });

      proxyRes.once('end', () => {
        activeProxyReq = null;
      });
    });

    activeProxyReq = proxyReq;

    proxyReq.on('error', (error: any) => {
      if (isDone || res.writableEnded) {
        return;
      }

      const isConnectionError =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNRESET' ||
        error.code === 'EHOSTUNREACH';

      const elapsedTime = Date.now() - startTime;
      if (isConnectionError && elapsedTime < PROXY_MAX_WAIT_MS) {
        // Retry connection after interval
        retryTimer = setTimeout(() => {
          attempt();
        }, PROXY_RETRY_INTERVAL_MS);
      } else {
        console.error(
          `[Next.js Proxy] Error after ${elapsedTime}ms:`,
          error.message
        );
        send503Fallback();
      }
    });

    if (bodyBuffer) {
      proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
  };

  attempt();
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
