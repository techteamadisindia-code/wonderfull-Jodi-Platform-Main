import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IBiodataSectionVisibility {
  personalDetails: boolean;
  education: boolean;
  medicalCareer: boolean;
  family: boolean;
  lifestyle: boolean;
  horoscope: boolean;
  partnerPreferences: boolean;
  contactDetails: boolean;
  photo: boolean;
}

export interface IBiodataPersonalDetails {
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  age?: number;
  height: string;
  maritalStatus: string;
  religion: string;
  caste: string;
  subCaste?: string;
  motherTongue: string;
}

export interface IBiodataLocation {
  currentCity?: string;
  currentState?: string;
  currentCountry?: string;
  nativePlace?: string;
  formattedLocation?: string;
}

export interface IBiodataEducation {
  primaryQualification: string;
  college?: string;
  university?: string;
  graduationYear?: string;
  postgraduateQualification?: string;
  pgCollege?: string;
  pgYear?: string;
  additionalQualification?: string;
}

export interface IBiodataMedicalCareer {
  occupation: string;
  specialization?: string;
  designation?: string;
  currentHospital?: string;
  workLocation?: string;
  experience?: string;
  practiceType?: string;
  annualIncome?: string;
  medicalRegistrationNumber?: string;
  medicalCouncil?: string;
}

export interface IBiodataFamily {
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  siblings?: string;
  familyType?: string;
  familyValues?: string;
  familyStatus?: string;
  nativePlace?: string;
  familyLocation?: string;
}

export interface IBiodataLifestyle {
  diet?: string;
  smoking?: string;
  drinking?: string;
  hobbies?: string[];
  languagesKnown?: string[];
}

export interface IBiodataHoroscope {
  dob?: string;
  timeOfBirth?: string;
  placeOfBirth?: string;
  rashi?: string;
  nakshatra?: string;
  lagna?: string;
  manglik?: string;
  gotra?: string;
  pada?: string | number;
  gana?: string;
  nadi?: string;
}

export interface IBiodataPartnerPreferences {
  preferredAge?: string;
  preferredHeight?: string;
  preferredLocation?: string;
  preferredEducation?: string;
  preferredSpecialization?: string;
  preferredMaritalStatus?: string;
  otherExpectations?: string;
}

export interface IBiodataContactDetails {
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface IBiodata extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  publicId: string;
  title: string;
  templateId: 'traditional' | 'modern' | 'elegant' | 'doctor_professional';
  status: 'DRAFT' | 'COMPLETED';

  personalDetails: IBiodataPersonalDetails;
  location: IBiodataLocation;
  education: IBiodataEducation;
  medicalCareer: IBiodataMedicalCareer;
  family: IBiodataFamily;
  lifestyle: IBiodataLifestyle;
  horoscope: IBiodataHoroscope;
  partnerPreferences: IBiodataPartnerPreferences;
  contactDetails: IBiodataContactDetails;

  photoUrl?: string;
  additionalPhotos?: string[];

  sectionVisibility: IBiodataSectionVisibility;

  generatedPdfUrl?: string;
  pdfGeneratedAt?: Date;
  pdfHash?: string;

  createdAt: Date;
  updatedAt: Date;
}

const sectionVisibilitySchema = new Schema<IBiodataSectionVisibility>(
  {
    personalDetails: { type: Boolean, default: true },
    education: { type: Boolean, default: true },
    medicalCareer: { type: Boolean, default: true },
    family: { type: Boolean, default: true },
    lifestyle: { type: Boolean, default: true },
    horoscope: { type: Boolean, default: true },
    partnerPreferences: { type: Boolean, default: true },
    contactDetails: { type: Boolean, default: false },
    photo: { type: Boolean, default: true },
  },
  { _id: false }
);

