'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Shield,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  UserCheck,
  AlertCircle
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Active User State
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers({
        search: search.trim(),
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 15,
      });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      const updated = await updateUserStatus(user._id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive: updated.isActive } : u)));
      showNotice(`User ${user.fullName} is now ${updated.isActive ? 'Active' : 'Suspended'}.`);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleRoleChange = async (user: UserItem, newRole: 'user' | 'admin') => {
    try {
      const updated = await updateUserRole(user._id, newRole);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: updated.role } : u)));
      showNotice(`User ${user.fullName} role updated to ${newRole.toUpperCase()}.`);
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  };

  const handleViewUser = async (userId: string) => {
    setModalLoading(true);
    try {
      const data = await fetchUserById(userId);
      setSelectedUserDetail(data);
    } catch (err) {
      console.error('Failed to load user details:', err);
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
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
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
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by full name, email, or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Suspended</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Roles</option>
            <option value="user">User Accounts</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">KYC Verification</th>
                <th className="py-3.5 px-5">Account Status</th>
                <th className="py-3.5 px-5">Registered</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.fullName}</p>
                          <p className="text-[10px] text-slate-400">ID: {user._id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-slate-700">{user.email}</p>
                      <p className="text-[11px] text-slate-500">{user.mobile}</p>
                    </td>
                    <td className="py-3.5 px-5">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value as any)}
                        className={`text-[10px] font-bold uppercase rounded-lg px-2 py-1 border focus:outline-none ${
                          user.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 font-extrabold'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                    <td className="py-3.5 px-5">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold focus:outline-none"
                        title="Click to toggle status"
                      >
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Suspended
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1.5">
                      <button
                        onClick={() => handleViewUser(user._id)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                        title="View Full User Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
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
            Showing page {page} of {pages || 1} ({total} users)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center text-sm">
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
                  <p className="font-bold text-slate-900 mt-0.5">{selectedUserDetail.user.isActive ? 'ACTIVE' : 'SUSPENDED'}</p>
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
                    <UserCheck className="w-4 h-4 text-red-600" />
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
