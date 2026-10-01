import mongoose, { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';

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

export const Block = createPrismaModelAdapter<IBlock>('block', {"blocker":"blockerId","blockedUser":"blockedUserId"});
