import mongoose, { Document, Schema } from 'mongoose';

export type CampaignStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'ARCHIVED';

export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE' | 'NONE';

export interface ICampaign extends Document {
  campaignName: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  priority: number;
  targetGender: 'Male' | 'Female' | 'Both' | 'Any';
  minAge?: number;
  maxAge?: number;
  maritalStatus?: string[];
  membershipType?: string[];
  registrationStatus?: 'New Member' | 'Existing Member' | 'Any';
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'Any';
  profileStatus?: 'Complete' | 'Incomplete' | 'Any';
  location?: {
    countries?: string[];
    states?: string[];
    districts?: string[];
    cities?: string[];
  };
  qualification?: string[];
  specialization?: string[];
  applicablePlans: string[];
  discountType: DiscountType;
  discountValue: number;
  couponRequired: boolean;
  couponCode?: string;
  usageLimit: number; // 0 = unlimited
  usedCount: number;
  genderUsageLimit?: {
    maleLimit?: number;
    femaleLimit?: number;
    maleUsed: number;
    femaleUsed: number;
  };
  perMemberLimit: number;
  allowStacking: boolean;
  status: CampaignStatus;
  createdBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  analytics: {
    totalDiscountGiven: number;
    totalRevenueGenerated: number;
    timesClaimed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
    analytics: {
      totalDiscountGiven: { type: Number, default: 0 },
      totalRevenueGenerated: { type: Number, default: 0 },
      timesClaimed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, startDate: 1, endDate: 1, priority: -1 });

export const Campaign =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', campaignSchema);
