import mongoose, { Document, Schema } from 'mongoose';

<<<<<<< HEAD
export type DocumentTypeCategory =
  | 'GOVERNMENT_ID'
  | 'DEGREE'
  | 'PROFESSIONAL'
  | 'EMPLOYMENT'
  | 'OTHER';

export type VerificationStatusType = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IVerification extends Document {
  user: mongoose.Types.ObjectId;
  documentType: DocumentTypeCategory | string;
  documentName: string;
  documentUrl: string;
  storageKey?: string;
  fileType?: string;
  fileSize?: number;
  status: VerificationStatusType;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedByEmail?: string;
  adminNotes?: string;
  rejectionReason?: string;
  attemptNumber: number;
  metadata?: Record<string, any>;
=======
export interface IVerification extends Document {
  user: mongoose.Types.ObjectId;
  documentType: string;
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  createdAt: Date;
  updatedAt: Date;
}

const verificationSchema = new Schema<IVerification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
<<<<<<< HEAD
    documentType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
      default: 'Verification Document',
    },
    documentUrl: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
      trim: true,
      default: 'application/pdf',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedByEmail: {
      type: String,
      trim: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
=======
    documentType: { type: String, required: true },
    documentUrl: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    notes: { type: String, trim: true },
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
  },
  { timestamps: true }
);

<<<<<<< HEAD
// Compound indexes for optimized querying
verificationSchema.index({ user: 1, documentType: 1, status: 1 });
verificationSchema.index({ status: 1, createdAt: -1 });
verificationSchema.index({ createdAt: -1 });

export const Verification =
  mongoose.models.Verification || mongoose.model<IVerification>('Verification', verificationSchema);
=======
export const Verification = mongoose.models.Verification || mongoose.model<IVerification>('Verification', verificationSchema);
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
