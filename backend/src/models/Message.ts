import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  moderationStatus: 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
  moderationCategory?: 'PHONE_NUMBER' | 'EMAIL' | 'SOCIAL_MEDIA' | 'OTHER_CONTACT' | 'NONE';
  moderationConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  moderationScore?: number;
  flaggedReason?: string;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    moderationStatus: {
      type: String,
      enum: ['SAFE', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED'],
      default: 'SAFE',
      index: true,
    },
    moderationCategory: {
      type: String,
      enum: ['PHONE_NUMBER', 'EMAIL', 'SOCIAL_MEDIA', 'OTHER_CONTACT', 'NONE'],
      default: 'NONE',
      index: true,
    },
    moderationConfidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'NONE'],
      default: 'NONE',
    },
    moderationScore: { type: Number, default: 0 },
    flaggedReason: { type: String, trim: true },
    moderatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ moderationStatus: 1, moderationCategory: 1 });

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
