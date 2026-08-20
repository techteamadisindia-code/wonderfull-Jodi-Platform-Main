import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  adminUser?: mongoose.Types.ObjectId;
  adminEmail: string;
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminUser: { type: Schema.Types.ObjectId, ref: 'User' },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetModel: { type: String },
    targetId: { type: String },
    details: { type: String },
    ipAddress: { type: String, default: '127.0.0.1' },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'WARNING'], default: 'SUCCESS' },
  },
  { timestamps: true }
);

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
