import mongoose, { Document, Schema } from 'mongoose';

export type ReferralStatus =
  | 'CLICKED'
  | 'REGISTERED'
  | 'QUALIFIED'
  | 'REWARDED'
  | 'REJECTED'
  | 'EXPIRED';

export type ReferralRewardStatus =
  | 'PENDING'
  | 'UNLOCKED'
  | 'ISSUED'
  | 'USED'
  | 'EXPIRED';

export interface IReferral extends Document {
  referrerUserId: mongoose.Types.ObjectId;
  referrerCandidateId: string;
  referralCode: string;
  referredUserId?: mongoose.Types.ObjectId;
  referredCandidateId?: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  clickedAt?: Date;
  registeredAt?: Date;
  qualifiedAt?: Date;
  status: ReferralStatus;
  qualificationReason?: string;
  rewardStatus: ReferralRewardStatus;
  rewardRecordId?: mongoose.Types.ObjectId;
  couponId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referrerCandidateId: { type: String, required: true, trim: true, index: true },
    referralCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    referredCandidateId: { type: String, trim: true, index: true },
    source: { type: String, trim: true, default: 'direct_link' },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    clickedAt: { type: Date, default: Date.now },
    registeredAt: { type: Date },
    qualifiedAt: { type: Date },
    status: {
      type: String,
      enum: ['CLICKED', 'REGISTERED', 'QUALIFIED', 'REWARDED', 'REJECTED', 'EXPIRED'],
      default: 'CLICKED',
      index: true,
    },
    qualificationReason: { type: String, trim: true },
    rewardStatus: {
      type: String,
      enum: ['PENDING', 'UNLOCKED', 'ISSUED', 'USED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    rewardRecordId: { type: Schema.Types.ObjectId, ref: 'ReferralRewardRecord' },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  },
  { timestamps: true }
);

referralSchema.index({ referrerUserId: 1, status: 1 });
referralSchema.index({ referrerCandidateId: 1, status: 1 });
referralSchema.index({ referredUserId: 1 }, { unique: true, sparse: true });

export const Referral =
  mongoose.models.Referral || mongoose.model<IReferral>('Referral', referralSchema);
