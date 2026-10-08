"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interest = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const interestSchema = new prismaBridge_1.Schema({
    sender: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderProfile: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    receiverProfile: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Profile', index: true },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING',
        index: true,
    },
}, { timestamps: true });
interestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
interestSchema.index({ createdAt: -1 });
interestSchema.index({ status: 1, createdAt: -1 });
exports.Interest = (0, prismaBridge_1.createPrismaModelAdapter)('interest', {
    sender: 'senderId',
    receiver: 'receiverId',
    recipient: 'receiverId',
    senderProfile: 'senderProfileId',
    receiverProfile: 'receiverProfileId',
});
//# sourceMappingURL=Interest.js.map