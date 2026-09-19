import mongoose, { Document, Schema } from 'mongoose';

export interface IAward extends Document {
  name: string;
  slug: string;
  logo: string;
  shortDescription: string;
  fullDescription: string;
  awardYear: number;
  category: string;
  organization: string;
  galleryImages: string[];
  websiteUrl?: string;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const awardSchema = new Schema<IAward>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    logo: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, default: '', trim: true },
    awardYear: { type: Number, required: true, index: true },
    category: { type: String, default: 'Excellence in Matrimony', trim: true, index: true },
    organization: { type: String, required: true, trim: true },
    galleryImages: [{ type: String, trim: true }],
    websiteUrl: { type: String, trim: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for public queries
awardSchema.index({ isActive: 1, isDeleted: 1, displayOrder: 1, awardYear: -1 });
awardSchema.index({ isFeatured: 1, isActive: 1, isDeleted: 1, displayOrder: 1 });

export const Award = mongoose.models.Award || mongoose.model<IAward>('Award', awardSchema);
