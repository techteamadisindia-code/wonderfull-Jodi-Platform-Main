import apiClient from './api';

export interface PaymentItem {
  _id: string;
  user?: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  subscription?: {
    _id: string;
    plan: string;
    status: string;
    startDate: string;
    expiryDate: string;
  };
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentResponse {
  payments: PaymentItem[];
  totalRevenue: number;
  count: number;
}

export async function fetchPayments(params?: { status?: string; provider?: string }): Promise<PaymentResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.provider) query.append('provider', params.provider);

  const endpoint = `/admin/payments?${query.toString()}`;
  const response = await apiClient.get<{ success: boolean; data: PaymentResponse }>(endpoint);
  return response.data.data;
}
