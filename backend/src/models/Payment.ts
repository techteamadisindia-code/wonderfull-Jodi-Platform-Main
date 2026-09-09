import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type RefundStatus = 'NONE' | 'PENDING' | 'PROCESSED' | 'FAILED';

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId;
  subscription?: mongoose.Types.ObjectId;
  orderId?: string;
  paymentId?: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  planId?: string;
  planName?: string;
  paymentMethod?: string;
  status: PaymentStatus;
  receipt?: string;
  razorpaySignature?: string;
  failureReason?: string;
  refundId?: string;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  refundReason?: string;
  refundedAt?: Date;
  isSimulated?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', index: true },
    orderId: { type: String, trim: true, index: true },
    paymentId: { type: String, trim: true, index: true },
    provider: { type: String, required: true, default: 'razorpay' },
    providerPaymentId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    planId: { type: String, trim: true, index: true },
    planName: { type: String, trim: true },
    paymentMethod: { type: String, default: 'UPI' },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    receipt: { type: String, trim: true },
    razorpaySignature: { type: String },
    failureReason: { type: String },
    refundId: { type: String, trim: true },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'PROCESSED', 'FAILED'],
      default: 'NONE',
      index: true,
    },
    refundReason: { type: String },
    refundedAt: { type: Date },
    isSimulated: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);

