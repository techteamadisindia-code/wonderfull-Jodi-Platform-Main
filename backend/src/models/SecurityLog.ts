import mongoose, { Document, Schema } from 'mongoose';

export interface ISecurityLog extends Document {
  user?: mongoose.Types.ObjectId;
  identifier?: string;
  eventType:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'LOGOUT_ALL'
    | 'TOKEN_REFRESHED'
    | 'TOKEN_REUSE_DETECTED'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_SUCCESS'
    | 'PROFILE_UPDATE'
    | 'ADMIN_ACTION'
    | 'SUSPICIOUS_ACTIVITY';
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const securityLogSchema = new Schema<ISecurityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    identifier: { type: String, trim: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'LOGOUT_ALL',
        'TOKEN_REFRESHED',
        'TOKEN_REUSE_DETECTED',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET_SUCCESS',
        'PROFILE_UPDATE',
        'ADMIN_ACTION',
        'SUSPICIOUS_ACTIVITY',
      ],
      index: true,
    },
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS', index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index to automatically purge old logs after 90 days
securityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SecurityLog =
  mongoose.models.SecurityLog || mongoose.model<ISecurityLog>('SecurityLog', securityLogSchema);
