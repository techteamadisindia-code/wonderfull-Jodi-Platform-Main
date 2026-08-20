'use client';

import React, { useEffect, useState } from 'react';
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
  ArrowUpRight
} from 'lucide-react';
import { fetchPayments, PaymentItem, PaymentResponse } from '../../../services/paymentApi';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPayments({
        status: statusFilter,
      });
      setPayments(data.payments || []);
      setTotalRevenue(data.totalRevenue || 0);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const filteredPayments = payments.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.providerPaymentId?.toLowerCase().includes(q) ||
      p.user?.fullName?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Payments & Revenue Transactions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit payment receipts, Razorpay orders, plan upgrades, and refund logs
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Transactions</span>
        </button>
      </div>

      {/* Revenue Summary Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Total Lifetime Platform Revenue
          </span>
          <p className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Processed via Razorpay Gateway & Direct Matrimonial Subscriptions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Transactions</span>
            <p className="text-lg font-bold text-white mt-0.5">{payments.length}</p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Success Rate</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">100%</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by transaction ID, user name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="ALL">All Payments</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Transaction / Order ID</th>
                <th className="py-3.5 px-5">Customer User</th>
                <th className="py-3.5 px-5">Plan</th>
                <th className="py-3.5 px-5">Amount (INR)</th>
                <th className="py-3.5 px-5">Gateway</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading payment records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment transactions recorded.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-800">
                      {payment.providerPaymentId}
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900">{payment.user?.fullName || 'Doctor User'}</p>
                      <p className="text-[11px] text-slate-500">{payment.user?.email || 'N/A'}</p>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-purple-700">
                      {payment.subscription?.plan || 'PREMIUM'}
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-slate-900 text-sm">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-5 uppercase font-medium text-slate-600">
                      {payment.provider}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          payment.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : payment.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
