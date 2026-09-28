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
exports.Coupon = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const couponSchema = new mongoose_1.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FIXED', 'FREE', 'FREE_100_PERCENT', 'FIXED_AMOUNT', 'NONE'],
        required: true,
        default: 'PERCENTAGE',
    },
    discountValue: { type: Number, required: true, min: 0 },
    applicablePlans: [{ type: String, trim: true, default: ['ALL'] }],
    startDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    perMemberLimit: { type: Number, default: 1, min: 1 },
    minimumMembershipAmount: { type: Number, default: 0, min: 0 },
    newMemberOnly: { type: Boolean, default: false },
    existingMemberOnly: { type: Boolean, default: false },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Both', 'Any'],
        default: 'Any',
    },
    minAge: { type: Number, min: 18, max: 100 },
    maxAge: { type: Number, min: 18, max: 100 },
    maritalStatus: [{ type: String, trim: true }],
    verificationStatus: [{ type: String, trim: true }],
    location: {
        countries: [{ type: String, trim: true }],
        states: [{ type: String, trim: true }],
        cities: [{ type: String, trim: true }],
    },
    qualification: [{ type: String, trim: true }],
    campaignId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    isReferralReward: { type: Boolean, default: false, index: true },
    issuedToUser: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    issuedToCandidateId: { type: String, trim: true, index: true },
    allowStacking: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED', 'ARCHIVED'],
        default: 'ACTIVE',
        index: true,
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
couponSchema.index({ status: 1, expiryDate: 1 });
exports.Coupon = mongoose_1.default.models.Coupon || mongoose_1.default.model('Coupon', couponSchema);
//# sourceMappingURL=Coupon.js.map