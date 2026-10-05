"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetToken = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const passwordResetTokenSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    isUsed: { type: Boolean, default: false, index: true },
    usedAt: { type: Date, default: null },
}, { timestamps: true });
// Auto-clean tokens after 7 days
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
exports.PasswordResetToken = (0, prismaBridge_1.createPrismaModelAdapter)('passwordResetToken', { "user": "userId" });
//# sourceMappingURL=PasswordResetToken.js.map