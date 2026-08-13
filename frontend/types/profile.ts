export interface ProfileCard {
  _id: string;
  displayName: string;
  gender: string;
  dob: string;
  city: string;
  education: string;
  profession: string;
  primaryPhoto?: string;
  verificationStatus: string;
}

export interface SearchResult {
  total: number;
  page: number;
  limit: number;
  profiles: ProfileCard[];
}
