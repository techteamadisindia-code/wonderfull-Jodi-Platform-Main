"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralRewardConfig = void 0;
exports.getActiveReferralConfig = getActiveReferralConfig;
const mongoose_1 = __importStar(require("mongoose"));
const referralRewardConfigSchema = new mongoose_1.Schema({
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
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
exports.ReferralRewardConfig = mongoose_1.default.models.ReferralRewardConfig ||
    mongoose_1.default.model('ReferralRewardConfig', referralRewardConfigSchema);
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