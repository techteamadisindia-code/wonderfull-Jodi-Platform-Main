import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
<<<<<<< HEAD
  broadcast?: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  link?: string;
  read: boolean;
  readAt?: Date;
=======
  type: string;
  title: string;
  message: string;
  read: boolean;
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
<<<<<<< HEAD
    broadcast: { type: Schema.Types.ObjectId, ref: 'Broadcast', index: true },
    type: { type: String, required: true, trim: true, default: 'SYSTEM' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    actionUrl: { type: String, trim: true, maxlength: 500 },
    link: { type: String, trim: true, maxlength: 500 },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
=======
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

<<<<<<< HEAD
// Compound indexes for fast user notification querying and unread counting
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
=======
export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
