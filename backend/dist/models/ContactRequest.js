"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactRequest = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const contactRequestSchema = new prismaBridge_1.Schema({
    requester: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
        default: 'PENDING',
        index: true,
    },
    contactCreditDeducted: { type: Boolean, default: false },
    contactUnlockedAt: { type: Date, default: null },
    message: { type: String, trim: true, default: '' },
}, { timestamps: true });
// Index to efficiently look up mutual relationship and prevent duplicate pending requests
contactRequestSchema.index({ requester: 1, recipient: 1 });
contactRequestSchema.index({ recipient: 1, status: 1 });
exports.ContactRequest = (0, prismaBridge_1.createPrismaModelAdapter)('contactRequest', { "requester": "requesterId", "recipient": "recipientId" });
//# sourceMappingURL=ContactRequest.js.map