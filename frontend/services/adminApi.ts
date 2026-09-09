import apiClient from './api';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedProfiles: number;
  pendingVerification: number;
  premiumUsers: number;
  totalRevenue: number;
  pendingReports: number;
  newInquiries: number;
  totalInterests: number;
  totalShortlists: number;
  totalMessages: number;
  newRegistrations7d: number;
  recentUsers: Array<{
    _id: string;
    id?: string;
    userId?: string;
    fullName: string;
    name?: string;
    email: string;
    mobile: string;
    role: string;
    isActive: boolean;
    accountStatus?: string;
    verificationStatus: string;
    verified?: boolean;
    createdAt: string;
    registeredAt?: string;
  }>;
  recentPayments: Array<{
    _id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    providerPaymentId: string;
    createdAt: string;
    user?: {
      _id: string;
      fullName: string;
      email: string;
      mobile: string;
    };
  }>;
  recentVerifications: Array<{
    _id: string;
    documentType: string;
    documentUrl: string;
    status: string;
    createdAt: string;
    user?: {
      _id: string;
      fullName: string;
      email: string;
    };
  }>;
  todayVisitedUsers?: number;
  incompleteRegistrations?: number;
  completedRegistrations?: number;
  maintenanceMode?: boolean;
}

export interface DailyVisitDayData {
  date: string;
  dayName: string;
  displayLabel: string;
  fullLabel: string;
  uniqueVisitors: number;
  totalHits: number;
  isToday: boolean;
}

export interface DailyVisitsAnalyticsResponse {
  period: number;
  startDate: string;
  endDate: string;
  today: number;
  yesterday: number;
  percentChangeVsYesterday: number;
  comparisonStatus?: 'INCREASE' | 'DECREASE' | 'UNCHANGED' | 'FIRST_VISITS' | 'NO_DATA';
  comparisonText?: string;
  dailyVisitsSum?: number;
  totalDailyVisitsSum: number;
  distinctUniqueUsers?: number;
  uniqueUsersAcrossPeriod: number;
  dailyAverage?: number;
  averageDailyVisitors: number;
  data: DailyVisitDayData[];
}

export async function fetchDailyVisitsAnalytics(days = 7): Promise<DailyVisitsAnalyticsResponse> {
  const response = await apiClient.get<{ success: boolean; data: DailyVisitsAnalyticsResponse }>(
    `/admin/analytics/daily-visits?days=${days}`
  );
  return response.data.data;
}

export interface PlatformSettings {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  tollFreeNumber: string;
  officeAddress: string;
  maintenanceMode: boolean;
  maintenanceBanner: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceEstimatedEndTime?: string | null;
  allowAdminAccess: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  requireManualProfileApproval: boolean;
  currency: string;
  razorpayLiveMode: boolean;
  minAgeMale: number;
  minAgeFemale: number;
  maxPhotoUploadLimit: number;
}

export interface MaintenanceSettings {
  maintenanceMode: boolean;
  maintenanceBanner: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceEstimatedEndTime?: string | null;
  allowAdminAccess: boolean;
  maintenanceUpdatedBy?: string;
  updatedAt?: string;
}

export interface PublicMaintenanceData {
  enabled: boolean;
  banner: boolean;
  title: string;
  message: string;
  estimatedEndTime: string | null;
}

export interface AdminAccount {
  _id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  adminEmail: string;
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: string;
  ipAddress: string;
  status: string;
  createdAt: string;
}

export interface ContactInquiryItem {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<{ success: boolean; data: DashboardStats }>('/admin/dashboard');
  return response.data.data;
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const response = await apiClient.get<{ success: boolean; data: PlatformSettings }>('/admin/settings');
  return response.data.data;
}

export async function updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const response = await apiClient.put<{ success: boolean; data: PlatformSettings }>('/admin/settings', settings);
  return response.data.data;
}

export async function fetchMaintenanceSettings(): Promise<MaintenanceSettings> {
  const response = await apiClient.get<{ success: boolean; data: MaintenanceSettings }>('/admin/settings/maintenance');
  return response.data.data;
}

export async function updateMaintenanceSettings(settings: Partial<MaintenanceSettings>): Promise<MaintenanceSettings> {
  const response = await apiClient.put<{ success: boolean; data: MaintenanceSettings }>('/admin/settings/maintenance', settings);
  return response.data.data;
}

