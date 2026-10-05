"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const conversationSchema = new prismaBridge_1.Schema({
    participants: [{ type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    interest: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Interest', index: true },
    lastMessage: { type: String, trim: true },
    messageCount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['ACTIVE', 'FLAGGED', 'BLOCKED', 'ARCHIVED'],
        default: 'ACTIVE',
        index: true,
    },
    complianceStatus: {
        type: String,
        enum: ['SAFE', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED'],
        default: 'SAFE',
        index: true,
    },
    lastActivityAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ lastActivityAt: -1 });
conversationSchema.index({ status: 1, complianceStatus: 1 });
exports.Conversation = (0, prismaBridge_1.createPrismaModelAdapter)('conversation', { "interest": "interestId" });
//# sourceMappingURL=Conversation.js.map