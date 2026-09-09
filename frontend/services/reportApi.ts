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
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'REJECTED';
  moderator?: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
  resolutionNotes?: string;
  actionTaken?: 'NONE' | 'RESOLVED' | 'DISMISSED' | 'ACCOUNT_BLOCKED';
  targetType?: 'PROFILE' | 'MESSAGE' | 'USER' | 'OTHER';
  messageSnippet?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportsResponse {
  reports: ReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    ALL: number;
    PENDING: number;
    RESOLVED: number;
    DISMISSED: number;
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

  const qs = queryParams.toString();
  const url = `/admin/reports${qs ? `?${qs}` : ''}`;
  const response = await apiClient.get<{ success: boolean; data: any }>(url);

  const rawData = response.data.data;
  if (Array.isArray(rawData)) {
    return {
      reports: rawData,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 10,
        total: rawData.length,
        totalPages: 1,
      },
      counts: {
        ALL: rawData.length,
        PENDING: rawData.filter((r: any) => r.status === 'PENDING').length,
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
    pagination: rawData.pagination || {
      page: params.page || 1,
      limit: params.limit || 10,
      total: 0,
      totalPages: 1,
    },
    counts: rawData.counts || {
      ALL: 0,
      PENDING: 0,
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
