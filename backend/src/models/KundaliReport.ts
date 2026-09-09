import mongoose, { Document, Schema } from 'mongoose';

export interface IBirthSnapshot {
  name: string;
  gender?: string;
  dob: Date;
  timeOfBirth?: string;
  placeOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: number;
  rashiIndex?: number;
  rashiName?: string;
  nakshatraIndex?: number;
  nakshatraName?: string;
  pada?: number;
  lagnaName?: string;
  manglikStatus?: string;
}

export interface IKundaliReport extends Document {
  user1?: mongoose.Types.ObjectId;
  user2?: mongoose.Types.ObjectId;
  partner1ProfileId?: mongoose.Types.ObjectId;
  partner2ProfileId?: mongoose.Types.ObjectId;
  user1BirthDetails: IBirthSnapshot;
  user2BirthDetails: IBirthSnapshot;
  birthDataVersion: string; // Deterministic match key for caching and cache-invalidation
  gunaScore: number;
  varnaScore: number;
  vashyaScore: number;
  taraScore: number;
  yoniScore: number;
  grahaMaitriScore: number;
  ganaScore: number;
  bhakootScore: number;
  nadiScore: number;
  manglikStatusUser1: string;
  manglikStatusUser2: string;
  manglikAnalysis: string;
  compatibilityIndicator: string;
  summary: string;
  doshas: string[];
  ashtakootaDetails: any;
  dimensions?: any;
  isCached: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const birthSnapshotSchema = new Schema<IBirthSnapshot>(
  {
    name: { type: String, required: true },
    gender: { type: String },
    dob: { type: Date, required: true },
    timeOfBirth: { type: String },
    placeOfBirth: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    timezone: { type: Number },
    rashiIndex: { type: Number },
    rashiName: { type: String },
    nakshatraIndex: { type: Number },
    nakshatraName: { type: String },
    pada: { type: Number },
    lagnaName: { type: String },
    manglikStatus: { type: String },
  },
  { _id: false }
);

const kundaliReportSchema = new Schema<IKundaliReport>(
  {
    user1: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    user2: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    partner1ProfileId: { type: Schema.Types.ObjectId, ref: 'Profile', index: true },
    partner2ProfileId: { type: Schema.Types.ObjectId, ref: 'Profile', index: true },
    user1BirthDetails: { type: birthSnapshotSchema, required: true },
    user2BirthDetails: { type: birthSnapshotSchema, required: true },
    birthDataVersion: { type: String, required: true, index: true },
    gunaScore: { type: Number, required: true },
    varnaScore: { type: Number, required: true },
    vashyaScore: { type: Number, required: true },
    taraScore: { type: Number, required: true },
    yoniScore: { type: Number, required: true },
    grahaMaitriScore: { type: Number, required: true },
    ganaScore: { type: Number, required: true },
    bhakootScore: { type: Number, required: true },
    nadiScore: { type: Number, required: true },
    manglikStatusUser1: { type: String, default: 'Unable to determine' },
    manglikStatusUser2: { type: String, default: 'Unable to determine' },
    manglikAnalysis: { type: String, default: '' },
    compatibilityIndicator: { type: String, required: true },
    summary: { type: String, required: true },
    doshas: [{ type: String }],
    ashtakootaDetails: { type: Schema.Types.Mixed },
    dimensions: { type: Schema.Types.Mixed },
    isCached: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index to quickly find existing cached reports between users
kundaliReportSchema.index({ user1: 1, birthDataVersion: 1 });
kundaliReportSchema.index({ user1: 1, user2: 1 });

export const KundaliReport =
  mongoose.models.KundaliReport || mongoose.model<IKundaliReport>('KundaliReport', kundaliReportSchema);
