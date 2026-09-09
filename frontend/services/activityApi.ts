import apiClient from './api';

export interface InterestItem {
  _id: string;
  sender?: {
    _id: string;
    fullName: string;
    email: string;
    mobile?: string;
    displayName?: string;
    profession?: string;
    city?: string;
    primaryPhoto?: string;
    verificationStatus?: string;
  };
  recipient?: {
    _id: string;
    fullName: string;
    email: string;
    mobile?: string;
    displayName?: string;
    profession?: string;
    city?: string;
    primaryPhoto?: string;
    verificationStatus?: string;
  };
  receiver?: {
    _id: string;
    fullName: string;
    email: string;
    mobile?: string;
    displayName?: string;
    profession?: string;
    city?: string;
    primaryPhoto?: string;
    verificationStatus?: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
}

export interface ShortlistItem {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
    verificationStatus?: string;
    isActive?: boolean;
    photo?: string | null;
  };
  shortlistedProfile: {
    _id: string;
    displayName: string;
    gender: string;
    dob?: string;
    height?: string;
    profession: string;
    company?: string;
    annualIncome?: string;
    education?: string;
    degree?: string;
    city: string;
    state?: string;
    country?: string;
    religion: string;
    caste?: string;
    subCaste?: string;
    motherTongue?: string;
    primaryPhoto?: string;
    photos?: string[];
    verificationStatus?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'REJECTED';
    maritalStatus?: string;
    about?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface AdminShortlistsResponse {
  shortlists: ShortlistItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    professions: string[];
    cities: string[];
    religions: string[];
  };
  stats: {
    totalShortlists: number;
  };
}

export interface FetchShortlistsParams {
  page?: number;
  limit?: number;
  search?: string;
  profession?: string;
  city?: string;
  community?: string;
  verification?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminConversationParticipant {
  _id: string;
  fullName: string;
  displayName?: string;
  email: string;
  mobile?: string;
  primaryPhoto?: string;
  profession?: string;
  city?: string;
  verificationStatus?: string;
}

export interface AdminConversation {
  _id: string;
  participants: AdminConversationParticipant[];
  participant1?: AdminConversationParticipant;
  participant2?: AdminConversationParticipant;
  lastMessage?: string;
  messageCount: number;
  status: 'ACTIVE' | 'FLAGGED' | 'BLOCKED' | 'ARCHIVED';
  complianceStatus: 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
  lastActivityAt: string;
  updatedAt: string;
  createdAt: string;
}

export interface AdminMessage {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    fullName: string;
    displayName?: string;
    email: string;
    primaryPhoto?: string;
  };
  receiver: {
    _id: string;
    fullName: string;
    displayName?: string;
    email: string;
    primaryPhoto?: string;
  };
  content: string;
  read: boolean;
  moderationStatus: 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
  moderationCategory?: 'PHONE_NUMBER' | 'EMAIL' | 'SOCIAL_MEDIA' | 'OTHER_CONTACT' | 'NONE';
  moderationConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  moderationScore?: number;
  flaggedReason?: string;
  moderatedAt?: string;
  createdAt: string;
}

export interface AdminMessagesStats {
  totalThreads: number;
  totalMessages: number;
  activeThreads: number;
  flaggedThreads: number;
  flaggedMessages: number;
}

export interface AdminMessagesResponse {
  conversations: AdminConversation[];
  totalConversations: number;
  totalMessages: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: AdminMessagesStats;
}

export interface FetchMessagesParams {
  page?: number;
  limit?: number;
  status?: string;
  compliance?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchAdminConversations(params: FetchMessagesParams = {}): Promise<AdminMessagesResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.compliance && params.compliance !== 'ALL') queryParams.set('compliance', params.compliance);
  if (params.search && params.search.trim()) queryParams.set('search', params.search.trim());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  const qs = queryParams.toString();
  const url = `/admin/messages${qs ? `?${qs}` : ''}`;
  const response = await apiClient.get<{ success: boolean; data: any }>(url);

