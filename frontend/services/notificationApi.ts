import apiClient, { hasAuthSession } from './api';

export interface UserNotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  link?: string;
  read: boolean;
  readAt?: string;
  isLocked?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface UserNotificationsResponse {
  notifications: UserNotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
  isTruncated?: boolean;
  isCapped?: boolean;
  isTotalCapped?: boolean;
  isUnreadCapped?: boolean;
  hasMore?: boolean;
}

export async function fetchUserNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<UserNotificationsResponse> {
  if (typeof window !== 'undefined' && !hasAuthSession()) {
    return {
      notifications: [],
      total: 0,
      unreadCount: 0,
      page: params?.page || 1,
      limit: params?.limit || 10,
      totalPages: 0,
    };
  }

  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.unreadOnly !== undefined) query.append('unreadOnly', String(params.unreadOnly));

  const queryString = query.toString();
  const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';

  const response = await apiClient.get<{ success: boolean; data: UserNotificationsResponse }>(endpoint);
  return response.data.data;
}

export async function fetchUnreadNotificationCount(): Promise<{ count: number; isCapped?: boolean } & number> {
  if (typeof window !== 'undefined' && !hasAuthSession()) {
    const countObj = new Number(0) as any;
    countObj.count = 0;
    countObj.isCapped = false;
    return countObj;
  }

  try {
    const response = await apiClient.get<{ success: boolean; data: { count: number; isCapped?: boolean } }>(
      '/notifications/unread-count',
      {
        headers: {
          'X-Skip-Auth-Refresh': 'true',
        },
      }
    );
    const count = response.data?.data?.count ?? 0;
    const isCapped = Boolean(response.data?.data?.isCapped);
    const countObj = new Number(count) as any;
    countObj.count = count;
    countObj.isCapped = isCapped;
    return countObj;
  } catch (err: any) {
    const countObj = new Number(0) as any;
    countObj.count = 0;
    countObj.isCapped = false;
    countObj.unauthorized = err?.response?.status === 401;
    return countObj;
  }
}

export async function markNotificationAsRead(id: string): Promise<UserNotificationItem> {
  const response = await apiClient.patch<{ success: boolean; data: UserNotificationItem }>(
    `/notifications/${id}/read`
  );
  return response.data.data;
}

export async function markAllNotificationsAsRead(): Promise<{ message: string; count: number }> {
  const response = await apiClient.patch<{ success: boolean; message: string; count: number }>(
    '/notifications/read-all'
  );
  return response.data;
}

export async function deleteNotification(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string; data?: any }>(
    `/notifications/${id}`
  );
  return response.data;
}

