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
exports.Referral = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const referralSchema = new mongoose_1.Schema({
    referrerUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referrerCandidateId: { type: String, required: true, trim: true, index: true },
    referralCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    referredUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
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
    rewardRecordId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ReferralRewardRecord' },
    couponId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon' },
    campaignId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Campaign' },
}, { timestamps: true });
referralSchema.index({ referrerUserId: 1, status: 1 });
referralSchema.index({ referrerCandidateId: 1, status: 1 });
referralSchema.index({ referredUserId: 1 }, { unique: true, sparse: true });
exports.Referral = mongoose_1.default.models.Referral || mongoose_1.default.model('Referral', referralSchema);
//# sourceMappingURL=Referral.js.map