"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralRewardRecord = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const referralRewardRecordSchema = new prismaBridge_1.Schema({
    userId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateId: { type: String, required: true, trim: true, index: true },
    milestone: { type: Number, required: true, index: true },
    rewardType: { type: String, required: true, trim: true },
    rewardValue: { type: Number, required: true, min: 0 },
    couponId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: { type: String, uppercase: true, trim: true },
    status: {
        type: String,
        enum: ['ISSUED', 'USED', 'EXPIRED'],
        default: 'ISSUED',
        index: true,
    },
    issuedAt: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
}, { timestamps: true });
// Prevent issuing multiple rewards for the exact same referral milestone
referralRewardRecordSchema.index({ userId: 1, milestone: 1 }, { unique: true });
exports.ReferralRewardRecord = (0, prismaBridge_1.createPrismaModelAdapter)('referralRewardRecord', { "user": "userId", "coupon": "couponId" });
//# sourceMappingURL=ReferralRewardRecord.js.map