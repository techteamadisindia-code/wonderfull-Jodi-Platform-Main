import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  plan: string;
  planId?: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  startDate: Date;
  expiryDate?: Date;
  contactRequestsUsed: number;
  contactRequestsRemaining: number;
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, required: true, index: true },
    planId: { type: String, index: true },
    status: { type: String, enum: ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE', index: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date },
    contactRequestsUsed: { type: Number, default: 0 },
    contactRequestsRemaining: { type: Number, default: 0 },
    paymentReference: { type: String },
  },
  { timestamps: true }
);

// Virtual for userId referencing user
subscriptionSchema.virtual('userId').get(function () {
  return this.user;
});

export const Subscription =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export type IUserSubscription = ISubscription;
export const UserSubscription = Subscription;
