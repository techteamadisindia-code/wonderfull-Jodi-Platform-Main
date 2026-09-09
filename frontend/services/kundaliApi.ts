import apiClient from './api';

export interface StructuredBirthPlace {
  name: string;
  village?: string;
  city?: string;
  taluka?: string;
  district?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string | number;
}

export interface BirthLocation {
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface UserBirthDetails {
  displayName: string;
  gender: string;
  dob: string;
  timeOfBirth: string;
  placeOfBirth: string;
  resolvedLocation: BirthLocation;
  rashi: string;
  nakshatra: string;
  pada: number;
  manglik: string;
  lagna: string;
  isComplete: boolean;
}

export interface KootaScoreItem {
  name?: string;
  obtained: number;
  max: number;
  status?: string;
  description?: string;
}

export interface AshtakootaScores {
  varna: KootaScoreItem;
  vashya: KootaScoreItem;
  tara: KootaScoreItem;
  yoni: KootaScoreItem;
  grahaMaitri: KootaScoreItem;
  gana: KootaScoreItem;
  bhakoot: KootaScoreItem;
  nadi: KootaScoreItem;
  totalObtained?: number;
  totalMax?: number;
  percentage?: number;
  compatibilityBand?: string;
  summary?: string;
}

export interface CompatibilityDimension {
  title: string;
  score: number; // 0 - 100
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Moderate' | 'Fair';
  description: string;
  highlight: string;
}

export interface PublicKundaliMatchResult {
  person1: {
    name: string;
    gender: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace;
    rashi: string;
    nakshatra: string;
    pada: number;
    lagna?: string;
    manglikStatus: string;
  };
  person2: {
    name: string;
    gender: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace;
    rashi: string;
    nakshatra: string;
    pada: number;
    lagna?: string;
    manglikStatus: string;
  };
  gunaScore: number;
  maxScore: 36;
  percentage: number;
  compatibilityBand: string;
  summary: string;
  ashtakoota: AshtakootaScores;
  manglik: {
    person1Status: string;
    person2Status: string;
    isCompatible: boolean;
    compatibilityBadge: string;
    compatibilityNote: string;
    disclaimer: string;
  };
  dimensions: {
    emotional: CompatibilityDimension;
    communication: CompatibilityDimension;
    family: CompatibilityDimension;
    overall: CompatibilityDimension;
  };
  culturalDisclaimer: string;
}

// Backwards compatibility result type
export interface KundaliMatchResult {
  reportId?: string;
  isPremium: boolean;
  gunaScore: number;
  maxScore: 36;
  compatibilityIndicator: string;
  summary: string;
  partner1: {
    name: string;
    rashi: string;
    nakshatra: string;
    pada: number;
    manglikStatus: string;
  };
  partner2: {
    name: string;
    rashi: string;
    nakshatra: string;
    pada: number;
    manglikStatus: string;
  };
  manglikAnalysis: string;
  ashtakootaScores: AshtakootaScores;
  ashtakootaDetails?: any;
  doshas: string[];
  doctorCompatibility?: any;
  culturalDisclaimer: string;
}

/**
 * Public Structured Location Search (Village, Taluka, District, City, State)
 */
export async function searchStructuredLocations(query: string): Promise<StructuredBirthPlace[]> {
  const res = await apiClient.get(`/locations/search?q=${encodeURIComponent(query)}`);
  return res.data.data || [];
}

/**
 * 100% Free Public Kundali Match calculation (No login required)
 */
export async function calculatePublicKundaliMatch(payload: {
  person1: {
    name?: string;
    gender: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace;
  };
  person2: {
    name?: string;
    gender: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthPlace: StructuredBirthPlace;
  };
}): Promise<PublicKundaliMatchResult> {
  const res = await apiClient.post('/kundali/match', payload);
  return res.data.data;
}

/**
 * Save Kundali Match (Authenticated users only)
 */
export async function saveKundaliMatch(reportData: PublicKundaliMatchResult): Promise<{ success: boolean; reportId: string; message: string }> {
  const res = await apiClient.post('/kundali/save', { reportData });
  return res.data;
}

/**
 * Fetch authenticated user's birth & horoscope details
 */
export async function getMyBirthDetails(): Promise<UserBirthDetails> {
  const res = await apiClient.get('/kundali/my-birth-details');
  return res.data.data;
}

/**
 * Update authenticated user's birth & horoscope details
 */
export async function updateMyBirthDetails(data: {
  dob: string;
  timeOfBirth?: string;
  placeOfBirth?: string;
  rashi?: string;
  nakshatra?: string;
  manglik?: string;
  gotra?: string;
}): Promise<any> {
  const res = await apiClient.put('/kundali/my-birth-details', data);
  return res.data;
}

/**
 * Legacy search locations
 */
export async function searchLocations(query: string): Promise<BirthLocation[]> {
  const res = await apiClient.get(`/kundali/locations?q=${encodeURIComponent(query)}`);
  return res.data.data;
}

/**
 * Legacy calculate 36 Guna Milan Kundali Match
 */
export async function calculateKundaliMatch(payload: any): Promise<KundaliMatchResult> {
  const res = await apiClient.post('/kundali/calculate', payload);
  return res.data.data;
}

/**
 * Get Kundali report by ID
 */
export async function getKundaliReport(reportId: string): Promise<any> {
  const res = await apiClient.get(`/kundali/report/${reportId}`);
  return res.data.data;
}

/**
 * Get Kundali history
 */
export async function getKundaliHistory(): Promise<any[]> {
  const res = await apiClient.get('/kundali/history');
  return res.data.data;
}
