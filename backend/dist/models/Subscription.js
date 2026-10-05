"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSubscription = exports.Subscription = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const subscriptionSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, required: true, index: true },
    planId: { type: String, index: true },
    status: { type: String, enum: ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE', index: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date },
    contactRequestsUsed: { type: Number, default: 0 },
    contactRequestsRemaining: { type: Number, default: 0 },
    paymentReference: { type: String },
}, { timestamps: true });
exports.Subscription = (0, prismaBridge_1.createPrismaModelAdapter)('subscription', { "user": "userId", "planId": "membershipPlanId" });
exports.UserSubscription = exports.Subscription;
//# sourceMappingURL=Subscription.js.map