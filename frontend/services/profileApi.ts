import apiClient from './api';
import { ProfileCard } from '../types/profile';

export interface AdminNoteItem {
  _id?: string;
  note: string;
  adminId?: string;
  adminEmail: string;
  adminName?: string;
  createdAt: string;
}

export interface AdminVerificationRecord {
  _id: string;
  user: string;
  documentType: string;
  documentName: string;
  documentUrl: string;
  storageKey?: string;
  fileType?: string;
  fileSize?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByEmail?: string;
  adminNotes?: string;
  rejectionReason?: string;
  attemptNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubscriptionRecord {
  _id: string;
  user: string;
  plan: string;
  planId?: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  expiryDate?: string;
  contactRequestsUsed: number;
  contactRequestsRemaining: number;
  paymentReference?: string;
  createdAt: string;
}

export interface AdminPaymentRecord {
  _id: string;
  user: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId?: string;
  paymentMethod?: string;
  planId?: string;
  planName?: string;
  createdAt: string;
}

export interface AdminReportRecord {
  _id: string;
  reporter?: {
    _id: string;
    fullName: string;
    email?: string;
    mobile?: string;
  };
  reportedUser?: string;
  reportedProfile?: string;
  reason: string;
  details?: string;
  description?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'REJECTED' | 'ACTION_TAKEN';
  moderator?: {
    _id: string;
    fullName: string;
    email?: string;
  };
  resolutionNotes?: string;
  adminNotes?: string;
  actionTaken?: string;
  targetType?: string;
  messageSnippet?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AdminAuditLogRecord {
  _id: string;
  adminEmail: string;
  adminName?: string;
  action: string;
  details?: string;
  targetModel?: string;
  targetId?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  status?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AdminUserAccount {
  _id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: 'user' | 'admin';
  verified: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  isActive: boolean;
  status: 'Active' | 'Under Review' | 'Suspended' | 'Blocked' | 'Deleted';
  isDeleted?: boolean;
  deletedAt?: string;
  deletionReason?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  termsAccepted?: boolean;
  termsVersion?: string;
  termsAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface AdminProfileCompleteData extends ProfileCard {
  user?: AdminUserAccount;
  profile?: any;
  verifications?: AdminVerificationRecord[];
  subscription?: AdminSubscriptionRecord | null;
  subscriptions?: AdminSubscriptionRecord[];
  payments?: AdminPaymentRecord[];
  reports?: AdminReportRecord[];
  auditLogs?: AdminAuditLogRecord[];
  adminNotes?: AdminNoteItem[];

  // Status & Moderation
  status?: string;
  age?: number;

  // Detailed fields
  about?: string;
  foodPreference?: string;
  smoking?: string;
  drinking?: string;
  hobbies?: string[];
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
  company?: string;
  workLocation?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: string;
  familyType?: string;
  familyStatus?: string;
  familyValues?: string;
  nativePlace?: string;
  familyLocation?: string;
  profileManagedBy?: string;
  weight?: string | number;
  subCaste?: string;
  gotra?: string;
  horoscope?: {
    timeOfBirth?: string;
    placeOfBirth?: string;
    rashi?: string;
    nakshatra?: string;
    lagna?: string;
    manglik?: string;
    gotra?: string;
    pada?: number;
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
  currentLocation?: {
    formattedAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    cityId?: { _id: string; name: string; type?: string; pincode?: string };
    districtId?: { _id: string; name: string };
    stateId?: { _id: string; name: string; code?: string };
    countryId?: { _id: string; name: string; code?: string };
  };
  nativePlaceDetails?: {
    formattedAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    description?: string;
    cityId?: { _id: string; name: string; type?: string; pincode?: string };
    districtId?: { _id: string; name: string };
    stateId?: { _id: string; name: string; code?: string };
    countryId?: { _id: string; name: string; code?: string };
  };
  communityDetails?: {
    religionId?: { _id: string; name: string };
    casteId?: { _id: string; name: string; category?: string };
    subCasteId?: { _id: string; name: string };
    casteCategory?: string;
    subCasteText?: string;
  };
  languageDetails?: {
    motherTongueId?: { _id: string; name: string; nativeNames?: string[] };
    otherLanguagesIds?: Array<{ _id: string; name: string; nativeNames?: string[] }>;
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
    profileVisibility?: string;
    photoVisibility?: string;
    contactVisibility?: string;
    horoscopeVisibility?: string;
    birthDateVisibility?: string;
    birthTimeVisibility?: string;
    birthPlaceVisibility?: string;
  };
  statusReason?: string;
  statusChangedAt?: string;
  deletionReason?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProfileItem extends AdminProfileCompleteData {}

export interface ProfilesResponse {
  profiles: AdminProfileItem[];
  total: number;
  page: number;
  pages: number;
}

export async function fetchProfiles(params?: {
  search?: string;
  gender?: string;
  religion?: string;
  profession?: string;
  verificationStatus?: string;
  page?: number;
  limit?: number;
}): Promise<ProfilesResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.gender) query.append('gender', params.gender);
  if (params?.religion) query.append('religion', params.religion);
  if (params?.profession) query.append('profession', params.profession);
  if (params?.verificationStatus) query.append('verificationStatus', params.verificationStatus);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  const response = await apiClient.get<{ success: boolean; data: ProfilesResponse }>(`/admin/profiles?${query.toString()}`);
  return response.data.data;
}

export async function fetchProfileById(id: string): Promise<AdminProfileCompleteData> {
  const response = await apiClient.get<{ success: boolean; data: AdminProfileCompleteData }>(`/admin/profiles/${id}`);
  return response.data.data;
}

export async function addAdminProfileNote(id: string, note: string): Promise<AdminNoteItem[]> {
  const response = await apiClient.post<{ success: boolean; data: AdminNoteItem[] }>(`/admin/profiles/${id}/notes`, { note });
  return response.data.data;
}

export async function updateAdminProfileStatus(
  id: string,
  data: { status: string; reason?: string; notes?: string }
): Promise<any> {
  const response = await apiClient.patch(`/admin/profiles/${id}/status`, data);
  return response.data;
}

export async function suspendAdminProfile(id: string, reason: string): Promise<any> {
  const response = await apiClient.post(`/admin/profiles/${id}/suspend`, { reason });
  return response.data;
}

export async function blockAdminProfile(id: string, reason: string): Promise<any> {
  const response = await apiClient.post(`/admin/profiles/${id}/block`, { reason });
  return response.data;
}

export async function deleteAdminProfile(id: string, reason: string): Promise<any> {
  const response = await apiClient.delete(`/admin/profiles/${id}`, { data: { reason } });
  return response.data;
}

export async function approveAdminVerification(id: string, notes?: string): Promise<any> {
  const response = await apiClient.post(`/admin/verifications/${id}/approve`, { notes });
  return response.data;
}

export async function rejectAdminVerification(id: string, reason: string, customNote?: string): Promise<any> {
  const response = await apiClient.post(`/admin/verifications/${id}/reject`, { reason, customNote });
  return response.data;
}

export async function resolveAdminReport(id: string, notes?: string): Promise<any> {
  const response = await apiClient.put(`/admin/reports/${id}/resolve`, {
    resolutionNotes: notes || 'Resolved by administrator',
    actionTaken: 'RESOLVED',
  });
  return response.data;
}

export async function dismissAdminReport(id: string, notes?: string): Promise<any> {
  const response = await apiClient.put(`/admin/reports/${id}/dismiss`, {
    resolutionNotes: notes || 'Dismissed by administrator',
    actionTaken: 'DISMISSED',
  });
  return response.data;
}

export async function updateProfile(id: string, updateData: Partial<AdminProfileItem>): Promise<AdminProfileItem> {
  const response = await apiClient.put<{ success: boolean; data: AdminProfileItem }>(`/admin/profiles/${id}`, updateData);
  return response.data.data;
}

export async function updateAdminProfile(
  id: string,
  updateData: Record<string, any>
): Promise<{ success: boolean; message: string; data: any; changesCount?: number }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: any; changesCount?: number }>(
    `/admin/profiles/${id}`,
    updateData
  );
  return response.data;
}


