import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
<<<<<<< HEAD
  userId?: mongoose.Types.ObjectId;
  plan: string;
  planId?: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  startDate: Date;
  expiryDate?: Date;
  contactRequestsUsed: number;
  contactRequestsRemaining: number;
  paymentReference?: string;
=======
  plan: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: Date;
  expiryDate?: Date;
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, required: true, index: true },
<<<<<<< HEAD
    planId: { type: String, index: true },
    status: { type: String, enum: ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE', index: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date },
    contactRequestsUsed: { type: Number, default: 0 },
    contactRequestsRemaining: { type: Number, default: 0 },
    paymentReference: { type: String },
=======
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE', index: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date },
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  },
  { timestamps: true }
);

<<<<<<< HEAD
// Virtual for userId referencing user
subscriptionSchema.virtual('userId').get(function () {
  return this.user;
});

export const Subscription =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export type IUserSubscription = ISubscription;
export const UserSubscription = Subscription;
=======
export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', subscriptionSchema);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
