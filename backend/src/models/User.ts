import { createPrismaModelAdapter, Document, Schema, Types } from '../db/prismaBridge';
import { CURRENT_TERMS_VERSION } from '../config/termsConfig';

export interface IUser extends Document {
  id: string;
  _id: string;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  role: 'user' | 'admin' | string;
  verified?: boolean;
  verificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
  isActive?: boolean;
  status?: 'Active' | 'Under Review' | 'Suspended' | 'Blocked' | 'Deleted' | string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: any;
  deletionReason?: string | null;
  suspensionReason?: string | null;
  suspendedAt?: Date | null;
  suspendedBy?: any;
  termsAccepted?: boolean;
  termsVersion?: string;
  termsAcceptedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    mobile: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    verified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
      default: 'UNVERIFIED',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ['Active', 'Under Review', 'Suspended', 'Blocked', 'Deleted'],
      default: 'Active',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String, trim: true },
    suspensionReason: { type: String, trim: true },
    suspendedAt: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    termsAccepted: { type: Boolean, default: false },
    termsVersion: { type: String, default: CURRENT_TERMS_VERSION },
    termsAcceptedAt: { type: Date },
  },
  { timestamps: true }
);

export const User = createPrismaModelAdapter<IUser>('user');
