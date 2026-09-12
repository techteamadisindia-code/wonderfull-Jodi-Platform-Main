import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  adminUser?: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  adminEmail: string;
  adminName?: string;
  action: string;
  targetModel?: string;
  targetId?: string;
  targetProfileId?: mongoose.Types.ObjectId;
  targetUserId?: mongoose.Types.ObjectId;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  relatedReportId?: mongoose.Types.ObjectId;
  details?: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminUser: { type: Schema.Types.ObjectId, ref: 'User' },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    adminEmail: { type: String, required: true },
    adminName: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    targetModel: { type: String, index: true },
    targetId: { type: String, index: true },
    targetProfileId: { type: Schema.Types.ObjectId, ref: 'Profile', index: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    previousStatus: { type: String, trim: true },
    newStatus: { type: String, trim: true },
    reason: { type: String, trim: true },
    relatedReportId: { type: Schema.Types.ObjectId, ref: 'Report' },
    details: { type: String },
    ipAddress: { type: String, default: '127.0.0.1' },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'WARNING'], default: 'SUCCESS' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

