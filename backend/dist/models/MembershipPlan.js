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
exports.MembershipPlan = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const membershipPlanSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    key: { type: String, uppercase: true, trim: true },
    planId: { type: String, trim: true },
    description: { type: String, default: '', trim: true },
    originalPrice: { type: Number, required: true, default: 0, min: 0 },
    discountedPrice: { type: Number, required: true, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    billingPeriod: { type: String, default: 'Monthly', trim: true },
    durationDays: { type: Number, required: true, default: 30, min: 1 },
    durationMonths: { type: Number, default: null },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true, index: true },
    isPopular: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 1, index: true },
    seasonalLabel: { type: String, default: '', trim: true },
    seasonalDiscount: { type: Number, default: 0, min: 0, max: 100 },
    isSeasonalOffer: { type: Boolean, default: false },
    badge: { type: String, default: '', trim: true },
    bestFor: { type: String, default: '', trim: true },
    profileViewLimit: { type: String, enum: ['limited', 'unlimited'], default: 'limited' },
    contactRequestLimit: { type: Number, default: 0 },
    isUnlimitedContact: { type: Boolean, default: false },
    fairUsageEnabled: { type: Boolean, default: false },
    ctaText: { type: String, default: 'Select Plan', trim: true },
    ctaAction: { type: String, enum: ['register', 'order', 'contact'], default: 'order' },
    disclaimer: { type: String, default: '', trim: true },
}, { timestamps: true });
// Middleware to keep price in sync with discountedPrice if not explicitly set
membershipPlanSchema.pre('save', function (next) {
    if (this.discountedPrice !== undefined && this.discountedPrice !== null) {
        this.price = this.discountedPrice;
    }
    else if (this.originalPrice !== undefined) {
        this.price = this.originalPrice;
    }
    if (!this.key && this.slug) {
        this.key = this.slug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    }
    if (!this.planId && this.slug) {
        this.planId = `plan_${this.slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    next();
});
exports.MembershipPlan = mongoose_1.default.models.MembershipPlan ||
    mongoose_1.default.model('MembershipPlan', membershipPlanSchema);
//# sourceMappingURL=MembershipPlan.js.map