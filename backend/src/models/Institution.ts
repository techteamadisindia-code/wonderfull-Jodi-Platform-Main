import mongoose, { Document, Schema } from 'mongoose';

export type InstitutionType = 'COLLEGE' | 'UNIVERSITY' | 'HOSPITAL' | 'INSTITUTE';

export interface IInstitution extends Document {
  name: string;
  normalizedName: string;
  type: InstitutionType;
  city?: string;
  state?: string;
  country?: string;
  usageCount: number;
  createdBy?: mongoose.Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Normalizes an institution name for duplicate detection:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase
 * - Collapses consecutive whitespace into a single space
 * - Strips trailing punctuation
 */
export function normalizeInstitutionName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;]+$/, '');
}

const institutionSchema = new Schema<IInstitution>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 250,
      index: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['COLLEGE', 'UNIVERSITY', 'HOSPITAL', 'INSTITUTE'],
      default: 'COLLEGE',
      index: true,
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    usageCount: {
      type: Number,
      default: 1,
      min: 1,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for rapid autocomplete and sorting
institutionSchema.index({ normalizedName: 1 });
institutionSchema.index({ usageCount: -1, name: 1 });
institutionSchema.index({ name: 'text', city: 'text', state: 'text' });

export const Institution =
  mongoose.models.Institution || mongoose.model<IInstitution>('Institution', institutionSchema);
