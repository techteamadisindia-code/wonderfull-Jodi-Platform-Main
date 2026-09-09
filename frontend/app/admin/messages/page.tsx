'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  Filter,
  Check,
  Ban,
  Flag,
  Play,
  Send,
  Terminal,
  Sparkles,
  Phone,
  Mail,
  Share2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchAdminConversations,
  fetchConversationDetails,
  updateConversationModeration,
  updateMessageModeration,
  simulateComplianceDetection,
  sendDemoSeedMessage,
  resetDemoTestMessages,
  AdminConversation,
  AdminMessage,
  AdminMessagesStats,
  ComplianceSimulationResult,
} from '../../../services/activityApi';

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [stats, setStats] = useState<AdminMessagesStats>({
    totalThreads: 0,
    totalMessages: 0,
    activeThreads: 0,
    flaggedThreads: 0,
    flaggedMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [complianceFilter, setComplianceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Action & Modal states
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [viewingConversationId, setViewingConversationId] = useState<string | null>(null);
  const [viewingData, setViewingData] = useState<{
    conversation: AdminConversation;
    messages: AdminMessage[];
  } | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [moderatingMessageId, setModeratingMessageId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    conversationId: string;
    actionType: 'SAFE' | 'FLAGGED' | 'BLOCKED' | 'ACTIVE';
    title: string;
    description: string;
  } | null>(null);

  // Compliance Simulation Sandbox state
  const [showSimPanel, setShowSimPanel] = useState<boolean>(true);
  const [simInput, setSimInput] = useState<string>('Call me at 98765 43210');
  const [simResult, setSimResult] = useState<ComplianceSimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simSending, setSimSending] = useState<boolean>(false);
  const [resettingDemo, setResettingDemo] = useState<boolean>(false);
  const [selectedTargetConvId, setSelectedTargetConvId] = useState<string>('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpenId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // Main Data Fetcher
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const response = await fetchAdminConversations({
        page,
        limit: pageSize,
        status: statusFilter,
        compliance: complianceFilter,
        search: debouncedSearch,
        sortBy: 'lastActivityAt',
        sortOrder: 'desc',
      });

      setConversations(response.conversations || []);
      setPagination(response.pagination);
      setStats(response.stats);

      // Default target conversation for simulation if not set
      if (response.conversations?.length > 0 && !selectedTargetConvId) {
        setSelectedTargetConvId(response.conversations[0]._id);
      }
    } catch (err: any) {
      console.error('Failed to load conversations monitor:', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to load message conversations from server.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [page, pageSize, statusFilter, complianceFilter, debouncedSearch, selectedTargetConvId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Conversation Message Viewer
  const handleOpenConversation = async (conversationId: string) => {
    setViewingConversationId(conversationId);
    setLoadingConversation(true);
    setViewingData(null);

    try {
      const result = await fetchConversationDetails(conversationId);
      setViewingData(result);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Failed to load conversation details:', err);
      setNotification({
        message: 'Failed to retrieve messages for this conversation.',
        type: 'error',
      });
      setViewingConversationId(null);
    } finally {
      setLoadingConversation(false);
    }
  };

  // Trigger Moderation Action with confirmation
  const triggerModerationPrompt = (
    e: React.MouseEvent,
    conversationId: string,
    actionType: 'SAFE' | 'FLAGGED' | 'BLOCKED' | 'ACTIVE'
  ) => {
    e.stopPropagation();
    setActionMenuOpenId(null);

    let title = 'Change Moderation Status';
    let description = 'Are you sure you want to change the compliance state of this conversation?';

    if (actionType === 'SAFE') {
      title = 'Mark Conversation as Safe';
      description = 'Are you sure you want to mark this conversation as compliant and safe?';
    } else if (actionType === 'FLAGGED') {
      title = 'Flag Conversation for Review';
      description = 'Are you sure you want to flag this conversation for suspicious or inappropriate communication?';
    } else if (actionType === 'BLOCKED') {
      title = 'Block Conversation';
      description = 'Are you sure you want to restrict/block further messages in this conversation?';
    }

    setConfirmModal({
      conversationId,
      actionType,
      title,
      description,
    });
  };

  // Execute Conversation Moderation Update
  const executeModerationUpdate = async () => {
    if (!confirmModal) return;
    const { conversationId, actionType } = confirmModal;

    setUpdatingId(conversationId);
    setConfirmModal(null);

    try {
      const payload: { status?: string; complianceStatus?: string } = {};
      if (actionType === 'BLOCKED') {
        payload.status = 'BLOCKED';
        payload.complianceStatus = 'BLOCKED';
      } else if (actionType === 'FLAGGED') {
        payload.status = 'FLAGGED';
        payload.complianceStatus = 'FLAGGED';
      } else if (actionType === 'SAFE') {
        payload.status = 'ACTIVE';
        payload.complianceStatus = 'SAFE';
      } else {
        payload.status = 'ACTIVE';
      }

      const res = await updateConversationModeration(conversationId, payload);
      if (res.success) {
        setNotification({
          message: res.message || `Conversation moderation updated to ${actionType}`,
          type: 'success',
        });

        // Update local state if conversation modal is open
        if (viewingData && viewingData.conversation._id === conversationId) {
          setViewingData({
            ...viewingData,
            conversation: {
              ...viewingData.conversation,
              ...payload,
            } as any,
          });
        }

        loadData(true);
      }
    } catch (err: any) {
      console.error('Failed to update conversation moderation:', err);
      setNotification({
        message: err?.response?.data?.message || 'Failed to update conversation status.',
        type: 'error',
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Message-Level Action: Mark Message as Safe
  const handleMarkMessageSafe = async (messageId: string) => {
    setModeratingMessageId(messageId);
    try {
      const res = await updateMessageModeration(messageId, {
        moderationStatus: 'SAFE',
        flaggedReason: 'Marked safe by admin reviewer',
      });

      if (res.success) {
        setNotification({
          message: 'Message marked as safe and updated in database',
          type: 'success',
        });

        // Update local viewingData
        if (viewingData) {
          const updatedMessages = viewingData.messages.map((m) =>
            m._id === messageId
              ? {
                  ...m,
                  moderationStatus: 'SAFE' as const,
                  moderationCategory: 'NONE' as const,
                  flaggedReason: 'Marked safe by admin reviewer',
                }
              : m
          );

          setViewingData({
            ...viewingData,
            conversation: {
              ...viewingData.conversation,
              complianceStatus: res.data.conversationComplianceStatus as any,
            },
            messages: updatedMessages,
          });
        }

        loadData(true);
      }
    } catch (err: any) {
      console.error('Failed to mark message as safe:', err);
      setNotification({
        message: err?.response?.data?.message || 'Failed to update message moderation state',
        type: 'error',
      });
    } finally {
      setModeratingMessageId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Run Compliance Simulation
  const handleRunSimulation = async (textToTest?: string) => {
    const text = textToTest !== undefined ? textToTest : simInput;
    if (!text || !text.trim()) return;

    setSimLoading(true);
    try {
      const res = await simulateComplianceDetection(text.trim());
      if (res.success) {
        setSimResult(res.data);
      }
    } catch (err: any) {
      console.error('Failed to run compliance simulation:', err);
      setNotification({
        message: err?.response?.data?.message || 'Failed to run simulation test',
        type: 'error',
      });
    } finally {
      setSimLoading(false);
    }
  };

  // Send Synthetic Test Message to Live Demo Conversation
  const handleSendToLiveConversation = async () => {
    if (!simInput.trim()) return;
    const targetId = selectedTargetConvId || conversations[0]?._id;
    if (!targetId) {
      setNotification({
        message: 'No demo conversation available to inject message.',
        type: 'error',
      });
      return;
    }

    setSimSending(true);
    try {
      const res = await sendDemoSeedMessage(targetId, simInput.trim());
      if (res.success) {
        setNotification({
          message: `Message sent • Compliance: ${res.data.compliance.status} (${res.data.compliance.reason})`,
          type: 'success',
        });

        // Update simulation result state
        setSimResult(res.data.compliance);

        // Refresh conversations monitor data from database
        await loadData(true);

        // If that conversation is open, refresh message stream
        if (viewingConversationId === targetId) {
          handleOpenConversation(targetId);
        }
      }
    } catch (err: any) {
      console.error('Failed to inject synthetic test message:', err);
      setNotification({
        message: err?.response?.data?.message || 'Failed to send test message to demo chat',
        type: 'error',
      });
    } finally {
      setSimSending(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Safe Reset Demo Data (Development Only)
  const handleResetDemoData = async () => {
    setResettingDemo(true);
    try {
      const res = await resetDemoTestMessages();
      if (res.success) {
        setNotification({
          message: res.message || 'Synthetic test messages cleanly reset in demo chat.',
          type: 'success',
        });
        await loadData(true);
        if (viewingConversationId) {
          handleOpenConversation(viewingConversationId);
        }
      }
    } catch (err: any) {
      console.error('Failed to reset demo test messages:', err);
      setNotification({
        message: err?.response?.data?.message || 'Failed to reset demo messages.',
        type: 'error',
      });
    } finally {
      setResettingDemo(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Compliance Badge Helper
  const renderComplianceBadge = (compliance: string, status?: string) => {
    if (status === 'BLOCKED' || compliance === 'BLOCKED') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap"
          title="Conversation Blocked by Admin"
        >
          <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>BLOCKED</span>
        </span>
      );
    }

    if (compliance === 'FLAGGED' || status === 'FLAGGED') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs whitespace-nowrap"
          title="Flagged: Contact Information Detected"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>FLAGGED</span>
        </span>
      );
    }

    if (compliance === 'UNDER_REVIEW') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs whitespace-nowrap"
          title="Under Active Compliance Review"
        >
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>UNDER REVIEW</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap"
        title="Secured & Monitored — Clean Compliance"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>SAFE</span>
      </span>
    );
  };

  // Synthetic Test Presets
  const SYNTHETIC_TEST_PRESETS = [
    { label: 'Standard Phone', text: 'Call me at 9876543210' },
    { label: 'Spaced Phone', text: 'My number is 98765 43210' },
    { label: 'WhatsApp +91', text: 'WhatsApp me at +91 9876543210' },
    { label: 'Hyphenated', text: 'Contact: 98765-43210' },
    { label: 'Word Digits', text: 'nine eight seven six five four three two one zero' },
    { label: 'Dot Separated', text: '98765.43210' },
    { label: 'Greeting (Safe)', text: 'Hello, how are you doing today?' },
    { label: 'Salary (Safe)', text: 'My salary is 50000 per month.' },
    { label: 'Year (Safe)', text: 'I was born in 1998 in Pune.' },
    { label: 'Profile ID (Safe)', text: 'My profile ID is 123456.' },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-fade-in transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.actionType === 'SAFE'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : confirmModal.actionType === 'BLOCKED'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                {confirmModal.actionType === 'SAFE' ? (
                  <Check className="w-5 h-5" />
                ) : confirmModal.actionType === 'BLOCKED' ? (
                  <Ban className="w-5 h-5" />
                ) : (
                  <Flag className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeModerationUpdate}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition active:scale-95 ${
                  confirmModal.actionType === 'SAFE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : confirmModal.actionType === 'BLOCKED'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Viewer Modal */}
      {viewingConversationId && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingConversationId(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full h-[650px] max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#E51F3E] border border-rose-100 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>
                      {viewingData?.conversation.participant1?.displayName || 'User 1'}
                    </span>
                    <span className="text-slate-400 font-normal">↔</span>
                    <span>
                      {viewingData?.conversation.participant2?.displayName || 'User 2'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>
                      {viewingData?.messages.length || 0} messages exchanged
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Compliance:
                      <strong className={viewingData?.conversation.complianceStatus === 'FLAGGED' ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                        {viewingData?.conversation.complianceStatus || 'SAFE'}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingConversationId(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center text-lg font-bold transition"
              >
                ×
              </button>
            </div>

            {/* Modal Message Stream Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/30">
              {loadingConversation ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E51F3E] mb-2" />
                  <p className="text-xs font-semibold">Retrieving conversation messages...</p>
                </div>
              ) : !viewingData?.messages || viewingData.messages.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No Messages Recorded</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    This conversation thread currently has no chat messages.
                  </p>
                </div>
              ) : (
                viewingData.messages.map((msg, idx) => {
                  const isFirstParticipant =
                    msg.sender?._id === viewingData.conversation.participant1?._id;
                  const isFlagged = msg.moderationStatus === 'FLAGGED' || msg.moderationStatus === 'UNDER_REVIEW';

                  const dateObj = new Date(msg.createdAt);
                  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${
                        isFirstParticipant ? 'items-start' : 'items-end'
                      } space-y-1.5`}
                    >
                      <div
                        className={`flex items-start gap-2.5 max-w-[85%] ${
                          isFirstParticipant ? 'justify-start' : 'justify-end flex-row-reverse'
                        }`}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          {msg.sender?.primaryPhoto ? (
                            <img
                              src={msg.sender.primaryPhoto}
                              alt={msg.sender.displayName || 'Sender'}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-rose-100 text-[#E51F3E] text-[10px] font-bold flex items-center justify-center border border-rose-200">
                              {(msg.sender?.displayName || msg.sender?.fullName || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Message Bubble Container */}
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-2xs space-y-2 transition-all ${
                            isFlagged
                              ? 'bg-amber-50/90 border-2 border-amber-300 text-slate-900 ring-4 ring-amber-400/10'
                              : isFirstParticipant
                              ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                              : 'bg-[#0B1120] text-white rounded-tr-xs'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between gap-4 text-[10px] ${
                              isFlagged ? 'text-amber-800' : isFirstParticipant ? 'text-slate-500' : 'text-slate-300'
                            }`}
                          >
                            <span className="font-bold truncate">
                              {msg.sender?.displayName || msg.sender?.fullName || 'Participant'}
                            </span>
                            <span>{formattedTime}</span>
                          </div>

                          {/* Message Content */}
                          <p className={`text-xs leading-relaxed break-words font-medium ${isFlagged ? 'text-slate-900 font-semibold' : ''}`}>
                            {msg.content}
                          </p>

                          {/* Flagged Alert Box */}
                          {isFlagged && (
                            <div className="mt-2 pt-2 border-t border-amber-200/80 bg-amber-100/60 p-2.5 rounded-xl text-xs space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>⚠ COMPLIANCE ALERT: {msg.flaggedReason || 'Contact Information Detected'}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300 uppercase tracking-wider">
                                  {msg.moderationCategory || 'PHONE_NUMBER'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-2 text-[10px] text-amber-800/90 pt-0.5">
                                <span>
                                  Confidence: <strong>{msg.moderationConfidence || 'HIGH'}</strong> ({Math.round((msg.moderationScore || 0.98) * 100)}%)
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleMarkMessageSafe(msg._id)}
                                  disabled={moderatingMessageId === msg._id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs transition active:scale-95 disabled:opacity-50"
                                >
                                  {moderatingMessageId === msg._id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  <span>Mark Message Safe</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Modal Footer Moderation Controls */}
            <div className="p-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Thread Compliance:
                </span>
                {renderComplianceBadge(
                  viewingData?.conversation.complianceStatus || 'SAFE',
                  viewingData?.conversation.status
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) =>
                    viewingData &&
                    triggerModerationPrompt(e, viewingData.conversation._id, 'SAFE')
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Thread Safe</span>
                </button>
                <button
                  type="button"
                  onClick={(e) =>
                    viewingData &&
                    triggerModerationPrompt(e, viewingData.conversation._id, 'FLAGGED')
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Flag Thread</span>
                </button>
                <button
                  type="button"
                  onClick={(e) =>
                    viewingData &&
                    triggerModerationPrompt(e, viewingData.conversation._id, 'BLOCKED')
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Block Thread</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Conversations & Messages Monitor</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Compliance Protection
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time chat activity monitor for direct contact information detection (phone numbers, emails, social media)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50"
            title="Refresh messages feed from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : 'text-slate-500'}`} />
            <span>Refresh Activity</span>
          </button>
        </div>
      </div>

      {/* Real Statistics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-slate-400 block truncate">
              Total Chat Threads
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.totalThreads}
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-slate-400 block truncate">
              Total Messages
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.totalMessages}
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-slate-400 block truncate">
              Active Threads
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.activeThreads}
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 text-[#E51F3E] border border-rose-100 flex items-center justify-center font-bold shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold text-slate-400 block truncate">
              Flagged / Monitored
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.flaggedThreads}
            </p>
          </div>
        </div>
      </div>

      {/* Compliance Simulation Sandbox Tool */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0B1120] to-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Compliance Detection Sandbox & Simulation</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  Admin / Dev Only
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Test phone number and contact information detection deterministically using synthetic test values (e.g. 98765 43210)
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSimPanel(!showSimPanel)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1"
          >
            {showSimPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showSimPanel && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Quick Test Preset Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Synthetic Test Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SYNTHETIC_TEST_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSimInput(preset.text);
                      handleRunSimulation(preset.text);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                      simInput === preset.text
                        ? 'bg-rose-500 text-white border-rose-400 shadow-xs'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Demo Conversation & Controls */}
            {conversations.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold text-[11px]">
                    Target Demo Thread:
                  </span>
                  <select
                    value={selectedTargetConvId}
                    onChange={(e) => setSelectedTargetConvId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                  >
                    {conversations.map((c) => {
                      const p1 = c.participant1?.displayName || c.participants?.[0]?.displayName || 'User 1';
                      const p2 = c.participant2?.displayName || c.participants?.[1]?.displayName || 'User 2';
                      return (
                        <option key={c._id} value={c._id}>
                          {p1} ↔ {p2} ({c.messageCount} msgs • {c.complianceStatus})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleResetDemoData}
                  disabled={resettingDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-semibold transition border border-slate-700/60"
                  title="Safely remove test simulation messages from demo chat"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resettingDemo ? 'animate-spin' : ''}`} />
                  <span>{resettingDemo ? 'Resetting...' : 'Reset Demo Data'}</span>
                </button>
              </div>
            )}

            {/* Input & Action Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="Enter message to analyze (e.g. Call me at 98765 43210)..."
                  className="w-full h-10 px-3.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunSimulation();
                  }}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRunSimulation()}
                  disabled={simLoading || !simInput.trim()}
                  className="px-4 py-2 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  {simLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Run Detection</span>
                </button>

                {conversations.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSendToLiveConversation}
                    disabled={simSending || !simInput.trim()}
                    className="px-4 py-2 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
                    title="Send this synthetic test message into the real demo chat to verify backend detection & moderation"
                  >
                    {simSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        <span>Sending test message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-rose-400" />
                        <span>Send Synthetic Message to Demo Chat</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Diagnostic Simulation Result Card */}
            {simResult && (
              <div
                className={`p-3.5 rounded-xl border transition-all animate-fade-in ${
                  simResult.status === 'FLAGGED'
                    ? 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {simResult.status === 'FLAGGED' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className="font-bold text-sm">
                      {simResult.status === 'FLAGGED' ? '⚠ FLAGGED: Contact Info Detected' : '✓ SAFE: Clean & Compliant'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 font-semibold">
                      Category: <strong>{simResult.category}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 font-semibold">
                      Confidence: <strong>{simResult.confidence}</strong> ({Math.round(simResult.score * 100)}%)
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-300 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                  <p>
                    <strong className="text-white">Reason:</strong> {simResult.reason}
                  </p>
                  {simResult.matchedRule && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Rule: {simResult.matchedRule}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter + Search Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status & Compliance Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-400 px-2 uppercase">Status:</span>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'ACTIVE', label: 'Active' },
                { key: 'FLAGGED', label: 'Flagged' },
                { key: 'BLOCKED', label: 'Blocked' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs transition ${
                    statusFilter === tab.key
                      ? 'bg-[#0B1120] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-400 px-2 uppercase">Compliance:</span>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'SAFE', label: 'Safe' },
                { key: 'FLAGGED', label: 'Flagged' },
                { key: 'UNDER_REVIEW', label: 'Under Review' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setComplianceFilter(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs transition ${
                    complianceFilter === tab.key
                      ? 'bg-[#E51F3E] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by participant, email, conversation..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-8.5 pl-8.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-sm font-bold"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Conversations Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-visible">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-4 sm:px-5 w-[25%] min-w-[200px]">Participant 1</th>
                <th className="py-3 px-4 sm:px-5 w-[25%] min-w-[200px]">Participant 2</th>
                <th className="py-3 px-4 w-[18%] min-w-[150px]">Last Activity</th>
                <th className="py-3 px-3 w-[12%] min-w-[100px] text-center">Messages</th>
                <th className="py-3 px-4 w-[12%] min-w-[120px]">Compliance</th>
                <th className="py-3 px-4 w-[8%] min-w-[90px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Skeleton loading state
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-24 bg-slate-200 rounded" />
                          <div className="h-3 w-32 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-24 bg-slate-200 rounded" />
                          <div className="h-3 w-32 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-24 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-32 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="h-6 w-12 bg-slate-200 rounded-full mx-auto" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-6 w-16 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="w-8 h-8 rounded bg-slate-200 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-[#E51F3E] flex items-center justify-center mx-auto mb-3 border border-rose-100">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">
                      {debouncedSearch
                        ? 'No conversations found matching your search'
                        : 'No active chat threads recorded'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {debouncedSearch
                        ? 'Try modifying your search query or clearing filters.'
                        : 'When matrimonial members chat with each other, their conversation streams will be monitored here.'}
                    </p>
                    {debouncedSearch && (
                      <button
                        onClick={handleClearSearch}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Search</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                conversations.map((thread) => {
                  const p1 = thread.participant1 || thread.participants?.[0];
                  const p2 = thread.participant2 || thread.participants?.[1];
                  const p1Name = p1?.displayName || p1?.fullName || 'Participant 1';
                  const p2Name = p2?.displayName || p2?.fullName || 'Participant 2';
                  const isUpdating = updatingId === thread._id;
                  const isFlagged = thread.complianceStatus === 'FLAGGED';

                  const dateObj = new Date(thread.lastActivityAt || thread.updatedAt);
                  const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <tr
                      key={thread._id}
                      className={`hover:bg-slate-50/75 transition-colors group ${
                        isFlagged ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* 1. PARTICIPANT 1 (25%) */}
                      <td className="py-3 px-4 sm:px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {p1?.primaryPhoto ? (
                              <img
                                src={p1.primaryPhoto}
                                alt={p1Name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-100 via-rose-50 to-red-100 text-[#E51F3E] flex items-center justify-center font-bold text-xs border border-rose-200/60 shadow-2xs">
                                {p1Name.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[160px]" title={p1Name}>
                              {p1Name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[160px]" title={p1?.email}>
                              {p1?.email}
                            </p>
                            {(p1?.profession || p1?.city) && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">
                                {p1?.profession}
                                {p1?.city ? ` • ${p1.city}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. PARTICIPANT 2 (25%) */}
                      <td className="py-3 px-4 sm:px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {p2?.primaryPhoto ? (
                              <img
                                src={p2.primaryPhoto}
                                alt={p2Name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 shadow-2xs">
                                {p2Name.charAt(0)?.toUpperCase() || 'P'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[160px]" title={p2Name}>
                              {p2Name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[160px]" title={p2?.email}>
                              {p2?.email}
                            </p>
                            {(p2?.profession || p2?.city) && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">
                                {p2?.profession}
                                {p2?.city ? ` • ${p2.city}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. LAST ACTIVITY (18%) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs">
                            {formattedDate}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formattedTime}
                          </span>
                          {thread.lastMessage && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[160px] italic mt-0.5" title={thread.lastMessage}>
                              "{thread.lastMessage}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. MESSAGE COUNT (12% Centered) */}
                      <td className="py-3 px-3 align-middle text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {thread.messageCount || 0} msgs
                        </span>
                      </td>

                      {/* 5. COMPLIANCE STATUS (12%) */}
                      <td className="py-3 px-4 align-middle">
                        {renderComplianceBadge(thread.complianceStatus, thread.status)}
                      </td>

                      {/* 6. ACTIONS (8%) */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenConversation(thread._id)}
                            className={`p-1.5 rounded-lg transition shadow-2xs ${
                              isFlagged
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 hover:bg-[#0B1120] text-slate-600 hover:text-white'
                            }`}
                            title="View Chat Messages"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId(
                                  actionMenuOpenId === thread._id ? null : thread._id
                                );
                              }}
                              disabled={isUpdating}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                              title="Moderation Actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Relative Dropdown */}
                            {actionMenuOpenId === thread._id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 animate-scale-up"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                  Moderation
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    triggerModerationPrompt(e, thread._id, 'SAFE')
                                  }
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Mark Safe</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    triggerModerationPrompt(e, thread._id, 'FLAGGED')
                                  }
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <Flag className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Flag for Review</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    triggerModerationPrompt(e, thread._id, 'BLOCKED')
                                  }
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Block Thread</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="p-3 sm:p-3.5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {pagination.total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(page * pageSize, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{pagination.total}</span> chat threads
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>

              {Array.from({ length: pagination.totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  pageNum === 1 ||
                  pageNum === pagination.totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition ${
                        page === pageNum
                          ? 'bg-[#0B1120] text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
