'use client';

import React, { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  Crown,
  AlertTriangle,
  ChevronLeft,
  Search,
  Lock,
  ArrowRight,
  Info,
  CheckCheck,
  Clock,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchConversations,
  fetchConversationMessages,
  sendMessage,
  initiateConversation,
  ConversationItem,
  ChatMessage,
  ConversationStats,
} from '../../services/messageApi';
import { getAuthToken } from '../../lib/api';
import { DoctorAvatar } from '../../components/DoctorAvatar';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserIdParam = searchParams.get('user');
  const conversationIdParam = searchParams.get('conversation');
  const targetProfileIdParam = searchParams.get('profile');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdParam);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<ConversationStats>({
    messagesSentByMe: 0,
    freeLimit: 3,
    isPremium: false,
    remainingFreeMessages: 3,
    canSendMessage: true,
  });

  const [inputMessage, setInputMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatTime = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Initial Load: Auth check and load conversations
  const loadConversationsList = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/messages');
      return;
    }

    setLoadingConversations(true);
    try {
      const list = await fetchConversations();
      setConversations(list);

      // If user came with ?user=... param, check if conversation already exists or initiate one
      if (targetUserIdParam || targetProfileIdParam) {
        try {
          const initRes = await initiateConversation({
            targetUserId: targetUserIdParam || undefined,
            profileId: targetProfileIdParam || undefined,
          });
          if (initRes.conversationId) {
            setSelectedConversationId(initRes.conversationId);
          }
        } catch (initErr: any) {
          console.error('Failed to initiate conversation:', initErr);
          const msg = initErr.response?.data?.message || 'Chat requires an accepted interest between both members.';
          setErrorMessage(msg);
        }
      } else if (!selectedConversationId && list.length > 0) {
        setSelectedConversationId(list[0]._id);
      }
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [router, targetUserIdParam, targetProfileIdParam, selectedConversationId]);

  useEffect(() => {
    loadConversationsList();
  }, [loadConversationsList]);

  // 2. Load Selected Conversation Messages
  const loadMessagesForConversation = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    setErrorMessage(null);
    setModerationWarning(null);

    try {
      const data = await fetchConversationMessages(convId);
      setActiveConversation(data.conversation);
      setMessages(data.messages || []);
      if (data.stats) {
        setStats(data.stats);
      }
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || 'Unable to load conversation messages.';
      setErrorMessage(msg);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessagesForConversation(selectedConversationId);
    }
  }, [selectedConversationId, loadMessagesForConversation]);

  // 3. Send Message with Backend Validation
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending || !selectedConversationId) return;

    if (!stats.isPremium && stats.messagesSentByMe >= stats.freeLimit) {
      setErrorMessage('You have reached the free chat limit of 3 messages. Upgrade to Premium to continue chatting.');
      return;
    }

    setSending(true);
    setErrorMessage(null);
    setModerationWarning(null);

    const textToSend = inputMessage.trim();

    try {
      const res = await sendMessage({
        conversationId: selectedConversationId,
        content: textToSend,
      });

      setInputMessage('');
      setMessages((prev) => [...prev, res.message]);
      if (res.stats) {
        setStats(res.stats);
      }
      setTimeout(scrollToBottom, 50);

      // Refresh conversations list to update last message snippet
      fetchConversations().then(setConversations).catch(() => null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      const data = err.response?.data;
      if (data?.code === 'CONTACT_INFO_BLOCKED') {
        setModerationWarning(
          data.message ||
            'Sharing direct phone numbers, email addresses, or contact handles is not allowed for your privacy and safety.'
        );
      } else if (data?.code === 'CHAT_LIMIT_REACHED' || data?.upgradeRequired) {
        setErrorMessage('You have reached the free chat limit of 3 messages. Upgrade to Premium to continue chatting.');
        setStats((prev) => ({
          ...prev,
          messagesSentByMe: data.sentCount || 3,
          canSendMessage: false,
          remainingFreeMessages: 0,
        }));
      } else {
        setErrorMessage(data?.message || 'Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.displayName || c.otherUser?.fullName || '';
    const prof = c.otherUser?.profession || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || prof.toLowerCase().includes(q);
  });

  const activeOtherUser = activeConversation?.otherUser || conversations.find((c) => c._id === selectedConversationId)?.otherUser;

  return (
    <main className="min-h-screen bg-[#FFFDFB] py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#E51F3E] to-[#F03554] text-white flex items-center justify-center shadow-xs shadow-red-500/20">
                <MessageSquare className="w-5 h-5 fill-white stroke-none" />
              </span>
              <span>Doctor Matrimony Messages</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Secure, verified communication between compatible verified doctors & families
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/membership"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Membership Plans</span>
            </Link>
          </div>
        </div>

        {/* Messaging Container */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row h-[750px] max-h-[85vh]">
          {/* ─── Left Sidebar: Conversations List ─── */}
          <aside className={`w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50 ${
            selectedConversationId ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search matches by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                />
              </div>
            </div>

            {/* Conversations Scroll Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
              {loadingConversations ? (
                <div className="p-8 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#E51F3E] mx-auto" />
                  <p className="text-xs text-slate-400">Loading your conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">No Active Conversations</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Send Express Interest to doctor profiles in Search. Once they accept, you can start messaging here.
                  </p>
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E51F3E] text-white text-xs font-bold hover:bg-[#CC1432] transition shadow-xs mt-2"
                  >
                    <span>Browse Profiles</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv._id === selectedConversationId;
                  const other = conv.otherUser;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => setSelectedConversationId(conv._id)}
                      className={`p-4 transition cursor-pointer flex items-center gap-3.5 ${
                        isSelected ? 'bg-rose-50/70 border-l-4 border-[#E51F3E]' : 'hover:bg-white bg-slate-50/30'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <DoctorAvatar
                          photoUrl={other?.primaryPhoto}
                          name={other?.displayName || other?.fullName}
                          size="md"
                          className="w-12 h-12 rounded-2xl border border-slate-200"
                        />
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className={`text-xs sm:text-sm truncate ${isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                            {other?.displayName || other?.fullName || 'Verified Match'}
                          </h4>
                          {conv.lastActivityAt && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(conv.lastActivityAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#E51F3E] font-medium truncate mb-1">
                          {other?.profession || 'Healthcare Professional'}
                        </p>
                        <p className="text-xs text-slate-500 truncate leading-tight">
                          {conv.lastMessage || 'Connected. Say hello!'}
                        </p>
                      </div>

                      {/* Free Limit Counter Badge */}
                      {conv.stats && !conv.stats.isPremium && (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {conv.stats.messagesSentByMe}/3
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* ─── Right Pane: Chat Window ─── */}
          <section className={`flex-1 flex flex-col bg-white ${
            !selectedConversationId ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedConversationId && activeOtherUser ? (
              <>
                {/* Chat Top Bar */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversationId(null)}
                      className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <DoctorAvatar
                        photoUrl={activeOtherUser.primaryPhoto}
                        name={activeOtherUser.displayName || activeOtherUser.fullName}
                        size="sm"
                        className="w-10 h-10 rounded-2xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {activeOtherUser.displayName || activeOtherUser.fullName || 'Doctor Match'}
                        </h3>
                        <span title="Verified Profile">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {activeOtherUser.profession || 'Doctor'} {activeOtherUser.city ? `• ${activeOtherUser.city}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Profile Action Link */}
                  {activeOtherUser.profileId && (
                    <Link
                      href={`/profile/${activeOtherUser.profileId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-[#E51F3E] bg-rose-50/50 hover:bg-rose-100 text-xs font-semibold transition"
                    >
                      <span>View Profile</span>
                    </Link>
                  )}
                </div>

                {/* Free Message Limit & Plan Status Banner (Requirement 10) */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                  {stats.isPremium ? (
                    <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>Premium Member • Unlimited messaging</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Info className="w-3.5 h-3.5 text-[#E51F3E]" />
                        <span>
                          {stats.messagesSentByMe >= stats.freeLimit ? (
                            <strong className="text-[#E51F3E] font-bold">Free messages used</strong>
                          ) : (
                            <strong className="text-slate-900 font-bold">
                              {stats.freeLimit - stats.messagesSentByMe} of {stats.freeLimit} free messages remaining
                            </strong>
                          )}
                        </span>
                      </div>
                      {stats.messagesSentByMe >= stats.freeLimit ? (
                        <span className="text-[11px] font-bold text-[#E51F3E] bg-rose-100 px-2 py-0.5 rounded-full">
                          Limit Reached
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {stats.freeLimit - stats.messagesSentByMe} of 3 remaining
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Moderation Warning Banner */}
                {moderationWarning && (
                  <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="font-bold block">Contact Information Blocked</strong>
                      <span>{moderationWarning}</span>
                    </div>
                    <button
                      onClick={() => setModerationWarning(null)}
                      className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="font-bold block">Chat Alert</strong>
                      <span>{errorMessage}</span>
                    </div>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-700 hover:text-rose-900 font-bold text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FFFDFB]/60">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2 text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-[#E51F3E]" />
                      <span>Loading conversation history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2 text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">Interest accepted! Match confirmed.</p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Say hello to start the conversation with your match.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const senderIdStr = typeof msg.sender === 'object' && msg.sender ? msg.sender._id : String(msg.sender || '');
                      const isMe = senderIdStr !== String(activeOtherUser?._id);
                      return (
                        <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-2xs ${
                              isMe
                                ? 'bg-[#E51F3E] text-white rounded-br-xs'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ─── Bottom Area: Chat Limit Reached vs Message Composer ─── */}
                {!stats.isPremium && stats.messagesSentByMe >= stats.freeLimit ? (
                  /* ─── Premium Upgrade Panel (Requirement 9) ─── */
                  <div className="p-5 sm:p-6 bg-gradient-to-br from-[#FFF5F7] via-white to-[#FFF0F3] border-t border-rose-200 text-center space-y-3 shadow-inner">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-[#E51F3E] text-xs font-extrabold uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Chat Limit Reached</span>
                    </div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
                      Continue Your Conversation ❤️
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      You've used your 3 free messages with this match. Upgrade to Premium to continue chatting and unlock more matchmaking features.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <Link
                        href="/membership"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E51F3E] via-[#E21838] to-[#CC1432] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 hover:-translate-y-0.5 transition cursor-pointer"
                      >
                        <Crown className="w-4 h-4" />
                        <span>Upgrade to Premium</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => router.push('/search')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
                      >
                        <span>Maybe Later</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ─── Standard Message Composer ─── */
                  <form onSubmit={handleSendMessage} className="p-3.5 bg-white border-t border-slate-100 flex items-center gap-2.5">
                    <input
                      type="text"
                      placeholder={
                        !stats.isPremium
                          ? `Type a message (${stats.freeLimit - stats.messagesSentByMe} free remaining)...`
                          : 'Type a message...'
                      }
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={sending}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={sending || !inputMessage.trim()}
                      className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E51F3E] to-[#F03554] text-white flex items-center justify-center shadow-xs shadow-red-500/20 hover:shadow-md hover:shadow-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 text-[#E51F3E] flex items-center justify-center shadow-inner">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">Select a Conversation</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Choose a match from the left sidebar to read their messages or continue your conversation.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#FFFDFB] flex items-center justify-center text-xs text-slate-500">Loading chat...</div>}>
      <ChatContent />
    </React.Suspense>
  );
}
