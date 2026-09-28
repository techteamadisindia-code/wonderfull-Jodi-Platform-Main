import apiClient from './api';

export interface ContactInquiry {
  _id: string;
  inquiryId: string;
  name: string;
  mobileNumber: string;
  email: string;
  message: string;
  userId?: string | null;
  userType: 'REGISTERED_MEMBER' | 'GUEST';
  status: 'NEW' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  category:
    | 'GENERAL'
    | 'TECHNICAL_SUPPORT'
    | 'ACCOUNT_ISSUE'
    | 'MEMBERSHIP'
    | 'PAYMENT'
    | 'VERIFICATION'
    | 'PROFILE_ISSUE'
    | 'OTHER';
  assignedTo?: { _id: string; fullName: string; email: string } | null;
  adminNotes?: string;
  statusHistory: {
    status: string;
    changedByEmail?: string;
    note?: string;
    timestamp: string;
  }[];
  adminReplies: {
    replyText: string;
    sentByEmail?: string;
    sentAt: string;
    emailSent: boolean;
    emailError?: string;
  }[];
  notificationCreated: boolean;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInquirySummary {
  total: number;
  new: number;
  inProgress: number;
  waitingForUser: number;
  resolved: number;
  closed: number;
  highPriority: number;
}

export interface ContactInquiryListResponse {
  success: boolean;
  data: ContactInquiry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: ContactInquirySummary;
}

export interface ContactInquiryFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  userType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchContactInquiries(
  filters: ContactInquiryFilters = {}
): Promise<ContactInquiryListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await apiClient.get<ContactInquiryListResponse>(
    `/admin/contact-inquiries?${params.toString()}`
  );
  return response.data;
}

export async function fetchContactInquiry(id: string): Promise<ContactInquiry> {
  const response = await apiClient.get<{ success: boolean; data: ContactInquiry }>(
    `/admin/contact-inquiries/${id}`
  );
  return response.data.data;
}

export async function fetchContactInquirySummary(): Promise<ContactInquirySummary> {
  const response = await apiClient.get<{ success: boolean; data: ContactInquirySummary }>(
    `/admin/contact-inquiries/summary`
  );
  return response.data.data;
}

export async function updateContactInquiry(
  id: string,
  updates: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string | null;
    adminNotes?: string;
    note?: string;
  }
): Promise<ContactInquiry> {
  const response = await apiClient.patch<{ success: boolean; data: ContactInquiry }>(
    `/admin/contact-inquiries/${id}`,
    updates
  );
  return response.data.data;
}

export async function replyToContactInquiry(
  id: string,
  replyText: string
): Promise<{ success: boolean; emailSent: boolean; emailError?: string; smtpConfigured: boolean }> {
  const response = await apiClient.post(`/admin/contact-inquiries/${id}/reply`, { replyText });
  return response.data;
}

export async function deleteContactInquiry(id: string): Promise<void> {
  await apiClient.delete(`/admin/contact-inquiries/${id}`);
}
