import mongoose, { Document, Schema } from 'mongoose';

export type RegistrationStatus = 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface IRegistrationBasicInfo {
  fullName?: string;
  email?: string;
  mobile?: string;
  passwordHash?: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  dob?: string;
  lookingFor?: 'Male' | 'Female' | 'Other' | '';
  agreeTerms?: boolean;
}

export interface IRegistrationPersonalInfo {
  maritalStatus?: string;
  motherTongue?: string;
  religion?: string;
  caste?: string;
  subCaste?: string;
  height?: string;
  city?: string;
  state?: string;
  country?: string;
  about?: string;
  foodPreference?: string;
  smoking?: string;
  drinking?: string;
}

export interface IRegistrationEducationProfession {
  education?: string;
  degree?: string;
  profession?: string;
  company?: string;
  workLocation?: string;
  annualIncome?: string;
  medicalRegistrationNumber?: string;
  medicalCollege?: string;
  medicalExperience?: string;
}

export interface ISiblingEntry {
  name?: string;
  age?: number;
  profession?: string;
  maritalStatus?: string;
  location?: string;
}

export interface IRegistrationSiblings {
  brothersCount?: number;
  sistersCount?: number;
  brothers?: ISiblingEntry[];
  sisters?: ISiblingEntry[];
}

export interface IQualificationEntry {
  qualification: string;
  specialization?: string;
  college: string;
  collegeId?: mongoose.Types.ObjectId | string;
  passingYear?: string;
  status?: 'Completed' | 'Pursuing' | string;
}

export interface IRegistrationMedicalQualifications {
  undergraduate?: IQualificationEntry[];
  postgraduate?: IQualificationEntry[];
  doctorate?: IQualificationEntry[];
}

export interface IRegistrationPartnerExpectations {
  ageMin?: number | string;
  ageMax?: number | string;
  heightMin?: string;
  heightMax?: string;
  qualification?: string;
  specialization?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  willingToRelocate?: boolean | string;
  maritalStatus?: string;
  lifestyle?: {
    diet?: string;
    smoking?: string;
    drinking?: string;
  };
  familyExpectations?: string;
  additionalExpectations?: string;
}

export interface IRegistrationFamilyDetails {
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: string;
  familyType?: string;
  familyStatus?: string;
  fatherName?: string;
  fatherProfession?: string;
  motherName?: string;
  motherProfession?: string;
  familyLocation?: string;
  familyValues?: string;
  aboutFamily?: string;
}

export interface IRegistrationPreferences {
  prefAgeMin?: string;
  prefAgeMax?: string;
  prefCity?: string;
  prefDiet?: string;
  lookingFor?: string;
  prefEducation?: string;
  prefProfession?: string;
}

export interface IRegistrationPhotos {
  primaryPhoto?: string;
  photos?: string[];
  idProofUrl?: string;
}

export interface IRegistrationStepData {
  basicInfo?: IRegistrationBasicInfo;
  personalInfo?: IRegistrationPersonalInfo & {
    aboutMe?: string;
    personalityValues?: string;
    hobbiesInterests?: string;
    careerGoals?: string;
  };
  educationProfession?: IRegistrationEducationProfession;
  familyDetails?: IRegistrationFamilyDetails;
  siblings?: IRegistrationSiblings;
  medicalQualifications?: IRegistrationMedicalQualifications;
  partnerExpectations?: IRegistrationPartnerExpectations;
  preferences?: IRegistrationPreferences;
  photos?: IRegistrationPhotos;
  rawFormData?: Record<string, any>;
}

