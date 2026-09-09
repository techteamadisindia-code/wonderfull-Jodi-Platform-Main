import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  tollFreeNumber: string;
  officeAddress: string;
  maintenanceMode: boolean;
  maintenanceBanner: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceEstimatedEndTime: Date | null;
  allowAdminAccess: boolean;
  maintenanceUpdatedBy?: string;
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
    supportPhone: { type: String, default: '+91 096075 59547' },
    tollFreeNumber: { type: String, default: '+91 096075 59547' },
    officeAddress: { type: String, default: 'A303, Gera Imperium Gateway, Nashik Phata, PCMC, Pune, Maharashtra 411034' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceBanner: { type: Boolean, default: false },
    maintenanceTitle: { type: String, default: "We'll Be Back Soon" },
    maintenanceMessage: {
      type: String,
      default: 'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
    },
    maintenanceEstimatedEndTime: { type: Date, default: null },
    allowAdminAccess: { type: Boolean, default: true },
    maintenanceUpdatedBy: { type: String, default: '' },
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
