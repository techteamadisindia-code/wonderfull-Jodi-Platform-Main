import mongoose, { Document, Schema } from 'mongoose';

export interface IReferralRewardRecord extends Document {
  userId: mongoose.Types.ObjectId;
  candidateId: string;
  milestone: number; // e.g. 5, 10, 15...
  rewardType: string;
  rewardValue: number;
  couponId?: mongoose.Types.ObjectId;
  couponCode?: string;
  status: 'ISSUED' | 'USED' | 'EXPIRED';
  issuedAt: Date;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const referralRewardRecordSchema = new Schema<IReferralRewardRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateId: { type: String, required: true, trim: true, index: true },
    milestone: { type: Number, required: true, index: true },
    rewardType: { type: String, required: true, trim: true },
    rewardValue: { type: Number, required: true, min: 0 },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: { type: String, uppercase: true, trim: true },
    status: {
      type: String,
      enum: ['ISSUED', 'USED', 'EXPIRED'],
      default: 'ISSUED',
      index: true,
    },
    issuedAt: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Prevent issuing multiple rewards for the exact same referral milestone
referralRewardRecordSchema.index({ userId: 1, milestone: 1 }, { unique: true });

export const ReferralRewardRecord =
  mongoose.models.ReferralRewardRecord ||
  mongoose.model<IReferralRewardRecord>('ReferralRewardRecord', referralRewardRecordSchema);
