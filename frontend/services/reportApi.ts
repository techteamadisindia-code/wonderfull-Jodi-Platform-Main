import apiClient from './api';

export interface ReportItem {
  _id: string;
  reporter: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  reportedUser: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export async function fetchReports(status?: string): Promise<ReportItem[]> {
  const query = status && status !== 'ALL' ? `?status=${status}` : '';
  const response = await apiClient.get<{ success: boolean; data: ReportItem[] }>(`/admin/reports${query}`);
  return response.data.data;
}

export async function resolveReport(id: string): Promise<ReportItem> {
  const response = await apiClient.put<{ success: boolean; data: ReportItem }>(`/admin/reports/${id}/resolve`);
  return response.data.data;
}

export async function dismissReport(id: string): Promise<ReportItem> {
  const response = await apiClient.put<{ success: boolean; data: ReportItem }>(`/admin/reports/${id}/dismiss`);
  return response.data.data;
}
