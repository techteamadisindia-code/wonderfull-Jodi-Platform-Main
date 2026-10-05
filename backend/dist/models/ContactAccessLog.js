"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactAccessLog = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const contactAccessLogSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileOwner: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactRequest: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'ContactRequest', index: true },
    action: {
        type: String,
        enum: ['REQUEST_CREATED', 'REQUEST_ACCEPTED', 'REQUEST_DECLINED', 'CONTACT_VIEWED', 'CREDIT_DEDUCTED'],
        required: true,
        index: true,
    },
    creditsUsed: { type: Number, default: 0 },
    ipAddress: { type: String },
    metadata: { type: prismaBridge_1.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.ContactAccessLog = (0, prismaBridge_1.createPrismaModelAdapter)('contactAccessLog', { "user": "userId", "profileOwner": "profileOwnerId", "contactRequest": "contactRequestId" });
//# sourceMappingURL=ContactAccessLog.js.map