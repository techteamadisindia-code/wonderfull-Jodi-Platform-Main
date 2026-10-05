"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const messageSchema = new prismaBridge_1.Schema({
    conversation: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    moderationStatus: {
        type: String,
        enum: ['SAFE', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED'],
        default: 'SAFE',
        index: true,
    },
    moderationCategory: {
        type: String,
        enum: ['PHONE_NUMBER', 'EMAIL', 'SOCIAL_MEDIA', 'OTHER_CONTACT', 'NONE'],
        default: 'NONE',
        index: true,
    },
    moderationConfidence: {
        type: String,
        enum: ['HIGH', 'MEDIUM', 'LOW', 'NONE'],
        default: 'NONE',
    },
    moderationScore: { type: Number, default: 0 },
    flaggedReason: { type: String, trim: true },
    moderatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ moderationStatus: 1, moderationCategory: 1 });
exports.Message = (0, prismaBridge_1.createPrismaModelAdapter)('message', { "conversation": "conversationId", "sender": "senderId", "receiver": "receiverId" });
//# sourceMappingURL=Message.js.map