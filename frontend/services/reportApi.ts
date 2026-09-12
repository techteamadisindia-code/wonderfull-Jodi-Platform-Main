import apiClient from './api';

export interface ReportUserSummary {
  _id: string;
  fullName: string;
  email: string;
  mobile?: string;
  verificationStatus?: string;
  isActive?: boolean;
  photo?: string | null;
  profile?: {
    _id: string;
    displayName: string;
    gender?: string;
    dob?: string;
    height?: string;
    profession?: string;
    company?: string;
    annualIncome?: string;
    education?: string;
    degree?: string;
    city?: string;
    state?: string;
    country?: string;
    religion?: string;
    caste?: string;
    primaryPhoto?: string;
    photos?: string[];
    verificationStatus?: string;
    maritalStatus?: string;
    about?: string;
  } | null;
}

export interface ReportItem {
  _id: string;
  reporter: ReportUserSummary | null;
  reportedUser: ReportUserSummary | null;
  reason: string;
  details?: string;
  description?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'REJECTED' | 'ACTION_TAKEN';
  moderator?: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
  resolutionNotes?: string;
  adminNotes?: string;
  actionTaken?:
    | 'NONE'
    | 'WARNING_SENT'
    | 'PROFILE_UNDER_REVIEW'
    | 'SUSPENDED'
    | 'BLOCKED'
    | 'DELETED'
    | 'RESOLVED'
    | 'DISMISSED'
    | 'ACCOUNT_BLOCKED';
  targetType?: 'PROFILE' | 'MESSAGE' | 'USER' | 'OTHER';
  messageSnippet?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedProfileReport {
  userId: string;
  profileId: string;
  doctorName: string;
  email?: string;
  mobile?: string;
  education?: string;
  profession?: string;
  city?: string;
  profilePhoto?: string | null;
  reportedUser: ReportUserSummary | null;
  profile: any;
  profileStatus: 'Active' | 'Under Review' | 'Suspended' | 'Blocked' | 'Deleted';
  reports: ReportItem[];
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  resolvedReports: number;
  dismissedReports: number;
  latestReportDate: string;
  overallReportStatus: string;
  overallStatus?: string;
  reasonsSummary?: string[];
}

export interface AdminReportsResponse {
  reports: ReportItem[];
  groupedProfiles?: GroupedProfileReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    ALL: number;
    PENDING: number;
    UNDER_REVIEW?: number;
    RESOLVED: number;
    DISMISSED: number;
    multiReports?: number;
    suspended?: number;
    blocked?: number;
  };
  filters: {
    reasons: string[];
  };
}

export interface FetchReportsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  reason?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  grouped?: boolean;
}

export async function fetchAdminReports(params: FetchReportsParams = {}): Promise<AdminReportsResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.search && params.search.trim()) queryParams.set('search', params.search.trim());
  if (params.reason && params.reason !== 'ALL') queryParams.set('reason', params.reason);
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params.grouped) queryParams.set('grouped', 'true');

  const qs = queryParams.toString();
  const url = `/admin/reports${qs ? `?${qs}` : ''}`;
  const response = await apiClient.get<{ success: boolean; data: any }>(url);

  const rawData = response.data.data;
  if (Array.isArray(rawData)) {
    return {
      reports: rawData,
      groupedProfiles: [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 10,
        total: rawData.length,
        totalPages: 1,
      },
      counts: {
        ALL: rawData.length,
        PENDING: rawData.filter((r: any) => r.status === 'PENDING').length,
        UNDER_REVIEW: rawData.filter((r: any) => r.status === 'UNDER_REVIEW').length,
        RESOLVED: rawData.filter((r: any) => r.status === 'RESOLVED').length,
        DISMISSED: rawData.filter((r: any) => r.status === 'DISMISSED' || r.status === 'REJECTED').length,
      },
      filters: {
        reasons: [],
      },
    };
  }

  return {
    reports: rawData.reports || [],
    groupedProfiles: rawData.groupedProfiles || [],
    pagination: rawData.pagination || {
      page: params.page || 1,
      limit: params.limit || 10,
      total: 0,
      totalPages: 1,
    },
    counts: rawData.counts || {
      ALL: 0,
      PENDING: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      DISMISSED: 0,
    },
    filters: rawData.filters || {
      reasons: [],
    },
  };
}

