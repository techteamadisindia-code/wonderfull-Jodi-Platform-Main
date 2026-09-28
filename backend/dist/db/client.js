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
exports.prisma = globalThis.prisma ||
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
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
 */
async function testSqlConnection() {
    try {
        const result = await exports.prisma.$queryRaw `SELECT VERSION() as version, DATABASE() as dbName;`;
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
            message: err.message || 'Failed to connect to MySQL database',
        };
    }
}
//# sourceMappingURL=client.js.map