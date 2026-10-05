"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Referral = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const referralSchema = new prismaBridge_1.Schema({
    referrerUserId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referrerCandidateId: { type: String, required: true, trim: true, index: true },
    referralCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    referredUserId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', index: true },
    referredCandidateId: { type: String, trim: true, index: true },
    source: { type: String, trim: true, default: 'direct_link' },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    clickedAt: { type: Date, default: Date.now },
    registeredAt: { type: Date },
    qualifiedAt: { type: Date },
    status: {
        type: String,
        enum: ['CLICKED', 'REGISTERED', 'QUALIFIED', 'REWARDED', 'REJECTED', 'EXPIRED'],
        default: 'CLICKED',
        index: true,
    },
    qualificationReason: { type: String, trim: true },
    rewardStatus: {
        type: String,
        enum: ['PENDING', 'UNLOCKED', 'ISSUED', 'USED', 'EXPIRED'],
        default: 'PENDING',
        index: true,
    },
    rewardRecordId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'ReferralRewardRecord' },
    couponId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Coupon' },
    campaignId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Campaign' },
}, { timestamps: true });
referralSchema.index({ referrerUserId: 1, status: 1 });
referralSchema.index({ referrerCandidateId: 1, status: 1 });
referralSchema.index({ referredUserId: 1 }, { unique: true, sparse: true });
exports.Referral = (0, prismaBridge_1.createPrismaModelAdapter)('referral', { "referrer": "referrerUserId", "referred": "referredUserId", "rewardRecord": "rewardRecordId", "coupon": "couponId", "campaign": "campaignId" });
//# sourceMappingURL=Referral.js.map