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
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchVerifications(status?: string): Promise<VerificationItem[]> {
  const query = status && status !== 'ALL' ? `?status=${status}` : '';
  const response = await apiClient.get<{ success: boolean; data: VerificationItem[] }>(`/admin/verifications${query}`);
  return response.data.data;
}

export async function approveVerification(id: string, notes?: string): Promise<{ success: boolean; data: VerificationItem; message: string }> {
  const response = await apiClient.put<{ success: boolean; data: VerificationItem; message: string }>(
    `/admin/verifications/${id}/approve`,
    { notes }
  );
  return response.data;
}

export async function rejectVerification(id: string, reason?: string, notes?: string): Promise<{ success: boolean; data: VerificationItem; message: string }> {
  const response = await apiClient.put<{ success: boolean; data: VerificationItem; message: string }>(
    `/admin/verifications/${id}/reject`,
    { reason, notes }
  );
  return response.data;
}
