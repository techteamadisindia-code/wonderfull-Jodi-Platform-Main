import mongoose, { Document, Schema } from 'mongoose';

export interface IInterest extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const interestSchema = new Schema<IInterest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
  },
  { timestamps: true }
);

interestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export const Interest = mongoose.models.Interest || mongoose.model<IInterest>('Interest', interestSchema);
