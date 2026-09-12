import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  reportedUser: mongoose.Types.ObjectId;
  reportedProfile?: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  description?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'REJECTED' | 'ACTION_TAKEN';
  moderator?: mongoose.Types.ObjectId;
  handledByAdminId?: mongoose.Types.ObjectId;
  resolutionNotes?: string;
  adminNotes?: string;
  actionTaken?:
    | 'NONE'
    | 'WARNING_SENT'
    | 'PROFILE_UNDER_REVIEW'
    | 'SUSPENDED'
    | 'BLOCKED'
    | 'DELETED'
    | 'RESOLVED'
    | 'DISMISSED'
    | 'ACCOUNT_BLOCKED';
  targetType?: 'PROFILE' | 'MESSAGE' | 'USER' | 'OTHER';
  messageSnippet?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedProfile: { type: Schema.Types.ObjectId, ref: 'Profile', index: true },
    reason: { type: String, required: true, trim: true, index: true },
    details: { type: String, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'REJECTED', 'ACTION_TAKEN'],
      default: 'PENDING',
      index: true,
    },
    moderator: { type: Schema.Types.ObjectId, ref: 'User' },
    handledByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String, trim: true },
    adminNotes: { type: String, trim: true },
    actionTaken: {
      type: String,
      enum: [
        'NONE',
        'WARNING_SENT',
        'PROFILE_UNDER_REVIEW',
        'SUSPENDED',
        'BLOCKED',
        'DELETED',
        'RESOLVED',
        'DISMISSED',
        'ACCOUNT_BLOCKED',
      ],
      default: 'NONE',
    },
    targetType: {
      type: String,
      enum: ['PROFILE', 'MESSAGE', 'USER', 'OTHER'],
      default: 'PROFILE',
    },
    messageSnippet: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Report = mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);

