import api from '../lib/api';

export interface ContactDetails {
  fullName?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  workLocation?: string;
  currentHospital?: string;
  annualIncome?: string;
}

export interface ContactAccessStatus {
  hasAccess: boolean;
  isSelf?: boolean;
  isAdmin?: boolean;
  status: 'NONE' | 'PENDING' | 'RECEIVED_PENDING' | 'ACCEPTED' | 'DECLINED' | 'SELF' | 'ADMIN_ACCESS' | 'GUEST';
  requestId?: string;
  message?: string;
  unlockedAt?: string;
  contactDetails?: ContactDetails;
}

export interface ContactRequestItem {
  _id: string;
  requester: any;
  recipient: any;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  contactCreditDeducted: boolean;
  contactUnlockedAt?: string | null;
  message?: string;
  createdAt: string;
  updatedAt: string;
  profile?: any;
}

export interface ContactRequestsResponse {
  incoming: ContactRequestItem[];
  outgoing: ContactRequestItem[];
}

/**
 * Check whether the current user has permission to see contact details for a profile
 */
export async function fetchContactAccessStatus(profileId: string): Promise<ContactAccessStatus> {
  const response = await api.get<{ success: boolean; data: ContactAccessStatus }>(
    `/contact-access/${profileId}`
  );
  return response.data.data;
}

/**
 * Send a new contact request to a profile/member
 */
export async function sendContactRequest(payload: {
  recipientId?: string;
  profileId?: string;
  message?: string;
}): Promise<{ success: boolean; message: string; data?: any; alreadyUnlocked?: boolean }> {
  const response = await api.post<{
    success: boolean;
    message: string;
    data?: any;
    alreadyUnlocked?: boolean;
  }>('/contact-requests', payload);
  return response.data;
}

/**
 * Get current user's incoming and outgoing contact requests
 */
export async function fetchMyContactRequests(): Promise<ContactRequestsResponse> {
  const response = await api.get<{ success: boolean; data: ContactRequestsResponse }>(
    '/contact-requests'
  );
  return response.data.data;
}

/**
 * Accept a contact request (recipient accepts -> unlocks contact details & deducts 1 credit from requester)
 */
export async function acceptContactRequest(requestId: string): Promise<{ success: boolean; message: string; data: any }> {
  const response = await api.patch<{ success: boolean; message: string; data: any }>(
    `/contact-requests/${requestId}/accept`
  );
  return response.data;
}

/**
 * Decline a contact request (0 credits deducted)
 */
export async function declineContactRequest(requestId: string): Promise<{ success: boolean; message: string; data: any }> {
  const response = await api.patch<{ success: boolean; message: string; data: any }>(
    `/contact-requests/${requestId}/decline`
  );
  return response.data;
}
