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
exports.ReferralRewardRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const referralRewardRecordSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateId: { type: String, required: true, trim: true, index: true },
    milestone: { type: Number, required: true, index: true },
    rewardType: { type: String, required: true, trim: true },
    rewardValue: { type: Number, required: true, min: 0 },
    couponId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon' },
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
exports.ReferralRewardRecord = mongoose_1.default.models.ReferralRewardRecord ||
    mongoose_1.default.model('ReferralRewardRecord', referralRewardRecordSchema);
//# sourceMappingURL=ReferralRewardRecord.js.map