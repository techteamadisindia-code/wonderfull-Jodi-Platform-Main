import mongoose, { Document, Schema } from 'mongoose';

export type LocationImportStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'PREVIEW_READY'
  | 'IMPORTED'
  | 'PARTIALLY_IMPORTED'
  | 'FAILED'
  | 'CANCELLED';

export interface ILocationExtractedRow {
  state?: string;
  stateCode?: string;
  stateType?: 'State' | 'Union Territory';
  stateLgdCode?: string;
  district?: string;
  districtLgdCode?: string;
  subDistrict?: string;
  subDistrictType?: string;
  subDistrictLgdCode?: string;
  city?: string;
  cityType?: string;
  village?: string;
  pinCode?: string;
  officialCode?: string;
  status: 'VALID' | 'DUPLICATE' | 'INVALID';
  reason?: string;
}

export interface ILocationImportError {
  row?: number;
  item?: string;
  error: string;
}

export interface ILocationImport extends Document {
  importId: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  adminEmail: string;
  status: LocationImportStatus;
  source: string;
  sourceVersion?: string;
  totalExtracted: number;
  validRecords: number;
  duplicateRecords: number;
  invalidRecords: number;
  missingStateRecords: number;
  missingDistrictRecords: number;
  missingCityRecords: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  extractedPreview: ILocationExtractedRow[];
  fullExtractedRecords?: ILocationExtractedRow[];
  importErrors: ILocationImportError[];
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const locationExtractedRowSchema = new Schema<ILocationExtractedRow>(
  {
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    stateType: { type: String, enum: ['State', 'Union Territory'] },
    stateLgdCode: { type: String, trim: true },
    district: { type: String, trim: true },
    districtLgdCode: { type: String, trim: true },
    subDistrict: { type: String, trim: true },
    subDistrictType: { type: String, trim: true },
    subDistrictLgdCode: { type: String, trim: true },
    city: { type: String, trim: true },
    cityType: { type: String, trim: true },
    village: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    officialCode: { type: String, trim: true },
    status: { type: String, enum: ['VALID', 'DUPLICATE', 'INVALID'], default: 'VALID' },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const locationImportSchema = new Schema<ILocationImport>(
  {
    importId: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    fileMimeType: { type: String, required: true, default: 'application/pdf' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'PREVIEW_READY', 'IMPORTED', 'PARTIALLY_IMPORTED', 'FAILED', 'CANCELLED'],
      default: 'UPLOADED',
      index: true,
    },
    source: { type: String, default: 'Local Government Directory (LGD) PDF' },
    sourceVersion: { type: String, trim: true },
    totalExtracted: { type: Number, default: 0 },
    validRecords: { type: Number, default: 0 },
    duplicateRecords: { type: Number, default: 0 },
    invalidRecords: { type: Number, default: 0 },
    missingStateRecords: { type: Number, default: 0 },
    missingDistrictRecords: { type: Number, default: 0 },
    missingCityRecords: { type: Number, default: 0 },
    insertedCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    extractedPreview: [locationExtractedRowSchema],
    fullExtractedRecords: [locationExtractedRowSchema],
    importErrors: [
      {
        row: { type: Number },
        item: { type: String, trim: true },
        error: { type: String, required: true, trim: true },
      },
    ],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const LocationImport =
  mongoose.models.LocationImport || mongoose.model<ILocationImport>('LocationImport', locationImportSchema);
