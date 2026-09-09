import apiClient from './api';

export interface ChatParticipant {
  _id: string;
  fullName: string;
  email?: string;
  displayName?: string;
  primaryPhoto?: string;
  profession?: string;
  city?: string;
  state?: string;
  profileId?: string;
  verificationStatus?: string;
}

export interface ConversationStats {
  messagesSentByMe: number;
  freeLimit: number;
  isPremium: boolean;
  remainingFreeMessages: number;
  canSendMessage: boolean;
  unreadCount?: number;
}

export interface ConversationItem {
  _id: string;
  participants: ChatParticipant[];
  otherUser?: ChatParticipant | null;
  lastMessage?: string;
  messageCount: number;
  status: 'ACTIVE' | 'FLAGGED' | 'BLOCKED' | 'ARCHIVED';
  complianceStatus: 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
  lastActivityAt: string;
  updatedAt: string;
  createdAt: string;
  stats?: ConversationStats;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    fullName?: string;
    email?: string;
  } | string;
  receiver: {
    _id: string;
    fullName?: string;
    email?: string;
  } | string;
  content: string;
  read: boolean;
  moderationStatus?: 'SAFE' | 'FLAGGED' | 'UNDER_REVIEW' | 'BLOCKED';
  createdAt: string;
}

export interface ConversationDetailResponse {
  conversation: ConversationItem;
  otherUser?: ChatParticipant | null;
  messages: ChatMessage[];
  stats: ConversationStats;
}

export interface SendMessageResponse {
  message: ChatMessage;
  stats: ConversationStats;
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  const response = await apiClient.get<{ success: boolean; data: ConversationItem[] }>('/messages/conversations');
  return response.data.data || [];
}

export async function fetchConversationMessages(conversationId: string): Promise<ConversationDetailResponse> {
  const response = await apiClient.get<{ success: boolean; data: ConversationDetailResponse }>(
    `/messages/conversations/${conversationId}/messages`
  );
  return response.data.data;
}

export async function sendMessage(payload: {
  conversationId?: string;
  receiverId?: string;
  profileId?: string;
  content: string;
}): Promise<SendMessageResponse> {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    data: SendMessageResponse;
  }>('/messages', payload);
  return response.data.data;
}

export async function initiateConversation(payload: {
  targetUserId?: string;
  profileId?: string;
}): Promise<{ conversationId: string }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { conversationId: string };
  }>('/messages/initiate', payload);
  return response.data.data;
}

export interface MembershipStatus {
  isPremium: boolean;
  plan: string;
  status: string;
  startDate?: string;
  expiryDate?: string;
}

export async function fetchMyMembershipStatus(): Promise<MembershipStatus> {
  try {
    const response = await apiClient.get<{ success: boolean; data: MembershipStatus }>('/memberships/status');
    return response.data.data;
  } catch {
    return {
      isPremium: false,
      plan: 'FREE',
      status: 'ACTIVE',
    };
  }
}