const biodataSchema = new Schema<IBiodata>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => 'WJBIO' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    },
    title: { type: String, default: 'My Doctor Matrimony Biodata', trim: true },
    templateId: {
      type: String,
      enum: ['traditional', 'modern', 'elegant', 'doctor_professional'],
      default: 'doctor_professional',
      index: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'COMPLETED'],
      default: 'DRAFT',
      index: true,
    },
    personalDetails: {
      fullName: { type: String, required: true, trim: true },
      gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
      dob: { type: String, required: true },
      age: { type: Number },
      height: { type: String, default: `5' 6"` },
      maritalStatus: { type: String, default: 'Never Married' },
      religion: { type: String, default: 'Hindu' },
      caste: { type: String, default: '' },
      subCaste: { type: String, default: '' },
      motherTongue: { type: String, default: 'Marathi' },
    },
    location: {
      currentCity: { type: String, default: '' },
      currentState: { type: String, default: '' },
      currentCountry: { type: String, default: 'India' },
      nativePlace: { type: String, default: '' },
      formattedLocation: { type: String, default: '' },
    },
    education: {
      primaryQualification: { type: String, default: 'MBBS' },
      college: { type: String, default: '' },
      university: { type: String, default: '' },
      graduationYear: { type: String, default: '' },
      postgraduateQualification: { type: String, default: '' },
      pgCollege: { type: String, default: '' },
      pgYear: { type: String, default: '' },
      additionalQualification: { type: String, default: '' },
    },
    medicalCareer: {
      occupation: { type: String, default: 'Doctor' },
      specialization: { type: String, default: 'General Medicine' },
      designation: { type: String, default: '' },
      currentHospital: { type: String, default: '' },
      workLocation: { type: String, default: '' },
      experience: { type: String, default: '' },
      practiceType: { type: String, default: 'Hospital Consultant' },
      annualIncome: { type: String, default: '' },
      medicalRegistrationNumber: { type: String, default: '' },
      medicalCouncil: { type: String, default: '' },
    },
    family: {
      fatherName: { type: String, default: '' },
      fatherOccupation: { type: String, default: '' },
      motherName: { type: String, default: '' },
      motherOccupation: { type: String, default: '' },
      siblings: { type: String, default: '' },
      familyType: { type: String, default: 'Nuclear Family' },
      familyValues: { type: String, default: 'Moderate' },
      familyStatus: { type: String, default: 'Upper Middle Class' },
      nativePlace: { type: String, default: '' },
      familyLocation: { type: String, default: '' },
    },
    lifestyle: {
      diet: { type: String, default: 'Vegetarian' },
      smoking: { type: String, default: 'Non-Smoker' },
      drinking: { type: String, default: 'Non-Drinker' },
      hobbies: [{ type: String }],
      languagesKnown: [{ type: String }],
    },
    horoscope: {
      dob: { type: String, default: '' },
      timeOfBirth: { type: String, default: '' },
      placeOfBirth: { type: String, default: '' },
      rashi: { type: String, default: '' },
      nakshatra: { type: String, default: '' },
      lagna: { type: String, default: '' },
      manglik: { type: String, default: 'Non-Manglik' },
      gotra: { type: String, default: '' },
      pada: { type: Schema.Types.Mixed, default: '' },
      gana: { type: String, default: '' },
      nadi: { type: String, default: '' },
    },
    partnerPreferences: {
      preferredAge: { type: String, default: '24 - 32 Years' },
      preferredHeight: { type: String, default: `5' 2" - 5' 9"` },
      preferredLocation: { type: String, default: 'Maharashtra / Anywhere in India' },
      preferredEducation: { type: String, default: 'MBBS / MD / MS / Medical Specialist' },
      preferredSpecialization: { type: String, default: 'Any Specialization' },
      preferredMaritalStatus: { type: String, default: 'Never Married' },
      otherExpectations: { type: String, default: '' },
    },
    contactDetails: {
      contactPerson: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    photoUrl: { type: String, default: '' },
    additionalPhotos: [{ type: String }],
    sectionVisibility: { type: sectionVisibilitySchema, default: () => ({}) },
    generatedPdfUrl: { type: String },
    pdfGeneratedAt: { type: Date },
    pdfHash: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
biodataSchema.index({ userId: 1, createdAt: -1 });
biodataSchema.index({ profileId: 1 });

export const Biodata = mongoose.models.Biodata || mongoose.model<IBiodata>('Biodata', biodataSchema);
