import apiClient from './api';

export interface InterestProfilePreview {
  user: string;
  displayName: string;
  profession?: string;
  specialization?: string;
  degree?: string;
  education?: string;
  city?: string;
  state?: string;
  primaryPhoto?: string;
  photos?: string[];
  age?: number;
  dob?: string | Date;
  gender?: string;
}

export interface InterestItem {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    email?: string;
    verificationStatus?: string;
  } | string;
  receiver: {
    _id: string;
    fullName: string;
    email?: string;
    verificationStatus?: string;
  } | string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REJECTED' | 'CANCELLED';
  senderProfile?: InterestProfilePreview;
  receiverProfile?: InterestProfilePreview;
  isSender?: boolean;
  otherUser?: any;
  otherProfile?: InterestProfilePreview;
  createdAt: string;
  updatedAt: string;
}

export interface InterestStatusResult {
  hasInterest: boolean;
  status: 'NONE' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REJECTED' | 'CANCELLED';
  isSender: boolean;
  isReceiver: boolean;
  interestId: string | null;
  canChat: boolean;
  targetUserId?: string;
}

export async function sendInterest(target: { receiverId?: string; profileId?: string }): Promise<InterestItem> {
  const response = await apiClient.post<{ success: boolean; message: string; data: InterestItem }>(
    '/interests',
    target
  );
  return response.data.data;
}

export async function checkInterestStatus(targetId: string): Promise<InterestStatusResult> {
  try {
    const response = await apiClient.get<{ success: boolean; data: InterestStatusResult }>(
      `/interests/check/${targetId}`
    );
    return response.data.data;
  } catch {
    return {
      hasInterest: false,
      status: 'NONE',
      isSender: false,
      isReceiver: false,
      interestId: null,
      canChat: false,
    };
  }
}

export async function acceptInterest(interestId: string): Promise<{ interest: InterestItem; conversationId?: string }> {
  const response = await apiClient.patch<{
    success: boolean;
    message: string;
    data: { interest: InterestItem; conversationId?: string };
  }>(`/interests/${interestId}/accept`);
  return response.data.data;
}

export async function rejectInterest(interestId: string): Promise<InterestItem> {
  const response = await apiClient.patch<{ success: boolean; message: string; data: InterestItem }>(
    `/interests/${interestId}/reject`
  );
  return response.data.data;
}

export async function declineInterest(interestId: string): Promise<InterestItem> {
  return rejectInterest(interestId);
}

export async function fetchSentInterests(status?: string): Promise<InterestItem[]> {
  const url = status ? `/interests/sent?status=${encodeURIComponent(status)}` : '/interests/sent';
  const response = await apiClient.get<{ success: boolean; data: InterestItem[] }>(url);
  return response.data.data || [];
}

export async function fetchReceivedInterests(status?: string): Promise<InterestItem[]> {
  const url = status ? `/interests/received?status=${encodeURIComponent(status)}` : '/interests/received';
  const response = await apiClient.get<{ success: boolean; data: InterestItem[] }>(url);
  return response.data.data || [];
}

export async function fetchAcceptedConnections(): Promise<InterestItem[]> {
  const response = await apiClient.get<{ success: boolean; data: InterestItem[] }>('/interests/accepted');
  return response.data.data || [];
}
