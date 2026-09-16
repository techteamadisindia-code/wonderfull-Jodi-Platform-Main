import mongoose, { Document, Schema } from 'mongoose';

export type CouponStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'ARCHIVED';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE';

export interface ICoupon extends Document {
  couponCode: string;
  name: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  applicablePlans: string[];
  startDate: Date;
  expiryDate: Date;
  usageLimit: number; // 0 = unlimited
  usedCount: number;
  perMemberLimit: number;
  minimumMembershipAmount: number;
  newMemberOnly: boolean;
  existingMemberOnly: boolean;
  gender: 'Male' | 'Female' | 'Both' | 'Any';
  minAge?: number;
  maxAge?: number;
  maritalStatus?: string[];
  verificationStatus?: string[];
  location?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
  };
  qualification?: string[];
  campaignId?: mongoose.Types.ObjectId;
  isReferralReward: boolean;
  issuedToUser?: mongoose.Types.ObjectId;
  issuedToCandidateId?: string;
  allowStacking: boolean;
  status: CouponStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
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
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    isReferralReward: { type: Boolean, default: false, index: true },
    issuedToUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    issuedToCandidateId: { type: String, trim: true, index: true },
    allowStacking: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

couponSchema.index({ status: 1, expiryDate: 1 });

export const Coupon =
  mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', couponSchema);
