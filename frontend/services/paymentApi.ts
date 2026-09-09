import apiClient from './api';

export type PaymentStatusType =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface PaymentItem {
  _id: string;
  user?: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
    verified?: boolean;
    verificationStatus?: string;
    role?: string;
  };
  subscription?: {
    _id: string;
    plan: string;
    status: string;
    startDate: string;
    expiryDate: string;
  };
  orderId?: string;
  paymentId?: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  planId?: string;
  planName?: string;
  paymentMethod?: string;
  status: PaymentStatusType;
  receipt?: string;
  razorpaySignature?: string;
  failureReason?: string;
  refundId?: string;
  refundAmount?: number;
  refundStatus?: 'NONE' | 'PENDING' | 'PROCESSED' | 'FAILED';
  refundReason?: string;
  refundedAt?: string;
  isSimulated?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentStatsSummary {
  totalRevenue: number;
  grossRevenue: number;
  totalRefunded: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions?: number;
  pendingTransactions?: number;
  refundedTransactions?: number;
  successRate: number;
}

export interface RevenueTrendItem {
  date: string;
  displayDate: string;
  revenue: number;
  count: number;
  netRevenue: number;
}

export interface PaymentStatsResponse extends PaymentStatsSummary {
  todayRevenue: number;
  todayCount: number;
  monthlyRevenue: number;
  monthlyCount: number;
  revenueTrend: RevenueTrendItem[];
  period: number;
}

export interface PaymentListResponse {
  payments: PaymentItem[];
  totalRevenue: number;
  grossRevenue: number;
  totalRefunded: number;
  count: number;
  pagination: PaymentPagination;
  stats: PaymentStatsSummary;
}

export interface FetchPaymentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  provider?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchPayments(params?: FetchPaymentsParams): Promise<PaymentListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.plan && params.plan !== 'ALL') query.append('plan', params.plan);
  if (params?.provider && params.provider !== 'ALL') query.append('provider', params.provider);
  if (params?.dateRange && params.dateRange !== 'all') query.append('dateRange', params.dateRange);
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const endpoint = queryString ? `/admin/payments?${queryString}` : '/admin/payments';
  const response = await apiClient.get<{ success: boolean; data: PaymentListResponse }>(endpoint);
  return response.data.data;
}

export async function fetchPaymentStats(days = 30): Promise<PaymentStatsResponse> {
  const response = await apiClient.get<{ success: boolean; data: PaymentStatsResponse }>(
    `/admin/payments/stats?days=${days}`
  );
  return response.data.data;
}

export async function fetchPaymentDetails(id: string): Promise<PaymentItem> {
  const response = await apiClient.get<{ success: boolean; data: PaymentItem }>(
    `/admin/payments/${id}`
  );
  return response.data.data;
}

export async function refundPayment(
  id: string,
  data: { amount?: number; reason?: string }
): Promise<{ success: boolean; message: string; data: PaymentItem }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: PaymentItem }>(
    `/admin/payments/${id}/refund`,
    data
  );
  return response.data;
}

export async function simulateDevPayment(data: {
  scenario?: 'SUCCESS' | 'FAILED' | 'PENDING';
  planKey?: string;
  amount?: number;
  paymentMethod?: string;
  userEmail?: string;
}) {
  const response = await apiClient.post<{ success: boolean; message: string; data: PaymentItem }>(
    '/admin/payments/simulate',
    data
  );
  return response.data;
}
