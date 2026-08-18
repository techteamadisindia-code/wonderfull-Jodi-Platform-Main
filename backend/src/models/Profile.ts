import mongoose, { Document, Schema } from 'mongoose';

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;
  displayName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: Date;
  height: string;
  maritalStatus: string;
  motherTongue: string;
  religion: string;
  caste: string;
  subCaste?: string;
  education: string;
  degree: string;
  profession: string;
  company?: string;
  workLocation?: string;
  annualIncome?: string;
  country: string;
  state: string;
  city: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: string;
  familyType?: string;
  foodPreference?: string;
  smoking?: string;
  drinking?: string;
  hobbies?: string[];
  about?: string;
  photos: string[];
  primaryPhoto?: string;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true, index: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true, index: true },
    dob: { type: Date, required: true, index: true },
    height: { type: String, required: true },
    maritalStatus: { type: String, required: true, index: true },
    motherTongue: { type: String, required: true, index: true },
    religion: { type: String, required: true, index: true },
    caste: { type: String, required: true, index: true },
    subCaste: { type: String, index: true },
    education: { type: String, required: true, index: true },
    degree: { type: String, required: true, index: true },
    profession: { type: String, required: true, index: true },
    company: { type: String, trim: true },
    workLocation: { type: String, trim: true, index: true },
    annualIncome: { type: String, trim: true, index: true },
    country: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    fatherOccupation: { type: String, trim: true },
    motherOccupation: { type: String, trim: true },
    siblings: { type: String, trim: true },
    familyType: { type: String, trim: true },
    foodPreference: { type: String, trim: true },
    smoking: { type: String, trim: true },
    drinking: { type: String, trim: true },
    hobbies: [{ type: String, trim: true }],
    about: { type: String, trim: true },
    photos: [{ type: String, trim: true }],
    primaryPhoto: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'],
      default: 'UNVERIFIED',
      index: true,
    },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

profileSchema.index({ gender: 1, city: 1, religion: 1, caste: 1, education: 1, profession: 1 });

export const Profile = mongoose.models.Profile || mongoose.model<IProfile>('Profile', profileSchema);
