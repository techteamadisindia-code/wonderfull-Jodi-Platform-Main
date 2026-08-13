import mongoose, { Document, Schema } from 'mongoose';

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

export const Shortlist = mongoose.models.Shortlist || mongoose.model<IShortlist>('Shortlist', shortlistSchema);
