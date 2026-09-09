import mongoose, { Document, Schema } from 'mongoose';

export interface IMembershipPlan extends Document {
  name: string;
  slug: string;
  price: number;
  currency: string;
  durationMonths: number | null;
  profileViewLimit: 'limited' | 'unlimited';
  contactRequestLimit: number; // 0 for free, 25, 60, 120, or -1 for unlimited
  isUnlimitedContact: boolean;
  fairUsageEnabled: boolean;
  features: string[];
  isPopular: boolean;
  badge?: string;
  bestFor?: string;
  ctaText: string;
  ctaAction: 'register' | 'order' | 'contact';
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    price: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },
    durationMonths: { type: Number, default: null },
    profileViewLimit: { type: String, enum: ['limited', 'unlimited'], default: 'limited' },
    contactRequestLimit: { type: Number, required: true, default: 0 },
    isUnlimitedContact: { type: Boolean, default: false },
    fairUsageEnabled: { type: Boolean, default: false },
    features: [{ type: String, trim: true }],
    isPopular: { type: Boolean, default: false },
    badge: { type: String, trim: true },
    bestFor: { type: String, trim: true },
    ctaText: { type: String, required: true, default: 'Select Plan' },
    ctaAction: { type: String, enum: ['register', 'order', 'contact'], default: 'order' },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 1, index: true },
  },
  { timestamps: true }
);

export const MembershipPlan =
  mongoose.models.MembershipPlan ||
  mongoose.model<IMembershipPlan>('MembershipPlan', membershipPlanSchema);
