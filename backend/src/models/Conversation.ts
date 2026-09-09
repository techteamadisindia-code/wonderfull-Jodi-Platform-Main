import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  interest?: mongoose.Types.ObjectId;
  lastMessage?: string;
  messageCount: number;
  status: 'ACTIVE' | 'FLAGGED' | 'BLOCKED' | 'ARCHIVED';
  complianceStatus: 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
  lastActivityAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    interest: { type: Schema.Types.ObjectId, ref: 'Interest', index: true },
    lastMessage: { type: String, trim: true },
    messageCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'FLAGGED', 'BLOCKED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    complianceStatus: {
      type: String,
      enum: ['SAFE', 'FLAGGED', 'UNDER_REVIEW', 'BLOCKED'],
      default: 'SAFE',
      index: true,
    },
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ lastActivityAt: -1 });
conversationSchema.index({ status: 1, complianceStatus: 1 });

export const Conversation = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema);
