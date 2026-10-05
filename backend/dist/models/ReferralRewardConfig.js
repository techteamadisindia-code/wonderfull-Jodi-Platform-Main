"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralRewardConfig = void 0;
exports.getActiveReferralConfig = getActiveReferralConfig;
const prismaBridge_1 = require("../db/prismaBridge");
const referralRewardConfigSchema = new prismaBridge_1.Schema({
    requiredReferrals: { type: Number, required: true, default: 5, min: 1 },
    qualificationEvent: {
        type: String,
        enum: ['REGISTERED', 'REGISTERED_AND_VERIFIED', 'REGISTERED_AND_COMPLETED_PROFILE'],
        default: 'REGISTERED',
        required: true,
    },
    rewardType: {
        type: String,
        enum: [
            'PERCENTAGE_DISCOUNT',
            'FIXED_DISCOUNT',
            'FREE_PREMIUM',
            'ADDITIONAL_PROFILE_VIEWS',
            'ADDITIONAL_CONTACT_VIEWS',
            'COUPON',
        ],
        default: 'PERCENTAGE_DISCOUNT',
        required: true,
    },
    rewardValue: { type: Number, required: true, default: 50, min: 0 },
    rewardPlan: { type: String, default: 'ALL', trim: true },
    couponValidityDays: { type: Number, default: 30, min: 1 },
    isRecurringMilestone: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.ReferralRewardConfig = (0, prismaBridge_1.createPrismaModelAdapter)('referralRewardConfig', { "updatedBy": "updatedById" });
async function getActiveReferralConfig() {
    let config = await exports.ReferralRewardConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });
    if (!config) {
        config = await exports.ReferralRewardConfig.create({
            requiredReferrals: 5,
            qualificationEvent: 'REGISTERED',
            rewardType: 'PERCENTAGE_DISCOUNT',
            rewardValue: 50,
            rewardPlan: 'ALL',
            couponValidityDays: 30,
            isRecurringMilestone: true,
            isActive: true,
        });
    }
    return config;
}
//# sourceMappingURL=ReferralRewardConfig.js.map