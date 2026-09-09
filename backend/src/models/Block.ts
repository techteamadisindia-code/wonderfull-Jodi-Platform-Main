import mongoose, { Document, Schema } from 'mongoose';

export interface IBlock extends Document {
  blocker: mongoose.Types.ObjectId;
  blockedUser: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const blockSchema = new Schema<IBlock>(
  {
    blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

blockSchema.index({ blocker: 1, blockedUser: 1 }, { unique: true });

export const Block = mongoose.models.Block || mongoose.model<IBlock>('Block', blockSchema);
