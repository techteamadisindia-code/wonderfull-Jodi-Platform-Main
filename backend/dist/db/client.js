"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.generateObjectId = generateObjectId;
exports.toClient = toClient;
exports.toClientArray = toClientArray;
exports.testSqlConnection = testSqlConnection;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
function getOptimizedDatabaseUrl() {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl)
        return undefined;
    try {
        const url = new URL(rawUrl);
        // Ensure connection_limit is at most 4 to respect Hostinger's concurrent connection cap
        const currentLimit = parseInt(url.searchParams.get('connection_limit') || '10', 10);
        if (isNaN(currentLimit) || currentLimit > 4) {
            url.searchParams.set('connection_limit', '4');
        }
        if (!url.searchParams.has('connect_timeout')) {
            url.searchParams.set('connect_timeout', '30');
        }
        if (!url.searchParams.has('pool_timeout')) {
            url.searchParams.set('pool_timeout', '30');
        }
        return url.toString();
    }
    catch {
        return rawUrl;
    }
}
const dbUrl = getOptimizedDatabaseUrl();
exports.prisma = globalThis.prisma ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    });
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = exports.prisma;
}
/**
 * Generate a 24-character hexadecimal ID conforming to MongoDB ObjectId format.
 * Ensures existing frontends, validation regex, and URL params remain 100% compatible.
 */
function generateObjectId() {
    return crypto_1.default.randomBytes(12).toString('hex');
}
/**
 * Ensures any SQL record provides both `_id` and `id` for frontend contract compatibility.
 */
function toClient(record) {
    if (!record)
        return null;
    const id = record.id || record._id || '';
    return {
        ...record,
        _id: id,
        id: id,
    };
}
/**
 * Maps an array of records to include both `_id` and `id`.
 */
function toClientArray(records) {
    return records.map((r) => toClient(r));
}
/**
 * Tests direct connection to Hostinger MySQL / MariaDB database.
 * Includes a 3-second timeout to ensure health checks never hang the process.
 */
async function testSqlConnection(timeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000) {
    try {
        const queryPromise = exports.prisma.$queryRaw `SELECT VERSION() as version, DATABASE() as dbName;`;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Database connection check timed out after ${timeoutMs}ms`)), timeoutMs));
        const result = await Promise.race([queryPromise, timeoutPromise]);
        const version = result?.[0]?.version || 'Unknown';
        const dbName = result?.[0]?.dbName || 'Unknown';
        return {
            success: true,
            message: `Connected successfully to database "${dbName}" (Server Version: ${version})`,
            version,
        };
    }
    catch (err) {
        return {
            success: false,
            message: err?.message || 'Failed to connect to MySQL database',
        };
    }
}
//# sourceMappingURL=client.js.map