  const rawData = response.data.data;
  return {
    conversations: rawData.conversations || [],
    totalConversations: rawData.totalConversations || rawData.conversations?.length || 0,
    totalMessages: rawData.totalMessages || 0,
    pagination: rawData.pagination || {
      page: params.page || 1,
      limit: params.limit || 10,
      total: rawData.totalConversations || 0,
      totalPages: Math.ceil((rawData.totalConversations || 1) / (params.limit || 10)) || 1,
    },
    stats: rawData.stats || {
      totalThreads: rawData.totalConversations || 0,
      totalMessages: rawData.totalMessages || 0,
      activeThreads: rawData.conversations?.filter((c: any) => c.status === 'ACTIVE').length || 0,
      flaggedThreads: 0,
      flaggedMessages: 0,
    },
  };
}

export async function fetchConversationDetails(conversationId: string): Promise<{
  conversation: AdminConversation;
  messages: AdminMessage[];
  totalMessages: number;
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      conversation: AdminConversation;
      messages: AdminMessage[];
      totalMessages: number;
    };
  }>(`/admin/messages/conversations/${conversationId}/messages`);
  return response.data.data;
}

export async function updateConversationModeration(
  conversationId: string,
  payload: { status?: string; complianceStatus?: string }
): Promise<{ success: boolean; message: string; data: AdminConversation }> {
  const response = await apiClient.put<{ success: boolean; message: string; data: AdminConversation }>(
    `/admin/messages/conversations/${conversationId}/status`,
    payload
  );
  return response.data;
}

export async function updateMessageModeration(
  messageId: string,
  payload: { moderationStatus: string; flaggedReason?: string }
): Promise<{ success: boolean; message: string; data: { message: AdminMessage; conversationComplianceStatus: string } }> {
  const response = await apiClient.put<{
    success: boolean;
    message: string;
    data: { message: AdminMessage; conversationComplianceStatus: string };
  }>(`/admin/messages/messages/${messageId}/moderation`, payload);
  return response.data;
}

export interface ComplianceSimulationResult {
  input: string;
  status: 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
  category: 'PHONE_NUMBER' | 'EMAIL' | 'SOCIAL_MEDIA' | 'OTHER_CONTACT' | 'NONE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  score: number;
  reason: string;
  matchedRule?: string;
  detectedSnippet?: string;
}

export async function simulateComplianceDetection(message: string): Promise<{
  success: boolean;
  data: ComplianceSimulationResult;
}> {
  const response = await apiClient.post<{ success: boolean; data: ComplianceSimulationResult }>(
    '/admin/messages/simulate',
    { message }
  );
  return response.data;
}

export async function sendDemoSeedMessage(
  conversationId: string,
  content: string
): Promise<{
  success: boolean;
  message: string;
  data: {
    message: AdminMessage;
    compliance: ComplianceSimulationResult;
    conversation: AdminConversation;
  };
}> {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    data: {
      message: AdminMessage;
      compliance: ComplianceSimulationResult;
      conversation: AdminConversation;
    };
  }>('/admin/messages/demo-seed-message', { conversationId, content });
  return response.data;
}

export async function resetDemoTestMessages(): Promise<{
  success: boolean;
  message: string;
  data: { deletedCount: number };
}> {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    data: { deletedCount: number };
  }>('/admin/messages/reset-demo');
  return response.data;
}

export interface NotificationItem {
  _id: string;
  user?: {
    _id: string;
    fullName: string;
    email: string;
  };
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AdminInterestsResponse {
  interests: InterestItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    ALL: number;
    PENDING: number;
    ACCEPTED: number;
    DECLINED: number;
  };
}

