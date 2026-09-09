import mongoose, { Document, Schema } from 'mongoose';

// ─── COUNTRY MODEL ───
export interface ICountry extends Document {
  name: string;
  code: string; // ISO-2 (e.g., 'IN')
  isoCode: string; // ISO-3 (e.g., 'IND')
  phoneCode?: string; // e.g., '+91'
  isActive: boolean;
  sortOrder: number;
  sourceType: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const countrySchema = new Schema<ICountry>(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    isoCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    phoneCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'ISO-3166 / Census India' },
  },
  { timestamps: true }
);

// ─── STATE / UNION TERRITORY MODEL ───
export interface IState extends Document {
  countryId: mongoose.Types.ObjectId;
  name: string;
  code: string; // State code (e.g., 'MH', 'DL', 'KA')
  type: 'State' | 'Union Territory';
  lgdCode?: string; // Government of India Local Government Directory Code
  censusCode?: string; // 2011 Census location code
  isActive: boolean;
  sortOrder: number;
  sourceType: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const stateSchema = new Schema<IState>(
  {
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    type: { type: String, enum: ['State', 'Union Territory'], default: 'State', index: true },
    lgdCode: { type: String, trim: true, index: true },
    censusCode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'LGD / Census India' },
  },
  { timestamps: true }
);
stateSchema.index({ countryId: 1, name: 1 }, { unique: true });

// ─── DISTRICT MODEL ───
export interface IDistrict extends Document {
  stateId: mongoose.Types.ObjectId;
  countryId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  lgdCode?: string; // Local Government Directory Code
  censusCode?: string; // Census 2011 District Code
  headquarters?: string;
  isActive: boolean;
  sourceType: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const districtSchema = new Schema<IDistrict>(
  {
    stateId: { type: Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, uppercase: true },
    lgdCode: { type: String, trim: true, index: true },
    censusCode: { type: String, trim: true, index: true },
    headquarters: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD)' },
  },
  { timestamps: true }
);
districtSchema.index({ stateId: 1, name: 1 }, { unique: true });

// ─── SUB-DISTRICT (TALUKA / TEHSIL / MANDAL) MODEL ───
export interface ISubDistrict extends Document {
  districtId: mongoose.Types.ObjectId;
  stateId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  type: 'Taluka' | 'Tehsil' | 'Tahsil' | 'Sub-District' | 'Mandal' | 'Revenue Division';
  lgdCode?: string;
  censusCode?: string;
  isActive: boolean;
  sourceType: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const subDistrictSchema = new Schema<ISubDistrict>(
  {
    districtId: { type: Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true, uppercase: true },
    type: {
      type: String,
      enum: ['Taluka', 'Tehsil', 'Tahsil', 'Sub-District', 'Mandal', 'Revenue Division'],
      default: 'Taluka',
      index: true,
    },
    lgdCode: { type: String, trim: true, index: true },
    censusCode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD)' },
  },
  { timestamps: true }
);
subDistrictSchema.index({ districtId: 1, name: 1 }, { unique: true });

// ─── CITY / TOWN MODEL ───
export interface ICity extends Document {
  districtId: mongoose.Types.ObjectId;
  stateId: mongoose.Types.ObjectId;
  subDistrictId?: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  type: 'City' | 'Town' | 'Municipal Corporation' | 'Municipality' | 'Cantonment';
  pincode?: string;
  lgdCode?: string;
  isActive: boolean;
  sortOrder: number;
  sourceType: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<ICity>(
  {
    districtId: { type: Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    subDistrictId: { type: Schema.Types.ObjectId, ref: 'SubDistrict', index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true },
    type: {
      type: String,
      enum: ['City', 'Town', 'Municipal Corporation', 'Municipality', 'Cantonment'],
      default: 'City',
      index: true,
    },
    pincode: { type: String, trim: true, index: true },
    lgdCode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 999, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD) / ULB Master' },
  },
  { timestamps: true }
);
citySchema.index({ districtId: 1, name: 1 });
citySchema.index({ name: 'text' });

// ─── VILLAGE MODEL ───
export interface IVillage extends Document {
  subDistrictId: mongoose.Types.ObjectId;
  districtId: mongoose.Types.ObjectId;
  stateId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  villageCode?: string;
  lgdCode?: string;
  pincode?: string;
  isActive: boolean;
  sourceType: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const villageSchema = new Schema<IVillage>(
  {
    subDistrictId: { type: Schema.Types.ObjectId, ref: 'SubDistrict', required: true, index: true },
    districtId: { type: Schema.Types.ObjectId, ref: 'District', required: true, index: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, trim: true },
    villageCode: { type: String, trim: true, index: true },
    lgdCode: { type: String, trim: true, index: true },
    pincode: { type: String, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sourceType: { type: String, default: 'GOVERNMENT', index: true },
    source: { type: String, default: 'Local Government Directory (LGD)' },
  },
  { timestamps: true }
);
villageSchema.index({ subDistrictId: 1, name: 1 });
villageSchema.index({ name: 'text' });

export const Country = mongoose.model<ICountry>('Country', countrySchema);
export const State = mongoose.model<IState>('State', stateSchema);
export const District = mongoose.model<IDistrict>('District', districtSchema);
export const SubDistrict = mongoose.model<ISubDistrict>('SubDistrict', subDistrictSchema);
export const City = mongoose.model<ICity>('City', citySchema);
export const Village = mongoose.model<IVillage>('Village', villageSchema);
