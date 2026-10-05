"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipPlan = void 0;
const prismaBridge_1 = require("../db/prismaBridge");
const membershipPlanSchema = new prismaBridge_1.Schema({
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
exports.MembershipPlan = (0, prismaBridge_1.createPrismaModelAdapter)('membershipPlan');
//# sourceMappingURL=MembershipPlan.js.map