export interface FetchInterestsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchAdminInterests(params: FetchInterestsParams = {}): Promise<AdminInterestsResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.search && params.search.trim()) queryParams.set('search', params.search.trim());
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  const qs = queryParams.toString();
  const url = `/admin/interests${qs ? `?${qs}` : ''}`;
  const response = await apiClient.get<{ success: boolean; data: any }>(url);

  // Handle both enveloped structure { interests, pagination, counts } and array fallback
  const rawData = response.data.data;
  if (Array.isArray(rawData)) {
    return {
      interests: rawData,
      pagination: { page: 1, limit: rawData.length, total: rawData.length, totalPages: 1 },
      counts: {
        ALL: rawData.length,
        PENDING: rawData.filter((i) => i.status === 'PENDING').length,
        ACCEPTED: rawData.filter((i) => i.status === 'ACCEPTED').length,
        DECLINED: rawData.filter((i) => i.status === 'DECLINED' || i.status === 'REJECTED').length,
      },
    };
  }

  return rawData;
}

export async function fetchInterests(status?: string): Promise<InterestItem[]> {
  const res = await fetchAdminInterests({ status, limit: 100 });
  return res.interests;
}

export async function updateAdminInterestStatus(
  interestId: string,
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REJECTED' | 'CANCELLED'
): Promise<{ success: boolean; message: string; data: InterestItem }> {
  const response = await apiClient.put<{ success: boolean; message: string; data: InterestItem }>(
    `/admin/interests/${interestId}/status`,
    { status }
  );
  return response.data;
}

export async function fetchAdminShortlists(params: FetchShortlistsParams = {}): Promise<AdminShortlistsResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search && params.search.trim()) queryParams.set('search', params.search.trim());
  if (params.profession && params.profession !== 'ALL') queryParams.set('profession', params.profession);
  if (params.city && params.city !== 'ALL') queryParams.set('city', params.city);
  if (params.community && params.community !== 'ALL') queryParams.set('community', params.community);
  if (params.verification && params.verification !== 'ALL') queryParams.set('verification', params.verification);
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  const qs = queryParams.toString();
  const url = `/admin/shortlists${qs ? `?${qs}` : ''}`;
  const response = await apiClient.get<{ success: boolean; data: any }>(url);

  const rawData = response.data.data;
  if (Array.isArray(rawData)) {
    return {
      shortlists: rawData,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 10,
        total: rawData.length,
        totalPages: 1,
      },
      filters: {
        professions: [],
        cities: [],
        religions: [],
      },
      stats: {
        totalShortlists: rawData.length,
      },
    };
  }

  return {
    shortlists: rawData.shortlists || [],
    pagination: rawData.pagination || {
      page: params.page || 1,
      limit: params.limit || 10,
      total: 0,
      totalPages: 1,
    },
    filters: rawData.filters || {
      professions: [],
      cities: [],
      religions: [],
    },
    stats: rawData.stats || {
      totalShortlists: rawData.pagination?.total || 0,
    },
  };
}

export async function fetchShortlists(): Promise<ShortlistItem[]> {
  const res = await fetchAdminShortlists({ limit: 100 });
  return res.shortlists;
}

export async function deleteAdminShortlist(shortlistId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/shortlists/${shortlistId}`);
  return response.data;
}

export interface MessageMonitorData {
  conversations?: any[];
  stats?: any;
  [key: string]: any;
}

export async function fetchMessagesMonitor(): Promise<MessageMonitorData> {
  const response = await apiClient.get<{ success: boolean; data: MessageMonitorData }>('/admin/messages');
  return response.data.data;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const response = await apiClient.get<{ success: boolean; data: NotificationItem[] }>('/admin/notifications');
  return response.data.data;
}

export async function sendBroadcastNotification(data: {
  title: string;
  message: string;
  type?: string;
  target?: 'ALL' | 'INDIVIDUAL';
  userId?: string;
  link?: string;
}) {
  const response = await apiClient.post<{ success: boolean; message: string; data?: any }>('/admin/notifications', data);
  return response.data;
}
