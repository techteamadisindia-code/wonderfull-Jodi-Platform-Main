"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const paymentSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscription: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Subscription', index: true },
    orderId: { type: String, trim: true, index: true },
    paymentId: { type: String, trim: true, index: true },
    provider: { type: String, required: true, default: 'razorpay' },
    providerPaymentId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    planId: { type: String, trim: true, index: true },
    planName: { type: String, trim: true },
    paymentMethod: { type: String, default: 'UPI' },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
        default: 'PENDING',
        index: true,
    },
    receipt: { type: String, trim: true },
    razorpaySignature: { type: String },
    failureReason: { type: String },
    refundId: { type: String, trim: true },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundStatus: {
        type: String,
        enum: ['NONE', 'PENDING', 'PROCESSED', 'FAILED'],
        default: 'NONE',
        index: true,
    },
    refundReason: { type: String },
    refundedAt: { type: Date },
    isSimulated: { type: Boolean, default: false },
    metadata: { type: prismaBridge_1.Schema.Types.Mixed },
}, { timestamps: true });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
exports.Payment = (0, prismaBridge_1.createPrismaModelAdapter)('payment', { "user": "userId", "subscription": "subscriptionId" });
//# sourceMappingURL=Payment.js.map