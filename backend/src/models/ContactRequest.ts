import mongoose, { Document, Schema } from 'mongoose';

export type ContactRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface IContactRequest extends Document {
  requester: mongoose.Types.ObjectId;
  requesterId?: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId;
  status: ContactRequestStatus;
  contactCreditDeducted: boolean;
  contactUnlockedAt?: Date | null;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactRequestSchema = new Schema<IContactRequest>(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    contactCreditDeducted: { type: Boolean, default: false },
    contactUnlockedAt: { type: Date, default: null },
    message: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Virtual aliases for requesterId and recipientId
contactRequestSchema.virtual('requesterId').get(function () {
  return this.requester;
});
contactRequestSchema.virtual('recipientId').get(function () {
  return this.recipient;
});

// Index to efficiently look up mutual relationship and prevent duplicate pending requests
contactRequestSchema.index({ requester: 1, recipient: 1 });
contactRequestSchema.index({ recipient: 1, status: 1 });

export const ContactRequest =
  mongoose.models.ContactRequest ||
  mongoose.model<IContactRequest>('ContactRequest', contactRequestSchema);
