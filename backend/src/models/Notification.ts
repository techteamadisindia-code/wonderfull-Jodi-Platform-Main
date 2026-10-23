import mongoose, { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  broadcast?: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  link?: string;
  read: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Canonical helper to check if a notification has been soft-deleted/trashed.
 * Soft-deletion is stored within the standard `metadata` JSON column.
 */
export function isNotificationTrashed(metadata: any): boolean {
  if (!metadata) return false;
  let parsed = metadata;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return false;
    }
  }
  return Boolean(parsed?.isDeleted || parsed?.trashed);
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    broadcast: { type: Schema.Types.ObjectId, ref: 'Broadcast', index: true },
    type: { type: String, required: true, trim: true, default: 'SYSTEM' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    actionUrl: { type: String, trim: true, maxlength: 500 },
    link: { type: String, trim: true, maxlength: 500 },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound indexes for fast user notification querying and unread counting
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = createPrismaModelAdapter<INotification>('notification', {"user":"userId","broadcast":"broadcastId"});
