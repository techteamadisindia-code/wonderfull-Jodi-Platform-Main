"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshToken = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const refreshTokenSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    family: { type: String, required: true, index: true },
    isUsed: { type: Boolean, default: false, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, required: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
}, { timestamps: true });
// TTL index to automatically purge expired tokens from MongoDB after 30 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
exports.RefreshToken = (0, prismaBridge_1.createPrismaModelAdapter)('refreshToken', { "user": "userId" });
//# sourceMappingURL=RefreshToken.js.map