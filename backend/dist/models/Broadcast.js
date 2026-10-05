"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Broadcast = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const broadcastSchema = new prismaBridge_1.Schema({
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: {
        type: String,
        enum: ['SYSTEM', 'ANNOUNCEMENT', 'PROMOTION', 'MEMBERSHIP', 'VERIFICATION', 'SECURITY', 'MAINTENANCE'],
        default: 'SYSTEM',
        index: true,
    },
    targetType: {
        type: String,
        enum: ['ALL_USERS', 'ACTIVE_USERS', 'INACTIVE_USERS', 'VERIFIED_USERS', 'PREMIUM_USERS', 'SELECTED_USERS'],
        default: 'ALL_USERS',
        index: true,
    },
    targetUserIds: [{ type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' }],
    actionUrl: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
        type: String,
        enum: ['DRAFT', 'QUEUED', 'SENDING', 'SENT', 'FAILED'],
        default: 'SENT',
        index: true,
    },
    totalRecipients: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    sentAt: { type: Date, default: Date.now },
    metadata: { type: prismaBridge_1.Schema.Types.Mixed },
}, { timestamps: true });
broadcastSchema.index({ createdAt: -1 });
exports.Broadcast = (0, prismaBridge_1.createPrismaModelAdapter)('broadcast', { "createdBy": "createdById" });
//# sourceMappingURL=Broadcast.js.map