export async function fetchReports(status?: string): Promise<ReportItem[]> {
  const res = await fetchAdminReports({ status, limit: 100 });
  return res.reports;
}

export async function fetchReportById(id: string): Promise<ReportItem> {
  const response = await apiClient.get<{ success: boolean; data: ReportItem }>(`/admin/reports/${id}`);
  return response.data.data;
}

export async function fetchReportsByProfile(profileId: string): Promise<{
  profile: any;
  user: any;
  reports: ReportItem[];
  auditLogs: any[];
}> {
  const response = await apiClient.get<{ success: boolean; data: any }>(`/admin/reports/profile/${profileId}`);
  return response.data.data;
}

export async function updateAdminReportStatus(
  id: string,
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'REJECTED',
  notes?: string,
  actionTaken?: string
): Promise<{ success: boolean; message: string; data: ReportItem }> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: ReportItem }>(
    `/admin/reports/${id}/status`,
    {
      status,
      notes,
      adminNotes: notes,
      actionTaken,
    }
  );
  return response.data;
}

export async function resolveAdminReport(
  id: string,
  notes?: string,
  actionTaken?: 'RESOLVED' | 'ACCOUNT_BLOCKED'
): Promise<{ success: boolean; message: string; data: ReportItem }> {
  const response = await apiClient.put<{ success: boolean; message: string; data: ReportItem }>(
    `/admin/reports/${id}/resolve`,
    {
      notes,
      resolutionNotes: notes,
      actionTaken: actionTaken || 'RESOLVED',
    }
  );
  return response.data;
}

export async function resolveReport(id: string): Promise<ReportItem> {
  const res = await resolveAdminReport(id);
  return res.data;
}

export async function dismissAdminReport(
  id: string,
  notes?: string
): Promise<{ success: boolean; message: string; data: ReportItem }> {
  const response = await apiClient.put<{ success: boolean; message: string; data: ReportItem }>(
    `/admin/reports/${id}/dismiss`,
    {
      notes,
      resolutionNotes: notes,
    }
  );
  return response.data;
}

export async function dismissReport(id: string): Promise<ReportItem> {
  const res = await dismissAdminReport(id);
  return res.data;
}

export async function blockUserFromAdminReport(
  id: string,
  reason?: string
): Promise<{ success: boolean; message: string; data: ReportItem }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: ReportItem }>(
    `/admin/reports/${id}/block-user`,
    {
      reason,
      notes: reason,
    }
  );
  return response.data;
}

export async function updateProfileSafetyStatus(
  profileId: string,
  statusOrPayload:
    | 'Active'
    | 'Under Review'
    | 'Suspended'
    | 'Blocked'
    | 'Deleted'
    | {
        status: 'Active' | 'Under Review' | 'Suspended' | 'Blocked' | 'Deleted';
        reason?: string;
        notes?: string;
      },
  reason?: string
): Promise<{ success: boolean; message: string; data: any }> {
  let payload: any = {};
  if (typeof statusOrPayload === 'string') {
    payload = { status: statusOrPayload, reason, notes: reason };
  } else {
    payload = statusOrPayload;
  }
  const response = await apiClient.patch<{ success: boolean; message: string; data: any }>(
    `/admin/profiles/${profileId}/status`,
    payload
  );
  return response.data;
}

