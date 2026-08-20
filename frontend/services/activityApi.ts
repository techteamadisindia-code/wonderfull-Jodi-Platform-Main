import apiClient from './api';

export interface InterestItem {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  recipient: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  createdAt: string;
}

export interface ShortlistItem {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    mobile: string;
  };
  shortlistedProfile: {
    _id: string;
    displayName: string;
    gender: string;
    profession: string;
    city: string;
    religion: string;
    primaryPhoto?: string;
  };
  createdAt: string;
}

export interface MessageMonitorData {
  conversations: Array<{
    _id: string;
    participants: Array<{
      _id: string;
      fullName: string;
      email: string;
    }>;
    lastMessage?: string;
    updatedAt: string;
  }>;
  totalConversations: number;
  totalMessages: number;
  recentMessages: Array<{
    _id: string;
    sender: { _id: string; fullName: string; email: string };
    recipient: { _id: string; fullName: string; email: string };
    content: string;
    read: boolean;
    createdAt: string;
  }>;
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

export async function fetchInterests(status?: string): Promise<InterestItem[]> {
  const query = status && status !== 'ALL' ? `?status=${status}` : '';
  const response = await apiClient.get<{ success: boolean; data: InterestItem[] }>(`/admin/interests${query}`);
  return response.data.data;
}

export async function fetchShortlists(): Promise<ShortlistItem[]> {
  const response = await apiClient.get<{ success: boolean; data: ShortlistItem[] }>('/admin/shortlists');
  return response.data.data;
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
