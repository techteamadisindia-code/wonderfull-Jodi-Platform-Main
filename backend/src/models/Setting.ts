import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  tollFreeNumber: string;
  officeAddress: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  requireManualProfileApproval: boolean;
  currency: string;
  razorpayLiveMode: boolean;
  minAgeMale: number;
  minAgeFemale: number;
  maxPhotoUploadLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    siteName: { type: String, default: 'Wonderful Jodi' },
    supportEmail: { type: String, default: 'support@wonderfuljodi.com' },
    supportPhone: { type: String, default: '+91 98765 43210' },
    tollFreeNumber: { type: String, default: '+91 1800 200 9090' },
    officeAddress: { type: String, default: 'Cyber City, Phase II, Gurugram, Haryana - 122002' },
    maintenanceMode: { type: Boolean, default: false },
    allowNewRegistrations: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: false },
    requireManualProfileApproval: { type: Boolean, default: true },
    currency: { type: String, default: 'INR' },
    razorpayLiveMode: { type: Boolean, default: false },
    minAgeMale: { type: Number, default: 21 },
    minAgeFemale: { type: Number, default: 18 },
    maxPhotoUploadLimit: { type: Number, default: 6 },
  },
  { timestamps: true }
);

export const Setting =
  mongoose.models.Setting || mongoose.model<ISetting>('Setting', settingSchema);