export async function sendAdminProfileWarning(
  profileId: string,
  message: string,
  warningTitle?: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/admin/profiles/${profileId}/warning`,
    {
      message,
      warningTitle,
    }
  );
  return response.data;
}

export async function sendProfileWarning(
  profileId: string,
  payload: { warningMessage: string; reason?: string }
): Promise<{ success: boolean; message: string }> {
  return sendAdminProfileWarning(profileId, payload.warningMessage, payload.reason);
}

export async function fetchReportsByProfileId(profileId: string): Promise<ReportItem[]> {
  const res = await fetchReportsByProfile(profileId);
  return res?.reports || [];
}

export async function updateReportStatusByAdmin(
  id: string,
  payload: {
    status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'REJECTED' | 'ACTION_TAKEN';
    adminNotes?: string;
    actionTaken?: string;
  }
): Promise<{ success: boolean; message: string; data: ReportItem }> {
  return updateAdminReportStatus(id, payload.status as any, payload.adminNotes, payload.actionTaken);
}

export async function fetchAdminReportsGrouped(params: FetchReportsParams = {}): Promise<{
  success: boolean;
  data: {
    groupedProfiles: GroupedProfileReport[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: {
      totalReports: number;
      pendingReports: number;
      underReviewReports: number;
      resolvedReports: number;
      dismissedReports: number;
      profilesWithMultipleReports: number;
      suspendedProfiles: number;
      blockedProfiles: number;
      deletedProfiles: number;
    };
  };
}> {
  const queryParams = new URLSearchParams();
  queryParams.set('grouped', 'true');
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') queryParams.set('status', params.status);
  if (params.search && params.search.trim()) queryParams.set('search', params.search.trim());

  const response = await apiClient.get<{ success: boolean; data: any }>(
    `/admin/reports?${queryParams.toString()}`
  );
  const data = response.data.data || {};
  return {
    success: true,
    data: {
      groupedProfiles: data.groupedProfiles || [],
      pagination: data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
      stats: {
        totalReports: data.counts?.ALL || 0,
        pendingReports: data.counts?.PENDING || 0,
        underReviewReports: data.counts?.UNDER_REVIEW || 0,
        resolvedReports: data.counts?.RESOLVED || 0,
        dismissedReports: data.counts?.DISMISSED || 0,
        profilesWithMultipleReports: data.counts?.multiReports || 0,
        suspendedProfiles: data.counts?.suspended || 0,
        blockedProfiles: data.counts?.blocked || 0,
        deletedProfiles: data.counts?.deleted || 0,
      },
    },
  };
}

export async function suspendProfileByAdmin(
  profileId: string,
  reason: string
): Promise<{ success: boolean; message: string; data: any }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
    `/admin/profiles/${profileId}/suspend`,
    { reason }
  );
  return response.data;
}

export async function blockProfileByAdmin(
  profileId: string,
  reason: string
): Promise<{ success: boolean; message: string; data: any }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
    `/admin/profiles/${profileId}/block`,
    { reason }
  );
  return response.data;
}

export async function deleteProfileByAdmin(
  profileId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/admin/profiles/${profileId}`,
    {
      data: { reason },
    }
  );
  return response.data;
}

export async function fetchSafetyStats(): Promise<{
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  resolvedReports: number;
  dismissedReports: number;
  profilesWithMultipleReports: number;
  suspendedProfiles: number;
  blockedProfiles: number;
  deletedProfiles: number;
}> {
  const response = await apiClient.get<{ success: boolean; data: any }>('/admin/safety/stats');
  return response.data.data;
}

export async function fetchSafetyAuditLogs(profileId?: string): Promise<any[]> {
  const url = profileId ? `/admin/safety/audit-logs/${profileId}` : '/admin/safety/audit-logs';
  const response = await apiClient.get<{ success: boolean; data: any[] }>(url);
  return response.data.data;
}

// ── Public / Member Report APIs ──

export async function submitPublicUserReport(payload: {
  reportedUserId?: string;
  profileId?: string;
  reason: string;
  details?: string;
  description?: string;
  targetType?: 'PROFILE' | 'MESSAGE' | 'USER' | 'OTHER';
  messageSnippet?: string;
}): Promise<{ success: boolean; message: string; data: any }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>('/reports', payload);
  return response.data;
}

export async function fetchMySubmittedReports(): Promise<any[]> {
  const response = await apiClient.get<{ success: boolean; data: any[] }>('/reports/my-reports');
  return response.data.data;
}
