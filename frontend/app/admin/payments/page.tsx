'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  IndianRupee,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  CreditCard,
  Layers,
  ArrowUpRight,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  AlertCircle,
  AlertTriangle,
  Calendar,
  BarChart3,
  Copy,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  BadgeAlert,
  SlidersHorizontal,
} from 'lucide-react';
import {
  fetchPayments,
  fetchPaymentStats,
  fetchPaymentDetails,
  refundPayment,
  simulateDevPayment,
  PaymentItem,
  PaymentListResponse,
  PaymentStatsResponse,
  PaymentStatusType,
  RevenueTrendItem,
} from '../../../services/paymentApi';

export default function AdminPaymentsPage() {
  // Main Data States
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stats, setStats] = useState<PaymentStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Revenue Trend & UI Controls
  const [trendDays, setTrendDays] = useState<number>(30);
  const [showTrendChart, setShowTrendChart] = useState<boolean>(true);
  const [hoveredTrendDay, setHoveredTrendDay] = useState<RevenueTrendItem | null>(null);

  // Modal States
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [refundTarget, setRefundTarget] = useState<PaymentItem | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('Customer requested cancellation / refund');
  const [processingRefund, setProcessingRefund] = useState<boolean>(false);

  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simScenario, setSimScenario] = useState<'SUCCESS' | 'FAILED' | 'PENDING'>('SUCCESS');
  const [simPlan, setSimPlan] = useState<string>('PREMIUM');
  const [simAmount, setSimAmount] = useState<number>(4999);

  // Toast & Copy Feedback
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load Payments List with Backend Pagination & Filters
  const loadPaymentsList = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data: PaymentListResponse = await fetchPayments({
        page: currentPage,
        limit: pageSize,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        plan: planFilter !== 'ALL' ? planFilter : undefined,
        dateRange: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
        sortBy,
        sortOrder,
      });

      setPayments(data.payments || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load payments:', err);
      setError(err?.response?.data?.message || 'Unable to load payment transactions from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize, search, statusFilter, planFilter, dateRangeFilter, sortBy, sortOrder]);

  // Load Revenue Statistics & Timeline
  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchPaymentStats(trendDays);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load payment stats:', err);
    }
  }, [trendDays]);

  // Initial & Dependency Load
  useEffect(() => {
    loadPaymentsList();
  }, [loadPaymentsList]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounced search reset to page 1
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handlePlanFilterChange = (val: string) => {
    setPlanFilter(val);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (val: string) => {
    setDateRangeFilter(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPlanFilter('ALL');
    setDateRangeFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Inspect Transaction Details in Modal
  const handleOpenDetails = async (payment: PaymentItem) => {
    setSelectedPayment(payment);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const fullDetails = await fetchPaymentDetails(payment._id);
      setSelectedPayment(fullDetails);
    } catch (err) {
      console.error('Failed to fetch full payment details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Refund Modal
  const handleOpenRefundModal = (payment: PaymentItem) => {
    const currentRefunded = payment.refundAmount || 0;
    const remaining = Math.max(0, payment.amount - currentRefunded);
    setRefundTarget(payment);
    setRefundAmount(String(remaining));
    setRefundReason('Customer requested cancellation / refund');
  };

  // Execute Refund
  const handleExecuteRefund = async () => {
    if (!refundTarget) return;
    const numAmount = parseFloat(refundAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid refund amount greater than 0', 'error');
      return;
    }

    const currentRefunded = refundTarget.refundAmount || 0;
    const remaining = refundTarget.amount - currentRefunded;
    if (numAmount > remaining) {
      showToast(`Refund amount cannot exceed remaining balance of ₹${remaining.toLocaleString('en-IN')}`, 'error');
      return;
    }

    setProcessingRefund(true);
    try {
      const res = await refundPayment(refundTarget._id, {
        amount: numAmount,
        reason: refundReason,
      });

      showToast(res.message || 'Refund processed successfully!');
      setRefundTarget(null);
      if (detailModalOpen && selectedPayment?._id === refundTarget._id) {
        setSelectedPayment(res.data);
      }
      loadPaymentsList(true);
      loadStats();
    } catch (err: any) {
      console.error('Refund failed:', err);
      showToast(err?.response?.data?.message || 'Failed to process refund', 'error');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Run Dev Simulator Transaction
  const handleRunSimulator = async () => {
    setSimulating(true);
    try {
      const res = await simulateDevPayment({
        scenario: simScenario,
        planKey: simPlan,
        amount: simAmount,
        paymentMethod: 'UPI',
      });
      showToast(res.message || 'Simulated transaction created!');
      setSimulatorOpen(false);
      loadPaymentsList(true);
      loadStats();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Simulator failed', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Helper formatting
  const formatCurrency = (amt: number) => {
    return `₹${(amt || 0).toLocaleString('en-IN')}`;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: PaymentStatusType) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCESS
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            PENDING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <RotateCcw className="w-3 h-3 text-purple-600" />
            REFUNDED
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <RotateCcw className="w-3 h-3 text-amber-600" />
            PARTIALLY REFUNDED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-500" />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const getPlanBadge = (planName?: string) => {
    const p = (planName || 'PREMIUM').toUpperCase();
    if (p.includes('VVIP')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-900 border border-amber-300">
          👑 {planName || 'VVIP'}
        </span>
      );
    }
    if (p.includes('VIP')) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
          ⭐ {planName || 'PREMIUM VIP'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
        {planName || 'PREMIUM'}
      </span>
    );
  };

  return (
    <div className="space-y-7 pb-16">
      {/* Toast Alert Feedback */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold transition-all duration-300 border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.message}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Payments & Revenue Transactions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit payment receipts, Razorpay orders, plan upgrades, and refund logs
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Dev Test Simulator Trigger */}
          <button
            onClick={() => setSimulatorOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-bold shadow-2xs transition"
            title="Simulate test payments for verification without real money"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Dev Simulator</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={() => {
              loadPaymentsList(true);
              loadStats();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#E51F3E]' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Transactions'}</span>
          </button>
        </div>
      </div>

      {/* 2. Revenue Summary Master Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#111827] to-[#1E293B] text-white border border-slate-800 shadow-xl overflow-hidden relative">
        <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                TOTAL LIFETIME PLATFORM REVENUE
              </span>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </p>
              {(stats?.totalRefunded ?? 0) > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-rose-300 border border-slate-700">
                  - {formatCurrency(stats?.totalRefunded ?? 0)} Refunded
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Verified Razorpay gateway collections & active matrimonial plan upgrades
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
            <div className="px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Transactions
              </span>
              <p className="text-xl font-black text-white mt-1">
                {(stats?.totalTransactions ?? totalCount).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Success Rate
              </span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {stats?.successRate ?? 100}%
              </p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Today's Revenue
              </span>
              <p className="text-xl font-black text-white mt-1">
                {formatCurrency(stats?.todayRevenue ?? 0)}
              </p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                This Month
              </span>
              <p className="text-xl font-black text-amber-300 mt-1">
                {formatCurrency(stats?.monthlyRevenue ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Strip for Status Counters */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-4 text-xs font-semibold flex-wrap">
          <div className="flex items-center gap-4 text-slate-300 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Successful: <strong className="text-white">{stats?.successfulTransactions ?? 0}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Pending: <strong className="text-white">{stats?.pendingTransactions ?? 0}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Failed: <strong className="text-white">{stats?.failedTransactions ?? 0}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Refunded: <strong className="text-white">{stats?.refundedTransactions ?? 0}</strong>
            </span>
          </div>

          <button
            onClick={() => setShowTrendChart(!showTrendChart)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold transition"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#E51F3E]" />
            <span>{showTrendChart ? 'Hide Revenue Trend' : 'View Revenue Trend'}</span>
          </button>
        </div>
      </div>

      {/* 3. Revenue Trend Chart (Interactive & Responsive) */}
      {showTrendChart && stats?.revenueTrend && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E51F3E] flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Revenue Collection Trend
                </h3>
                <p className="text-xs text-slate-400">
                  Daily net collections aggregated from verified transactions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    trendDays === d
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Visualization */}
          {(() => {
            const maxVal = Math.max(...stats.revenueTrend.map((t) => t.netRevenue), 1000);
            return (
              <div className="space-y-2">
                {hoveredTrendDay && (
                  <div className="text-xs font-bold text-slate-800 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200 inline-block animate-fade-in">
                    {hoveredTrendDay.displayDate}: <strong>{formatCurrency(hoveredTrendDay.netRevenue)}</strong> ({hoveredTrendDay.count} transaction{hoveredTrendDay.count !== 1 ? 's' : ''})
                  </div>
                )}

                <div className="relative pt-6 pb-2 overflow-x-auto">
                  <div
                    className="flex items-end justify-between gap-2 min-w-full h-44"
                    style={{ minWidth: trendDays > 14 ? `${stats.revenueTrend.length * 28}px` : '100%' }}
                  >
                    {stats.revenueTrend.map((item, idx) => {
                      const heightPercent = Math.max((item.netRevenue / maxVal) * 100, item.netRevenue > 0 ? 10 : 3);
                      const isHovered = hoveredTrendDay?.date === item.date;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                          onMouseEnter={() => setHoveredTrendDay(item)}
                          onMouseLeave={() => setHoveredTrendDay(null)}
                        >
                          <span
                            className={`text-[9px] font-bold mb-1 transition-colors ${
                              item.netRevenue > 0 ? 'text-slate-800 font-extrabold' : 'text-slate-300'
                            }`}
                          >
                            {item.netRevenue > 0 ? `₹${item.netRevenue >= 1000 ? `${Math.round(item.netRevenue / 1000)}k` : item.netRevenue}` : ''}
                          </span>

                          <div
                            className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                              isHovered
                                ? 'bg-[#E51F3E] ring-2 ring-red-400 shadow-md'
                                : item.netRevenue > 0
                                ? 'bg-gradient-to-t from-slate-900 to-slate-700 group-hover:from-[#E51F3E] group-hover:to-rose-500'
                                : 'bg-slate-100 group-hover:bg-slate-200'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />

                          <span className="mt-2 text-[10px] font-semibold text-slate-400 group-hover:text-slate-900 block truncate">
                            {item.displayDate}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 4. Search and Multi-Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by ID, customer name, email, or mobile..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E51F3E] focus:bg-white transition"
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E] appearance-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Plan Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={planFilter}
              onChange={(e) => handlePlanFilterChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E] appearance-none cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="PREMIUM">Premium (₹4,999)</option>
              <option value="PREMIUM_VIP">Premium VIP (₹9,999)</option>
              <option value="VVIP">VVIP Concierge</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Date Range Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={dateRangeFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E51F3E] appearance-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Reset Filters / Clear */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Error Alert */}
        {error && !loading && (
          <div className="p-5 m-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-4 text-xs font-bold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadPaymentsList(false)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-4 px-5 w-[20%]">Transaction / Order ID</th>
                <th className="py-4 px-5 w-[22%]">Customer User</th>
                <th className="py-4 px-5 w-[12%]">Plan</th>
                <th className="py-4 px-5 w-[12%]">Amount (INR)</th>
                <th className="py-4 px-5 w-[11%]">Gateway</th>
                <th className="py-4 px-5 w-[12%]">Status</th>
                <th className="py-4 px-5 w-[13%]">Timestamp</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Skeleton Rows
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-32"></div>
                      <div className="h-3 bg-slate-100 rounded w-20 mt-1"></div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-28"></div>
                      <div className="h-3 bg-slate-100 rounded w-36 mt-1"></div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-5 bg-slate-200 rounded-md w-20"></div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-5 bg-slate-200 rounded w-16"></div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-5 bg-slate-200 rounded-full w-20"></div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-8 bg-slate-200 rounded-xl w-16 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-sm text-slate-700">No payment transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || statusFilter !== 'ALL' || planFilter !== 'ALL' || dateRangeFilter !== 'all'
                        ? 'No records match your active filters. Try adjusting search or reset filters.'
                        : 'No payment records exist in the database yet.'}
                    </p>
                    {(search || statusFilter !== 'ALL' || planFilter !== 'ALL' || dateRangeFilter !== 'all') && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear All Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const displayId = payment.paymentId || payment.providerPaymentId || payment._id;
                  const customerName = payment.user?.fullName || 'Matrimonial User';
                  const customerEmail = payment.user?.email || 'N/A';
                  const planTitle = payment.planName || payment.subscription?.plan || 'PREMIUM';
                  const canRefund = ['SUCCESS', 'PARTIALLY_REFUNDED'].includes(payment.status);

                  return (
                    <tr key={payment._id} className="hover:bg-slate-50/90 transition group">
                      {/* ID & Copy */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[170px]" title={displayId}>
                            {displayId}
                          </span>
                          <button
                            onClick={() => handleCopy(displayId, payment._id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                            title="Copy ID"
                          >
                            {copiedId === payment._id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {payment.orderId && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate" title={payment.orderId}>
                            Order: {payment.orderId}
                          </span>
                        )}
                        {payment.isSimulated && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                            TEST
                          </span>
                        )}
                      </td>

                      {/* Customer User */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
                            {customerName}
                          </p>
                          {payment.user?.verificationStatus === 'VERIFIED' && (
                            <span title="Verified Doctor / ID">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[170px]" title={customerEmail}>
                          {customerEmail}
                        </p>
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-5">
                        {getPlanBadge(planTitle)}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-5 font-black text-slate-900 text-sm">
                        {formatCurrency(payment.amount)}
                        {(payment.refundAmount ?? 0) > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 block">
                            - {formatCurrency(payment.refundAmount ?? 0)}
                          </span>
                        )}
                      </td>

                      {/* Gateway */}
                      <td className="py-4 px-5 font-semibold text-slate-700">
                        <span className="uppercase text-[11px] font-extrabold tracking-wider block text-slate-800">
                          {payment.provider || 'RAZORPAY'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {payment.paymentMethod || 'UPI'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        {getStatusBadge(payment.status)}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-5 text-slate-500 font-medium">
                        {formatDateTime(payment.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Button */}
                          <button
                            onClick={() => handleOpenDetails(payment)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="View Full Payment Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Refund Button */}
                          {canRefund && (
                            <button
                              onClick={() => handleOpenRefundModal(payment)}
                              className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold transition inline-flex items-center gap-1"
                              title="Process refund for this transaction"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Refund</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(currentPage * pageSize, totalCount)}
              </strong>{' '}
              of <strong className="text-slate-900">{totalCount}</strong> transactions
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-400">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition shadow-2xs"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition shadow-2xs"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Detailed Transaction Modal */}
      {detailModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#E51F3E] flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Transaction Audit Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {selectedPayment.paymentId || selectedPayment.providerPaymentId || selectedPayment._id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {detailLoading && (
                <div className="p-4 text-center text-xs text-slate-500 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E51F3E]" />
                  <span>Loading full transaction metadata...</span>
                </div>
              )}

              {/* Status & Amount Overview Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Total Amount
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>
                <div>
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>

              {/* Customer User Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Customer & Account Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Full Name</span>
                    <strong className="text-slate-900">{selectedPayment.user?.fullName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email Address</span>
                    <strong className="text-slate-900">{selectedPayment.user?.email || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Mobile</span>
                    <strong className="text-slate-900">{selectedPayment.user?.mobile || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Verification Status</span>
                    <strong className="text-emerald-700 font-bold">
                      {selectedPayment.user?.verificationStatus || 'VERIFIED'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Plan & Subscription Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Matrimonial Plan & Subscription
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Plan Name</span>
                    <strong className="text-purple-700 font-bold">
                      {selectedPayment.planName || selectedPayment.subscription?.plan || 'PREMIUM'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Gateway Provider</span>
                    <strong className="text-slate-900 uppercase">
                      {selectedPayment.provider || 'RAZORPAY'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Payment Method</span>
                    <strong className="text-slate-900">{selectedPayment.paymentMethod || 'UPI / Gateway'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Transaction Timestamp</span>
                    <strong className="text-slate-900">{formatDateTime(selectedPayment.createdAt)}</strong>
                  </div>
                </div>
              </div>

              {/* Failure Reason if Failed */}
              {selectedPayment.status === 'FAILED' && selectedPayment.failureReason && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                  <span className="text-xs font-extrabold uppercase text-rose-600 block">
                    Payment Failure Reason
                  </span>
                  <p className="text-xs font-semibold">{selectedPayment.failureReason}</p>
                </div>
              )}

              {/* Refund Details if Present */}
              {(selectedPayment.refundAmount ?? 0) > 0 && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase text-purple-700">Refund Audit Log</span>
                    <span className="font-bold text-purple-900">
                      Refunded: {formatCurrency(selectedPayment.refundAmount ?? 0)}
                    </span>
                  </div>
                  {selectedPayment.refundId && (
                    <p className="font-mono text-[11px] text-purple-700">Refund ID: {selectedPayment.refundId}</p>
                  )}
                  {selectedPayment.refundReason && (
                    <p className="text-slate-600">Reason: {selectedPayment.refundReason}</p>
                  )}
                  {selectedPayment.refundedAt && (
                    <p className="text-slate-500 text-[10px]">Processed at: {formatDateTime(selectedPayment.refundedAt)}</p>
                  )}
                </div>
              )}

              {/* Technical Identifiers */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Gateway Identifiers & Signatures
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1.5 overflow-x-auto">
                  <p><span className="text-slate-400">Razorpay Payment ID:</span> {selectedPayment.paymentId || selectedPayment.providerPaymentId}</p>
                  {selectedPayment.orderId && (
                    <p><span className="text-slate-400">Razorpay Order ID:</span> {selectedPayment.orderId}</p>
                  )}
                  {selectedPayment.receipt && (
                    <p><span className="text-slate-400">System Receipt:</span> {selectedPayment.receipt}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              {['SUCCESS', 'PARTIALLY_REFUNDED'].includes(selectedPayment.status) ? (
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleOpenRefundModal(selectedPayment);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Issue Refund</span>
                </button>
              ) : (
                <div></div>
              )}

              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Refund Confirmation Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 bg-rose-50/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Process Transaction Refund
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customer: <strong>{refundTarget.user?.fullName || 'Customer User'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRefundTarget(null)}
                className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary Pill */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Original Paid Amount:</span>
                  <strong className="text-slate-900 font-bold">{formatCurrency(refundTarget.amount)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Remaining Refundable:</span>
                  <strong className="text-emerald-700 font-bold">
                    {formatCurrency(refundTarget.amount - (refundTarget.refundAmount || 0))}
                  </strong>
                </div>
              </div>

              {/* Refund Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Refund Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={refundTarget.amount - (refundTarget.refundAmount || 0)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter full or partial amount to credit back to customer.
                </p>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Audit / Refund Reason
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="State reason for issuing refund..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This action will update database revenue statistics and log an administrative audit record.
                </span>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                disabled={processingRefund}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRefund}
                disabled={processingRefund}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {processingRefund ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Refund...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm & Execute Refund</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Dev Test Simulator Modal */}
      {simulatorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-slate-100 bg-amber-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Payment Test Simulator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Development Sandbox Transaction Generator
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatorOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Safely simulate different gateway lifecycle scenarios to verify revenue aggregation and state changes without real money.
              </p>

              {/* Scenario Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Scenario</label>
                <select
                  value={simScenario}
                  onChange={(e) => setSimScenario(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800"
                >
                  <option value="SUCCESS">Success (Completed Upgrade)</option>
                  <option value="FAILED">Failed (Bank / User Decline)</option>
                  <option value="PENDING">Pending (Awaiting Gateway Capture)</option>
                </select>
              </div>

              {/* Plan Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Matrimonial Plan</label>
                <select
                  value={simPlan}
                  onChange={(e) => {
                    setSimPlan(e.target.value);
                    if (e.target.value === 'PREMIUM') setSimAmount(4999);
                    else if (e.target.value === 'PREMIUM_VIP') setSimAmount(9999);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800"
                >
                  <option value="PREMIUM">Premium Plan (₹4,999)</option>
                  <option value="PREMIUM_VIP">Premium VIP Plan (₹9,999)</option>
                </select>
              </div>

              {/* Amount Display */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Amount (INR)</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSimulatorOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunSimulator}
                disabled={simulating}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Test Record...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Test {simScenario} Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
