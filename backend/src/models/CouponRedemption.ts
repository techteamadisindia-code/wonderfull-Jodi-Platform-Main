import mongoose, { Document, Schema } from 'mongoose';

export interface ICouponRedemption extends Document {
  couponId: mongoose.Types.ObjectId;
  couponCode: string;
  userId: mongoose.Types.ObjectId;
  candidateId?: string;
  campaignId?: mongoose.Types.ObjectId;
  planKey: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentId?: string;
  orderId?: string;
  redeemedAt: Date;
  status: 'APPLIED' | 'SUCCESS' | 'CANCELLED' | 'REFUNDED';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const couponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    couponCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateId: { type: String, trim: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    planKey: { type: String, required: true, trim: true },
    originalAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    paymentId: { type: String, trim: true },
    orderId: { type: String, trim: true },
    redeemedAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['APPLIED', 'SUCCESS', 'CANCELLED', 'REFUNDED'],
      default: 'SUCCESS',
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

couponRedemptionSchema.index({ couponId: 1, userId: 1 });
couponRedemptionSchema.index({ redeemedAt: -1 });

export const CouponRedemption =
  mongoose.models.CouponRedemption ||
  mongoose.model<ICouponRedemption>('CouponRedemption', couponRedemptionSchema);