export interface IRegistration extends Document {
  registrationId: string;
  status: RegistrationStatus;
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  candidateName: string;
  email?: string;
  mobile?: string;
  gender?: string;
  stepData: IRegistrationStepData;
  user?: mongoose.Types.ObjectId;
  profile?: mongoose.Types.ObjectId;
  resumeToken?: string;
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  abandonedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new Schema<IRegistration>(
  {
    registrationId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    currentStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    totalSteps: {
      type: Number,
      default: 4,
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    candidateName: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    mobile: {
      type: String,
      trim: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: '',
    },
    stepData: {
      basicInfo: {
        fullName: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true },
        mobile: { type: String, trim: true },
        passwordHash: { type: String },
        gender: { type: String },
        dob: { type: String },
        lookingFor: { type: String },
        agreeTerms: { type: Boolean, default: false },
      },
      personalInfo: {
        maritalStatus: { type: String },
        motherTongue: { type: String },
        religion: { type: String },
        caste: { type: String },
        subCaste: { type: String },
        height: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        about: { type: String },
        aboutMe: { type: String },
        personalityValues: { type: String },
        hobbiesInterests: { type: String },
        careerGoals: { type: String },
        foodPreference: { type: String },
        smoking: { type: String },
        drinking: { type: String },
      },
      educationProfession: {
        education: { type: String },
        degree: { type: String },
        profession: { type: String },
        company: { type: String },
        workLocation: { type: String },
        annualIncome: { type: String },
        medicalRegistrationNumber: { type: String, trim: true },
        medicalCollege: { type: String, trim: true },
        medicalExperience: { type: String, trim: true },
      },
      familyDetails: {
        fatherOccupation: { type: String },
        motherOccupation: { type: String },
        siblings: { type: String },
        familyType: { type: String },
        familyStatus: { type: String },
        fatherName: { type: String },
        fatherProfession: { type: String },
        motherName: { type: String },
        motherProfession: { type: String },
        familyLocation: { type: String },
        familyValues: { type: String },
        aboutFamily: { type: String },
      },
      siblings: {
        brothersCount: { type: Number, default: 0 },
        sistersCount: { type: Number, default: 0 },
        brothers: [
          {
            name: { type: String },
            age: { type: Number },
            profession: { type: String },
            maritalStatus: { type: String },
            location: { type: String },
          },
        ],
        sisters: [
          {
            name: { type: String },
            age: { type: Number },
            profession: { type: String },
            maritalStatus: { type: String },
            location: { type: String },
          },
        ],
      },
      medicalQualifications: {
        undergraduate: [
          {
            qualification: { type: String },
            college: { type: String },
            collegeId: { type: Schema.Types.ObjectId, ref: 'Institution' },
            passingYear: { type: String },
            status: { type: String },
          },
        ],
        postgraduate: [
          {
            qualification: { type: String },
            specialization: { type: String },
            college: { type: String },
            collegeId: { type: Schema.Types.ObjectId, ref: 'Institution' },
            passingYear: { type: String },
            status: { type: String },
          },
        ],
        doctorate: [
          {
            qualification: { type: String },
            specialization: { type: String },
            college: { type: String },
            collegeId: { type: Schema.Types.ObjectId, ref: 'Institution' },
            passingYear: { type: String },
            status: { type: String },
          },
        ],
      },
      partnerExpectations: {
        ageMin: { type: Schema.Types.Mixed },
        ageMax: { type: Schema.Types.Mixed },
        heightMin: { type: String },
        heightMax: { type: String },
        qualification: { type: String },
        specialization: { type: String },
        location: {
          country: { type: String },
          state: { type: String },
          city: { type: String },
        },
        willingToRelocate: { type: Schema.Types.Mixed },
        maritalStatus: { type: String },
        lifestyle: {
          diet: { type: String },
          smoking: { type: String },
          drinking: { type: String },
        },
        familyExpectations: { type: String },
        additionalExpectations: { type: String },
      },
      preferences: {
        prefAgeMin: { type: String },
        prefAgeMax: { type: String },
        prefCity: { type: String },
        prefDiet: { type: String },
        lookingFor: { type: String },
        prefEducation: { type: String },
        prefProfession: { type: String },
      },
      photos: {
        primaryPhoto: { type: String },
        photos: [{ type: String }],
        idProofUrl: { type: String },
      },
      rawFormData: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    profile: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      index: true,
    },
    resumeToken: {
      type: String,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    abandonedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for high performance admin filtering & sorting
registrationSchema.index({ status: 1, lastActiveAt: -1 });
registrationSchema.index({ status: 1, currentStep: 1 });
registrationSchema.index({ status: 1, completionPercentage: -1 });

export const Registration =
  mongoose.models.Registration || mongoose.model<IRegistration>('Registration', registrationSchema);
