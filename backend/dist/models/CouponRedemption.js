"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponRedemption = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const couponRedemptionSchema = new prismaBridge_1.Schema({
    couponId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    couponCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    userId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateId: { type: String, trim: true, index: true },
    campaignId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    planKey: { type: String, required: true, trim: true },
    originalAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    paymentId: { type: String, trim: true },
    orderId: { type: String, trim: true },
    redeemedAt: { type: Date, default: Date.now, index: true },
    status: {
        type: String,
        enum: ['APPLIED', 'SUCCESS', 'CANCELLED', 'REFUNDED'],
        default: 'SUCCESS',
        index: true,
    },
    metadata: { type: prismaBridge_1.Schema.Types.Mixed },
}, { timestamps: true });
couponRedemptionSchema.index({ couponId: 1, userId: 1 });
couponRedemptionSchema.index({ redeemedAt: -1 });
exports.CouponRedemption = (0, prismaBridge_1.createPrismaModelAdapter)('couponRedemption', { "coupon": "couponId", "user": "userId", "campaign": "campaignId" });
//# sourceMappingURL=CouponRedemption.js.map