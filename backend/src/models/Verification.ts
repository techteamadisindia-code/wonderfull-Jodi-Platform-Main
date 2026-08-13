import mongoose, { Document, Schema } from 'mongoose';

export interface IVerification extends Document {
  user: mongoose.Types.ObjectId;
  documentType: string;
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const verificationSchema = new Schema<IVerification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: { type: String, required: true },
    documentUrl: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Verification = mongoose.models.Verification || mongoose.model<IVerification>('Verification', verificationSchema);
