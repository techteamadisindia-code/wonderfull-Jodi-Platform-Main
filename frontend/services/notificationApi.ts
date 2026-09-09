import apiClient from './api';

export interface UserNotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationsResponse {
  notifications: UserNotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchUserNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<UserNotificationsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.unreadOnly !== undefined) query.append('unreadOnly', String(params.unreadOnly));

  const queryString = query.toString();
  const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';

  const response = await apiClient.get<{ success: boolean; data: UserNotificationsResponse }>(endpoint);
  return response.data.data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>(
      '/notifications/unread-count'
    );
    return response.data.data?.count ?? 0;
  } catch {
    return 0;
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
