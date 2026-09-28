"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const seed_1 = require("./seed");
const client_1 = require("../db/client");
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/wonderfuljodi';
const DATABASE_URL = process.env.DATABASE_URL;
async function connectDatabase() {
    const isProduction = process.env.NODE_ENV === 'production';
    // 1. Verify SQL Connection if DATABASE_URL is configured
    if (DATABASE_URL) {
        try {
            const sqlStatus = await (0, client_1.testSqlConnection)();
            if (sqlStatus.success) {
                console.log('──────────────────────────────────────────────────');
                console.log(`[MySQL] ✅ ${sqlStatus.message}`);
                console.log('──────────────────────────────────────────────────');
            }
            else {
                console.warn('──────────────────────────────────────────────────');
                console.warn(`[MySQL] ⚠️  Connection failed: ${sqlStatus.message}`);
                console.warn('[MySQL] If connecting remotely, whitelist your IP in');
                console.warn('        hPanel > Databases > Remote MySQL');
                console.warn('──────────────────────────────────────────────────');
                if (isProduction) {
                    throw new Error(`Production SQL Database unavailable: ${sqlStatus.message}`);
                }
            }
        }
        catch (sqlErr) {
            console.error('[MySQL] ❌ Connection error:', sqlErr.message);
            if (isProduction) {
                throw sqlErr;
            }
        }
    }
    else {
        console.warn('[MySQL] ⚠️  DATABASE_URL not set — skipping MySQL connection');
    }
    // 2. Connect to MongoDB (Source / Transition Layer)
    try {
        const conn = await mongoose_1.default.connect(MONGODB_URI, {
            autoIndex: true,
            serverSelectionTimeoutMS: 2500,
        });
        console.log('[MongoDB] Connected successfully');
        await (0, seed_1.seedInitialData)();
        return conn;
    }
    catch (err) {
        if (isProduction) {
            console.error('[Database Error] Production database connection failed:', err.message);
            // Safety Rule: Production must fail cleanly without in-memory fallback!
            throw new Error(`Production database connection failed: ${err.message}`);
        }
        console.warn('[MongoDB] Local MongoDB connection failed. Initializing development in-memory server...');
        try {
            const { MongoMemoryServer } = await Promise.resolve().then(() => __importStar(require('mongodb-memory-server')));
            const mongoServer = await MongoMemoryServer.create();
            const uri = mongoServer.getUri();
            const conn = await mongoose_1.default.connect(uri, { autoIndex: true });
            console.log(`[MongoDB] In-memory MongoDB started and connected at ${uri}`);
            await (0, seed_1.seedInitialData)();
            return conn;
        }
        catch (fallbackErr) {
            console.error('Failed to start in-memory MongoDB:', fallbackErr);
            throw fallbackErr;
        }
    }
}
//# sourceMappingURL=database.js.map