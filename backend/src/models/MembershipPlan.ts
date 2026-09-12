import mongoose, { Document, Schema } from 'mongoose';

export interface IMembershipPlan extends Document {
  name: string;
  slug: string;
  key?: string;
  planId?: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  price: number; // Backward compatibility / shortcut
  currency: string;
  billingPeriod: string;
  durationDays: number;
  durationMonths: number | null;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  seasonalLabel?: string;
  seasonalDiscount?: number;
  isSeasonalOffer: boolean;
  badge?: string;
  bestFor?: string;
  profileViewLimit: 'limited' | 'unlimited';
  contactRequestLimit: number;
  isUnlimitedContact: boolean;
  fairUsageEnabled: boolean;
  ctaText: string;
  ctaAction: 'register' | 'order' | 'contact';
  disclaimer?: string;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
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
  },
  { timestamps: true }
);

// Middleware to keep price in sync with discountedPrice if not explicitly set
membershipPlanSchema.pre('save', function (next) {
  if (this.discountedPrice !== undefined && this.discountedPrice !== null) {
    this.price = this.discountedPrice;
  } else if (this.originalPrice !== undefined) {
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

export const MembershipPlan =
  mongoose.models.MembershipPlan ||
  mongoose.model<IMembershipPlan>('MembershipPlan', membershipPlanSchema);
