import mongoose, { Document, Schema } from 'mongoose';
import { CURRENT_TERMS_VERSION } from '../config/termsConfig';

export interface IUser extends Document {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  role: 'user' | 'admin';
  verified: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  isActive: boolean;
  status: 'Active' | 'Under Review' | 'Suspended' | 'Blocked' | 'Deleted';
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletionReason?: string;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: mongoose.Types.ObjectId;
  termsAccepted: boolean;
  termsVersion: string;
  termsAcceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
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

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

