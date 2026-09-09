'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Shield,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  UserCheck,
  UserX,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import {
  fetchUsers,
  fetchUserById,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  UserItem,
  UserDetailResponse
} from '../../../services/userApi';

function AdminUsersContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams?.get('status') || 'all';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // Modals
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserItem | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('Administrative action');
  const [userToReactivate, setUserToReactivate] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ message, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({
        search: search.trim(),
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit,
      });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages || 1);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      showNotice(err?.response?.data?.message || 'Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return;
    setActionLoading(true);
    try {
      await updateUserStatus(userToDeactivate._id, false, deactivationReason);
      setUsers((prev) =>
        prev.map((u) => (u._id === userToDeactivate._id ? { ...u, isActive: false } : u))
      );
      showNotice(`User account ${userToDeactivate.fullName} marked as Inactive.`);
      setUserToDeactivate(null);
      setDeactivationReason('Administrative action');
      if (statusFilter === 'active') {
        loadUsers();
      }
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Failed to deactivate account', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReactivate = async () => {
    if (!userToReactivate) return;
    setActionLoading(true);
    try {
      await updateUserStatus(userToReactivate._id, true);
      setUsers((prev) =>
        prev.map((u) => (u._id === userToReactivate._id ? { ...u, isActive: true } : u))
      );
      showNotice(`User account ${userToReactivate.fullName} restored to Active status.`);
      setUserToReactivate(null);
      if (statusFilter === 'inactive') {
        loadUsers();
      }
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Failed to reactivate account', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (user: UserItem, newRole: 'user' | 'admin') => {
    try {
      const updated = await updateUserRole(user._id, newRole);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: updated.role } : u)));
      showNotice(`User ${user.fullName} role updated to ${newRole.toUpperCase()}.`);
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Failed to change role', 'error');
    }
  };

  const handleViewUser = async (userId: string) => {
    setModalLoading(true);
    try {
      const data = await fetchUserById(userId);
      setSelectedUserDetail(data);
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Failed to load user details', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete._id);
      setUserToDelete(null);
      showNotice(`User ${userToDelete.fullName} and associated data deleted.`);
      loadUsers();
    } catch (err: any) {
      showNotice(err?.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notice */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            User Accounts Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {total} registered matrimonial user & administrator records
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E51F3E]' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by full name, email, mobile, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-[#E51F3E] hover:bg-[#ce102f] text-white text-xs font-bold transition shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive Accounts</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Roles</option>
            <option value="user">User Accounts</option>
            <option value="admin">Administrators</option>
          </select>

          {/* Page Limit */}
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Profile & Name</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">KYC Verification</th>
                <th className="py-3.5 px-5">Membership</th>
                <th className="py-3.5 px-5">Account Status</th>
                <th className="py-3.5 px-5">Registered</th>
                <th className="py-3.5 px-5">Last Active</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E51F3E] mb-2" />
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/80 transition">
                    {/* Profile & Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {user.profilePhoto ? (
                          <img
                            src={user.profilePhoto}
                            alt={user.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">
                            {user.displayName || user.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {user._id.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-slate-700">{user.email}</p>
                      <p className="text-[11px] text-slate-500">{user.mobile}</p>
                    </td>

                    {/* KYC Verification */}
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          user.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : user.verificationStatus === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {user.verificationStatus === 'VERIFIED' && (
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        )}
                        {user.verificationStatus === 'PENDING' && (
                          <ShieldAlert className="w-3 h-3 text-amber-700" />
                        )}
                        {user.verificationStatus}
                      </span>
                    </td>

                    {/* Membership Plan */}
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          user.membershipPlan === 'PLATINUM' || user.membershipPlan === 'ROYAL_VVIP'
                            ? 'bg-amber-50 text-amber-800 border-amber-200 font-extrabold'
                            : user.membershipPlan === 'GOLD' || user.membershipPlan === 'DIAMOND'
                            ? 'bg-purple-50 text-purple-800 border-purple-200 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {user.membershipPlan || 'FREE'}
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-5">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Last Active Date */}
                    <td className="py-3.5 px-5 text-slate-500">
                      {user.lastActiveAt
                        ? new Date(user.lastActiveAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right space-x-1.5">
                      {/* View Details */}
                      <button
                        onClick={() => handleViewUser(user._id)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                        title="View Full User Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Deactivate / Reactivate Action */}
                      {user.isActive ? (
                        <button
                          onClick={() => setUserToDeactivate(user)}
                          className="px-2 py-1 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-700 text-[11px] font-semibold transition"
                          title="Deactivate Account"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => setUserToReactivate(user)}
                          className="px-2 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold transition"
                          title="Reactivate Account"
                        >
                          Reactivate
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing page {page} of {pages || 1} ({total} users total)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-semibold text-slate-700">
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Deactivate Account Confirmation Modal */}
      {userToDeactivate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Deactivate Account?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                This account will be marked inactive and will no longer have normal access to the platform.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Deactivation Reason (Optional)</label>
              <select
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Administrative action">Administrative action</option>
                <option value="User requested deactivation">User requested deactivation</option>
                <option value="Duplicate account">Duplicate account</option>
                <option value="Incomplete profile">Incomplete profile</option>
                <option value="Policy violation">Policy violation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDeactivate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 disabled:opacity-60"
              >
                {actionLoading ? 'Deactivating...' : 'Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Account Confirmation Modal */}
      {userToReactivate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reactivate Account?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                This account will be restored to active status.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToReactivate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReactivate}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-60"
              >
                {actionLoading ? 'Reactivating...' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E51F3E] text-white font-bold flex items-center justify-center text-sm">
                  {selectedUserDetail.user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedUserDetail.user.fullName}</h3>
                  <p className="text-xs text-slate-500">{selectedUserDetail.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-700">
              {/* Account Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Role</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedUserDetail.user.role.toUpperCase()}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                  <p className={`font-bold mt-0.5 ${selectedUserDetail.user.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedUserDetail.user.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">KYC</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedUserDetail.user.verificationStatus}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Mobile</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedUserDetail.user.mobile}</p>
                </div>
              </div>

              {/* Matrimonial Profile Section */}
              {selectedUserDetail.profile ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#E51F3E]" />
                    <span>Matrimonial Profile Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-rose-50/40 border border-rose-100">
                    <div><span className="font-semibold text-slate-500">Display Name:</span> {selectedUserDetail.profile.displayName}</div>
                    <div><span className="font-semibold text-slate-500">Gender:</span> {selectedUserDetail.profile.gender}</div>
                    <div><span className="font-semibold text-slate-500">Profession:</span> {selectedUserDetail.profile.profession}</div>
                    <div><span className="font-semibold text-slate-500">Company:</span> {selectedUserDetail.profile.company || 'N/A'}</div>
                    <div><span className="font-semibold text-slate-500">Education:</span> {selectedUserDetail.profile.education}</div>
                    <div><span className="font-semibold text-slate-500">Degree:</span> {selectedUserDetail.profile.degree || 'N/A'}</div>
                    <div><span className="font-semibold text-slate-500">City / State:</span> {selectedUserDetail.profile.city}, {selectedUserDetail.profile.state}</div>
                    <div><span className="font-semibold text-slate-500">Religion / Caste:</span> {selectedUserDetail.profile.religion} ({selectedUserDetail.profile.caste})</div>
                    <div><span className="font-semibold text-slate-500">Annual Income:</span> {selectedUserDetail.profile.annualIncome}</div>
                    <div><span className="font-semibold text-slate-500">Marital Status:</span> {selectedUserDetail.profile.maritalStatus}</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 text-slate-500 text-center">
                  No public matrimonial profile created for this account yet.
                </div>
              )}

              {/* Active Subscription */}
              {selectedUserDetail.subscription && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>Current Subscription Plan</span>
                  </h4>
                  <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-purple-900 text-sm">{selectedUserDetail.subscription.plan}</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">Status: {selectedUserDetail.subscription.status}</p>
                    </div>
                    <span className="text-xs text-purple-800 font-semibold">
                      Valid until {selectedUserDetail.subscription.expiryDate ? new Date(selectedUserDetail.subscription.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete User Account?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-900">{userToDelete.fullName}</strong> ({userToDelete.email})? All associated matrimonial profiles, verification documents, and subscriptions will be deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E51F3E] mb-2" />
          Loading user records...
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}
