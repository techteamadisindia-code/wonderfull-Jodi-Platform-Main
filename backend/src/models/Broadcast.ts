import mongoose, { Document, Schema } from 'mongoose';

export type BroadcastType =
  | 'SYSTEM'
  | 'ANNOUNCEMENT'
  | 'PROMOTION'
  | 'MEMBERSHIP'
  | 'VERIFICATION'
  | 'SECURITY'
  | 'MAINTENANCE';

export type BroadcastTargetType =
  | 'ALL_USERS'
  | 'ACTIVE_USERS'
  | 'INACTIVE_USERS'
  | 'VERIFIED_USERS'
  | 'PREMIUM_USERS'
  | 'SELECTED_USERS';

export type BroadcastStatus = 'DRAFT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';

export interface IBroadcast extends Document {
  title: string;
  message: string;
  type: BroadcastType;
  targetType: BroadcastTargetType;
  targetUserIds?: mongoose.Types.ObjectId[];
  actionUrl?: string;
  createdBy: mongoose.Types.ObjectId;
  status: BroadcastStatus;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  sentAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const broadcastSchema = new Schema<IBroadcast>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: {
      type: String,
      enum: ['SYSTEM', 'ANNOUNCEMENT', 'PROMOTION', 'MEMBERSHIP', 'VERIFICATION', 'SECURITY', 'MAINTENANCE'],
      default: 'SYSTEM',
      index: true,
    },
    targetType: {
      type: String,
      enum: ['ALL_USERS', 'ACTIVE_USERS', 'INACTIVE_USERS', 'VERIFIED_USERS', 'PREMIUM_USERS', 'SELECTED_USERS'],
      default: 'ALL_USERS',
      index: true,
    },
    targetUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    actionUrl: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'QUEUED', 'SENDING', 'SENT', 'FAILED'],
      default: 'SENT',
      index: true,
    },
    totalRecipients: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    sentAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

broadcastSchema.index({ createdAt: -1 });

export const Broadcast =
  mongoose.models.Broadcast || mongoose.model<IBroadcast>('Broadcast', broadcastSchema);
