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
exports.Campaign = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const campaignSchema = new mongoose_1.Schema({
    campaignName: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'Asia/Kolkata', trim: true },
    priority: { type: Number, default: 0, index: true }, // higher priority evaluated first
    targetGender: {
        type: String,
        enum: ['Male', 'Female', 'Both', 'Any'],
        default: 'Any',
        index: true,
    },
    minAge: { type: Number, min: 18, max: 100 },
    maxAge: { type: Number, min: 18, max: 100 },
    maritalStatus: [{ type: String, trim: true }],
    membershipType: [{ type: String, trim: true }],
    registrationStatus: {
        type: String,
        enum: ['New Member', 'Existing Member', 'Any'],
        default: 'Any',
    },
    verificationStatus: {
        type: String,
        enum: ['VERIFIED', 'PENDING', 'UNVERIFIED', 'Any'],
        default: 'Any',
    },
    profileStatus: {
        type: String,
        enum: ['Complete', 'Incomplete', 'Any'],
        default: 'Any',
    },
    location: {
        countries: [{ type: String, trim: true }],
        states: [{ type: String, trim: true }],
        districts: [{ type: String, trim: true }],
        cities: [{ type: String, trim: true }],
    },
    qualification: [{ type: String, trim: true }],
    specialization: [{ type: String, trim: true }],
    applicablePlans: [{ type: String, trim: true, default: ['ALL'] }],
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FIXED', 'FREE', 'FREE_100_PERCENT', 'FIXED_AMOUNT', 'NONE'],
        default: 'PERCENTAGE',
        required: true,
    },
    discountValue: { type: Number, required: true, default: 0, min: 0 },
    couponRequired: { type: Boolean, default: false },
    couponCode: { type: String, uppercase: true, trim: true },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    genderUsageLimit: {
        maleLimit: { type: Number, default: 0 },
        femaleLimit: { type: Number, default: 0 },
        maleUsed: { type: Number, default: 0 },
        femaleUsed: { type: Number, default: 0 },
    },
    perMemberLimit: { type: Number, default: 1, min: 1 },
    allowStacking: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED', 'ARCHIVED'],
        default: 'DRAFT',
        index: true,
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
    analytics: {
        totalDiscountGiven: { type: Number, default: 0 },
        totalRevenueGenerated: { type: Number, default: 0 },
        timesClaimed: { type: Number, default: 0 },
    },
}, { timestamps: true });
campaignSchema.index({ status: 1, startDate: 1, endDate: 1, priority: -1 });
exports.Campaign = mongoose_1.default.models.Campaign || mongoose_1.default.model('Campaign', campaignSchema);
//# sourceMappingURL=Campaign.js.map