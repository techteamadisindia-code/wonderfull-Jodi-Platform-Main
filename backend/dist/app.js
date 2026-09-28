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
const careerRoutes_1 = require("./routes/careerRoutes");
const careerController_1 = require("./controllers/careerController");
const blogRoutes_1 = require("./routes/blogRoutes");
const blogController_1 = require("./controllers/blogController");
const awardRoutes_1 = require("./routes/awardRoutes");
const awardController_1 = require("./controllers/awardController");
const institutionRoutes_1 = __importDefault(require("./routes/institutionRoutes"));
const institutionController_1 = require("./controllers/institutionController");
const rateLimiters_1 = require("./middleware/rateLimiters");
const errorHandler_1 = require("./middleware/errorHandler");
const maintenanceMiddleware_1 = require("./middleware/maintenanceMiddleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
// ─── SECURITY HTTP HEADERS ───
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    hidePoweredBy: true,
}));
// ─── CORS CONFIGURATION ───
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://wonderfuljodi.com',
    'https://www.wonderfuljodi.com',
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin)
            return callback(null, true);
        // Allow configured origins or local LAN IP pattern for dev
        const isAllowedExplicit = allowedOrigins.includes(origin);
        const isLocalNetworkDev = process.env.NODE_ENV !== 'production' &&
            /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
        if (isAllowedExplicit || isLocalNetworkDev) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
const verificationRoutes_1 = __importDefault(require("./routes/verificationRoutes"));
// Serve uploaded profile photos, blog covers, and award logos statically
app.use('/uploads/profiles', express_1.default.static(path_1.default.join(process.cwd(), 'uploads', 'profiles')));
app.use('/uploads/blogs', express_1.default.static(path_1.default.join(process.cwd(), 'uploads', 'blogs')));
app.use('/uploads/awards', express_1.default.static(path_1.default.join(process.cwd(), 'uploads', 'awards')));
// Health check endpoints — tests real MySQL/MariaDB connectivity
const client_1 = require("./db/client");
app.get('/api/health', async (_, res) => {
    const sqlStatus = await (0, client_1.testSqlConnection)();
    res.json({
        status: sqlStatus.success ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: {
            mysql: sqlStatus.success ? 'connected' : 'disconnected',
            message: sqlStatus.message,
            version: sqlStatus.version || null,
        },
    });
});
app.get('/health', async (_, res) => {
    const sqlStatus = await (0, client_1.testSqlConnection)();
    res.json({
        status: sqlStatus.success ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: {
            mysql: sqlStatus.success ? 'connected' : 'disconnected',
            message: sqlStatus.message,
        },
    });
});
// Global Rate Limiter
app.use(rateLimiters_1.globalLimiter);
// Public Config Endpoints (e.g. maintenance status)
app.use('/api/config', configRoutes_1.default);
// Maintenance Mode Gatekeeper
app.use(maintenanceMiddleware_1.checkMaintenanceMode);
// ─── APPLICATION ROUTES ───
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
// ─── FRONTEND PROXY (Next.js Standalone) ───
// For any non-API, non-socket, non-upload request, proxy to Next.js server
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 3000;
app.use((req, res, next) => {
    if (req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/socket.io') ||
        req.path === '/health') {
        return next();
    }
    const options = {
        hostname: '127.0.0.1',
        port: FRONTEND_PORT,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: req.headers.host || 'localhost',
            'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress,
            'x-forwarded-proto': req.secure ? 'https' : 'http',
        },
    };
    const proxyReq = http_1.default.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', () => {
        if (!res.headersSent) {
            res.status(503).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="3">
  <title>Wonderful Jodi — Initializing</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff5f7; color: #333; }
    .card { background: white; padding: 40px 50px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 480px; }
    h1 { color: #e11d48; margin-bottom: 12px; font-size: 24px; font-weight: 700; }
    p { color: #666; line-height: 1.6; margin-bottom: 20px; font-size: 15px; }
    .spinner { width: 36px; height: 36px; border: 4px solid #fecdd3; border-top-color: #e11d48; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Wonderful Jodi</h1>
    <p>The platform services are initializing. This page will refresh automatically in a few seconds...</p>
  </div>
</body>
</html>`);
        }
    });
    req.pipe(proxyReq, { end: true });
});
// Centralized Error Handler
app.use(errorHandler_1.errorHandler);
(0, database_1.connectDatabase)()
    .then(async () => {
    console.log('MongoDB connected');
    await (0, careerController_1.seedDefaultCareersIfEmpty)();
    await (0, blogController_1.seedDefaultBlogsIfEmpty)();
    await (0, awardController_1.seedDefaultAwardsIfEmpty)();
    await (0, institutionController_1.seedDefaultInstitutionsIfEmpty)();
})
    .catch((error) => {
    console.error('Database connection failed (server running in degraded mode):', error);
});
exports.default = app;
//# sourceMappingURL=app.js.map