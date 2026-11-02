'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  X,
  Lock,
  Mail,
  Phone,
  User,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Shield,
  Edit3,
  Crown,
  Save,
} from 'lucide-react';
import {
  fetchAdmins,
  createAdminAccount,
  updateAdminPermissions,
  updateAdminAccount,
  fetchAdminById,
  deleteAdminAccount,
  AdminAccount,
  UpdateAdminData,
} from '../../../services/adminApi';
import { getAdminUser } from '../../../services/authApi';

const PRIMARY_SUPER_ADMIN_EMAIL = 'shubhamchaudante@gmail.com';

function isPrimarySuperAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'all', label: 'Superadmin (Full Access)' },
  { key: 'users', label: 'User Account Management' },
  { key: 'profiles', label: 'Matrimonial Profiles Directory' },
  { key: 'privateInfo.view', label: 'Private Contact & Contract Info (View)' },
  { key: 'privateInfo.edit', label: 'Private Contact & Contract Info (Edit)' },
  { key: 'verifications', label: 'KYC & Degree Verifications' },
  { key: 'memberships', label: 'Memberships & Subscriptions' },
  { key: 'payments', label: 'Payments & Revenue Audit' },
  { key: 'reports', label: 'Abuse & Safety Reports' },
  { key: 'settings', label: 'Platform Configuration' },
];

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Admin Modal State
  const [viewAdminId, setViewAdminId] = useState<string | null>(null);
  const [viewAdminData, setViewAdminData] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  // Edit Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Admin Modal State
  const [adminToDelete, setAdminToDelete] = useState<AdminAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'users',
    'profiles',
    'verifications',
    'memberships',
  ]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const currentAdmin = getAdminUser();
  const currentAdminIsPrimary = isPrimarySuperAdminEmail(currentAdmin?.email);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAdmins();
      setAdmins(data.admins || []);
      setAdminPermissions(data.adminPermissions || []);
    } catch (err: any) {
      console.error('Failed to load admin team:', err);
      setNotice({
        message: err?.response?.data?.message || 'Failed to load administrator accounts',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCreatePerm = (key: string) => {
    if (key === 'all') {
      setSelectedPermissions(['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports', 'settings']);
      return;
    }
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key && p !== 'all'));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const handleToggleEditPerm = (key: string) => {
    if (!editingAdmin) return;
    const isEditingPrimary = isPrimarySuperAdminEmail(editingAdmin.email);

    // Primary Super Admin cannot have 'all' removed
    if (isEditingPrimary && key === 'all') {
      return;
    }

    // Only Primary Super Admin can toggle 'all' on other accounts
    if (key === 'all' && !currentAdminIsPrimary) {
      return;
    }

    if (key === 'all') {
      if (editPermissions.includes('all')) {
        setEditPermissions(editPermissions.filter((p) => p !== 'all'));
      } else {
        setEditPermissions(['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports', 'settings']);
      }
      return;
    }

    if (editPermissions.includes(key)) {
      setEditPermissions(editPermissions.filter((p) => p !== key && p !== 'all'));
    } else {
      setEditPermissions([...editPermissions, key]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    setCreating(true);
    try {
      await createAdminAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim() || undefined,
        password,
        permissions: selectedPermissions,
      });
      setNotice({ message: 'New administrator created successfully!', type: 'success' });
      setShowCreateModal(false);
      setFullName('');
      setEmail('');
      setMobile('');
      setPassword('');
      loadData();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to create admin:', err);
      alert(err.response?.data?.message || 'Failed to create administrator');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenView = async (id: string) => {
    setViewAdminId(id);
    setViewLoading(true);
    setViewError(null);
    try {
      const data = await fetchAdminById(id);
      setViewAdminData(data);
    } catch (err: any) {
      console.error('Failed to fetch admin details:', err);
      setViewError(err?.response?.data?.message || 'Failed to load administrator details.');
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseView = () => {
    setViewAdminId(null);
    setViewAdminData(null);
    setViewError(null);
  };

  const handleOpenEdit = async (admin: AdminAccount) => {
    const isTargetPrimary = isPrimarySuperAdminEmail(admin.email);
    if (isTargetPrimary && !currentAdminIsPrimary) {
      setNotice({
        message: 'Access denied: Only the Primary Super Administrator can edit the protected owner account.',
        type: 'error',
      });
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    setEditingAdmin(admin);
    setEditFullName(admin.fullName || '');
    setEditEmail(admin.email || '');
    setEditMobile(admin.mobile || '');
    setEditStatus((admin.status === 'Inactive' || admin.isActive === false) ? 'Inactive' : 'Active');
    setEditPermissions(getAdminPerms(admin._id));
    setEditError(null);
    setEditLoading(true);

    try {
      const fullDoc = await fetchAdminById(admin._id);
      if (fullDoc) {
        setEditFullName(fullDoc.fullName || admin.fullName);
        setEditEmail(fullDoc.email || admin.email);
        setEditMobile(fullDoc.mobile || admin.mobile || '');
        setEditStatus((fullDoc.status === 'Inactive' || fullDoc.isActive === false) ? 'Inactive' : 'Active');
        if (Array.isArray(fullDoc.permissions)) {
          setEditPermissions(fullDoc.permissions);
        }
      }
    } catch (err) {
      console.warn('Could not fetch full admin record for edit prefill, using row data:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEdit = () => {
    setEditingAdmin(null);
    setEditFullName('');
    setEditEmail('');
    setEditMobile('');
    setEditStatus('Active');
    setEditPermissions([]);
    setEditError(null);
    setEditSubmitting(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    const isTargetPrimary = isPrimarySuperAdminEmail(editingAdmin.email);
    const trimmedName = editFullName.trim();
    if (!trimmedName) {
      setEditError('Full legal name is required.');
      return;
    }

    const payload: UpdateAdminData = {
      fullName: trimmedName,
      mobile: editMobile.trim(),
    };

    if (isTargetPrimary) {
      // Primary Super Admin: email, status and 'all' cannot be modified
      payload.permissions = ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports', 'settings'];
    } else {
      const trimmedEmail = editEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEditError('Please enter a valid email address.');
        return;
      }
      payload.email = trimmedEmail;
      payload.status = editStatus;
      payload.isActive = editStatus === 'Active';
      payload.permissions = editPermissions;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      await updateAdminAccount(editingAdmin._id, payload);
      setNotice({
        message: `Administrator ${trimmedName} updated successfully.`,
        type: 'success',
      });
      handleCloseEdit();
      loadData();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to update admin account:', err);
      setEditError(err?.response?.data?.message || 'Failed to update administrator account.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenDelete = (admin: AdminAccount) => {
    const isTargetPrimary = isPrimarySuperAdminEmail(admin.email);
    if (isTargetPrimary) {
      setNotice({
        message: 'The protected Primary Super Admin account cannot be deleted by anyone.',
        type: 'error',
      });
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    const isSelf =
      admin._id === currentAdmin?._id ||
      admin.email?.toLowerCase() === currentAdmin?.email?.toLowerCase();
    if (isSelf) {
      setNotice({ message: 'Self-deletion is prohibited. You cannot delete your own account.', type: 'error' });
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    setAdminToDelete(admin);
    setDeleteError(null);
  };

  const handleCloseDelete = () => {
    setAdminToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteAdminAccount(adminToDelete._id, 'Deactivated and removed by Super Administrator');
      setNotice({ message: `Administrator ${adminToDelete.fullName} deleted successfully.`, type: 'success' });
      handleCloseDelete();
      loadData();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete admin:', err);
      setDeleteError(err?.response?.data?.message || 'Failed to delete administrator account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getAdminPerms = (adminId: string): string[] => {
    const doc = adminPermissions.find(
      (p) =>
        (p.user && (p.user._id === adminId || p.user === adminId)) ||
        p.userId === adminId ||
        p._id === adminId
    );
    return doc?.permissions || [];
  };

  return (
    <div className="space-y-6 pb-12">
      {notice && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-xs animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="text-slate-500 hover:text-slate-900 font-bold px-2">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Administrator Team & Access Roles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Provision staff accounts, inspect assigned access roles, and manage permissions securely
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Admin</span>
          </button>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Administrator</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">System Role</th>
                <th className="py-3.5 px-5">Authorized Modules</th>
                <th className="py-3.5 px-5">Created On</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
                    Loading administrator team...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No administrators found.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const isPrimary = isPrimarySuperAdminEmail(admin.email);
                  const perms = isPrimary
                    ? ['all', 'users', 'profiles', 'verifications', 'memberships', 'payments', 'reports', 'settings']
                    : getAdminPerms(admin._id);
                  const isSuperAdmin = isPrimary || perms.includes('all');
                  const isSelf =
                    admin._id === currentAdmin?._id ||
                    admin.email?.toLowerCase() === currentAdmin?.email?.toLowerCase();

                  return (
                    <tr key={admin._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shadow-xs ${
                              isPrimary
                                ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white'
                                : 'bg-purple-600 text-white'
                            }`}
                          >
                            {isPrimary ? (
                              <Crown className="w-4 h-4 text-white" />
                            ) : (
                              admin.fullName?.charAt(0).toUpperCase() || 'A'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{admin.fullName}</p>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">ID: {admin._id.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-slate-700">{admin.email}</p>
                        <p className="text-[11px] text-slate-500">{admin.mobile || '—'}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        {isPrimary ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border border-amber-300 shadow-2xs"
                            title="Permanent protected primary super administrator"
                          >
                            <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>PRIMARY SUPER ADMIN</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                            {isSuperAdmin ? 'Super Admin' : 'Staff Admin'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            Full Access Privileges
                          </span>
                        ) : perms.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {perms.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize"
                              >
                                {p}
                              </span>
                            ))}
                            {perms.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 text-slate-600">
                                +{perms.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No modules assigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">
                        {new Date(admin.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(admin._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:border-slate-300 transition cursor-pointer"
                            title="View administrator details & assigned permissions"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>View</span>
                          </button>

                          {/* Edit Button */}
                          {isPrimary && !currentAdminIsPrimary ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-300 text-xs font-semibold shadow-2xs cursor-not-allowed opacity-60"
                              title="Only the Primary Super Administrator can edit this account"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Edit</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(admin)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:border-slate-300 transition cursor-pointer"
                              title="Edit administrator details and permissions"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Delete Action: Lock badge for Primary Super Admin, button for others */}
                          {isPrimary ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-800 text-xs font-bold select-none cursor-not-allowed shadow-2xs"
                              title="Protected Primary Super Admin cannot be deleted"
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Protected</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleOpenDelete(admin)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition cursor-pointer ${
                                isSelf
                                  ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
                                  : 'border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 hover:border-rose-300'
                              }`}
                              title={isSelf ? 'Self-deletion is prohibited' : 'Delete administrator account'}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete</span>
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
      </div>

      {/* Edit Administrator Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Administrator Account</h3>
                  <p className="text-[11px] text-slate-500">Update account credentials, status, and module authorizations</p>
                </div>
              </div>
              <button
                onClick={handleCloseEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isPrimarySuperAdminEmail(editingAdmin.email) && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Protected Primary Super Administrator</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    This account is the permanent protected platform owner. Official email address, role, full access privileges, and active status are permanently immutable.
                  </p>
                </div>
              </div>
            )}

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {editError}
              </div>
            )}

            {editLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-600" />
                <p className="text-xs text-slate-500">Loading administrator details...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Official Email Address</label>
                    {isPrimarySuperAdminEmail(editingAdmin.email) && (
                      <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        Immutable
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    required
                    disabled={isPrimarySuperAdminEmail(editingAdmin.email)}
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-slate-900 ${
                      isPrimarySuperAdminEmail(editingAdmin.email)
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                    }`}
                  />
                  {isPrimarySuperAdminEmail(editingAdmin.email) && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      The primary super administrator email cannot be altered.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Account Status</label>
                    {isPrimarySuperAdminEmail(editingAdmin.email) && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Permanently Active
                      </span>
                    )}
                  </div>
                  {isPrimarySuperAdminEmail(editingAdmin.email) ? (
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-semibold flex items-center justify-between">
                      <span>Active</span>
                      <span className="text-[10px] text-slate-400">Cannot be deactivated</span>
                    </div>
                  ) : (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'Active' | 'Inactive')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-semibold text-slate-700">Module Permissions</label>
                    {!currentAdminIsPrimary && (
                      <span className="text-[10px] text-slate-400">
                        * Only Primary Super Admin can grant Superadmin role
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isEditingPrimary = isPrimarySuperAdminEmail(editingAdmin.email);
                      const isSuperAdminChecked =
                        isEditingPrimary ||
                        editPermissions.includes('all') ||
                        (editPermissions.includes(perm.key) && perm.key !== 'all');
                      const isChecked = isEditingPrimary
                        ? true
                        : editPermissions.includes('all')
                        ? true
                        : editPermissions.includes(perm.key);

                      const isDisabled =
                        isEditingPrimary ||
                        (perm.key === 'all' && !currentAdminIsPrimary);

                      return (
                        <button
                          key={perm.key}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleToggleEditPerm(perm.key)}
                          className={`flex items-center gap-2 text-left p-1.5 rounded-lg transition ${
                            isDisabled
                              ? 'opacity-70 cursor-not-allowed'
                              : 'hover:bg-slate-100 cursor-pointer'
                          }`}
                          title={
                            isEditingPrimary
                              ? 'Primary Super Admin retains permanent full access'
                              : perm.key === 'all' && !currentAdminIsPrimary
                              ? 'Only the Primary Super Admin can assign or revoke Superadmin privileges'
                              : ''
                          }
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className="text-[11px] font-medium text-slate-700">{perm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editSubmitting ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Provision Administrator Account</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin.rajesh@wonderfuljodi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 8 characters..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E51F3E]/20 focus:border-[#E51F3E]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-700 transition p-1 rounded-md"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Module Permissions</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key) || selectedPermissions.includes('all');
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() => handleToggleCreatePerm(perm.key)}
                        className="flex items-center gap-2 text-left p-1.5 rounded-lg hover:bg-slate-100 transition"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-red-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className="text-[11px] font-medium text-slate-700">{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Admin Details Modal */}
      {viewAdminId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Administrator Account & Permissions</h3>
                  <p className="text-[11px] text-slate-500">Security profile and module authorization status</p>
                </div>
              </div>
              <button
                onClick={handleCloseView}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs text-slate-500">Loading administrator details...</p>
              </div>
            ) : viewError ? (
              <div className="p-4 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold">
                {viewError}
              </div>
            ) : viewAdminData ? (
              <div className="space-y-4 text-xs">
                {/* Profile Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                    <span className="font-bold text-slate-900 text-sm">{viewAdminData.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">System Role</span>
                    {isPrimarySuperAdminEmail(viewAdminData.email) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 border border-amber-300 mt-0.5">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        PRIMARY SUPER ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200 mt-0.5">
                        {viewAdminData.permissions?.includes('all') ? 'Super Admin' : 'Staff Admin'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Official Email</span>
                    <span className="font-semibold text-slate-800">{viewAdminData.email}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Contact</span>
                    <span className="font-semibold text-slate-800">{viewAdminData.mobile || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Account Status</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {viewAdminData.status || (viewAdminData.isActive ? 'Active' : 'Inactive')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Account Created</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(viewAdminData.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Module Permissions Breakdown */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Module Permissions & Access Rights</span>
                  </h4>
                  {isPrimarySuperAdminEmail(viewAdminData.email) ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 mb-2">
                      <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="font-bold">Permanent Primary Superadministrator Privileges</p>
                        <p className="text-[11px] text-amber-800">Has full unconstrained administrative access to all modules, roles, and configurations across the platform.</p>
                      </div>
                    </div>
                  ) : viewAdminData.permissions?.includes('all') ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">Superadministrator Privileges Active</p>
                        <p className="text-[11px] text-emerald-700">Has full unconstrained administrative access to all modules and configurations.</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isPermitted =
                        isPrimarySuperAdminEmail(viewAdminData.email) ||
                        viewAdminData.permissions?.includes('all') ||
                        viewAdminData.permissions?.includes(perm.key);

                      return (
                        <div
                          key={perm.key}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] ${
                            isPermitted
                              ? 'bg-white border-emerald-200 text-slate-900 font-semibold'
                              : 'bg-slate-100/50 border-slate-200 text-slate-400 font-normal'
                          }`}
                        >
                          {isPermitted ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span>{perm.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Security & Confidentiality Notice */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px] flex items-start gap-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Confidentiality Assurance:</strong> Passwords, password hashes, session secrets, and authentication tokens are cryptographically secured and strictly omitted from all client responses.
                  </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseView}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Deactivate & Remove Admin</h3>
                <p className="text-[11px] text-slate-500">Irreversible access revocation</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to remove administrator <strong>{adminToDelete.fullName}</strong> ({adminToDelete.email})?
            </p>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
              <p className="font-bold">Security Impacts:</p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-800">
                <li>Account will be deactivated and marked as Deleted.</li>
                <li>All active device sessions and refresh tokens will be revoked immediately.</li>
                <li>Access to all administrative APIs and dashboards will be terminated.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleCloseDelete}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
