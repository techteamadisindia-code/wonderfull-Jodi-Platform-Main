import mongoose, { Document, Schema } from 'mongoose';

export interface IInterest extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  senderProfile?: mongoose.Types.ObjectId;
  receiverProfile?: mongoose.Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REJECTED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

const interestSchema = new Schema<IInterest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderProfile: { type: Schema.Types.ObjectId, ref: 'Profile', index: true },
    receiverProfile: { type: Schema.Types.ObjectId, ref: 'Profile', index: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

interestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
interestSchema.index({ createdAt: -1 });
interestSchema.index({ status: 1, createdAt: -1 });

export const Interest = mongoose.models.Interest || mongoose.model<IInterest>('Interest', interestSchema);