export async function fetchPublicMaintenanceStatus(): Promise<PublicMaintenanceData> {
  const response = await apiClient.get<{ success: boolean; data: PublicMaintenanceData }>('/config/maintenance');
  return response.data.data;
}

export async function fetchAdmins(): Promise<{ admins: AdminAccount[]; adminPermissions: any[] }> {
  const response = await apiClient.get<{ success: boolean; data: { admins: AdminAccount[]; adminPermissions: any[] } }>('/admin/admins');
  return response.data.data;
}

export async function createAdminAccount(data: { fullName: string; email: string; mobile?: string; password: string; permissions?: string[] }) {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/admin/admins', data);
  return response.data;
}

export async function updateAdminPermissions(id: string, permissions: string[]) {
  const response = await apiClient.put<{ success: boolean; message: string }>(`/admin/admins/${id}`, { permissions });
  return response.data;
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  const response = await apiClient.get<{ success: boolean; data: AuditLogItem[] }>('/admin/audit-logs');
  return response.data.data;
}

export async function fetchInquiries(status?: string): Promise<ContactInquiryItem[]> {
  const endpoint = status && status !== 'ALL' ? `/admin/inquiries?status=${status}` : '/admin/inquiries';
  const response = await apiClient.get<{ success: boolean; data: ContactInquiryItem[] }>(endpoint);
  return response.data.data;
}

export async function updateInquiryStatus(id: string, status: string): Promise<ContactInquiryItem> {
  const response = await apiClient.put<{ success: boolean; data: ContactInquiryItem }>(`/admin/inquiries/${id}/status`, { status });
  return response.data.data;
}

