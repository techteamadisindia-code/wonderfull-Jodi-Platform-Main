export interface ProfileCard {
  _id: string;
  displayName: string;
  gender: string;
  dob: string;
<<<<<<< HEAD
  height?: string;
  city: string;
  state?: string;
  country?: string;
  education: string;
  degree?: string;
  profession: string;
  company?: string;
  workLocation?: string;
  annualIncome?: string;
  maritalStatus?: string;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  primaryPhoto?: string;
  photos?: string[];
  verificationStatus: string;
  membershipBadge?: 'PREMIUM' | 'VIP' | 'VVIP';
  lastActiveAt?: string;
=======
  city: string;
  education: string;
  profession: string;
  primaryPhoto?: string;
  verificationStatus: string;
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
}

export interface SearchResult {
  total: number;
  page: number;
  limit: number;
  profiles: ProfileCard[];
}
<<<<<<< HEAD

export interface FullUserProfile {
  _id: string;
  id?: string;
  displayName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string | Date;
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
  horoscope?: {
    timeOfBirth?: string;
    placeOfBirth?: string;
    rashi?: string;
    nakshatra?: string;
    lagna?: string;
    manglik?: string;
    gotra?: string;
    horoscopeDocument?: string;
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
    profileVisibility?: 'all' | 'verified_only' | 'members_only' | 'hidden';
    photoVisibility?: 'all' | 'members_only' | 'on_request' | 'hidden';
    contactVisibility?: 'accepted_interests_only' | 'members_only' | 'hidden';
    whoCanSendInterest?: 'all' | 'verified_only' | 'premium_only';
    whoCanMessage?: 'accepted_interests_only' | 'all_members';
  };
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: string;
  familyType?: string;
  foodPreference?: string;
  smoking?: string;
  drinking?: string;
  hobbies?: string[];
  about?: string;
  photos?: string[];
  primaryPhoto?: string;
  verificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  completionPercentage?: number;
  lastActiveAt?: string | Date;
  createdAt?: string | Date;
  user?: {
    _id?: string;
    id?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    role?: string;
    verified?: boolean;
    verificationStatus?: string;
  };
}
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
