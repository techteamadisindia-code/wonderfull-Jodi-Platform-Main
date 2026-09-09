import mongoose, { Document, Schema } from 'mongoose';

// ─── LANGUAGE MODEL ───
export interface ILanguage extends Document {
  name: string;
  code: string; // ISO 639-1 / 639-2 (e.g. 'mr', 'hi', 'en')
  nativeNames: string[]; // e.g. ['मराठी', 'Marathi']
  isScheduled: boolean; // 8th Schedule of Indian Constitution
  isActive: boolean;
  sortOrder: number;
  sourceType: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const languageSchema = new Schema<ILanguage>(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    nativeNames: [{ type: String, trim: true }],
    isScheduled: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Eighth Schedule to the Constitution of India' },
  },
  { timestamps: true }
);

// ─── RELIGION MODEL ───
export interface IReligion extends Document {
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const religionSchema = new Schema<IReligion>(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
  },
  { timestamps: true }
);

// ─── CASTE / COMMUNITY MODEL ───
export interface ICaste extends Document {
  religionId: mongoose.Types.ObjectId;
  name: string;
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'Other' | 'Not Specified';
  aliases: string[];
  source: string;
  sourceType: 'GOVERNMENT' | 'LGD' | 'DEPARTMENT_OF_SOCIAL_JUSTICE' | 'HISTORICAL_REFERENCE' | 'COMMUNITY_MASTER';
  sourceReference?: string;
  lastVerifiedAt?: Date;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const casteSchema = new Schema<ICaste>(
  {
    religionId: { type: Schema.Types.ObjectId, ref: 'Religion', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'Other', 'Not Specified'],
      default: 'Not Specified',
      index: true,
    },
    aliases: [{ type: String, trim: true }],
    source: { type: String, default: 'Community Master' },
    sourceType: {
      type: String,
      enum: ['GOVERNMENT', 'LGD', 'DEPARTMENT_OF_SOCIAL_JUSTICE', 'HISTORICAL_REFERENCE', 'COMMUNITY_MASTER'],
      default: 'COMMUNITY_MASTER',
      index: true,
    },
    sourceReference: { type: String, trim: true },
    lastVerifiedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
casteSchema.index({ religionId: 1, name: 1 }, { unique: true });
casteSchema.index({ name: 'text', aliases: 'text' });

// ─── SUB-CASTE MODEL ───
export interface ISubCaste extends Document {
  casteId: mongoose.Types.ObjectId;
  name: string;
  aliases: string[];
  source: string;
  sourceType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subCasteSchema = new Schema<ISubCaste>(
  {
    casteId: { type: Schema.Types.ObjectId, ref: 'Caste', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    aliases: [{ type: String, trim: true }],
    source: { type: String, default: 'Community Master' },
    sourceType: { type: String, default: 'COMMUNITY_MASTER', index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
subCasteSchema.index({ casteId: 1, name: 1 }, { unique: true });

export const Language = mongoose.model<ILanguage>('Language', languageSchema);
export const Religion = mongoose.model<IReligion>('Religion', religionSchema);
export const Caste = mongoose.model<ICaste>('Caste', casteSchema);
export const SubCaste = mongoose.model<ISubCaste>('SubCaste', subCasteSchema);
