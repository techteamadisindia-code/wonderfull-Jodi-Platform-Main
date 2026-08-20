export interface ProfileCard {
  _id: string;
  displayName: string;
  gender: string;
  dob: string;
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
}

export interface SearchResult {
  total: number;
  page: number;
  limit: number;
  profiles: ProfileCard[];
}
