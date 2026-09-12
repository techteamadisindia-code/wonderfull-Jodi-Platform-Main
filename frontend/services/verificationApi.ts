import apiClient from './api';

export interface VerificationItem {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
    verificationStatus: string;
    verified: boolean;
    isActive: boolean;
  };
  documentType: string;
  documentName: string;
  documentUrl: string;
  fileType?: string;
  fileSize?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedByEmail?: string;
  adminNotes?: string;
  rejectionReason?: string;
  attemptNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationDetailItem extends VerificationItem {
  profile?: any;
  history?: VerificationItem[];
}

export interface VerificationPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FetchVerificationsParams {
  status?: string;
  documentType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FetchVerificationsResponse {
  success: boolean;
  data: VerificationItem[];
  pagination: VerificationPagination;
}

export interface UserVerificationSummaryResponse {
  success: boolean;
  data: VerificationItem[];
  summary: Record<string, {
    status: string;
    documentName?: string;
    submittedAt?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    attemptNumber?: number;
  }>;
  overallStatus: string;
  isVerified: boolean;
}

/**
 * Fetch admin verifications with server-side filtering, searching, and pagination
 */
export async function fetchVerifications(
  params: FetchVerificationsParams = {}
): Promise<FetchVerificationsResponse> {
  const queryParams = new URLSearchParams();

  if (params.status && params.status !== 'ALL') {
    queryParams.append('status', params.status);
  }
  if (params.documentType && params.documentType !== 'ALL') {
    queryParams.append('documentType', params.documentType);
  }
  if (params.search && params.search.trim()) {
    queryParams.append('search', params.search.trim());
  }
  if (params.page) {
    queryParams.append('page', String(params.page));
  }
  if (params.limit) {
    queryParams.append('limit', String(params.limit));
  }

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const response = await apiClient.get<FetchVerificationsResponse>(`/admin/verifications${queryString}`);
  return response.data;
}

/**
 * Fetch detailed verification record for review (including profile and history)
 */
export async function fetchVerificationDetails(
  id: string
): Promise<{ success: boolean; data: VerificationDetailItem }> {
  const response = await apiClient.get<{ success: boolean; data: VerificationDetailItem }>(
    `/admin/verifications/${id}`
  );
  return response.data;
}

/**
 * Approve a verification request
 */
export async function approveVerification(
  id: string,
  notes?: string
): Promise<{ success: boolean; data: VerificationItem; message: string }> {
  const response = await apiClient.put<{ success: boolean; data: VerificationItem; message: string }>(
    `/admin/verifications/${id}/approve`,
    { notes }
  );
  return response.data;
}

/**
 * Reject a verification request with mandatory reason
 */
export async function rejectVerification(
  id: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; data: VerificationItem; message: string }> {
  const response = await apiClient.put<{ success: boolean; data: VerificationItem; message: string }>(
    `/admin/verifications/${id}/reject`,
    { reason, rejectionReason: reason, notes }
  );
  return response.data;
}

/**
 * Submit user document for verification
 */
export async function submitUserVerification(data: {
  documentType: string;
  documentName?: string;
  file: string;
  filename?: string;
}): Promise<{ success: boolean; message: string; data: VerificationItem }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: VerificationItem }>(
    '/verifications',
    data
  );
  return response.data;
}

/**
 * Fetch user's own verification records and category summary
 */
export async function fetchUserVerifications(): Promise<UserVerificationSummaryResponse> {
  const response = await apiClient.get<UserVerificationSummaryResponse>('/verifications/me');
  return response.data;
}

/**
 * Approve all pending verification documents for a user
 */
export async function approveAllUserVerifications(
  userId: string,
  notes?: string
): Promise<{ success: boolean; data: VerificationItem[]; message: string }> {
  const response = await apiClient.put<{ success: boolean; data: VerificationItem[]; message: string }>(
    `/admin/verifications/user/${userId}/approve-all`,
    { notes }
  );
  return response.data;
}

/**
 * Reject all pending verification documents for a user
 */
export async function rejectAllUserVerifications(
  userId: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; data: VerificationItem[]; message: string }> {
  const response = await apiClient.put<{ success: boolean; data: VerificationItem[]; message: string }>(
    `/admin/verifications/user/${userId}/reject-all`,
    { reason, rejectionReason: reason, notes }
  );
  return response.data;
}

