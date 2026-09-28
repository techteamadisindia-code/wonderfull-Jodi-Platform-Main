import mongoose, { Document, Schema } from 'mongoose';
import { Counter } from './Counter';

export type InquiryStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
export type InquiryPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type InquiryCategory =
  | 'GENERAL'
  | 'TECHNICAL_SUPPORT'
  | 'ACCOUNT_ISSUE'
  | 'MEMBERSHIP'
  | 'PAYMENT'
  | 'VERIFICATION'
  | 'PROFILE_ISSUE'
  | 'OTHER';
export type UserType = 'REGISTERED_MEMBER' | 'GUEST';

export interface IStatusHistory {
  status: InquiryStatus;
  changedBy?: mongoose.Types.ObjectId;
  changedByEmail?: string;
  note?: string;
  timestamp: Date;
}

export interface IAdminReply {
  replyText: string;
  sentBy?: mongoose.Types.ObjectId;
  sentByEmail?: string;
  sentAt: Date;
  emailSent: boolean;
  emailError?: string;
}

export interface IContactInquiry extends Document {
  inquiryId: string;
  name: string;
  mobileNumber: string;
  email: string;
  message: string;
  userId?: mongoose.Types.ObjectId;
  userType: UserType;
  status: InquiryStatus;
  priority: InquiryPriority;
  category: InquiryCategory;
  assignedTo?: mongoose.Types.ObjectId;
  adminNotes?: string;
  statusHistory: IStatusHistory[];
  adminReplies: IAdminReply[];
  notificationCreated: boolean;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByEmail: { type: String, trim: true },
    note: { type: String, trim: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const adminReplySchema = new Schema<IAdminReply>(
  {
    replyText: { type: String, required: true, trim: true, maxlength: 5000 },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sentByEmail: { type: String, trim: true },
    sentAt: { type: Date, default: Date.now },
    emailSent: { type: Boolean, default: false },
    emailError: { type: String, trim: true },
  },
  { _id: false }
);

const contactInquirySchema = new Schema<IContactInquiry>(
  {
    inquiryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobileNumber: { type: String, required: true, trim: true, maxlength: 20 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userType: {
      type: String,
      enum: ['REGISTERED_MEMBER', 'GUEST'],
      default: 'GUEST',
      index: true,
    },
    status: {
      type: String,
      enum: ['NEW', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'],
      default: 'NEW',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'GENERAL',
        'TECHNICAL_SUPPORT',
        'ACCOUNT_ISSUE',
        'MEMBERSHIP',
        'PAYMENT',
        'VERIFICATION',
        'PROFILE_ISSUE',
        'OTHER',
      ],
      default: 'GENERAL',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    adminNotes: { type: String, trim: true, maxlength: 5000 },
    statusHistory: { type: [statusHistorySchema], default: [] },
    adminReplies: { type: [adminReplySchema], default: [] },
    notificationCreated: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for admin queries
contactInquirySchema.index({ status: 1, createdAt: -1 });
contactInquirySchema.index({ priority: 1, status: 1, createdAt: -1 });
contactInquirySchema.index({ category: 1, createdAt: -1 });
contactInquirySchema.index({ email: 1, createdAt: -1 });
contactInquirySchema.index({ createdAt: -1 });

export const ContactInquiry =
  mongoose.models.ContactInquiry ||
  mongoose.model<IContactInquiry>('ContactInquiry', contactInquirySchema);

/**
 * Generate a unique contact inquiry ID in format WJ-CON-YYYY-XXXX
 */
export async function getNextContactInquiryId(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `ci_${year}`;

  let candidateId = '';
  let isUnique = false;

  while (!isUnique) {
    const result = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqRaw = result.seq;
    const seqNum = seqRaw > 10000 ? seqRaw - 100000 : seqRaw;
    const padded = String(Math.abs(seqNum)).padStart(4, '0');
    candidateId = `WJ-CON-${year}-${padded}`;

    const existing = await ContactInquiry.findOne({ inquiryId: candidateId });
    if (!existing) {
      isUnique = true;
    }
  }

  return candidateId;
}
