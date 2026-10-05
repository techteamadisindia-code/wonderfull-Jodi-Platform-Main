"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coupon = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const couponSchema = new prismaBridge_1.Schema({
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
    campaignId: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    isReferralReward: { type: Boolean, default: false, index: true },
    issuedToUser: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', index: true },
    issuedToCandidateId: { type: String, trim: true, index: true },
    allowStacking: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED', 'ARCHIVED'],
        default: 'ACTIVE',
        index: true,
    },
    createdBy: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
couponSchema.index({ status: 1, expiryDate: 1 });
exports.Coupon = (0, prismaBridge_1.createPrismaModelAdapter)('coupon', { "campaign": "campaignId", "issuedToUser": "issuedToUserId", "createdBy": "createdById" });
//# sourceMappingURL=Coupon.js.map