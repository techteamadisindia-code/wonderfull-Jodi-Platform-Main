"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const database_1 = require("./config/database");
const client_1 = require("./db/client");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const interestRoutes_1 = __importDefault(require("./routes/interestRoutes"));
const shortlistRoutes_1 = __importDefault(require("./routes/shortlistRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const membershipRoutes_1 = __importDefault(require("./routes/membershipRoutes"));
const adminAuthRoutes_1 = __importDefault(require("./routes/adminAuthRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const blockRoutes_1 = __importDefault(require("./routes/blockRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const configRoutes_1 = __importDefault(require("./routes/configRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const registrationRoutes_1 = __importDefault(require("./routes/registrationRoutes"));
const kundaliRoutes_1 = __importDefault(require("./routes/kundaliRoutes"));
const locationRoutes_1 = __importDefault(require("./routes/locationRoutes"));
const communityMasterRoutes_1 = __importDefault(require("./routes/communityMasterRoutes"));
const adminMasterDataRoutes_1 = __importDefault(require("./routes/adminMasterDataRoutes"));
const biodataRoutes_1 = __importDefault(require("./routes/biodataRoutes"));
const membershipPlanRoutes_1 = __importDefault(require("./routes/membershipPlanRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const contactRequestRoutes_1 = __importDefault(require("./routes/contactRequestRoutes"));
const contactAccessRoutes_1 = __importDefault(require("./routes/contactAccessRoutes"));
const campaignRoutes_1 = __importDefault(require("./routes/campaignRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const referralRoutes_1 = __importDefault(require("./routes/referralRoutes"));
const adminContactInquiryRoutes_1 = __importDefault(require("./routes/adminContactInquiryRoutes"));
const verificationRoutes_1 = __importDefault(require("./routes/verificationRoutes"));
const careerRoutes_1 = require("./routes/careerRoutes");
const careerController_1 = require("./controllers/careerController");
const blogRoutes_1 = require("./routes/blogRoutes");
const blogController_1 = require("./controllers/blogController");
const awardRoutes_1 = require("./routes/awardRoutes");
const awardController_1 = require("./controllers/awardController");
const institutionRoutes_1 = __importDefault(require("./routes/institutionRoutes"));
const institutionController_1 = require("./controllers/institutionController");
const seed_1 = require("./config/seed");
const rateLimiters_1 = require("./middleware/rateLimiters");
const errorHandler_1 = require("./middleware/errorHandler");
const maintenanceMiddleware_1 = require("./middleware/maintenanceMiddleware");
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), 'backend', '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '..', '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '..', '..', '.env') });
const app = (0, express_1.default)();
/*
|--------------------------------------------------------------------------
| SECURITY HEADERS
|--------------------------------------------------------------------------
*/
app.use((0, helmet_1.default)({
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
}));
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
].filter(Boolean);
app.use((0, cors_1.default)({
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
        const isAllowedExplicit = allowedOrigins.includes(origin);
        /*
         * Local development network
         */
        const isLocalNetworkDev = process.env.NODE_ENV !== 'production' &&
            /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
        if (isAllowedExplicit ||
            isLocalNetworkDev) {
            return callback(null, true);
        }
        /*
         * Reject unknown browser origins
         */
        return callback(new Error(`CORS origin not allowed: ${origin}`));
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
}));
/*
|--------------------------------------------------------------------------
| BODY PARSERS
|--------------------------------------------------------------------------
*/
app.use(express_1.default.json({
    limit: '10mb',
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb',
}));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production'
    ? 'combined'
    : 'dev'));
/*
|--------------------------------------------------------------------------
| STATIC UPLOADS
|--------------------------------------------------------------------------
*/
app.use('/uploads/profiles', express_1.default.static(path_1.default.join(process.cwd(), 'uploads', 'profiles')));
app.use('/uploads/blogs', express_1.default.static(path_1.default.join(process.cwd(), 'uploads', 'blogs')));
app.use('/uploads/awards', express_1.default.static(path_1.default.join(process.cwd(), 'uploads', 'awards')));
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
app.get('/api/health', async (_req, res) => {
    try {
        const sqlStatus = await (0, client_1.testSqlConnection)();
        return res.status(sqlStatus.success ? 200 : 503).json({
            status: sqlStatus.success
                ? 'ok'
                : 'degraded',
            timestamp: new Date().toISOString(),
            database: {
                mysql: sqlStatus.success
                    ? 'connected'
                    : 'disconnected',
                message: sqlStatus.message,
                version: sqlStatus.version || null,
            },
        });
    }
    catch (error) {
        return res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            database: {
                mysql: 'disconnected',
                message: error?.message ||
                    'Database connection failed',
                version: null,
            },
        });
    }
});
/*
|--------------------------------------------------------------------------
| SIMPLE SERVER HEALTH
|--------------------------------------------------------------------------
*/
app.get('/health', async (_req, res) => {
    try {
        const sqlStatus = await (0, client_1.testSqlConnection)();
        return res.status(sqlStatus.success ? 200 : 503).json({
            status: sqlStatus.success
                ? 'ok'
                : 'degraded',
            timestamp: new Date().toISOString(),
            database: {
                mysql: sqlStatus.success
                    ? 'connected'
                    : 'disconnected',
                message: sqlStatus.message,
            },
        });
    }
    catch (error) {
        return res.status(503).json({
            status: 'degraded',
            database: {
                mysql: 'disconnected',
                message: error?.message ||
                    'Database connection failed',
            },
        });
    }
});
/*
|--------------------------------------------------------------------------
| GLOBAL RATE LIMITER
|--------------------------------------------------------------------------
*/
app.use(rateLimiters_1.globalLimiter);
/*
|--------------------------------------------------------------------------
| PUBLIC CONFIG
|--------------------------------------------------------------------------
*/
app.use('/api/config', configRoutes_1.default);
/*
|--------------------------------------------------------------------------
| MAINTENANCE MODE
|--------------------------------------------------------------------------
*/
app.use(maintenanceMiddleware_1.checkMaintenanceMode);
/*
|--------------------------------------------------------------------------
| APPLICATION API ROUTES
|--------------------------------------------------------------------------
*/
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin/auth', adminAuthRoutes_1.default);
app.use('/api/profiles', profileRoutes_1.default);
app.use('/api/profile', profileRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/conversations', messageRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/verifications', verificationRoutes_1.default);
app.use('/api/search', searchRoutes_1.default);
app.use('/api/matches', searchRoutes_1.default);
app.use('/api/interests', interestRoutes_1.default);
app.use('/api/shortlists', shortlistRoutes_1.default);
app.use('/api/shortlist', shortlistRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/memberships', membershipRoutes_1.default);
app.use('/api/membership-plans', membershipPlanRoutes_1.default);
app.use('/api/campaigns', campaignRoutes_1.default);
app.use('/api/coupons', couponRoutes_1.default);
app.use('/api/referrals', referralRoutes_1.default);
app.use('/api/subscription', subscriptionRoutes_1.default);
app.use('/api/contact-requests', contactRequestRoutes_1.default);
app.use('/api/contact-access', contactAccessRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/registration', registrationRoutes_1.default);
app.use('/api/registrations', registrationRoutes_1.default);
app.use('/api/institutions', institutionRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/contact', contactRoutes_1.default);
app.use('/api/blocks', blockRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/report', reportRoutes_1.default);
app.use('/api/kundali', kundaliRoutes_1.default);
app.use('/api/locations', locationRoutes_1.default);
app.use('/api/master-data', locationRoutes_1.default);
app.use('/api/community', communityMasterRoutes_1.default);
app.use('/api/admin/master-data', adminMasterDataRoutes_1.default);
app.use('/api/biodata', biodataRoutes_1.default);
app.use('/api/careers', careerRoutes_1.publicCareerRouter);
app.use('/api/admin/careers', careerRoutes_1.adminCareerRouter);
app.use('/api/blogs', blogRoutes_1.publicBlogRouter);
app.use('/api/admin/blogs', blogRoutes_1.adminBlogRouter);
app.use('/api/awards', awardRoutes_1.publicAwardRouter);
app.use('/api/admin/contact-inquiries', adminContactInquiryRoutes_1.default);
app.use('/api/admin/awards', awardRoutes_1.adminAwardRouter);
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
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 3001;
app.use((req, res, next) => {
    /*
     * Do NOT proxy API/upload/socket/health.
     */
    if (req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/socket.io') ||
        req.path === '/health') {
        return next();
    }
    const options = {
        hostname: '127.0.0.1',
        port: FRONTEND_PORT,
        path: req.originalUrl ||
            req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: `127.0.0.1:${FRONTEND_PORT}`,
            'x-forwarded-for': req.headers['x-forwarded-for'] ||
                req.ip ||
                req.socket.remoteAddress ||
                '',
            'x-forwarded-proto': process.env.NODE_ENV ===
                'production'
                ? 'https'
                : 'http',
            'x-forwarded-host': req.headers.host ||
                'wonderfuljodi.com',
        },
    };
    const proxyReq = http_1.default.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode ||
            200, proxyRes.headers);
        proxyRes.pipe(res, {
            end: true,
        });
    });
    proxyReq.on('error', (error) => {
        console.error('[Next.js Proxy] Error:', error.message);
        if (!res.headersSent) {
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
    });
    req.pipe(proxyReq, {
        end: true,
    });
});
/*
|--------------------------------------------------------------------------
| CENTRAL ERROR HANDLER
|--------------------------------------------------------------------------
*/
app.use(errorHandler_1.errorHandler);
/*
|--------------------------------------------------------------------------
| DATABASE INITIALIZATION
|--------------------------------------------------------------------------
|
| MySQL / Prisma only.
|--------------------------------------------------------------------------
*/
(0, database_1.connectDatabase)()
    .then(async () => {
    console.log('[Database] ✅ MySQL/Prisma initialized successfully');
    /*
     * Default application data.
     *
     * These functions must use Prisma/MySQL.
     */
    try {
        await (0, seed_1.ensureAdminUserExists)();
        await (0, careerController_1.seedDefaultCareersIfEmpty)();
        await (0, blogController_1.seedDefaultBlogsIfEmpty)();
        await (0, awardController_1.seedDefaultAwardsIfEmpty)();
        await (0, institutionController_1.seedDefaultInstitutionsIfEmpty)();
        console.log('[Seed] Default data initialization completed');
    }
    catch (seedError) {
        console.error('[Seed] Default data initialization failed:', seedError?.message ||
            seedError);
    }
})
    .catch((error) => {
    console.error('[Database] ❌ Production database initialization failed:', error?.message ||
        error);
    console.warn('[Database] ⚠️ Server will remain running in degraded mode to serve health/error statuses. Please update DATABASE_URL with valid credentials.');
});
exports.default = app;
//# sourceMappingURL=app.js.map