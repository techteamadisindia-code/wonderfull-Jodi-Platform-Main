"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLog = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const securityLogSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', index: true },
    identifier: { type: String, trim: true, index: true },
    eventType: {
        type: String,
        required: true,
        enum: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGOUT',
            'LOGOUT_ALL',
            'TOKEN_REFRESHED',
            'TOKEN_REUSE_DETECTED',
            'PASSWORD_CHANGE',
            'PASSWORD_RESET_REQUESTED',
            'PASSWORD_RESET_SUCCESS',
            'PROFILE_UPDATE',
            'ADMIN_ACTION',
            'SUSPICIOUS_ACTIVITY',
        ],
        index: true,
    },
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS', index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: prismaBridge_1.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });
// TTL index to automatically purge old logs after 90 days
securityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
exports.SecurityLog = (0, prismaBridge_1.createPrismaModelAdapter)('securityLog', { "user": "userId" });
//# sourceMappingURL=SecurityLog.js.map