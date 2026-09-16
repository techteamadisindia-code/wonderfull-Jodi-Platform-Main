import mongoose, { Document, Schema } from 'mongoose';

export type QualificationEvent =
  | 'REGISTERED'
  | 'REGISTERED_AND_VERIFIED'
  | 'REGISTERED_AND_COMPLETED_PROFILE';

export type ReferralRewardType =
  | 'PERCENTAGE_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'FREE_PREMIUM'
  | 'ADDITIONAL_PROFILE_VIEWS'
  | 'ADDITIONAL_CONTACT_VIEWS'
  | 'COUPON';

export interface IReferralRewardConfig extends Document {
  requiredReferrals: number;
  qualificationEvent: QualificationEvent;
  rewardType: ReferralRewardType;
  rewardValue: number; // e.g. 50 for 50%, 100 for 100%, 10 for views/contacts
  rewardPlan: string; // e.g. 'DOCTOR_CONNECT', 'PREMIUM', 'ALL'
  couponValidityDays: number;
  isRecurringMilestone: boolean;
  isActive: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const referralRewardConfigSchema = new Schema<IReferralRewardConfig>(
  {
    requiredReferrals: { type: Number, required: true, default: 5, min: 1 },
    qualificationEvent: {
      type: String,
      enum: ['REGISTERED', 'REGISTERED_AND_VERIFIED', 'REGISTERED_AND_COMPLETED_PROFILE'],
      default: 'REGISTERED',
      required: true,
    },
    rewardType: {
      type: String,
      enum: [
        'PERCENTAGE_DISCOUNT',
        'FIXED_DISCOUNT',
        'FREE_PREMIUM',
        'ADDITIONAL_PROFILE_VIEWS',
        'ADDITIONAL_CONTACT_VIEWS',
        'COUPON',
      ],
      default: 'PERCENTAGE_DISCOUNT',
      required: true,
    },
    rewardValue: { type: Number, required: true, default: 50, min: 0 },
    rewardPlan: { type: String, default: 'ALL', trim: true },
    couponValidityDays: { type: Number, default: 30, min: 1 },
    isRecurringMilestone: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const ReferralRewardConfig =
  mongoose.models.ReferralRewardConfig ||
  mongoose.model<IReferralRewardConfig>('ReferralRewardConfig', referralRewardConfigSchema);

export async function getActiveReferralConfig(): Promise<IReferralRewardConfig> {
  let config = await ReferralRewardConfig.findOne({ isActive: true }).sort({ updatedAt: -1 });
  if (!config) {
    config = await ReferralRewardConfig.create({
      requiredReferrals: 5,
      qualificationEvent: 'REGISTERED',
      rewardType: 'PERCENTAGE_DISCOUNT',
      rewardValue: 50,
      rewardPlan: 'ALL',
      couponValidityDays: 30,
      isRecurringMilestone: true,
      isActive: true,
    });
  }
  return config;
}
