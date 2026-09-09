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
<<<<<<< HEAD
  medicalRegistrationNumber?: string;
  medicalCouncil?: string;
  registrationState?: string;
  registrationYear?: string;
  medicalExperience?: string;
  currentHospital?: string;
  medicalCollege?: string;
  medicalUniversity?: string;
  graduationYear?: string;
  additionalQualification?: string;
  currentRole?: string;
  workType?: string;
  currentlyPracticing?: boolean;
  familyStatus?: string;
  familyValues?: string;
  nativePlace?: string;
  familyLocation?: string;
  profileManagedBy?: string;
  currentLocation?: {
    countryId?: mongoose.Types.ObjectId;
    stateId?: mongoose.Types.ObjectId;
    districtId?: mongoose.Types.ObjectId;
    subDistrictId?: mongoose.Types.ObjectId;
    cityId?: mongoose.Types.ObjectId;
    villageId?: mongoose.Types.ObjectId;
    pincode?: string;
    formattedAddress?: string;
  };
  nativePlaceDetails?: {
    countryId?: mongoose.Types.ObjectId;
    stateId?: mongoose.Types.ObjectId;
    districtId?: mongoose.Types.ObjectId;
    subDistrictId?: mongoose.Types.ObjectId;
    cityId?: mongoose.Types.ObjectId;
    villageId?: mongoose.Types.ObjectId;
    pincode?: string;
    description?: string;
    formattedAddress?: string;
  };
  communityDetails?: {
    religionId?: mongoose.Types.ObjectId;
    casteId?: mongoose.Types.ObjectId;
    subCasteId?: mongoose.Types.ObjectId;
    casteCategory?: string;
    subCasteText?: string;
  };
  languageDetails?: {
    motherTongueId?: mongoose.Types.ObjectId;
    otherLanguagesIds?: mongoose.Types.ObjectId[];
  };
  horoscope?: {
    timeOfBirth?: string;
    placeOfBirth?: string;
    rashi?: string;
    nakshatra?: string;
    lagna?: string;
    manglik?: string;
    gotra?: string;
    horoscopeDocument?: string;
    pada?: number;
    birthPlaceDetails?: {
      city?: string;
      state?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      timezone?: number;
    };
  };
  lifestyleInterests?: {
    diet?: string;
    alcohol?: string;
    smoking?: string;
    exercise?: string;
    hobbies?: string[];
    travel?: string[];
    music?: string[];
    reading?: string[];
    sports?: string[];
    languages?: string[];
    pets?: string;
    otherInterests?: string;
  };
  partnerPreferences?: {
    preferredAgeMin?: number;
    preferredAgeMax?: number;
    preferredLocation?: string;
    preferredQualification?: string;
    preferredSpecialization?: string;
    preferredMaritalStatus?: string;
    otherPreferences?: string;
  };
  privacySettings?: {
    profileVisibility: 'all' | 'verified_only' | 'members_only' | 'hidden';
    photoVisibility: 'all' | 'members_only' | 'on_request' | 'hidden';
    contactVisibility: 'accepted_interests_only' | 'members_only' | 'hidden';
    whoCanSendInterest: 'all' | 'verified_only' | 'premium_only';
    whoCanMessage: 'accepted_interests_only' | 'all_members';
    horoscopeVisibility?: 'all' | 'members_only' | 'verified_only' | 'hidden';
    birthDateVisibility?: 'full' | 'year_only' | 'hidden';
    birthTimeVisibility?: 'all' | 'members_only' | 'hidden';
    birthPlaceVisibility?: 'all' | 'members_only' | 'hidden';
    kundaliVisibility?: 'all' | 'members_only' | 'hidden';
  };
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
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
<<<<<<< HEAD
    medicalRegistrationNumber: { type: String, trim: true },
    medicalCouncil: { type: String, trim: true },
    registrationState: { type: String, trim: true },
    registrationYear: { type: String, trim: true },
    medicalExperience: { type: String, trim: true },
    currentHospital: { type: String, trim: true },
    medicalCollege: { type: String, trim: true },
    medicalUniversity: { type: String, trim: true },
    graduationYear: { type: String, trim: true },
    additionalQualification: { type: String, trim: true },
    currentRole: { type: String, trim: true },
    workType: { type: String, trim: true },
    currentlyPracticing: { type: Boolean, default: true },
    familyStatus: { type: String, trim: true },
    familyValues: { type: String, trim: true },
    nativePlace: { type: String, trim: true },
    familyLocation: { type: String, trim: true },
    profileManagedBy: { type: String, trim: true, default: 'Self' },
    currentLocation: {
      countryId: { type: Schema.Types.ObjectId, ref: 'Country', index: true },
      stateId: { type: Schema.Types.ObjectId, ref: 'State', index: true },
      districtId: { type: Schema.Types.ObjectId, ref: 'District', index: true },
      subDistrictId: { type: Schema.Types.ObjectId, ref: 'SubDistrict', index: true },
      cityId: { type: Schema.Types.ObjectId, ref: 'City', index: true },
      villageId: { type: Schema.Types.ObjectId, ref: 'Village', index: true },
      pincode: { type: String, trim: true },
      formattedAddress: { type: String, trim: true },
    },
    nativePlaceDetails: {
      countryId: { type: Schema.Types.ObjectId, ref: 'Country', index: true },
      stateId: { type: Schema.Types.ObjectId, ref: 'State', index: true },
      districtId: { type: Schema.Types.ObjectId, ref: 'District', index: true },
      subDistrictId: { type: Schema.Types.ObjectId, ref: 'SubDistrict', index: true },
      cityId: { type: Schema.Types.ObjectId, ref: 'City', index: true },
      villageId: { type: Schema.Types.ObjectId, ref: 'Village', index: true },
      pincode: { type: String, trim: true },
      description: { type: String, trim: true },
      formattedAddress: { type: String, trim: true },
    },
    communityDetails: {
      religionId: { type: Schema.Types.ObjectId, ref: 'Religion', index: true },
      casteId: { type: Schema.Types.ObjectId, ref: 'Caste', index: true },
      subCasteId: { type: Schema.Types.ObjectId, ref: 'SubCaste', index: true },
      casteCategory: { type: String, trim: true },
      subCasteText: { type: String, trim: true },
    },
    languageDetails: {
      motherTongueId: { type: Schema.Types.ObjectId, ref: 'Language', index: true },
      otherLanguagesIds: [{ type: Schema.Types.ObjectId, ref: 'Language' }],
    },
    horoscope: {
      timeOfBirth: { type: String, trim: true },
      placeOfBirth: { type: String, trim: true },
      rashi: { type: String, trim: true },
      nakshatra: { type: String, trim: true },
      lagna: { type: String, trim: true },
      manglik: { type: String, trim: true, default: 'Non-Manglik' },
      gotra: { type: String, trim: true },
      horoscopeDocument: { type: String, trim: true },
      pada: { type: Number },
      birthPlaceDetails: {
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true },
        latitude: { type: Number },
        longitude: { type: Number },
        timezone: { type: Number },
      },
    },
    lifestyleInterests: {
      diet: { type: String, trim: true },
      alcohol: { type: String, trim: true },
      smoking: { type: String, trim: true },
      exercise: { type: String, trim: true },
      hobbies: [{ type: String, trim: true }],
      travel: [{ type: String, trim: true }],
      music: [{ type: String, trim: true }],
      reading: [{ type: String, trim: true }],
      sports: [{ type: String, trim: true }],
      languages: [{ type: String, trim: true }],
      pets: { type: String, trim: true },
      otherInterests: { type: String, trim: true },
    },
    partnerPreferences: {
      preferredAgeMin: { type: Number, default: 24 },
      preferredAgeMax: { type: Number, default: 36 },
      preferredLocation: { type: String, trim: true, default: 'Anywhere in India' },
      preferredQualification: { type: String, trim: true, default: 'MBBS / MD / MS / Medical Specialist' },
      preferredSpecialization: { type: String, trim: true, default: 'Any Medical Specialization' },
      preferredMaritalStatus: { type: String, trim: true, default: 'Never Married' },
      otherPreferences: { type: String, trim: true, default: '' },
    },
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['all', 'verified_only', 'members_only', 'hidden'],
        default: 'all',
      },
      photoVisibility: {
        type: String,
        enum: ['all', 'members_only', 'on_request', 'hidden'],
        default: 'all',
      },
      contactVisibility: {
        type: String,
        enum: ['accepted_interests_only', 'members_only', 'hidden'],
        default: 'accepted_interests_only',
      },
      whoCanSendInterest: {
        type: String,
        enum: ['all', 'verified_only', 'premium_only'],
        default: 'all',
      },
      whoCanMessage: {
        type: String,
        enum: ['accepted_interests_only', 'all_members'],
        default: 'accepted_interests_only',
      },
      horoscopeVisibility: {
        type: String,
        enum: ['all', 'members_only', 'verified_only', 'hidden'],
        default: 'all',
      },
      birthDateVisibility: {
        type: String,
        enum: ['full', 'year_only', 'hidden'],
        default: 'full',
      },
      birthTimeVisibility: {
        type: String,
        enum: ['all', 'members_only', 'hidden'],
        default: 'all',
      },
      birthPlaceVisibility: {
        type: String,
        enum: ['all', 'members_only', 'hidden'],
        default: 'all',
      },
      kundaliVisibility: {
        type: String,
        enum: ['all', 'members_only', 'hidden'],
        default: 'all',
      },
    },
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
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