export interface AdminBroadcastItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  targetType: string;
  targetUserIds?: any[];
  actionUrl?: string;
  createdBy?: {
    _id: string;
    fullName: string;
    email: string;
    role?: string;
  };
  status: 'DRAFT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBroadcastsResponse {
  broadcasts: AdminBroadcastItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchAdminBroadcasts(params?: {
  page?: number;
  limit?: number;
  type?: string;
  targetType?: string;
  status?: string;
  search?: string;
}): Promise<AdminBroadcastsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.type && params.type !== 'ALL') query.append('type', params.type);
  if (params?.targetType && params.targetType !== 'ALL') query.append('targetType', params.targetType);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.search) query.append('search', params.search);

  const queryString = query.toString();
  const endpoint = queryString ? `/admin/notifications?${queryString}` : '/admin/notifications';

  const response = await apiClient.get<{ success: boolean; data: any }>(endpoint);
  const data = response.data.data;

  // Backward compatibility: if array returned
  if (Array.isArray(data)) {
    return {
      broadcasts: data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  return {
    broadcasts: data.broadcasts || [],
    total: data.total || 0,
    page: data.page || 1,
    limit: data.limit || 25,
    totalPages: data.totalPages || 1,
  };
}

export async function fetchBroadcastDetails(id: string): Promise<AdminBroadcastItem> {
  const response = await apiClient.get<{ success: boolean; data: AdminBroadcastItem }>(
    `/admin/notifications/${id}`
  );
  return response.data.data;
}

export async function fetchRecipientCount(
  targetType: string,
  targetUserIds?: string[]
): Promise<number> {
  try {
    const response = await apiClient.post<{ success: boolean; data: { count: number } }>(
      '/admin/notifications/recipient-count',
      { targetType, targetUserIds }
    );
    return response.data.data?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function searchUsersForBroadcast(q: string): Promise<Array<{
  _id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  verificationStatus: string;
  isActive: boolean;
}>> {
  const response = await apiClient.get<{ success: boolean; data: { users: any[] } }>(
    `/admin/notifications/search-users?q=${encodeURIComponent(q)}&limit=15`
  );
  return response.data.data?.users || [];
}

export async function sendBroadcastNotification(data: {
  title: string;
  message: string;
  type?: string;
  targetType?: string;
  target?: string;
  targetUserIds?: string[];
  userId?: string;
  actionUrl?: string;
  link?: string;
}) {
  const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
    '/admin/notifications',
    data
  );
  return response.data;
}

export async function deleteAdminBroadcast(id: string) {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/admin/notifications/${id}`
  );
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNREGISTERED CANDIDATES & INCOMPLETE REGISTRATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminRegistrationCandidate {
  _id: string;
  registrationId: string;
  candidateName: string;
  email?: string;
  mobile?: string;
  gender?: string;
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  stepData?: {
    basicInfo?: {
      fullName?: string;
      email?: string;
      mobile?: string;
      gender?: string;
      dob?: string;
      lookingFor?: string;
      agreeTerms?: boolean;
    };
    personalInfo?: {
      maritalStatus?: string;
      motherTongue?: string;
      religion?: string;
      caste?: string;
      subCaste?: string;
      height?: string;
      city?: string;
      state?: string;
      country?: string;
      about?: string;
      foodPreference?: string;
    };
    educationProfession?: {
      education?: string;
      degree?: string;
      profession?: string;
      company?: string;
      workLocation?: string;
      annualIncome?: string;
    };
    familyDetails?: {
      fatherOccupation?: string;
      motherOccupation?: string;
      siblings?: string;
      familyType?: string;
    };
    preferences?: {
      prefAgeMin?: string;
      prefAgeMax?: string;
      prefCity?: string;
      prefDiet?: string;
      lookingFor?: string;
    };
    photos?: {
      primaryPhoto?: string;
      photos?: string[];
      idProofUrl?: string;
    };
    rawFormData?: Record<string, any>;
  };
  user?: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  profile?: {
    _id: string;
    displayName: string;
    primaryPhoto?: string;
  };
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRegistrationsResponse {
  registrations: AdminRegistrationCandidate[];
  total: number;
  incompleteTotal: number;
  page: number;
  pages: number;
  limit: number;
}

export interface AdminRegistrationStats {
  totalRegistrations: number;
  incompleteCount: number;
  startedCount: number;
  inProgressCount: number;
  completedCount: number;
  abandonedCount: number;
  completionRate: number;
  stepBreakdown: {
    step1: number;
    step2: number;
    step3: number;
    step4: number;
  };
  recentRegistrations: AdminRegistrationCandidate[];
}

export interface SectionStatusItem {
  title: string;
  completed: boolean;
  step: number;
  fields: Record<string, any>;
}

export interface AdminRegistrationDetailResponse {
  registration: AdminRegistrationCandidate;
  sectionStatus: {
    basicInfo: SectionStatusItem;
    personalInfo: SectionStatusItem;
    educationProfession: SectionStatusItem;
    familyDetails: SectionStatusItem;
    preferences: SectionStatusItem;
    photos: SectionStatusItem;
  };
}

/**
 * Fetch fast count of incomplete registrations
 */
export async function fetchIncompleteRegistrationsCount(): Promise<number> {
  try {
    const res = await apiClient.get<{ success: boolean; count: number; data?: { count: number } }>(
      '/admin/registrations/incomplete/count'
    );
    return res.data.count ?? res.data.data?.count ?? 0;
  } catch (err) {
    console.error('Error fetching incomplete registrations count:', err);
    return 0;
  }
}

/**
 * Fetch paginated list of registrations with search and filters
 */
export async function fetchAdminRegistrations(params?: {
  search?: string;
  status?: string;
  step?: string | number;
  minCompletion?: number;
  maxCompletion?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<AdminRegistrationsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.step && params.step !== 'ALL') query.set('step', String(params.step));
  if (params?.minCompletion !== undefined) query.set('minCompletion', String(params.minCompletion));
  if (params?.maxCompletion !== undefined) query.set('maxCompletion', String(params.maxCompletion));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const response = await apiClient.get<{
    success: boolean;
    data: AdminRegistrationsResponse;
  }>(`/admin/registrations?${query.toString()}`);

  return response.data.data;
}

/**
 * Fetch detailed view of a registration candidate
 */
export async function fetchAdminRegistrationById(
  id: string
): Promise<AdminRegistrationDetailResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: AdminRegistrationDetailResponse;
  }>(`/admin/registrations/${encodeURIComponent(id)}`);

  return response.data.data;
}

/**
 * Fetch registration statistics and breakdown
 */
export async function fetchAdminRegistrationStats(): Promise<AdminRegistrationStats> {
  const response = await apiClient.get<{
    success: boolean;
    data: AdminRegistrationStats;
  }>('/admin/registrations/stats');

  return response.data.data;
}

