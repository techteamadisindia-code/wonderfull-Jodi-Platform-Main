import mongoose, { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';

export interface IShortlist extends Document {
  user: mongoose.Types.ObjectId;
  profile: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shortlistSchema = new Schema<IShortlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profile: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
  },
  { timestamps: true }
);

shortlistSchema.index({ user: 1, profile: 1 }, { unique: true });

export const Shortlist = createPrismaModelAdapter<IShortlist>('shortlist', {"user":"userId","profile":"profileId"});
