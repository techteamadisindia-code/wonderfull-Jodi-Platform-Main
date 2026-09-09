import api, { getApiBaseUrl } from '../lib/api';

export interface BiodataPersonalDetails {
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

export interface BiodataLocation {
  currentCity?: string;
  currentState?: string;
  currentCountry?: string;
  nativePlace?: string;
  formattedLocation?: string;
}

export interface BiodataEducation {
  primaryQualification: string;
  college?: string;
  university?: string;
  graduationYear?: string;
  postgraduateQualification?: string;
  pgCollege?: string;
  pgYear?: string;
  additionalQualification?: string;
}

export interface BiodataMedicalCareer {
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

export interface BiodataFamily {
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

export interface BiodataLifestyle {
  diet?: string;
  smoking?: string;
  drinking?: string;
  hobbies?: string[];
  languagesKnown?: string[];
}

export interface BiodataHoroscope {
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

export interface BiodataPartnerPreferences {
  preferredAge?: string;
  preferredHeight?: string;
  preferredLocation?: string;
  preferredEducation?: string;
  preferredSpecialization?: string;
  preferredMaritalStatus?: string;
  otherExpectations?: string;
}

export interface BiodataContactDetails {
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface BiodataSectionVisibility {
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

export interface BiodataRecord {
  _id: string;
  userId: string;
  profileId: string;
  publicId: string;
  title: string;
  templateId: 'traditional' | 'modern' | 'elegant' | 'doctor_professional';
  status: 'DRAFT' | 'COMPLETED';

  personalDetails: BiodataPersonalDetails;
  location: BiodataLocation;
  education: BiodataEducation;
  medicalCareer: BiodataMedicalCareer;
  family: BiodataFamily;
  lifestyle: BiodataLifestyle;
  horoscope: BiodataHoroscope;
  partnerPreferences: BiodataPartnerPreferences;
  contactDetails: BiodataContactDetails;

  photoUrl?: string;
  additionalPhotos?: string[];
  sectionVisibility: BiodataSectionVisibility;

  generatedPdfUrl?: string;
  pdfGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch authenticated user's profile pre-formatted for biodata initialization
 */
export async function fetchBiodataProfile(): Promise<Partial<BiodataRecord>> {
  const response = await api.get<{ success: boolean; data: any }>('/biodata/profile');
  return response.data.data;
}

/**
 * List all biodatas saved by the user
 */
export async function fetchMyBiodatas(): Promise<BiodataRecord[]> {
  const response = await api.get<{ success: boolean; data: BiodataRecord[] }>('/biodata');
  return response.data.data;
}

/**
 * Create a new biodata
 */
export async function createBiodata(payload: Partial<BiodataRecord>): Promise<BiodataRecord> {
  const response = await api.post<{ success: boolean; data: BiodataRecord }>('/biodata', payload);
  return response.data.data;
}

/**
 * Fetch a single biodata by ID (with ownership verification)
 */
export async function fetchBiodataById(id: string): Promise<BiodataRecord> {
  const response = await api.get<{ success: boolean; data: BiodataRecord }>(`/biodata/${id}`);
  return response.data.data;
}

/**
 * Update a biodata
 */
export async function updateBiodata(id: string, payload: Partial<BiodataRecord>): Promise<BiodataRecord> {
  const response = await api.put<{ success: boolean; data: BiodataRecord }>(`/biodata/${id}`, payload);
  return response.data.data;
}

/**
 * Delete a biodata
 */
export async function deleteBiodata(id: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{ success: boolean; message: string }>(`/biodata/${id}`);
  return response.data;
}

/**
 * Generate PDF server-side using PDFKit
 */
export async function generateBiodataPdf(
  id: string,
  options?: { templateId?: string; sectionVisibility?: Partial<BiodataSectionVisibility> }
): Promise<{ downloadUrl: string; publicId: string; generatedAt: string }> {
  const response = await api.post<{
    success: boolean;
    data: { downloadUrl: string; publicId: string; generatedAt: string };
  }>(`/biodata/${id}/generate-pdf`, options || {});
  return response.data.data;
}

/**
 * Get direct PDF download URL
 */
export function getBiodataPdfDownloadUrl(id: string): string {
  return `${getApiBaseUrl()}/biodata/${id}/pdf`;
}

/**
 * Fetch public shared biodata (sanitized for privacy)
 */
export async function fetchPublicBiodata(publicId: string): Promise<BiodataRecord> {
  const response = await api.get<{ success: boolean; data: BiodataRecord }>(`/biodata/public/${publicId}`);
  return response.data.data;
}
