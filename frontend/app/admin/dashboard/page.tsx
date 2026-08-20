'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  ShieldAlert,
  CreditCard,
  IndianRupee,
  AlertTriangle,
  MailQuestion,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  HeartHandshake,
  MessageSquare,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { fetchDashboardStats, DashboardStats } from '../../../services/adminApi';
import { approveVerification, rejectVerification } from '../../../services/verificationApi';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickApprove = async (id: string) => {
    try {
      await approveVerification(id, 'Approved via Dashboard Quick Action');
      setActionMsg('Verification successfully approved!');
      setTimeout(() => setActionMsg(null), 4000);
      loadData(true);
    } catch (err) {
      console.error('Quick approve failed:', err);
    }
  };

  const handleQuickReject = async (id: string) => {
    try {
      await rejectVerification(id, 'Document requires re-submission', 'Rejected via Dashboard');
      setActionMsg('Verification request rejected.');
      setTimeout(() => setActionMsg(null), 4000);
      loadData(true);
    } catch (err) {
      console.error('Quick reject failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-72"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-slate-200/70 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 bg-slate-200/70 rounded-2xl"></div>
          <div className="h-80 bg-slate-200/70 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      subValue: `+${stats?.newRegistrations7d ?? 0} this week`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      href: '/admin/users',
    },
    {
      title: 'Active Accounts',
      value: stats?.activeUsers ?? 0,
      subValue: `${Math.round(((stats?.activeUsers ?? 0) / (stats?.totalUsers || 1)) * 100)}% engagement rate`,
      icon: Activity,
      color: 'from-emerald-600 to-teal-600',
      href: '/admin/users?status=active',
    },
    {
      title: 'Verified Profiles',
      value: stats?.verifiedProfiles ?? 0,
      subValue: 'Doctor & ID verified',
      icon: ShieldCheck,
      color: 'from-cyan-600 to-blue-600',
      href: '/admin/profiles?verificationStatus=VERIFIED',
    },
    {
      title: 'Pending Verifications',
      value: stats?.pendingVerification ?? 0,
      subValue: 'Action required',
      icon: ShieldAlert,
      color: 'from-amber-500 to-orange-600',
      highlight: (stats?.pendingVerification ?? 0) > 0,
      href: '/admin/verification',
    },
    {
      title: 'Premium Subscribers',
      value: stats?.premiumUsers ?? 0,
      subValue: 'Paid active members',
      icon: CreditCard,
      color: 'from-purple-600 to-pink-600',
      href: '/admin/memberships',
    },
    {
      title: 'Total Revenue (INR)',
      value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`,
      subValue: 'Lifetime collections',
      icon: IndianRupee,
      color: 'from-emerald-600 to-green-700',
      href: '/admin/payments',
    },
    {
      title: 'Abuse Reports',
      value: stats?.pendingReports ?? 0,
      subValue: 'Pending moderation',
      icon: AlertTriangle,
      color: 'from-rose-600 to-red-700',
      highlight: (stats?.pendingReports ?? 0) > 0,
      href: '/admin/reports',
    },
    {
      title: 'New Inquiries',
      value: stats?.newInquiries ?? 0,
      subValue: 'Support & VVIP requests',
      icon: MailQuestion,
      color: 'from-amber-600 to-yellow-600',
      href: '/admin/settings',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification Banner */}
      {actionMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Platform Analytics & Control
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time matrimonial database metrics, verifications queue, and billing overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
          <Link
            href="/admin/notifications"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold text-xs shadow-md shadow-red-600/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Broadcast Alert</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className={`p-6 rounded-2xl bg-white border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group relative overflow-hidden ${
                card.highlight
                  ? 'border-amber-300 ring-2 ring-amber-400/20 shadow-amber-500/10'
                  : 'border-slate-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                    <span>{card.subValue}</span>
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md shrink-0 transition-transform duration-200 group-hover:scale-105`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-red-600 group-hover:text-red-700">
                <span>View Details</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Summary Grid: Verifications & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Verification Queue Preview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pending KYC & Degree Verifications</h3>
                <p className="text-xs text-slate-500">Doctor degree certificates & government IDs awaiting review</p>
              </div>
            </div>
            <Link
              href="/admin/verification"
              className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
            >
              <span>View All ({stats?.pendingVerification ?? 0})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 flex-1 divide-y divide-slate-100">
            {stats?.recentVerifications && stats.recentVerifications.length > 0 ? (
              stats.recentVerifications.map((item) => (
                <div key={item._id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {item.user?.fullName || 'Doctor User'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.documentType}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.user?.email}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Doc</span>
                    </a>
                    {item.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleQuickApprove(item._id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition"
                          title="Approve verification"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleQuickReject(item._id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition"
                          title="Reject verification"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No verification requests in queue.
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments Stream */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Revenue & Transactions</h3>
                <p className="text-xs text-slate-500">Live payment orders and membership subscription upgrades</p>
              </div>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-6 flex-1 divide-y divide-slate-100">
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              stats.recentPayments.map((payment) => (
                <div key={payment._id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800">
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {payment.user?.fullName || 'User'} ({payment.user?.email || 'N/A'})
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gateway: {payment.provider} • ID: {payment.providerPaymentId}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 font-medium shrink-0">
                    {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent payment transactions recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent User Registrations */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent User Registrations</h3>
              <p className="text-xs text-slate-500">Latest doctor matrimonial profiles joined on the platform</p>
            </div>
          </div>
          <Link
            href="/admin/users"
            className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
          >
            <span>Manage All Users</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">User Name</th>
                <th className="py-3.5 px-6">Email Address</th>
                <th className="py-3.5 px-6">Mobile Number</th>
                <th className="py-3.5 px-6">Verification</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Registered On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recentUsers && stats.recentUsers.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">{user.fullName}</td>
                  <td className="py-4 px-6 text-slate-600">{user.email}</td>
                  <td className="py-4 px-6 text-slate-600">{user.mobile}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : user.verificationStatus === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {user.verificationStatus}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
